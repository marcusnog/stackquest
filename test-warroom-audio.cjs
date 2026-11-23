const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const source=readFileSync(require('node:path').join(__dirname,'dist/warroom-audio.js'),'utf8');

test('o arranjo acompanha o perigo salvo, inclusive com a lanterna ligada',()=>{
  const engine=readFileSync(require('node:path').join(__dirname,'dist/warroom-engine.js'),'utf8');
  const {warMusicAlert,warState}=vm.runInNewContext(engine+'\n;({warMusicAlert,warState})');
  for(const [raw,alert] of [
    [{stage:0},null],[{stage:1,power:'dark'},'blackout'],[{stage:1,power:'torch',tagRead:true},'blackout'],
    [{stage:1,power:'restored'},null],[{stage:2,hull:'breached'},'quake'],[{stage:2,hull:'sealed'},null],
    [{stage:3,wave:1},'quake'],[{stage:5,wave:1},'storm'],[{stage:4,wave:1},null],
    [{stage:3,wave:1,relayReady:true},null],[{stage:5,wave:1,relayReady:true},null],[{stage:6},null]
  ])assert.equal(warMusicAlert(warState(raw)),alert);
});

test('áudio do convés respeita gesto inicial, volumes, pausa e saída do jogo',()=>{
  let context,voices=0;
  const clocks=new Set(),doc={hidden:false};
  function node(){
    const parameter=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(v){this.value=v;}});
    return {gain:parameter(),frequency:parameter(),Q:parameter(),connect(){},disconnect(){},start(){voices++;},stop(){}};
  }
  class Audio{
    constructor(){context=this;this.state='running';this.sampleRate=8000;this.currentTime=0;this.gains=[];}
    createGain(){const gain=node();this.gains.push(gain);return gain;}
    createOscillator(){return node();}
    createBiquadFilter(){return node();}
    createBufferSource(){return node();}
    createBuffer(){return {getChannelData:()=>new Float32Array(this.sampleRate)};}
    async suspend(){this.state='suspended';this.onstatechange?.();}
    async resume(){this.state='running';this.onstatechange?.();}
    async close(){this.state='closed';}
  }
  const notes=[],layers=[];
  const observe=`
    const base=warMusicStep,layer=warTensionStep;
    warMusicStep=(...args)=>{notes.push(args[4]);base(...args);};
    warTensionStep=(...args)=>{layers.push([args[5],args[6]]);layer(...args);};
    warSoundtrack`;
  const create=vm.runInNewContext(source+'\n'+observe,{notes,layers,window:{AudioContext:Audio},document:doc,
    setInterval:fn=>{clocks.add(fn);return fn;},clearInterval:id=>clocks.delete(id)});
  const sound=create({music:0,effects:0});
  sound.unlock();assert.equal(context,undefined);
  sound.level('effects',80);assert.equal(clocks.size,0);sound.cue('wind');assert.ok(voices>0);
  sound.level('music',40);assert.equal(clocks.size,1);
  const [music,effects]=context.gains;
  assert.equal(music.gain.value,.2);assert.equal(effects.gain.value,.52);
  sound.level('effects',0);const count=voices;sound.cue('quake');assert.equal(voices,count);
  sound.scene(5);assert.equal(clocks.size,1);
  function tick(){context.currentTime+=30/148;[...clocks][0]();}
  for(const alert of ['blackout','quake','storm']){
    const last=notes.at(-1),start=layers.length;
    sound.scene(5,alert);tick();sound.scene(5,alert);tick();
    assert.equal(notes.at(-1),(last+2)%64);
    sound.scene(5);for(let i=0;i<6;i++)tick();
    assert.deepEqual(layers.slice(start).map(([name,mix])=>name===alert&&mix),[.5,1,.75,.5,.25]);
    assert.equal(clocks.size,1);assert.equal(effects.gain.value,0);
  }
  doc.hidden=true;sound.visibility();assert.equal(context.state,'suspended');assert.equal(clocks.size,0);
  doc.hidden=false;sound.visibility();assert.equal(context.state,'running');assert.equal(clocks.size,1);
  sound.scene(-1);assert.equal(clocks.size,0);
  sound.close();sound.unlock();assert.equal(context.state,'closed');assert.equal(clocks.size,0);
});
