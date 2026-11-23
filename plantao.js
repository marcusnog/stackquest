let disposePlantao;
const plantaoLesson=archLessons.checkout;
const plantaoCoord=i=>String.fromCharCode(65+i%4)+(1+Math.floor(i/4));
const plantaoCell=i=>Number.isInteger(i)&&i>=0&&i<16;

function plantaoAnimate(node,kind){
  if(!node?.animate||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const frames=kind==='wire'?[{strokeDasharray:'1',strokeDashoffset:'1'},{strokeDasharray:'1',strokeDashoffset:'0'}]:
    kind==='collect'?[{filter:'brightness(1.6)',scale:'1.08'},{filter:'brightness(1)',scale:'1'}]:
    kind==='install'?[{opacity:.25,filter:'brightness(1.8)'},{opacity:1,filter:'brightness(1)'}]:
    [{opacity:.55},{opacity:1}];
  node.animate(frames,{duration:['install','wire'].includes(kind)?480:260,easing:'ease-out'});
}

function plantaoState(raw={}){
  const tiles=Array(16).fill(null);tiles[4]='client';
  if(Array.isArray(raw?.tiles))for(let i=0;i<16;i++){
    const type=raw.tiles[i];
    if(i!==4&&type!=='client'&&Object.hasOwn(plantaoParts,type))tiles[i]=type;
  }
  const edges=[];
  if(Array.isArray(raw?.edges))for(const edge of raw.edges){
    if(edge&&plantaoCell(edge.from)&&plantaoCell(edge.to)&&edge.from!==edge.to&&tiles[edge.from]&&tiles[edge.to]&&!edges.some(e=>e.from===edge.from&&e.to===edge.to))
      edges.push({from:edge.from,to:edge.to});
  }
  const cleared=Number.isInteger(raw?.cleared)?Math.max(0,Math.min(3,raw.cleared)):0;
  const wave=Number.isInteger(raw?.wave)?Math.max(0,Math.min(raw.wave,cleared,2)):0;
  return {tiles,edges,wave,cleared,workshop:plantaoWorkshop(raw?.workshop,tiles),
    guideOn:typeof raw?.guideOn==='boolean'?raw.guideOn:cleared===0,guideBank:raw?.guideBank==='kv'?'kv':'sql',
    area:raw?.area==='terrain'||(raw?.area!=='depot'&&tiles.some(t=>t&&t!=='client'))?'terrain':'depot',
    recipe:Object.hasOwn(plantaoRecipes,raw?.recipe)?raw.recipe:'api',pool:[1,2,3,4].includes(raw?.pool)?raw.pool:1,
    policy:raw?.policy==='condicional'?'condicional':'separada',provider:Object.hasOwn(archClouds,raw?.provider)?raw.provider:'aws',
    scores:plantaoWaves.map((_,i)=>{
      const row=raw?.scores?.[i];
      return row&&['correct','total','spent','p95'].every(k=>Number.isFinite(row[k]))?{correct:row.correct,total:row.total,spent:row.spent,p95:row.p95}:null;
    })};
}

function plantaoPage(){
  const state=plantaoState(records.get(plantaoLesson)?.plantao),esc=studioText;
  const spend=()=>plantaoSpent(state.tiles);
  const latency=score=>score.p95>0?score.p95+' ms':'sem resposta';
  const summary=score=>score.correct+'/'+score.total+' corretos · '+latency(score)+' · '+score.spent+' créditos.';
  let selected=4, tool='inspect',source=null,result=null,frame=-1,timer=0,finished=false,prior=null,inspectingResult=false;
  const persist=()=>save(plantaoLesson,{plantao:state});
  const stop=()=>{clearInterval(timer);timer=0;};
  disposePlantao=stop;
  main.innerHTML=`<div class="pg-game"><header class="pg-bar"><a href="#laboratorios"><img src="mark.svg" alt="">StackQuest</a><span>/</span><a href="#laboratorios">Laboratórios</a><a href="#aparencia">Aparência</a></header>
    <div class="pg-content"><header class="pg-heading"><div><small>MINIGAME · CONSTRUÇÃO DE SERVIDORES</small><h1>Plantão no Datacenter</h1></div><div class="pg-wallet"><span>Créditos disponíveis</span><strong id="pg-budget"></strong></div></header>
    <section class="pg-brief"><div><small>MISSÃO</small><h2>A última unidade</h2><p>Abra a loja, absorva o pico e resolva a disputa pela última unidade de estoque.</p></div><nav id="pg-waves" aria-label="Ondas da missão"></nav></section>
    <section class="pg-coach"><div id="pg-guidance"><small id="pg-guide-step"></small><h2 id="pg-guide-title" aria-live="polite"></h2><p id="pg-guide-copy"></p><div id="pg-guide-banks" hidden><span>Banco para a montagem</span><button data-bank="sql">SQL</button><button data-bank="kv">Chave-valor</button></div></div><div class="pg-guide-tools"><button id="pg-show-action">Mostrar ação</button><button id="pg-toggle-guide">Pular guia</button></div></section>
    <div class="pg-grid"><section class="pg-play"><header><div class="pg-areas" role="group" aria-label="Área do datacenter"><button data-area="terrain">Terreno da loja</button><button data-area="depot">Almoxarifado</button></div><span id="pg-pos"></span></header><div id="pg-map"></div>
    <section id="pg-depot" aria-label="Almoxarifado de hardware"><h2>Almoxarifado de hardware</h2><p>Selecione um lote para recolher até duas peças.</p><div class="cj-yard">${correioStation({},true)}<div id="pg-sources" class="cj-sources"></div></div></section>
    <section class="cj-bag" aria-label="Inventário de hardware"><h3>Inventário</h3><div id="pg-slots"></div><button id="pg-open-craft">Abrir oficina</button></section>
    <p id="pg-help" role="status"></p><div class="pg-build"><h3>Servidores prontos para instalar</h3><div id="pg-parts"></div></div>
    <div class="pg-tools"><button data-tool="inspect">${icon('search',15)} Inspecionar</button><button data-tool="wire">${icon('network',16)} Ligar blocos</button><button data-tool="remove">Remover bloco</button></div></section>
    <aside class="pg-side"><section class="pg-round pg-rack"><h2>Oficina de servidores</h2><div id="pg-recipes" role="group" aria-label="Receitas de servidores"></div><p id="pg-purpose"></p><div id="pg-cost-parts"></div><button id="pg-craft" class="pg-primary"></button><button id="pg-find">Ir coletar peças</button><button id="pg-recycle">Desmontar um servidor em estoque</button></section>
    <section class="pg-round"><small id="pg-wave-count"></small><h2 id="pg-wave-name"></h2><p id="pg-goal"></p><button id="pg-run" class="pg-primary"></button><div id="pg-controls" hidden><button id="pg-pause"></button><button id="pg-step">Um evento →</button><button id="pg-end">Ver resultado</button></div><div id="pg-meters"></div><p id="pg-event" role="status"></p><div id="pg-result"></div></section>
    <section class="pg-inspector"><h2>Inspeção do bloco</h2><div id="pg-detail"></div><div id="pg-links"></div></section></aside></div>
    <section class="pg-settings"><div><h2>Operação da loja</h2><label>Conexões por API<select id="pg-pool">${[1,2,3,4].map(n=>'<option>'+n+'</option>').join('')}</select></label><label>Reserva de estoque<select id="pg-policy"><option value="separada">Leitura e gravação separadas</option><option value="condicional">Escrita condicional no banco</option></select></label></div>
    <div><h2>Custo da stack</h2><label>Provedor<select id="pg-cloud">${Object.entries(archClouds).map(([k,p])=>'<option value="'+k+'">'+esc(p.name)+'</option>').join('')}</select></label><p id="pg-cost"></p><small>Estimativa mensal para 730 h por máquina e 10 GB totais de disco. Os créditos do jogo limitam a construção.</small></div></section>
    <details class="pg-manual"><summary>Como jogar</summary><ol><li>Recolha CPU, RAM e SSD no almoxarifado. Na oficina, compare o inventário com a receita e fabrique uma API. Clique em uma parcela vazia para instalá-la e repita com um banco SQL ou chave-valor. Os créditos são cobrados na instalação.</li><li>Use Ligar blocos. Escolha a origem e depois o destino. Desenhe loja → API → banco. Para apagar uma ligação, inspecione uma das pontas.</li><li>Inicie a onda. Pause ou avance um evento para investigar a fila, a CPU e as conexões ocupadas. Após o resultado, inspecione os blocos para ver o diagnóstico.</li><li>Remover um bloco devolve o servidor ao estoque e libera seus créditos. Você pode reinstalá-lo ou escolher a receita na oficina e desmontá-lo para recuperar as peças.</li></ol><a href="#lab/arquitetura/checkout">Abrir o simulador de arquitetura do checkout →</a></details></div></div>`;
  const root=main.querySelector('.pg-game'),el=name=>root.querySelector('#pg-'+name);
  const tools=()=>root.querySelectorAll('[data-tool]');
  const locked=()=>!!result&&!finished;
  const currentFrame=()=>result?.frames[frame];
  const label=i=>plantaoParts[state.tiles[i]]?.name||'Parcela livre';
  const message=text=>{el('help').textContent=text;};
  let guidance;
  function paintGuide(){
    const priorTitle=guidance?.title;
    root.querySelector('.pg-guided')?.classList.remove('pg-guided');
    guidance=plantaoGuide(state,{tool,source,locked:locked(),failed:finished&&!result.pass});
    el('guidance').hidden=!state.guideOn;
    el('show-action').hidden=!state.guideOn||state.cleared>0;
    el('toggle-guide').textContent=state.guideOn?(state.cleared?'Fechar guia':'Pular guia'):(state.cleared?'Ver guia':'Retomar guia');
    if(!state.guideOn)return;
    el('guide-step').textContent='MONTAGEM GUIADA · '+guidance.stage+' / 4';
    if(el('guide-title').textContent!==guidance.title)el('guide-title').textContent=guidance.title;
    el('guide-copy').textContent=guidance.body;
    el('guide-banks').hidden=guidance.stage!==2;
    for(const b of el('guide-banks').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.bank===state.guideBank));
    if(!state.cleared)root.querySelector(guidance.target)?.classList.add('pg-guided');
    if(priorTitle && priorTitle!==guidance.title)plantaoAnimate(el('guidance'),'area');
  }
  const resources=Object.entries(plantaoMaterials),types=Object.keys(plantaoRecipes);
  el('sources').innerHTML=resources.map(([id,m])=>'<button data-gather="'+id+'"><span class="cj-stack">'+plantaoSprite(id)+'</span><strong>'+m.name+'</strong><span class="cj-source-qty"></span></button>').join('');
  el('slots').innerHTML=resources.map(([id,m])=>'<div class="cj-slot">'+plantaoSprite(id)+'<span>'+m.name+'</span><b id="pg-stock-'+id+'"></b></div>').join('');
  el('recipes').innerHTML=types.map(t=>'<button data-recipe="'+t+'">'+plantaoSprite(t)+'<span>'+plantaoParts[t].name+'</span></button>').join('');
  el('parts').innerHTML=types.map(t=>'<button data-tool="'+t+'">'+plantaoSprite(t)+'<span>'+plantaoParts[t].name+'<small></small></span></button>').join('');
  function paintWorkshop(){
    const depot=state.area==='depot',bag=plantaoBag(state),recipe=plantaoRecipes[state.recipe];
    el('map').hidden=depot;el('depot').hidden=!depot;el('pos').hidden=depot;
    for(const b of root.querySelectorAll('[data-area]')){
      b.setAttribute('aria-pressed',String(b.dataset.area===state.area));b.disabled=locked();
    }
    for(const [id,m] of resources){
      const left=Math.max(0,m.stock-state.workshop.harvested[id]),b=root.querySelector('[data-gather="'+id+'"]');
      b.disabled=locked()||!left;b.setAttribute('aria-label','Coletar '+m.name+' · '+left+' disponíveis');
      b.querySelector('.cj-source-qty').textContent=left?'×'+left+' disponíveis':'Esgotado';
      el('stock-'+id).textContent='×'+bag[id];
    }
    for(const b of el('recipes').children){
      b.setAttribute('aria-pressed',String(state.recipe===b.dataset.recipe));b.disabled=locked();
    }
    el('purpose').textContent=plantaoParts[state.recipe].description;
    el('cost-parts').innerHTML='<small>Em mãos / necessário</small>'+Object.entries(recipe).map(([id,n])=>'<span class="'+(bag[id]>=n?'ready':'')+'">'+plantaoMaterials[id].name+' <b>'+bag[id]+'/'+n+'</b></span>').join('');
    el('craft').textContent='Fabricar '+plantaoParts[state.recipe].name;
    el('craft').disabled=locked()||!plantaoCanCraft(state.recipe,bag);
    el('find').hidden=!el('craft').disabled||locked();
    const next=Object.keys(recipe).find(id=>bag[id]<recipe[id] && state.workshop.harvested[id]<plantaoMaterials[id].stock);
    el('find').dataset.resource=next||'';
    el('find').textContent=next?'Ir coletar peças':'Recupere peças desmontando servidores';
    el('find').disabled=!next;
    el('recycle').hidden=!state.workshop.kits[state.recipe];
    el('recycle').disabled=locked();el('open-craft').disabled=locked();
  }
  function map(){
    el('map').innerHTML=plantaoMap(state.tiles,{selected,edges:state.edges,active:locked()?currentFrame()?.cell:null});
    el('pos').textContent=plantaoCoord(selected)+' · '+label(selected);
    if(state.guideOn && guidance)el('map').querySelector(guidance.target)?.classList.add('pg-guided');
  }
  function inspector(){
    el('detail').innerHTML='<strong>'+esc(plantaoCoord(selected)+' · '+label(selected))+'</strong><p>'+esc(plantaoParts[state.tiles[selected]]?.description||'Uma parcela livre pode receber um servidor.')+'</p>'+
      (finished&&inspectingResult&&!result.pass?'<div class="pg-advice"><b>Diagnóstico da onda</b><p>'+esc(result.hint)+'</p></div>':'');
    const links=state.edges.filter(e=>e.from===selected||e.to===selected);
    el('links').innerHTML=links.map(e=>'<div><span>'+esc(plantaoCoord(e.from)+' → '+plantaoCoord(e.to))+'</span><button data-unwire="'+e.from+','+e.to+'" aria-label="Desligar '+plantaoCoord(e.from)+' de '+plantaoCoord(e.to)+'" '+(locked()?'disabled':'')+'>Desligar</button></div>').join('');
  }
  function paintBuild(){
    paintWorkshop();
    for(const b of tools()){
      const t=b.dataset.tool,kit=Object.hasOwn(plantaoRecipes,t);
      b.setAttribute('aria-pressed',String(tool===t));
      b.disabled=(locked()&&t!=='inspect')||(kit&&!state.workshop.kits[t]);
      if(kit)b.querySelector('small').textContent='×'+state.workshop.kits[t]+' · '+plantaoParts[t].price+' créditos';
    }
    el('pool').disabled=el('policy').disabled=locked();
    el('pool').value=String(state.pool);el('policy').value=state.policy;el('cloud').value=state.provider;
    el('budget').textContent=(plantaoBudget-spend())+' / '+plantaoBudget;
    const quote=archCost(state.provider,state.tiles.filter(Boolean).map(type=>({type})),{hours:730,storage:10});
    el('cost').textContent=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD'}).format(quote.total)+' / mês';
  }
  function waves(){
    el('waves').innerHTML=plantaoWaves.map((w,i)=>'<button data-wave="'+i+'" '+(i===state.wave?'aria-current="step" ':'')+(i>state.cleared||locked()?'disabled':'')+'><span>'+(i<state.cleared?'✓':i+1)+'</span>'+esc(w.name)+'</button>').join('');
    el('wave-count').textContent='ONDA '+(state.wave+1)+' / 3';el('wave-name').textContent=plantaoWaves[state.wave].name;el('goal').textContent=plantaoWaves[state.wave].goal;
  }
  function playback(){
    const f=currentFrame();
    el('controls').hidden=!locked();el('pause').textContent=timer?'Pausar':'Continuar';el('step').disabled=!!timer;
    el('run').hidden=locked();el('run').textContent=finished?'↻ Repetir a carga':'▶ Iniciar onda';
    el('meters').innerHTML=[['Fila',f?.queue],['CPU',f?f.cpu+'%':null],['Conexões',f?.connections]].map(([k,v])=>'<div><span>'+k+'</span><strong>'+(v??'—')+'</strong></div>').join('');
    el('event').textContent=f?'Evento '+(frame+1)+'/'+result.frames.length+' · '+f.text:'Inicie a onda para acompanhar os pedidos.';
    if(!finished){
      const saved=state.scores[state.wave];
      el('result').textContent=!result&&saved?'Última rodada salva: '+summary(saved):'';
      return;
    }
    const comparison=prior?'Rodada anterior: '+summary(prior):'';
    const win=state.wave===2&&result.pass;
    el('result').innerHTML='<div class="pg-score '+(result.pass?'win':'loss')+'"><strong>'+ (win?'Missão concluída':result.pass?'Onda vencida':'Objetivo pendente')+'</strong><p>'+result.correct+'/'+result.total+' pedidos corretos · '+result.confirmed+(result.confirmed===1?' confirmado':' confirmados')+'</p><p>Latência p95: '+latency(result)+' · '+result.spent+' créditos</p><small>'+esc(comparison)+'</small></div>'+
      (result.pass&&state.wave<2?'<button id="pg-next" class="pg-primary">Próxima onda →</button>':!result.pass?'<button id="pg-diagnose">Inspecionar falha</button>':'');
  }
  function renderGame(){map();waves();paintBuild();playback();inspector();paintGuide();}
  function clearRun(){stop();result=null;finished=false;frame=-1;inspectingResult=false;source=null;}
  function edited(text){clearRun();tool='inspect';persist();renderGame();message(text);}
  function finish(){
    stop();finished=true;frame=result.frames.length-1;
    if(result.pass)state.cleared=Math.max(state.cleared,state.wave+1);
    const {correct,total,p95,spent}=result;state.scores[state.wave]={correct,total,p95,spent};
    persist();renderGame();plantaoAnimate(el('result'),'area');message(result.pass?'Carga finalizada. Consulte seu placar.':'Carga finalizada. Inspecione a falha e ajuste a construção.');
  }
  function advance(){if(frame+1>=result.frames.length){finish();return;}frame++;map();playback();}
  function play(){timer=setInterval(advance,650);playback();}
  function run(){
    clearRun();state.area='terrain';tool='inspect';prior=state.scores[state.wave];result=runPlantao(state,state.wave);
    frame=0;message('Acompanhe o fluxo. Pause para examinar cada evento.');
    play();renderGame();
  }
  function changeWave(i){
    if(locked()||i>state.cleared||!plantaoWaves[i])return;
    clearRun();state.wave=i;tool='inspect';persist();renderGame();plantaoAnimate(el('wave-name').parentElement,'area');message('Terreno mantido. Prepare a stack para esta carga.');
  }
  function cell(i){
    selected=i;
    if(locked()||tool==='inspect'){inspectingResult=finished;map();inspector();return;}
    if(tool==='wire'){
      if(!state.tiles[i]){map();message('Escolha uma peça já construída.');return;}
      if(source===null){source=i;map();inspector();paintGuide();message('Origem '+plantaoCoord(i)+'. Agora escolha o destino.');return;}
      if(source===i||state.edges.some(e=>e.from===source&&e.to===i)){message('Escolha um destino diferente e ainda sem essa ligação.');return;}
      const from=source;
      state.edges.push({from,to:i});edited('Ligação criada.');plantaoAnimate(el('map').querySelector('[data-wire="'+from+'-'+i+'"]'),'wire');return;
    }
    if(tool==='remove'){
      if(!state.tiles[i]||state.tiles[i]==='client'){map();message('Escolha um bloco construído para remover.');return;}
      const refund=plantaoParts[state.tiles[i]].price;
      plantaoUninstall(state,i);edited('Servidor devolvido ao estoque. '+refund+' créditos liberados.');return;
    }
    if(state.tiles[i]){map();inspector();message('Parcela ocupada. Escolha uma parcela livre.');return;}
    if(spend()+plantaoParts[tool].price>plantaoBudget){message('Créditos insuficientes. Remova uma peça para recuperar seu custo.');return;}
    if(!plantaoInstall(state,tool,i)){message('Fabrique este servidor na oficina antes de instalá-lo.');return;}
    edited(label(i)+' em '+plantaoCoord(i)+'. Use Ligar blocos para incluí-lo no fluxo.');
    plantaoAnimate(el('map').querySelector('[data-cell="'+i+'"]'),'install');
  }
  root.onclick=e=>{
    const hit=e.target.closest('[data-cell]');if(hit){cell(Number(hit.dataset.cell));return;}
    const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.id==='pg-toggle-guide'){state.guideOn=!state.guideOn;persist();paintGuide();return;}
    if(b.id==='pg-show-action'){root.querySelector(guidance.target)?.focus();return;}
    if(b.dataset.bank){state.guideBank=b.dataset.bank;state.recipe=b.dataset.bank;persist();paintBuild();paintGuide();return;}
    if(b.dataset.area){state.area=b.dataset.area;source=null;tool='inspect';persist();paintBuild();paintGuide();plantaoAnimate(el(state.area==='depot'?'depot':'map'),'area');message(state.area==='depot'?'Escolha um lote para abastecer seu inventário.':'Inspecione um bloco ou selecione um servidor em estoque.');return;}
    if(b.dataset.gather){const id=b.dataset.gather,n=plantaoCollect(state,id);persist();paintBuild();paintGuide();plantaoAnimate(b.querySelector('svg'),'collect');plantaoAnimate(el('stock-'+id).parentElement,'collect');message('Inventário recebeu '+n+' × '+plantaoMaterials[id].name+'.');return;}
    if(b.dataset.recipe){state.recipe=b.dataset.recipe;if(['sql','kv'].includes(state.recipe))state.guideBank=state.recipe;persist();paintBuild();paintGuide();return;}
    if(b.id==='pg-open-craft'){el('recipes').querySelector('[aria-pressed="true"]').focus();return;}
    if(b.id==='pg-find'){state.area='depot';persist();paintBuild();paintGuide();el('sources').querySelector('[data-gather="'+b.dataset.resource+'"]').focus();return;}
    if(b.id==='pg-craft'&&plantaoCraft(state,state.recipe)){
      state.area='terrain';tool=state.recipe;source=null;persist();paintBuild();paintGuide();plantaoAnimate(el('parts').querySelector('[data-tool="'+tool+'"]'),'collect');plantaoAnimate(el('map'),'area');
      message(plantaoParts[tool].name+' em estoque. Escolha uma parcela vazia para instalar por '+plantaoParts[tool].price+' créditos.');
      el('map').querySelector('[data-cell="'+state.tiles.indexOf(null)+'"]')?.focus();return;
    }
    if(b.id==='pg-recycle'&&plantaoRecycle(state,state.recipe)){
      if(tool===state.recipe&&!state.workshop.kits[tool])tool='inspect';
      persist();paintBuild();paintGuide();message('Servidor desmontado. As peças voltaram ao inventário.');return;
    }
    if(b.dataset.tool){state.area='terrain';tool=b.dataset.tool;source=null;persist();paintBuild();paintGuide();message(tool==='wire'?'Selecione o bloco de origem e depois o destino.':tool==='inspect'?'Selecione um bloco para inspecionar.':tool==='remove'?'Selecione o servidor para devolvê-lo ao estoque.':'Selecione uma parcela livre para instalar '+plantaoParts[tool].name+'.');return;}
    if(b.dataset.unwire){const [from,to]=b.dataset.unwire.split(',').map(Number);state.edges=state.edges.filter(e=>e.from!==from||e.to!==to);edited('Ligação removida.');return;}
    if(b.dataset.wave!==undefined){changeWave(Number(b.dataset.wave));return;}
    switch(b.id){
      case 'pg-run':run();break;
      case 'pg-end':finish();break;
      case 'pg-step':advance();break;
      case 'pg-pause':if(timer){stop();playback();}else play();break;
      case 'pg-next':changeWave(state.wave+1);break;
      case 'pg-diagnose':inspectingResult=true;inspector();el('detail').scrollIntoView({block:'nearest'});break;
    }
  };
  el('map').onkeydown=e=>{
    const hit=e.target.closest('[data-cell]');
    if(hit&&['Enter',' '].includes(e.key)){e.preventDefault();const i=Number(hit.dataset.cell);cell(i);el('map').querySelector('[data-cell="'+i+'"]')?.focus();}
  };
  el('pool').onchange=e=>{state.pool=Number(e.target.value);edited('Limite de conexões atualizado.');};
  el('policy').onchange=e=>{state.policy=e.target.value;edited('Política de reserva atualizada.');};
  el('cloud').onchange=e=>{state.provider=e.target.value;persist();paintBuild();};
  renderGame();message(spend()?'Seu terreno foi restaurado. Inspecione um bloco ou inicie a onda.':'Recolha 2 CPU e 1 RAM para fabricar sua primeira API. Depois, instale um banco e ligue os servidores.');
}
