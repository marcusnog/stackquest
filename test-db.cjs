const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {runInNewContext}=require('node:vm');
const {experiment}=require('./backend/experiments.cjs');
const cases=runInNewContext(readFileSync(__dirname+'/dist/db-cases.js','utf8')+';dbCases');
for(const c of cases){
  test('Critérios para '+c.title,()=>{
    const results=c.plans.map(p=>experiment(c.id,p.id));
    assert.ok(results.every(r=>r.base.pass));
    assert.ok(results.some(r=>!r.stress.pass));
    assert.ok(results[0].stress.pass);
    assert.equal(results[1].stress.pass,c.id!=='analitica');
    assert.ok(!results[2].stress.pass);
  });
}
test('Opções desconhecidas são rejeitadas',()=>{
  assert.equal(experiment('checkout','outro'),null);
  assert.equal(experiment('inexistente','tx'),null);
});
