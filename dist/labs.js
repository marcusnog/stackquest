const labSymbols={vps:'terminal',deploy:'layers',cloud:'network',k8s:'blocks'};
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
  const groups=[
    ['Infraestrutura',labGuides.map(g=>['#lab/'+g.id,g.title,labTags[g.id],labState(g.id).earned?'Concluído':'200 XP'])],
    ['Arquitetura',[
      ['#lab/arquitetura','Simulador de arquitetura','Modele a stack e estime o custo na nuvem.','Quadro'],
      ['#lab/bancos','Escolha de banco de dados','Compare acesso, consistência e volume em seis cenários.',dbDone()+'/6 decisões']
    ]],
    ['IA',[
      ['#missao/9-2','Recuperação para RAG','Meça a cobertura das buscas lexical, vetorial e híbrida.','Experimento'],
      ['#missao/10-3','Fine-tuning com adaptadores','Avalie o efeito dos rótulos no classificador.','Experimento']
    ]],
    ['Jogos',[
      ['#jogo/war-room','Plantão em órbita','Restaure os serviços da estação com Lia.','RPG'],
      ['#jogo/correio','Correio de Jobs','Opere filas e workers sem duplicar pedidos.','Simulação'],
      ['#jogo/plantao','Plantão no Datacenter','Monte servidores para atender à carga da loja.','Construção']
    ]]
  ];
  main.innerHTML=header('Prática de System Design','Laboratórios','')+
    '<div class="catalog-filters" role="group" aria-label="Filtrar por área">'+['Todos',...groups.map(([group])=>group)].map((name,i)=>
      '<button type="button" aria-pressed="'+(i===0)+'">'+name+'</button>').join('')+'</div>'+
    groups.map(([group,items])=>'<section class="catalog-group" data-area="'+group+'"><h2>'+group+'</h2><ul>'+
      items.map(([url,title,description,status])=>'<li><a href="'+url+'"><span><strong>'+title+'</strong><small>'+description+'</small></span><span class="catalog-status">'+status+'</span>'+icon('forward',16)+'</a></li>').join('')+
      '</ul></section>').join('');
  const filters=main.querySelector('.catalog-filters');
  filters.onclick=e=>{
    const selected=e.target.closest('button');
    if(!selected)return;
    for(const button of filters.children)button.setAttribute('aria-pressed',String(button===selected));
    for(const section of main.querySelectorAll('.catalog-group'))section.hidden=selected!==filters.firstElementChild&&section.dataset.area!==selected.textContent;
  };
}
