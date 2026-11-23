// Original eight-bar loops. Melodies use degrees of each sector's scale; null is a rest.
const warScores=[
  {name:'Brisa entre as copas',bpm:86,root:62,scale:[0,2,4,7,9],bass:[0,3,1,4],voice:'sine',beat:'wood',
    tune:[2,null,3,4,null,3,1,null, 0,null,2,null,1,0,null,null]},
  {name:'Pulso de basalto',bpm:64,root:48,scale:[0,1,3,5,7,8,10],bass:[0,1,5,0],voice:'triangle',beat:'deep',
    tune:[0,null,null,null,4,null,null,null, 1,null,null,2,null,null,0,null]},
  {name:'Avenida depois da meia-noite',bpm:104,root:57,scale:[0,2,3,5,7,9,10],bass:[0,3,5,4],voice:'triangle',beat:'backbeat',
    tune:[null,2,4,null,6,null,5,4, null,3,null,1,2,null,0,null]},
  {name:'Correio do vale',bpm:132,root:60,scale:[0,2,4,5,7,9,11],bass:[0,5,3,4],voice:'square',beat:'skip',
    tune:[0,2,null,4,5,null,4,2, 1,null,3,5,null,4,2,null]},
  {name:'Eco de fase',bpm:82,root:59,scale:[0,2,3,6,7,9,10],bass:[0,2,3,4],voice:'sine',beat:'glass',
    tune:[4,null,null,2,null,0,null,null, null,1,null,null,3,null,2,null]},
  {name:'Vetores de reentrada',bpm:148,root:52,scale:[0,2,3,5,7,8,10],bass:[0,5,3,4],voice:'sawtooth',beat:'drive',
    tune:[0,null,4,0,5,4,null,2, 0,2,null,4,6,null,5,4]}
];

function warTone(ctx,bus,time,hz,duration,type,level,endHz=hz){
  const osc=ctx.createOscillator(),env=ctx.createGain();
  osc.type=type;osc.frequency.setValueAtTime(hz,time);
  if(endHz!==hz)osc.frequency.exponentialRampToValueAtTime(endHz,time+duration);
  env.gain.setValueAtTime(.0001,time);
  env.gain.exponentialRampToValueAtTime(level,time+Math.min(.018,duration/4));
  env.gain.exponentialRampToValueAtTime(.0001,time+duration);
  osc.connect(env);env.connect(bus);osc.start(time);osc.stop(time+duration+.005);
  osc.onended=()=>{osc.disconnect();env.disconnect();};
}
function warNoise(ctx,bus,buffer,time,duration,hz,endHz,level){
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),env=ctx.createGain();
  source.buffer=buffer;source.loop=true;filter.type='bandpass';filter.Q.value=.8;
  filter.frequency.setValueAtTime(hz,time);filter.frequency.exponentialRampToValueAtTime(endHz,time+duration);
  env.gain.setValueAtTime(.0001,time);env.gain.linearRampToValueAtTime(level,time+duration*.18);
  env.gain.exponentialRampToValueAtTime(.0001,time+duration);
  source.connect(filter);filter.connect(env);env.connect(bus);source.start(time);source.stop(time+duration);
  source.onended=()=>{source.disconnect();filter.disconnect();env.disconnect();};
}
function warMusicStep(ctx,bus,noise,score,step,time){
  const eighth=30/score.bpm,bar=Math.floor(step/8),slot=step%8;
  const degree=score.bass[bar%4],scale=score.scale;
  const frequency=(d,octave)=>440*2**((score.root+scale[d%scale.length]+12*(octave+Math.floor(d/scale.length))-69)/12);
  const melodic=score.tune[step%16];
  if(melodic!==null){
    const hz=frequency(melodic+(bar>=4&&slot>=4?2:0),1);
    const bright=['square','sawtooth'].includes(score.voice);
    warTone(ctx,bus,time,hz,eighth*(score.beat==='deep'?3.6:1.6),score.voice,bright ? .075 : .22);
    if(['glass','wood','deep'].includes(score.beat))warTone(ctx,bus,time+eighth*.72,hz,eighth*1.6,'sine',.065);
  }
  if(slot===0||slot===(score.beat==='skip'?3:4)){
    warTone(ctx,bus,time,frequency(degree,-1),eighth*(score.beat==='deep'?4:2.1),'triangle',.29);
    if(slot===0)warTone(ctx,bus,time,frequency(degree+2,0),eighth*3.6,'sine',.12);
  }
  if(['backbeat','skip','drive'].includes(score.beat)){
    if(slot===0||slot===4||(score.beat==='drive'&&slot===6))warTone(ctx,bus,time,125,.15,'sine',.28,43);
    if(slot===2||slot===6)warNoise(ctx,bus,noise,time,.1,1800,720,.19);
    if(slot%2)warNoise(ctx,bus,noise,time,.045,6500,3800,.095);
  }else if(slot===6&&bar%2===0){
    warTone(ctx,bus,time,score.beat==='deep'?83:640,.11,'sine',.09,score.beat==='deep'?42:410);
  }
}
// Follow the current bass harmony and the sector's eighth-note clock.
function warTensionStep(ctx,bus,score,step,time,alert,mix){
  const eighth=30/score.bpm,slot=step%8;
  const bassDegree=score.bass[Math.floor(step/8)%4];
  const bass=440*2**((score.root+score.scale[bassDegree]-81)/12);
  const note=(delay,ratio,length,level,type='triangle')=>
    warTone(ctx,bus,time+delay*eighth,bass*ratio,length*eighth,type,level*mix);
  switch(alert){
    case 'blackout':
      if(slot%4===0){note(0,1,.9,.37);note(.54,1.06,.55,.23);}
      if(slot===2||slot===6)note(0,slot===2?4:4.24,1.8,.14,'sine');
      break;
    case 'quake':
      note(0,slot%2===0?1:1.5,.8,slot%2===0 ? .34 : .20);
      if(slot===2||slot===5||slot===7)note(.5,1.06,.45,.24);
      break;
    case 'storm':
      note(0,[2,2.12,3,2.83][slot%4],.8,.17,'sawtooth');
      note(.5,slot%2?3:2.12,.45,.13);
      break;
  }
}
function warCue(ctx,bus,noise,cue){
  const t=ctx.currentTime+.008;
  const tone=(hz,len,type,level,end=hz,delay=0)=>warTone(ctx,bus,t+delay,hz,len,type,level,end);
  switch(cue){
    case 'step':warNoise(ctx,bus,noise,t,.045,490,210,.12);break;
    case 'quake':tone(102,.62,'triangle',.58,35);warNoise(ctx,bus,noise,t,.48,470,72,.75);break;
    case 'wind':warNoise(ctx,bus,noise,t,.7,540,2100,.52);break;
    case 'pickup':tone(600,.13,'sine',.39);tone(900,.23,'sine',.31,980,.09);break;
    case 'probe':tone(820,.16,'sine',.31);tone(820,.25,'sine',.17,820,.19);break;
    case 'click':tone(380,.065,'triangle',.3,160);break;
    case 'open':tone(270,.16,'triangle',.32,540);break;
    case 'power':tone(92,.44,'triangle',.4,370);tone(740,.19,'sine',.26,740,.26);break;
    case 'blackout':tone(460,.55,'triangle',.38,48);break;
    case 'error':tone(222,.12,'triangle',.36);tone(166,.17,'triangle',.32,150,.12);break;
    case 'success':[523,659,784].forEach((hz,i)=>tone(hz,.24,'sine',.32,hz,i*.1));break;
  }
}

