const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

function fixture() {
  const context = vm.createContext({
    URL,
    async runProgram(source, requests) {
      return requests.map(request => vm.runInNewContext(
        source+'\nhandle(request)', {request}, {timeout:500}
      ));
    }
  });
  for (const file of ['lab-engine.js','lab-guides.js','warroom-delivery.js']) {
    vm.runInContext(readFileSync(join(__dirname,'dist',file),'utf8'),context);
  }
  return vm.runInContext('({newLab,labCommand,checkLab,labGuides,starterApp,warDeliveryLab,warDeliveryCommand,warRunWorkflow,warSmoke,warDeliveryFile,warDeliveryRun,warDeliveryState,warDeliveryGuide,warPipelineSteps,warPipelineFile})',context);
}

test('A doca verifica o código remoto e exige um novo deploy após o teste local',async()=>{
  const {warDeliveryFile,warDeliveryLab,warDeliveryCommand,warSmoke}=fixture();
  const lab=warDeliveryLab(warDeliveryFile);
  assert.match((await warDeliveryCommand(lab,'npm test')).text,/FAIL.*\/ready/);
  lab.files['app.js']=warDeliveryFile.replace('  //','  if(request.path==="/ready")return {status:200,body:"pronto"};\n  //');
  assert.match((await warDeliveryCommand(lab,'npm test')).text,/5\/5/);
  await assert.rejects(warDeliveryCommand(lab,warSmoke),/404/);
  await warDeliveryCommand(lab,'deploy web-01');
  assert.equal((await warDeliveryCommand(lab,warSmoke)).verified,true);
});

test('O terminal do notebook migra rascunhos e exige testes, publicação e confirmação antes do push',async()=>{
  const {warDeliveryState,warDeliveryLab,warDeliveryRun,warDeliveryGuide,warPipelineSteps,warPipelineFile,warSmoke}=fixture();
  const s=warDeliveryState({steps:'      - run: npm test'}),lab=warDeliveryLab(s.source),messages=[];
  const run=cmd=>warDeliveryRun(s,lab,cmd,text=>messages.push(text));
  assert.equal(warDeliveryGuide(s,'app.js')[2],'terminal');
  await assert.rejects(run('deploy web-01'),/npm test/);
  await run('npm test');assert.equal(s.stage,0);assert.equal(warDeliveryGuide(s,'app.js')[2],'code');
  s.source=s.source.replace('  //','  if(request.path==="/ready")return {status:200,body:"pronto"};\n  //');
  await run('npm test');assert.equal(s.stage,1);
  await run('curl http://web-01:8080/ready');assert.equal(s.stage,1);assert.match(messages.at(-1),/404/);
  await run('deploy web-01');assert.equal(s.deployedSource,s.source);
  await assert.rejects(run('git push'),/confirme/);
  await run(warSmoke);assert.equal(s.stage,2);
  assert.equal(warDeliveryGuide(s,'app.js')[2],'files');assert.equal(warDeliveryGuide(s,warPipelineFile)[2],'code');
  assert.throws(()=>warPipelineSteps(s.workflow.replace('on: push','on: pull_request')),/push/);
  await assert.rejects(run('git push'),/sem publicar/);
  s.workflow+='\n      - run: deploy web-01\n      - run: '+warSmoke;
  await run('git push');assert.equal(s.stage,3);assert.equal(warDeliveryState(s).workflow,s.workflow);
  assert.equal(warDeliveryState({stage:1,source:s.source,deployed:true}).deployedSource,s.source);
});
test('O workflow inicia limpo, bloqueia falhas e exige verificação da última release',async()=>{
  const {warDeliveryFile,warRunWorkflow,warSmoke}=fixture();
  const source=warDeliveryFile.replace('  //','  if(request.path==="/ready")return {status:200,body:"pronto"};\n  //');
  const steps=(...cmds)=>cmds.map(cmd=>'      - run: '+cmd).join('\n');
  const [test,publish]=['npm test','deploy web-01'];
  const log=[],run=(code,yaml)=>warRunWorkflow(code,yaml,msg=>log.push(msg));
  await assert.rejects(run(source,'- run: npm test'),/alinhe/);
  await assert.rejects(run(source,steps(publish)),/bloqueado/);
  log.length=0;
  await assert.rejects(run(warDeliveryFile,steps(test,publish,warSmoke)),/Testes falharam/);
  assert.ok(!log.includes('$ '+publish));
  await assert.rejects(run(source,steps(test,publish)),/Falta verificar/);
  await run(source,steps(test,publish,warSmoke));
  await assert.rejects(run(source,steps(warSmoke)),/404/);
  await assert.rejects(run(source,steps(test,publish,warSmoke,publish)),/Falta verificar/);
});

for (const id of ['vps','deploy','cloud','k8s']) {
  test('Roteiro e avaliação de '+id, async () => {
    const {newLab,labCommand,checkLab,labGuides,starterApp}=fixture();
    const s=newLab(id);
    await assert.rejects(checkLab(id,s));
    if(id==='deploy') {
      assert.match(await labCommand(s,'npm test'),/FAIL/);
      s.files['app.js']=starterApp;
    }
    const guide=labGuides.find(g=>g.id===id);
    assert.ok(guide.goal&&guide.prerequisites);
    for(const step of guide.steps) {
      for(const field of ['title','body','why','expected','troubleshoot'])assert.ok(step[field],field);
      if(step.command) await labCommand(s,step.command);
    }
    assert.match(await checkLab(id,s),/200 ok/);
    if(id==='vps') {
      await labCommand(s,'systemctl stop app');
      await assert.rejects(checkLab(id,s),/Connection refused/);
    }
    if(id==='deploy') {
      s.files['app.js']=starterApp.replace('body: "ok"','body: "erro"');
      assert.match(await labCommand(s,'curl http://web-01:8080/health'),/200\nok/);
      await assert.rejects(checkLab(id,s),/npm test/);
    }
    if(id==='cloud') {
      await assert.rejects(labCommand(s,'curl http://api-01:8080/health'),/Sem rota/);
      s.hosts['api-01'].ports=[];
      await assert.rejects(checkLab(id,s),/firewall/);
    }
    if(id==='k8s') {
      const pod=s.deployments.api.pods[0];
      await labCommand(s,'kubectl delete pod '+pod);
      assert.equal(s.deployments.api.pods.length,3);
      assert.ok(!s.deployments.api.pods.includes(pod));
      s.files['service.yaml']=s.files['service.yaml'].replace('app: api','app: outro');
      await labCommand(s,'kubectl apply -f service.yaml');
      await assert.rejects(labCommand(s,'curl http://api.default.svc/health'),/sem endpoints/);
    }
  });
}

test('Os seis cenários de dados e as duas bancadas de IA abrem seus tutoriais', () => {
  const context=vm.createContext({icon:()=>''});
  for(const file of ['practice-guides.js','studio.js','db-cases.js']){
    vm.runInContext(readFileSync(join(__dirname,'dist',file),'utf8'),context);
  }
  const guides=vm.runInContext("[...dbCases.map(c=>c.id),'rag','adapter'].map(key=>practiceTutorial(key))",context);
  for(const html of guides){
    assert.match(html,/<details/);
    assert.ok((html.match(/<li><strong>.+?<\/strong><p>.+?<\/p><\/li>/g)||[]).length>=4);
  }
});
