// These count logical operations on synthetic fixtures, not database I/O or latency.
const sequence = n => Array.from({length:n}, (_,i)=>i);
function group(rows,keyOf) {
  const index=new Map();
  for (const row of rows) {
    const key=keyOf(row);
    if(!index.has(key))index.set(key,[]);
    index.get(key).push(row);
  }
  return index;
}
function measured(reads,unit,detail,budget,correct=true) {
  return {pass:correct && reads<=budget,metric:reads.toLocaleString('pt-BR')+' '+unit,detail};
}
function checkout(plan,stress) {
  let stock=1, confirmed=0;
  const buyers=sequence(8);
  const snapshots=buyers.map(()=>stock);
  for(const buyer of buyers) {
    const observed=stress&&plan==='async'?snapshots[buyer]:stock;
    if(observed>0){confirmed++;stock=observed-1;}
  }
  return {pass:confirmed===1,metric:confirmed+' de 8 reservas aceitas',detail:'Saldo final '+stock+'. '+(confirmed>1?'As oito leituras observaram o saldo inicial antes das gravações.':'Só a primeira reserva encontrou saldo disponível ao efetivar a atualização.')};
}
function sessions(plan,stress) {
  const expiry=60,central=new Map([['sessão',expiry]]),local=new Map(central);
  const valid=at=>(plan==='cache'?local:central).get('sessão')>at;
  const before=valid(10);
  if(stress)central.delete('sessão');
  const after=valid(stress?11:60);
  return {pass:before&&!after,metric:after?'Acesso aceito indevidamente':'Acesso recusado no prazo',detail:'Aos 10 s: sessão ativa. '+(stress?'Após logout aos 11 s, o segundo servidor ':'No vencimento aos 60 s, o servidor ')+(after?'aceitou':'recusou')+' o identificador.'};
}
function catalog(plan,stress) {
  const rows=sequence(stress?4200:140).map(i=>({id:i,category:i%4,color:Math.floor(i/4)%5,size:Math.floor(i/20)%4}));
  const matches=r=>r.category===1&&r.color===2&&r.size===1;
  let candidates=rows;
  if(plan==='doc')candidates=group(rows,r=>[r.category,r.color,r.size].join('/')).get('1/2/1')||[];
  if(plan==='gin') {
    const postings=['category','color','size'].map((key,i)=>new Set(group(rows,r=>r[key]).get([1,2,1][i])));
    candidates=[...postings[0]].filter(r=>postings[1].has(r)&&postings[2].has(r));
  }
  const found=candidates.filter(matches).length;
  return measured(candidates.length,'documentos examinados',found+' correspondências em '+rows.length+' produtos. A montagem e a leitura interna dos índices ficam fora desse contador.',200,found===rows.filter(matches).length);
}
function graph(plan,stress) {
  const nodes=stress?260:30,degree=stress?8:3;
  const edges=sequence(nodes).flatMap(src=>sequence(degree).map(j=>({src,dst:(src+j+1)%nodes})));
  const adjacency=group(edges,e=>e.src),found=new Set();let reads=0;
  function expand(src){
    const rows=plan==='scan'?edges:adjacency.get(src);
    reads+=rows.length;
    return rows.filter(e=>e.src===src).map(e=>e.dst);
  }
  const first=expand(0);
  for(const dst of first){found.add(dst);for(const second of expand(dst))found.add(second);}
  return measured(reads,'arestas examinadas',found.size+' perfis distintos a até dois saltos. Grafo de '+edges.length+' arestas e '+degree+' saídas por perfil.',900,found.size===degree*2);
}
function telemetry(plan,stress) {
  const rows=sequence(stress?80:4).flatMap(sensor=>sequence(stress?120:20).map(i=>({sensor,time:1430+i,value:(sensor+i)%7})));
  const start=1435,end=1445; // Five minutes on each side of midnight.
  const inWindow=r=>r.sensor===1&&r.time>=start&&r.time<end;
  function range(sorted) {
    function lower(time) {
      let lo=0,hi=sorted.length;
      while(lo<hi){const mid=(lo+hi)>>1;if(sorted[mid].time<time)lo=mid+1;else hi=mid;}
      return lo;
    }
    return sorted.slice(lower(start),lower(end));
  }
  let candidates=rows;
  if(plan==='time')candidates=range(group(rows,r=>r.sensor).get(1));
  if(plan==='bucket'){
    const partitions=group(rows,r=>r.sensor+'/'+Math.floor(r.time/1440));
    candidates=[...range(partitions.get('1/0')),...range(partitions.get('1/1'))];
  }
  const samples=candidates.filter(inWindow),sum=samples.reduce((acc,r)=>acc+r.value,0);
  return measured(candidates.length,'amostras lidas',samples.length+' observações; soma '+sum+'. Janela de 23h55 a 00h05, com o limite final exclusivo.',100,samples.length===10&&sum===rows.filter(inWindow).reduce((a,r)=>a+r.value,0));
}
function analytics(plan,stress) {
  const rows=sequence(stress?3200:500).map(i=>[i%4,Math.floor(i/4)%7,Math.floor(i/28)%3,i%31+1,0,0,0,0,0,0,0,0]);
  const totals=new Map();let reads=0;
  for(const row of rows){
    const key=(stress&&plan!=='rollup'?row.slice(0,3):row.slice(0,2)).join('/');
    totals.set(key,(totals.get(key)||0)+row[3]);
    if(plan==='row')reads+=row.length;
    if(plan==='column')reads+=stress?4:3;
  }
  if(plan==='rollup')reads=totals.size*3;
  const correct=!(plan==='rollup'&&stress);
  return measured(reads,'valores lidos',totals.size+' grupos sobre '+rows.length+' eventos. '+(correct?'Totais disponíveis em todas as dimensões solicitadas.':'Canal foi descartado na agregação. O total geral não reconstrói os grupos por canal.'),20000,correct);
}
const cases=new Map([
  ['checkout',[checkout,['tx','cas','async']]],['sessoes',[sessions,['ttl','index','cache']]],
  ['catalogo',[catalog,['doc','gin','scan']]],['relacoes',[graph,['adj','edge','scan']]],
  ['telemetria',[telemetry,['time','bucket','full']]],['analitica',[analytics,['column','rollup','row']]]
]);
function experiment(id,plan) {
  const entry=cases.get(id);
  if(!entry||!entry[1].includes(plan))return null;
  return {id,plan,base:entry[0](plan,false),stress:entry[0](plan,true)};
}
module.exports={experiment};
