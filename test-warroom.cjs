const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const {warState,warMove,warSolve,warTarget,warNear,warInteract,warDirections}=vm.runInNewContext(
  readFileSync(join(__dirname,'dist/warroom-engine.js'),'utf8')+
  '\n;({warState,warMove,warSolve,warTarget,warNear,warInteract,warDirections})');

function walkToTarget(state){
  const pos=warTarget(state).pos,queue=[[state,[]]],seen=new Set();
  while(queue.length){
    const [here,path]=queue.shift();
    if(warNear(here,pos)){for(const key of path)assert.ok(warMove(state,key));return;}
    if(seen.has(here.x+','+here.y))continue;
    seen.add(here.x+','+here.y);
    for(const key of Object.keys(warDirections)){
      const next={...here};if(warMove(next,key))queue.push([next,[...path,key]]);
    }
  }
  assert.fail('Objetivo inacessível');
}
test('Lia contorna as bancadas, resolve os três incidentes e retoma o apagão salvo',()=>{
  let s=warState();
  assert.equal(warMove(s,'a'),false);assert.equal(warInteract(s),'far');
  assert.equal(warSolve(s,1),false);
  for(let stage=0;stage<3;stage++){
    walkToTarget(s);assert.equal(warInteract(s),'item');
    walkToTarget(s);assert.equal(warInteract(s),'puzzle');
    assert.equal(warSolve(s,stage===2?[0,1,2]:0),false);
    assert.equal(warSolve(s,[1,8,[1,2,0]][stage]),true);
    if(stage===0){
      assert.equal(warTarget(s).kind,'torch');
      const byBreaker={...s,x:7,y:0};assert.equal(warInteract(byBreaker),'far');
      assert.equal(warMove(byBreaker,'d'),false);
      walkToTarget(s);assert.equal(warInteract(s),'torch');
      s=warState(JSON.parse(JSON.stringify(s)));assert.equal(warTarget(s).kind,'breaker');
      walkToTarget(s);assert.equal(warInteract(s),'breaker');assert.equal(s.power,'restored');
    }
    s=warState(JSON.parse(JSON.stringify(s)));
  }
  assert.equal(warTarget(s),null);assert.equal(warMove(s,'a'),false);
});
test('um checkpoint inválido não prende o personagem em um móvel nem pula a lanterna',()=>{
  for(const raw of [null,{x:3,y:2},{stage:1,collected:true,power:'?'}]){
    const state=warState(raw);
    assert.equal(state.collected,false);assert.equal(state.x,0);assert.equal(state.y,4);
    walkToTarget(state);
  }
});
