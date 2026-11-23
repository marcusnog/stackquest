const warChapters=[
  {title:'A versão defeituosa',station:'Telemetria',desk:[2,0],item:'Relatório do canário',pickup:[1,3],
   radio:'Lia, aqui é Ravi, da ponte. O checkout das cargas começou a falhar após o deploy. A nave de abastecimento já está em órbita. Confira as duas revisões antes da próxima docagem.',
   evidence:'Janela de 5 min · v41: 12 erros em 12.000 pedidos · v42: 24 erros em 300 pedidos. As duas revisões usam o mesmo banco.',
   prompt:'Apenas uma revisão excede o limite de 1% de erros. Qual ação contém o incidente?',
   options:['Retirar a v41 do balanceador','Suspender a v42 e encaminhar à v41','Escalar as duas revisões'],answer:1,
   hints:['A v41 falhou em 0,1% dos pedidos. Compare as taxas antes de retirar a versão estável.','','Escalar mantém a revisão com defeito recebendo pedidos. Compare os erros por pedido.'],
   result:'Canário isolado. A v42 tinha 8% de erros contra 0,1% na v41.'},
  {title:'O orçamento de conexões',station:'Workers',desk:[5,0],item:'Ficha do pool',pickup:[4,4],
   radio:'A energia voltou, Lia. As compras voltaram a entrar, mas a fila de cobrança cresceu durante o apagão. Use a ficha de capacidade para abrir os workers.',
   evidence:'O banco admite 40 conexões. O checkout reserva 16. Há 3 workers idênticos e cada tarefa em execução ocupa 1 conexão.',
   prompt:'Programe a maior concorrência segura por worker. Preserve a reserva do checkout.',
   result:'Fila escoando. Os três workers usam até 24 conexões e deixam 16 para o checkout.'},
  {title:'Uma cobrança por pedido',station:'Expedição',desk:[8,2],item:'Recibo de reentrega',pickup:[7,3],
   radio:'Lia, duas mensagens têm o mesmo número de pedido. A primeira foi gravada antes de o worker cair. Monte o protocolo que protege o livro de cobranças.',
   evidence:'M-81 e M-94 carregam o pedido P-17. O efeito é um lançamento no mesmo banco da chave única. A fila pode entregar novamente antes de receber o ACK.',
   prompt:'Monte a ordem de processamento. O lançamento só ocorre se a chave for nova.',
   steps:['Enviar ACK à fila','Tentar inserir a chave única do pedido na transação','Gravar se a chave for nova e confirmar a transação'],order:[1,2,0],
   result:'Pedido P-17 reconciliado. A reentrega encontrou a chave já gravada e saiu sem cobrar outra vez.'},
  {title:'O catálogo em enxurrada',station:'Workers',desk:[5,0],item:'Cartucho do catálogo',pickup:[0,3],
   radio:'As cápsulas atracaram juntas. As entradas do cache venceram no mesmo segundo e as consultas atingiram a origem. Escolha como responder a cada leva.',
   relay:[7,4],relayName:'Antena das cápsulas',relayAction:'Sintonizar antena',
   result:'Catálogo estabilizado. Três levas atendidas dentro dos limites de carga e validade.'},
  {title:'Dois relógios na ponte',station:'Telemetria',desk:[2,0],item:'Sonda de replicação',pickup:[7,1],
   radio:'A réplica do manifesto ficou para trás enquanto a nave atravessava a sombra da lua. Uma tela desatualizada pode liberar a carga errada. Compare o atraso de cada rota.',
   relay:[1,4],relayName:'Baliza de sincronismo',relayAction:'Sincronizar baliza',
   result:'Manifesto reconciliado. Cada leitura respeitou seu limite de atraso e seu prazo de resposta.'},
  {title:'Última janela de transmissão',station:'Expedição',desk:[8,2],item:'Modem de emergência',pickup:[2,3],
   radio:'Uma tempestade de poeira estreitou o enlace com a Terra. Reserve banda para a telemetria e deixe capacidade para o manifesto antes que a janela feche.',
   relay:[4,0],relayName:'Acoplador da ponte',relayAction:'Alinhar acoplador',
   result:'Enlace estabilizado. Os três lotes de telemetria e carga chegaram à Terra.'}
];
const warDesks=warChapters.slice(0,3).map(c=>c.desk);
const warTorch=[0,1],warBreaker=[8,0],warFurniture=[[3,2],[4,2],[5,2],warBreaker,...warDesks];
const warDirections={w:[0,-1],a:[-1,0],s:[0,1],d:[1,0]};
const warTag=[3,0];
const warBulkhead=[6,0],warIce=[[6,1],[6,2],[6,3]];
const warTagText='Manutenção · O ramal B alimenta os monitores de telemetria.';
const warCircuits=['Leste · Ramal A','Oeste · Ramal B','Leste · Ramal B'];
const warPoint=([x,y])=>[72+55*x+10*y,100+32*y];
function warBeam(state){
  const [x,y]=warPoint([state.x,state.y]);
  const angle={w:-105,a:180,s:75,d:0}[state.facing];
  return {x:x+(state.facing==='a'?-11:9),y:y-17,angle};
}
function warTagLit(state){
  if(state.power!=='torch')return false;
  const lamp=warBeam(state),[x,y]=warPoint(warTag);
  const dx=x-lamp.x,dy=y-32-lamp.y,len=Math.hypot(dx,dy);
  const rad=lamp.angle*Math.PI/180;
  return len<=143 && dx*Math.cos(rad)+dy*Math.sin(rad)>=len*Math.cos(Math.PI/5);
}
const warCoord=([x,y])=>'ABCDEFGHI'[x]+(y+1);
function warWalkable(x,y){
  return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<9&&y>=0&&y<5&&!warFurniture.some(([a,b])=>a===x&&b===y);
}
function warState(raw={}){
  const stage=Number.isInteger(raw?.stage)&&raw.stage>=0&&raw.stage<=warChapters.length?raw.stage:0;
  const operational=!!warChapters[stage]?.relay;
  const wave=operational&&[1,2].includes(raw.wave)?raw.wave:0;
  const power=stage===0?'on':stage>1?'restored':['dark','torch','restored'].includes(raw.power)?raw.power:'dark';
  const position=warWalkable(raw?.x,raw?.y)?[raw.x,raw.y]:[0,4];
  return {x:position[0],y:position[1],stage,power,facing:Object.hasOwn(warDirections,raw?.facing)?raw.facing:'s',
    hull:stage===2&&raw?.hull==='breached'?'breached':stage>=2&&raw?.hull==='sealed'?'sealed':'intact',
    tagRead:(power==='torch'||power==='restored')&&raw?.tagRead===true,
    wave,offset:operational&&stage!==4&&[1,2].includes(raw.offset)?raw.offset:0,
    relayReady:wave>0&&(wave===2||raw.relayReady===true),
    setting:operational&&Number.isInteger(raw.setting)&&raw.setting>=0&&raw.setting<=(stage===5?20:2)?raw.setting:null,
    collected:stage<warChapters.length&&power!=='dark'&&power!=='torch'&&(wave>0||raw?.collected===true)};
}
function warMove(state,key){
  const delta=warDirections[key];
  if(!delta||state.stage===warChapters.length)return false;
  state.facing=key;
  const x=state.x+delta[0],y=state.y+delta[1];
  if(!warWalkable(x,y))return false;
  if(state.hull==='breached'&&warIce.some(([col,row])=>col===x&&row===y))return false;
  state.x=x;state.y=y;return true;
}
function warTarget(state){
  if(state.stage===warChapters.length)return null;
  if(state.power==='dark')return {kind:'torch',name:'Lanterna de emergência',pos:warTorch};
  if(state.power==='torch'&&!state.tagRead)return {kind:'tag',name:'Etiqueta de manutenção',pos:warTag};
  if(state.power==='torch')return {kind:'breaker',name:'Disjuntor',pos:warBreaker};
  if(state.hull==='breached')return {kind:'bulkhead',name:'Comando da antepara',pos:warBulkhead};
  const chapter=warChapters[state.stage];
  if(chapter.relay&&state.wave===1&&!state.relayReady)return {kind:'relay',name:chapter.relayName,pos:chapter.relay};
  return state.collected?{kind:'puzzle',name:chapter.station,pos:chapter.desk}:{kind:'item',name:chapter.item,pos:chapter.pickup};
}
function warNear(state,pos){return Math.abs(state.x-pos[0])+Math.abs(state.y-pos[1])<=1;}
function warReach(state,target){
  return !!target&&warNear(state,target.pos)&&(target.kind!=='tag'||warTagLit(state));
}
// Guide the first incident from any saved position, including detours around the table.
function warTutorialStep(state){
  if(state.stage!==0)return null;
  const target=warTarget(state),routing=state.collected?3:1;
  if(warReach(state,target))return {step:state.collected?3:2,key:'use'};
  const queue=[[state.x,state.y,null]],seen=new Set([state.x+','+state.y]);
  for(const [x,y,first] of queue){
    for(const [key,[dx,dy]] of Object.entries(warDirections)){
      const nx=x+dx,ny=y+dy,id=nx+','+ny;
      if(seen.has(id)||!warWalkable(nx,ny))continue;
      if(warNear({x:nx,y:ny},target.pos))return {step:routing,key:first||key};
      seen.add(id);queue.push([nx,ny,first||key]);
    }
  }
  return null;
}
function warInteract(state){
  const target=warTarget(state);
  if(!warReach(state,target))return 'far';
  if(target.kind==='torch')state.power='torch';
  if(target.kind==='tag')state.tagRead=true;
  if(target.kind==='bulkhead')state.hull='sealed';
  if(target.kind==='item')state.collected=true;
  if(target.kind==='relay')state.relayReady=true;
  return target.kind;
}
function warRestore(state,choice){
  const target=warTarget(state);
  if(target?.kind!=='breaker'||!warReach(state,target)||choice!==warCircuits[2])return false;
  state.power='restored';return true;
}
function warSolve(state,input){
  const target=warTarget(state);
  if(target?.kind!=='puzzle'||!warNear(state,target.pos))return false;
  const chapter=warChapters[state.stage];
  if(chapter.relay)return false;
  const correct=state.stage===0?input===chapter.answer:state.stage===1?input===8:
    Array.isArray(input)&&input.length===3&&chapter.order.every((v,i)=>input[i]===v);
  if(!correct)return false;
  state.stage++;state.collected=false;
  if(state.stage===1)state.power='dark';
  if(state.stage===2)state.hull='breached';
  if(state.stage===3)state.offset=Math.floor(Math.random()*3);
  return true;
}

