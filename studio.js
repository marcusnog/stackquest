let disposeLabStudio;
function studioText(value) {
  return String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function practiceTutorial(key) {
  const steps=practiceGuides[key];
  return '<details class="practice-guide"><summary>'+icon('book',18)+' Tutorial do experimento <small>'+steps.length+' etapas</small></summary><ol>'+
    steps.map(step=>'<li><strong>'+studioText(step.title)+'</strong><p>'+studioText(step.body)+'</p></li>').join('')+'</ol></details>';
}
function workspace(g) {
  const s=labState(g.id), owner=account.name, files=Object.keys(s.files);
  let file=files.includes(s.editing)?s.editing:g.id==='k8s'?'deployment.yaml':'app.js';
  let step=Number.isInteger(s.tutorialStep)&&g.steps[s.tutorialStep]?s.tutorialStep:0;
  const label={vps:'VPS',deploy:'Deploy',cloud:'Cloud',k8s:'Kubernetes'}[g.id];
  const mark=name=>name.endsWith('.js')?'JS':name.endsWith('.json')?'{}':'Y';
  const fileButtons=()=>files.map(name=>'<button data-file="'+studioText(name)+'"><i class="file-mark">'+mark(name)+'</i>'+studioText(name)+'</button>').join('');
  main.innerHTML=`<div class="studio">
    <header class="studio-bar"><a class="studio-brand" href="#laboratorios"><img src="mark.svg" alt="">StackQuest</a><span class="studio-path">/</span><a class="studio-back" href="#laboratorios">Laboratórios</a><span class="studio-path">/</span><strong>${label}</strong><div class="studio-tools"><button id="studio-focus" aria-pressed="false">${icon('panel',16)} Foco</button><button id="studio-tests">${icon('play',15)} Testar</button><button class="studio-primary" id="studio-check">${icon('check',16)} Validar lab</button></div></header>
    <div class="studio-mobile"><button data-screen="work" aria-pressed="true">${icon('terminal',16)} IDE</button><button data-screen="guide" aria-pressed="false">${icon('book',16)} Tutorial</button></div>
    <div class="studio-layout">
      <aside class="studio-explorer" aria-label="Explorador do projeto"><h2 class="studio-label">Explorador</h2><div class="studio-folder">${icon('chevron',14)} workspace / ${g.id}</div><nav aria-label="Arquivos">${fileButtons()}</nav></aside>
      <section class="studio-work" aria-label="Bancada de trabalho"><div class="studio-tabs" aria-label="Arquivos abertos">${fileButtons()}</div>
        <div class="studio-location"><span id="studio-file"></span><button id="studio-find" disabled>${icon('search',14)} Buscar</button></div>
        <div class="studio-editor"><textarea id="studio-fallback" spellcheck="false"></textarea><div id="studio-code"></div></div>
        <div class="studio-editor-status"><span id="studio-language"></span><span id="studio-cursor">Ln 1, Col 1</span></div>
        <section class="studio-console" aria-label="Console"><header><button data-pane="terminal" aria-pressed="true">${icon('terminal',15)} Terminal</button><button data-pane="resources" aria-pressed="false">${icon('network',15)} Recursos</button><span class="studio-session">Emulador local</span></header>
          <div id="studio-terminal"><div id="studio-log" role="log" aria-label="Saída do terminal"></div><form id="studio-form"><label for="studio-input" id="studio-prompt"></label><input id="studio-input" aria-label="Comando do terminal" placeholder="Digite um comando…" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="1000"><button aria-label="Executar comando">↵</button></form></div><div id="studio-resources" hidden></div>
        </section>
      </section>
      <aside class="studio-guide" aria-label="Tutorial do laboratório"><div class="studio-guide-head"><span class="studio-label">${icon('book',16)} Tutorial guiado</span><h1>${studioText(g.title)}</h1><details><summary>Objetivo e ponto de partida</summary><p>${studioText(g.prerequisites)}</p><p><b>Objetivo.</b> ${studioText(g.goal)}</p></details><details class="studio-manual"><summary>Manual da IDE</summary><p>Selecione um arquivo para editar. As alterações são salvas a cada edição. Use Buscar para localizar texto no arquivo aberto.</p><p>O terminal aceita um comando por vez. Digite help para listar a sintaxe. As setas ↑ e ↓ recuperam o histórico.</p><p>Testar executa os casos de tests.json sobre app.js. Validar lab confere o ambiente e a resposta da aplicação. A primeira validação bem-sucedida vale 200 XP.</p></details></div><div class="studio-step-picker"><label for="studio-step">Etapa do roteiro</label><select id="studio-step"></select></div><article id="studio-instructions" aria-live="polite"></article><footer class="studio-guide-nav"><button id="studio-prev">← Anterior</button><button id="studio-next">Próxima →</button></footer></aside>
    </div><footer class="studio-status"><span>${icon(labSymbols[g.id],14)} ${label}</span><span id="studio-earned"></span><a href="#conta">${owner?'Minha conta':'Entrar para sincronizar'}</a></footer>
  </div>`;
  const root=main.querySelector('.studio'), el=id=>root.querySelector('#studio-'+id);
  const input=el('input'), fallback=el('fallback'), select=el('step'), log=el('log');
  let editor, historyIndex=s.log.length, draft='', pane='terminal';
  function cursor(line,col){el('cursor').textContent='Ln '+line+', Col '+col;}
  function save(name,value){s.files[name]=value;persistLab(g.id);}
  function selectFile(name) {
    file=name;s.editing=file;persistLab(g.id);
    root.querySelectorAll('[data-file]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.file===file)));
    el('file').textContent='workspace / '+g.id+' / '+file;
    el('language').textContent=file.endsWith('.js')?'JavaScript':file.endsWith('.json')?'JSON':'YAML';
    fallback.value=s.files[file];fallback.setAttribute('aria-label','Código de '+file);
    cursor(1,1);editor?.select(file);
  }
  function screen(name){
    root.classList.toggle('show-guide',name==='guide');
    root.querySelectorAll('[data-screen]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.screen===name)));
  }
  function showPane(name){
    pane=name;el('terminal').hidden=pane!=='terminal';el('resources').hidden=pane!=='resources';
    root.querySelectorAll('[data-pane]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pane===pane)));
  }
  function guide() {
    const item=g.steps[step], last=step===g.steps.length-1;
    select.value=String(step);el('prev').disabled=step===0;
    el('next').textContent=last?'Validar lab':'Próxima →';
    el('instructions').innerHTML=`<div class="studio-step-line"><span style="width:${(step+1)/g.steps.length*100}%"></span></div><small>ETAPA ${String(step+1).padStart(2,'0')} / ${String(g.steps.length).padStart(2,'0')}</small><h2>${studioText(item.title)}</h2><p>${studioText(item.why)}</p><h3>Na prática</h3><p>${studioText(item.body)}</p>${item.command?'<pre><code>'+studioText(item.command)+'</code></pre>':''}<button id="studio-insert">${icon(item.command?'terminal':'panel',15)} ${item.command?'Inserir no terminal':'Abrir app.js'}</button><div class="studio-expected"><h3>${icon('check',15)} Resultado esperado</h3><p>${studioText(item.expected)}</p></div><details><summary>Se o resultado for diferente</summary><p>${studioText(item.troubleshoot)}</p></details>${last?'<h3>Desafio extra</h3><p>'+studioText(g.challenge)+'</p><a href="'+studioText(g.reference.url)+'" target="_blank" rel="noopener noreferrer">'+studioText(g.reference.title)+' ↗</a>':''}`;
    el('insert').onclick=()=>{
      screen('work');
      if(item.command){showPane('terminal');input.value=item.command;input.focus();}
      else {selectFile('app.js');editor?editor.focus():fallback.focus();}
    };
    el('instructions').scrollTop=0;
  }
  function go(index){step=index;s.tutorialStep=step;persistLab(g.id);guide();}
  function refresh() {
    const busy=busyLabs.has(g.id);
    [input,el('check'),el('tests'),el('form').querySelector('button')].forEach(b=>b.disabled=busy);
    el('next').disabled=busy&&step===g.steps.length-1;
    editor?.lock(busy);fallback.readOnly=busy;
    el('prompt').textContent=(s.ssh||'workspace')+' $';
    el('earned').textContent=s.earned?'Lab validado · 200 XP':'Lab em andamento';
    log.replaceChildren();
    if(!s.log.length){const p=document.createElement('p');p.className='studio-hint';p.textContent='Terminal pronto. Digite help ou insira um comando pelo tutorial.';log.append(p);}
    for(const entry of s.log){
      const cmd=document.createElement('b'), out=document.createElement('pre');
      cmd.textContent='$ '+entry.cmd;out.textContent=entry.text;
      if(entry.text.startsWith('Erro:')||entry.text.includes('FAIL  GET'))out.className='studio-error';
      log.append(cmd,out);
    }
    if(busy){const line=document.createElement('p');line.textContent='Executando…';log.append(line);}
    log.scrollTop=log.scrollHeight;
    const rows=[
      ...s.networks.map(n=>['Rede',n]),
      ...Object.entries(s.hosts).map(([n,h])=>['Instância',n+' · '+h.network+' · '+(h.running?'app ativo':'app parado')+' · portas '+(h.ports.join(', ')||'fechadas')]),
      ...Object.entries(s.balancers).map(([n,b])=>['Balanceador',n+':80 → '+b.target+':8080']),
      ...(s.cluster.control?[['Control plane',s.cluster.control]]:[]),...s.cluster.workers.map(n=>['Worker',n]),
      ...Object.entries(s.deployments).map(([n,d])=>['Deployment',n+' · '+d.replicas+' réplica(s) · '+d.image]),
      ...Object.entries(s.services).map(([n,v])=>['Service',n+' · '+v.port+' → app='+v.selector+':'+v.targetPort])
    ];
    el('resources').innerHTML=rows.length?'<dl>'+rows.map(([type,val])=>'<dt>'+type+'</dt><dd>'+studioText(val)+'</dd>').join('')+'</dl>':'<p>Os recursos aparecerão aqui conforme você provisionar o ambiente.</p>';
  }
  async function operate(cmd,validate=false) {
    if(!cmd||busyLabs.has(g.id))return;
    if(cmd==='validar lab'||cmd==='validar ambiente')validate=true;
    screen('work');showPane('terminal');busyLabs.add(g.id);refresh();
    let result;
    try {
      result=validate?await checkLab(g.id,s):await labCommand(s,cmd);
      if(validate){s.earned=true;s.completedOn??=dateKey(new Date());}
    }catch(err){result='Erro: '+err.message;}
    busyLabs.delete(g.id);
    if(owner!==account.name||labState(g.id)!==s)return;
    s.log.push({cmd,text:String(result).slice(0,6000)});s.log=s.log.slice(-45);persistLab(g.id);
    if(!root.isConnected){if(location.hash==='#lab/'+g.id)render();return;}
    historyIndex=s.log.length;draft='';refresh();input.focus({preventScroll:true});
    if(validate)chrome('laboratorios',g.title);
  }
  g.steps.forEach((item,i)=>select.add(new Option((i+1)+'. '+item.title,String(i))));
  select.onchange=()=>go(Number(select.value));
  el('prev').onclick=()=>go(step-1);
  el('next').onclick=()=>step===g.steps.length-1?operate('validar lab',true):go(step+1);
  root.querySelectorAll('[data-file]').forEach(b=>b.onclick=()=>{selectFile(b.dataset.file);editor?editor.focus():fallback.focus();});
  root.querySelectorAll('[data-pane]').forEach(b=>b.onclick=()=>showPane(b.dataset.pane));
  root.querySelectorAll('[data-screen]').forEach(b=>b.onclick=()=>screen(b.dataset.screen));
  el('focus').onclick=()=>el('focus').setAttribute('aria-pressed',String(root.classList.toggle('focused')));
  el('tests').onclick=()=>operate('npm test');
  el('check').onclick=()=>operate('validar lab',true);
  el('form').onsubmit=e=>{e.preventDefault();const cmd=input.value.trim();if(cmd){input.value='';operate(cmd);}};
  input.onkeydown=e=>{
    if(!['ArrowUp','ArrowDown'].includes(e.key)||!s.log.length)return;
    e.preventDefault();if(historyIndex===s.log.length)draft=input.value;
    historyIndex=Math.max(0,Math.min(s.log.length,historyIndex+(e.key==='ArrowUp'?-1:1)));
    input.value=historyIndex===s.log.length?draft:s.log[historyIndex].cmd;
  };
  fallback.oninput=()=>save(file,fallback.value);
  fallback.onselect=()=>{const lines=fallback.value.slice(0,fallback.selectionStart).split('\n');cursor(lines.length,lines.at(-1).length+1);};
  guide();selectFile(file);refresh();
  disposeLabStudio=()=>editor?.destroy();
  import('./vendor/editor.js').then(({openEditor})=>{
    if(!root.isConnected)return;
    const hadFocus=document.activeElement===fallback;
    editor=openEditor(el('code'),s.files,file,save,cursor);
    fallback.hidden=true;editor.lock(busyLabs.has(g.id));
    el('find').disabled=false;el('find').onclick=()=>editor.search();
    if(hadFocus)editor.focus();
  }).catch(()=>{el('language').textContent+=' · editor de texto';});
}
