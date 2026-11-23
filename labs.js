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
    '<a class="lab-banner arch-launch" href="#lab/arquitetura"><div class="lab-prompt">'+icon('network',32)+'</div><div><h2>Simulador de arquitetura</h2><p>Desenhe a stack para um problema e acompanhe as recomendações em cada componente.</p></div><span>Abrir quadro →</span></a>'+
    '<a class="plantao-entry cj-entry" href="#jogo/correio"><span class="plantao-entry-art">'+icon('layers',32)+'</span><div><small>Minigame de mensageria</small><h2>Correio de Jobs</h2><p>Opere a fila de encomendas e descubra por que um pedido ganhou duas etiquetas.</p></div><strong>Jogar</strong></a>'+
    '<a class="plantao-entry" href="#jogo/plantao"><span class="plantao-entry-art">'+plantaoSprite('api')+'</span><div><small>Minigame de construção</small><h2>Plantão no Datacenter</h2><p>Monte os servidores da loja e descubra quem consegue comprar a última unidade.</p></div><strong>Jogar →</strong></a>'+
    '<div class="lab-grid"><a class="labtile" href="#lab/bancos"><div class="tiletop"><span class="square teal">'+icon('database',24)+'</span><span class="counter">'+dbDone()+'/6 decisões</span></div><div class="eyebrow">Arquitetura de dados</div><h2>Escolha de banco de dados</h2><p>Compare planos de acesso e consistência para estoque, sessões, catálogo, relações, telemetria e análise de eventos.</p><div class="meta">50 XP por decisão</div></a>'+labGuides.map((g,i)=>'<a class="labtile" href="#lab/'+g.id+'"><div class="tiletop"><span class="square '+labColors[g.id]+'">'+icon(labSymbols[g.id],24)+'</span><span class="counter">'+(labState(g.id).earned?'Concluído':'200 XP')+'</span></div><div class="eyebrow">Laboratório '+String(i+1).padStart(2,'0')+'</div><h2>'+g.title+'</h2><p>'+g.intro+'</p><div class="meta">'+labTags[g.id]+'</div></a>').join('')+
    '<a class="labtile" href="#missao/9-2"><div class="tiletop"><span class="square teal">'+icon('network',24)+'</span></div><div class="eyebrow">Laboratório de IA</div><h2>Recuperação para RAG</h2><p>Compare busca lexical, vetorial e híbrida. Meça quantas evidências úteis entram no contexto da resposta.</p></a>'+
    '<a class="labtile" href="#missao/10-3"><div class="tiletop"><span class="square violet">'+icon('layers',24)+'</span></div><div class="eyebrow">Laboratório de IA</div><h2>Fine-tuning com adaptadores</h2><p>Treine um adaptador de baixo posto e investigue como a qualidade dos rótulos afeta as previsões do classificador.</p></a></div>';
}
