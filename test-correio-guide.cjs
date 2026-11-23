const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const files=['correio-engine','correio-workshop','correio-station','correio-guide'];
const source=files.map(name=>fs.readFileSync(require.resolve('./dist/'+name+'.js'),'utf8')).join('\n');
const {correioConfig,correioWorkshop,correioCollect,correioCraft,correioGuide,runCorreio,correioStation}=
  vm.runInNewContext(source+';({correioConfig,correioWorkshop,correioCollect,correioCraft,correioGuide,runCorreio,correioStation})');
function partida(workers=1){
  const config=correioConfig({workers});
  return {config,workshop:correioWorkshop(null,config),shift:0,cursor:0};
}
test('guia usa o estoque, a instalação e os eventos reais para escolher a próxima ação',()=>{
  const state=partida(),shop=state.workshop;
  let run=runCorreio(0,state.config);
  const guide=(view='depot',recipe='bench')=>correioGuide(state,view,recipe,run);
  assert.equal(guide('operation').target,'[data-view="depot"]');
  assert.equal(guide().target,'[data-collect="wood"]');
  correioCollect(shop,'wood');
  assert.equal(guide().target,'[data-collect="metal"]');
  correioCollect(shop,'metal');
  assert.equal(guide('depot','ledger').target,'[data-recipe="bench"]');
  assert.equal(guide().target,'#cj-craft');
  assert.ok(correioCraft(shop,'bench',state.config));
  assert.equal(guide().target,'#cj-workers');
  state.config.workers=2;run=runCorreio(0,state.config);
  assert.equal(guide().target,'[data-view="operation"]');
  for(let i=0;i<run.frames.length;i++){
    state.cursor=i;
    const current=guide('operation');
    assert.equal(current.stage,4);
    assert.equal(current.target,i===run.frames.length-1?null:run.frames[i].sent?'#cj-finish':'#cj-step');
  }
  assert.match(guide().body,/4 segundos/);
  state.cursor=0;
  assert.equal(guide('operation').target,'#cj-step');
});
test('partida antiga, tentativa lenta e turno avançado recebem orientações coerentes',()=>{
  const state=partida(2);
  let run=runCorreio(0,state.config);
  assert.equal(correioGuide(state,'operation','ledger',run).stage,4);
  state.config.workers=1;
  run=runCorreio(0,state.config);state.cursor=run.frames.length-1;
  assert.equal(correioGuide(state,'operation','bench',run).target,'#cj-workers');
  state.shift=1;state.cursor=0;
  assert.equal(correioGuide(state,'operation','bench',runCorreio(1,state.config)).target,null);
});
test('um envelope anima apenas a entrada em bancada ou uma nova etiqueta ao avançar',()=>{
  const {frames}=runCorreio(0,correioConfig({workers:2,ack:'after'}));
  assert.doesNotMatch(correioStation(frames[1]),/class="cj-transit"/);
  for(let i=1;i<frames.length;i++){
    const a=frames[i-1],b=frames[i];
    const transfer=b.sent>a.sent || b.workers.some((id,w)=>id && id!==a.workers[w]);
    assert.equal(correioStation(b,false,a).includes('class="cj-transit"'),transfer);
  }
});
test('com três bancadas o guia espera a terceira retirada antes de indicar a etiqueta',()=>{
  const state=partida(3),run=runCorreio(0,state.config);
  state.cursor=2;
  assert.equal(correioGuide(state,'operation','bench',run).title,'Ocupe a bancada livre');
  state.cursor++;
  assert.equal(correioGuide(state,'operation','bench',run).title,'Acompanhe a primeira etiqueta');
});
