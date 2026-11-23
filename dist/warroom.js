let disposeWarroom;
function warroomPage(){
  const lesson='5-1',state=warState(records.get(lesson)?.warroom);
  main.innerHTML=`<div class="pg-game wr-game"><header class="pg-bar"><a href="#roadmap"><img src="mark.svg" alt="">StackQuest</a><span>/</span><a href="#laboratorios">Laboratórios</a><a href="#aparencia">Aparência</a></header>
  <div class="pg-content"><header class="pg-heading"><div><small>RPG DE ENGENHARIA DE SOFTWARE</small><h1>War Room · Virada de plantão</h1></div><div class="pg-wallet"><span>Incidentes resolvidos</span><strong id="wr-count"></strong></div></header>
  <div class="wr-layout"><section class="pg-play"><header><h2>Sala de incidentes</h2><span id="wr-power"></span></header>
  <div id="wr-board" tabindex="0" role="group" aria-label="Mapa da war room" aria-describedby="wr-keys wr-guide wr-position">${warMap()}</div>
  <p id="wr-guide"></p><div class="wr-controls"><p id="wr-keys"><b>W A S D</b> ou setas para andar. <b>Espaço</b> para coletar ou usar algo ao lado.</p>
  <div class="wr-pad" aria-label="Movimento"><button data-move="w" aria-label="Andar para cima">↑</button><button data-move="a" aria-label="Andar para a esquerda">←</button><button data-move="s" aria-label="Andar para baixo">↓</button><button data-move="d" aria-label="Andar para a direita">→</button></div><button id="wr-use" class="pg-primary">Interagir</button></div>
  <p id="wr-position" aria-live="polite"></p></section>
  <aside class="pg-side"><section class="pg-round"><small id="wr-time"></small><h2 id="wr-title"></h2><p id="wr-radio"></p></section><section class="pg-round"><h2>Mochila de Lia</h2><ul id="wr-bag"></ul></section><section class="pg-round"><h2>Diário do plantão</h2><ol id="wr-log"></ol><button id="wr-replay" hidden>Jogar novamente</button></section></aside></div>
  <p class="wr-status" role="status" id="wr-status"></p>
  <dialog id="wr-dialog" aria-labelledby="wr-question"><form id="wr-puzzle"><small id="wr-terminal"></small><h2 id="wr-question"></h2><p id="wr-evidence"></p><div id="wr-input"></div><p role="status" id="wr-feedback"></p><div class="wr-actions"><button type="submit" class="pg-primary">Aplicar decisão</button><button id="wr-close" type="button">Voltar à sala</button></div></form></dialog></div></div>`;
  const root=main.querySelector('.wr-game'),el=id=>root.querySelector('#wr-'+id);
  const board=el('board'),dialog=el('dialog'),svg=board.querySelector('svg'),pad=root.querySelector('.wr-pad');
  const labels={on:'Rede elétrica ativa',dark:'Sem energia',torch:'Sem energia · lanterna ligada',restored:'Energia restabelecida'};
  const persist=()=>save(lesson,{warroom:{...state}});
  let order=[],lastMove=0;
  let facing='s',stride=0,idleTimer=0;
  function pose(frame){
    const row={s:0,w:1,d:2,a:2}[facing];
    el('pose').setAttribute('viewBox',[frame*24,row*28,24,28].join(' '));
    el('facing').setAttribute('transform',facing==='a'?'scale(-1 1)':'scale(1 1)');
  }
  function drawMap(){
    const target=warTarget(state),dark=['dark','torch'].includes(state.power);
    const [px,py]=warPoint([state.x,state.y]),player=el('player');
    player.style.transform='translate('+px+'px,'+py+'px)';
    const mask=el('dark'),beam=el('beam');
    beam.setAttribute('cx',px);beam.setAttribute('cy',py-10);
    mask.setAttribute('fill',state.power==='torch'?'url(#wr-beam)':'#091220');
    mask.setAttribute('opacity',dark?(state.power==='torch'?1:.93):0);
    svg.classList.toggle('wr-offline',dark);
    const beacon=state.power==='dark'?warAt(warTorch,'<circle r="11" fill="#f2cd84" opacity=".25"/>'+warItemArt('torch')):'';
    el('beacon').innerHTML=beacon+(state.power==='dark'?'<use href="#wr-player" opacity=".32"/>':'');
    const visible=target&&(target.kind!=='breaker'||Math.abs(state.x-warBreaker[0])+Math.abs(state.y-warBreaker[1])<=2);
    el('drop').innerHTML=visible?warAt(target.pos,'<ellipse class="wr-halo" cy="3" rx="19" ry="8" fill="none" stroke="#ffe18b" stroke-width="2" stroke-dasharray="5 3"/>'+
      (target.kind==='item'?warItemArt(state.stage):'')+'<path d="m-5-37 5 6 5-6z" fill="#ffe18b" stroke="#594b35"/>'):'';
    const near=target&&warNear(state,target.pos);
    el('position').textContent='Lia · '+warCoord([state.x,state.y])+(near?' · Ao alcance: '+target.name:'');
    el('use').textContent=near?({item:'Coletar item',torch:'Pegar lanterna',breaker:'Rearmar disjuntor',puzzle:'Abrir terminal'}[target.kind]):'Interagir';
  }
  function draw(){
    const ch=warChapters[state.stage],target=warTarget(state);
    el('count').textContent=state.stage+' / 3';el('power').textContent=labels[state.power];
    el('time').textContent=['02:13','02:17','02:23','02:31'][state.stage]+' · RÁDIO DO PLANTÃO';
    el('title').textContent=state.power==='dark'||state.power==='torch'?'Queda de energia':ch?.title||'Turno encerrado';
    el('radio').textContent=state.power==='dark'?'A luz corta no meio da transmissão. Lia ouve Ravi pelo rádio a bateria: “O circuito da sala caiu. A lanterna está junto à porta.”':
      state.power==='torch'?'O facho ilumina poucos passos. Ravi lembra que o quadro fica além do terminal de workers, na parede do fundo.':
      ch?.radio||'Às 02:31, Lia vê o checkout estabilizar. Ela entrega o plantão a Ravi com três registros: qual versão falhou, quanta carga o banco aguenta e como repetir uma entrega com segurança.';
    el('guide').textContent=!target?'Incidente encerrado. O diário guarda as decisões do turno.':target.kind==='breaker'?'Explore o canto superior direito com a lanterna. Ao encontrar o disjuntor, aproxime-se e use Espaço.':
      (target.kind==='puzzle'?'Use o terminal ': 'Colete ')+target.name+' em '+warCoord(target.pos)+'. Aproxime-se e pressione Espaço.';
    const held=warChapters.filter((_,i)=>i<state.stage||(i===state.stage&&state.collected)).map(c=>c.item);
    if(['torch','restored'].includes(state.power))held.push('Lanterna de emergência');
    el('bag').innerHTML=held.length?held.map((s,i)=>'<li><svg viewBox="-17 -16 36 32" aria-hidden="true">'+warItemArt(s==='Lanterna de emergência'?'torch':i)+'</svg>'+s+'</li>').join(''):'<li>Mochila vazia</li>';
    el('log').innerHTML=(state.stage?warChapters.slice(0,state.stage).map(c=>'<li>'+c.result+'</li>').join(''):'<li>02:13 · Lia assumiu a investigação.</li>')+
      (state.power==='restored'?'<li>Circuito dos terminais rearmado.</li>':'');
    el('replay').hidden=state.stage!==3;
    el('use').disabled=state.stage===3;for(const b of pad.children)b.disabled=state.stage===3;
    drawMap();
  }
  function move(key){
    if(state.stage===3)return;
    clearTimeout(idleTimer);facing=key;
    if(warMove(state,key)){
      persist();drawMap();el('status').textContent='';
      stride=stride===1?2:1;
      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)pose(0);
      else{pose(stride);idleTimer=setTimeout(()=>pose(0),125);}
    }else{
      pose(0);el('status').textContent='Passagem bloqueada. Contorne a bancada ou a parede.';
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
    if(action==='far'){el('status').textContent='Nada ao alcance. Siga a indicação do rádio e fique no item ou na casa vizinha.';return;}
    persist();draw();
    el('status').textContent={item:'Evidência na mochila. Leve-a ao terminal indicado.',torch:'Lanterna ligada. Procure o quadro de energia.',breaker:'Disjuntor rearmado. Os terminais voltaram.'}[action];
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
  el('replay').onclick=()=>{Object.assign(state,warState());facing='s';stride=0;pose(0);persist();draw();el('status').textContent='Novo plantão iniciado.';board.focus();};
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
  draw();
}
