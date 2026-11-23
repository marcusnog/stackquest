const archParts = {
  client: {name: 'Cliente', icon: 'panel', group: 'Entrada', description: 'Pessoa ou aplicação que inicia a solicitação. Desenhe o fluxo de ida. As respostas voltam pela conexão existente.'},
  gateway: {name: 'Gateway', icon: 'network', group: 'Entrada', description: 'Encaminha requisições à API e concentra políticas de entrada. A aplicação continua responsável pelas regras do produto.'},
  api: {name: 'API', icon: 'terminal', group: 'Processamento', description: 'Autentica o cliente e coordena as dependências de cada operação. No cenário de RAG pode coordenar busca e geração.'},
  cache: {name: 'Cache compartilhado', icon: 'bolt', group: 'Dados', description: 'Guarda cópias temporárias que podem expirar. Esta peça usa uma chave sem escopo de usuário ou empresa.'},
  sql: {name: 'Banco SQL', icon: 'database', group: 'Dados', description: 'Armazenamento transacional indexado por chave. Aqui pode reservar estoque com condição atômica ou guardar resultados pelo ID da tarefa.'},
  kv: {name: 'KV condicional', icon: 'layers', group: 'Dados', description: 'Armazenamento durável por chave com gravação condicional. Resolve disputas por SKU ou por ID de tarefa.'},
  queue: {name: 'Fila durável', icon: 'list', group: 'Mensageria', description: 'Aceita trabalhos e os entrega ao consumidor. Uma entrega pode se repetir. Desenhe a seta da fila para o worker.'},
  worker: {name: 'Worker', icon: 'gauge', group: 'Processamento', description: 'Consome um trabalho fora da requisição do cliente e grava o resultado antes de confirmar a entrega.'},
  vector: {name: 'Índice vetorial', icon: 'search', group: 'Dados', description: 'Busca passagens por similaridade com filtro obrigatório de empresa e permissões. Devolve texto e identificadores das fontes ao chamador.'},
  retriever: {name: 'Orquestrador RAG', icon: 'route', group: 'Processamento', description: 'Coordena as etapas de uma pergunta. Busca passagens autorizadas e, com o contexto em mãos, chama a geração.'},
  llm: {name: 'Modelo de linguagem', icon: 'hex', group: 'Processamento', description: 'Gera texto a partir das passagens fornecidas. A API ou o orquestrador verifica citações e pode se abster se faltar evidência.'}
};

const archCases = [
  {
    id: 'checkout', title: 'Reserve a última unidade',
    brief: 'Uma loja vende a última unidade de um SKU a compradores concorrentes. O cliente precisa receber a decisão de reserva na própria requisição. Desenhe somente o caminho da reserva. Pagamento e consulta de catálogo estão fora deste fluxo.',
    load: 'Oito compradores podem disputar o mesmo SKU simultaneamente. Uma única reserva pode ser aceita.',
    goal: 'Passe a solicitação pela API e delegue a decisão a uma única autoridade durável para esse SKU. SQL e KV representam, neste exercício, uma atualização atômica condicionada a saldo positivo. O diagrama avalia dependências. A implementação deve testar a concorrência real.'
  },
  {
    id: 'tarefas', title: 'Processe relatórios em segundo plano',
    brief: 'O cliente pede um relatório demorado. A API devolve um identificador após a aceitação durável do pedido. Um consumidor produz o resultado fora da requisição e o guarda para leitura posterior. Modele o envio e o processamento.',
    load: 'Dezenas de relatórios podem chegar juntos. Um consumidor pode receber novamente a mesma tarefa depois de uma interrupção.',
    goal: 'Leve cada pedido da API a uma fila durável e da fila a um worker. Cada worker registra o resultado em SQL ou KV usando o ID da tarefa. Nesta abstração, o consumidor confirma a entrega após a gravação idempotente. Vazão e política de reentrega exigem testes separados.'
  },
  {
    id: 'rag', title: 'Responda com fontes autorizadas',
    brief: 'Um assistente atende diversas empresas. A resposta deve citar a política vigente da empresa autenticada ou se abster se faltar evidência. Os documentos já foram indexados. Desenhe o caminho de uma pergunta online.',
    load: 'Empresas diferentes podem fazer perguntas idênticas sobre políticas distintas. Cada consulta precisa preservar seu próprio contexto.',
    goal: 'A API ou um orquestrador dedicado recupera trechos no índice filtrado e depois chama o modelo com esses trechos. Desenhe as duas dependências saindo da mesma peça. O exercício verifica a topologia. Filtros, ordem das chamadas, citações e abstenção precisam de validação com dados reais.'
  }
];

// Each arrow is a forward dependency. Queue delivery is the only producer-driven hop.
const archRoutes = {
  checkout: {client: ['gateway','api'], gateway: ['api'], api: ['sql','kv'], sql: [], kv: []},
  tarefas: {client: ['gateway','api'], gateway: ['api'], api: ['queue'], queue: ['worker'], worker: ['sql','kv'], sql: [], kv: []},
  rag: {client: ['gateway','api'], gateway: ['api'], api: ['retriever','vector','llm'], retriever: ['vector','llm'], vector: [], llm: []}
};

