const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {runCorreio,correioConfig} = vm.runInNewContext(
  fs.readFileSync(require.resolve('./dist/correio-engine.js'),'utf8')+'; ({runCorreio,correioConfig})'
);
const play = (shift,workers=2,ack='after',key='none')=>runCorreio(shift,{workers,ack,key});

test('a fila se esvazia no recebimento, mas só a gravação emite etiquetas',()=>{
  const solo = play(0,1);
  assert.equal(solo.time,8);
  assert.equal(solo.pass,false);
  const duo = play(0);
  assert.equal(duo.time,4);
  assert.equal(duo.pass,true);
  assert.deepEqual(Array.from(duo.frames[0].waiting),['P-101','P-102','P-103','P-104']);
  assert.ok(duo.frames.some(f=>!f.waiting.length && f.workers.some(Boolean) && f.sent<4));
});
test('o ACK antecipado perde um pedido se o worker cair antes da etiqueta',()=>{
  const early = play(1,2,'before','order');
  assert.deepEqual(Array.from(early.missing),['P-102']);
  assert.equal(early.frames.at(-1).retries,0);
  assert.equal(early.pass,false);
  const late = play(1);
  assert.equal(late.pass,true);
  const crash = late.frames.find(f=>f.text.includes('Queda antes'));
  const retry = late.frames.find(f=>f.text.startsWith('Reentrega'));
  assert.equal(retry.time-crash.time,2);
  assert.equal(late.frames.at(-1).acks,4);
});
test('a chave do envelope bloqueia a reentrega mas deixa passar uma republicação',()=>{
  const none = play(2);
  const message = play(2,2,'after','message');
  const order = play(2,2,'after','order');
  assert.equal(none.duplicates,2);
  assert.equal(message.duplicates,1);
  assert.equal(message.frames.at(-1).receipts.filter(id=>id==='P-103').length,2);
  assert.equal(message.pass,false);
  assert.equal(order.pass,true);
  assert.equal(order.frames.at(-1).retries,2);
  assert.equal(order.frames.at(-1).skipped,2);
  assert.equal(order.frames.at(-1).acks,5);
  assert.equal(order.frames.at(-1).sent,4);
  assert.deepEqual(order,play(2,2,'after','order'));
});
test('todos os turnos terminam em cada configuração com os efeitos contabilizados',()=>{
  for(const workers of [1,2,3]) for(const ack of ['before','after']) for(const key of ['none','message','order']) {
    for(const shift of [0,1,2]) {
      const run = play(shift,workers,ack,key);
      const final = run.frames.at(-1);
      assert.equal(final.waiting.length+final.delayed+final.workers.filter(Boolean).length,0);
      assert.equal(final.sent,4-run.missing.length+run.duplicates);
      assert.equal(run.pass,shift===0 ? workers>=2 : ack==='after' && (shift===1 || key==='order'));
      assert.ok(run.frames.every((f,i)=>!i || f.time>=run.frames[i-1].time));
    }
  }
  const config = correioConfig({workers:999,ack:null,key:'bad'});
  assert.equal(config.workers,1);
  assert.equal(config.ack,'before');
  assert.equal(config.key,'none');
});
