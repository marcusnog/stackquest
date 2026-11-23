const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {runInNewContext} = require('node:vm');
const engine = readFileSync(join(__dirname,'dist','plantao-engine.js'),'utf8');
const {plantaoParts,plantaoWaves,plantaoBudget,plantaoSpent,runPlantao} =
  runInNewContext(engine+'\n({plantaoParts,plantaoWaves,plantaoBudget,plantaoSpent,runPlantao})');

function build(parts = ['client','api','sql'], links = [[0,1],[1,2]], pool = 3, policy = 'condicional') {
  const tiles = Array.from({length:16},(_,i) => parts[i] ?? null);
  return {tiles, edges: links.map(([from,to]) => ({from,to})), pool, policy};
}

test('custos e metas das três ondas são visíveis antes da simulação', () => {
  assert.equal(plantaoWaves.length,3);
  assert.ok(plantaoWaves.every(w => w.name && w.goal));
  for (const p of Object.values(plantaoParts)) {
    assert.ok(p.name && p.description && Number.isInteger(p.price) && p.price >= 0);
  }
  assert.equal(plantaoSpent(build().tiles),8);
  assert.equal(plantaoBudget,12);
});

test('as políticas completam a abertura com pedidos espaçados; o estoque chega a zero', () => {
  for (const policy of ['separada','condicional']) {
    const r = runPlantao(build(undefined,undefined,1,policy),0);
    assert.ok(r.pass);
    assert.equal(r.confirmed,3);
    assert.equal(r.correct,3);
    assert.equal(r.p95,40);
    assert.ok(r.frames.some(f => f.text.includes('gravações: 0.')));
  }
});

test('no pico um pool pequeno forma fila e estoura a meta mesmo sem erros de reserva', () => {
  const r = runPlantao(build(undefined,undefined,1),1);
  assert.equal(r.pass,false);
  assert.equal(r.correct,12);
  assert.equal(r.p95,480);
  assert.ok(r.frames.some(f => f.queue === 11 && f.connections === 1 && f.cpu === 100));
  const tuned = runPlantao(build(undefined,undefined,3),1);
  assert.ok(tuned.pass);
  assert.equal(tuned.p95,160);
  assert.ok(tuned.frames.some(f => f.queue === 9 && f.connections === 3));
});

test('na corrida, leituras simultâneas enxergam a mesma unidade e autorizam vendas excedentes', () => {
  const broken = runPlantao(build(undefined,undefined,4,'separada'),2);
  assert.equal(broken.pass,false);
  assert.equal(broken.confirmed,4);
  assert.equal(broken.correct,5);
  assert.ok(broken.frames.some(f => f.text.includes('4 pedido(s) leram saldo 1 no banco')));
  assert.ok(broken.frames.some(f => f.text.includes('gravações: -3.')));
  const serialized = runPlantao(build(undefined,undefined,1,'separada'),2);
  assert.equal(serialized.confirmed,1);
  assert.equal(serialized.pass,false);
  assert.equal(serialized.p95,320);
});

test('escrita atômica em SQL ou KV preserva o estoque nas três ondas', () => {
  for (const store of ['sql','kv']) {
    for (const w of [0,1,2]) {
      const r = runPlantao(build(['client','api',store]),w);
      assert.ok(r.pass);
      assert.equal(r.correct,r.total);
      assert.equal(r.confirmed,[3,12,1][w]);
      assert.equal(r.frames.at(-1).connections,0);
    }
  }
});

test('uma segunda API divide a fila quando conectada e respeita o orçamento', () => {
  const setup = build(['client','api','sql','api'],[[0,1],[0,3],[1,2],[3,2]],2);
  const r = runPlantao(setup,1);
  assert.ok(r.pass);
  assert.equal(r.p95,120);
  assert.equal(r.spent,11);
  setup.edges = setup.edges.filter(e => e.to !== 3);
  const detached = runPlantao(setup,1);
  assert.equal(detached.pass,false);
  assert.equal(detached.correct,0);
  assert.equal(detached.frames[0].cell,3);
});

test('o cache conectado fornece leituras antigas na política separada e é ignorado pela condicional', () => {
  const setup = build(['client','api','sql','cache'],[[0,1],[1,2],[1,3]],1,'separada');
  const cached = runPlantao(setup,2);
  assert.equal(cached.confirmed,3);
  assert.match(cached.hint,/cache/);
  assert.ok(cached.frames.some(f => f.cell === 3 && f.text.includes('saldo 1 no cache')));
  setup.policy = 'condicional';
  setup.pool = 3;
  const fixed = runPlantao(setup,2);
  assert.ok(fixed.pass);
  assert.equal(fixed.confirmed,1);
  assert.ok(!fixed.frames.some(f => f.text.includes('no cache')));
});

test('cada cliente só usa as rotas que desenhou, mesmo com vários pools disponíveis', () => {
  const parts = ['client','api','kv','api','client'];
  const result = runPlantao(build(parts,[[0,1],[4,3],[1,2],[3,2]],2),1);
  assert.equal(result.pass,true);
  assert.equal(result.p95,120);
  // Client 0 splits between APIs. Client 4 can only select API 1, creating a hot queue.
  const unbalanced = runPlantao(build(parts,[[0,1],[0,3],[4,1],[1,2],[3,2]],2),1);
  assert.equal(unbalanced.pass,false);
  assert.equal(unbalanced.p95,200);
});

test('bloqueia atalhos, saldo duplicado, portas lógicas ausentes e excesso de créditos', () => {
  for (const config of [
    build([],[]),
    build(['client','sql'],[[0,1]]),
    build(undefined,[[0,2],[1,2]]),
    build(undefined,[[0,1],[1,1],[1,2]]),
    build(undefined,[[0,1]]),
    build(undefined,[[0,1],[1,16]]),
    build(['client','api','sql','kv'],[[0,1],[1,2],[1,3]]),
    build(['client','api','sql','cache'],[[0,1],[1,2]]),
    build(['client','api','sql','api','cache'],[[0,1],[0,3],[1,2],[3,2],[3,4]]),
    build(undefined,undefined,5),
    build(undefined,undefined,2,'outra')
  ]) {
    const r = runPlantao(config,0);
    assert.equal(r.pass,false);
    assert.equal(r.correct,0);
    assert.equal(r.frames.length,1);
    assert.ok(r.hint);
  }
});

test('repetir a carga preserva o mapa e os resultados e respeita as unidades dos frames', () => {
  const config = build();
  const before = JSON.stringify(config);
  const a = runPlantao(config,2);
  assert.deepEqual(a,runPlantao(config,2));
  assert.equal(JSON.stringify(config),before);
  for (const f of a.frames) {
    assert.ok(f.text && Number.isInteger(f.queue) && f.queue >= 0 && Number.isInteger(f.connections) && f.connections >= 0);
    assert.ok(Number.isInteger(f.cell) && f.cell >= 0 && f.cell < 16);
    assert.ok(f.cpu >= 0 && f.cpu <= 100);
  }
});
