const warChapters=[
  {title:'A versão defeituosa',station:'Telemetria',desk:[2,0],item:'Relatório do canário',pickup:[1,3],
   radio:'Lia, aqui é Ravi. O checkout começou a devolver erro depois do deploy. Pegue o relatório do canário e descubra qual revisão devemos isolar.',
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
   result:'Pedido P-17 reconciliado. A reentrega encontrou a chave já gravada e saiu sem cobrar outra vez.'}
];
const warTorch=[0,1],warBreaker=[8,0],warFurniture=[[3,2],[4,2],[5,2],warBreaker,...warChapters.map(c=>c.desk)];
const warDirections={w:[0,-1],a:[-1,0],s:[0,1],d:[1,0]};
const warCoord=([x,y])=>'ABCDEFGHI'[x]+(y+1);
function warWalkable(x,y){
  return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<9&&y>=0&&y<5&&!warFurniture.some(([a,b])=>a===x&&b===y);
}
function warState(raw={}){
  const stage=Number.isInteger(raw?.stage)&&raw.stage>=0&&raw.stage<=3?raw.stage:0;
  const power=stage===0?'on':stage>1?'restored':['dark','torch','restored'].includes(raw.power)?raw.power:'dark';
  const position=warWalkable(raw?.x,raw?.y)?[raw.x,raw.y]:[0,4];
  return {x:position[0],y:position[1],stage,power,collected:stage<3&&power!=='dark'&&power!=='torch'&&raw?.collected===true};
}
function warMove(state,key){
  const delta=warDirections[key];
  if(!delta||state.stage===3)return false;
  const x=state.x+delta[0],y=state.y+delta[1];
  if(!warWalkable(x,y))return false;
  state.x=x;state.y=y;return true;
}
function warTarget(state){
  if(state.stage===3)return null;
  if(state.power==='dark')return {kind:'torch',name:'Lanterna de emergência',pos:warTorch};
  if(state.power==='torch')return {kind:'breaker',name:'Disjuntor',pos:warBreaker};
  const chapter=warChapters[state.stage];
  return state.collected?{kind:'puzzle',name:chapter.station,pos:chapter.desk}:{kind:'item',name:chapter.item,pos:chapter.pickup};
}
function warNear(state,pos){return Math.abs(state.x-pos[0])+Math.abs(state.y-pos[1])<=1;}
function warInteract(state){
  const target=warTarget(state);
  if(!target||!warNear(state,target.pos))return 'far';
  if(target.kind==='torch')state.power='torch';
  if(target.kind==='breaker')state.power='restored';
  if(target.kind==='item')state.collected=true;
  return target.kind;
}
function warSolve(state,input){
  const target=warTarget(state);
  if(target?.kind!=='puzzle'||!warNear(state,target.pos))return false;
  const chapter=warChapters[state.stage];
  const correct=state.stage===0?input===chapter.answer:state.stage===1?input===8:
    Array.isArray(input)&&input.length===3&&chapter.order.every((v,i)=>input[i]===v);
  if(!correct)return false;
  state.stage++;state.collected=false;
  if(state.stage===1)state.power='dark';
  return true;
}
