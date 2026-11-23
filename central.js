function missionHub(route){
  const hub=document.createElement('section');
  hub.className='mission-hub';
  const nav=document.createElement('nav');
  nav.className='hub-nav';nav.setAttribute('aria-label','Missão de deploy');
  const screens={central:'Central de missões',briefing:'Briefing',diagnostico:'Bancada de diagnóstico'};
  for(const [id,label] of Object.entries(screens)){
    const link=document.createElement('a');
    link.href='#'+id;link.textContent=label;
    if(id===route)link.setAttribute('aria-current','page');
    nav.append(link);
  }
  if(route!=='central')hub.append(nav);
  hub.append(document.getElementById('screen-'+route).content.cloneNode(true));
  hub.querySelector(account.name?'[data-guest]':'[data-members]')?.remove();
  chrome('central',hub.querySelector('h1').textContent);
  main.replaceChildren(hub);
  if(route==='central')showNextMission(hub);
  if(route==='diagnostico')deliveryBench(hub);
  document.dispatchEvent(new Event('stackquest:render'));
}

function showNextMission(hub){
  const done=countDone(),meter=hub.querySelector('.course-meter progress');
  meter.max=lessons.length;meter.value=done;
  hub.querySelector('.course-meter span').textContent=done+' de '+lessons.length+' missões concluídas';
  const lesson=nextLesson();
  const next=hub.querySelector('.next-study'),link=next.querySelector('a');
  next.querySelector('.study-context').textContent=lesson?lesson.module.title+' · Missão '+(lesson.l+1)+' de '+lesson.module.lessons.length:'Roadmap concluído';
  next.querySelector('h2').textContent=lesson?lesson.title:'Todas as missões concluídas';
  next.querySelector('.study-task').textContent=lesson?lesson.exercise:'Consulte suas conquistas ou pratique nos laboratórios.';
  link.href=lesson?lessonLink(lesson):'#conquistas';
  link.textContent=lesson?(records.get(lesson.id)?.started?'Retomar missão':'Iniciar missão')+' · '+lesson.minutes+' min':'Ver conquistas';
}

function deliveryBench(hub){
  const lesson=warDeliveryLesson,delivery=warDeliveryState(records.get(lesson)?.warDelivery);
  const code=hub.querySelector('#sample-code'),hint=hub.querySelector('#sample-hint');
  const output=hub.querySelector('#sample-output'),run=hub.querySelector('#sample-run');
  const persist=()=>save(lesson,{warDelivery:{...delivery}});
  code.value=delivery.source;
  code.oninput=()=>{
    delivery.source=code.value;delivery.stage=0;delivery.failed=false;
    hint.textContent='';persist();
  };
  function report(message,level,test){
    const row=document.createElement(test?'button':'div');
    row.textContent=message+(test?' · Ver em app.js':'');
    if(level)row.dataset.level=level;
    if(test)row.onclick=()=>{
      const location=warTestLocation(code.value,test);
      const lines=code.value.split('\n');
      const offset=lines.slice(0,location.line-1).reduce((pos,line)=>pos+line.length+1,0);
      code.focus();code.setSelectionRange(offset,offset+lines[location.line-1].length);
      hint.textContent='Linha '+location.line+' · '+location.hint;
    };
    output.append(row);
  }
  run.onclick=async()=>{
    run.disabled=true;code.readOnly=true;output.replaceChildren();hint.textContent='';
    try{await warDeliveryRun(delivery,warDeliveryLab(code.value),'npm test',report);}
    catch(error){report(error.message,'error',error.testCase);}
    finally{
      if(hub.isConnected)persist();
      code.readOnly=false;run.disabled=false;
    }
  };
}
