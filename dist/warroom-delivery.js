const warReadyUrl='http://web-01:8080/ready';
const warSmoke='curl -fsS '+warReadyUrl;
const warDeliveryFile=starterApp.replace('  if (request.path', '  // Acrescente aqui a rota de prontidão da doca.\n  if (request.path');
const warWorkflowHeader='name: Socorro orbital\non: push\njobs:\n  entrega:\n    runs-on: self-hosted\n    steps:\n      - uses: actions/checkout@v4';
function warDeliveryLab(source){
  const lab=newLab('deploy');
  lab.files['app.js']=source;
  lab.files['tests.json']=JSON.stringify([...defaultTests,{path:'/ready',status:200,body:'pronto'},{path:'/readyz',status:404}]);
  return lab;
}
async function warDeliveryCommand(lab,line,progress){
  const cmd=line.trim().replace(/\s+/g,' ');
  if(cmd==='help')return {text:['npm test','deploy web-01','curl '+warReadyUrl,warSmoke,'systemctl status app','journalctl -u app'].join('\n')};
  if(cmd==='curl '+warReadyUrl||cmd===warSmoke){
    const response=await requestLab(lab,warReadyUrl);
    const verified=lab.hosts['web-01'].release>0&&response.status===200&&response.body==='pronto';
    const text='HTTP '+response.status+' · '+response.body;
    if(cmd===warSmoke&&!verified)throw Error(text+' · verificação de prontidão falhou.');
    return {verified,text,level:response.status>=400?'error':undefined};
  }
  if(!['npm test','deploy web-01','systemctl status app','journalctl -u app'].includes(cmd))throw Error('Comando desconhecido. Digite help para consultar o terminal da estação.');
  const text=await labCommand(lab,cmd,progress);
  return {text,level:cmd==='npm test'&&!lab.lastTest?'error':undefined};
}
function warWorkflowCommands(steps){
  const commands=[];
  for(const [i,line] of steps.split(/\r?\n/).entries()){
    if(!line.trim()||line.trimStart().startsWith('#'))continue;
    const match=/^ {6}- run: +(.+?)\s*$/.exec(line);
    if(!match)throw Error('Linha '+(i+1)+' do trecho: alinhe - run: com - uses: usando seis espaços.');
    commands.push(match[1].replace(/^(["'])(.*)\1$/,'$2').trim().replace(/\s+/g,' '));
  }
  if(commands.length>12)throw Error('Use até 12 passos neste treino.');
  return commands;
}
async function warRunWorkflow(source,steps,log){
  const lab=warDeliveryLab(source),commands=warWorkflowCommands(steps);
  let deployed=false,verified=false;
  await log('push → checkout · VPS limpa');
  for(const cmd of commands){
    await log('$ '+cmd);
    if(!['npm test','deploy web-01',warSmoke].includes(cmd))throw Error('Este runner aceita npm test, deploy web-01 e a consulta com curl -fsS a /ready.');
    if(cmd==='deploy web-01'&&!lab.lastTest)throw Error('Deploy bloqueado. Execute os testes antes de publicar.');
    const result=await warDeliveryCommand(lab,cmd,log);
    await log(result.text,result.level);
    if(cmd==='npm test'&&!lab.lastTest)throw Error('Testes falharam. A execução parou antes da próxima etapa.');
    if(cmd==='deploy web-01'){deployed=true;verified=false;}
    if(result.verified)verified=true;
  }
  if(!verified)throw Error(deployed?'A release subiu. Falta verificar /ready na VPS.':'O job terminou sem publicar e confirmar uma release.');
}
const warPipelineFile='.github/workflows/socorro.yaml';
function warTestLocation(source,test){
  const lines=source.split('\n');
  let exact=-1,prefix=-1,defaultReturn=-1,marker=-1,handler=0;
  for(const [i,line] of lines.entries()){
    const code=line.trimStart();
    if(code.startsWith('// Acrescente aqui a rota de prontidão'))marker=i;
    if(/^(?:\/\/|\/\*|\*)/.test(code))continue;
    if(/\bfunction\s+handle\s*\(/.test(code))handler=i;
    if(/^return\b/.test(code))defaultReturn=i;
    const route=code.match(/(?:\.path\s*===?\s*|\bcase\s+)(["'])([^"']*)\1/);
    if(exact<0&&route?.[2]===test.path)exact=i;
    const broad=code.match(/\.path\.startsWith\(\s*(["'])([^"']*)\1/);
    if(prefix<0&&broad&&test.path.startsWith(broad[2]))prefix=i;
  }
  const expected='GET '+test.path+' deve devolver HTTP '+test.status+(Object.hasOwn(test,'body')?' com o corpo “'+test.body+'”.':'.');
  if(prefix>=0&&(exact<0||prefix<exact))return {line:prefix+1,hint:expected+' Confira se esta condição por prefixo também aceita rotas que deveriam seguir para outro retorno.'};
  if(exact>=0)return {line:exact+1,hint:expected+' Confira o retorno deste ramo e a ordem das condições anteriores.'};
  if(test.path==='/ready'&&marker>=0)return {line:marker+1,hint:expected+' Acrescente aqui uma condição para o caminho exato /ready, antes da resposta padrão.'};
  if(defaultReturn>=0)return {line:defaultReturn+1,hint:expected+(test.status===404?' Confira a resposta padrão para caminhos desconhecidos.':' Verifique se o caminho é tratado antes de chegar a este retorno.')};
  return {line:handler+1,hint:expected+' Comece pelo roteamento de handle e acompanhe o caminho até o retorno.'};
}
const warStarterWorkflow=warWorkflowHeader+'\n      - run: npm test\n      # Acrescente o deploy e a verificação.';

function warPipelineSteps(workflow){
  const lines=workflow.replace(/\r/g,'').split('\n');
  const checkout=lines.findIndex(line=>/^ {6}- uses:/.test(line));
  if(checkout<0)throw Error('Em jobs.entrega.steps, coloque o checkout como primeiro passo, com seis espaços antes de - uses:.');
  const fields=manifest(lines.slice(0,checkout+1).join('\n'));
  if(fields.get('on')!=='push')throw Error('Configure on: push para iniciar o workflow ao enviar a alteração.');
  if(fields.get('jobs.entrega.runs-on')!=='self-hosted')throw Error('O job entrega precisa do runner self-hosted da estação.');
  if(fields.get('jobs.entrega.steps.0.uses')!=='actions/checkout@v4')throw Error('O primeiro passo do job entrega deve usar actions/checkout@v4.');
  const supported=['name','on','jobs','jobs.entrega','jobs.entrega.runs-on','jobs.entrega.steps','jobs.entrega.steps.0.uses'];
  for(const key of fields.keys())if(!supported.includes(key))throw Error('Campo fora do workflow desta missão: '+key);
  return lines.slice(checkout+1).join('\n');
}

function warDeliveryState(saved={}){
  const stage=[1,2,3].includes(saved.stage)?saved.stage:0;
  const source=typeof saved.source==='string'?saved.source:warDeliveryFile;
  return {stage,source,tried:stage>0||saved.tried===true,failed:saved.failed===true,
    workflow:typeof saved.workflow==='string'?saved.workflow:typeof saved.steps==='string'?warWorkflowHeader+'\n'+saved.steps:warStarterWorkflow,
    deployedSource:typeof saved.deployedSource==='string'?saved.deployedSource:(saved.deployed||stage>=2?source:null),
    release:Number.isSafeInteger(saved.release)&&saved.release>0?saved.release:1};
}
function warDeliveryGuide(s,file){
  if(s.stage===3)return ['Missão concluída','A segunda doca recebeu a release e confirmou HTTP 200 pronto. O workflow completou os testes, o deploy e a verificação.','done'];
  if(s.stage===0){
    if(!s.tried)return ['1 · Diagnosticar','No terminal, digite npm test. Procure a linha FAIL de GET /ready.','terminal'];
    if(file!=='app.js')return ['2 · Reparar a API','Abra app.js para corrigir a rota de prontidão.','files'];
    if(s.failed||s.source===warDeliveryFile)return ['2 · Reparar a API','Antes do retorno 404, teste se request.path === "/ready" e devolva {status: 200, body: "pronto"}. Preserve as outras rotas.','code'];
    return ['3 · Validar a correção','Termine a alteração em app.js e rode npm test no terminal. As cinco verificações precisam passar.','terminal'];
  }
  if(s.stage===1){
    if(s.deployedSource!==s.source)return ['4 · Publicar na VPS','Os testes passaram. Consulte curl '+warReadyUrl+' para ver a versão em serviço. Execute deploy web-01 para instalar a versão testada.','terminal'];
    return ['5 · Conferir a release','Execute curl '+warReadyUrl+' no terminal. A doca precisa receber HTTP 200 com o corpo pronto.','terminal'];
  }
  if(file!==warPipelineFile)return ['6 · Abrir o workflow','Selecione socorro.yaml nos arquivos da missão. O runner da segunda doca parte de uma VPS limpa a cada push.','files'];
  let commands;
  try{commands=warWorkflowCommands(warPipelineSteps(s.workflow));}
  catch(error){return ['7 · Configurar a pipeline',error.message,'code'];}
  const deploy=commands.lastIndexOf('deploy web-01');
  if(deploy<1||!commands.slice(0,deploy).includes('npm test')||!commands.slice(deploy+1).includes(warSmoke))return ['7 · Configurar a pipeline','Em steps, após npm test, acrescente - run: deploy web-01 e - run: '+warSmoke+'. Alinhe os três passos e simule o envio com git push no terminal.','code'];
  return ['8 · Executar a pipeline','Digite git push no terminal. Acompanhe os testes, a instalação e a verificação de /ready na segunda doca.','terminal'];
}
async function warDeliveryRun(state,lab,input,log){
  const cmd=input.trim().replace(/\s+/g,' ');
  lab.files['app.js']=state.source;
  if(cmd==='help'){log((await warDeliveryCommand(lab,'help')).text+'\ngit push');return;}
  if(cmd==='git push'){
    if(state.stage<2)throw Error('Teste, publique e confirme a release manual em web-01 antes do primeiro push.');
    await warRunWorkflow(state.source,warPipelineSteps(state.workflow),log);
    state.stage=3;log('Pipeline aprovada · doca liberada.');return;
  }
  if(cmd==='deploy web-01'&&state.stage===0)throw Error('Rode npm test e corrija as falhas antes de publicar esta versão.');
  const priorStage=state.stage;
  if(cmd==='npm test'){state.tried=true;state.failed=true;state.stage=0;}
  const result=await warDeliveryCommand(lab,cmd,log);log(result.text,result.level);
  if(cmd==='npm test'){
    state.failed=!lab.lastTest;
    if(lab.lastTest)state.stage=Math.max(1,priorStage);
  }
  if(cmd==='deploy web-01'){
    state.deployedSource=lab.hosts['web-01'].source;state.release=lab.hosts['web-01'].release;
  }
  if(result.verified&&state.stage===1&&state.deployedSource===state.source)state.stage=2;
}
