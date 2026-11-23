let disposeWarroom;
// OS key repeat and touch hardware have different delays. All held controls share one step clock.
function warHeldInput(step,period){
  const held=new Map();
  let timer=0;
  function advance(){
    clearTimeout(timer);
    const key=Array.from(held.values()).at(-1);
    if(key&&step(key))timer=setTimeout(advance,period);
  }
  return {
    press(id,key){if(!held.has(id)){held.set(id,key);advance();}},
    release(id){
      const active=Array.from(held.keys()).at(-1);
      if(held.delete(id)&&active===id){clearTimeout(timer);if(held.size)timer=setTimeout(advance,period);}
    },
    stop(){held.clear();clearTimeout(timer);}
  };
}
const warDrills={rota:3,ecos:4,antena:5};
const warDrillNames=['Malha interrompida','Ecos fora de ordem','Antena na tempestade'];
const warDrillLinks=Object.keys(warDrills).map((key,i)=>'<a href="#jogo/war-room/treino/'+key+'">'+warDrillNames[i]+'</a>').join(' · ');
function warroomPage(drill,startDelivery=false){
  const practice=Object.hasOwn(warDrills,drill);
  const lesson='5-1',record=records.get(lesson)||{};
  const state=warState(practice?{stage:warDrills[drill],wave:1,collected:true,hull:'sealed',x:4,y:4}:record.warroom);
  const sound=warSoundtrack(record.warroomAudio);
  let tutorial=practice?(warHazard(state)?'active':'skipped'):record.warroomTutorial;
  main.innerHTML=`<div class="pg-game wr-game"><header class="pg-bar"><a href="#roadmap"><img src="mark.svg" alt="">StackQuest</a><span>/</span><a href="#laboratorios">Laboratórios</a><a href="#aparencia">Aparência</a></header>
  <div class="pg-content"><header class="pg-heading"><div><small>${practice?'TREINO DE CAMPO':'WAR ROOM · RPG DE ENGENHARIA'}</small><h1>${practice?warDrillNames[state.stage-3]:'Plantão em órbita'}</h1></div><div class="pg-wallet" ${practice?'hidden':''}><span>Incidentes resolvidos</span><strong id="wr-count"></strong><span id="wr-progress" aria-hidden="true">${'<i></i>'.repeat(warChapters.length)}<b id="wr-ship">➤</b></span></div></header>
  <details class="wr-drills" ${practice?'open':''}><summary>Treinos de campo</summary><nav aria-label="Treinos de campo">${warDrillLinks} · <a href="#jogo/war-room">Voltar à campanha</a></nav></details>
  <div class="wr-drills"><a id="wr-delivery-link" href="#jogo/war-room/entrega">Missão de engenharia · O sinal de prontidão</a> · Código, deploy e CI/CD no notebook</div>
  <details class="wr-drills wr-mixer"><summary>Som do convés</summary><div><small id="wr-track"></small>
  ${[['music','Música'],['effects','Efeitos']].map(([id,label])=>'<label>'+label+' <input type="range" data-audio="'+id+'" min="0" max="100" value="'+sound.levels[id]+'"><span>'+sound.levels[id]+'%</span></label>').join('')}</div></details>
  <div class="wr-layout"><section class="pg-play"><header class="wr-mapbar"><div><h2 id="wr-sector"></h2><small id="wr-inspiration"></small></div><span id="wr-position"></span><span id="wr-power"></span></header>
  <div id="wr-board" tabindex="0" role="group" aria-label="Mapa da war room" aria-describedby="wr-keys wr-guide wr-position">${warMap()}<div class="wr-flyby" aria-hidden="true"><div class="wr-rock"><i></i><i></i><i></i><i></i></div></div></div>
  <div class="wr-objective"><span class="wr-cross" aria-hidden="true">◎</span><div><small>OBJETIVO ATUAL</small><p id="wr-guide"></p></div><button id="wr-help" type="button">Tutorial</button></div>
  <section id="wr-link" hidden aria-label="Telemetria da operação"><strong id="wr-link-state"></strong><progress id="wr-waves" max="3" aria-label="Janelas estabilizadas"></progress><span id="wr-signal"></span></section>
  <div id="wr-weather" hidden><span id="wr-forecast"></span><button id="wr-wait" type="button">Esperar um pulso (Q)</button></div>
  <aside id="wr-coach" hidden aria-label="Orientação do tutorial"><div role="status" aria-atomic="true"><small id="wr-coach-step"></small><p id="wr-coach-tip"></p></div><button id="wr-skip" type="button">Pular tutorial</button></aside>
  <div class="wr-controls"><div class="wr-equip"><span id="wr-equip-art" aria-hidden="true"></span><div><small>EM MÃOS</small><strong id="wr-equipped"></strong></div></div>
  <div class="wr-pad" role="group" aria-label="Movimento"><button data-move="w" aria-label="Andar para cima">↑</button><button data-move="a" aria-label="Andar para a esquerda">←</button><button data-move="s" aria-label="Andar para baixo">↓</button><button data-move="d" aria-label="Andar para a direita">→</button></div><button id="wr-use" class="pg-primary"><kbd>Espaço</kbd><span id="wr-verb"></span></button></div>
  <button id="wr-gather" type="button" aria-keyshortcuts="E" hidden></button>
  <p id="wr-keys">WASD ou setas para andar e mirar. Espaço para interagir. Na casa de um material, pressione E ou toque em Recolher. N abre o notebook.</p><p class="wr-status" role="status" id="wr-status"></p></section>
  <aside class="pg-side"><section class="pg-round wr-card"><div class="wr-card-head"><small id="wr-card-no"></small><span aria-hidden="true">✦</span></div><h2 id="wr-title"></h2><p id="wr-radio"></p><small id="wr-time"></small></section><section class="pg-round"><h2>Mochila de Lia</h2><button id="wr-laptop" aria-haspopup="dialog" aria-keyshortcuts="N">Abrir notebook (N)</button><ul id="wr-bag"></ul><p id="wr-distance" hidden></p></section><section class="pg-round"><h2>Diário do plantão</h2><ol id="wr-log"></ol><button id="wr-replay" hidden>Jogar novamente</button></section></aside></div>
  <dialog id="wr-notebook" aria-labelledby="wr-notebook-title"><header class="wr-lid"><div><small>NOTEBOOK DE LIA</small><h2 id="wr-notebook-title">Impressora de campo</h2></div><button type="button" id="wr-shut">Fechar notebook</button></header>
  <div id="wr-desktop" class="wr-os-home"><div class="wr-os-heading"><small>ÁREA DE TRABALHO</small><h3>Aplicativos de Lia</h3></div><div class="wr-os-apps"><button id="wr-home-print" type="button"><span aria-hidden="true">▤</span>Impressora de campo</button><button id="wr-home-deliver" type="button"><span aria-hidden="true">&gt;_</span>Missão de deploy</button></div></div>
  <nav class="wr-projects" id="wr-projects" aria-label="Projetos do notebook"><button type="button" id="wr-home-tab">⌂ Área de trabalho</button><button type="button" id="wr-printer-tab">Impressora</button><button type="button" id="wr-delivery-tab">Missão de deploy</button></nav>
  <div class="wr-workspace"><aside id="wr-cookbook"><details open><summary>Caderno de receitas</summary><ul>${warRecipes.map(r=>'<li><strong>'+r.name+'</strong><code>imprimir("'+r.material+'", '+r.layers+')</code><span>'+r.use+'</span><span id="wr-stock-'+r.material+'"></span></li>').join('')}</ul></details></aside>
  <div class="wr-edit-pane"><nav id="wr-files" aria-label="Arquivos da missão" hidden><button type="button" data-file="app.js">app.js</button><button type="button" data-file="${warPipelineFile}">socorro.yaml</button></nav>
  <form id="wr-print"><div class="wr-file"><strong id="wr-filename">receita.js</strong><button type="button" id="wr-find" hidden>Buscar no arquivo</button></div>
  <div id="wr-code"><textarea id="wr-source" aria-label="Código de receita.js" spellcheck="false" autocapitalize="off" rows="5" placeholder="// Escreva uma receita para a impressora"></textarea></div>
  <div class="wr-run"><span id="wr-cursor">Ln 1 · Col 1</span><button id="wr-print-item" class="pg-primary">▶ Imprimir item</button></div>
  <section id="wr-print-console" class="wr-console-output"><strong>Console da impressora</strong><pre id="wr-print-result" role="log" aria-live="polite"></pre></section></form>
  <section id="wr-shell" class="wr-console-output" hidden><header class="wr-shell-header"><strong>Terminal da doca · VPS simulada</strong><button type="button" id="wr-shell-size" aria-controls="wr-shell" aria-expanded="false">Maximizar terminal</button></header>
  <pre id="wr-shell-log" role="log" aria-label="Saída do terminal" aria-live="polite" tabindex="0"></pre><form id="wr-command"><label for="wr-command-line">lia $</label><input id="wr-command-line" aria-label="Comando do terminal" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="npm test"><button class="pg-primary">Executar</button></form>
  <button type="button" id="wr-again" hidden>Repetir missão</button></section></div></div>
  <aside id="wr-mission-coach" hidden><div role="status" aria-live="polite"><strong></strong><p></p></div><button type="button" id="wr-toggle-coach">Ocultar dica</button></aside>
  <footer class="wr-laptop-base" id="wr-footer"></footer><div class="wr-hardware" aria-hidden="true"><i></i><b></b></div></dialog>
  <dialog id="wr-intro" aria-labelledby="wr-intro-title" aria-describedby="wr-intro-copy"><small>RAVI · CANAL DA PONTE</small><h2 id="wr-intro-title">Seu primeiro plantão</h2><p id="wr-intro-copy"></p><div class="wr-actions"><button id="wr-start" type="button" autofocus></button><button id="wr-dismiss" type="button">Pular tutorial</button></div></dialog>
  <dialog id="wr-dialog" aria-labelledby="wr-question"><form id="wr-puzzle"><small id="wr-terminal"></small><h2 id="wr-question"></h2><p id="wr-evidence"></p><p id="wr-decision-tip" hidden><strong>Tutorial · 4 de 4</strong> Divida os erros pelo total de pedidos de cada revisão. Selecione sua decisão e clique em Aplicar decisão.</p><div id="wr-input"></div><p role="status" id="wr-feedback"></p><div class="wr-actions"><button type="submit" class="pg-primary">Aplicar decisão</button><button id="wr-close" type="button">Voltar à sala</button></div></form></dialog></div></div>`;
  const root=main.querySelector('.wr-game'),el=id=>root.querySelector('#wr-'+id);
  const board=el('board'),dialog=el('dialog'),svg=board.querySelector('svg'),pad=root.querySelector('.wr-pad');
  for(const slider of root.querySelectorAll('[data-audio]')){
    const channel=slider.dataset.audio;
    slider.oninput=()=>{sound.level(channel,Number(slider.value));slider.nextElementSibling.textContent=slider.value+'%';};
    slider.onchange=()=>{save(lesson,{warroomAudio:{...sound.levels}});if(channel==='effects')sound.cue('probe');};
  }
  root.addEventListener('pointerdown',sound.unlock,true);root.addEventListener('click',sound.unlock,true);
  const labels={on:'Rede elétrica ativa',dark:'Sem energia',torch:'Sem energia · lanterna ligada',restored:'Energia restabelecida'};
  const persist=()=>{if(!practice)save(lesson,{warroom:{...state,field:{...state.field,turns:[...state.field.turns]}}});};
  const stepMs=145,controls=warHeldInput(move,stepMs);
  const notebook=el('notebook');
  let trackerSuccess=false,editor=null;
  const recipeFile='receita.js';
  let file=recipeFile,app='home',busy=false,quiet=false,closing=0;
  let delivery=warDeliveryState(record.warDelivery),lab=warDeliveryLab(delivery.source);
  if(delivery.deployedSource!==null)Object.assign(lab.hosts['web-01'],{source:delivery.deployedSource,release:delivery.release,running:true});
  const files={[recipeFile]:!practice&&typeof record.warNotebook==='string'?record.warNotebook:'','app.js':delivery.source,[warPipelineFile]:delivery.workflow};
  const source=el('source');
  source.value=files[file];
  const saveDelivery=()=>save(lesson,{warDelivery:{...delivery}});
  function changeCode(name,value){
    if(files[name]===value)return;
    files[name]=value;
    if(name===recipeFile)saveDraft();
    else{
      if(name==='app.js'){delivery.source=value;delivery.stage=0;delivery.failed=false;lab.lastTest=null;}
      else{delivery.workflow=value;if(delivery.stage===3)delivery.stage=2;}
      saveDelivery();paintMission();
    }
    drawTutorial();
  }
  source.oninput=()=>changeCode(file,source.value);
  const cursor=(line,col)=>{el('cursor').textContent='Ln '+line+' · Col '+col;};
  source.onselect=source.onkeyup=source.onclick=()=>{
    const lines=source.value.slice(0,source.selectionStart).split('\n');cursor(lines.length,lines.at(-1).length+1);
  };
  el('code').addEventListener('keydown',e=>{
    if(app!=='print'||(e.target!==source&&!e.target.closest('.cm-content')))return;
    if(e.key==='Enter'&&!e.isComposing&&(e.ctrlKey||e.metaKey||(!e.shiftKey&&!e.altKey&&warRecipeFromCode(files[file])))){
      e.preventDefault();e.stopPropagation();if(!e.repeat)el('print').requestSubmit();
    }
  },true);
  function loadEditor(){
    if(editor||app==='home')return;
    import('./vendor/editor.js').then(({openEditor})=>{
      if(!notebook.isConnected||!notebook.open||app==='home'||editor)return;
      const focused=document.activeElement===source;
      editor=openEditor(el('code'),files,file,changeCode,cursor);editor.lock(busy);source.hidden=true;el('find').hidden=false;
      if(focused)editor.focus();
    }).catch(()=>{source.hidden=false;});
  }
  function openNotebook(project='home'){
    controls.stop();if(!notebook.open)notebook.showModal();
    switchApp(project);sound.cue('open');
  }
  function selectFile(name){
    file=name;source.value=files[file];source.setAttribute('aria-label','Código de '+file);
    source.placeholder=file===recipeFile?'// Escreva uma receita para a impressora':'';
    el('filename').textContent=file;cursor(1,1);editor?.select(file);
    for(const b of el('files').children)b.setAttribute('aria-pressed',String(b.dataset.file===file));
    paintMission();
  }
  const shellSize=el('shell-size');
  function setTerminalMaximized(expanded){
    notebook.classList.toggle('wr-shell-maximized',expanded);
    shellSize.setAttribute('aria-expanded',String(expanded));
    shellSize.textContent=expanded?'Voltar à IDE':'Maximizar terminal';
  }
  function restoreIDE(){
    setTerminalMaximized(false);
    (editor||source).focus();
  }
  shellSize.onclick=()=>{
    if(notebook.classList.contains('wr-shell-maximized'))restoreIDE();
    else setTerminalMaximized(true);
  };
  function switchApp(project){
    setTerminalMaximized(false);
    app=project;const home=app==='home',mission=app==='delivery';
    notebook.dataset.app=app;el('desktop').hidden=!home;el('projects').hidden=home;
    notebook.querySelector('.wr-workspace').hidden=home;el('cookbook').hidden=mission;
    el('files').hidden=!mission;el('shell').hidden=!mission;el('print-console').hidden=mission;el('print-item').hidden=mission;
    el('printer-tab').setAttribute('aria-pressed',String(app==='print'));el('delivery-tab').setAttribute('aria-pressed',String(mission));
    el('notebook-title').textContent=home?'Sistema de bordo':mission?'O sinal de prontidão':'Impressora de campo';
    el('footer').textContent=home?'Convés orbital · Sessão de Lia':mission?'Terminal da doca · digite help para consultar os comandos':'Ctrl+Enter para executar · Uma receita por execução';
    if(!home){selectFile(mission?(delivery.stage>=2?warPipelineFile:'app.js'):recipeFile);loadEditor();}
    paintMission();drawTutorial();
    if(home)el('home-print').focus();else (editor||source).focus();
  }
  el('home-tab').onclick=()=>switchApp('home');
  el('home-print').onclick=el('printer-tab').onclick=()=>switchApp('print');
  el('home-deliver').onclick=el('delivery-tab').onclick=()=>switchApp('delivery');
  el('delivery-link').onclick=e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();openNotebook('delivery');};
  el('files').onclick=e=>{if(e.target.dataset.file){selectFile(e.target.dataset.file);(editor||source).focus();}};
  function paintMission(){
    const coach=el('mission-coach');coach.hidden=app!=='delivery';
    notebook.querySelector('.wr-mission-focus')?.classList.remove('wr-mission-focus');
    if(coach.hidden)return;
    const [title,text,target]=warDeliveryGuide(delivery,file);
    if(coach.querySelector('strong').textContent!==title)coach.querySelector('strong').textContent=title;
    const copy=coach.querySelector('p');copy.hidden=quiet;if(copy.textContent!==text)copy.textContent=text;
    el('toggle-coach').textContent=quiet?'Mostrar dica':'Ocultar dica';
    el('again').hidden=delivery.stage!==3;
    const anchor=el(({terminal:'command',files:'files',code:'code',done:'again'})[target]);
    if(coach.nextElementSibling!==anchor)anchor.before(coach);
    if(!quiet)anchor.classList.add('wr-mission-focus');
  }
  el('toggle-coach').onclick=()=>{quiet=!quiet;paintMission();};
  const log=text=>{const out=el('shell-log');out.textContent=(out.textContent+'\n'+text).trimStart().slice(-9000);out.scrollTop=out.scrollHeight;};
  el('command').onsubmit=async e=>{
    e.preventDefault();const line=el('command-line'),cmd=line.value.trim();if(busy||!cmd)return;
    busy=true;editor?.lock(true);source.readOnly=true;line.readOnly=true;el('command').querySelector('button').disabled=true;
    log('$ '+cmd);line.value='';
    try{await warDeliveryRun(delivery,lab,cmd,log);}
    catch(error){log('ERRO › '+error.message);}
    finally{
      busy=false;
      if(notebook.isConnected){
        saveDelivery();editor?.lock(false);source.readOnly=false;line.readOnly=false;el('command').querySelector('button').disabled=false;paintMission();
      }
    }
  };
  el('again').onclick=()=>{
    if(busy)return;
    delivery=warDeliveryState();lab=warDeliveryLab(delivery.source);files['app.js']=delivery.source;files[warPipelineFile]=delivery.workflow;
    editor?.destroy();editor=null;source.hidden=false;el('find').hidden=true;el('shell-log').textContent='';saveDelivery();switchApp('delivery');
  };
  el('find').onclick=()=>editor?.search();
  function saveDraft(){if(!practice&&files[recipeFile]!==records.get(lesson)?.warNotebook)save(lesson,{warNotebook:files[recipeFile]});}
  notebook.onclose=()=>{trackerSuccess=false;if(board.isConnected){saveDraft();draw();}};
  el('laptop').onclick=()=>openNotebook();
  function gather(){
    controls.stop();
    const key=warGather(state);if(!key)return;
    persist();draw();act(3,280);sound.cue('pickup');plantaoAnimate(el('bag'),'collect');
    el('status').textContent=warMaterials[key].name+' +1 · '+state.materials[key]+' na mochila.';
  }
  el('gather').onclick=gather;
  function closeNotebook(){
    if(closing)return;
    if(reduced.matches){notebook.close();return;}
    notebook.classList.add('wr-folding');
    closing=setTimeout(()=>{closing=0;notebook.classList.remove('wr-folding');notebook.close();},150);
  }
  el('shut').onclick=closeNotebook;notebook.oncancel=e=>{
    e.preventDefault();
    if(notebook.classList.contains('wr-shell-maximized'))restoreIDE();
    else closeNotebook();
  };
  el('print').onsubmit=e=>{
    e.preventDefault();
    if(app!=='print')return;
    const learning=tutorial==='active'&&warGuideRecipe(state,practice)?.id==='tracker';
    const result=warPrint(state,files[file]);
    if(learning&&result.ok&&state.printed.includes('tracker'))trackerSuccess=true;
    const output=el('print-result');
    output.textContent=(output.textContent+'\n'+(result.ok?'OK':'ERRO')+' › '+result.text).trimStart().slice(-3600);
    output.scrollTop=output.scrollHeight;saveDraft();sound.cue(result.ok?'pickup':'error');
    if(result.ok){persist();draw();plantaoAnimate(el('bag'),'collect');}
  };
  root.style.setProperty('--wr-step',stepMs+'ms');
  let order=[],lastDrop='',aimAngle=warBeam(state).angle;
  let stride=0,idleTimer=0;
  const weatherLayer=document.createElementNS('http://www.w3.org/2000/svg','g');
  el('drop').before(weatherLayer);
  function weather(){
    const hazard=warHazard(state);
    syncMusic(hazard);
    el('weather').hidden=!hazard;
    if(!hazard){weatherLayer.replaceChildren();delete root.dataset.hazard;return;}
    root.dataset.hazard=state.stage===3?'quake':'dust';
    el('forecast').textContent=hazard.name+' em '+hazard.remaining+(hazard.remaining===1?' pulso':' pulsos')+' · '+hazard.cells.map(warCoord).join(', ')+(state.printed.includes(hazard.kind)?'. Proteção disponível na mochila.':'. Evite entrar nas casas marcadas durante o impacto.');
    weatherLayer.innerHTML=hazard.cells.map(pos=>warAt(pos,'<path d="m-25-11 44 0 7 22h-44z" fill="#edb073" fill-opacity=".42" stroke="#764528" stroke-dasharray="4 2"/>'+
      (state.stage===3?'<path d="m-12 8 9-8-4-3 12-7" stroke="#553b38" fill="none" stroke-width="3"/>':'<path d="M-15-4h19m-12 5h20m-14 5h17" stroke="#734a38" fill="none" stroke-width="2"/>'))).join('');
  }
  function impact(){
    sound.cue(state.stage===3?'quake':'wind');
    if(!reduced.matches)svg.animate(state.stage===3?[{transform:'translateX(-3px)'},{transform:'translateX(3px)'},{transform:'none'}]:[{opacity:.72},{opacity:1}],{duration:220});
  }
  function waitPulse(){
    const hazard=warHazard(state);if(!hazard)return;
    controls.stop();warWeatherTurn(state);persist();drawMap();
    if(hazard.remaining===1)impact();
    el('status').textContent='Lia se abriga e deixa passar um pulso.';
  }
  el('wait').onclick=waitPulse;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const intro=el('intro'),coach=el('coach');
  const arrows={w:'↑ (W)',a:'← (A)',s:'↓ (S)',d:'→ (D)'};
  function setTutorial(value){
    tutorial=value;if(!practice)save(lesson,{warroomTutorial:value});
  }
  function showIntro(){
    controls.stop();
    const first=state.stage===0;
    const recipe=warGuideRecipe(state,practice);
    el('intro-title').textContent=first?'Seu primeiro plantão':'Controles do plantão';
    el('intro-copy').textContent=first?'Lia, o checkout da nave começou a falhar. Vou te guiar pelo rádio até o relatório do canário. Depois, você decide o que fazer no terminal de telemetria.':'Ande com WASD, com as setas do teclado ou com os botões do convés. Fique na casa marcada ou ao lado dela e use Espaço ou o botão de ação. Seu próximo objetivo aparece abaixo do mapa.';
    el('start').textContent=first?'Ativar guia pelo rádio':'Voltar ao plantão';
    el('dismiss').hidden=!first;
    if(recipe){
      el('intro-copy').textContent=recipe.id==='tracker'?'Vamos coletar cobre e imprimir seu rastreador. Nos incidentes de tremor e tempestade, vou te ensinar a fabricar e usar as duas proteções.':'Vou te guiar até o material, acompanhar a impressão de '+recipe.name+' e indicar o passo que ativa a proteção no impacto.';
      el('start').textContent=recipe.id==='tracker'?'Guiar primeira impressão':'Guiar uso da proteção';el('dismiss').hidden=false;
    }
    intro.showModal();
  }
  function closeIntro(active){
    if(state.stage===0||warGuideRecipe(state,practice))setTutorial(active?'active':'skipped');
    intro.close();drawMap();board.focus({preventScroll:true});
  }
  el('help').onclick=showIntro;
  el('start').onclick=()=>closeIntro(true);
  el('dismiss').onclick=()=>closeIntro(false);
  intro.oncancel=e=>{e.preventDefault();closeIntro(false);};
  el('skip').onclick=()=>{setTutorial('skipped');trackerSuccess=false;draw();if(notebook.open)(editor||source).focus();else board.focus({preventScroll:true});};
  function drawTutorial(){
    const recipe=warGuideRecipe(state,practice);
    const teaching=tutorial==='active'||(tutorial==='done'&&recipe&&recipe.id!=='tracker');
    const inMission=notebook.open&&app==='delivery';
    const equipment=!inMission&&teaching&&(trackerSuccess&&notebook.open?{step:5,key:'shut',text:'Rastreador na mochila! Feche o notebook para ver a distância até o objetivo.'}:recipe&&warEquipmentStep(state,notebook.open,files[recipeFile],recipe));
    if(equipment&&notebook.open&&app==='home'&&equipment.key!=='shut'){equipment.key='home-print';equipment.text='Abra o aplicativo Impressora de campo na área de trabalho para escrever a receita.';}
    const tip=equipment||(teaching&&!practice&&!notebook.open&&warTutorialStep(state));
    coach.hidden=!tip;el('help').hidden=!!tip;
    const previous=root.querySelector('.wr-guided');
    const direction=tip&&arrows[tip.key];
    const next=tip&&(direction?pad.querySelector('[data-move="'+tip.key+'"]'):el(tip.key));
    if(previous!==next){previous?.classList.remove('wr-guided');if(next)next.classList.add('wr-guided');}
    root.dataset.guideMaterial=equipment&&recipe&&tip.step===1?recipe.material:'';
    if(!tip)return;
    const anchor=notebook.open?(app==='home'?notebook.querySelector('.wr-os-apps'):tip.key==='code'?el('code'):tip.key==='shut'?notebook.querySelector('.wr-workspace'):el('print-item').parentElement):
      equipment&&!direction?next:root.querySelector('.wr-controls');
    if(coach.nextElementSibling!==anchor)anchor.before(coach);
    const label=equipment?(trackerSuccess?'RASTREADOR IMPRESSO':(recipe.id==='tracker'?'PRIMEIRO RASTREADOR':recipe.name.toUpperCase())+' · '+tip.step+' DE '+(recipe.id==='tracker'?5:6)):'RAVI · TUTORIAL '+tip.step+' DE 4';
    const instruction=equipment?tip.text+(direction?' Use '+direction+' ou toque na seta destacada.':''):
      tip.key==='use'?(state.collected?'O terminal está ao alcance. Pressione Espaço ou toque em Abrir terminal.':'O relatório está ao alcance. Pressione Espaço ou toque em Coletar item para guardá-lo na mochila.'):
      (state.collected?'Leve o relatório ao terminal de telemetria em C1.':'Aproxime-se do relatório marcado em B4.')+' Use '+direction+' ou toque na seta destacada.';
    if(equipment&&!notebook.open)el('guide').textContent=(tip.step===6?'Use a proteção no impacto · ':'Fabrique o equipamento · ')+recipe.name;
    if(el('coach-step').textContent!==label)el('coach-step').textContent=label;
    if(el('coach-tip').textContent!==instruction){
      el('coach-tip').textContent=instruction;
      if(!reduced.matches)coach.animate([{opacity:.65},{opacity:1}],{duration:160});
    }
    if(equipment&&previous!==next){
      const bounds=next.getBoundingClientRect();
      if(bounds.top<0||bounds.bottom>window.innerHeight)next.scrollIntoView({block:'center',behavior:'instant'});
    }
  }
  function pose(frame){
    const row={s:0,w:1,d:2,a:2}[state.facing];
    el('pose').setAttribute('viewBox',[frame*24,row*28,24,28].join(' '));
    el('facing').setAttribute('transform',state.facing==='a'?'scale(-1 1)':'scale(1 1)');
  }
  function act(frame,duration){
    clearTimeout(idleTimer);pose(reduced.matches?0:frame);
    if(!reduced.matches)idleTimer=setTimeout(()=>pose(0),duration);
  }
  function drawMap(){
    const target=warTarget(state),dark=['dark','torch'].includes(state.power);
    const [px,py]=warPoint([state.x,state.y]);
    svg.style.setProperty('--wr-at','translate('+px+'px,'+py+'px)');
    const mask=el('dark'),lamp=warBeam(state),lit=state.power==='torch';
    aimAngle+=((lamp.angle-aimAngle)%360+540)%360-180;
    svg.style.setProperty('--wr-aim','translate('+(lamp.x-px)+'px,-17px) rotate('+aimAngle+'deg)');
    el('held').setAttribute('visibility',lit?'visible':'hidden');
    if(lit)mask.setAttribute('mask','url(#wr-light-mask)');else mask.removeAttribute('mask');
    mask.setAttribute('opacity',dark ? .94 : 0);
    el('conduit').setAttribute('visibility',state.tagRead||warTagLit(state)?'visible':'hidden');
    svg.classList.toggle('wr-offline',dark);
    svg.classList.toggle('wr-restored',state.power==='restored');
    el('beacon').setAttribute('visibility',state.power==='dark'?'visible':'hidden');
    const visible=target&&(target.kind!=='tag'||warTagLit(state))&&(target.kind!=='breaker'||Math.abs(state.x-warBreaker[0])+Math.abs(state.y-warBreaker[1])<=2);
    const dropKey=target?state.stage+'-'+target.kind+'-'+state.field.scans:'';
    if(dropKey!==lastDrop){
      lastDrop=dropKey;
      el('drop').innerHTML=target?warAt(target.pos,'<ellipse class="wr-halo" cy="3" rx="19" ry="8" fill="none" stroke="#ffe18b" stroke-width="2" stroke-dasharray="5 3"/>'+
        (target.kind==='item'?warItemArt(state.stage):target.kind==='relay'?warItemArt('relay'):'')+'<path d="m-24 1 5-3v6z" fill="#ffe18b" stroke="#594b35"/>'):'';
      if(target?.kind==='probe')el('drop').innerHTML=warProbes.map((probe,i)=>(state.field.scans&(1<<i))?'':warAt(probe.pos,'<circle r="10" cy="-6" fill="'+(i?'#e6bb70':'#76cddd')+'" stroke="#314756" stroke-width="2"/><text y="-2" text-anchor="middle" fill="#193440" font-size="12">'+(i?'B':'A')+'</text>')).join('');
    }
    el('drop').style.opacity=visible?'1':'0';
    const near=warReach(state,target);
    const material=warMaterialHere(state);
    el('gather').hidden=!material;
    if(material)el('gather').textContent='Recolher '+warMaterials[material].name.toLowerCase()+' (E)';
    el('position').textContent='Lia · '+warCoord([state.x,state.y]);
    const tracking=target&&state.printed.includes('tracker');
    el('distance').hidden=!tracking;
    if(tracking){
      const distance=Math.abs(state.x-target.pos[0])+Math.abs(state.y-target.pos[1]);
      el('distance').textContent='Rastreador · '+target.name+' · '+distance+(distance===1?' casa':' casas')+' de distância na grade.';
    }
    board.setAttribute('aria-label','Mapa da war room. '+el('position').textContent+(near?'. Ao alcance: '+target.name:'.')+(material?' '+el('gather').textContent: ''));
    el('verb').textContent=near?({item:'Coletar item',torch:'Pegar lanterna',tag:'Ler etiqueta',breaker:'Examinar quadro',bulkhead:'Selar antepara',puzzle:'Abrir terminal',relay:warChapters[state.stage]?.relayAction}[target.kind]):(target?'Fora de alcance':'Turno encerrado');
    if(target?.kind==='probe'&&near)el('verb').textContent='Escutar '+target.name;
    el('use').disabled=!near;weather();
    drawTutorial();
  }
  function syncMusic(hazard){
    const alert=warMusicAlert(state,hazard),score=warScores[state.stage];
    const label={blackout:'apagão',quake:'tremor',storm:'tempestade'}[alert];
    const remaining=hazard?.remaining??null;
    sound.scene(state.stage,alert,remaining);
    const countdown=remaining?' em '+remaining+(remaining===1?' pulso':' pulsos'):'';
    const title=score?'Trilha · '+score.name+(label?' · '+label+countdown:''):'Plantão encerrado';
    if(el('track').textContent!==title)el('track').textContent=title;
  }
  function draw(){
    const ch=warChapters[state.stage],target=warTarget(state);
    const sector=Math.min(state.stage,warScenes.length-1);
    if(root.dataset.sector!==String(sector)){
      root.dataset.sector=String(sector);
      const scene=warScenes[sector];
      el('sector').textContent=scene.name;el('inspiration').textContent='Convés inspirado em '+scene.inspiration;
      el('panorama').innerHTML=scene.panorama;el('floor-mark').innerHTML=scene.surface;
      scene.floor.forEach((color,i)=>svg.style.setProperty('--wr-floor-'+i,color));
      svg.style.setProperty('--wr-zenith',scene.sky[0]);svg.style.setProperty('--wr-horizon',scene.sky[1]);
      svg.style.setProperty('--wr-wall',scene.wall);svg.style.setProperty('--wr-trim',scene.trim);
      if(!reduced.matches)el('panorama').animate([{opacity:.4},{opacity:1}],{duration:320});
    }
    el('count').textContent=state.stage+' / '+warChapters.length;el('power').textContent=labels[state.power];
    el('progress').querySelectorAll('i').forEach((pip,i)=>pip.classList.toggle('done',i<state.stage));
    el('ship').style.transform='translateX('+(90*state.stage/warChapters.length)+'px)';
    const storm=state.power==='torch'||state.power==='dark',breached=state.hull==='breached';
    root.classList.toggle('wr-storm',storm);root.classList.toggle('wr-breached',breached);
    const card=storm?'Evento solar':breached?'Impacto orbital':!ch?'Fim da travessia':'Incidente '+(state.stage+1)+' de '+warChapters.length;
    if(el('card-no').textContent!==card){
      el('card-no').textContent=card;
      if(!reduced.matches)root.querySelector('.wr-card').animate([{transform:'perspective(650px) rotateX(-13deg) translateY(-6px)'},{transform:'none'}],{duration:380,easing:'ease-out'});
    }
    el('power').classList.toggle('outage',state.power==='torch'||state.power==='dark');
    const equipped=state.power==='torch'?'Lanterna':state.collected?ch.item:'Mãos livres';
    el('equipped').textContent=equipped;
    el('equip-art').innerHTML=equipped==='Mãos livres'?'<span class="wr-portrait"></span>':'<svg viewBox="-17 -16 36 32">'+warItemArt(state.power==='torch'?'torch':state.stage)+'</svg>';
    el('time').textContent=['02:13','02:17','02:23','02:31','02:39','02:46','02:54'][state.stage]+' · RÁDIO DO PLANTÃO';
    el('title').textContent=storm?'Tempestade solar':breached?'Micrometeorito a estibordo':ch?.title||'Transmissão concluída';
    el('radio').textContent=state.power==='dark'?'Uma tempestade solar aciona a proteção do convés. Os terminais se apagam. Ravi chama no rádio a bateria: “A lanterna está junto à porta.”':
      state.power==='torch'?'Ravi: “Só a ala leste perdeu telemetria. A etiqueta de manutenção entre os terminais indica o ramal dos monitores.”':
      breached?'Um micrometeorito atingiu o duto de refrigeração. O gelo tomou o corredor G. Ravi sinaliza o comando da antepara na parede do fundo.':
      ch?.radio||'Às 02:54, a Terra confirma o manifesto final. Ravi encerra o canal e Lia entrega o diário dos seis incidentes à próxima tripulação.';
    el('guide').textContent=!target?'Plantão concluído. Confira suas decisões no diário.':target.kind==='bulkhead'?'A fileira 5 está livre. Contorne o gelo e sele a antepara em G1.':target.kind==='tag'?'Ilumine a parede do fundo em D1. Aponte para a etiqueta e leia com Espaço.':
      target.kind==='breaker'?'Siga o conduíte até o quadro em I1. Cruze a etiqueta com o chamado de Ravi.':
      (target.kind==='puzzle'?'Abra o terminal ':target.kind==='relay'?'Ative o equipamento de campo · ': 'Colete ')+target.name+' em '+warCoord(target.pos)+'.';
    root.dataset.operation=ch?.relay?String(state.stage):'';
    if(target?.kind==='probe')el('guide').textContent='Use a sonda nos ecos do convés: '+warProbes.filter((_,i)=>!(state.field.scans&(1<<i))).map(p=>p.name+' em '+warCoord(p.pos)).join(' e ')+'.';
    if(target?.kind==='relay'||target?.kind==='probe'){
      el('title').textContent=warDrillNames[state.stage-3];
      el('radio').textContent=[
        'Lia, as placas do vale estão cedendo. Cada passo avança um pulso. Vá até a antena e refaça a rota do cache antes da próxima leva.',
        'Recebi duas versões do manifesto. Escute as duas sondas em qualquer ordem e confira os registros na baliza. Os relógios da nave perderam o sincronismo.',
        'A poeira atravessou a pista. Observe o piso antes de avançar e alcance o acoplador. Vou te passar a direção das rajadas pelo rádio.'
      ][state.stage-3];
    }
    root.classList.toggle('wr-signal-alert',ch?.relay&&state.setting!==null);
    el('link').hidden=!ch?.relay;
    if(ch?.relay){
      el('waves').value=state.wave;
      el('link-state').textContent='Janelas estabilizadas · '+state.wave+' / 3';
      el('signal').textContent=state.setting!==null?warWindow(state).measure(state.setting).text:
        target.kind==='relay'?ch.relayName+' aguarda intervenção local.':state.relayReady?'Equipamento de campo conectado.':'Aguardando sinal do terminal.';
      if(state.stage===4&&state.field.scans)el('signal').textContent=warProbes.filter((_,i)=>state.field.scans&(1<<i)).map(p=>p.name+' · '+p.time+' · registro '+p.lsn).join(' | ');
    }
    const held=warChapters.filter((_,i)=>i<state.stage||(i===state.stage&&state.collected)).map(c=>c.item);
    if(['torch','restored'].includes(state.power))held.push('Lanterna de emergência');
    if(state.tagRead)held.push('Etiqueta · Monitores no ramal B');
    el('bag').innerHTML=held.map((s,i)=>'<li><svg viewBox="-17 -16 36 32" aria-hidden="true">'+warItemArt(s==='Lanterna de emergência'?'torch':i)+'</svg>'+s+'</li>').join('')+
      warRecipes.filter(r=>state.printed.includes(r.id)).map(r=>'<li>▣ '+r.name+'</li>').join('')+
      Object.entries(warMaterials).map(([key,m])=>'<li><svg viewBox="-17 -16 36 32" aria-hidden="true">'+warItemArt(key)+'</svg>'+m.name+' × '+state.materials[key]+' · coletar em '+warCoord(m.pos)+'</li>').join('');
    for(const r of warRecipes){
      el('stock-'+r.material).textContent='Na mochila: '+state.materials[r.material]+' · Coleta em '+warCoord(warMaterials[r.material].pos)+'.';
    }
    el('log').innerHTML=(state.stage?warChapters.slice(0,state.stage).map(c=>'<li>'+c.result+'</li>').join(''):'<li>02:13 · Lia assumiu a investigação.</li>')+
      (state.power==='restored'?'<li>Circuito dos terminais rearmado.</li>':'')+(state.hull==='sealed'?'<li>Vazamento isolado. Passagem de estibordo liberada.</li>':'')+
      state.absorbed.map(id=>id==='quake'?'<li>Tremor absorvido com a âncora magnética.</li>':'<li>Rajada absorvida com o escudo.</li>').join('');
    el('replay').hidden=!!ch;
    el('laptop').disabled=!ch;
    el('use').disabled=!ch;for(const b of pad.children)b.disabled=!ch;
    drawMap();
  }
  function move(key){
    if(state.stage===warChapters.length)return;
    const previousFacing=state.facing;
    const hazard=warHazard(state),beat=state.field.beat;
    const inventorySize=state.printed.length;
    if(warMove(state,key)){
      persist();
      if(inventorySize!==state.printed.length){
        draw();el('status').textContent='Impacto absorvido com '+warRecipes.find(r=>r.id===hazard.kind).name+'. Continue até '+warTarget(state).name+'.';
      }else{drawMap();el('status').textContent='';}
      if(hazard?.remaining===1)impact();else sound.cue('step');
      stride=stride===1?2:1;
      act(stride,stepMs*.68);return inventorySize===state.printed.length&&!el('gather').classList.contains('wr-guided')&&!el('wait').classList.contains('wr-guided');
    }else{
      clearTimeout(idleTimer);pose(0);drawMap();
      if(previousFacing!==state.facing||beat!==state.field.beat)persist();
      if(beat!==state.field.beat){impact();el('status').textContent=hazard.name+' bloqueou a passagem. Lia ficou protegida na casa anterior.';return false;}
      const [dx,dy]=warDirections[key];
      const ice=state.hull==='breached'&&warIce.some(([x,y])=>x===state.x+dx&&y===state.y+dy);
      el('status').textContent=ice?'Piso congelado. A antepara em G1 isola o vazamento.':warReach(state,warTarget(state))?'Ao alcance: '+warTarget(state).name+'.':'Passagem bloqueada. Contorne a bancada ou a parede.';
      return false;
    }
  }
  function sequence(){
    el('input').innerHTML='<ol class="wr-sequence">'+order.map(i=>'<li>'+warChapters[2].steps[i]+'</li>').join('')+'</ol>'+
      warChapters[2].steps.map((s,i)=>'<button type="button" data-step="'+i+'" '+(order.includes(i)?'disabled':'')+'>'+s+'</button>').join('')+
      '<button type="button" id="wr-undo" '+(order.length?'':'disabled')+'>Desfazer último passo</button>';
  }
  function openPuzzle(){
    const ch=warChapters[state.stage];
    el('decision-tip').hidden=state.stage!==0||tutorial!=='active';
    order=[];el('feedback').textContent='';el('terminal').textContent='TERMINAL · '+ch.station;
    el('question').textContent=ch.prompt;el('evidence').textContent=ch.evidence;
    if(state.stage===0)el('input').innerHTML=ch.options.map((s,i)=>'<label><input type="radio" required name="revision" value="'+i+'"> '+s+'</label>').join('');
    if(state.stage===1)el('input').innerHTML='<label>Tarefas simultâneas por worker <input type="number" name="workers" min="1" max="40" required></label>';
    if(state.stage===2)sequence();
    if(ch.relay){
      const window=warWindow(state);
      el('terminal').textContent=ch.station+' · Janela '+(state.wave+1)+' de 3';
      el('question').textContent=window.title;el('evidence').textContent=window.evidence;
      el('input').innerHTML=window.options?window.options.map((option,i)=>'<label><input type="radio" required name="setting" value="'+i+'"> '+option+'</label>').join(''):
        '<label>Reserva para telemetria (Mbit/s) <input type="number" required name="setting" min="0" max="'+window.max+'"></label>';
      if(state.setting!==null)el('feedback').textContent=window.measure(state.setting).text;
    }
    if(!dialog.open)dialog.showModal();
  }
  function renderField(){
    const panel=warFieldPanel(state);
    el('terminal').textContent='OPERAÇÃO DE CAMPO · '+warChapters[state.stage].relayName;
    el('question').textContent=panel.title;el('evidence').textContent=panel.hint;
    el('decision-tip').hidden=true;el('input').innerHTML=panel.body;
    el('puzzle').querySelector('[type=submit]').textContent=panel.submit;
    dialog.dataset.field='active';
    if(!dialog.open){el('feedback').textContent='';dialog.showModal();}
  }
  function fieldAction(action,value){
    const previousPulse=state.field.pulse;
    const result=warFieldAction(state,action,value);if(!result)return;
    persist();
    if(result.done||state.field.pulse!==previousPulse)sound.cue('success');
    else sound.cue(action==='turn'||action==='steer'?'click':'error');
    if(result.done){
      dialog.close();
      if(practice){
        unbindGame();syncMusic(null);
        const mixer=root.querySelector('.wr-mixer');
        root.querySelector('.pg-content').innerHTML='<section class="wr-drills wr-finished"><small>TREINO CONCLUÍDO</small><h1 tabindex="-1">'+warDrillNames[state.stage-3]+'</h1><p>'+result.text+'</p><button type="button">Repetir treino</button><nav>'+warDrillLinks+' · <a href="#jogo/war-room">Voltar à campanha</a></nav></section>';
        root.querySelector('.wr-finished').append(mixer);
        root.querySelector('.wr-finished button').onclick=()=>{disposeWarroom();disposeWarroom=null;warroomPage(drill);};
        root.querySelector('h1').focus();return;
      }
      draw();act(4,480);el('status').textContent=result.text+' Retorne ao terminal.';return;
    }
    if(action==='turn'||action==='steer'||action==='capture'){
      renderField();
      if(action!=='capture')el('input').querySelector('[data-'+action+'="'+value+'"]').focus({preventScroll:true});
    }
    el('feedback').textContent=result.text;
  }
  function use(){
    controls.stop();
    const target=warTarget(state);
    const action=warInteract(state);
    const cue={puzzle:'open',relay:'open',probe:'probe',breaker:'click',torch:'pickup',item:'pickup',tag:'probe',bulkhead:'power'}[action];
    if(cue)sound.cue(cue);
    if(action==='puzzle'){openPuzzle();return;}
    if(action==='relay'){renderField();return;}
    if(action==='probe'){
      persist();draw();act(4,350);
      const probe=warProbes[target.index];el('status').textContent=probe.name+' registrado. Último registro aplicado: '+probe.lsn+'.';return;
    }
    if(action==='breaker'){
      el('decision-tip').hidden=true;
      el('terminal').textContent='QUADRO DA SALA';el('question').textContent='Qual circuito atende os monitores que caíram?';
      el('evidence').textContent=warTagText+' Rádio · A falha atingiu apenas a ala leste.';
      el('input').innerHTML=warCircuits.map((c,i)=>'<label><input type="radio" name="circuit" required value="'+i+'"> '+c+'</label>').join('');
      el('feedback').textContent='';dialog.showModal();return;
    }
    if(action==='far'){el('status').textContent='Nada ao alcance. Siga a indicação do rádio e fique no item ou na casa vizinha.';return;}
    persist();draw();
    if(action==='torch'||action==='item'){
      act(3,280);
      if(!reduced.matches){
        const layer=el('pickups'),[x,y]=warPoint(target.pos),[px,py]=warPoint([state.x,state.y]);
        layer.innerHTML=warAt(target.pos,'<g>'+warItemArt(action==='torch'?'torch':state.stage)+'</g>');
        const object=layer.firstElementChild.firstElementChild,dx=px-x,dy=py-y-16;
        const pickup=object.animate([{transform:'translate(0,0)'},{transform:'translate('+dx*.5+'px,'+(dy*.5-10)+'px)',offset:.5},{transform:'translate('+dx+'px,'+dy+'px) scale(.65)',opacity:0}],{duration:240,easing:'ease-in-out',fill:'forwards'});
        pickup.onfinish=()=>object.parentElement?.remove();
      }
    }
    if(action==='bulkhead')act(4,480);
    el('status').textContent={item:'Evidência na mochila.',torch:'Lanterna ligada. O facho acompanha seu olhar.',tag:warTagText,bulkhead:'Antepara selada. Aquecimento do piso restabelecido; o caminho está livre.'}[action];
    plantaoAnimate(el('bag'),'collect');
  }
  el('input').onclick=e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-turn')){fieldAction('turn',Number(b.dataset.turn));return;}
    if(b.hasAttribute('data-steer')){fieldAction('steer',Number(b.dataset.steer));return;}
    if(b.id==='wr-undo')order.pop();else order.push(Number(b.dataset.step));
    sound.cue('click');
    sequence();el('feedback').textContent=order.length+' de 3 passos selecionados.';
    (el('input').querySelector('[data-step]:not(:disabled)')||el('puzzle').querySelector('[type=submit]')).focus();
  };
  el('puzzle').onsubmit=e=>{
    e.preventDefault();const stage=state.stage,fields=new FormData(e.target);
    if(dialog.dataset.field){
      const action=stage===3?'test':stage===4?'sync':'capture';
      fieldAction(action,fields.has('sample')?Number(fields.get('sample')):undefined);return;
    }
    if(fields.has('setting')){
      const reading=warTransmit(state,Number(fields.get('setting')));
      if(!reading)return;
      sound.cue(reading.ok?'success':'error');
      persist();draw();
      if(!reading.ok){el('feedback').textContent=reading.text+' Ajuste a configuração e repita esta janela.';return;}
      const message='Janela estabilizada. '+reading.text;
      if(stage===state.stage&&warTarget(state).kind==='puzzle'){
        openPuzzle();el('feedback').textContent=message;el('input').querySelector('input').focus();
      }else{
        dialog.close();el('status').textContent=message+' '+(stage===state.stage?el('guide').textContent:warChapters[stage].result);
      }
      return;
    }
    if(fields.has('circuit')){
      if(!warRestore(state,warCircuits[Number(fields.get('circuit'))])){
        sound.cue('error');
        el('feedback').textContent='Esse circuito não corresponde às duas pistas. Confira a ala no rádio e o ramal na etiqueta.';return;
      }
      sound.cue('power');state.facing=state.x<warBreaker[0]?'d':'w';persist();dialog.close();draw();act(4,600);
      svg.classList.add('wr-boot');el('status').textContent='Ravi no rádio: “Telemetria de volta! Já vejo a fila dos workers.”';return;
    }
    const input=stage===0?Number(fields.get('revision')):stage===1?Number(fields.get('workers')):order;
    if(!warSolve(state,input)){
      sound.cue('error');
      el('feedback').textContent=stage===0?warChapters[0].hints[input]:stage===1?
        (input*3>24?'Esse limite invade as conexões reservadas ao checkout.':'Ainda há conexões livres. Divida o saldo igualmente pelos três workers.'):
        'Reserve a chave primeiro. Confirme a transação antes de liberar a mensagem com ACK.';
      return;
    }
    const graduated=stage===0&&tutorial==='active'&&state.printed.includes('tracker');
    sound.cue(state.power==='dark'?'blackout':state.hull==='breached'?'quake':'success');
    if(graduated)setTutorial('done');
    persist();dialog.close();draw();if(state.hull==='breached')root.classList.add('wr-impacting');el('status').textContent=(graduated?'Primeiro incidente concluído. O guia volta durante o tremor e a tempestade. ':'')+warChapters[stage].result;
  };
  el('close').onclick=()=>dialog.close();dialog.onclose=()=>{
    delete dialog.dataset.field;
    if(board.isConnected){el('puzzle').querySelector('[type=submit]').textContent='Aplicar decisão';board.focus({preventScroll:true});}
  };
  pad.onpointerdown=e=>{
    const b=e.target.closest('[data-move]');if(!b||b.disabled||e.button!==0)return;
    e.preventDefault();b.setPointerCapture(e.pointerId);board.focus({preventScroll:true});controls.press(e.pointerId,b.dataset.move);
  };
  pad.onpointerup=pad.onpointercancel=pad.onlostpointercapture=e=>controls.release(e.pointerId);
  pad.onclick=e=>{const b=e.target.closest('[data-move]');if(b&&e.detail===0){move(b.dataset.move);board.focus({preventScroll:true});}};
  el('use').onclick=()=>{board.focus({preventScroll:true});use();};
  el('replay').onclick=()=>{controls.stop();Object.assign(state,warState());svg.classList.remove('wr-boot');root.classList.remove('wr-impacting');stride=0;pose(0);persist();draw();el('status').textContent='Novo plantão iniciado.';board.focus();};
  function keyboard(e){
    if(!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey)sound.unlock();
    if(intro.open||dialog.open||notebook.open||state.stage===warChapters.length||e.defaultPrevented||e.ctrlKey||e.altKey||e.metaKey||e.target.closest?.('input,textarea,select,[contenteditable=true]'))return;
    const key=({ArrowUp:'w',ArrowDown:'s',ArrowLeft:'a',ArrowRight:'d'})[e.key]||e.key.toLowerCase();
    if(Object.hasOwn(warDirections,key)){
      e.preventDefault();if(!e.repeat)controls.press(e.code||e.key,key);
    }else if(key==='e'&&warMaterialHere(state)){
      e.preventDefault();if(!e.repeat)gather();
    }else if(key==='n'){
      e.preventDefault();if(!e.repeat)openNotebook();
    }else if(key==='q'&&warHazard(state)){
      e.preventDefault();if(!e.repeat)waitPulse();
    }else if(e.code==='Space'&&!e.target.closest?.('a,button,summary')){
      e.preventDefault();if(!e.repeat)use();
    }
  }
  document.addEventListener('keydown',keyboard);
  const keyup=e=>controls.release(e.code||e.key);
  const visibility=()=>{if(document.hidden)controls.stop();sound.visibility();};
  document.addEventListener('keyup',keyup);document.addEventListener('visibilitychange',visibility);
  window.addEventListener('blur',controls.stop);
  function unbindGame(){document.removeEventListener('keydown',keyboard);document.removeEventListener('keyup',keyup);
    window.removeEventListener('blur',controls.stop);controls.stop();clearTimeout(idleTimer);}
  disposeWarroom=()=>{unbindGame();clearTimeout(closing);editor?.destroy();document.removeEventListener('visibilitychange',visibility);
    root.removeEventListener('pointerdown',sound.unlock,true);root.removeEventListener('click',sound.unlock,true);sound.close();};
  draw();pose(0);
  if(startDelivery)openNotebook('delivery');else if(!tutorial&&state.stage===0)showIntro();
}
