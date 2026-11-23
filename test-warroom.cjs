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
    const position=here.x+','+here.y+','+here.field.beat;
    if(seen.has(position))continue;
    seen.add(position);
    for(const key of Object.keys(warDirections)){
      const next={...here,field:{...here.field}};if(warMove(next,key))queue.push([next,[...path,key]]);
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
test('o guia do rastreador conduz à casa exata e acompanha estoque, notebook, receita e impressão',()=>{
  const {warEquipmentStep,warRecipes,warWalkable,warGather,warPrint}=vm.runInNewContext(readFileSync(join(__dirname,'dist/warroom-engine.js'),'utf8')+'\n;({warEquipmentStep,warRecipes,warWalkable,warGather,warPrint})');
  const warTrackerStep=(s,open,code)=>warEquipmentStep(s,open,code,warRecipes[0]);
  for(let y=0;y<5;y++)for(let x=0;x<9;x++){
    if(!warWalkable(x,y))continue;
    const s=warState({x,y}),visited=new Set();
    let tip=warTrackerStep(s,false,'');
    while(tip.step===1){
      const cell=s.x+','+s.y;assert.ok(!visited.has(cell));visited.add(cell);
      assert.ok(warMove(s,tip.key));tip=warTrackerStep(s,false,'');
    }
    assert.deepEqual([s.x,s.y,tip.key],[2,4,'gather']);
  }
  let s=warState({x:2,y:4});
  const key=(open=false,code='')=>warTrackerStep(s,open,code)?.key;
  assert.equal(key(true),'shut');
  warGather(s);s=warState(JSON.parse(JSON.stringify(s)));assert.equal(key(),'gather');
  warGather(s);assert.equal(key(),'laptop');
  assert.equal(key(true),'code');assert.equal(key(true,'imprimir("cobre", 1)'),'code');
  const code="imprimir( 'cobre', 2 );";assert.equal(key(true,code),'print-item');
  assert.equal(key(),'laptop');assert.equal(s.materials.cobre,2);
  assert.equal(warPrint(s,code).ok,true);assert.equal(key(true,code),undefined);
});
test('as duas lições de proteção só terminam ao entrar na casa atingida no pulso de impacto',()=>{
  const src=readFileSync(join(__dirname,'dist/warroom-engine.js'),'utf8');
  const {warGuideRecipe,warEquipmentStep,warGather,warPrint,warWeatherTurn,warHazard}=vm.runInNewContext(src+'\n;({warGuideRecipe,warEquipmentStep,warGather,warPrint,warWeatherTurn,warHazard})');
  for(const stage of [3,5])for(let beat=0;beat<9;beat++){
    let s=warState({stage,wave:1,x:4,y:4,offset:beat%3,field:{beat}});
    const recipe=warGuideRecipe(s,true),cmd='// produção no notebook\nimprimir("'+recipe.material+'", '+recipe.layers+')';
    assert.equal(recipe.id,stage===3?'quake':'storm');
    let open=false,code='',executed=false;
    for(let i=0;i<80&&!s.absorbed.includes(recipe.id);i++){
      const tip=warEquipmentStep(s,open,code,recipe);
      assert.ok(tip);
      if(tip.key==='gather'){assert.equal(warGather(s),recipe.material);continue;}
      if(tip.key==='laptop'){open=true;continue;}
      if(tip.key==='code'){code=cmd;continue;}
      if(tip.key==='print-item'){
        assert.equal(warPrint(s,cmd).ok,true);assert.equal(s.materials[recipe.material],0);
        s=warState(JSON.parse(JSON.stringify(s)));assert.equal(warGuideRecipe(s,true).id,recipe.id);
        executed=true;continue;
      }
      if(tip.key==='shut'){open=false;continue;}
      if(tip.key==='wait'){warWeatherTurn(s);continue;}
      const hazard=warHazard(s);
      assert.ok(warMove(s,tip.key));
      if(s.absorbed.length){assert.equal(hazard.remaining,1);assert.ok(hazard.cells.some(([x,y])=>x===s.x&&y===s.y));}
    }
    assert.ok(executed&&s.absorbed.includes(recipe.id));assert.ok(!s.printed.includes(recipe.id));
    assert.equal(warGuideRecipe(warState(JSON.parse(JSON.stringify(s))),true),null);
  }
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
  assert.equal(s.stage,3);assert.equal(warTarget(s).name,'Cartucho do catálogo');
});
test('plantão legado atravessa as nove janelas, com intervenção local, tentativas e retomada',()=>{
  const {warTransmit,warWindow,warFieldAction,warBeacon}=vm.runInNewContext(readFileSync(join(__dirname,'dist/warroom-engine.js'),'utf8')+'\n;({warTransmit,warWindow,warFieldAction,warBeacon})');
  for(const offset of [0,1,2]){
    let s=warState({stage:3,hull:'sealed',x:7,y:2});
    for(let stage=3;stage<6;stage++){
      if(stage!==4)s.offset=offset;
      assert.equal(warTransmit(s,0),null);
      walkToTarget(s);assert.equal(warInteract(s),'item');walkToTarget(s);
      for(let wave=0;wave<3;wave++){
        const profile=(s.offset+wave)%3;
        const correct=stage===3?[1,2,1][profile]:stage===4?[0,1,2][profile]:[5,10,4][profile];
        const wrong=stage===3?0:stage===4?[2,0,1][profile]:0;
        assert.equal(warTransmit(s,-1),null);assert.equal(warTransmit(s,wrong).ok,false);
        s=warState(JSON.parse(JSON.stringify(s)));
        assert.equal(s.wave,wave);assert.equal(s.setting,wrong);
        assert.equal(warWindow(s).measure(wrong).ok,false);
        assert.equal(warTransmit(s,correct).ok,true);
        s=warState(JSON.parse(JSON.stringify(s)));
        if(wave===0){
          assert.equal(warTransmit(s,correct),null);
          if(stage===4){
            for(let n=0;n<2;n++){
              walkToTarget(s);assert.equal(warInteract(s),'probe');s=warState(JSON.parse(JSON.stringify(s)));
            }
          }
          walkToTarget(s);assert.equal(warInteract(s),'relay');
          assert.equal(s.relayReady,false);
          if(stage===3){
            assert.equal(warFieldAction(s,'test').done,false);
            for(const i of [0,1,1,4,4,5]){warFieldAction(s,'turn',i);s=warState(JSON.parse(JSON.stringify(s)));}
            assert.equal(warFieldAction(s,'test').done,true);
          }else if(stage===4){
            assert.equal(warFieldAction(s,'sync',0).done,false);
            assert.equal(warFieldAction(s,'sync',1).done,true);
          }else{
            for(let p=0;p<3;p++){
              const {goal,gust}=warBeacon(s),aim=goal-gust;
              while(s.field.dish!==aim)warFieldAction(s,'steer',Math.sign(aim-s.field.dish));
              assert.equal(warFieldAction(s,'capture').done,p===2);s=warState(JSON.parse(JSON.stringify(s)));
            }
          }
          s=warState(JSON.parse(JSON.stringify(s)));walkToTarget(s);
        }
      }
      assert.equal(s.stage,stage+1);
    }
    assert.equal(warTarget(s),null);assert.equal(warMove(s,'a'),false);
  }
});
test('tremor e tempestade anunciam, barram a entrada no impacto e deixam uma saída',()=>{
  const {warHazard,warWeatherTurn,warFieldAction}=vm.runInNewContext(readFileSync(join(__dirname,'dist/warroom-engine.js'),'utf8')+'\n;({warHazard,warWeatherTurn,warFieldAction})');
  for(const stage of [3,5]){
    const s=warState({stage,wave:1,x:stage===3?1:5,y:1,field:{beat:2}});
    assert.equal(warHazard(s).remaining,1);
    const before=s.x;assert.equal(warMove(s,'d'),false);assert.equal(s.x,before);
    assert.equal(warHazard(s).remaining,3);assert.equal(warMove(s,'d'),true);
    warWeatherTurn(s);assert.equal(warHazard(s).remaining,1);
    assert.equal(warFieldAction(s,'capture'),null);
    const old=warState({stage,wave:1,relayReady:true});assert.equal(warHazard(old),null);
    assert.equal(warTarget(old).kind,'puzzle');
  }
});
test('coleta exige pisar no depósito e a impressora debita apenas a receita aceita',()=>{
  const {warGather,warPrint,warMaterials,warWalkable,warRecipes}=vm.runInNewContext(readFileSync(join(__dirname,'dist/warroom-engine.js'),'utf8')+'\n;({warGather,warPrint,warMaterials,warWalkable,warRecipes})');
  const old=warState({printed:['tracker']});
  assert.deepEqual({...old.materials},{cobre:0,titanio:0,ceramica:0});
  assert.ok(old.printed.includes('tracker'));
  assert.deepEqual({...warState({materials:{cobre:-1,titanio:'4',ceramica:1.5}}).materials},{cobre:0,titanio:0,ceramica:0});
  let s=warState();
  assert.equal(warGather(s),undefined);
  for(const r of warRecipes){
    const cmd='imprimir("'+r.material+'", '+r.layers+')';
    [s.x,s.y]=warMaterials[r.material].pos;
    assert.ok(warWalkable(s.x,s.y));
    for(let i=0;i<r.layers-1;i++)assert.equal(warGather(s),r.material);
    s=warState(JSON.parse(JSON.stringify(s)));
    assert.equal(warPrint(s,cmd).ok,false);
    assert.equal(s.materials[r.material],r.layers-1);
    assert.ok(!s.printed.includes(r.id));
    warGather(s);warGather(s);
    const before={...s.materials};
    assert.equal(warPrint(s,'imprimir("erro", 1)').ok,false);
    assert.deepEqual({...s.materials},before);
    assert.equal(warPrint(s,cmd).ok,true);
    assert.deepEqual({...s.materials},{...before,[r.material]:1});
    assert.equal(warPrint(s,cmd).ok,false);
    assert.equal(s.materials[r.material],1);
  }
  assert.equal(warGather(warState({...s,stage:6})),undefined);
});
test('receitas da impressora criam equipamentos distintos e somente a proteção correta se gasta no impacto',()=>{
  const print=vm.runInNewContext(readFileSync(join(__dirname,'dist/warroom-engine.js'),'utf8')+'\n;warPrint');
  assert.equal(warState().printed.length,0);
  for(const [stage,gear,other] of [[3,'quake','storm'],[5,'storm','quake']]){
    const s=warState({stage,wave:1,x:stage===3?1:5,y:1,field:{beat:2},printed:['inválido'],materials:{cobre:2,titanio:8,ceramica:6}});
    for(const code of ['imprimir(cobre,2)','imprimir("cobre",3)','imprimir("cobre",2); imprimir("cobre",2)']){
      assert.equal(print(s,code).ok,false);
      assert.equal(s.printed.length,0);
    }
    for(const code of [' imprimir( "cobre", 2 ); ',"imprimir('titanio',4)",'imprimir("ceramica", 3)']){
      assert.equal(print(s,code).ok,true);
      assert.equal(print(s,code).ok,false);
    }
    const resumed=warState(JSON.parse(JSON.stringify(s)));
    assert.equal(warMove(resumed,'d'),true);
    assert.ok(!resumed.printed.includes(gear));
    assert.ok(resumed.printed.includes(other)&&resumed.printed.includes('tracker'));
    assert.equal(print(resumed,gear==='quake'?'imprimir("titanio",4)':'imprimir("ceramica",3)').ok,true);
  }
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
