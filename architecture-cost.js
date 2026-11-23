// Regional on-demand Linux prices checked on 2026-11-22. Keep SKU sources alongside rates.
const archClouds = {
  aws: {
    name: 'AWS', region: 'Norte da Virgínia (us-east-1)',
    source: 'https://aws.amazon.com/ec2/instance-types/t3/',
    vm: 'EC2 t3.medium', hourly: 0.0418,
    gateway: 'Amazon API Gateway REST regional', gatewaySource: 'https://docs.aws.amazon.com/whitepapers/latest/best-practices-api-gateway-private-apis-integration/cost-optimization.html',
    llm: 'Amazon Bedrock', llmSource: 'https://aws.amazon.com/bedrock/pricing/'
  },
  azure: {
    name: 'Microsoft Azure', region: 'Virgínia (East US)',
    source: 'https://prices.azure.com/api/retail/prices?$filter=armRegionName%20eq%20%27eastus%27%20and%20skuId%20eq%20%27DZH318Z0BQ35%2F00J7%27%20and%20priceType%20eq%20%27Consumption%27',
    vm: 'Azure Virtual Machines Standard_B2s', hourly: 0.0416,
    gateway: 'Azure API Management Consumption', gatewaySource: 'https://azure.microsoft.com/en-us/pricing/details/api-management/',
    llm: 'Azure OpenAI', llmSource: 'https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/'
  },
  gcp: {
    name: 'Google Cloud', region: 'Iowa (us-central1)',
    source: 'https://cloud.google.com/products/compute/pricing/general-purpose#e2-shared-core-machine-types',
    vm: 'Compute Engine e2-medium', hourly: 0.03350571,
    gateway: 'Google Cloud API Gateway', gatewaySource: 'https://cloud.google.com/api-gateway/pricing',
    llm: 'Google Cloud Model Garden', llmSource: 'https://cloud.google.com/model-garden/pricing'
  }
};

