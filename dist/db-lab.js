const dbLabRoute='#lab/bancos';
const dbCache=new Map();
function decisionState(c) {
  if(!dbCache.has(c.id)){
    let s;
    try{s=JSON.parse(progressStore.getItem('stackquest.db.v1.'+c.id));}catch{}
    dbCache.set(c.id,s&&Array.isArray(s.trials)?s:{trials:[],note:'',selected:c.plans[0].id});
  }
  return dbCache.get(c.id);
}
function storeDecision(c){
  try{progressStore.setItem('stackquest.db.v1.'+c.id,JSON.stringify(decisionState(c)));}
  catch{document.getElementById('storage-alert').textContent='O navegador só conseguiu manter a decisão nesta sessão.';}
}
function dbDone(){return dbCases.filter(c=>decisionState(c).accepted).length;}
function dbLab(id){
  const owner=account.name;
  const c=dbCases.find(c=>c.id===id)||dbCases[0];
  const state=decisionState(c);
  const nav=dbCases.map((item,i)=>'<a href="'+dbLabRoute+'/'+item.id+'" '+(c===item?'aria-current="step"':'')+'><span class="step">'+(decisionState(item).accepted?icon('check',13):i+1)+'</span>'+item.title+'</a>').join('');
  main.innerHTML='<a class="back" href="#laboratorios">Voltar aos laboratórios</a>'+
    header('Laboratório de arquitetura','Escolha de banco de dados','Compare dois desenhos para o mesmo problema. Execute a carga inicial e a mudança de requisito antes de registrar sua decisão.')+
    '<div class="db-layout"><nav class="card db-nav" aria-label="Cenários de dados"><div class="card-head">'+icon('database')+'Cenários <span class="counter">'+dbDone()+' / '+dbCases.length+'</span></div>'+nav+'</nav><div class="db-work">'+
    '<article class="lessoncard"><div class="eyebrow">Cenário '+(dbCases.indexOf(c)+1)+'</div><h2>'+c.title+'</h2><p>'+c.brief+'</p><dl class="db-spec"><dt>Consulta principal</dt><dd>'+c.query+'</dd><dt>Critério de aceitação</dt><dd>'+c.limit+'</dd><dt>Carga inicial</dt><dd>'+c.base+'</dd><dt>Mudança de cenário</dt><dd>'+c.stress+'</dd></dl></article>'+
    practiceTutorial(c.id)+'<section class="lessoncard"><h2>Experimente um desenho</h2><fieldset class="db-plans"><legend>Escolha o banco e o modelo de acesso</legend>'+
    c.plans.map(p=>'<label class="answer"><input type="radio" name="db-plan" value="'+p.id+'"><span><b>'+p.name+'</b><br>'+p.design+'</span></label>').join('')+
    '</fieldset><button type="button" class="act" id="db-run">'+icon('play',14)+'Executar as duas cargas</button><p id="db-message" role="status"></p><div id="db-results"></div><p class="footnote">Os testes contam operações de modelos executados na VPS com dados sintéticos. Os números representam o desenho do exercício. Para medir um produto em produção, reproduza a carga no banco escolhido.</p></section>'+
    '<section class="lessoncard"><h2>Registre sua decisão</h2><label for="db-note">Qual consulta orientou a escolha? Use uma evidência do teste e explique o custo que você aceita ou o requisito que faria você mudar de banco.</label>'+
    '<textarea id="db-note" placeholder="Escolhi este desenho porque…"></textarea><button type="button" id="db-save" class="act">Salvar decisão · 50 XP</button><div id="db-saved" role="status"></div></section>'+
    '<section class="lessoncard"><h2>Documentação dos bancos</h2>'+c.sources.map(s=>'<p><a class="textlink" href="'+s.url+'" target="_blank" rel="noopener noreferrer">'+s.title+' '+icon('external',14)+'</a></p>').join('')+'</section></div></div>';
  const run=main.querySelector('#db-run'),note=main.querySelector('#db-note'),saved=main.querySelector('#db-saved'),msg=main.querySelector('#db-message');
  const radios=[...main.querySelectorAll('[name=db-plan]')];
  const selected=()=>c.plans.find(p=>p.id===state.selected)||c.plans[0];
  function renderResults(){
    const box=main.querySelector('#db-results');box.replaceChildren();
    for(const trial of state.trials){
      const plan=c.plans.find(p=>trial.plan===p.id);
      if(!plan)continue;
      const panel=document.createElement('article');panel.className='db-trial';
      const title=document.createElement('h3');title.textContent=plan.name;panel.append(title);
      for(const [key,label] of [['base','Carga inicial'],['stress','Mudança de cenário']]){
        const r=trial[key];const summary=document.createElement('strong');
        summary.className=r.pass?'db-pass':'db-fail';summary.textContent=label+' · '+(r.pass?'Atende':'Falha')+' · '+r.metric;
        const detail=document.createElement('p');detail.textContent=r.detail;panel.append(summary,detail);
      }
      const cost=document.createElement('p');cost.textContent='Custo da escolha: '+plan.tradeoff;panel.append(cost);box.append(panel);
    }
  }
  function savedInfo() {
    if(state.accepted){
      const plan=c.plans.find(p=>p.id===state.accepted.plan);
      saved.textContent='Decisão registrada · '+plan.name+' · 50 XP. '+state.accepted.note;
      main.querySelector('#db-save').textContent='Atualizar decisão';
    }
  }
  for(const radio of radios){
    radio.checked=radio.value===selected().id;
    radio.onchange=()=>{state.selected=radio.value;storeDecision(c);msg.textContent='';};
  }
  note.value=state.note||'';
  note.oninput=()=>{state.note=note.value;storeDecision(c);};
  run.onclick=async()=>{
    const plan=selected();run.disabled=true;msg.textContent='Executando os dois testes na VPS…';
    try{
      const response=await fetch(apiOrigin+'/api/experimentos/'+c.id+'/'+plan.id,{signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw Error('Falha na API');
      const trial=await response.json();
      if(owner!==account.name)return;
      if(trial.id!==c.id||trial.plan!==plan.id||!trial.base||!trial.stress)throw Error('Resposta inválida');
      state.trials=[...state.trials.filter(item=>item.plan!==plan.id),trial];storeDecision(c);
      if(run.isConnected){renderResults();msg.textContent=plan.name+' testado. '+(state.trials.length<2?'Compare com outro desenho.':'Compare os resultados e selecione o desenho que vai defender.');}
    }catch{msg.textContent='A API da VPS não respondeu ao teste. Tente executar novamente.';}
    finally{run.disabled=false;}
  };
  main.querySelector('#db-save').onclick=()=>{
    const plan=selected(),trial=state.trials.find(t=>t.plan===plan.id);
    if(state.trials.length<2){saved.textContent='Execute pelo menos dois desenhos para comparar as alternativas.';return;}
    if(!trial?.base.pass||!trial?.stress.pass){saved.textContent='Selecione um desenho testado que atenda aos dois cenários.';return;}
    if(!note.value.trim()){saved.textContent='Explique a evidência e o custo da sua escolha.';note.focus();return;}
    state.accepted={plan:plan.id,note:note.value.trim(),date:state.accepted?.date||dateKey(new Date())};
    storeDecision(c);chrome('laboratorios','Escolha de banco de dados');dbLab(c.id);
    main.querySelector('#db-saved').scrollIntoView({block:'nearest'});
  };
  renderResults();savedInfo();
}
