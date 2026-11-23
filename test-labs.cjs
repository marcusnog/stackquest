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
  for (const file of ['lab-engine.js','lab-guides.js']) {
    vm.runInContext(readFileSync(join(__dirname,'dist',file),'utf8'),context);
  }
  return vm.runInContext('({newLab,labCommand,checkLab,labGuides,starterApp})',context);
}

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
