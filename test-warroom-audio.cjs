const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const source=readFileSync(require('node:path').join(__dirname,'dist/warroom-audio.js'),'utf8');

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
  const create=vm.runInNewContext(source+'\n;warSoundtrack',{window:{AudioContext:Audio},document:doc,
    setInterval:fn=>{clocks.add(fn);return fn;},clearInterval:id=>clocks.delete(id)});
  const sound=create({music:0,effects:0});
  sound.unlock();assert.equal(context,undefined);
  sound.level('effects',80);assert.equal(clocks.size,0);sound.cue('wind');assert.ok(voices>0);
  sound.level('music',40);assert.equal(clocks.size,1);
  const [music,effects]=context.gains;
  assert.equal(music.gain.value,.2);assert.equal(effects.gain.value,.52);
  sound.level('effects',0);const count=voices;sound.cue('quake');assert.equal(voices,count);
  sound.scene(5);assert.equal(clocks.size,1);
  doc.hidden=true;sound.visibility();assert.equal(context.state,'suspended');assert.equal(clocks.size,0);
  doc.hidden=false;sound.visibility();assert.equal(context.state,'running');assert.equal(clocks.size,1);
  sound.scene(-1);assert.equal(clocks.size,0);
  sound.close();sound.unlock();assert.equal(context.state,'closed');assert.equal(clocks.size,0);
});
