function studyStatus(lesson){
  if(complete(lesson))return 'Concluída';
  return records.get(lesson.id)?.started?'Em andamento':'Não iniciada';
}

function studyRow(lesson,library){
  const status=studyStatus(lesson);
  return '<li class="study-row"><div><a class="study-name" href="'+lessonLink(lesson)+'">'+lesson.title+'</a>'+
    (library?'<p>'+lesson.exercise+'</p>'+referenceLink(lesson):'')+'</div>'+
    '<span class="study-status" data-started="'+(status==='Em andamento')+'">'+status+'</span><span class="study-time">'+lesson.minutes+' min</span></li>';
}

function studyIndex(view){
  const library=view==='biblioteca',advanced=view==='avancado';
  const items=advanced?lessons.filter(l=>l.m>=coreModules.length):lessons;
  const next=nextLesson(items),done=countDone(items);
  const title=library?'Biblioteca':advanced?'IA e sistemas distribuídos':'Roadmap de System Design';
  const label=next&&records.get(next.id)?.started?'Retomar missão':'Iniciar missão';
  const progress=done+' de '+items.length+' missões concluídas';
  main.innerHTML=(advanced?'<a class="back" href="#roadmap">Voltar ao roadmap</a>':'')+
    header(library?'Material de estudo':'Trilha de aprendizagem',title,'')+
    '<section class="study-resume"><div><span class="study-context">'+(next?next.module.title+' · '+next.minutes+' min':'Trilha concluída')+'</span><h2>'+
    (next?next.title:'Todas as missões concluídas')+'</h2></div><a class="act" href="'+(next?lessonLink(next):'#conquistas')+'">'+(next?label:'Ver conquistas')+'</a>'+
    '<div class="course-meter"><span>'+progress+'</span><progress aria-label="Missões concluídas" max="'+items.length+'" value="'+done+'"></progress></div></section>'+
    '<div class="study-index-head"><h2>'+(library?'Catálogo de missões':'Módulos da trilha')+'</h2><a class="textlink" href="'+(library?'#roadmap':'#biblioteca')+'">'+(library?'Ver roadmap':'Consultar biblioteca')+'</a></div>'+
    '<div class="study-filters"><label>Buscar missão<input id="search" type="search" placeholder="Título, tema ou referência"></label>'+
    (library?'<label>Módulo<select id="study-module"><option value="">Todos os módulos</option>'+course.map((m,i)=>'<option value="'+(i+1)+'">'+m.title+'</option>').join('')+'</select></label>':'')+
    '<label>Situação<select id="study-state"><option value="">Todas as situações</option><option>Em andamento</option><option>Não iniciada</option><option>Concluída</option></select></label></div>'+
    '<div class="library-filter-status"><p id="searchCount" role="status"></p><button type="button" class="textlink" id="clear-search" hidden>Limpar filtros</button></div>'+
    '<div id="results" class="course-index"></div>'+
    (library?'':'<footer class="study-links"><a href="#laboratorios">Abrir laboratórios</a>'+(advanced?'<a href="#missao/9-2">Comparar a recuperação no RAG</a><a href="#missao/10-3">Treinar um adaptador</a>':'<a href="#avancado">Trilha avançada de IA e sistemas</a>')+
    '<a href="#conquistas">Ver conquistas · '+(countDone()*xp+labXP())+' XP</a></footer>');

  const search=main.querySelector('#search'),module=main.querySelector('#study-module'),state=main.querySelector('#study-state');
  const results=main.querySelector('#results'),count=main.querySelector('#searchCount'),clear=main.querySelector('#clear-search');
  const params=new URLSearchParams(location.hash.split('?')[1]);
  search.value=params.get('q')||'';
  if(module)module.value=params.get('modulo')||'';
  state.value=params.get('situacao')||'';
  if(state.selectedIndex<0)state.selectedIndex=0;
  if(module&&module.selectedIndex<0)module.selectedIndex=0;
  const normalize=value=>value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const index=items.map(lesson=>({lesson,text:normalize([lesson.title,lesson.module.title,lesson.exercise,lesson.reference.title,...lesson.paragraphs].join(' '))}));
  function filter(updateUrl){
    const words=normalize(search.value.trim()).split(/\s+/).filter(Boolean);
    const matches=index.filter(({lesson,text})=>(!module?.value||lesson.m+1===Number(module.value))&&
      (!state.value||state.value===studyStatus(lesson))&&words.every(word=>text.includes(word))).map(row=>row.lesson);
    clear.hidden=!search.value&&!state.value&&!module?.value;
    count.textContent=matches.length===1?'1 missão encontrada':matches.length+' missões encontradas';
    results.innerHTML=course.map((m,i)=>{
      const rows=matches.filter(l=>l.m===i);
      if(!rows.length)return '';
      const list='<ul class="study-rows">'+rows.map(l=>studyRow(l,library)).join('')+'</ul>';
      if(library)return '<section class="shelf-group"><h3>'+m.title+'</h3>'+list+'</section>';
      const total=m.lessons.length,completed=countDone(items.filter(l=>l.m===i));
      const open=!clear.hidden||next?.m===i;
      return '<details class="syllabus-module"'+(open?' open':'')+'><summary><span class="module-number">'+String(i+1).padStart(2,'0')+'</span><strong>'+m.title+
        '</strong><span class="module-tally" aria-label="'+completed+' de '+total+' concluídas">'+completed+' / '+total+'</span>'+icon('chevron',16)+'</summary>'+
        list+(i===2&&clear.hidden?'<a class="study-practice" href="#lab/bancos">Prática · Escolha de banco de dados · '+dbDone()+'/6 decisões</a>':'')+'</details>';
    }).join('')||'<p class="study-empty">Nenhuma missão corresponde aos filtros. Altere a busca ou limpe os filtros para ver a trilha.</p>';
    if(updateUrl){
      const query=new URLSearchParams();
      if(search.value)query.set('q',search.value);
      if(module?.value)query.set('modulo',module.value);
      if(state.value)query.set('situacao',state.value);
      history.replaceState(history.state,'','#'+view+(query.size?'?'+query:''));
    }
  }
  search.oninput=state.onchange=()=>filter(true);
  if(module)module.onchange=()=>filter(true);
  clear.onclick=()=>{search.value=state.value='';if(module)module.value='';filter(true);search.focus();};
  filter(false);
}
