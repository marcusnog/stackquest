const pages = {roadmap:['Roadmap','route'],laboratorios:['Laboratórios','terminal'], biblioteca:['Biblioteca','book'], comunidades:['Comunidades','network'], conquistas:['Conquistas','trophy'],ranking:['Ranking','scale']};
const course=[...coreModules,distributedModule,...aiModules];
const lessons = course.flatMap((module, m) => module.lessons.map((lesson, l) =>
  ({...lesson, module, m, l, id:(m+1)+'-'+(l+1)})));
const main = document.querySelector('main');
const records = new Map();
const prefix = 'stackquest.missao.v1.';
const xp = 100;
function readRecord(id) {
  try {
    const data = JSON.parse(progressStore.getItem(prefix+id));
    return data && typeof data === 'object' ? data : {};
  } catch { return {}; }
}
function reloadProgress(){labStore.clear();dbCache.clear();lessons.forEach(lesson => records.set(lesson.id, readRecord(lesson.id)));}
function save(id, change) {
  const record = {...readRecord(id), ...records.get(id), ...change};
  records.set(id, record);
  try { progressStore.setItem(prefix+id, JSON.stringify(record)); }
  catch { document.getElementById('storage-alert').textContent = 'O navegador bloqueou o salvamento. O progresso ficará disponível até fechar a página.'; }
}
function complete(lesson) {return Boolean(records.get(lesson.id)?.date);}
function countDone(items=lessons) {return items.filter(complete).length;}
function nextLesson() {return lessons.find(lesson=>!complete(lesson));}
function dateKey(date) {return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');}
function streakDays() {
  const dates = new Set([...records.values()].map(record=>record.date));
  labGuides.forEach(g=>{const day=labState(g.id).completedOn;if(day)dates.add(day);});
  dbCases.forEach(c=>{const day=decisionState(c).accepted?.date;if(day)dates.add(day);});
  const day = new Date();
  if (!dates.has(dateKey(day))) day.setDate(day.getDate()-1);
  let days = 0;
  while (dates.has(dateKey(day))) {days++; day.setDate(day.getDate()-1);}
  return days;
}
const careerTitles = [
  'Estagiário de Engenharia de Software',
  'Engenheiro de Software Júnior',
  'Engenheiro de Software Pleno',
  'Engenheiro de Software Sênior',
  'Staff Software Engineer',
  'Principal Software Engineer',
  'Distinguished Engineer'
];
function rank() {
  const level = Math.min(careerTitles.length,1+course.filter((_,i)=>lessons.filter(l=>l.m===i).every(complete)).length);
  return {level, title:careerTitles[level-1]};
}
const badges = [
  {title:'Primeiro deploy',detail:'Conclua sua primeira missão.',goal:1,progress:()=>countDone(),icon:'flag'},
  ...course.map((m,i)=>({title:['Base sólida','Redes conectadas','Dados em ordem','Pronto para escalar','Sistema resiliente','Arquiteto em ação','Consenso e recuperação','Inferência em escala','Busca fundamentada','Especialista em adaptação','IA em produção'][i],
    detail:'Conclua o módulo '+m.title+'.',goal:m.lessons.length,progress:()=>countDone(lessons.filter(l=>l.m===i)),icon:m.icon})),
  {title:'Stack completa',detail:'Conclua as 18 missões da trilha inicial.',goal:18,progress:()=>countDone(lessons.filter(l=>l.m<coreModules.length)),icon:'trophy'}
];
function header(section, title, summary) {
  return '<div class="pagehead"><div class="eyebrow">'+section+'</div><h1>'+title+'</h1><p>'+summary+'</p></div>';
}
function chrome(page, label) {
  document.getElementById('account-link').innerHTML=account.name?account.name+' <small id="sync-label">'+syncLabel()+'</small>':'Entrar';
  document.title = label+' · StackQuest';
  document.getElementById('nav').innerHTML = Object.entries(pages).filter(([key])=>key!=='comunidades'||account.name).map(([key,[title,symbol]])=>
    '<a href="#'+key+'" '+(key===page?'aria-current="page"':'')+'>'+icon(symbol)+title+'</a>').join('');
  document.getElementById('crumb').textContent=label;
  const days=streakDays();
  document.getElementById('streak').innerHTML='<span class="streak">'+icon('fire',16)+days+(days===1?' dia':' dias')+' de sequência</span>';
  const profile=document.getElementById('profile');
  profile.hidden=!account.name;
  if(profile.hidden){profile.replaceChildren();return;}
  const {level,title}=rank();
  profile.innerHTML='<div class="avatar">'+icon('terminal',22)+'</div><div><strong>'+title+'</strong><small>Nível '+String(level).padStart(2,'0')+' · '+(countDone()*xp+labXP())+' XP</small></div>';
}
function lessonLink(lesson) {return '#missao/'+lesson.id;}
function hero() {
  const lesson = nextLesson();
  return '<section class="hero"><div class="hero-body"><div class="herolabel">'+icon(lesson?'flag':'trophy',15)+(lesson?'MISSÃO ATUAL':'TRILHA CONCLUÍDA')+'</div><h2>'+
    (lesson?lesson.title:'Roadmap completo')+'</h2><p>'+(lesson?(lesson.id==='1-1'?'Defina o que seu sistema precisa fazer e quais limites vão orientar o projeto.':lesson.module.description):'Revisite suas decisões de arquitetura e explore suas conquistas.')+
    '</p><div class="hero-foot"><a class="act" href="'+(lesson?lessonLink(lesson):'#conquistas')+'">'+icon(lesson?'play':'trophy',15)+(lesson?(records.get(lesson.id).started?'Continuar missão':'Iniciar missão'):'Ver conquistas')+'</a>'+
    (lesson?'<span class="meta">'+icon('clock',15)+lesson.minutes+' min</span><span class="meta">'+icon('bolt',15)+xp+' XP</span>':'')+'</div></div><div class="hero-art"><canvas id="blueprint" aria-hidden="true"></canvas></div></section>';
}
function moduleCard(module, m, active) {
  const items=lessons.filter(l=>l.m===m);
  const rows=items.map((lesson,i)=>{
    const done=complete(lesson),current=lesson.id===active?.id;
    const symbol=done?icon('check',14):current?icon('play',12):String(i+1).padStart(2,'0');
    return '<a class="lesson-row '+(done?'done':current?'current':'')+'" href="'+lessonLink(lesson)+'"><span class="step">'+symbol+'</span><span>'+lesson.title+(done?' <span class="sr">— concluída</span>':'')+'</span><span class="time">'+lesson.minutes+' min</span></a>';
  }).join('')+(m===2?'<a class="lesson-row" href="#lab/bancos"><span class="step">'+icon('database',14)+'</span><span>Prática · Escolha de banco de dados</span><span class="time">'+dbDone()+'/6</span></a>':'');
  return '<details class="module" '+(active?.m===m?'open':'')+'><summary><span class="square '+module.color+'">'+icon(module.icon,24)+'</span><div class="module-info"><div class="eyebrow">Módulo '+String(m+1).padStart(2,'0')+'</div><h3>'+module.title+'</h3></div><span class="module-count" aria-label="'+countDone(items)+' de '+items.length+' missões concluídas">'+countDone(items)+' / '+items.length+'</span>'+icon('chevron',15)+'</summary><div class="lessons">'+rows+'</div></details>';
}
function progressCard() {
  const done=countDone(),pct=Math.round(100*done/lessons.length);
  return '<section class="card"><div class="card-head">'+icon('gauge')+'Seu progresso</div><div class="progress-body"><div class="ring" style="--percent:'+pct+'%"><b>'+pct+'%</b></div><div class="progress-copy"><strong>'+done+' de '+lessons.length+'</strong><small>missões concluídas</small></div></div><div class="stat-line"><span>Experiência total</span><b>'+icon('bolt',15)+' '+(done*xp+labXP())+' XP</b></div></section>';
}
function awardProgress(badge) {
  const value=Math.min(badge.goal,badge.progress());
  return '<div class="bar" aria-hidden="true"><span style="width:'+(100*value/badge.goal)+'%"></span></div><div class="bar-label"><span>'+(value===badge.goal?'Conquistada':'Progresso')+'</span><span>'+value+' / '+badge.goal+'</span></div>';
}
function awardCard() {
  const next=badges.find(b=>b.progress()<b.goal),b=next??badges.at(-1);
  return '<section class="card"><div class="card-head">'+icon('medal')+(next?'Próxima conquista':'Última conquista')+'</div><div class="award-body"><span class="badge-art">'+icon(b.icon,22)+'</span><div><b>'+b.title+'</b><small>'+b.detail+'</small></div></div>'+awardProgress(b)+'</section>';
}
function roadmap() {
  main.innerHTML=header('Trilha de aprendizagem','Roadmap de System Design','Aprenda a projetar sistemas distribuídos, uma missão por vez.')+hero()+
    '<div class="dashboard"><section><div class="section-title"><h2>Módulos da trilha</h2><a class="textlink" href="#avancado">Trilha avançada de IA e sistemas</a></div>'+
    course.map((m,i)=>moduleCard(m,i,nextLesson())).join('')+'</section><aside class="asidecards" aria-label="Progresso e prática">'+progressCard()+'<section class="card lab-shortcut"><div class="card-head">'+icon('terminal')+'Laboratórios</div><p>Provisione uma VPS, publique sua API e escale um cluster.</p><a class="textlink" href="#laboratorios">Abrir ambiente prático</a></section>'+awardCard()+'</aside></div>';
}
function advancedRoadmap(){
  const items=lessons.filter(l=>l.m>=coreModules.length);
  const next=items.find(l=>!complete(l));
  main.innerHTML='<a class="back" href="#roadmap">Voltar ao roadmap</a>'+
    header('Trilha avançada','IA e sistemas distribuídos','Projete um serviço com LLM, investigue a recuperação de evidências e avalie um ajuste de modelo antes de colocá-lo em produção.')+
    '<div class="dashboard"><section><div class="section-title"><h2>Missões avançadas</h2><span class="counter">'+countDone(items)+' / '+items.length+'</span></div>'+
    course.slice(coreModules.length).map((m,i)=>moduleCard(m,i+coreModules.length,next)).join('')+'</section><aside class="asidecards"><section class="card"><div class="card-head">'+icon('terminal')+'Experimentos no navegador</div><p class="footnote">Compare evidências recuperadas e observe o efeito de treinar um adaptador com exemplos rotulados.</p><p><a class="textlink" href="#missao/9-2">Comparar a recuperação no RAG</a></p><p><a class="textlink" href="#missao/10-3">Treinar um adaptador pequeno</a></p></section></aside></div>';
}
function referenceLink(lesson) {
  return '<a class="textlink" target="_blank" rel="noopener noreferrer" href="'+lesson.reference.url+'">'+lesson.reference.title+' '+icon('external',14)+'</a>';
}
function library() {
  main.innerHTML=header('Material de estudo','Biblioteca','Encontre uma missão pelo tema e consulte a documentação usada na trilha.')+
    '<div class="library-search">'+icon('search',18)+'<input type="search" id="search" aria-label="Buscar por assunto" placeholder="Buscar por assunto ou módulo"></div><div class="library-grid" id="results"></div><p class="sr" id="searchCount" role="status"></p>';
  const normalize=s=>s.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  function filter() {
    const term=normalize(document.getElementById('search').value.trim());
    const results=lessons.filter(l=>normalize([l.title,l.module.title,l.reference.title,...l.paragraphs].join(' ')).includes(term));
    document.getElementById('results').innerHTML=results.map(l=>'<article class="resource"><div class="eyebrow">'+l.module.title+'</div><h2><a href="'+lessonLink(l)+'">'+l.title+'</a></h2><p>'+l.exercise+'</p>'+referenceLink(l)+'</article>').join('') || '<p>Nenhuma missão encontrada. Tente outro assunto.</p>';
    document.getElementById('searchCount').textContent=results.length+' missões encontradas.';
  }
  document.getElementById('search').addEventListener('input',filter);filter();
}
function awards() {
  const earned=badges.filter(b=>b.progress()>=b.goal).length;
  main.innerHTML=header('Seu progresso','Conquistas',earned+' de '+badges.length+' conquistas desbloqueadas. Cada módulo completo conta para a carreira, até o nível 7.')+
    '<div class="awards">'+badges.map(b=>'<article class="achievement '+(b.progress()<b.goal?'unearned':'')+'"><div class="badge-art">'+icon(b.icon,26)+'</div><h2>'+b.title+'</h2><p>'+b.detail+'</p>'+awardProgress(b)+'</article>').join('')+'</div>';
}
function showLesson(l) {
  const record=records.get(l.id),done=complete(l);
  if (!record.started) save(l.id,{started:true});
  const advanced=l.m>=coreModules.length;
  const designCase=archCases.find(c=>archLessons[c.id]===l.id);
  main.innerHTML='<div class="lesson-wrap">'+(advanced?'<a class="back" href="#avancado">Voltar à trilha avançada</a>':'<a class="back" href="#roadmap">Voltar ao roadmap</a>')+
    header('Módulo '+(l.m+1)+' / '+l.module.title,l.title,'Missão '+(l.l+1)+' de '+l.module.lessons.length+' · '+l.minutes+' min · '+xp+' XP')+
    '<article class="lessoncard"><h2>Aula</h2>'+l.paragraphs.map(p=>'<p>'+p+'</p>').join('')+'<div class="case"><b>Cenário</b>'+l.scenario+'</div></article>'+
    (['9-2','10-3'].includes(l.id)?'<section class="lessoncard" id="ai-experiment"></section>':'')+
    '<form class="lessoncard" id="test"><h2>Teste sua decisão</h2><fieldset><legend>'+l.question+'</legend>'+
    l.options.map((option,i)=>'<label class="answer"><input type="radio" required name="option" value="'+i+'" '+(record.answer===i?'checked':'')+' '+(done?'disabled':'')+'>'+option+'</label>').join('')+
    '</fieldset>'+(!done?'<button class="act" type="submit">Verificar resposta</button>':'')+'<div id="quiz-result" role="status"></div></form>'+
    '<section class="lessoncard"><h2>Sua decisão de arquitetura</h2><label for="note">'+l.exercise+'</label><textarea id="note" placeholder="Registre a decisão e explique o que você ganha e perde com ela."></textarea>'+
    '<div class="lesson-actions"><button id="finish" class="act" type="button">'+icon(done?'check':'flag',16)+(done?'Missão concluída':'Concluir missão')+'</button>'+
    '<span class="meta" id="note-status" role="status"></span></div><div id="finish-status" role="status"></div></section>'+
    (l.m===2?'<section class="lessoncard"><h2>Pratique a escolha de banco</h2><a class="textlink" href="#lab/bancos">Testar modelos de dados no laboratório</a></section>':'')+
    (designCase?'<section class="lessoncard"><h2>Desenhe a arquitetura</h2><a class="textlink" href="#lab/arquitetura/'+designCase.id+'">'+studioText(designCase.title)+'</a></section>':'')+
    '<section class="lessoncard"><h2>Leitura de apoio</h2>'+referenceLink(l)+'</section></div>';
  const note=document.getElementById('note'),quiz=document.getElementById('test'),button=document.getElementById('finish'),status=document.getElementById('finish-status');
  const experiment=document.getElementById('ai-experiment');
  if(experiment)mountAiPractice(experiment,l.id,record.practice,practice=>save(l.id,{practice}));
  note.value=typeof record.note==='string'?record.note:'';
  const feedback=()=>{
    const {answer}=records.get(l.id);
    if(!Number.isInteger(answer)) return;
    const right=answer===l.correct;
    document.getElementById('quiz-result').innerHTML='<div class="feedback '+(right?'good':'')+'"><b>'+(right?'Resposta correta. ':'Tente novamente. ')+'</b>'+l.explanation+'</div>';
  };
  function showComplete() {
    button.disabled=true;button.innerHTML=icon('check',16)+'Missão concluída';
    const pending=lessons.filter(item=>!complete(item)&&(!advanced||item.m>=coreModules.length));
    const next=pending.find(item=>item.m>l.m||(item.m===l.m&&item.l>l.l))||pending[0];
    status.innerHTML='<div class="feedback good">Você conquistou '+xp+' XP. <a class="textlink" href="'+(next?lessonLink(next):'#conquistas')+'">'+(next?'Ir para a próxima missão':'Ver suas conquistas')+'</a></div>';
  }
  feedback();if(done) showComplete();
  quiz.addEventListener('change',()=>{save(l.id,{answer:null});document.getElementById('quiz-result').replaceChildren();});
  quiz.addEventListener('submit',event=>{event.preventDefault();save(l.id,{answer:Number(new FormData(quiz).get('option'))});feedback();});
  note.addEventListener('input',()=>{save(l.id,{note:note.value});document.getElementById('note-status').textContent='Anotação registrada';});
  button.addEventListener('click',()=>{
    if(records.get(l.id).answer!==l.correct){status.textContent='Acerte o quiz para concluir esta missão.';quiz.querySelector('input:checked, input').focus();return;}
    if(!note.value.trim()){status.textContent='Registre sua decisão de arquitetura para concluir.';note.focus();return;}
    save(l.id,{date:dateKey(new Date()),note:note.value});quiz.querySelectorAll('input,button').forEach(el=>el.disabled=true);
    chrome('roadmap',l.title);showComplete();
  });
}
function render() {
  applyAppearance();
  if(typeof disposeLabStudio==='function'){disposeLabStudio();disposeLabStudio=null;}
  if(typeof disposePlantao==='function'){disposePlantao();disposePlantao=null;}
  if(typeof disposeCorreio==='function'){disposeCorreio();disposeCorreio=null;}
  if(typeof disposeWarroom==='function'){disposeWarroom();disposeWarroom=null;}
  const route=location.hash.slice(1)||'roadmap';
  if(route==='comunidades'||route.startsWith('comunidades/')){
    if(!account.name){location.replace('#conta');return;}
    chrome('comunidades','Comunidades');communityPage(route);return;
  }
  if(route==='jogo/plantao'){chrome('laboratorios','Plantão no Datacenter');plantaoPage();return;}
  const drill=route.match(/^jogo\/war-room\/treino\/(rota|ecos|antena)$/);
  if(route==='jogo/war-room'||drill){chrome('laboratorios','War Room · Plantão em órbita');warroomPage(drill?.[1]);return;}
  if(route==='jogo/correio'){chrome('laboratorios','Correio de Jobs');correioPage();return;}
  if(route==='aparencia'){chrome('conta','Aparência');appearancePage();return;}
  if(route==='lab/arquitetura'||route.startsWith('lab/arquitetura/')){
    chrome('laboratorios','Simulador de arquitetura');architectureBoard(route.split('/')[2]);document.dispatchEvent(new Event('stackquest:render'));return;
  }
  if(route==='avancado'){chrome('roadmap','Trilha avançada');advancedRoadmap();document.dispatchEvent(new Event('stackquest:render'));return;}
  if(route==='conta'||route==='cadastro'){chrome('conta',account.name?'Minha conta':'Conta');accountPage();return;}
  if(route==='lab/bancos'||route.startsWith('lab/bancos/')){
    chrome('laboratorios','Escolha de banco de dados');dbLab(route.split('/')[2]);document.dispatchEvent(new Event('stackquest:render'));return;
  }
  const lesson=lessons.find(l=>route==='missao/'+l.id);
  const lab=labGuides.find(g=>route==='lab/'+g.id);
  const page=lab?'laboratorios':Object.hasOwn(pages,route)?route:'roadmap';
  chrome(page,lab?lab.title:lesson?lesson.title:pages[page][0]);
  if (lesson) showLesson(lesson);
  else if (lab) workspace(lab);
  else if (page==='laboratorios') labsHome();
  else if (page==='biblioteca') library();
  else if (page==='conquistas') awards();
  else if (page==='ranking') rankingPage();
  else roadmap();
  document.dispatchEvent(new Event('stackquest:render'));
}
document.querySelector('[data-icon="panel"]').innerHTML=icon('panel',18);
document.querySelector('.skip').addEventListener('click',event=>{
  event.preventDefault();
  main.focus();
});
window.addEventListener('hashchange',()=>{render();main.focus({preventScroll:true});window.scrollTo(0,0);});
window.addEventListener('storage',event=>{
  if(account.name)return;
  if(event.key!==null&&!event.key.startsWith(prefix))return;
  lessons.forEach(l=>records.set(l.id,readRecord(l.id)));render();
});
restoreAccount().then(()=>{reloadProgress();render();}).catch(()=>{
  main.innerHTML='<section class="lessoncard"><h2>Reconecte sua conta</h2><p>A API da VPS está indisponível. Seu progresso continuará vinculado à sua conta.</p><button class="act">Tentar novamente</button></section>';
  main.querySelector('button').onclick=()=>location.reload();
});
