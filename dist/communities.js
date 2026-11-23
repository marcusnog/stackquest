async function communityPage(route){
  const match=/^comunidades(?:\/(?:pagina\/([1-9]\d*)|([1-9]\d*)(?:\/biblioteca\/([1-9]\d*))?))?$/.exec(route);
  if(!match){location.replace('#comunidades');return;}
  const [,pageNumber,group,library]=match,page=Number(pageNumber||1);
  const base='#comunidades',groupLink=base+'/'+group;
  const endpoint='/api/communities',groupApi=endpoint+'/'+group,libraryApi=groupApi+'/libraries';
  main.innerHTML='<div class="community-page"><div class="community-body"></div><p class="community-status" role="status">Carregando…</p></div>';
  const panel=main.querySelector('.community-page'),body=panel.querySelector('.community-body'),status=panel.querySelector('[role=status]');
  const esc=studioText;
  const nameField='<label>Nome<input name="name" required maxlength="80"></label>';
  const link=(url,title)=>'<a class="textlink" href="'+url+'">'+title+'</a>';
  const back=url=>link(url,'← '+(library?'Bibliotecas da comunidade':'Todas as comunidades'));
  function problem(e){
    status.textContent=e.message||'Não foi possível carregar os dados.';
    if(e.status===401){
      const login=document.createElement('a');login.href='#conta';login.textContent=' Entrar novamente';
      login.onclick=event=>{event.preventDefault();location.replace('#conta');location.reload();};
      status.append(login);
    }
  }
  function submit(selector,action){
    const form=body.querySelector(selector);
    form.onsubmit=async event=>{
      event.preventDefault();
      const button=form.querySelector('button[type=submit]');if(button.disabled)return;
      button.disabled=true;status.textContent='Salvando…';
      try{await action(new FormData(form));}catch(e){problem(e);}
      finally{button.disabled=false;}
    };
  }
  function joinButtons(){
    for(const button of body.querySelectorAll('[data-join]'))button.onclick=async()=>{
      button.disabled=true;
      try{
        const id=button.dataset.join;
        await callApi(endpoint+'/'+id+'/join','POST');
        if(!panel.isConnected)return;
        if(group)communityPage(route);else location.hash=base+'/'+id;
      }catch(e){problem(e);button.disabled=false;}
    };
  }
  try{
    if(!group){
      const result=await callApi(endpoint+'?page='+page);
      if(!panel.isConnected)return;
      body.innerHTML=header('Área de estudo','Comunidades','Participe de um grupo para reunir e compartilhar materiais de estudo.')+
        '<details class="card"><summary>Criar comunidade</summary><form id="create-community">'+nameField+
        '<p class="footnote">Qualquer pessoa com conta no StackQuest poderá encontrar e entrar nesta comunidade.</p><button class="act" type="submit">Criar comunidade</button></form></details>'+
        '<div class="library-grid">'+result.communities.map(c=>'<article class="resource"><h2>'+esc(c.name)+'</h2><p>Criada por '+esc(c.owner)+'</p>'+
          (c.member?link(base+'/'+c.id,'Abrir comunidade'):'<button class="act" data-join="'+c.id+'">Participar</button>')+'</article>').join('')+'</div>'+
        (result.communities.length?'':'<p>Nenhuma comunidade nesta página.</p>')+
        '<nav class="lesson-actions" aria-label="Páginas de comunidades">'+(page>1?link(base+'/pagina/'+(page-1),'Página anterior'):'')+
        (result.more?link(base+'/pagina/'+(page+1),'Próxima página'):'')+'</nav>';
      joinButtons();
      submit('#create-community',async fields=>{
        const created=await callApi(endpoint,'POST',{name:fields.get('name')});
        if(panel.isConnected)location.hash=base+'/'+created.id;
      });
    }else if(!library){
      const data=await callApi(groupApi);
      if(!panel.isConnected)return;
      body.innerHTML=back(base)+header('Comunidade',esc(data.name),'Crie uma biblioteca ou importe materiais para estudar com o grupo.')+
        '<div class="community-tools"><details class="card"><summary>Nova biblioteca</summary><form id="new-library">'+nameField+
        '<button class="act" type="submit">Criar biblioteca</button></form></details>'+
        '<details class="card"><summary>Importar biblioteca</summary><form id="import-course"><label>Módulo do StackQuest<select name="module">'+
        course.map((m,i)=>'<option value="'+i+'">'+esc(m.title)+'</option>').join('')+'</select></label><button class="act" type="submit">Importar referências do módulo</button></form>'+
        '<form id="import-file"><label>Arquivo de biblioteca (.json)<input name="file" type="file" accept=".json,application/json" required></label>'+
        '<p class="footnote">Use um arquivo exportado pelo StackQuest ou siga o formato abaixo.</p><pre>{"name":"Filas","items":[{"title":"RabbitMQ","url":"https://www.rabbitmq.com/"}]}</pre>'+
        '<button class="act" type="submit">Importar arquivo</button></form></details></div>'+
        '<h2>Bibliotecas</h2><div class="library-grid">'+data.libraries.map(l=>'<article class="resource"><h3>'+link(groupLink+'/biblioteca/'+l.id,esc(l.name))+'</h3><p>'+
          l.count+(l.count===1?' material':' materiais')+'</p></article>').join('')+'</div>'+
        (data.libraries.length?'':'<p>A comunidade ainda não tem bibliotecas.</p>');
      async function create(data){
        const collection=await callApi(libraryApi,'POST',data);
        if(panel.isConnected)location.hash=groupLink+'/biblioteca/'+collection.id;
      }
      submit('#new-library',fields=>create({name:fields.get('name'),items:[]}));
      submit('#import-course',fields=>{
        const module=course[Number(fields.get('module'))];
        const entries=module.lessons.map(l=>l.reference);
        return create({name:module.title,items:[...new Map(entries.map(e=>[e.url,e])).values()]});
      });
      submit('#import-file',async fields=>{
        const file=fields.get('file');
        if(!file||file.size>1048576)throw Error('Escolha um arquivo JSON de até 1 MiB.');
        let data;try{data=JSON.parse(await file.text());}catch{throw Error('O arquivo contém JSON inválido.');}
        if(!data||typeof data.name!=='string'||!Array.isArray(data.items))throw Error('O arquivo precisa conter name e uma lista items.');
        await create({name:data.name,items:data.items});
      });
    }else{
      const path=libraryApi+'/'+library,data=await callApi(path);
      if(!panel.isConnected)return;
      body.innerHTML=back(groupLink)+header('Biblioteca da comunidade',esc(data.name),'Materiais compartilhados pelos membros.')+
        '<div class="community-tools"><details class="card"><summary>Adicionar material</summary><form id="add-item"><label>Título<input name="title" required maxlength="160"></label>'+
        '<label>Link<input name="url" type="url" required maxlength="2048" placeholder="https://"></label><button class="act" type="submit">Adicionar material</button></form></details>'+
        '<button type="button" class="textlink" id="export-library">Exportar biblioteca (.json)</button></div>'+
        (data.items.length?'<ul class="community-materials">'+data.items.map(entry=>'<li><a href="'+esc(entry.url)+'" target="_blank" rel="noopener noreferrer">'+esc(entry.title)+'</a><small>'+esc(new URL(entry.url).hostname)+'</small></li>').join('')+'</ul>':'<p>Esta biblioteca está vazia. Adicione o primeiro material.</p>');
      submit('#add-item',async fields=>{
        await callApi(path+'/items','POST',{title:fields.get('title'),url:fields.get('url')});
        if(panel.isConnected)await communityPage(route);
      });
      body.querySelector('#export-library').onclick=()=>{
        const file=new Blob([JSON.stringify({name:data.name,items:data.items},null,2)],{type:'application/json'});
        const url=URL.createObjectURL(file),download=document.createElement('a');
        download.href=url;download.download='biblioteca-'+data.id+'.json';download.click();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
      };
    }
    status.textContent='';
  }catch(e){
    if(!panel.isConnected)return;
    body.innerHTML=(group?link(base,'← Todas as comunidades'):'')+header('Área de estudo','Comunidades','')+
      (e.status===403&&group?'<button class="act" data-join="'+group+'">Participar da comunidade</button>':'');
    joinButtons();problem(e);
  }
}
