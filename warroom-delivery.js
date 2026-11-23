const warReadyUrl='http://web-01:8080/ready';
const warSmoke='curl -fsS '+warReadyUrl;
const warDeliveryFile=starterApp.replace('  if (request.path', '  // Acrescente aqui a rota de prontidão da doca.\n  if (request.path');
const warWorkflowHeader='name: Socorro orbital\non: push\njobs:\n  entrega:\n    runs-on: self-hosted\n    steps:\n      - uses: actions/checkout@v4';
const warDeliverySteps=[
  {name:'Reparar o código', file:'app.js', action:'Rodar testes',
    brief:'A nave de carga espera o sinal de prontidão. Altere handle(request) para que GET /ready devolva HTTP 200 com o corpo pronto. Preserve /health, a página inicial e o 404 das rotas desconhecidas.',
    hints:['Compare a rota nova com o bloco que atende /health. O caminho chega em request.path.','Antes do retorno 404, teste se request.path é igual a "/ready".','Dentro dessa condição, escreva return { status: 200, body: "pronto" };']},
  {name:'Publicar na VPS', file:'Terminal de Lia', action:'Executar comando',
    brief:'A correção passou nos testes locais. Consulte /ready em web-01 para descobrir qual versão está em serviço. Publique a versão testada e confirme a resposta da VPS. Digite help para ver os comandos.',
    hints:['Consulte a versão em serviço com curl http://web-01:8080/ready. Um 404 indica que a rota ainda não chegou à VPS.','O comando do simulador deploy web-01 instala app.js e inicia o serviço na porta 8080.','Após o deploy, faça outra consulta a /ready. A doca precisa receber 200 e o corpo pronto.']},
  {name:'Automatizar a entrega', file:'.github/workflows/socorro.yml', action:'Simular push',
    brief:'Uma segunda doca precisa da mesma correção. Complete a lista steps do workflow. O runner da estação já tem Node e o comando deploy. A cada push, ele recebe uma VPS limpa. Teste o código, publique a release e verifique /ready com curl -fsS.',
    hints:['O checkout já disponibiliza app.js. Cada linha editável acrescenta um passo no formato - run: comando.','Comece com - run: npm test. Em seguida, use o comando de deploy que funcionou na VPS.','Finalize com - run: curl -fsS http://web-01:8080/ready. A opção -f faz erros HTTP falharem o job.']}
];
function warDeliveryLab(source){
  const lab=newLab('deploy');
  lab.files['app.js']=source;
  lab.files['tests.json']=JSON.stringify([...defaultTests,{path:'/ready',status:200,body:'pronto'},{path:'/readyz',status:404}]);
  return lab;
}
async function warDeliveryCommand(lab,line){
  const cmd=line.trim().replace(/\s+/g,' ');
  if(cmd==='help')return {text:['npm test','deploy web-01','curl '+warReadyUrl,warSmoke,'systemctl status app','journalctl -u app'].join('\n')};
  if(cmd==='curl '+warReadyUrl||cmd===warSmoke){
    const response=await requestLab(lab,warReadyUrl);
    const verified=lab.hosts['web-01'].release>0&&response.status===200&&response.body==='pronto';
    const text='HTTP '+response.status+' · '+response.body;
    if(cmd===warSmoke&&!verified)throw Error(text+' · verificação de prontidão falhou.');
    return {verified,text};
  }
  if(!['npm test','deploy web-01','systemctl status app','journalctl -u app'].includes(cmd))throw Error('Comando desconhecido. Digite help para consultar o terminal da estação.');
  return {text:await labCommand(lab,cmd)};
}
async function warRunWorkflow(source,steps,log){
  const lab=warDeliveryLab(source);
  let deployed=false,verified=false;
  const commands=[];
  for(const [i,line] of steps.split(/\r?\n/).entries()){
    if(!line.trim()||line.trimStart().startsWith('#'))continue;
    const match=/^ {6}- run: +(.+?)\s*$/.exec(line);
    if(!match)throw Error('Linha '+(i+1)+' do trecho: alinhe - run: com - uses: usando seis espaços.');
    commands.push(match[1].replace(/^(["'])(.*)\1$/,'$2').trim().replace(/\s+/g,' '));
  }
  if(commands.length>12)throw Error('Use até 12 passos neste treino.');
  log('push → checkout · VPS limpa');
  for(const cmd of commands){
    log('$ '+cmd);
    if(!['npm test','deploy web-01',warSmoke].includes(cmd))throw Error('Este runner aceita npm test, deploy web-01 e a consulta com curl -fsS a /ready.');
    if(cmd==='deploy web-01'&&!lab.lastTest)throw Error('Deploy bloqueado. Execute os testes antes de publicar.');
    const result=await warDeliveryCommand(lab,cmd);
    log(result.text);
    if(cmd==='npm test'&&!lab.lastTest)throw Error('Testes falharam. A execução parou antes da próxima etapa.');
    if(cmd==='deploy web-01'){deployed=true;verified=false;}
    if(result.verified)verified=true;
  }
  if(!verified)throw Error(deployed?'A release subiu. Falta verificar /ready na VPS.':'O job terminou sem publicar e confirmar uma release.');
}
function warDeliveryPage(){
  const lesson='5-1',saved=records.get(lesson)?.warDelivery||{};
  const state={stage:[1,2,3].includes(saved.stage)?saved.stage:0,
    source:typeof saved.source==='string'?saved.source:warDeliveryFile,
    steps:typeof saved.steps==='string'?saved.steps:'      - run: npm test\n      # Acrescente o deploy e a verificação.',
    deployed:saved.deployed===true};
  const persist=()=>save(lesson,{warDelivery:{...state}});
  const lab=warDeliveryLab(state.source);
  if(state.deployed)Object.assign(lab.hosts['web-01'],{source:state.source,release:1,running:true});
  main.innerHTML='<div class="pg-game wr-game"><header class="pg-bar"><a href="#jogo/war-room">← Plantão em órbita</a></header><div class="pg-content"><header class="pg-heading"><div><small>MISSÃO DE ENGENHARIA · DOCA ORBITAL</small><h1>O sinal de prontidão</h1></div></header><section class="wr-delivery wr-drills"><ol class="wr-delivery-progress"></ol><h2 tabindex="-1"></h2><p class="wr-brief"></p><form><label for="wr-source"></label><pre class="wr-workflow" hidden></pre><textarea id="wr-source" spellcheck="false" autocapitalize="off" maxlength="12000"></textarea><div class="wr-actions"><button class="pg-primary"></button><button type="button" class="wr-hint">Pedir dica</button></div></form><ol class="wr-hints" aria-live="polite"></ol><pre class="wr-output" role="status" aria-label="Resultado"></pre><button class="wr-next" hidden></button></section></div></div>';
  const panel=main.querySelector('.wr-delivery'),find=s=>panel.querySelector(s);
  const editor=find('textarea'),form=find('form'),output=find('.wr-output'),next=find('.wr-next');
  let hints=0,busy=false,passed=false;
  const log=text=>{output.textContent=(output.textContent+'\n'+text).trimStart().slice(-9000);};
  function renderStep(){
    const step=warDeliverySteps[state.stage];
    find('.wr-delivery-progress').innerHTML=warDeliverySteps.map((s,i)=>'<li'+(state.stage===i?' aria-current="step"':'')+'>'+(i<state.stage?'✓ ':'')+s.name+'</li>').join('');
    find('h2').textContent=step?.name||'Doca liberada';
    find('.wr-brief').textContent=step?.brief||'A segunda doca confirmou a release. Um novo push já consegue repetir os testes, o deploy e a verificação de prontidão.';
    form.hidden=!step;
    find('.wr-hints').replaceChildren();output.textContent='';hints=0;passed=false;
    next.hidden=!!step;next.textContent=step?'Continuar':'Repetir missão';
    if(!step)return;
    find('label').textContent=step.file;find('.pg-primary').textContent=step.action;
    find('.wr-workflow').hidden=state.stage!==2;find('.wr-workflow').textContent=warWorkflowHeader;
    editor.rows=state.stage===1?1:state.stage===2?5:13;
    editor.value=state.stage===0?state.source:state.stage===2?state.steps:'';
    editor.placeholder=state.stage===1?'Digite um comando':'';editor.readOnly=false;
    find('.pg-primary').disabled=false;find('.wr-hint').disabled=false;
  }
  editor.oninput=()=>{
    if(state.stage===1)return;
    if(state.stage===0)state.source=editor.value;else state.steps=editor.value;
    persist();
  };
  editor.onkeydown=e=>{if(state.stage===1&&e.key==='Enter'&&!e.isComposing){e.preventDefault();form.requestSubmit();}};
  find('.wr-hint').onclick=()=>{
    const tips=warDeliverySteps[state.stage].hints;
    const item=document.createElement('li');item.textContent=tips[hints++];find('.wr-hints').append(item);
    find('.wr-hint').disabled=hints>=tips.length;
  };
  form.onsubmit=async e=>{
    e.preventDefault();if(busy||passed)return;
    if(!editor.value.trim()){log('Preencha '+warDeliverySteps[state.stage].file+' antes de executar.');editor.focus();return;}
    busy=true;editor.readOnly=true;find('.pg-primary').disabled=true;
    try{
      if(state.stage===0){
        output.textContent='';lab.files['app.js']=state.source;
        log(await runTests(lab));passed=!!lab.lastTest;
      }else if(state.stage===1){
        const cmd=editor.value;log('$ '+cmd);editor.value='';
        const result=await warDeliveryCommand(lab,cmd);
        if(!panel.isConnected)return;
        log(result.text);passed=!!result.verified;state.deployed=lab.hosts['web-01'].release>0;persist();
      }else{
        output.textContent='';await warRunWorkflow(state.source,state.steps,log);passed=true;
      }
      if(passed&&panel.isConnected){
        state.stage++;persist();next.hidden=false;
        next.textContent=state.stage===3?'Ver resultado':'Continuar';next.focus();
        find('.wr-hint').disabled=true;
      }
    }catch(error){log(error.message);}
    finally{busy=false;editor.readOnly=passed;find('.pg-primary').disabled=passed;}
  };
  next.onclick=()=>{
    if(!passed){state.stage=0;state.source=warDeliveryFile;state.steps='      - run: npm test';state.deployed=false;Object.assign(lab,warDeliveryLab(state.source));persist();}
    renderStep();find('h2').focus();
  };
  renderStep();
}
