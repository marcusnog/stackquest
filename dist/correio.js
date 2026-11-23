function correioPage() {
  const lesson = archLessons.tarefas;
  const raw = records.get(lesson)?.correio;
  const cleared = Number.isInteger(raw?.cleared) ? Math.max(0, Math.min(3, raw.cleared)) : 0;
  const state = {cleared, shift:Number.isInteger(raw?.shift) ? Math.max(0,Math.min(cleared,2,raw.shift)) : 0,
    config:correioConfig(raw?.config), cursor:0,guideOn:typeof raw?.guideOn==='boolean'?raw.guideOn:cleared===0};
  const shop = state.workshop = correioWorkshop(raw?.workshop,state.config);
  state.config.workers = Math.min(state.config.workers,1+shop.built.bench);
  if (!shop.built.ledger) state.config.key = 'none';
  let view = raw?.area==='depot' || !raw ? 'depot' : 'operation';
  let recipeId = raw?.recipe==='ledger' ? 'ledger' : 'bench';
  let run = runCorreio(state.shift,state.config);
  if (Number.isInteger(raw?.cursor)) state.cursor = Math.max(0, Math.min(raw.cursor,run.frames.length-1));
  const persist = ()=>save(lesson,{correio:{...state,area:view,recipe:recipeId}});
  main.innerHTML = `<div class="pg-game cj-game"><header class="pg-bar"><a href="#roadmap"><img src="mark.svg" alt="">StackQuest</a><span>/</span><a href="#laboratorios">Laboratórios</a><a href="#aparencia">Aparência</a></header>
    <div class="pg-content"><header class="pg-heading"><div><small>MINIGAME DE MENSAGERIA</small><h1>Correio de Jobs</h1></div><div class="pg-wallet"><span>Turnos concluídos</span><strong id="cj-progress"></strong></div></header>
    <section class="pg-brief"><div><small id="cj-number"></small><h2 id="cj-name"></h2><p id="cj-goal"></p></div><nav class="cj-shifts" aria-label="Turnos da central"></nav></section>
    <section class="pg-coach cj-coach" aria-label="Guia do primeiro turno"><div id="cj-guidance"><small id="cj-guide-stage"></small><h2 id="cj-guide-title" aria-live="polite"></h2><p id="cj-guide-body"></p></div><div class="pg-guide-tools"><button id="cj-guide-show">Mostrar ação</button><button id="cj-guide-replay" hidden>Rever primeiro turno</button><button id="cj-guide-toggle">Pular guia</button></div></section>
    <div class="pg-grid"><section class="pg-play"><header><div class="cj-view" role="group" aria-label="Área da central"><button data-view="operation">Triagem</button><button data-view="depot">Almoxarifado</button></div><span id="cj-clock"></span></header><div class="cj-scene" aria-hidden="true"></div>
    <section class="cj-depot" id="cj-depot" aria-label="Pontos de coleta"><header><h2>Almoxarifado</h2><p>Escolha uma pilha para recolher até duas unidades.</p></header><div class="cj-yard">${correioStation({},true)}<div class="cj-sources"></div></div></section>
    <section class="cj-bag" aria-label="Inventário"><h3>Inventário</h3><div id="cj-slots"></div><button id="cj-open-craft">Abrir oficina</button></section>
    <div class="cj-meters"><div><span>Na fila</span><b id="cj-wait"></b></div><div><span>Workers ocupados</span><b id="cj-busy"></b></div><div><span>Etiquetas</span><b id="cj-sent"></b></div><div><span>Reentregas</span><b id="cj-retries"></b></div></div>
    <div class="cj-timeline"><h3>Rastreamento</h3><p id="cj-event" role="status"></p><div class="cj-controls"><button id="cj-back">Evento anterior</button><button id="cj-step">Próximo evento</button><button id="cj-finish">Rodar até o fim</button></div><p class="cj-manifest" id="cj-manifest"></p><details class="cj-log"><summary>Histórico deste turno</summary><ol id="cj-history"></ol></details></div></section>
    <aside class="pg-side"><section class="pg-round cj-craft"><h2>Oficina de fabricação</h2><div class="cj-recipes" role="group" aria-label="Receitas de fabricação"></div><p id="cj-effect"></p><div id="cj-cost"></div><button id="cj-craft" class="pg-primary"></button><button id="cj-recover">Desmontar e recuperar materiais</button><p id="cj-tip"></p><button id="cj-gather">Ir coletar materiais</button><p id="cj-notice" role="status"></p></section>
    <section class="pg-round cj-config"><h2>Monte o turno</h2><label>Workers ativos<select id="cj-workers"><option value="1">1 bancada</option><option value="2">2 bancadas</option><option value="3">3 bancadas</option></select></label>
    <label>Confirmação à fila (ACK)<select id="cj-ack"><option value="before">Ao receber o envelope</option><option value="after">Após gravar a etiqueta</option></select></label>
    <label>Chave de idempotência<select id="cj-key"><option value="none">Sem chave</option><option value="message">ID da mensagem</option><option value="order">ID do pedido</option></select></label>
    <p>Alterar uma escolha reinicia este turno com a mesma carga.</p></section>
    <section class="pg-round"><h2>Conferência de expedição</h2><div id="cj-receipts"></div><div id="cj-outcome" role="status"></div><button id="cj-next" class="pg-primary" hidden>Próximo turno</button><button id="cj-restart" hidden>Repetir turno</button></section></aside></div>
    <details class="pg-manual cj-guide"><summary>Como jogar e interpretar a fila</summary><ol>
    <li><b>Prepare a oficina.</b> Comece com uma bancada. No Almoxarifado, recolha madeira dos paletes, metal da sucata e papel das bobinas. Escolha uma receita para comparar os materiais da mochila com o custo. Fabrique uma bancada e ative o segundo worker em Monte o turno. O livro de registros libera as chaves de idempotência. Desative o equipamento antes de desmontá-lo para recuperar os materiais.</li>
    <li><b>Acompanhe um envelope.</b> A fila guarda o trabalho pendente. Use Próximo evento para ver qual bancada retirou cada mensagem. Duas bancadas livres atendem dois pedidos ao mesmo tempo.</li>
    <li><b>Escolha quando confirmar.</b> O ACK informa à fila que ela pode descartar o envelope. Uma queda antes da gravação pode perder o pedido se o ACK já saiu. Neste jogo uma entrega sem ACK volta à fila 2 segundos após a queda.</li>
    <li><b>Compare os identificadores.</b> Uma reentrega conserva o ID da mensagem. O produtor também pode publicar o mesmo pedido em outro envelope. Observe os dois IDs no rastreamento.</li>
    <li><b>Proteja a emissão da etiqueta.</b> Idempotência permite repetir a tentativa mantendo um único efeito. A central registra a chave única e a etiqueta na mesma transação. Se a chave já existe, o worker recupera o resultado e pode confirmar a mensagem.</li>
    <li><b>Confira a expedição.</b> Cada pedido precisa sair com uma etiqueta. Repita a carga, altere uma decisão por vez e compare o tempo, as reentregas e os comprovantes.</li></ol>
    <a href="#lab/arquitetura/tarefas">Desenhar uma arquitetura com fila e workers</a></details></div></div>`;
  const root = main.querySelector('.cj-game');
  const el = name=>root.querySelector('#cj-'+name);
  const materials = Object.entries(correioMaterials);
  root.querySelector('.cj-sources').innerHTML = materials.map(([id,m])=>'<button data-collect="'+id+'" aria-label="Coletar '+m.name+'"><span class="cj-stack">'+correioItemArt(id)+'</span><strong>'+m.source+'</strong><span class="cj-source-qty"></span></button>').join('');
  el('slots').innerHTML = materials.map(([id,m])=>'<div class="cj-slot">'+correioItemArt(id)+'<span>'+m.name+'</span><b id="cj-bag-'+id+'"></b></div>').join('');
  root.querySelector('.cj-recipes').innerHTML = Object.entries(correioRecipes).map(([id,r])=>'<button data-recipe="'+id+'">'+correioItemArt(id)+'<span>'+r.name+'</span></button>').join('');
  let target;
  function drawGuide(){
    if(target){target.classList.remove('pg-guided');target.removeAttribute('aria-describedby');target=null;}
    const guide=correioGuide(state,view,recipeId,run);
    el('guidance').hidden=!state.guideOn;
    el('guide-show').hidden=!state.guideOn||!guide.target;
    el('guide-replay').hidden=!state.guideOn||!!guide.target;
    el('guide-toggle').textContent=state.guideOn?(guide.target?'Pular guia':'Fechar guia'):(state.cleared?'Ver guia':'Retomar guia');
    if(!state.guideOn)return;
    el('guide-stage').textContent='PRIMEIRO TURNO · '+guide.stage+' / 4';
    el('guide-body').textContent=guide.body;
    if(el('guide-title').textContent!==guide.title){
      el('guide-title').textContent=guide.title;
      plantaoAnimate(el('guidance'),'area');
    }
    if(guide.target){
      target=root.querySelector(guide.target);
      target.classList.add('pg-guided');target.setAttribute('aria-describedby','cj-guide-body');
    }
  }
  function drawWorkshop() {
    root.querySelector('.cj-scene').hidden = view!=='operation';
    el('depot').hidden = view!=='depot';
    for (const b of root.querySelectorAll('[data-view]')) b.setAttribute('aria-pressed',String(b.dataset.view===view));
    for (const [id,m] of materials) {
      const source = root.querySelector('[data-collect="'+id+'"]'), left = correioUncollected(shop,id);
      source.disabled = left===0;
      source.setAttribute('aria-label','Coletar '+m.name.toLowerCase()+'. Disponível: '+left);
      source.querySelector('.cj-source-qty').textContent = left ? m.name+' × '+left : 'Esgotado';
      el('bag-'+id).textContent = '×'+shop.bag[id];
    }
    for (const b of root.querySelectorAll('[data-recipe]')) b.setAttribute('aria-pressed',String(b.dataset.recipe===recipeId));
    const recipe = correioRecipes[recipeId], count = shop.built[recipeId], maxed = count>=recipe.max;
    el('effect').textContent = recipe.effect;
    el('cost').innerHTML = '<small>Em mãos / necessário</small>'+Object.entries(recipe.cost).map(([id,n])=>'<span class="'+(shop.bag[id]>=n?'ready':'')+'">'+correioMaterials[id].name+' <b>'+shop.bag[id]+'/'+n+'</b></span>').join('');
    el('craft').disabled = !correioCanBuild(shop,recipeId);
    el('craft').textContent = maxed ? 'Capacidade máxima' : 'Fabricar '+recipe.name.toLowerCase();
    el('recover').hidden = !count;
    el('recover').disabled = !correioCanRecover(shop,recipeId,state.config);
    el('gather').hidden = maxed || !el('craft').disabled;
    el('tip').textContent = (recipeId==='bench' ? (1+count)+'/3 bancadas instaladas.' : count+'/1 livro instalado.')+
      (count && el('recover').disabled ? ' Desative o equipamento em Monte o turno para desmontar.' : !maxed && el('craft').disabled ? ' Recolha os materiais que faltam no almoxarifado.' : '');
    for (const option of el('workers').options) option.disabled = Number(option.value)>1+shop.built.bench;
    for (const option of el('key').options) option.disabled = option.value!=='none' && !shop.built.ledger;
    drawGuide();
  }
  const shiftButtons = root.querySelector('.cj-shifts');
  shiftButtons.innerHTML = correioShifts.map((s,i)=>'<button data-shift="'+i+'">'+(i+1)+' · '+s.name+'</button>').join('');
  function draw(previousFrame) {
    drawWorkshop();
    const scenario = correioShifts[state.shift];
    const frame = run.frames[state.cursor];
    const ended = state.cursor === run.frames.length-1;
    el('progress').textContent = state.cleared+' / 3';
    el('number').textContent = 'TURNO '+(state.shift+1);
    el('name').textContent = scenario.name;
    el('goal').textContent = scenario.goal;
    for (const button of shiftButtons.children) {
      const i = Number(button.dataset.shift);
      button.disabled = i>state.cleared;
      if(i===state.shift) button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
    }
    el('workers').value = String(state.config.workers);
    el('ack').value = state.config.ack;
    el('key').value = state.config.key;
    root.querySelector('.cj-scene').innerHTML = correioStation(frame,false,previousFrame);
    el('clock').textContent = frame.time+' s';
    el('wait').textContent = frame.waiting.length;
    el('busy').textContent = frame.workers.filter(Boolean).length+' / '+frame.workers.length;
    el('sent').textContent = frame.sent;
    el('retries').textContent = frame.retries;
    el('event').textContent = 'Evento '+(state.cursor+1)+' de '+run.frames.length+' · '+frame.text;
    el('manifest').textContent = frame.workers.map((id,i)=>'W'+(i+1)+' · '+(id||'livre')).join('  /  ')+'  ·  Aguardando reentrega: '+frame.delayed+'  ·  ACKs: '+frame.acks;
    el('history').innerHTML = run.frames.slice(0,state.cursor+1).map(f=>'<li><b>'+f.time+' s</b> · '+studioText(f.text)+'</li>').join('');
    el('back').disabled = state.cursor===0;
    el('step').disabled = el('finish').disabled = ended;
    el('receipts').innerHTML = correioOrders.map(order=>{
      const count = frame.receipts.filter(id=>id===order).length;
      return '<div><span>'+order+'</span><b>'+count+(count===1?' etiqueta':' etiquetas')+'</b></div>';
    }).join('');
    const outcome = el('outcome');
    outcome.className = ended ? 'pg-score '+(run.pass?'win':'loss') : '';
    const lost = run.missing.length;
    outcome.innerHTML = ended ? '<strong>'+(run.pass?(state.shift===2?'Missão concluída':'Turno concluído'):'Revise a operação')+'</strong><p>'+run.time+' s · '+lost+(lost===1?' pedido perdido':' pedidos perdidos')+' · '+run.duplicates+(run.duplicates===1?' etiqueta extra.':' etiquetas extras.')+'</p>'+
      run.hints.map(h=>'<p>'+studioText(h)+'</p>').join('') : '';
    el('next').hidden = !(ended && run.pass && state.shift<2);
    el('restart').hidden = !ended;
  }
  function seek(index,previousFrame) {
    view = 'operation';
    state.cursor = index;
    if (index===run.frames.length-1 && run.pass) state.cleared = Math.max(state.cleared,state.shift+1);
    persist();
    draw(previousFrame);
    if(previousFrame && run.frames[index].sent>previousFrame.sent)plantaoAnimate(el('sent'),'collect');
    if(index===run.frames.length-1)plantaoAnimate(el('outcome'),'area');
  }
  function startShift(index) {
    if(state.shift===0 && index>0)state.guideOn=false;
    state.shift = index;
    run = runCorreio(index,state.config);
    seek(0);
  }
  root.onchange = event=>{
    const control = event.target;
    if (control===el('workers')) state.config.workers = Number(control.value);
    else if (control===el('ack')) state.config.ack = control.value;
    else if (control===el('key')) state.config.key = control.value;
    else return;
    el('notice').textContent = '';
    startShift(state.shift);
    plantaoAnimate(root.querySelector('.cj-scene'),'area');
  };
  root.onclick = event=>{
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button===el('guide-toggle')) {state.guideOn=!state.guideOn;persist();drawGuide();return;}
    if (button===el('guide-show')) {target?.focus();target?.scrollIntoView({block:'center'});return;}
    if (button===el('guide-replay')) {startShift(0);return;}
    if (button===el('open-craft')) { root.querySelector('[data-recipe="'+recipeId+'"]').focus(); return; }
    if (button===el('gather')) {
      view = 'depot'; persist(); drawWorkshop();
      const missing = Object.entries(correioRecipes[recipeId].cost).find(([id,n])=>shop.bag[id]<n);
      if (missing) root.querySelector('[data-collect="'+missing[0]+'"]').focus();
      return;
    }
    if (button.dataset.view) { view = button.dataset.view; persist(); drawWorkshop(); plantaoAnimate(view==='depot'?el('depot'):root.querySelector('.cj-scene'),'area'); return; }
    if (button.dataset.recipe) { recipeId = button.dataset.recipe; el('notice').textContent=''; persist(); drawWorkshop(); return; }
    if (button.dataset.collect) {
      const id = button.dataset.collect, qty = correioCollect(shop,id);
      el('notice').textContent = '+'+qty+' de '+correioMaterials[id].name.toLowerCase()+' no inventário.';
      persist(); drawWorkshop(); plantaoAnimate(button.querySelector('svg'),'collect');plantaoAnimate(el('bag-'+id).parentElement,'collect');return;
    }
    if (button===el('craft') || button===el('recover')) {
      const recover = button===el('recover');
      if (!correioCraft(shop,recipeId,state.config,recover)) return;
      el('notice').textContent = recover ? 'Equipamento desmontado. Os materiais voltaram ao inventário.' : recipeId==='bench' ? 'Bancada pronta. Ative o novo worker em Monte o turno.' : 'Livro pronto. Escolha a chave de idempotência em Monte o turno.';
      persist(); drawWorkshop(); plantaoAnimate(root.querySelector('[data-recipe="'+recipeId+'"]'),'install');plantaoAnimate(el('notice'),'area');return;
    }
    if (button.hasAttribute('data-shift')) startShift(Number(button.dataset.shift));
    else if (button===el('next')) startShift(state.shift+1);
    else if (button===el('restart')) seek(0);
    else if (button===el('back')) seek(state.cursor-1);
    else if (button===el('step')) seek(state.cursor+1,run.frames[state.cursor]);
    else if (button===el('finish')) seek(run.frames.length-1);
  };
  draw();
}
