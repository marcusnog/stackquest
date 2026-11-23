const aiModules = [
  {
    title: "Arquitetura de aplicações com LLMs",
    description: "Dimensione inferência, controle filas e escolha modelos dentro de um orçamento.",
    icon: "scale", color: "amber",
    lessons: [
      {
        title: "Capacidade de inferência", minutes: 22,
        paragraphs: [
          "O assistente de uma central de suporte recebe o histórico de um chamado e redige uma resposta. O servidor primeiro processa os tokens de entrada, na etapa chamada prefill. Em seguida, gera tokens de saída em sequência. Dois pedidos com a mesma saída podem ter custos de processamento diferentes se um deles trouxer uma conversa muito longa.",
          "Dimensione o serviço a partir da distribuição observada de tamanhos de entrada e saída. A geração mantém em memória estados de atenção, conhecidos como cache KV, para as sequências ativas. Agrupar pedidos pode aumentar a vazão, mas o tamanho do lote e a memória disponível também afetam a fila. Meça a vazão agregada com a mistura de pedidos e a meta de latência do produto."
        ],
        scenario: "O piloto recebe 12 pedidos por segundo, cada um com média de 150 tokens de saída. Em teste com o mesmo perfil de entradas, uma réplica gerou 600 tokens de saída por segundo no limite de latência aceito. Para esta estimativa, suponha divisão uniforme do trabalho e capacidade aditiva.",
        question: "Quantas réplicas são necessárias para manter a utilização média de geração em até 75%?",
        options: ["Três, porque somam a vazão bruta exigida.", "Quatro, porque cada réplica contribui com 450 tokens por segundo à utilização alvo.", "Seis, porque prefill e geração exigem sempre o mesmo tempo."],
        correct: 1, explanation: "A demanda é de 12 × 150 = 1.800 tokens por segundo. A capacidade alvo por réplica é de 600 × 0,75 = 450. Quatro atendem à estimativa. O teste seguinte deve reproduzir os picos e a distribuição de comprimentos.",
        exercise: "Refaça o cálculo para uma saída média de 210 tokens. Desenhe um teste de carga para verificar se a memória do cache KV ou a latência começa a limitar o serviço antes da vazão estimada.",
        reference: {title: "Autores do vLLM · PagedAttention e memória na inferência", url: "https://arxiv.org/abs/2309.06180"}
      },
      {
        title: "Filas, streaming e latência", minutes: 20,
        paragraphs: [
          "Quem conversa com o assistente percebe pelo menos dois atrasos. O tempo até o primeiro token inclui trânsito, espera em fila e processamento inicial. Depois, o intervalo entre tokens determina o ritmo da leitura. O streaming torna o começo visível mais cedo, mas a espera anterior ao primeiro token continua existindo.",
          "Carimbe os instantes de chegada, admissão, primeiro token e conclusão de cada pedido. Separe chats interativos de relatórios em lote se eles disputarem o mesmo recurso e tiverem prazos diferentes. Defina também o que acontece quando a fila está cheia e como cancelar trabalho após o abandono do cliente."
        ],
        scenario: "Nos pedidos lentos analisados individualmente, o tempo até o primeiro token subiu de 700 ms para 2,4 s. Esses mesmos pedidos ficaram 1,9 s esperando admissão. Depois do primeiro token, a cadência continua normal. Um lote de resumos passou a usar o mesmo pool.",
        question: "Qual experimento testa mais diretamente a hipótese de contenção?",
        options: ["Aumentar a frequência de atualização da interface e comparar a animação.", "Elevar o limite de saída e comparar o tamanho dos textos.", "Limitar a concorrência do lote e observar fila e primeiro token do chat sob a mesma carga."],
        correct: 2, explanation: "A espera medida antecede a admissão. Controlar a concorrência do lote e repetir a mesma carga testa sua contribuição causal. Compare também a vazão dos resumos para quantificar o custo da mudança.",
        exercise: "Proponha metas separadas para o primeiro token e a conclusão. Descreva o comportamento de admissão, cancelamento e retomada quando chega mais trabalho do que o pool consegue processar.",
        reference: {title: "vLLM · Métricas de produção da inferência", url: "https://docs.vllm.ai/en/latest/usage/metrics/"}
      },
      {
        title: "Roteamento, cache e custo", minutes: 22,
        paragraphs: [
          "Um roteador pode encaminhar perguntas rotineiras a um modelo econômico e reservar outro modelo para situações que exigem maior qualidade. Avalie essa classificação com exemplos do produto e contabilize tanto encaminhamentos desnecessários quanto casos difíceis que receberam uma resposta inadequada.",
          "Um cache de respostas elimina a geração em um acerto válido. A chave precisa representar tudo que altera o significado da resposta, como locatário, permissões, idioma, versão das fontes e configuração do modelo. A reutilização semântica acrescenta o risco de tratar perguntas parecidas como equivalentes. Meça a qualidade dos acertos separadamente."
        ],
        scenario: "Para mil pedidos, há 200 acertos válidos de cache. Dos 800 restantes, o roteador envia 600 ao modelo econômico e 200 ao avançado. Cada chamada custa respectivamente R$ 0,01 e R$ 0,05. Desconsidere outros custos neste exercício.",
        question: "Qual custo de inferência entra no relatório desse lote?",
        options: ["R$ 16,00, somando apenas as chamadas efetivamente feitas aos dois modelos.", "R$ 18,00, cobrando os acertos de cache ao preço do modelo econômico.", "R$ 40,00, aplicando o preço do modelo avançado a todos os pedidos sem cache."],
        correct: 0, explanation: "As chamadas custam 600 × R$ 0,01 + 200 × R$ 0,05 = R$ 16,00. Para escolher o roteador, falta medir quantas respostas de cada caminho satisfazem a necessidade do usuário.",
        exercise: "Defina uma chave de cache para perguntas sobre uma política interna e um evento que a invalide. Calcule o custo adicional se 50 chamadas forem transferidas do modelo econômico para o avançado e especifique o ganho que justificaria isso.",
        reference: {title: "Autores de RouteLLM · Roteamento com dados de preferência", url: "https://arxiv.org/abs/2406.18665"}
      }
    ]
  },
  {
    title: "RAG e recuperação de conhecimento",
    description: "Construa uma busca que recupera evidências atuais, autorizadas e citáveis.",
    icon: "database", color: "teal",
    lessons: [
      {
        title: "Ingestão, trechos e versões", minutes: 23,
        paragraphs: [
          "Em geração aumentada por recuperação, ou RAG, o sistema seleciona trechos de fontes externas e os inclui no contexto da resposta. Um manual de reembolso tem tabelas, condições e exceções. Cortá-lo por tamanho fixo pode separar um limite financeiro da exceção que o modifica. Preserve títulos e estrutura e compare estratégias de divisão usando perguntas reais.",
          "Registre em cada trecho a origem, a revisão do documento, a seção e a versão do processamento. Gere e valide o índice novo antes de trocar a versão ativa. Atualizações e exclusões precisam retirar os trechos antigos das consultas e invalidar respostas derivadas. Isso permite explicar a resposta de ontem e buscar somente o regulamento vigente hoje."
        ],
        scenario: "A revisão B substitui um valor da revisão A. Durante a reindexação, metade das buscas já encontra B e as demais ainda retornam trechos conflitantes de A.",
        question: "Que publicação dá uma visão consistente aos novos pedidos?",
        options: ["Indexar B em separado, verificar cobertura e trocar atomicamente a referência da versão consultada.", "Aumentar a sobreposição de todos os trechos para incluir as duas versões no mesmo contexto.", "Escolher a revisão cujo texto recebeu maior similaridade vetorial na consulta."],
        correct: 0, explanation: "A troca de uma referência após a validação mantém cada consulta vinculada a um conjunto coerente. A sobreposição resolve problemas de fronteira textual. A similaridade sozinha não expressa vigência.",
        exercise: "Descreva um esquema de metadados para uma tabela com notas de rodapé. Proponha perguntas que falhariam se uma condição e sua exceção fossem separadas e indique como testá-las antes da troca do índice.",
        reference: {title: "Microsoft Learn · Divisão de documentos para busca vetorial", url: "https://learn.microsoft.com/en-us/azure/search/vector-search-how-to-chunk-documents"}
      },
      {
        title: "Busca híbrida e reranking", minutes: 22,
        paragraphs: [
          "Uma busca lexical favorece correspondências precisas, úteis para códigos como NF-402. Uma busca vetorial pode recuperar passagens semanticamente próximas quando as palavras mudam. A recuperação híbrida combina listas candidatas, por exemplo pela posição em cada lista. Pontuações brutas de mecanismos diferentes podem ter escalas incompatíveis.",
          "Um reranker reavalia um conjunto limitado de pares de pergunta e trecho. Ele pode promover um bom candidato inicialmente mal colocado. Seu custo cresce com o número e o tamanho dos pares. Avalie primeiro se a evidência entrou no conjunto candidato e depois se sua posição final permite que caiba no contexto."
        ],
        scenario: "Em 100 perguntas com uma passagem correta conhecida por pergunta, a lista inicial de 30 candidatos contém essa passagem em 92 casos. Entre os três primeiros resultados ela aparece em 55. O gerador só recebe os três primeiros.",
        question: "Qual diagnóstico e experimento são sustentados por esses números?",
        options: ["O gerador esqueceu as fontes em 45 casos. Troque o modelo primeiro.", "Teste reordenar os 30 candidatos e medir acertos no top 3. Os oito casos ausentes exigem melhorar a recuperação inicial.", "Envie apenas o candidato mais parecido e considere resolvidos os casos de baixa posição."],
        correct: 1, explanation: "A etapa inicial perdeu oito passagens. Em outros 37 casos a passagem foi recuperada, mas ficou fora do contexto. Um reranker dos mesmos 30 candidatos pode melhorar esse segundo grupo.",
        exercise: "Defina uma avaliação separada para consultas por código e por paráfrase. Compare lexical, vetorial e híbrida com a mesma profundidade e reserve um orçamento de latência para o reranker.",
        reference: {title: "Elastic · Reranking semântico de candidatos", url: "https://www.elastic.co/docs/solutions/search/ranking/semantic-reranking"}
      },
      {
        title: "Citação, abstenção e isolamento", minutes: 24,
        paragraphs: [
          "Uma plataforma atende várias empresas, chamadas aqui de locatários. Derive o escopo da sessão autenticada e aplique permissões de documento na recuperação. Apenas trechos autorizados entram no contexto, no histórico reutilizado e no cache daquela solicitação. Modele também o que ocorre quando o acesso de uma pessoa é revogado.",
          "Associe afirmações verificáveis a identificadores das passagens usadas. Uma citação útil permite abrir a revisão e o trecho que realmente apoiam o enunciado. Se a evidência autorizada for incompleta, a resposta pode declarar qual informação falta ou pedir esclarecimento. Avalie explicitamente perguntas que devem resultar em abstenção."
        ],
        scenario: "Uma pessoa da empresa A pergunta o limite de reembolso. A só documenta o prazo de envio. Em B existe um trecho semanticamente perfeito com um limite financeiro. O usuário não tem acesso a B.",
        question: "Qual comportamento atende aos requisitos de evidência e de acesso?",
        options: ["Recuperar de A e B e pedir ao gerador para ocultar o nome de B.", "Usar o limite de B como sugestão e citar apenas o prazo de A.", "Recuperar somente no escopo autorizado e explicar que a fonte de A não informa o limite."],
        correct: 2, explanation: "O filtro anterior à geração mantém a política de B fora do contexto da pessoa. A abstenção preserva a distinção entre o prazo documentado e o limite desconhecido.",
        exercise: "Escreva três casos de aceitação: resposta com citação exata, pergunta sem evidência e permissão revogada após um acerto de cache. Indique o resultado esperado em cada etapa.",
        reference: {title: "Elastic · Controle de acesso a documentos e campos", url: "https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/controlling-access-at-document-field-level"}
      }
    ]
  },
  {
    title: "Fine-tuning e adaptação de modelos",
    description: "Escolha o tipo de adaptação, construa um conjunto de treino e valide o artefato.",
    icon: "layers", color: "violet",
    lessons: [
      {
        title: "Prompt, RAG ou ajuste supervisionado?", minutes: 20,
        paragraphs: [
          "Uma equipe quer classificar chamados e citar a política de atendimento vigente. Instruções e exemplos no prompt são um primeiro experimento barato para formato e comportamento. RAG fornece informação que muda com frequência. Já o ajuste fino supervisionado, ou SFT, usa pares de entrada e saída desejada para modificar o comportamento aprendido pelo modelo.",
          "Separe as falhas por causa antes de treinar. Se a resposta erra porque a política publicada ontem está ausente, mude a fonte de contexto. Se o texto correto está presente e o modelo insiste em trocar categorias, revise a taxonomia, os exemplos e o decodificador. Compare qualquer treino com um baseline de prompt no mesmo conjunto reservado."
        ],
        scenario: "A política muda semanalmente. A classificação em oito categorias é estável e ainda erra distinções importantes mesmo com bons exemplos no prompt. A equipe dispõe de chamados revisados por especialistas.",
        question: "Qual desenho permite testar as duas necessidades separadamente?",
        options: ["Reprocessar todas as políticas num treino semanal e remover a consulta às fontes.", "Recuperar a política vigente e experimentar SFT com chamados rotulados para a classificação, comparando ao baseline.", "Ampliar o contexto com textos aleatórios e medir apenas quantos tokens foram usados."],
        correct: 1, explanation: "Recuperação facilita atualizar e citar políticas. Os exemplos rotulados tornam testável a hipótese de que adaptar o comportamento melhora a classificação. São decisões avaliáveis com métricas distintas.",
        exercise: "Classifique quatro erros de um assistente em falta de conhecimento, instrução ambígua ou comportamento recorrente. Para cada hipótese, proponha a intervenção mais simples e uma evidência de que ela funcionou.",
        reference: {title: "Hugging Face TRL · Treinamento supervisionado", url: "https://huggingface.co/docs/trl/sft_trainer"}
      },
      {
        title: "Dados de treino sem vazamento", minutes: 23,
        paragraphs: [
          "Uma conversa de suporte pode originar várias amostras. Se mensagens irmãs ou respostas quase idênticas aparecem em treino e teste, o resultado mede em parte a familiaridade com aquele caso. Escolha a unidade de separação que corresponda à generalização esperada, como conversa, cliente ou família de documento.",
          "Reserve treino para atualizar pesos, validação para escolher configuração e um teste final independente. Quando o uso futuro envolve chamados recentes, considere também um corte temporal. Registre origem, consentimento de uso aplicável, remoção de dados identificáveis e critérios de anotação. Confira cobertura das categorias raras após o agrupamento."
        ],
        scenario: "Cada chamado produz quatro exemplos quase iguais. Um sorteio independente por mensagem deu excelente acurácia no teste, mas os erros voltam em conversas novas da mesma população de clientes.",
        question: "Qual avaliação investiga a explicação mais direta?",
        options: ["Refazer a divisão por chamado, deduplicar repetições entre conjuntos e medir em conversas ainda não vistas.", "Duplicar os exemplos de teste dentro do treino para equalizar as distribuições.", "Escolher a época com maior pontuação no teste final e publicar essa mesma pontuação."],
        correct: 0, explanation: "Agrupar por chamado impede que mensagens irmãs atravessem as divisões. Deduplicar também reduz o efeito de cópias entre conversas distintas. A nova medida aproxima o uso pretendido.",
        exercise: "Planeje uma divisão para clientes já conhecidos e outra para estimar desempenho em clientes inéditos. Diga quais IDs devem permanecer juntos e como trataria classes ausentes do conjunto de teste.",
        reference: {title: "Google · Divisão e independência dos conjuntos de dados", url: "https://developers.google.com/machine-learning/crash-course/overfitting/dividing-datasets"}
      },
      {
        title: "LoRA, validação e deploy", minutes: 25,
        paragraphs: [
          "LoRA congela os pesos da base e aprende uma atualização de baixa dimensão nas camadas escolhidas. Para uma matriz com m linhas e n colunas, uma atualização de posto r pode ser representada por fatores com m × r e r × n parâmetros. Isso reduz os parâmetros treináveis nessas camadas. O modelo base continua necessário para a inferência.",
          "Trate o adaptador como um artefato ligado à revisão exata do modelo base, ao tokenizer e à configuração do prompt. Compare base e adaptador no mesmo teste, verificando a tarefa-alvo, regressões em outras tarefas e uso de recursos no modo de servir escolhido. Publique o conjunto versionado e mantenha um caminho de reversão para a combinação anterior."
        ],
        scenario: "Você quer adaptar uma única matriz quadrada de 4.096 × 4.096 com posto 8. Considere apenas os dois fatores LoRA, sem vieses ou outros parâmetros treináveis.",
        question: "Quantos parâmetros treináveis os fatores acrescentam nessa matriz?",
        options: ["32.768, contando apenas um fator.", "16.777.216, o tamanho da matriz base.", "65.536, somando os dois fatores retangulares."],
        correct: 2, explanation: "Os fatores têm 4.096 × 8 e 8 × 4.096 parâmetros. A soma é 65.536. A conta descreve esta matriz e não determina a memória total do treinamento ou a latência de produção.",
        exercise: "Descreva o manifesto de uma versão com adaptador, um teste de compatibilidade e um critério para reverter o deploy se o ganho na tarefa-alvo vier acompanhado de regressão fora dela.",
        reference: {title: "Autores de LoRA · Low-Rank Adaptation of Large Language Models", url: "https://arxiv.org/abs/2106.09685"}
      }
    ]
  },
  {
    title: "Avaliação e operação de IA",
    description: "Localize a etapa que falhou e libere mudanças com critérios de qualidade e custo.",
    icon: "pulse", color: "rose",
    lessons: [
      {
        title: "Recall@k e sustentação das respostas", minutes: 21,
        paragraphs: [
          "Para uma consulta com passagens relevantes rotuladas, recall@k é a quantidade de passagens relevantes distintas encontradas nas primeiras k posições dividida pelo total de passagens relevantes conhecidas. A métrica exige uma referência de relevância e uma convenção de agregação entre consultas. Ter cobertura alta ajuda, mas o gerador pode ignorar a evidência recuperada.",
          "Avalie separadamente a sustentação das afirmações, também chamada groundedness. Em uma rubrica simples, divida a resposta em afirmações verificáveis e marque quais são sustentadas pelo contexto autorizado. Uma resposta fiel ainda pode ser incompleta ou reproduzir informação desatualizada. Acrescente critérios de utilidade e vigência conforme o produto."
        ],
        scenario: "Uma pergunta tem quatro passagens relevantes rotuladas. O top 5 contém três delas. A resposta faz cinco afirmações verificáveis, e somente duas são sustentadas pelas passagens que chegaram ao gerador.",
        question: "Quais medidas descrevem essa execução?",
        options: ["Recall@5 de 60% e sustentação de 75%.", "Recall@5 de 75% e sustentação de 40%.", "Recall@5 de 40% e sustentação de 60%."],
        correct: 1, explanation: "Recall usa as quatro passagens relevantes como denominador e vale 3/4. A sustentação por afirmação vale 2/5. A precisão da recuperação no top 5 seria uma medida diferente, de 3/5.",
        exercise: "Defina outra medida para respostas incompletas e uma regra específica para respostas de abstenção. Explique como distinguir uma falha de recuperação de uma afirmação criada sem evidência.",
        reference: {title: "Autores de RAGAS · Avaliação de recuperação e geração", url: "https://arxiv.org/abs/2309.15217"}
      },
      {
        title: "Rubrica e avaliação por segmento", minutes: 24,
        paragraphs: [
          "Um teste offline reproduz situações do produto sob condições registradas. Fixe versões de prompt, modelo e fontes. Avalie as duas configurações nas mesmas perguntas. Defina antecipadamente critérios observáveis, como resolver a solicitação, respeitar o formato e apoiar cada informação factual em fonte válida.",
          "Separe resultados por idioma, tipo de tarefa e frequência. Um lote com mais exemplos raros é útil para descobrir falhas, mas a média desse lote reflete sua composição. Apresente resultados por grupo e, se quiser estimar o agregado da produção, aplique os pesos de tráfego. Revise desacordos entre avaliadores e relate a incerteza de grupos pequenos."
        ],
        scenario: "A nova versão resolve 90% das perguntas rotineiras e 60% das perguntas especializadas. O teste contém metade de cada tipo. Na produção observada, a mistura é de 80% rotineiras e 20% especializadas. Assuma taxas estáveis dentro de cada segmento.",
        question: "Qual estimativa representa a mistura de produção e qual detalhe deve acompanhá-la?",
        options: ["75%, acompanhada apenas da quantidade total de perguntas no teste.", "90%, pois a maioria do tráfego é rotineira.", "84%, acompanhada da taxa de 60% do segmento especializado e da incerteza da amostra."],
        correct: 2, explanation: "A estimativa ponderada é 0,8 × 0,9 + 0,2 × 0,6 = 0,84. A média simples de 75% descreve o lote balanceado. Informar o segmento especializado mantém visível sua taxa mais baixa.",
        exercise: "Defina uma rubrica de três critérios, com exemplos de aprovação e reprovação. Escolha os segmentos e descreva como uma segunda pessoa julgaria uma amostra de desacordos sem saber qual versão gerou cada resposta.",
        reference: {title: "Autores de HELM · Avaliação multidimensional de modelos de linguagem", url: "https://arxiv.org/abs/2211.09110"}
      },
      {
        title: "Canário, incidentes e custo útil", minutes: 25,
        paragraphs: [
          "Libere uma versão para uma fração do tráfego e mantenha um controle comparável. Atribua grupos de maneira consistente, acompanhe diferenças de perfil e defina antes do experimento quando avançar, pausar ou reverter. Inclua latência, falhas de dependências, uso indevido de fontes e regressões em segmentos importantes.",
          "Para medir custo por resposta útil, escolha antecipadamente o critério de utilidade e divida o custo total do período pela quantidade de respostas que o atingiram. Inclua tentativas repetidas e chamadas de recuperação na fronteira de custo escolhida. Em um incidente, associe as ocorrências às versões de roteador, prompt, índice e modelo para conseguir isolar a mudança."
        ],
        scenario: "Em amostras comparáveis de mil solicitações por versão, o controle custa R$ 60 e entrega 800 respostas úteis. O canário custa R$ 54 e entrega 600. O contrato de liberação pede ao menos 75% de respostas úteis e custo por resposta útil igual ou menor que o do controle.",
        question: "Que decisão satisfaz o contrato do canário?",
        options: ["Interromper a expansão. O canário alcança 60% de utilidade e custa R$ 0,09 por resposta útil, acima dos R$ 0,075 do controle.", "Expandir porque o custo total do lote caiu de R$ 60 para R$ 54.", "Expandir porque o custo por solicitação do canário é inferior ao custo por resposta útil do controle."],
        correct: 0, explanation: "Os denominadores comparáveis são as respostas úteis de cada versão. O canário falhou tanto na meta de utilidade quanto no limite de custo útil. O gasto por solicitação esconde essa regressão.",
        exercise: "Escreva um plano de canário com uma condição para avançar, uma para reverter e uma para aguardar mais amostras. Descreva que versões e medidas consultaria se as falhas aparecessem somente em perguntas sobre documentos recentes.",
        reference: {title: "Google SRE Workbook · Liberações canário", url: "https://sre.google/workbook/canarying-releases/"}
      }
    ]
  }
];
