const dbCases = [
  {
    id: "checkout", title: "A última unidade",
    brief: "Uma loja tem uma unidade disponível de um SKU. O checkout precisa confirmar a reserva antes de avisar ao comprador. A cobrança fica fora deste exercício.",
    query: "Reservar a unidade disponível e informar se a reserva foi aceita.",
    base: "Os compradores fazem seus pedidos em sequência.",
    stress: "Oito compradores tentam reservar a mesma unidade ao mesmo tempo.",
    limit: "Aceitar no máximo uma reserva da última unidade, inclusive sob concorrência.",
    plans: [
      {id: "tx", name: "PostgreSQL · atualização condicional", design: "Em uma transação, diminua o estoque com UPDATE filtrando pelo SKU e por saldo positivo. Confirme a reserva somente se uma linha foi alterada e a transação terminou com sucesso.", tradeoff: "Pedidos disputam a mesma linha. O comprador que perde a disputa recebe uma recusa e a aplicação precisa tratar eventuais abortos de transação."},
      {id: "cas", name: "DynamoDB · escrita condicional", design: "Use o SKU como chave do item. Em um UpdateItem, condicione o decremento à existência de saldo positivo. O resultado da operação determina quem conseguiu reservar.", tradeoff: "A condição protege o item disputado. Um SKU muito popular concentra pedidos na mesma chave, inclusive tentativas recusadas."},
      {id: "async", name: "Leitura e gravação separadas", design: "Leia o saldo, decida na aplicação e depois grave o saldo calculado sem condição. Cada pedido que viu saldo positivo confirma sua própria reserva.", tradeoff: "Compradores simultâneos podem ler a mesma unidade disponível. O saldo final pode parecer correto enquanto mais de uma pessoa recebeu confirmação."}
    ],
    sources: [
      {title: "PostgreSQL · Isolamento e atualizações concorrentes", url: "https://www.postgresql.org/docs/current/transaction-iso.html"},
      {title: "DynamoDB · Expressões condicionais", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html"}
    ]
  },
  {
    id: "sessoes", title: "Uma sessão revogada",
    brief: "O cliente pode acessar a conta por diferentes servidores. Depois da confirmação do logout, uma nova tentativa com o mesmo identificador de sessão precisa ser recusada.",
    query: "Dado o identificador da sessão, decidir se ela está válida agora.",
    base: "Consulte uma sessão ativa e verifique a validade até seu vencimento.",
    stress: "Revogue a sessão e tente usá-la imediatamente por outro servidor.",
    limit: "Recusar sessões vencidas e toda nova consulta iniciada após a confirmação da revogação.",
    plans: [
      {id: "ttl", name: "Redis · chave com expiração", design: "Represente a sessão por uma chave com TTL. Leia da instância primária a cada validação e só confirme o logout após a remoção síncrona da chave.", tradeoff: "A validação depende do acesso ao armazenamento compartilhado. Em produção, persistência e comportamento durante a troca de primário precisam de uma política própria."},
      {id: "index", name: "PostgreSQL · sessão indexada", design: "Indexe o identificador da sessão e consulte a linha no primário. Aceite apenas uma sessão com validade futura e sem revogação. Confirme o logout depois de gravar a revogação.", tradeoff: "A decisão usa dados atualizados em cada pedido e acrescenta leituras ao banco. Sessões antigas exigem uma rotina de limpeza."},
      {id: "cache", name: "Cache local até o vencimento", design: "Guarde em cada servidor a decisão de que a sessão está ativa. Reutilize essa decisão até a expiração local, sem propagar o logout.", tradeoff: "A leitura local poupa acessos ao banco. Outro servidor ainda pode aceitar a sessão durante a validade da cópia que guardou."}
    ],
    sources: [
      {title: "Redis · Expiração de chaves", url: "https://redis.io/docs/latest/commands/expire/"},
      {title: "Redis · Remoção de chaves", url: "https://redis.io/docs/latest/commands/del/"},
      {title: "PostgreSQL · Índices para consultas por chave", url: "https://www.postgresql.org/docs/current/indexes-intro.html"}
    ]
  },
  {
    id: "catalogo", title: "Filtros de um catálogo",
    brief: "Cada produto pertence a uma categoria e declara seus atributos. A busca deve devolver todos os produtos que combinam a categoria, a cor e o tamanho solicitados.",
    query: "Encontrar produtos de uma categoria que tenham a cor e o tamanho escolhidos.",
    base: "Consulte uma combinação de atributos no catálogo inicial.",
    stress: "Repita a busca com mais produtos que compartilham apenas parte dos atributos.",
    limit: "Examinar até 200 documentos candidatos por consulta e devolver o conjunto correto.",
    plans: [
      {id: "doc", name: "MongoDB · índice composto", design: "Armazene categoria, cor e tamanho no documento e crie um índice composto nesses campos. Use as três igualdades para restringir os documentos candidatos.", tradeoff: "O índice corresponde a esta combinação de filtros. Novos padrões de busca podem exigir outros índices, com custo adicional nas escritas."},
      {id: "gin", name: "PostgreSQL · JSONB com GIN", design: "Inclua categoria, cor e tamanho em um objeto JSONB. Use um índice GIN compatível com contenção e uma consulta que exija os três pares de chave e valor.", tradeoff: "A estrutura aceita atributos variados. O custo de manter o índice e a necessidade de conferir candidatos dependem dos dados e da consulta."},
      {id: "scan", name: "Varredura de documentos", design: "Abra cada documento e teste os três campos antes de decidir se o produto aparece no resultado.", tradeoff: "A consulta funciona sem índice adicional. A quantidade de documentos examinados cresce com o catálogo, mesmo quando a busca encontra poucos produtos."}
    ],
    sources: [
      {title: "MongoDB · Índices compostos", url: "https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/"},
      {title: "PostgreSQL · Indexação de JSONB", url: "https://www.postgresql.org/docs/current/datatype-json.html#JSON-INDEXING"}
    ]
  },
  {
    id: "relacoes", title: "Quem está a dois saltos?",
    brief: "Uma rede de perfis mantém relações direcionadas. Partindo de um perfil, encontre os destinos alcançáveis seguindo relações de saída em até dois saltos. Apresente cada destino uma vez.",
    query: "Quais perfis são alcançáveis em um ou dois saltos a partir da origem?",
    base: "Comece em uma origem com poucas relações de saída.",
    stress: "Percorra uma vizinhança mais conectada e verifique o conjunto final de destinos.",
    limit: "Examinar até 900 arestas e devolver os vizinhos corretos em até dois saltos.",
    plans: [
      {id: "adj", name: "Neo4j · adjacências", design: "Localize o nó inicial e percorra as relações de saída com profundidade limitada a dois saltos. Elimine destinos repetidos antes de retornar a lista.", tradeoff: "O percurso depende do tamanho das vizinhanças visitadas. Um perfil com muitas relações ainda gera trabalho, mesmo quando a origem é encontrada rapidamente."},
      {id: "edge", name: "PostgreSQL · arestas indexadas", design: "Guarde cada relação em uma tabela de origem e destino com índice pela origem. Consulte as saídas iniciais e busque as saídas desses vizinhos. Una os resultados eliminando repetições.", tradeoff: "O índice restringe as buscas às origens relevantes. Mais saltos e origens muito conectadas ampliam o resultado intermediário."},
      {id: "scan", name: "Varredura das arestas por origem", design: "Para cada origem a expandir, leia toda a coleção de arestas e selecione as que partem dela. Repita o procedimento para obter o segundo salto.", tradeoff: "O resultado pode estar correto, mas cada expansão revisita relações de perfis distantes. A conta cresce também com a parte do grafo que a consulta não alcança."}
    ],
    sources: [
      {title: "Neo4j · Caminhos com comprimento variável", url: "https://neo4j.com/docs/cypher-manual/current/patterns/variable-length-paths/"},
      {title: "PostgreSQL · Localização de linhas por índice", url: "https://www.postgresql.org/docs/current/indexes-intro.html"}
    ]
  },
  {
    id: "telemetria", title: "Dez minutos de um sensor",
    brief: "Sensores publicam medidas com horário de coleta. O painel precisa conferir tanto a soma quanto a contagem das amostras de um sensor específico.",
    query: "Somar e contar as amostras de um sensor em uma janela de dez minutos, incluindo o início e excluindo o fim.",
    base: "Consulte a série de um sensor na janela solicitada.",
    stress: "Repita com mais medições de outros sensores e de horários fora da janela.",
    limit: "Ler até 100 amostras e devolver soma e contagem exatas.",
    plans: [
      {id: "time", name: "TimescaleDB · índice de sensor e tempo", design: "Organize as medições em uma hypertable temporal e indexe sensor e horário, nessa ordem. Filtre o sensor por igualdade e aplique o intervalo de tempo antes da agregação.", tradeoff: "O índice favorece a consulta de uma série em uma janela. Ele ocupa espaço e acrescenta trabalho a cada nova medição."},
      {id: "bucket", name: "Cassandra · partição por sensor e dia", design: "Use sensor e dia na chave de partição e ordene as amostras pelo horário na chave de clustering. Inclua um identificador adicional se houver empates de horário. Leia os intervalos das partições tocadas e combine os totais.", tradeoff: "O desenho exige saber o sensor e os dias da consulta. Uma janela que atravessa a meia-noite pede leituras nas duas partições correspondentes."},
      {id: "full", name: "Varredura de todas as amostras", design: "Leia as medições de todos os sensores e descarte as que estão fora do sensor ou do intervalo antes de somar e contar.", tradeoff: "A lógica preserva a exatidão. O volume de dados alheios à pergunta aumenta o trabalho da consulta."}
    ],
    sources: [
      {title: "TimescaleDB · Índices para dados temporais", url: "https://www.tigerdata.com/docs/build/performance-optimization/indexing"},
      {title: "Apache Cassandra · Particionamento e colunas de clustering", url: "https://cassandra.apache.org/doc/latest/cassandra/developing/cql/ddl.html"}
    ]
  },
  {
    id: "analitica", title: "Um relatório ganha outra dimensão",
    brief: "O painel resume eventos de venda por região e dia. Produto quer acrescentar o canal de venda ao mesmo relatório. O laboratório conta cada valor de campo lido como um escalar.",
    query: "Calcular os totais por região e dia. Na carga de estresse, abrir o resultado também por canal.",
    base: "Agrupe os eventos por região e dia e confira os totais.",
    stress: "Separe os totais de cada região e dia pelo canal de venda original.",
    limit: "Ler até 20 mil valores escalares e devolver o total exato em cada grupo solicitado.",
    plans: [
      {id: "column", name: "ClickHouse · projeção colunar", design: "Mantenha os eventos e uma projeção com região, dia, canal e medida. Leia as colunas exigidas pela consulta e agrupe os valores nas dimensões solicitadas.", tradeoff: "Preservar o detalhe permite acrescentar agrupamentos. A projeção consome espaço e ainda precisa ler os valores relevantes dos eventos."},
      {id: "rollup", name: "PostgreSQL · totais pré-agregados", design: "Mantenha uma linha de total por região e dia, atualizada na entrada com uma operação atômica. Descarte os eventos depois da agregação e retenha somente essas duas dimensões.", tradeoff: "O relatório original consulta poucos valores. O agregado mistura os canais e perde a informação necessária para separá-los depois."},
      {id: "row", name: "OLTP · varredura de linhas largas", design: "Leia todas as linhas de eventos e, neste plano didático, carregue todos os campos de cada linha antes de agrupar os valores.", tradeoff: "Reter eventos possibilita agrupar por canal. Carregar campos sem uso aumenta o total de escalares lidos que o laboratório contabiliza."}
    ],
    sources: [
      {title: "ClickHouse · Projeções", url: "https://clickhouse.com/docs/concepts/features/projections/projections"},
      {title: "PostgreSQL · INSERT com atualização em conflito", url: "https://www.postgresql.org/docs/current/sql-insert.html"}
    ]
  }
];