function warSoundtrack(preferences={}){
  const volume=(value,initial)=>Number.isFinite(value)?Math.min(100,Math.max(0,value)):initial;
  const levels={music:volume(preferences?.music,38),effects:volume(preferences?.effects,62)};
  let ctx,music,effects,noise,timer=0,stage=0,step=0,next=0,disposed=false;
  let alert=null,arrangement=null,intensity=0;
  function schedule(){
    if(!ctx||ctx.state!=='running'||document.hidden||!levels.music||!warScores[stage])return;
    next=Math.max(next,ctx.currentTime+.008);
    while(next<ctx.currentTime+.18){
      warMusicStep(ctx,music,noise,warScores[stage],step,next);
      // Fade over musical steps, including the release after the incident is resolved.
      intensity=alert?Math.min(1,intensity+.5):Math.max(0,intensity-.25);
      if(intensity>0)warTensionStep(ctx,music,warScores[stage],step,next,arrangement,intensity);
      next+=30/warScores[stage].bpm;step=(step+1)%64;
    }
  }
  function clock(){
    clearInterval(timer);timer=0;
    if(!disposed&&ctx?.state==='running'&&!document.hidden&&levels.music&&warScores[stage]){
      schedule();timer=setInterval(schedule,90);
    }
  }
  function unlock(){
    if(disposed||document.hidden||(!levels.music&&!levels.effects))return;
    if(!ctx){
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      try{ctx=new Audio();}catch{return;}
      music=ctx.createGain();effects=ctx.createGain();
      music.gain.value=levels.music/100*.5;effects.gain.value=levels.effects/100*.65;
      music.connect(ctx.destination);effects.connect(ctx.destination);
      noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);
      const samples=noise.getChannelData(0);
      for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
      ctx.onstatechange=clock;clock();
    }
    if(ctx.state!=='running')ctx.resume().catch(()=>{});
  }
  return {levels,unlock,
    level(channel,value){
      levels[channel]=volume(value,levels[channel]);unlock();
      if(ctx){const bus=channel==='music'?music:effects;bus.gain.setTargetAtTime(levels[channel]/100*(channel==='music' ? .5 : .65),ctx.currentTime,.015);clock();}
    },
    scene(index,incident=null){
      alert=incident;
      if(incident)arrangement=incident;
      if(stage!==index){stage=index;step=0;intensity=0;next=ctx?ctx.currentTime+.12:0;clock();}
    },
    cue(name){if(ctx&&!disposed&&!document.hidden&&levels.effects)warCue(ctx,effects,noise,name);},
    visibility(){
      if(!ctx||disposed)return;
      if(document.hidden){clearInterval(timer);ctx.suspend().catch(()=>{});}else unlock();
    },
    close(){disposed=true;clearInterval(timer);if(ctx){ctx.onstatechange=null;ctx.close().catch(()=>{});}}
  };
}