const archCaseAdvice = {
  checkout: {
    alternative: 'Use a API e um único banco SQL ou KV condicional para reservar esse SKU.',
    why: 'A disputa precisa terminar com uma decisão de estoque durável antes da resposta ao cliente.',
    problems: {
      cache: 'O valor do estoque nessa cópia pode estar desatualizado quando dois compradores disputam o item.',
      queue: 'Aceitar o pedido na fila ainda não informa quem conseguiu reservar a unidade.',
      worker: 'Uma decisão de reserva adiada para o consumidor deixa o comprador sem a confirmação síncrona exigida.',
      vector: 'Similaridade entre documentos não arbitra gravações concorrentes no saldo de um SKU.',
      llm: 'Um texto gerado não estabelece posse de uma unidade em estoque.',
      retriever: 'Organizar evidências para uma resposta textual não efetua a reserva condicional.'
    }
  },
  tarefas: {
    alternative: 'Encaminhe o pedido da API à fila. Ligue a fila ao worker e o worker a SQL ou KV.',
    why: 'O cliente precisa poder sair depois da aceitação, e o resultado deve sobreviver ao processo que o calculou.',
    problems: {
      cache: 'Uma cópia temporária pode expirar antes de o cliente buscar o relatório aceito.',
      vector: 'O índice de trechos atende consultas por similaridade. O relatório é recuperado por ID exato e exige persistência.',
      llm: 'O trabalho descrito é uma agregação determinística. A geração de texto não consome a fila nem persiste o resultado.',
      retriever: 'As entradas deste relatório vêm da tarefa aceita. O orquestrador de busca documental não implementa esse processamento.'
    }
  },
  rag: {
    alternative: 'Ligue a API ou o orquestrador RAG ao índice vetorial e ao modelo de linguagem.',
    why: 'A mesma pergunta pode exigir fontes diferentes para cada empresa. A geração deve receber os trechos autorizados daquela consulta.',
    problems: {
      cache: 'O cache desta paleta usa uma chave compartilhada. Uma resposta de outra empresa poderia ser reutilizada.',
      sql: 'O SQL desta paleta oferece consulta exata por chave. O acervo do cenário está no índice semântico com filtro de empresa.',
      kv: 'A consulta por chave deste KV não recupera as passagens relevantes para a pergunta em linguagem natural.',
      queue: 'A entrega assíncrona deixa a solicitação interativa sem o contexto recuperado para gerar sua resposta.',
      worker: 'Este consumidor depende de uma fila de trabalhos. O exercício trata da consulta online a documentos já indexados.'
    }
  }
};

