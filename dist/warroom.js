let disposeWarroom;
function warroomPage(){
  const lesson='5-1',state=warState(records.get(lesson)?.warroom);
  main.innerHTML=`<div class="pg-game wr-game"><header class="pg-bar"><a href="#roadmap"><img src="mark.svg" alt="">StackQuest</a><span>/</span><a href="#laboratorios">Laboratórios</a><a href="#aparencia">Aparência</a></header>
  <div class="pg-content"><header class="pg-heading"><div><small>WAR ROOM · RPG DE ENGENHARIA</small><h1>Plantão em órbita</h1></div><div class="pg-wallet"><span>Incidentes resolvidos</span><strong id="wr-count"></strong><span id="wr-progress" aria-hidden="true"><i></i><i></i><i></i><b id="wr-ship">➤</b></span></div></header>
  <div class="wr-layout"><section class="pg-play"><header class="wr-mapbar"><h2>Convés de operações</h2><span id="wr-position"></span><span id="wr-power"></span></header>
  <div id="wr-board" tabindex="0" role="group" aria-label="Mapa da war room" aria-describedby="wr-keys wr-guide wr-position"><div class="wr-space" aria-hidden="true"><div class="wr-planet"><i></i><b></b></div><div class="wr-aurora"></div></div>${warMap()}<div class="wr-flyby" aria-hidden="true"><div class="wr-rock"><i></i><i></i><i></i><i></i></div></div></div>
  <div class="wr-objective"><span class="wr-cross" aria-hidden="true">◎</span><div><small>OBJETIVO ATUAL</small><p id="wr-guide"></p></div></div>
  <div class="wr-controls"><div class="wr-equip"><span id="wr-equip-art" aria-hidden="true"></span><div><small>EM MÃOS</small><strong id="wr-equipped"></strong></div></div>
  <div class="wr-pad" role="group" aria-label="Movimento"><button data-move="w" aria-label="Andar para cima">↑</button><button data-move="a" aria-label="Andar para a esquerda">←</button><button data-move="s" aria-label="Andar para baixo">↓</button><button data-move="d" aria-label="Andar para a direita">→</button></div><button id="wr-use" class="pg-primary"><kbd>Espaço</kbd><span id="wr-verb"></span></button></div>
  <p id="wr-keys">WASD ou setas para andar e mirar. Espaço para interagir.</p><p class="wr-status" role="status" id="wr-status"></p></section>
  <aside class="pg-side"><section class="pg-round wr-card"><div class="wr-card-head"><small id="wr-card-no"></small><span aria-hidden="true">✦</span></div><h2 id="wr-title"></h2><p id="wr-radio"></p><small id="wr-time"></small></section><section class="pg-round"><h2>Mochila de Lia</h2><ul id="wr-bag"></ul></section><section class="pg-round"><h2>Diário do plantão</h2><ol id="wr-log"></ol><button id="wr-replay" hidden>Jogar novamente</button></section></aside></div>
  <dialog id="wr-dialog" aria-labelledby="wr-question"><form id="wr-puzzle"><small id="wr-terminal"></small><h2 id="wr-question"></h2><p id="wr-evidence"></p><div id="wr-input"></div><p role="status" id="wr-feedback"></p><div class="wr-actions"><button type="submit" class="pg-primary">Aplicar decisão</button><button id="wr-close" type="button">Voltar à sala</button></div></form></dialog></div></div>`;
  const root=main.querySelector('.wr-game'),el=id=>root.querySelector('#wr-'+id);
  const board=el('board'),dialog=el('dialog'),svg=board.querySelector('svg'),pad=root.querySelector('.wr-pad');
  const labels={on:'Rede elétrica ativa',dark:'Sem energia',torch:'Sem energia · lanterna ligada',restored:'Energia restabelecida'};
  const persist=()=>save(lesson,{warroom:{...state}});
  let order=[],lastMove=0;
  let stride=0,idleTimer=0;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
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
    const [px,py]=warPoint([state.x,state.y]),player=el('player');
    player.style.transform='translate('+px+'px,'+py+'px)';
    const mask=el('dark'),lamp=warBeam(state),lit=state.power==='torch';
    el('beam').setAttribute('transform','translate('+lamp.x+' '+lamp.y+') rotate('+lamp.angle+')');
    el('held').setAttribute('visibility',lit?'visible':'hidden');
    el('held').setAttribute('transform','translate('+(lamp.x-px)+' -17) rotate('+lamp.angle+')');
    if(lit)mask.setAttribute('mask','url(#wr-light-mask)');else mask.removeAttribute('mask');
    mask.setAttribute('opacity',dark ? .94 : 0);
    el('conduit').setAttribute('visibility',state.tagRead||warTagLit(state)?'visible':'hidden');
    svg.classList.toggle('wr-offline',dark);
    svg.classList.toggle('wr-restored',state.power==='restored');
    const beacon=state.power==='dark'?warAt(warTorch,'<circle r="11" fill="#f2cd84" opacity=".25"/>'+warItemArt('torch')):'';
    el('beacon').innerHTML=beacon+(state.power==='dark'?'<use href="#wr-player" opacity=".32"/>':'');
    const visible=target&&(target.kind!=='tag'||warTagLit(state))&&(target.kind!=='breaker'||Math.abs(state.x-warBreaker[0])+Math.abs(state.y-warBreaker[1])<=2);
    el('drop').innerHTML=visible?warAt(target.pos,'<ellipse class="wr-halo" cy="3" rx="19" ry="8" fill="none" stroke="#ffe18b" stroke-width="2" stroke-dasharray="5 3"/>'+
      (target.kind==='item'?warItemArt(state.stage):'')+'<path d="m-5-37 5 6 5-6z" fill="#ffe18b" stroke="#594b35"/>'):'';
    const near=warReach(state,target);
    el('position').textContent='Lia · '+warCoord([state.x,state.y]);
    board.setAttribute('aria-label','Mapa da war room. '+el('position').textContent+(near?'. Ao alcance: '+target.name:'.'));
    el('verb').textContent=near?({item:'Coletar item',torch:'Pegar lanterna',tag:'Ler etiqueta',breaker:'Examinar quadro',bulkhead:'Selar antepara',puzzle:'Abrir terminal'}[target.kind]):(target?'Fora de alcance':'Turno encerrado');
    el('use').disabled=!near;
  }
  function draw(){
    const ch=warChapters[state.stage],target=warTarget(state);
    el('count').textContent=state.stage+' / 3';el('power').textContent=labels[state.power];
    el('progress').querySelectorAll('i').forEach((pip,i)=>pip.classList.toggle('done',i<state.stage));
    el('ship').style.left=(state.stage*30)+'px';
    const storm=state.power==='torch'||state.power==='dark',breached=state.hull==='breached';
    root.classList.toggle('wr-storm',storm);root.classList.toggle('wr-breached',breached);
    el('ice').setAttribute('visibility',breached?'visible':'hidden');
    const card=storm?'Evento solar':breached?'Impacto orbital':state.stage===3?'Fim da travessia':'Incidente '+(state.stage+1)+' de 3';
    if(el('card-no').textContent!==card){
      el('card-no').textContent=card;
      if(!reduced.matches)root.querySelector('.wr-card').animate([{transform:'perspective(650px) rotateX(-13deg) translateY(-6px)'},{transform:'none'}],{duration:380,easing:'ease-out'});
    }
    el('power').classList.toggle('outage',state.power==='torch'||state.power==='dark');
    const equipped=state.power==='torch'?'Lanterna':state.collected?ch.item:'Mãos livres';
    el('equipped').textContent=equipped;
    el('equip-art').innerHTML=equipped==='Mãos livres'?'<span class="wr-portrait"></span>':'<svg viewBox="-17 -16 36 32">'+warItemArt(state.power==='torch'?'torch':state.stage)+'</svg>';
    el('time').textContent=['02:13','02:17','02:23','02:31'][state.stage]+' · RÁDIO DO PLANTÃO';
    el('title').textContent=storm?'Tempestade solar':breached?'Micrometeorito a estibordo':ch?.title||'Docagem concluída';
    el('radio').textContent=state.power==='dark'?'Uma tempestade solar aciona a proteção do convés. Os terminais se apagam. Ravi chama no rádio a bateria: “A lanterna está junto à porta.”':
      state.power==='torch'?'Ravi: “Só a ala leste perdeu telemetria. A etiqueta de manutenção entre os terminais indica o ramal dos monitores.”':
      breached?'Um micrometeorito atingiu o duto de refrigeração. O gelo tomou o corredor G. Ravi sinaliza o comando da antepara na parede do fundo.':
      ch?.radio||'Às 02:31, a nave de abastecimento atraca. Cada carga tem uma única cobrança. Lia entrega o rádio a Ravi e registra as decisões da travessia.';
    el('guide').textContent=!target?'Plantão concluído. Confira suas decisões no diário.':target.kind==='bulkhead'?'A fileira 5 está livre. Contorne o gelo e sele a antepara em G1.':target.kind==='tag'?'Ilumine a parede do fundo em D1. Aponte para a etiqueta e leia com Espaço.':
      target.kind==='breaker'?'Siga o conduíte até o quadro em I1. Cruze a etiqueta com o chamado de Ravi.':
      (target.kind==='puzzle'?'Abra o terminal ': 'Colete ')+target.name+' em '+warCoord(target.pos)+'.';
    const held=warChapters.filter((_,i)=>i<state.stage||(i===state.stage&&state.collected)).map(c=>c.item);
    if(['torch','restored'].includes(state.power))held.push('Lanterna de emergência');
    if(state.tagRead)held.push('Etiqueta · Monitores no ramal B');
    el('bag').innerHTML=held.length?held.map((s,i)=>'<li><svg viewBox="-17 -16 36 32" aria-hidden="true">'+warItemArt(s==='Lanterna de emergência'?'torch':i)+'</svg>'+s+'</li>').join(''):'<li>Mochila vazia</li>';
    el('log').innerHTML=(state.stage?warChapters.slice(0,state.stage).map(c=>'<li>'+c.result+'</li>').join(''):'<li>02:13 · Lia assumiu a investigação.</li>')+
      (state.power==='restored'?'<li>Circuito dos terminais rearmado.</li>':'')+(state.hull==='sealed'?'<li>Vazamento isolado. Passagem de estibordo liberada.</li>':'');
    el('replay').hidden=state.stage!==3;
    el('use').disabled=state.stage===3;for(const b of pad.children)b.disabled=state.stage===3;
    drawMap();
  }
  function move(key){
    if(state.stage===3)return;
    const previousFacing=state.facing;
    if(warMove(state,key)){
      persist();drawMap();el('status').textContent='';
      stride=stride===1?2:1;
      act(stride,125);
    }else{
      clearTimeout(idleTimer);pose(0);drawMap();
      if(previousFacing!==state.facing)persist();
      const [dx,dy]=warDirections[key];
      const ice=state.hull==='breached'&&warIce.some(([x,y])=>x===state.x+dx&&y===state.y+dy);
      el('status').textContent=ice?'Piso congelado. A antepara em G1 isola o vazamento.':warReach(state,warTarget(state))?'Ao alcance: '+warTarget(state).name+'.':'Passagem bloqueada. Contorne a bancada ou a parede.';
    }
  }
  function sequence(){
    el('input').innerHTML='<ol class="wr-sequence">'+order.map(i=>'<li>'+warChapters[2].steps[i]+'</li>').join('')+'</ol>'+
      warChapters[2].steps.map((s,i)=>'<button type="button" data-step="'+i+'" '+(order.includes(i)?'disabled':'')+'>'+s+'</button>').join('')+
      '<button type="button" id="wr-undo" '+(order.length?'':'disabled')+'>Desfazer último passo</button>';
  }
  function openPuzzle(){
    const ch=warChapters[state.stage];
    order=[];el('feedback').textContent='';el('terminal').textContent='TERMINAL · '+ch.station;
    el('question').textContent=ch.prompt;el('evidence').textContent=ch.evidence;
    if(state.stage===0)el('input').innerHTML=ch.options.map((s,i)=>'<label><input type="radio" required name="revision" value="'+i+'"> '+s+'</label>').join('');
    if(state.stage===1)el('input').innerHTML='<label>Tarefas simultâneas por worker <input type="number" name="workers" min="1" max="40" required></label>';
    if(state.stage===2)sequence();
    dialog.showModal();
  }
  function use(){
    const action=warInteract(state);
    if(action==='puzzle'){openPuzzle();return;}
    if(action==='breaker'){
      el('terminal').textContent='QUADRO DA SALA';el('question').textContent='Qual circuito atende os monitores que caíram?';
      el('evidence').textContent=warTagText+' Rádio · A falha atingiu apenas a ala leste.';
      el('input').innerHTML=warCircuits.map((c,i)=>'<label><input type="radio" name="circuit" required value="'+i+'"> '+c+'</label>').join('');
      el('feedback').textContent='';dialog.showModal();return;
    }
    if(action==='far'){el('status').textContent='Nada ao alcance. Siga a indicação do rádio e fique no item ou na casa vizinha.';return;}
    persist();draw();
    if(action==='torch'||action==='item')act(3,380);
    if(action==='bulkhead')act(4,480);
    el('status').textContent={item:'Evidência na mochila.',torch:'Lanterna ligada. O facho acompanha seu olhar.',tag:warTagText,bulkhead:'Antepara selada. Aquecimento do piso restabelecido; o caminho está livre.'}[action];
    plantaoAnimate(el('bag'),'collect');
  }
  el('input').onclick=e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.id==='wr-undo')order.pop();else order.push(Number(b.dataset.step));
    sequence();el('feedback').textContent=order.length+' de 3 passos selecionados.';
    (el('input').querySelector('[data-step]:not(:disabled)')||el('puzzle').querySelector('[type=submit]')).focus();
  };
  el('puzzle').onsubmit=e=>{
    e.preventDefault();const stage=state.stage,fields=new FormData(e.target);
    if(fields.has('circuit')){
      if(!warRestore(state,warCircuits[Number(fields.get('circuit'))])){
        el('feedback').textContent='Esse circuito não corresponde às duas pistas. Confira a ala no rádio e o ramal na etiqueta.';return;
      }
      state.facing=state.x<warBreaker[0]?'d':'w';persist();dialog.close();draw();act(4,600);
      svg.classList.add('wr-boot');el('status').textContent='Ravi no rádio: “Telemetria de volta! Já vejo a fila dos workers.”';return;
    }
    const input=stage===0?Number(fields.get('revision')):stage===1?Number(fields.get('workers')):order;
    if(!warSolve(state,input)){
      el('feedback').textContent=stage===0?warChapters[0].hints[input]:stage===1?
        (input*3>24?'Esse limite invade as conexões reservadas ao checkout.':'Ainda há conexões livres. Divida o saldo igualmente pelos três workers.'):
        'Reserve a chave primeiro. Confirme a transação antes de liberar a mensagem com ACK.';
      return;
    }
    persist();dialog.close();draw();el('status').textContent=warChapters[stage].result;
  };
  el('close').onclick=()=>dialog.close();dialog.onclose=()=>board.focus({preventScroll:true});
  pad.onclick=e=>{const b=e.target.closest('[data-move]');if(b){move(b.dataset.move);board.focus({preventScroll:true});}};
  el('use').onclick=()=>{board.focus({preventScroll:true});use();};
  el('replay').onclick=()=>{Object.assign(state,warState());svg.classList.remove('wr-boot');stride=0;pose(0);persist();draw();el('status').textContent='Novo plantão iniciado.';board.focus();};
  function keyboard(e){
    if(dialog.open||state.stage===3||e.defaultPrevented||e.ctrlKey||e.altKey||e.metaKey||e.target.closest?.('input,textarea,select,[contenteditable=true]'))return;
    const key=({ArrowUp:'w',ArrowDown:'s',ArrowLeft:'a',ArrowRight:'d'})[e.key]||e.key.toLowerCase();
    if(Object.hasOwn(warDirections,key)){
      e.preventDefault();if(e.repeat&&performance.now()-lastMove<95)return;
      lastMove=performance.now();move(key);
    }else if(e.code==='Space'&&!e.target.closest?.('a,button,summary')){
      e.preventDefault();if(!e.repeat)use();
    }
  }
  document.addEventListener('keydown',keyboard);
  disposeWarroom=()=>{document.removeEventListener('keydown',keyboard);clearTimeout(idleTimer);};
  draw();pose(0);
}
