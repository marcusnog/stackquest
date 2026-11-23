const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {runInNewContext} = require('node:vm');

const source = readFileSync(join(__dirname, 'dist', 'architecture-model.js'), 'utf8');
const {archParts, archCases, evaluateArch} = runInNewContext(source + '\n({archParts, archCases, evaluateArch})');

function diagram(id, specs, pairs) {
  const nodes = specs.map((spec, index) => {
    const [nodeId, type = nodeId] = spec.split(':');
    return {id: nodeId, type, x: index * 120, y: 40};
  });
  const edges = pairs.map(pair => {
    const [from, to] = pair.split('>');
    return {from, to};
  });
  return evaluateArch(id, nodes, edges);
}

test('o catálogo e a paleta expõem conteúdo e limites da abstração', () => {
  assert.deepEqual(Array.from(archCases, c => c.id), ['checkout','tarefas','rag']);
  for (const c of archCases) for (const field of ['title','brief','load','goal']) assert.ok(c[field]);
  for (const part of Object.values(archParts)) {
    for (const field of ['name','icon','group','description']) assert.ok(part[field]);
  }
});

test('um desenho iniciado somente com o cliente é incompleto e ainda não tem erros', () => {
  for (const c of archCases) {
    const seed = diagram(c.id, ['client'], []);
    assert.equal(seed.passed, false);
    assert.equal(seed.issues.length, 0);
    assert.ok(seed.checks.some(item => !item.pass && item.label));
  }
});

test('checkout aceita duas alternativas de persistência e entrada com gateway', () => {
  for (const store of ['sql','kv']) {
    assert.equal(diagram('checkout',['client','api',store],['client>api','api>'+store]).passed,true);
    assert.equal(diagram('checkout',['client','gateway','api',store],['client>gateway','gateway>api','api>'+store]).passed,true);
  }
});

test('duas autoridades, cache solto e atalho direto recebem diagnóstico antes da validação final', () => {
  const core = ['client','api','sql'], flow = ['client>api','api>sql'];
  const dual = diagram('checkout',[...core,'kv'],[...flow,'api>kv']);
  assert.equal(dual.passed,false);
  assert.ok(dual.issues.some(i => i.nodeId === 'kv' && i.title.includes('estoque')));
  const cache = diagram('checkout',[...core,'cache'],flow);
  assert.ok(cache.issues.some(i => i.nodeId === 'cache' && i.problem && i.alternative && i.why));
  const bypass = diagram('checkout',core,[...flow,'client>sql']);
  assert.ok(bypass.issues.some(i => i.nodeId === 'client' && i.problem.includes('contorna')));
  assert.equal(bypass.passed,false);
  const corrected = diagram('checkout',core,flow);
  assert.equal(corrected.issues.length,0);
  assert.equal(corrected.passed,true);
});

test('tarefas exigem entrega e persistência no fluxo do cliente', () => {
  const stages = ['client','api','queue','worker'];
  const flow = ['client>api','api>queue','queue>worker'];
  for (const store of ['sql','kv']) {
    assert.equal(diagram('tarefas',[...stages,store],[...flow,'worker>'+store]).passed,true);
  }
  const gap = diagram('tarefas',[...stages,'sql'],['client>api','queue>worker','worker>sql']);
  assert.equal(gap.passed,false);
  assert.equal(gap.issues.length,0);
  assert.equal(diagram('tarefas',[...stages,'sql','worker2:worker'],[...flow,'worker>sql','queue>worker2']).passed,false);
  const bypass = diagram('tarefas',[...stages,'sql'],[...flow,'worker>sql','api>worker']);
  assert.equal(bypass.passed,false);
  assert.ok(bypass.issues.some(i => i.nodeId === 'api' && i.problem.includes('fila')));
});

test('RAG aceita coordenação direta e delegada e exige dois serviços pelo mesmo coordenador', () => {
  const direct = ['client','api','vector','llm'];
  assert.equal(diagram('rag',direct,['client>api','api>vector','api>llm']).passed,true);
  assert.equal(diagram('rag',[...direct,'retriever'],['client>api','api>retriever','retriever>vector','retriever>llm']).passed,true);
  const split = diagram('rag',[...direct,'retriever'],['client>api','api>vector','api>retriever','retriever>llm']);
  assert.equal(split.passed,false);
  assert.ok(split.issues.some(i=>i.nodeId==='api'&&i.title.includes('separadas')));
  const mistaken = diagram('rag',direct,['client>api','api>vector','vector>llm']);
  assert.equal(mistaken.passed,false);
  assert.ok(mistaken.issues.some(i => i.nodeId === 'vector' && i.problem.includes('índice')));
  const badCache = diagram('rag',[...direct,'cache'],['client>api','api>vector','api>llm']);
  assert.ok(badCache.issues.some(i => i.nodeId === 'cache' && i.problem.includes('empresa')));
});

test('ligações cíclicas, autorreferências, IDs repetidos e peças ou extremidades ausentes nunca passam', () => {
  const nodes = ['client','api','sql'], flow = ['client>api','api>sql'];
  for (const edge of ['sql>api','api>api']) {
    const cyclic = diagram('checkout',nodes,[...flow,edge]);
    assert.equal(cyclic.passed,false);
    assert.ok(cyclic.issues.some(i => i.title.includes('Ciclo')));
  }
  for (const edge of ['api>removed','removed>sql','missing>removed']) {
    assert.equal(diagram('checkout',nodes,[...flow,edge]).passed,false);
  }
  assert.equal(diagram('checkout',[...nodes,'api'],flow).passed,false);
  assert.equal(diagram('checkout',[...nodes,'unknown'],flow).passed,false);
  assert.equal(diagram('missing',nodes,flow).passed,false);
  assert.equal(diagram('checkout',nodes,[...flow,'api>sql']).passed,true);
});

test('o avaliador usa os IDs das instâncias, sem alterar o desenho', () => {
  const nodes = Object.freeze([
    Object.freeze({id: 1, type: 'client', x: 0, y: 0}),
    Object.freeze({id: 2, type: 'api', x: 100, y: 0}),
    Object.freeze({id: 3, type: 'kv', x: 200, y: 0})
  ]);
  const edges = Object.freeze([Object.freeze({from:1,to:2}),Object.freeze({from:2,to:3})]);
  assert.equal(evaluateArch('checkout',nodes,edges).passed,true);
  const multipleEntries = diagram('checkout',['c1:client','c2:client','api','sql'],['c1>api','api>sql']);
  assert.equal(multipleEntries.passed,false);
});