function evaluateArch(caseId, nodes, edges) {
  const checks = [], issues = [];
  const check = (label, pass) => checks.push({label, pass: Boolean(pass)});
  const issue = (nodeId, title, problem, alternative, why) =>
    issues.push({nodeId, title, problem, alternative, why});
  if (!Object.hasOwn(archRoutes, caseId)) {
    check('Selecionar um cenário disponível.', false);
    return {checks, issues, passed: false};
  }
  const routes = archRoutes[caseId], advice = archCaseAdvice[caseId];
  const byId = new Map(), outgoing = new Map(), valid = new Map();
  const nameOf = node => Object.hasOwn(archParts, node.type) ? archParts[node.type].name : 'Componente desconhecido';
  for (const node of nodes) {
    if (byId.has(node.id)) {
      issue(node.id, 'Identificador repetido', 'Duas peças compartilham o mesmo identificador.', 'Remova a cópia e adicione uma nova peça.', 'Cada extremidade de uma ligação precisa identificar uma única peça.');
      continue;
    }
    byId.set(node.id, node);
    outgoing.set(node.id, []);
    valid.set(node.id, []);
    if (!Object.hasOwn(routes, node.type)) {
      const reason = Object.hasOwn(advice.problems, node.type) ? advice.problems[node.type] : 'Esta peça não participa das operações disponíveis neste cenário.';
      issue(node.id, nameOf(node) + ' fora do fluxo', reason, advice.alternative, advice.why);
    }
  }

  for (const edge of edges) {
    const source = byId.get(edge.from), target = byId.get(edge.to);
    if (!source || !target) {
      issue(source?.id ?? target?.id ?? null, 'Ligação sem destino válido', 'Uma extremidade aponta para uma peça ausente.', 'Remova a ligação e conecte duas peças presentes no desenho.', 'Uma peça removida não pode entregar nem receber uma solicitação.');
      continue;
    }
    if (outgoing.get(source.id).includes(target.id)) continue;
    outgoing.get(source.id).push(target.id);
    const destinations = Object.hasOwn(routes, source.type) ? routes[source.type] : [];
    if (destinations.includes(target.type)) {
      valid.get(source.id).push(target.id);
    } else {
      const labels = destinations.map(type => archParts[type].name);
      const suggestion = labels.length ? 'Conecte a saída de ' + nameOf(source) + ' a ' + labels.join(' ou ') + '.' : 'Remova esta seta. ' + advice.alternative;
      let reason = 'Esta ligação não representa uma etapa de ida no fluxo. A resposta já retorna ao chamador pela ligação original.';
      if (source.type === 'client') reason = 'Uma ligação direta contorna a API que autentica o pedido e aplica as regras do produto.';
      if (source.type === 'api' && target.type === 'worker') reason = 'Invocar o consumidor diretamente prende o envio ao processamento e contorna a aceitação durável na fila.';
      if (source.type === 'vector' && target.type === 'llm') reason = 'O índice devolve trechos ao chamador. Quem ordena a recuperação e a geração é a API ou o orquestrador.';
      issue(source.id, nameOf(source) + ' → ' + nameOf(target), reason, suggestion, advice.why);
    }
  }

  // A back edge closes a cycle even if one of its arrows is itself unsupported.
  const visiting = new Set(), visited = new Set();
  function visit(id) {
    visiting.add(id);
    for (const next of outgoing.get(id)) {
      if (visiting.has(next)) {
        issue(id, 'Ciclo no caminho de ida', 'Ao seguir esta saída, o pedido volta a uma peça que já está sendo visitada.', 'Remova a seta de retorno ou a autorreferência.', 'As respostas já estão implícitas. Um ciclo impede determinar onde termina este fluxo didático.');
      } else if (!visited.has(next)) visit(next);
    }
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of byId.keys()) if (!visited.has(id)) visit(id);

  const allNodes = [...byId.values()];
  const ofType = type => allNodes.filter(node => node.type === type);
  const allHave = (list, predicate) => list.length > 0 && list.every(predicate);
  const outputs = node => valid.get(node.id).map(id => byId.get(id));
  const serves = (node, ...types) => outputs(node).some(next => types.includes(next.type));
  const clients = ofType('client'), gateways = ofType('gateway'), apis = ofType('api');
  const reached = new Set(clients.map(node => node.id));
  for (const id of reached) for (const next of valid.get(id)) reached.add(next);
  check('Receber cada cliente em uma API, diretamente ou pelo gateway.', allHave(clients, n => serves(n, 'api','gateway')) && gateways.every(n => serves(n, 'api')) && apis.length > 0);
  if (caseId === 'checkout') {
    const stores = allNodes.filter(n => ['sql','kv'].includes(n.type));
    check('Conectar cada API à operação condicional de reserva.', allHave(apis, n => serves(n, 'sql','kv')));
    check('Usar uma autoridade de estoque para o SKU disputado.', stores.length === 1);
    if (stores.length > 1) {
      for (const n of stores) issue(n.id, 'Autoridades de estoque concorrentes', 'O desenho atribui o mesmo SKU a mais de um saldo independente.', 'Concentre a reserva deste SKU em um único SQL ou KV.', 'Dois saldos independentes podem aceitar a última unidade. Cada peça desta paleta representa uma autoridade lógica, que pode ter réplicas internas.');
    }
  }
  if (caseId === 'tarefas') {
    check('Entregar a solicitação de cada API a uma fila durável.', allHave(apis, n => serves(n, 'queue')));
    check('Ligar cada fila a um consumidor do relatório.', allHave(ofType('queue'), n => serves(n, 'worker')));
    check('Persistir o resultado de cada worker pelo ID da tarefa.', allHave(ofType('worker'), n => serves(n, 'sql','kv')));
  }
  if (caseId === 'rag') {
    const coordinators = ofType('retriever');
    const complete = n => serves(n, 'vector') && serves(n, 'llm');
    for(const api of apis){
      const parts=outputs(api).filter(n=>n.type==='retriever');
      const splits=parts.some(n=>(serves(api,'vector')&&serves(n,'llm'))||(serves(api,'llm')&&serves(n,'vector')));
      if(splits&&!complete(api)&&!parts.some(complete)){
        issue(api.id,'Busca e geração separadas','A busca e a chamada ao modelo estão em coordenadores diferentes, sem um caminho que reúna as evidências para esta pergunta.',
          'Ligue o índice e o modelo à mesma API ou mova as duas chamadas para o orquestrador RAG.',
          'O coordenador precisa receber os trechos autorizados e enviá-los ao modelo para fundamentar a resposta.');
      }
    }
    check('Recuperar passagens de um índice com filtro da empresa.', ofType('vector').some(n => reached.has(n.id)));
    check('Conectar o modelo ao fluxo de resposta.', ofType('llm').some(n => reached.has(n.id)));
    check('Concentrar busca e geração no mesmo coordenador para cada pergunta.', allHave(apis, n => {
      const direct = serves(n, 'vector','llm');
      return direct ? complete(n) : serves(n, 'retriever');
    }) && coordinators.every(complete));
  }
  check('Conectar todas as peças ao caminho válido iniciado pelo cliente.', clients.length > 0 && reached.size === allNodes.length);
  return {checks, issues, passed: issues.length === 0 && checks.every(item => item.pass)};
}
