let disposePlantao;
const plantaoLesson=archLessons.checkout;
const plantaoCoord=i=>String.fromCharCode(65+i%4)+(1+Math.floor(i/4));
const plantaoCell=i=>Number.isInteger(i)&&i>=0&&i<16;

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
  return {tiles,edges,wave,cleared,pool:[1,2,3,4].includes(raw?.pool)?raw.pool:1,
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
    <div class="pg-grid"><section class="pg-play"><header><h2>Terreno da loja</h2><span id="pg-pos"></span></header><div id="pg-map"></div>
    <p id="pg-help" role="status"></p><div class="pg-build"><h3>Blocos de construção</h3><div id="pg-parts"></div></div>
    <div class="pg-tools"><button data-tool="inspect">${icon('search',15)} Inspecionar</button><button data-tool="wire">${icon('network',16)} Ligar blocos</button><button data-tool="remove">Remover bloco</button></div></section>
    <aside class="pg-side"><section class="pg-round"><small id="pg-wave-count"></small><h2 id="pg-wave-name"></h2><p id="pg-goal"></p><button id="pg-run" class="pg-primary"></button><div id="pg-controls" hidden><button id="pg-pause"></button><button id="pg-step">Um evento →</button><button id="pg-end">Ver resultado</button></div><div id="pg-meters"></div><p id="pg-event" role="status"></p><div id="pg-result"></div></section>
    <section class="pg-inspector"><h2>Inspeção do bloco</h2><div id="pg-detail"></div><div id="pg-links"></div></section></aside></div>
    <section class="pg-settings"><div><h2>Operação da loja</h2><label>Conexões por API<select id="pg-pool">${[1,2,3,4].map(n=>'<option>'+n+'</option>').join('')}</select></label><label>Reserva de estoque<select id="pg-policy"><option value="separada">Leitura e gravação separadas</option><option value="condicional">Escrita condicional no banco</option></select></label></div>
    <div><h2>Custo da stack</h2><label>Provedor<select id="pg-cloud">${Object.entries(archClouds).map(([k,p])=>'<option value="'+k+'">'+esc(p.name)+'</option>').join('')}</select></label><p id="pg-cost"></p><small>Estimativa mensal para 730 h por máquina e 10 GB totais de disco. Os créditos do jogo limitam a construção.</small></div></section>
    <details class="pg-manual"><summary>Como jogar</summary><ol><li>Escolha uma API e clique em uma parcela vazia. Faça o mesmo com um banco. A loja inicia os pedidos em A2.</li><li>Use Ligar blocos. Escolha a origem e depois o destino. Desenhe loja → API → banco. Para apagar uma ligação, inspecione uma das pontas.</li><li>Inicie a onda. Pause ou avance um evento para investigar a fila, a CPU e as conexões ocupadas. Após o resultado, inspecione os blocos para ver o diagnóstico.</li><li>Compare arquiteturas repetindo a mesma carga. Remover um bloco devolve seus créditos. Ondas vencidas continuam disponíveis.</li></ol><a href="#lab/arquitetura/checkout">Abrir o simulador de arquitetura do checkout →</a></details></div></div>`;
  const root=main.querySelector('.pg-game'),el=name=>root.querySelector('#pg-'+name);
  const tools=()=>root.querySelectorAll('[data-tool]');
  const locked=()=>!!result&&!finished;
  const currentFrame=()=>result?.frames[frame];
  const label=i=>plantaoParts[state.tiles[i]]?.name||'Parcela livre';
  const message=text=>{el('help').textContent=text;};
  function map(){el('map').innerHTML=plantaoMap(state.tiles,{selected,edges:state.edges,active:locked()?currentFrame()?.cell:null});el('pos').textContent=plantaoCoord(selected)+' · '+label(selected);}
  function inspector(){
    el('detail').innerHTML='<strong>'+esc(plantaoCoord(selected)+' · '+label(selected))+'</strong><p>'+esc(plantaoParts[state.tiles[selected]]?.description||'Uma parcela livre pode receber um servidor.')+'</p>'+
      (finished&&inspectingResult&&!result.pass?'<div class="pg-advice"><b>Diagnóstico da onda</b><p>'+esc(result.hint)+'</p></div>':'');
    const links=state.edges.filter(e=>e.from===selected||e.to===selected);
    el('links').innerHTML=links.map(e=>'<div><span>'+esc(plantaoCoord(e.from)+' → '+plantaoCoord(e.to))+'</span><button data-unwire="'+e.from+','+e.to+'" aria-label="Desligar '+plantaoCoord(e.from)+' de '+plantaoCoord(e.to)+'" '+(locked()?'disabled':'')+'>Desligar</button></div>').join('');
  }
  function paintBuild(){
    el('parts').innerHTML=['api','sql','kv','cache'].map(t=>'<button data-tool="'+t+'" aria-pressed="'+(tool===t)+'" '+(locked()?'disabled':'')+'>'+plantaoSprite(t)+'<span>'+esc(plantaoParts[t].name)+'<small>'+plantaoParts[t].price+' créditos</small></span></button>').join('');
    for(const b of tools()){b.setAttribute('aria-pressed',String(tool===b.dataset.tool));b.disabled=locked()&&b.dataset.tool!=='inspect';}
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
  function renderGame(){map();waves();paintBuild();playback();inspector();}
  function clearRun(){stop();result=null;finished=false;frame=-1;inspectingResult=false;source=null;}
  function edited(text){clearRun();tool='inspect';persist();renderGame();message(text);}
  function finish(){
    stop();finished=true;frame=result.frames.length-1;
    if(result.pass)state.cleared=Math.max(state.cleared,state.wave+1);
    const {correct,total,p95,spent}=result;state.scores[state.wave]={correct,total,p95,spent};
    persist();renderGame();message(result.pass?'Carga finalizada. Consulte seu placar.':'Carga finalizada. Inspecione a falha e ajuste a construção.');
  }
  function advance(){if(frame+1>=result.frames.length){finish();return;}frame++;map();playback();}
  function play(){timer=setInterval(advance,650);playback();}
  function run(){
    clearRun();tool='inspect';prior=state.scores[state.wave];result=runPlantao(state,state.wave);
    frame=0;message('Acompanhe o fluxo. Pause para examinar cada evento.');
    play();renderGame();
  }
  function changeWave(i){
    if(locked()||i>state.cleared||!plantaoWaves[i])return;
    clearRun();state.wave=i;tool='inspect';persist();renderGame();message('Terreno mantido. Prepare a stack para esta carga.');
  }
  function cell(i){
    selected=i;
    if(locked()||tool==='inspect'){inspectingResult=finished;map();inspector();return;}
    if(tool==='wire'){
      if(!state.tiles[i]){map();message('Escolha uma peça já construída.');return;}
      if(source===null){source=i;map();inspector();message('Origem '+plantaoCoord(i)+'. Agora escolha o destino.');return;}
      if(source===i||state.edges.some(e=>e.from===source&&e.to===i)){message('Escolha um destino diferente e ainda sem essa ligação.');return;}
      state.edges.push({from:source,to:i});edited('Ligação criada.');return;
    }
    if(tool==='remove'){
      if(!state.tiles[i]||state.tiles[i]==='client'){map();message('Escolha um bloco construído para remover.');return;}
      const refund=plantaoParts[state.tiles[i]].price;state.tiles[i]=null;state.edges=state.edges.filter(e=>e.from!==i&&e.to!==i);edited('Bloco removido. '+refund+' créditos devolvidos.');return;
    }
    if(state.tiles[i]){map();inspector();message('Parcela ocupada. Escolha uma parcela livre.');return;}
    if(spend()+plantaoParts[tool].price>plantaoBudget){message('Créditos insuficientes. Remova uma peça para recuperar seu custo.');return;}
    state.tiles[i]=tool;edited(label(i)+' em '+plantaoCoord(i)+'. Use Ligar blocos para incluí-lo no fluxo.');
  }
  root.onclick=e=>{
    const hit=e.target.closest('[data-cell]');if(hit){cell(Number(hit.dataset.cell));return;}
    const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.tool){tool=b.dataset.tool;source=null;paintBuild();message(tool==='wire'?'Selecione o bloco de origem e depois o destino.':tool==='inspect'?'Selecione um bloco para inspecionar.':tool==='remove'?'Selecione o bloco para devolver seus créditos.':'Selecione uma parcela livre para construir '+plantaoParts[tool].name+'.');return;}
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
  renderGame();message(spend()?'Seu terreno foi restaurado. Inspecione um bloco ou inicie a onda.':'Construa uma API e um banco. Ligue a loja à API e a API ao banco.');
}
