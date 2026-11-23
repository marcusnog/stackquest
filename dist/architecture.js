const archLessons={checkout:'3-1',tarefas:'6-2',rag:'9-2'};
const archUsageFields=[
  ['hours','Horas por instância',730,744],['storage','Armazenamento total (GB-mês)',50,1e9],
  ['egress','Saída para internet (GB)',100,1e9],['requests','Requisições no mês',1000000,1e15],
  ['inputTokens','Tokens de entrada',1000000,1e15],['outputTokens','Tokens de saída',250000,1e15]
];
const archWidth=1800,archHeight=1100,archNodeW=164,archNodeH=66;
const archRateFields=[['storage','US$ por GB-mês de disco',0.10],['egress','US$ por GB de saída',0.09],['inputTokens','US$ por milhão de tokens de entrada',1],['outputTokens','US$ por milhão de tokens de saída',4]];
const archBound=(n,max)=>Math.max(0,Math.min(n,max));
function readArchitecture(lesson) {
  const stored=records.get(lesson)?.architecture||{};
  const nodes=[], ids=new Set();
  if(Array.isArray(stored.nodes))for(const n of stored.nodes.slice(0,60)){
    if(!n||typeof n.id!=='string'||!/^n\d{1,8}$/.test(n.id)||ids.has(n.id)||!Object.hasOwn(archParts,n.type))continue;
    ids.add(n.id);nodes.push({id:n.id,type:n.type,x:archBound(Number(n.x)||0,archWidth-archNodeW),y:archBound(Number(n.y)||0,archHeight-archNodeH)});
  }
  const edges=[];
  if(Array.isArray(stored.edges))for(const e of stored.edges){
    if(e&&ids.has(e.from)&&ids.has(e.to)&&e.from!==e.to&&!edges.some(other=>other.from===e.from&&other.to===e.to))edges.push({from:e.from,to:e.to});
  }
  if(!Array.isArray(stored.nodes))nodes.push({id:'n1',type:'client',x:32,y:85});
  const provider=Object.hasOwn(archClouds,stored.provider)?stored.provider:'aws',usage={};
  for(const [key,,initial,max] of archUsageFields)usage[key]=Number.isFinite(stored.usage?.[key])?archBound(stored.usage[key],max):initial;
  usage.rates={};
  for(const [key,,initial] of archRateFields)usage.rates[key]=Number.isFinite(stored.usage?.rates?.[key])?archBound(stored.usage.rates[key],1e6):initial;
  return {nodes,edges,provider,usage};
}
function architectureBoard(caseId){
  const c=archCases.find(item=>item.id===caseId)||archCases[0], lesson=archLessons[c.id];
  const board=readArchitecture(lesson), esc=studioText, undo=[];
  let selected=board.nodes[0]?.id, mode='', balloon=null, result, zoom=1, gesture=null;
  const button=(name,action,symbol)=>'<button type="button" data-action="'+action+'">'+(symbol?icon(symbol,15):'')+name+'</button>';
  main.innerHTML=`<div class="arch">
    <header class="arch-bar"><a href="#central"><img src="mark.svg" alt="">StackQuest</a><span>/</span><a href="#laboratorios">Laboratórios</a><span>/</span><b>Arquitetura</b><a href="#aparencia" class="arch-user">Aparência</a><a href="#conta">${account.name?'Minha conta':'Entrar'}</a></header>
    <div class="arch-body"><header class="arch-title"><div><span class="arch-kicker">Laboratório de system design</span><h1>Simulador de arquitetura</h1></div><label>Problema de arquitetura<select id="ar-case">${archCases.map(v=>'<option value="'+v.id+'">'+esc(v.title)+'</option>').join('')}</select></label></header>
    <section class="arch-brief"><span class="arch-brief-icon">${icon('flag',22)}</span><div><h2>${esc(c.title)}</h2><p>${esc(c.brief)}</p><p class="arch-load">${esc(c.load)}</p></div><details class="arch-goal"><summary>Critério de sucesso</summary><p>${esc(c.goal)}</p></details></section>
    <div class="arch-bench"><aside class="arch-library"><h2>Componentes</h2><p>Clique ou arraste para o quadro.</p><div id="ar-palette"></div></aside>
    <section class="arch-work"><div class="arch-work-head"><h2>${icon('network',18)} Quadro</h2><button data-action="cost" id="ar-mini"></button><div>${button('Desfazer','undo')} ${button('−','out')} <output id="ar-zoom">100%</output> ${button('+','in')}</div></div>
    <div class="arch-frame"><div id="ar-viewport" tabindex="0" aria-label="Área de desenho com rolagem"><div id="ar-space"><div id="ar-plane"><svg id="ar-wires" width="1800" height="1100" aria-hidden="true"></svg><div id="ar-nodes"></div></div></div></div><div id="ar-bubble" hidden></div></div>
    <div class="arch-actions"><strong id="ar-selection"></strong><div>${button('Conectar','connect','route')}${button('Mover','move')}${button('Remover','remove')}</div></div><p class="arch-message" id="ar-message" role="status"></p>
    </section></div>
    <section class="arch-review"><div><h2>Revisão do desenho</h2><p id="ar-verdict"></p><ul id="ar-checks"></ul><div id="ar-issues"></div></div><div><h2>Conexões</h2><p>As setas indicam o sentido do fluxo. Selecione a origem, clique em Conectar e escolha o destino.</p><ul id="ar-edges"></ul></div></section>
    <section class="arch-cost"><div class="arch-cost-head"><div><span class="arch-kicker">Cloud</span><h2>Estimativa mensal</h2><p>Compare o mesmo desenho e a mesma carga em três provedores. Selecione um para ver a composição.</p></div><a id="ar-official" target="_blank" rel="noopener noreferrer">Calculadora oficial ↗</a></div>
    <div id="ar-clouds"></div><details class="arch-inputs" open><summary>Premissas de uso mensal</summary><div>${archUsageFields.map(([key,label,,max])=>'<label>'+esc(label)+'<input id="ar-use-'+key+'" type="number" inputmode="numeric" step="1" min="0" max="'+max+'"></label>').join('')}</div></details>
    <details class="arch-inputs"><summary>Editar preços unitários didáticos</summary><div>${archRateFields.map(([key,label])=>'<label>'+esc(label)+'<input id="ar-rate-'+key+'" type="number" min="0" max="1000000" step="any"></label>').join('')}</div></details>
    <div id="ar-bill"></div></section></div></div>`;
  const root=main.querySelector('.arch'),el=id=>root.querySelector('#ar-'+id), vp=el('viewport'),plane=el('plane'),box=el('bubble');
  const node=id=>board.nodes.find(n=>n.id===id);
  const names=id=>{const n=node(id);if(!n)return '';const multiple=board.nodes.filter(v=>v.type===n.type).length>1;return archParts[n.type].name+(multiple?' · '+id:'');};
  const report=message=>el('message').textContent=message;
  const persist=()=>save(lesson,{architecture:board});
  const snapshot=()=>JSON.stringify({nodes:board.nodes,edges:board.edges});
  function remember(before){undo.push(before);if(undo.length>35)undo.shift();}
  const control=key=>root.querySelector('[data-action="'+key+'"]');
  control('in').setAttribute('aria-label','Ampliar quadro');control('out').setAttribute('aria-label','Reduzir quadro');
  el('case').value=c.id;el('case').onchange=e=>location.hash='lab/arquitetura/'+e.target.value;
  for(const group of new Set(Object.values(archParts).map(p=>p.group))){
    const section=document.createElement('div');section.innerHTML='<h3>'+esc(group)+'</h3>'+Object.entries(archParts).filter(([,p])=>p.group===group).map(([type,p])=>
      '<button type="button" draggable="true" data-part="'+type+'" title="'+esc(p.description)+'" aria-label="Adicionar '+esc(p.name)+'"><span class="ar-icon" data-type="'+type+'">'+icon(p.icon,17)+'</span><span>'+esc(p.name)+'</span><b aria-hidden="true">+</b></button>').join('');el('palette').append(section);
  }
  function reveal(id){
    const n=node(id);if(!n)return;
    if(n.x*zoom<vp.scrollLeft+8||(n.x+archNodeW)*zoom>vp.scrollLeft+vp.clientWidth-8)vp.scrollLeft=(n.x+archNodeW/2)*zoom-vp.clientWidth/2;
    if(n.y*zoom<vp.scrollTop+8||(n.y+archNodeH)*zoom>vp.scrollTop+vp.clientHeight-8)vp.scrollTop=(n.y+archNodeH/2)*zoom-vp.clientHeight/2;
  }
  function placeBubble(){
    if(box.hidden||!balloon)return;
    const n=node(balloon.nodeId);if(!n)return;
    const left=n.x*zoom-vp.scrollLeft, top=n.y*zoom-vp.scrollTop;
    const visible=left<vp.clientWidth&&left+archNodeW*zoom>0&&top<vp.clientHeight&&top+archNodeH*zoom>0;
    box.style.visibility=visible?'visible':'hidden';
    const below=top+archNodeH*zoom+8, above=top-box.offsetHeight-8;
    let x=left,y=below;
    if(below+box.offsetHeight>vp.clientHeight){
      if(above>=0)y=above;
      else if(left+archNodeW*zoom+8+box.offsetWidth<vp.clientWidth){x=left+archNodeW*zoom+8;y=top;}
      else if(left>box.offsetWidth+8){x=left-box.offsetWidth-8;y=top;}
    }
    box.style.left=archBound(x,vp.clientWidth-box.offsetWidth-6)+'px';
    box.style.top=archBound(y,vp.clientHeight-box.offsetHeight-4)+'px';
  }
  function showBubble(issue){
    balloon=issue||null;box.hidden=!issue;
    if(!issue)return;
    box.innerHTML='<div><small>Revisão · '+esc(names(issue.nodeId))+'</small><button aria-label="Fechar sugestão">×</button></div><strong>'+esc(issue.title)+'</strong><p>'+esc(issue.problem)+'</p><b>Opção sugerida</b><p>'+esc(issue.alternative)+'</p><b>Por quê?</b><p>'+esc(issue.why)+'</p>';
    box.querySelector('button').onclick=()=>showBubble(null);placeBubble();
  }
  function drawWires(){
    el('wires').innerHTML='<defs><marker id="ar-tip" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0L8 4L0 8Z" fill="#46768c"/></marker></defs>'+board.edges.map(e=>{
      const a=node(e.from),b=node(e.to),dx=b.x-a.x,dy=b.y-a.y;
      const horizontal=Math.abs(dx)/archNodeW>=Math.abs(dy)/archNodeH;
      const side=Math.sign(horizontal?dx:dy)||1;
      const x1=a.x+archNodeW/2+(horizontal?side*archNodeW/2:0),y1=a.y+archNodeH/2+(horizontal?0:side*archNodeH/2);
      const x2=b.x+archNodeW/2-(horizontal?side*(archNodeW/2+2):0),y2=b.y+archNodeH/2-(horizontal?0:side*(archNodeH/2+2));
      const mx=(x1+x2)/2,my=(y1+y2)/2;
      return '<path d="M'+x1+' '+y1+' C'+(horizontal?mx:x1)+' '+(horizontal?y1:my)+','+(horizontal?mx:x2)+' '+(horizontal?y2:my)+','+x2+' '+y2+'" fill="none" stroke="#46768c" stroke-width="2" marker-end="url(#ar-tip)"/>';
    }).join('');
  }
  function draw(){
    result=evaluateArch(c.id,board.nodes,board.edges);
    el('nodes').innerHTML=board.nodes.map(n=>{
      const p=archParts[n.type],problem=result.issues.some(i=>i.nodeId===n.id);
      return '<button class="arch-node" data-id="'+n.id+'" style="left:'+n.x+'px;top:'+n.y+'px" aria-pressed="'+(selected===n.id)+'" aria-label="'+esc(names(n.id))+(problem?', com sugestão':'')+'"><span class="ar-icon" data-type="'+n.type+'">'+icon(p.icon,19)+'</span><span><small>'+esc(p.group)+'</small><strong>'+esc(names(n.id))+'</strong></span>'+(problem?'<b class="arch-alert">!</b>':'')+'</button>';
    }).join('');
    drawWires();
    el('selection').textContent=selected?names(selected):'Selecione um componente';
    for(const action of ['connect','move','remove'])control(action).disabled=!selected;
    for(const action of ['connect','move'])control(action).setAttribute('aria-pressed',String(mode===action));
    control('undo').disabled=!undo.length;
    el('checks').innerHTML=result.checks.map(q=>'<li class="'+(q.pass?'ok':'')+'"><b>'+ (q.pass?'✓':'○')+'</b>'+esc(q.label)+'</li>').join('');
    el('verdict').textContent=result.passed?'Desenho atende aos critérios deste cenário.':result.checks.filter(q=>q.pass).length+' de '+result.checks.length+' critérios atendidos.';
    el('issues').innerHTML=result.issues.map((q,i)=>'<button data-issue="'+i+'">'+icon('flag',13)+esc(names(q.nodeId))+' · '+esc(q.title)+'</button>').join('');
    el('edges').innerHTML=board.edges.length?board.edges.map((e,i)=>'<li><span>'+esc(names(e.from))+' → '+esc(names(e.to))+'</span><button data-edge="'+i+'" aria-label="Excluir conexão de '+esc(names(e.from))+' para '+esc(names(e.to))+'">×</button></li>').join(''):'<li>Nenhuma conexão desenhada.</li>';
    renderCost();
  }
  function edit(fn,preferred,message){
    const before=snapshot(),oldIssues=new Set(result.issues.map(i=>i.nodeId+i.title+i.problem));fn();remember(before);mode='';
    if(!node(selected))selected=board.nodes[0]?.id;
    draw();persist();report(message);
    const fresh=result.issues.filter(i=>!oldIssues.has(i.nodeId+i.title+i.problem));
    const issue=fresh.find(i=>i.nodeId===preferred)||fresh[0]||result.issues.find(i=>i.nodeId===preferred);
    reveal(issue?.nodeId||preferred);showBubble(issue);
  }
  function coords(event){const r=plane.getBoundingClientRect();return {x:(event.clientX-r.left)/zoom,y:(event.clientY-r.top)/zoom};}
  function position(x,y){return {x:Math.round(archBound(x,archWidth-archNodeW)),y:Math.round(archBound(y,archHeight-archNodeH))};}
  function add(type,point){
    if(!Object.hasOwn(archParts,type))return;
    if(board.nodes.length>=60){report('O quadro comporta até 60 componentes.');return;}
    const id='n'+(1+Math.max(0,...board.nodes.map(n=>Number(n.id.slice(1)))));
    let pos=point?position(point.x-archNodeW/2,point.y-archNodeH/2):null;
    if(!pos){
      const slots=[];for(let y=85;y<archHeight-archNodeH;y+=115)for(let x=32;x<archWidth-archNodeW;x+=212)slots.push({x,y});
      const distance=p=>Math.abs(p.y-(vp.scrollTop/zoom+85))*4+Math.abs(p.x-(vp.scrollLeft/zoom+32));
      slots.sort((a,b)=>distance(a)-distance(b));
      pos=slots.find(v=>!board.nodes.some(n=>Math.abs(n.x-v.x)<archNodeW+8&&Math.abs(n.y-v.y)<archNodeH+8))||slots[0];
    }
    edit(()=>{board.nodes.push({id,type,...pos});selected=id;},id,archParts[type].name+' adicionado.');
  }
  function activate(id){
    if(mode==='connect'&&selected){
      if(id===selected){report('Escolha outro componente como destino.');return;}
      if(board.edges.some(e=>e.from===selected&&e.to===id)){report('Essa conexão já existe. Escolha outro destino.');return;}
      const from=selected;edit(()=>{board.edges.push({from,to:id});selected=id;},id,'Conexão adicionada.');return;
    }
    selected=id;mode='';draw();showBubble(result.issues.find(i=>i.nodeId===id));
    report(archParts[node(id).type].description);
  }
  const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD'});
  const calculators={aws:'https://calculator.aws/',azure:'https://azure.microsoft.com/en-us/pricing/calculator/',gcp:'https://cloud.google.com/products/calculator'};
  function renderCost(){
    const quotes=Object.fromEntries(Object.keys(archClouds).map(k=>[k,archCost(k,board.nodes,board.usage)]));
    el('clouds').innerHTML=Object.entries(archClouds).map(([key,cloud])=>'<button data-cloud="'+key+'" aria-pressed="'+(board.provider===key)+'"><span>'+esc(cloud.name)+'</span><strong>'+money.format(quotes[key].total)+'</strong><small>'+esc(cloud.region)+'</small></button>').join('');
    const cloud=archClouds[board.provider], quote=quotes[board.provider];
    el('official').href=calculators[board.provider];
    el('mini').textContent=cloud.name+' · '+money.format(quote.total)+'/mês ↓';
    el('bill').innerHTML='<h3>Custos em '+esc(cloud.name)+'</h3><ul>'+quote.lines.map(row=>'<li><div><b>'+esc(row.label)+'</b><small>'+esc(row.detail)+'</small>'+(row.source?'<a target="_blank" rel="noopener noreferrer" href="'+esc(row.source)+'">Preços do serviço ↗</a>':'')+'</div><strong>'+money.format(row.amount)+'</strong></li>').join('')+'</ul><details><summary>Tarifas e limites da estimativa</summary>'+quote.notes.map(note=>'<p>'+esc(note)+'</p>').join('')+'<p><a target="_blank" rel="noopener noreferrer" href="'+esc(cloud.source)+'">Consultar preços do provedor ↗</a></p></details>';
  }
  for(const [fields,prefix,values] of [[archUsageFields,'use-',board.usage],[archRateFields,'rate-',board.usage.rates]]){
    for(const [key] of fields){
      const input=el(prefix+key);input.value=values[key];
      input.oninput=()=>{if(!input.value||!input.validity.valid)return;values[key]=input.valueAsNumber;renderCost();persist();};
      input.onblur=()=>{input.value=values[key];};
    }
  }
  root.onclick=event=>{
    const b=event.target.closest('button');if(!b)return;
    if(b.dataset.part){add(b.dataset.part);return;}
    if(b.dataset.cloud){board.provider=b.dataset.cloud;renderCost();persist();root.querySelector('[data-cloud="'+board.provider+'"]').focus({preventScroll:true});return;}
    if(b.dataset.edge!==undefined){edit(()=>board.edges.splice(Number(b.dataset.edge),1),selected,'Conexão removida.');return;}
    if(b.dataset.issue!==undefined){const issue=result.issues[Number(b.dataset.issue)];selected=issue.nodeId;mode='';draw();vp.scrollIntoView({block:'nearest'});reveal(selected);showBubble(issue);return;}
    if(b.dataset.id){activate(b.dataset.id);return;}
    switch(b.dataset.action){
      case 'cost':root.querySelector('.arch-cost').scrollIntoView({block:'start'});root.querySelector('[data-cloud="'+board.provider+'"]').focus({preventScroll:true});break;
      case 'connect':case 'move':
        mode=mode===b.dataset.action?'':b.dataset.action;showBubble(null);draw();
        report(mode==='connect'?'Selecione o componente de destino.':mode==='move'?'Toque no ponto do quadro onde deseja mover a peça.':'Ação cancelada.');break;
      case 'remove':{
        const id=selected;edit(()=>{board.nodes=board.nodes.filter(n=>n.id!==id);board.edges=board.edges.filter(e=>e.from!==id&&e.to!==id);},null,'Componente e conexões removidos.');break;
      }
      case 'undo':{
        const prior=undo.pop();if(!prior)return;Object.assign(board,JSON.parse(prior));selected=board.nodes[0]?.id;mode='';draw();showBubble(null);persist();report('Alteração desfeita.');break;
      }
      case 'out':case 'in':
        zoom=Math.max(.5,Math.min(1.5,zoom+(b.dataset.action==='in'?.25:-.25)));
        plane.style.transform='scale('+zoom+')';el('space').style.width=archWidth*zoom+'px';el('space').style.height=archHeight*zoom+'px';el('zoom').textContent=zoom*100+'%';control('in').disabled=zoom===1.5;control('out').disabled=zoom===.5;reveal(selected);placeBubble();break;
    }
  };
  el('palette').ondragstart=e=>{const type=e.target.closest('[data-part]')?.dataset.part;if(type)e.dataTransfer.setData('application/x-stackquest-part',type);};
  vp.ondragover=e=>{if(e.dataTransfer.types.includes('application/x-stackquest-part'))e.preventDefault();};
  vp.ondrop=e=>{e.preventDefault();add(e.dataTransfer.getData('application/x-stackquest-part'),coords(e));};
  vp.onclick=e=>{
    if(e.target.closest('button'))return;
    if(mode==='move'&&selected){const p=coords(e);edit(()=>Object.assign(node(selected),position(p.x-archNodeW/2,p.y-archNodeH/2)),selected,'Componente movido.');}
    else {mode='';showBubble(null);draw();report('');}
  };
  vp.onpointerdown=e=>{
    const target=e.target.closest('[data-id]');if(!target||mode||e.button!==0)return;
    const n=node(target.dataset.id);gesture={n,startX:e.clientX,startY:e.clientY,x:n.x,y:n.y,before:snapshot(),target};
    target.setPointerCapture(e.pointerId);
  };
  vp.onpointermove=e=>{
    if(!gesture)return;const g=gesture,dx=e.clientX-g.startX,dy=e.clientY-g.startY;
    if(!g.moved&&Math.abs(dx)+Math.abs(dy)<5)return;
    g.moved=true;Object.assign(g.n,position(g.x+dx/zoom,g.y+dy/zoom));g.target.style.left=g.n.x+'px';g.target.style.top=g.n.y+'px';
    showBubble(null);drawWires();
  };
  vp.onpointerup=()=>{
    const g=gesture;gesture=null;if(!g?.moved)return;
    selected=g.n.id;remember(g.before);draw();persist();showBubble(result.issues.find(i=>i.nodeId===selected));report('Componente movido.');
  };
  vp.onpointercancel=()=>{if(gesture){Object.assign(gesture.n,{x:gesture.x,y:gesture.y});gesture=null;draw();}};
  vp.onkeydown=e=>{
    const id=e.target.closest('[data-id]')?.dataset.id, delta={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[e.key];
    if(!id||!delta)return;e.preventDefault();const n=node(id);
    edit(()=>{selected=id;Object.assign(n,position(n.x+delta[0],n.y+delta[1]));},id,'Componente movido.');
    root.querySelector('[data-id="'+id+'"]').focus({preventScroll:true});
  };
  root.onkeydown=e=>{if(e.key==='Escape'){mode='';draw();showBubble(null);report('Seleção disponível.');}};
  vp.onscroll=placeBubble;draw();report('Adicione componentes e conecte o caminho da requisição.');
}