const archCost = (() => {
  const components = {
    client: 'Cliente', api: 'API', gateway: 'Gateway', sql: 'PostgreSQL', kv: 'Valkey persistente',
    cache: 'Cache Valkey em memória', queue: 'RabbitMQ', worker: 'Worker',
    llm: 'LLM', retriever: 'Recuperador', vector: 'PostgreSQL com pgvector'
  };
  const persistent = new Set(['sql', 'kv', 'queue', 'vector']);
  const format = new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 8});
  const f = value => format.format(value);
  const million = 1e6;
  // Thresholds are cumulative, in millions of calls. AWS mirrors the worked REST example.
  const gatewayBands = {
    aws: [[333, 3.5], [1000, 2.8], [20000, 2.38], [Infinity, 1.51]],
    azure: [[1, 0], [Infinity, 3]], // Paid rate is a teaching assumption.
    gcp: [[2, 0], [1000, 3], [Infinity, 1.5]]
  };

  function gatewayCharge(provider, requests) {
    const volume = requests / million;
    let start = 0, amount = 0;
    const terms = [];
    for (const [end, rate] of gatewayBands[provider]) {
      const quantity = Math.min(volume, end) - start;
      if (quantity <= 0) break;
      amount += quantity * rate;
      terms.push(f(quantity) + ' milhão(ões) × US$ ' + f(rate));
      start = end;
    }
    return {amount, formula: terms.join(' + ') || '0 chamadas × US$ 0'};
  }
  const unit = n => Number.isFinite(Number(n)) && Number(n) > 0 ? Number(n) : 0;

  return function estimate(provider, nodes = [], usage = {}) {
    if (!Object.hasOwn(archClouds, provider)) throw new RangeError('Provedor desconhecido.');
    const cloud = archClouds[provider], counts = new Map(), lines = [];
    const notes = [
      'Referência em 22/11/2026. Valores mensais em USD para ' + cloud.region + '.',
      'Uma VM Linux sob demanda por bloco de API, worker, recuperação, banco, cache ou fila. Cada perfil tem 2 vCPUs e 4 GiB de RAM. A capacidade sustentada e as regras de burst variam entre provedores.',
      'Disco de dados, saída para a internet e tokens usam premissas didáticas comuns aos três provedores. O custo real depende do disco, destino, modelo de IA e contrato.',
      'Ficam fora do total discos de sistema, IOPS extras, backups, monitoramento, balanceadores externos, IPs, NAT, tráfego entre zonas, créditos de CPU, impostos e suporte. O cálculo só aplica as franquias de gateway indicadas.'
    ];
    let unknown = 0;
    for (const node of nodes) {
      if (!Object.hasOwn(components, node?.type)) { unknown++; continue; }
      counts.set(node.type, (counts.get(node.type) || 0) + 1);
    }
    if (unknown) notes.push(f(unknown) + ' bloco(s) sem modelo de preço foram omitidos.');
    const hours = unit(usage.hours), storage = unit(usage.storage), egress = unit(usage.egress);
    const requests = unit(usage.requests), input = unit(usage.inputTokens), output = unit(usage.outputTokens);
    const stores = [...counts].reduce((sum, [type, count]) => sum + (persistent.has(type) ? count : 0), 0);
    // These common assumptions can also be changed by callers without changing a public SKU price.
    const defaults = {storage: 0.10, egress: 0.09, inputTokens: 1, outputTokens: 4};
    const rates = Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
      const value = usage.rates?.[key];
      return [key, typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback];
    }));
    const add = (label, detail, amount, source) => lines.push({label, detail, amount, ...(source ? {source} : {})});
    for (const [type, count] of counts) {
      const label = components[type] + ' × ' + count;
      if (type === 'client') {
        add(label, 'Executado no dispositivo do usuário. Custo de nuvem do bloco = US$ 0.', 0);
      } else if (type === 'gateway') {
        const bill = gatewayCharge(provider, requests);
        let rule = 'Faixas mensais do exemplo público de REST regional. Uma operação simples por chamada, conta sem benefício promocional de Free Tier.';
        if (provider === 'azure') rule = 'Uma operação por chamada. Até 1 milhão incluído por assinatura. Acima disso, premissa didática de US$ 3/milhão.';
        if (provider === 'gcp') rule = 'Faixas públicas por conta de faturamento. Assume a franquia mensal de 2 milhões inteiramente disponível.';
        add(label + ' · ' + cloud.gateway, f(requests) + ' chamadas totais distribuídas entre os gateways. ' + rule + ' ' + bill.formula + '.', bill.amount, cloud.gatewaySource);
      } else if (type === 'llm') {
        add(label + ' · ' + cloud.llm,
          'Tokens somados entre os blocos. Premissa didática de inferência por texto, sem modelo contratado. (' +
          f(input) + ' ÷ 1 milhão × US$ ' + f(rates.inputTokens) + ') entrada + (' + f(output) +
          ' ÷ 1 milhão × US$ ' + f(rates.outputTokens) + ') saída.',
          input / million * rates.inputTokens + output / million * rates.outputTokens, cloud.llmSource);
      } else {
        add(label + ' · ' + cloud.vm, count + ' VM(s) × ' + f(hours) + ' h × US$ ' + f(cloud.hourly) + '/h. Operação autogerida.',
          count * hours * cloud.hourly, cloud.source);
        if (persistent.has(type) && storage > 0) {
          add('Disco de dados · ' + label, 'Premissa didática. ' + f(storage) + ' GB-mês físicos × ' +
            count + '/' + stores + ' dos blocos persistentes × US$ ' + f(rates.storage) + '/GB-mês.',
            storage * (count / stores) * rates.storage);
        }
      }
    }
    if (stores && storage) notes.push('O armazenamento informado é o total físico, incluindo cópias desejadas. A divisão uniforme entre bancos persistentes e filas mantém esse total ao acrescentar um bloco.');
    if (!stores && storage) notes.push('Armazenamento sem bloco persistente no desenho. Adicione SQL, chave-valor, fila ou banco vetorial para alocá-lo.');
    if (!counts.has('gateway') && requests) notes.push('As chamadas informadas não geram uma linha de gateway neste desenho. APIs autogeridas usam capacidade já cobrada por hora.');
    if (!counts.has('llm') && (input || output)) notes.push('Os tokens informados exigem um bloco LLM para entrar na estimativa.');
    const hasCloud = [...counts.keys()].some(type => type !== 'client');
    if (hasCloud && egress) {
      add('Saída para a internet', 'Premissa didática de transferência. ' + f(egress) + ' GB mensais de todo o desenho × US$ ' +
        f(rates.egress) + '/GB. Destino e franquias de tráfego não foram informados.', egress * rates.egress);
    }
    return {lines, total: lines.reduce((sum, line) => sum + line.amount, 0), notes};
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = {archClouds, archCost};
else Object.assign(globalThis, {archClouds, archCost});
