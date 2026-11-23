const plantaoParts = {
  client: {name: 'Loja', price: 0, description: 'Representa os compradores e distribui seus pedidos entre as APIs ligadas à loja.'},
  api: {name: 'API', price: 3, description: 'Recebe os pedidos e mantém uma fila local. Cada conexão do pool atende um pedido de 40 ms simulados por vez.'},
  sql: {name: 'Banco SQL', price: 5, description: 'Guarda o estoque do SKU. A política condicional verifica e decrementa o saldo de forma atômica, como um UPDATE com condição de estoque positivo.'},
  kv: {name: 'Banco chave-valor', price: 4, description: 'Guarda o estoque pela chave do SKU. A política condicional verifica e decrementa o atributo de saldo em uma operação atômica sobre o item.'},
  cache: {name: 'Cache', price: 2, description: 'Guarda o saldo lido por 120 ms simulados. A política separada lê essa cópia quando a API está ligada ao cache. A política condicional consulta a autoridade de estoque diretamente.'}
};
const plantaoBudget = 12;
const plantaoWaves = [
  {name: 'Abertura da loja', goal: 'Atenda 3 pedidos, um a cada 80 ms, com 3 unidades disponíveis. Confirme os 3 com p95 de até 80 ms.'},
  {name: 'Pico de tráfego', goal: 'Receba 12 pedidos simultâneos com 12 unidades. Confirme todos com p95 de até 160 ms. Observe a fila e as conexões em uso.'},
  {name: 'Corrida pela última unidade', goal: 'Receba 8 pedidos simultâneos para o mesmo SKU. Confirme exatamente 1 e recuse os outros 7, com p95 de até 160 ms.'}
];
const plantaoLoads = [
  {arrivals: [0,80,160], stock: 3, deadline: 80},
  {arrivals: Array(12).fill(0), stock: 12, deadline: 160},
  {arrivals: Array(8).fill(0), stock: 1, deadline: 160}
];

function plantaoSpent(tiles) {
  return tiles.reduce((sum,type) => sum + (Object.hasOwn(plantaoParts,type) ? plantaoParts[type].price : 0), 0);
}

