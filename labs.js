const labSymbols={vps:'terminal',deploy:'layers',cloud:'network',k8s:'blocks'};
const labColors={vps:'blue',deploy:'amber',cloud:'teal',k8s:'violet'};
const labTags={vps:'Linux · Firewall',deploy:'JavaScript · Testes',cloud:'Rede · Balanceador',k8s:'Cluster · Manifests'};
const labStore=new Map(), busyLabs=new Set();
function labState(id) {
  if(!labStore.has(id)){
    let state;
    try{state=JSON.parse(progressStore.getItem('stackquest.lab.v1.'+id));}catch{}
    labStore.set(id,state?.schema===1&&state.files&&state.cluster?state:newLab(id));
  }
  return labStore.get(id);
}
function persistLab(id){
  try{progressStore.setItem('stackquest.lab.v1.'+id,JSON.stringify(labState(id)));}
  catch{document.getElementById('storage-alert').textContent='O espaço local está indisponível. O laboratório ficará em memória enquanto esta página estiver aberta.';}
}
function labXP(){return labGuides.filter(g=>labState(g.id).earned).length*200+dbDone()*50;}
function labsHome(){
  main.innerHTML=header('Prática de System Design','Laboratórios','Teste decisões de armazenamento, edite a aplicação e opere a infraestrutura pelo terminal.')+
    '<div class="lab-banner"><div class="lab-prompt">'+icon('terminal',32)+'</div><div><h2>Seu ambiente de prática</h2><p>O JavaScript roda no navegador. Entre na sua conta para sincronizar os ambientes emulados e as decisões de arquitetura.</p></div></div>'+
    '<div class="lab-grid"><a class="labtile" href="#lab/bancos"><div class="tiletop"><span class="square teal">'+icon('database',24)+'</span><span class="counter">'+dbDone()+'/6 decisões</span></div><div class="eyebrow">Arquitetura de dados</div><h2>Escolha de banco de dados</h2><p>Compare planos de acesso e consistência para estoque, sessões, catálogo, relações, telemetria e análise de eventos.</p><div class="meta">50 XP por decisão</div></a>'+labGuides.map((g,i)=>'<a class="labtile" href="#lab/'+g.id+'"><div class="tiletop"><span class="square '+labColors[g.id]+'">'+icon(labSymbols[g.id],24)+'</span><span class="counter">'+(labState(g.id).earned?'Concluído':'200 XP')+'</span></div><div class="eyebrow">Laboratório '+String(i+1).padStart(2,'0')+'</div><h2>'+g.title+'</h2><p>'+g.intro+'</p><div class="meta">'+labTags[g.id]+'</div></a>').join('')+'</div>';
}
function workspace(g) {
  const owner=account.name;
  const s=labState(g.id);
  main.innerHTML='<a class="back" href="#laboratorios">Voltar aos laboratórios</a>'+
    header('Laboratório / '+labTags[g.id],g.title,g.intro)+
    '<div class="workbench"><div class="editor-pane"><section class="ide"><div class="idehead">'+icon('terminal',17)+' IDE do laboratório <span>Workspace local</span></div><div class="file-tabs" aria-label="Arquivos"></div><label class="sr" for="codefile">Código do arquivo</label><textarea id="codefile" spellcheck="false" autocomplete="off" autocapitalize="off" wrap="off"></textarea><div class="ide-foot"><span id="file-info"></span><span>Salvamento automático</span></div></section>'+
    '<section class="console"><div class="idehead">'+icon('terminal',17)+' Terminal <span id="host-name"></span></div><pre class="output" id="output" role="log" aria-live="polite" tabindex="0"></pre>'+
    '<form class="cmdline"><label for="cmd" class="prompt">$</label><input id="cmd" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="Digite um comando ou help"><button class="run" type="submit">Executar</button></form></section>'+
    '<section class="card inventory"><div class="card-head">'+icon('network',18)+'Recursos do ambiente</div><pre id="resources"></pre></section></div>'+
    '<aside class="guide"><div class="card"><div class="card-head">'+icon('list')+'Roteiro do laboratório</div><div class="guide-steps">'+g.steps.map((st,i)=>'<details '+(i===0?'open':'')+'><summary><span class="step">'+(i+1)+'</span>'+st.title+'</summary><p>'+st.body+'</p>'+(st.command?'<code>'+st.command+'</code><button type="button" class="insert" data-step="'+i+'">Inserir no terminal</button>':'<button type="button" class="insert" data-file="app.js">Abrir app.js</button>')+'</details>').join('')+'</div></div>'+
    '<section class="card"><div class="card-head">'+icon('target',18)+'Verificação prática</div><p class="footnote">O avaliador verifica a configuração e executa uma chamada a /health.</p><button type="button" class="act" id="validate">Validar laboratório</button><div role="status" id="lab-result"></div></section>'+
    '<section class="card"><div class="card-head">'+icon('bolt',18)+'Desafio extra</div><p class="footnote">'+g.challenge+'</p><a class="textlink" target="_blank" rel="noopener noreferrer" href="'+g.reference.url+'">'+g.reference.title+' '+icon('external',14)+'</a></section></aside></div>';
  const editor=main.querySelector('#codefile'),input=main.querySelector('#cmd'),tabs=main.querySelector('.file-tabs'),out=main.querySelector('#output'),validation=main.querySelector('#lab-result');
  let activeFile=Object.hasOwn(s.files,s.editing)?s.editing:(g.id==='k8s'?'deployment.yaml':'app.js');
  function switchFile(name,focus=false){
    activeFile=name;s.editing=name;editor.value=s.files[name];
    tabs.replaceChildren(...Object.keys(s.files).map(f=>{
      const b=document.createElement('button');b.type='button';b.textContent=f;b.setAttribute('aria-pressed',String(f===name));b.onclick=()=>switchFile(f,true);return b;
    }));document.getElementById('file-info').textContent=name+' · '+(name.endsWith('.js')?'JavaScript':name.endsWith('.yaml')?'YAML':'JSON');if(focus)editor.focus();persistLab(g.id);
  }
  function refresh(){
    if(!editor.isConnected)return;
    const disabled=busyLabs.has(g.id);
    main.querySelector('.run').disabled=disabled;main.querySelector('#validate').disabled=disabled;input.disabled=disabled;editor.readOnly=disabled;
    document.getElementById('host-name').textContent=(s.ssh||'workspace')+' · shell didático';
    out.textContent=s.log.map(l=>l.cmd?'$ '+l.cmd+'\n'+l.text:l.text).join('\n\n')||'Terminal pronto. Digite help para consultar os comandos.';
    out.scrollTop=out.scrollHeight;
    const infra=[hostRows(s)];
    if(s.networks.length)infra.push('Redes privadas: '+s.networks.join(', '));
    Object.entries(s.balancers).forEach(([n,v])=>infra.push(n+':80 → '+v.target+':8080'));
    if(s.cluster.control)infra.push('Control plane: '+s.cluster.control+' · workers: '+(s.cluster.workers.join(', ')||'nenhum'));
    Object.entries(s.deployments).forEach(([n,d])=>infra.push('Deployment '+n+' · '+d.replicas+' réplica(s) · '+d.image));
    Object.entries(s.services).forEach(([n,v])=>infra.push('Service '+n+':'+v.port+' → app='+v.selector+':'+v.targetPort));
    main.querySelector('#resources').textContent=infra.join('\n');
    if(s.earned&&!validation.textContent)validation.textContent='Concluído · 200 XP conquistados.';
  }
  async function operate(cmd,validate=false){
    if(!cmd||busyLabs.has(g.id))return;
    busyLabs.add(g.id);refresh();
    const showResult=text=>{if(validation.isConnected)validation.textContent=text;};
    let result;
    try{
      result=validate?await checkLab(g.id,s):await labCommand(s,cmd);
      if(validate){s.earned=true;s.completedOn??=dateKey(new Date());showResult(result+' Concluído · 200 XP.');}
    }catch(err){result='Erro: '+err.message;if(validate)showResult(result);}
    if(owner!==account.name){busyLabs.delete(g.id);return;}
    s.log.push({cmd,text:String(result).slice(0,6000)});s.log=s.log.slice(-45);
    busyLabs.delete(g.id);persistLab(g.id);refresh();
    if(editor.isConnected){chrome('laboratorios',g.title);if(!validate)input.focus();}
    else if(location.hash==='#lab/'+g.id)render();
  }
  editor.addEventListener('input',()=>{s.files[activeFile]=editor.value;persistLab(g.id);});
  main.querySelector('.cmdline').addEventListener('submit',e=>{e.preventDefault();const cmd=input.value.trim();input.value='';historyPosition=0;operate(cmd);});
  let historyPosition=0;
  input.addEventListener('keydown',e=>{
    if(!['ArrowUp','ArrowDown'].includes(e.key))return;
    const commands=s.log.filter(l=>l.cmd&&l.cmd!=='validar ambiente');
    historyPosition=Math.max(0,Math.min(commands.length,historyPosition+(e.key==='ArrowUp'?1:-1)));input.value=historyPosition?commands.at(-historyPosition).cmd:'';e.preventDefault();
  });
  main.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{input.value=g.steps[Number(b.dataset.step)].command;input.focus();});
  main.querySelectorAll('[data-file]').forEach(b=>b.onclick=()=>switchFile(b.dataset.file,true));
  main.querySelector('#validate').onclick=()=>operate('validar ambiente',true);
  switchFile(activeFile);refresh();
}
