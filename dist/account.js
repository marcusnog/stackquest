const apiOrigin='https://stackquest.157.254.207.208.nip.io';
const sessionKey='stackquest.session.v1';
const pendingKey='stackquest.pending.v1.';
const githubFlowKey='stackquest.github.flow';
let githubMessage='';
const account={name:'',token:'',rows:new Map(),pending:new Map(),conflicts:new Map(),sync:null,timer:0,error:''};
async function callApi(path,method='GET',body,{authenticated=true}={}){
  const headers={};
  if(authenticated&&account.token)headers.Authorization='Bearer '+account.token;
  if(body!==undefined)headers['Content-Type']='application/json';
  const res=await fetch(apiOrigin+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(15000)});
  const data=await res.json();
  if(!res.ok)throw Object.assign(Error(data.error||'Falha ao acessar a API.'),{status:res.status,data});
  return data;
}
function syncLabel(){
  if(!account.name)return 'Visitante';
  if(account.conflicts.size)return 'Revisar conflito';
  if(account.error)return 'Sincronização pendente';
  return account.pending.size?'Salvando…':'Sincronizado';
}
function updateSyncLabel(){const el=document.getElementById('sync-label');if(el)el.textContent=syncLabel();}
function rememberPending(){
  try{sessionStorage.setItem(pendingKey+account.name,JSON.stringify([...account.pending]));}catch{}
  updateSyncLabel();
}
const progressStore={
  getItem(key){if(!account.name)return localStorage.getItem(key);return (account.pending.get(key)||account.rows.get(key))?.value??null;},
  setItem(key,value){
    if(!account.name){localStorage.setItem(key,value);return;}
    if(this.getItem(key)===value)return;
    const version=(account.pending.get(key)||account.rows.get(key))?.version||0;
    account.pending.set(key,{value,version});rememberPending();
    clearTimeout(account.timer);account.timer=setTimeout(flushProgress,220);
  }
};
async function flushProgress(){
  if(account.sync)return account.sync;
  if(!account.name||!account.pending.size)return;
  account.sync=(async()=>{
    account.error='';
    while(true){
      const entry=[...account.pending].find(([k])=>!account.conflicts.has(k));
      if(!entry)break;
      const [key,sent]=entry;
      try{
        const data=await callApi('/api/progress','PUT',{key,...sent});
        account.rows.set(key,{value:sent.value,version:data.version});
        const latest=account.pending.get(key);
        if(latest?.value===sent.value)account.pending.delete(key);
        else if(latest)latest.version=data.version;
      }catch(e){
        if(e.status===409){account.conflicts.set(key,e.data.current);continue;}
        account.error=e.status===401?'Sua sessão expirou. Entre novamente para enviar as alterações desta aba.':'Não foi possível salvar na VPS. Tente sincronizar novamente.';break;
      }finally{rememberPending();}
    }
  })();
  try{await account.sync;}finally{account.sync=null;updateSyncLabel();}
}
function installSnapshot(data){
  account.githubLinked=!!data.githubLinked;
  account.name=data.name;account.rows=new Map(data.records.map(r=>[r.key,r]));
  account.conflicts.clear();account.error='';
  try{account.pending=new Map(JSON.parse(sessionStorage.getItem(pendingKey+data.name)||'[]'));}catch{account.pending=new Map();}
}
async function restoreAccount(){
  try{account.token=sessionStorage.getItem(sessionKey)||'';}catch{return;}
  if(account.token)try{installSnapshot(await callApi('/api/me'));await flushProgress();}
  catch(e){
    if(e.status===401){account.token='';sessionStorage.removeItem(sessionKey);}
    else throw e;
  }
  await finishGithub();
}
function base64url(bytes){
  return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
async function finishGithub(){
  const result=sessionStorage.getItem('stackquest.github.result');
  if(!result)return;
  const stored=sessionStorage.getItem(githubFlowKey);
  sessionStorage.removeItem('stackquest.github.result');
  sessionStorage.removeItem(githubFlowKey);
  try{
    const flow=JSON.parse(stored),reply=JSON.parse(result);
    if(!flow||reply.state!==flow.state||Date.now()-flow.started>600000||flow.name!==account.name)
      throw Error('Esta tentativa expirou ou começou em outra aba. Inicie o login novamente.');
    if(reply.error||!reply.code)throw Error('Autorização pelo GitHub cancelada. Você pode tentar novamente.');
    const link=!!flow.name;
    const data=await callApi('/api/auth/github/'+(link?'link':'login'),'POST',{code:reply.code,verifier:flow.verifier},{authenticated:link});
    if(link){account.githubLinked=true;githubMessage='GitHub vinculado à sua conta.';}
    else{sessionStorage.setItem(sessionKey,data.token);account.token=data.token;installSnapshot(data);await flushProgress();}
  }catch(e){githubMessage=e.message||'Não foi possível entrar com o GitHub.';}
}
async function githubButton(button,message){
  if(githubMessage){message.textContent=githubMessage;githubMessage='';}
  if(account.githubLinked){button.textContent='GitHub vinculado';button.disabled=true;button.hidden=false;return;}
  let config;
  try{config=await callApi('/api/auth/github/config','GET',undefined,{authenticated:false});}catch{return;}
  if(!config.enabled)return;
  button.hidden=false;
  if(button.parentElement.id==='github-entry')button.parentElement.hidden=false;
  button.onclick=async()=>{
    button.disabled=true;
    try{
      const generate=()=>base64url(crypto.getRandomValues(new Uint8Array(32)));
      const verifier=generate(),state=generate();
      const challenge=base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
      sessionStorage.setItem(githubFlowKey,JSON.stringify({state,verifier,started:Date.now(),name:account.name}));
      const query=new URLSearchParams({client_id:config.clientId,redirect_uri:config.redirectUri,state,code_challenge:challenge,code_challenge_method:'S256',scope:'',prompt:'select_account'});
      location.assign('https://github.com/login/oauth/authorize?'+query);
    }catch{button.disabled=false;message.textContent='Não foi possível iniciar o acesso. Verifique se o armazenamento está permitido nesta aba.';}
  };
}
function accountPage(){
  if(account.name){
    main.innerHTML=header('Perfil','Minha conta',account.name+' · '+(countDone()*xp+labXP())+' XP')+
      '<section class="lessoncard account-box"><h2>Progresso individual</h2><p>'+countDone()+' de '+lessons.length+' missões · '+labGuides.filter(g=>labState(g.id).earned).length+' de 4 laboratórios de infraestrutura · '+dbDone()+' de 6 decisões de banco.</p><p id="account-state" role="status"></p><div id="conflicts"></div><button type="button" class="act" id="github-link" hidden>Vincular GitHub a esta conta</button><div class="lesson-actions"><a href="#aparencia" class="textlink">Personalizar aparência</a><button id="sync" class="act">Sincronizar progresso</button><button id="logout" class="textlink">Sair da conta</button></div></section>';
    const status=main.querySelector('#account-state');status.textContent=account.error||syncLabel();
    githubButton(main.querySelector('#github-link'),status);
    for(const [key,current] of account.conflicts){
      const panel=document.createElement('div');panel.className='feedback';
      const label=document.createElement('p');label.textContent='Outro dispositivo alterou '+key+'. Escolha qual versão deste item manter.';panel.append(label);
      for(const [title,useLocal] of [['Usar a desta aba',true],['Usar a da VPS',false]]){
        const button=document.createElement('button');button.className='textlink';button.textContent=title;
        button.onclick=async()=>{account.rows.set(key,current);if(useLocal)account.pending.get(key).version=current.version;else account.pending.delete(key);account.conflicts.delete(key);rememberPending();await flushProgress();reloadProgress();render();};
        panel.append(button);
      }
      main.querySelector('#conflicts').append(panel);
    }
    main.querySelector('#sync').onclick=async()=>{await flushProgress();if(!account.pending.size)try{installSnapshot(await callApi('/api/me'));}catch(e){account.error=e.message;}reloadProgress();render();};
    main.querySelector('#logout').onclick=async()=>{
      await flushProgress();
      if(account.pending.size&&!account.error.includes('expirou')){status.textContent=account.error||'Resolva as alterações pendentes antes de sair.';return;}
      try{await callApi('/api/auth/logout','POST');}catch(e){if(e.status!==401){status.textContent='Não foi possível encerrar a sessão na VPS. Tente novamente.';return;}}
      sessionStorage.removeItem(sessionKey);location.replace('#conta');location.reload();
    };return;
  }
  const register=location.hash==='#cadastro';
  main.innerHTML=header('Conta StackQuest',register?'Criar conta':'Entrar na conta','Continue suas missões, laboratórios e decisões de arquitetura em outro dispositivo.')+
    '<form class="lessoncard account-box" id="auth-form"><label>Nome de usuário<input name="name" autocomplete="username" required minlength="3" maxlength="32" pattern="[a-zA-Z0-9][a-zA-Z0-9_\-]{2,31}" autocapitalize="none" spellcheck="false"></label><p class="footnote">Use de 3 a 32 letras sem acentos, números, hífen ou sublinhado.</p><label>Senha<input name="password" type="password" required minlength="12" maxlength="128" autocomplete="'+(register?'new-password':'current-password')+'"></label><p class="footnote">Use pelo menos 12 caracteres.</p><div class="lesson-actions"><button class="act" type="submit">'+(register?'Criar minha conta':'Entrar')+'</button><a class="textlink" href="'+(register?'#conta':'#cadastro')+'">'+(register?'Já tenho conta':'Criar uma conta')+'</a></div><div id="github-entry" hidden><button type="button" class="act" id="github-login">Entrar com GitHub</button><p class="footnote">Já joga com senha? Entre com ela e vincule o GitHub em Minha conta para continuar com seu progresso.</p></div><div role="status" id="auth-message"></div></form>';
  const form=main.querySelector('#auth-form');
  githubButton(form.querySelector('#github-login'),form.querySelector('#auth-message'));
  form.onsubmit=async e=>{
    e.preventDefault();const button=form.querySelector('button');button.disabled=true;
    const data=new FormData(form);
    try{
      const snapshot=await callApi('/api/auth/'+(register?'register':'login'),'POST',{name:data.get('name'),password:data.get('password')});
      sessionStorage.setItem(sessionKey,snapshot.token);account.token=snapshot.token;installSnapshot(snapshot);
      await flushProgress();reloadProgress();location.hash='conta';render();
    }catch(error){main.querySelector('#auth-message').textContent=error.status?error.message:'Não foi possível acessar a conta. Confira a conexão e tente novamente.';}
    finally{button.disabled=false;}
  };
}
window.addEventListener('online',flushProgress);
document.addEventListener('visibilitychange',()=>{if(document.hidden)flushProgress();});