function runPlantao(config, waveIndex) {
  const {tiles, edges, pool, policy} = config;
  const load = plantaoLoads[waveIndex];
  const spent = plantaoSpent(tiles);
  const block = (hint, cell = -1) => ({
    pass: false, correct: 0, total: load?.arrivals.length || 0, p95: 0, confirmed: 0, spent,
    frames: [{text: hint, cell, queue: 0, cpu: 0, connections: 0}], hint
  });
  if (!Number.isInteger(waveIndex) || !load) return block('Escolha uma das três ondas disponíveis.');
  if (tiles.length !== 16 || tiles.some(t => t !== null && !Object.hasOwn(plantaoParts,t))) return block('Use os componentes disponíveis nas 16 células da bancada.');
  if (spent > plantaoBudget) return block('O desenho custa '+spent+' créditos e o limite é '+plantaoBudget+'. Remova uma peça ou troque o banco antes de iniciar a carga.');
  if (!Number.isInteger(pool) || pool < 1 || pool > 4) return block('Escolha de 1 a 4 conexões por API.');
  if (!['condicional','separada'].includes(policy)) return block('Escolha a política de reserva antes de iniciar a onda.');

  const cellsOf = type => tiles.flatMap((tile,cell) => tile === type ? [cell] : []);
  const clients = cellsOf('client'), apis = cellsOf('api'), stores = [...cellsOf('sql'),...cellsOf('kv')];
  if (!clients.length) return block('Adicione um cliente para emitir os pedidos.');
  if (!apis.length) return block('Adicione uma API entre os compradores e o estoque.',clients[0]);
  if (stores.length !== 1) return block(stores.length ? 'O SKU precisa de um único saldo oficial. Mantenha um SQL ou um KV e conecte as APIs a ele.' : 'Adicione SQL ou KV para guardar as unidades disponíveis.',stores[1] ?? apis[0]);
  const store = stores[0], routes = tiles.map(() => new Set());
  for (const {from,to} of edges) {
    if (!Number.isInteger(from) || !Number.isInteger(to) || !tiles[from] || !tiles[to]) return block('Uma seta termina fora de uma peça. Reconecte as duas células ocupadas.');
    const allowed = (tiles[from] === 'client' && tiles[to] === 'api') ||
      (tiles[from] === 'api' && ['sql','kv','cache'].includes(tiles[to]));
    if (!allowed) return block('Percorra a seta no sentido do pedido. O cliente chama a API, que acessa o banco e pode consultar um cache.', from);
    routes[from].add(to);
  }
  for (const client of clients) if (!routes[client].size) return block('Ligue este cliente a uma API para entregar seus pedidos.',client);
  for (const api of apis) {
    if (!clients.some(c => routes[c].has(api))) return block('Esta API está fora do caminho dos compradores. Conecte um cliente a ela ou remova a peça.',api);
    if (!routes[api].has(store)) return block('Ligue esta API diretamente ao banco que mantém o saldo. A API precisa persistir a reserva mesmo quando consulta o cache.',api);
    if ([...routes[api]].filter(cell => tiles[cell] === 'cache').length > 1) return block('Deixe um único cache de consulta ligado a cada API para definir qual cópia ela lê.',api);
  }
  for (const cache of cellsOf('cache')) if (!apis.some(a => routes[a].has(cache))) return block('O cache está isolado. Ligue uma API a ele ou libere os créditos removendo a peça.',cache);

  // Each arrival chooses only routes available to its own client; API queues do not steal work.
  const apiQueues = new Map(apis.map(api => [api,[]]));
  const clientRoutes = new Map(clients.map(c => [c,[...routes[c]].sort((a,b) => a-b)]));
  const cacheFor = new Map(apis.map(api => [api,[...routes[api]].find(cell => tiles[cell] === 'cache')]));
  const caches = new Map(), flights = [], latencies = [], frames = [];
  let stock = load.stock, confirmed = 0, cursor = 0, now = 0, cacheReads = 0;
  function frame(text, cell) {
    const connections = flights.length;
    const queue = [...apiQueues.values()].reduce((sum,requests) => sum + requests.length, 0);
    frames.push({text: now+' ms · '+text, cell, queue, connections, cpu: Math.round(100 * connections / (apis.length * pool))});
  }
  while (cursor < load.arrivals.length || flights.length) {
    now = Math.min(load.arrivals[cursor] ?? Infinity, ...flights.map(r => r.finish));
    const completed = flights.filter(r => r.finish === now);
    if (completed.length) {
      let accepted = 0;
      for (const r of completed) {
        // UPDATE stock = stock - 1. A split policy uses its old read as authorization.
        const available = policy === 'condicional' ? stock : r.observed;
        if (available > 0) {
          stock--;
          confirmed++;
          accepted++;
        }
        latencies.push(now-r.arrived);
        flights.splice(flights.indexOf(r),1);
      }
      frame(accepted+' reserva(s) confirmada(s), '+(completed.length-accepted)+' recusada(s). Saldo oficial após as gravações: '+stock+'.',store);
    }
    const start = cursor;
    while (load.arrivals[cursor] === now) {
      const client = clients[cursor % clients.length], options = clientRoutes.get(client);
      const api = options[Math.floor(cursor / clients.length) % options.length];
      apiQueues.get(api).push({arrived: now});
      cursor++;
    }
    if (cursor > start) frame((cursor-start)+' pedido(s) chegaram às filas das APIs.',clients[start % clients.length]);
    for (const api of apis) {
      const waiting = apiQueues.get(api);
      const free = pool - flights.filter(r => r.api === api).length;
      const admitted = waiting.splice(0,free);
      if (!admitted.length) continue;
      const cache = cacheFor.get(api);
      let observed = stock;
      if (policy === 'separada' && cache !== undefined) {
        if (!caches.has(cache) || caches.get(cache).until <= now) caches.set(cache,{balance:stock,until:now+120});
        observed = caches.get(cache).balance;
        cacheReads += admitted.length;
      }
      for (const r of admitted) flights.push({...r,api,observed,finish:now+40});
      if (policy === 'separada') {
        frame(admitted.length+' pedido(s) leram saldo '+observed+' '+(cache === undefined?'no banco':'no cache')+'. Um saldo positivo autoriza o decremento posterior, sem verificar o estoque outra vez.',cache ?? store);
      } else {
        frame(admitted.length+' pedido(s) em atendimento. Cada reserva vai verificar o saldo no momento de gravar no banco.',api);
      }
    }
  }
  const total = load.arrivals.length, shouldConfirm = Math.min(total,load.stock);
  const correct = total-Math.abs(confirmed-shouldConfirm);
  latencies.sort((a,b) => a-b);
  const p95 = latencies[Math.ceil(total*0.95)-1];
  const pass = correct === total && p95 <= load.deadline;
  let hint;
  if (confirmed !== shouldConfirm) {
    hint = confirmed+' confirmações para '+load.stock+' unidade(s). '+(cacheReads?'O cache reutilizou uma leitura. ':'')+'Verifique e decremente o saldo em uma escrita condicional no SQL ou KV para decidir cada disputa.';
  } else if (p95 > load.deadline) {
    hint = 'O p95 ficou em '+p95+' ms e a meta é '+load.deadline+' ms. Observe as conexões ocupadas e a fila. Amplie o pool ou distribua os pedidos entre APIs conectadas.';
  } else if (policy === 'separada') {
    hint = 'A carga desta onda recebeu as confirmações esperadas. '+(cacheReads?'A API leu o saldo do cache antes de gravar. ':'')+'Na corrida pela última unidade, pedidos concorrentes podem tomar a mesma decisão com um saldo antigo.';
  } else {
    hint = 'As decisões respeitaram o estoque e o p95 ficou dentro da meta. A escrita condicional fez a verificação e o decremento juntos no banco.';
  }
  frame('Resultado: '+confirmed+' confirmação(ões) para '+load.stock+' unidade(s). p95 de '+p95+' ms.',store);
  return {pass,correct,total,p95,confirmed,spent,frames,hint};
}
