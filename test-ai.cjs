const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const context=vm.createContext({});
for(const file of ['distributed','ai-course','ai-practice']){
  vm.runInContext(fs.readFileSync(path.join(__dirname,'dist',file+'.js'),'utf8'),context);
}
const run=code=>vm.runInContext(code,context);
test('Quinze missões avançadas com exercício, feedback e referência',()=>{
  const missions=run('[distributedModule,...aiModules].flatMap(m=>m.lessons)');
  assert.equal(new Set(missions.map(l=>l.title)).size,15);
  for(const l of missions){
    assert.equal(l.options.length,3);assert.ok(l.options[l.correct]);
    assert.ok(l.paragraphs.length>=2&&l.scenario&&l.question&&l.exercise&&l.explanation);
    assert.ok(l.reference.url.startsWith('https://'));
  }
});
test('Recuperação mede relevância e aplica o escopo antes de ranquear',()=>{
  assert.equal(run("retrieve(ragQueries[0],'lex',2).recall"),0);
  assert.equal(run("retrieve(ragQueries[0],'sem',2).recall"),1);
  assert.ok(run("ragQueries.every(q=>['sem','rrf','lex'].every(m=>retrieve(q,m,7).hits.every(h=>h.p.id!=='P7')))"));
});
test('O treino reduz perda no teste reservado e reage a rótulos trocados',()=>{
  const zero=run('trainAdapter(2,0,false)'),clean=run('trainAdapter(2,60,false)'),noisy=run('trainAdapter(2,60,true)');
  assert.equal(zero.before.loss,zero.after.loss);
  assert.ok(clean.after.loss<clean.before.loss);
  assert.ok(clean.after.correct>noisy.after.correct);
  assert.equal(clean.parameters,24);
});
