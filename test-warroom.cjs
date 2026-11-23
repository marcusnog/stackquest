const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
test('comandos mantidos compartilham o ritmo e param no bloqueio ou ao soltar',()=>{
  const timers=new Map(),steps=[];
  let id=0;
  const input=vm.runInNewContext(readFileSync(join(__dirname,'dist/warroom.js'),'utf8')+'\n;warHeldInput',{
    setTimeout(fn,delay){assert.equal(delay,145);timers.set(++id,fn);return id;},
    clearTimeout(key){timers.delete(key);}
  })(key=>{steps.push(key);return key!=='w';},145);
  function tick(){
    assert.equal(timers.size,1);
    const [key,fn]=timers.entries().next().value;
    timers.delete(key);fn();
  }
  input.press('KeyD','d');input.press('KeyD','d');tick();
  input.press(7,'s');tick();input.release(7);tick();
  input.press('KeyW','w');assert.equal(timers.size,0);
  input.release('KeyW');tick();input.release('KeyD');
  assert.equal(timers.size,0);
  input.press(8,'a');input.stop();assert.equal(timers.size,0);
  assert.deepEqual(steps,['d','d','s','s','d','w','d','a']);
});
const {warState,warMove,warSolve,warTarget,warNear,warInteract,warDirections,warRestore,warCircuits,warTagLit}=vm.runInNewContext(
  readFileSync(join(__dirname,'dist/warroom-engine.js'),'utf8')+
  '\n;({warState,warMove,warSolve,warTarget,warNear,warInteract,warDirections,warRestore,warCircuits,warTagLit})');

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
test('o rádio conduz Lia de cada casa livre até a coleta e o terminal',()=>{
  const guide=vm.runInNewContext(readFileSync(join(__dirname,'dist/warroom-engine.js'),'utf8')+'\n;({warTutorialStep,warWalkable})');
  for(const collected of [false,true])for(let y=0;y<5;y++)for(let x=0;x<9;x++){
    if(!guide.warWalkable(x,y))continue;
    const state=warState({x,y,collected}),visited=new Set();
    let hint=guide.warTutorialStep(state);
    while(hint.key!=='use'){
      assert.equal(hint.step,collected?3:1);
      const cell=state.x+','+state.y;
      assert.ok(!visited.has(cell));visited.add(cell);
      assert.ok(warMove(state,hint.key));hint=guide.warTutorialStep(state);
    }
    assert.equal(hint.step,collected?3:2);
    assert.equal(warInteract(state),collected?'puzzle':'item');
  }
  for(const stage of [1,2,3])assert.equal(guide.warTutorialStep(warState({stage})),null);
});
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
      s=warState(JSON.parse(JSON.stringify(s)));assert.equal(warTarget(s).kind,'tag');
      assert.equal(warRestore(s,warCircuits[2]),false);
      walkToTarget(s);
      if(s.x===4)warMove(s,'a');
      warMove(s,'w');
      assert.equal(warTagLit(s),true);assert.equal(warInteract(s),'tag');
      s=warState(JSON.parse(JSON.stringify(s)));assert.equal(warTarget(s).kind,'breaker');
      walkToTarget(s);assert.equal(warInteract(s),'breaker');
      for(const c of warCircuits.slice(0,2)){assert.equal(warRestore(s,c),false);assert.equal(s.power,'torch');}
      assert.equal(warRestore(s,warCircuits[2]),true);assert.equal(s.power,'restored');
    }
    if(stage===1){
      s=warState(JSON.parse(JSON.stringify(s)));assert.equal(warTarget(s).kind,'bulkhead');
      const ice={...s,x:5,y:3};assert.equal(warMove(ice,'d'),false);assert.equal(warInteract(ice),'far');
      walkToTarget(s);assert.equal(warInteract(s),'bulkhead');assert.equal(s.hull,'sealed');
      assert.equal(warMove({...ice,hull:s.hull},'d'),true);
    }
    s=warState(JSON.parse(JSON.stringify(s)));
  }
  assert.equal(warTarget(s),null);assert.equal(warMove(s,'a'),false);
});
test('a etiqueta precisa estar no facho e ao alcance; o quadro salvo continua energizado',()=>{
  const s=warState({stage:1,power:'torch',x:3,y:0,facing:'d'});
  assert.equal(warInteract(s),'far');
  assert.equal(warMove(s,'w'),false);
  assert.equal(warInteract(s),'tag');
  assert.equal(warRestore(s,warCircuits[2]),false);
  assert.equal(warTarget(warState({stage:1,power:'restored'})).kind,'item');
  assert.equal(warTarget(warState({stage:2,power:'restored',collected:true})).kind,'puzzle');
});
test('um checkpoint inválido não prende o personagem em um móvel nem pula a lanterna',()=>{
  for(const raw of [null,{x:3,y:2},{stage:1,collected:true,power:'?'}]){
    const state=warState(raw);
    assert.equal(state.collected,false);assert.equal(state.x,0);assert.equal(state.y,4);
    walkToTarget(state);
  }
});
test('o comando da antepara é acessível de ambos os lados do vazamento',()=>{
  for(const [x,y] of [[5,1],[4,0],[6,0],[8,4]]){
    const s=warState({stage:2,hull:'breached',x,y});
    walkToTarget(s);assert.equal(warInteract(s),'bulkhead');
  }
});
