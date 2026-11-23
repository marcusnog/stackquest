const correioOrders = ['P-101','P-102','P-103','P-104'];
const correioShifts = [
  {name:'Hora do malote', goal:'Despache os quatro pedidos em até 4 segundos. Cada worker leva 2 segundos por etiqueta.', limit:4},
  {name:'Queda no turno', goal:'Um worker cai antes de gravar a etiqueta de P-102. Recupere os quatro pedidos sem perder nenhum.'},
  {name:'Encomenda em dobro', goal:'Há duas quedas e uma republicação. Termine com exatamente uma etiqueta para cada um dos quatro pedidos.'}
];

function correioConfig(raw) {
  return {
    workers:[1,2,3].includes(raw?.workers) ? raw.workers : 1,
    ack:raw?.ack === 'after' ? 'after' : 'before',
    key:['message','order'].includes(raw?.key) ? raw.key : 'none'
  };
}

function runCorreio(shift, config) {
  const scenario = correioShifts[shift];
  const settings = correioConfig(config);
  const orders = correioOrders;
  const waiting = orders.map((order,i)=>({order,id:'M-'+(i+1),attempt:0}));
  const benches = Array(settings.workers).fill(null);
  const delayed = [];
  const receipts = [];
  const keys = new Set();
  const frames = [];
  let time = 0, retries = 0, acks = 0, skipped = 0;
  function record(text) {
    frames.push({time,text,waiting:waiting.map(m=>m.order),workers:benches.map(b=>b?.msg.order || null),
      sent:receipts.length,retries,acks,skipped,delayed:delayed.length,receipts:[...receipts]});
  }
  function crash(msg) {
    if (settings.ack === 'after') delayed.push({msg,at:time+2});
    return settings.ack === 'after' ? 'Sem ACK. A fila aguardará 2 s para reentregar.' : 'A fila já recebeu o ACK e descartou a mensagem.';
  }
  record('A central recebeu quatro mensagens. Cada envelope carrega um ID de mensagem e um ID de pedido.');
  do {
    if (time === 1 && shift === 2) {
      waiting.push({order:'P-103',id:'M-5',attempt:0});
      record('O produtor repetiu P-103 em um novo envelope, M-5. O original é M-3.');
    }
    while (delayed.length && delayed[0].at === time) {
      const {msg} = delayed.shift();
      retries++;
      waiting.push(msg);
      record('Reentrega de '+msg.id+' para '+msg.order+'. O ID do envelope foi preservado.');
    }
    for (let w=0; w<benches.length; w++) {
      const job = benches[w];
      if (!job || job.until !== time) continue;
      const msg = job.msg;
      const tag = 'Worker '+(w+1)+' · '+msg.id+' / '+msg.order+'. ';
      if (shift >= 1 && msg.id === 'M-2' && msg.attempt === 1) {
        benches[w] = null;
        record(tag+'Queda antes de gravar. '+crash(msg));
        continue;
      }
      const key = settings.key === 'order' ? msg.order : settings.key === 'message' ? msg.id : null;
      // A chave única e a etiqueta são gravadas juntas no mesmo banco.
      if (key && keys.has(key)) {
        skipped++;
        record(tag+'Chave '+key+' já registrada. Nenhuma etiqueta adicional foi emitida.');
      } else {
        if (key) keys.add(key);
        receipts.push(msg.order);
        record(tag+'Etiqueta emitida'+(key?' na mesma transação da chave '+key:'')+'.');
      }
      benches[w] = null;
      if (shift === 2 && msg.id === 'M-1' && msg.attempt === 1) {
        record(tag+'Queda após gravar a etiqueta. '+crash(msg));
      } else if (settings.ack === 'after') {
        acks++;
        record(tag+'ACK enviado após consultar ou gravar a etiqueta.');
      }
    }
    for (let w=0; w<benches.length && waiting.length; w++) {
      if (benches[w]) continue;
      const msg = waiting.shift();
      msg.attempt++;
      benches[w] = {msg,until:time+2};
      if (settings.ack === 'before') acks++;
      record('Worker '+(w+1)+' recebeu '+msg.id+' / '+msg.order+' (tentativa '+msg.attempt+'). '+(settings.ack === 'before'?'ACK enviado ao receber.':'ACK pendente.'));
    }
    if (!waiting.length && !benches.some(Boolean) && !delayed.length) break;
    time++;
  } while (true);
  const missing = orders.filter(id=>!receipts.includes(id));
  const duplicates = receipts.length - (orders.length-missing.length);
  const pass = !missing.length && !duplicates && (!scenario.limit || time <= scenario.limit);
  const hints = [];
  if (missing.length) hints.push(missing.join(', ')+' ficou sem etiqueta. Envie o ACK depois de gravar para a fila poder recuperar uma queda.');
  if (duplicates) hints.push(settings.key === 'message'
    ? 'M-3 e M-5 carregam P-103. Vincule a chave única ao pedido para reconhecer as duas publicações.'
    : 'Reentregas podem repetir uma gravação. Registre o ID do pedido e a etiqueta juntos em uma transação com chave única.');
  if (scenario.limit && time > scenario.limit) hints.push('O turno levou '+time+' s. Ative mais bancadas para retirar pedidos da fila em paralelo.');
  record('Turno encerrado. '+receipts.length+' etiquetas emitidas para quatro pedidos.');
  return {frames,pass,hints,missing,duplicates,time};
}
