function correioPage() {
  const lesson = archLessons.tarefas;
  const raw = records.get(lesson)?.correio;
  const cleared = Number.isInteger(raw?.cleared) ? Math.max(0, Math.min(3, raw.cleared)) : 0;
  const state = {cleared, shift:Number.isInteger(raw?.shift) ? Math.max(0,Math.min(cleared,2,raw.shift)) : 0,
    config:correioConfig(raw?.config), cursor:0};
  let run = runCorreio(state.shift,state.config);
  if (Number.isInteger(raw?.cursor)) state.cursor = Math.max(0, Math.min(raw.cursor,run.frames.length-1));
  const persist = ()=>save(lesson,{correio:state});
  main.innerHTML = `<div class="pg-game cj-game"><header class="pg-bar"><a href="#roadmap"><img src="mark.svg" alt="">StackQuest</a><span>/</span><a href="#laboratorios">Laboratórios</a><a href="#aparencia">Aparência</a></header>
    <div class="pg-content"><header class="pg-heading"><div><small>MINIGAME DE MENSAGERIA</small><h1>Correio de Jobs</h1></div><div class="pg-wallet"><span>Turnos concluídos</span><strong id="cj-progress"></strong></div></header>
    <section class="pg-brief"><div><small id="cj-number"></small><h2 id="cj-name"></h2><p id="cj-goal"></p></div><nav class="cj-shifts" aria-label="Turnos da central"></nav></section>
    <div class="pg-grid"><section class="pg-play"><header><h2>Central de triagem</h2><span id="cj-clock"></span></header><div class="cj-scene" aria-hidden="true"></div>
    <div class="cj-meters"><div><span>Na fila</span><b id="cj-wait"></b></div><div><span>Workers ocupados</span><b id="cj-busy"></b></div><div><span>Etiquetas</span><b id="cj-sent"></b></div><div><span>Reentregas</span><b id="cj-retries"></b></div></div>
    <div class="cj-timeline"><h3>Rastreamento</h3><p id="cj-event" role="status"></p><div class="cj-controls"><button id="cj-back">Evento anterior</button><button id="cj-step">Próximo evento</button><button id="cj-finish">Rodar até o fim</button></div><p class="cj-manifest" id="cj-manifest"></p><details class="cj-log"><summary>Histórico deste turno</summary><ol id="cj-history"></ol></details></div></section>
    <aside class="pg-side"><section class="pg-round cj-config"><h2>Monte o turno</h2><label>Workers ativos<select id="cj-workers"><option value="1">1 bancada</option><option value="2">2 bancadas</option><option value="3">3 bancadas</option></select></label>
    <label>Confirmação à fila (ACK)<select id="cj-ack"><option value="before">Ao receber o envelope</option><option value="after">Após gravar a etiqueta</option></select></label>
    <label>Chave de idempotência<select id="cj-key"><option value="none">Sem chave</option><option value="message">ID da mensagem</option><option value="order">ID do pedido</option></select></label>
    <p>Alterar uma escolha reinicia este turno com a mesma carga.</p></section>
    <section class="pg-round"><h2>Conferência de expedição</h2><div id="cj-receipts"></div><div id="cj-outcome" role="status"></div><button id="cj-next" class="pg-primary" hidden>Próximo turno</button><button id="cj-restart" hidden>Repetir turno</button></section></aside></div>
    <details class="pg-manual cj-guide"><summary>Como jogar e interpretar a fila</summary><ol>
    <li><b>Acompanhe um envelope.</b> A fila guarda o trabalho pendente. Use Próximo evento para ver qual bancada retirou cada mensagem. Duas bancadas livres atendem dois pedidos ao mesmo tempo.</li>
    <li><b>Escolha quando confirmar.</b> O ACK informa à fila que ela pode descartar o envelope. Uma queda antes da gravação pode perder o pedido se o ACK já saiu. Neste jogo uma entrega sem ACK volta à fila 2 segundos após a queda.</li>
    <li><b>Compare os identificadores.</b> Uma reentrega conserva o ID da mensagem. O produtor também pode publicar o mesmo pedido em outro envelope. Observe os dois IDs no rastreamento.</li>
    <li><b>Proteja a emissão da etiqueta.</b> Idempotência permite repetir a tentativa mantendo um único efeito. A central registra a chave única e a etiqueta na mesma transação. Se a chave já existe, o worker recupera o resultado e pode confirmar a mensagem.</li>
    <li><b>Confira a expedição.</b> Cada pedido precisa sair com uma etiqueta. Repita a carga, altere uma decisão por vez e compare o tempo, as reentregas e os comprovantes.</li></ol>
    <a href="#lab/arquitetura/tarefas">Desenhar uma arquitetura com fila e workers</a></details></div></div>`;
  const root = main.querySelector('.cj-game');
  const el = name=>root.querySelector('#cj-'+name);
  const shiftButtons = root.querySelector('.cj-shifts');
  shiftButtons.innerHTML = correioShifts.map((s,i)=>'<button data-shift="'+i+'">'+(i+1)+' · '+s.name+'</button>').join('');
  function draw() {
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
    root.querySelector('.cj-scene').innerHTML = correioStation(frame);
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
  function seek(index) {
    state.cursor = index;
    if (index===run.frames.length-1 && run.pass) state.cleared = Math.max(state.cleared,state.shift+1);
    persist();
    draw();
  }
  function startShift(index) {
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
    startShift(state.shift);
  };
  root.onclick = event=>{
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.hasAttribute('data-shift')) startShift(Number(button.dataset.shift));
    else if (button===el('next')) startShift(state.shift+1);
    else if (button===el('restart')) seek(0);
    else if (button===el('back')) seek(state.cursor-1);
    else if (button===el('step')) seek(state.cursor+1);
    else if (button===el('finish')) seek(run.frames.length-1);
  };
  draw();
}