// Each window models one second of traffic. The starting window varies by run.
function warWindow(state){
  const index=(state.offset+state.wave)%3;
  if(state.stage===3){
    const [requests,keys,age,limit]=[[96,12,8,0],[120,36,4,6],[80,18,11,2]][index];
    return {title:'Proteja a origem',evidence:requests+' leituras simultâneas de '+keys+' chaves expiradas. A origem aceita 24 consultas/s. A cópia tem '+age+' s e o cliente tolera '+limit+' s.',
      options:['Consultar a origem a cada leitura','Agrupar leituras iguais, uma consulta por chave','Servir a cópia por esta janela e adiar a atualização'],
      measure:value=>{
        const load=[requests,keys,0][value],stale=value===2?age:0;
        return {ok:load<=24&&stale<=limit,text:load+' consultas/s na origem (limite 24) · dados com '+stale+' s (limite '+limit+' s).'};
      }};
  }
  if(state.stage===4){
    const [lag,limit,deadline]=[[7,0,100],[3,5,40],[9,0,45]][index];
    return {title:'Encaminhe a leitura',evidence:'Primário remoto: 80 ms, dados atuais. Réplica local: 12 ms, atraso de '+lag+' s. A baliza tem uma cópia confirmada do manifesto atual e leva 38 ms, mas só fica disponível após a primeira janela. Prazo: '+deadline+' ms. Atraso tolerado: '+limit+' s.',
      options:['Ler do primário','Ler da réplica local','Ler da baliza sincronizada'],
      measure:value=>{
        const latency=[80,12,38][value],age=value===1?lag:0;
        if(value===2&&!state.relayReady)return {ok:false,text:'A baliza ainda está fora de sincronismo. Nenhum manifesto recebido.'};
        return {ok:latency<=deadline&&age<=limit,text:latency+' ms de resposta (prazo '+deadline+' ms) · atraso de '+age+' s (limite '+limit+' s).'};
      }};
  }
  const [capacity,telemetry,cargo]=[[14,5,9],[18,10,8],[12,4,8]][index];
  return {title:'Distribua a banda do enlace',evidence:'Enlace de '+capacity+' Mbit/s. Nesta janela de um segundo chegam '+telemetry+' Mbit de telemetria e '+cargo+' Mbit de manifesto. O valor reservado vai para a telemetria. O restante atende o manifesto.',
    max:capacity,measure:value=>{
      const missingTelemetry=Math.max(0,telemetry-value),missingCargo=Math.max(0,cargo-(capacity-value));
      return {ok:missingTelemetry+missingCargo===0,text:'Fila ao fechar a janela: '+missingTelemetry+' Mbit de telemetria e '+missingCargo+' Mbit de manifesto.'};
    }};
}
function warTransmit(state,value){
  const target=warTarget(state);
  if(!warChapters[state.stage]?.relay||target?.kind!=='puzzle'||!warReach(state,target))return null;
  const profile=warWindow(state);
  if(!Number.isInteger(value)||value<0||value>(profile.max??profile.options.length-1))return null;
  const reading=profile.measure(value);
  state.setting=value;
  if(reading.ok){
    state.setting=null;
    state.wave++;
    if(state.wave===3){
      state.stage++;state.collected=false;state.wave=0;state.relayReady=false;
      state.offset=state.stage===4?0:Math.floor(Math.random()*3);
    }
  }
  return reading;
}
