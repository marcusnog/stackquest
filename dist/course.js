const course = [
  {
    title: "Fundamentos de arquitetura",
    description: "Transforme uma ideia em requisitos, estimativas e um primeiro desenho.",
    icon: "layers", color: "blue",
    lessons: [
      {
        title: "Requisitos e restrições", minutes: 12,
        paragraphs: [
          "Imagine que alguém peça um encurtador de URLs. Criar um link curto e abrir o destino são dois fluxos distintos. Quem cria precisa receber um código único. Quem clica precisa chegar ao destino mesmo durante uma campanha popular. Antes de escolher ferramentas, descreva o que cada pessoa deve conseguir fazer.",
          "Converta palavras como “rápido” em critérios que a equipe consiga testar. Um exemplo é responder a 99% dos cliques válidos em até 150 ms, medidos na entrada do serviço durante 30 dias. Anote também as restrições que limitam o desenho, como equipe, orçamento e prazo."
        ],
        scenario: "Duas pessoas têm quatro semanas para lançar o serviço. Marketing aceita receber as estatísticas no dia seguinte, mas precisa que os links funcionem desde o início.",
        question: "Qual requisito deve orientar o primeiro desenho?",
        options: ["Calcular estatísticas em tempo real a cada clique.", "Definir e medir o tempo para redirecionar um clique válido.", "Escolher antecipadamente o número de microsserviços."],
        correct: 1, explanation: "O redirecionamento atende a necessidade imediata da campanha. Uma meta mensurável permite avaliar o desenho e reservar o processamento de estatísticas para depois.",
        exercise: "Escreva um requisito funcional, uma meta mensurável e uma funcionalidade que você adiaria. Explique o custo desse adiamento.",
        reference: {title: "Google SRE · Service Level Objectives", url: "https://sre.google/sre-book/service-level-objectives/"}
      },
      {
        title: "Estimativas de capacidade", minutes: 15,
        paragraphs: [
          "Capacidade começa com unidades. Se chegam 8,64 milhões de cliques por dia, dividir por 86.400 segundos produz 100 cliques por segundo em média. Para estimar um pico dez vezes maior, dimensione o primeiro teste para 1.000 cliques por segundo.",
          "Cada operação tem um custo diferente. Criar 100 mil links de 500 bytes por dia acrescenta cerca de 50 MB diários antes de índices, réplicas e backups. Separe leituras, escritas e retenção. Registre qual hipótese mais altera o orçamento e como você poderia medi-la."
        ],
        scenario: "Uma promoção pode concentrar 600 mil cliques em cinco minutos. O restante do dia tem pouco tráfego.",
        question: "Que taxa média deve ser sustentada durante esses cinco minutos?",
        options: ["120 cliques por segundo.", "10 mil cliques por segundo.", "2 mil cliques por segundo."],
        correct: 2, explanation: "Cinco minutos têm 300 segundos. Dividir 600.000 por 300 dá 2.000 cliques por segundo. Picos dentro dessa janela podem exigir margem adicional.",
        exercise: "Estime o tráfego se os mesmos cliques ocorrerem em dois minutos. Escolha uma margem para o teste de carga e explique sua hipótese.",
        reference: {title: "Google SRE Workbook · Non-Abstract Large System Design", url: "https://sre.google/workbook/non-abstract-design/"}
      },
      {
        title: "O caminho de uma requisição", minutes: 12,
        paragraphs: [
          "Desenhe um clique como uma sequência. O navegador pede o código, a aplicação consulta o destino persistido e devolve uma resposta HTTP com a localização. O navegador inicia outra requisição ao destino. O tempo que o site de destino leva para carregar pertence a outro sistema.",
          "Marque quais componentes precisam responder antes de devolver o redirecionamento. Uma chamada em sequência consome parte do tempo disponível e acrescenta um ponto de falha. Se o relatório puder atrasar, avalie registrar um evento para processá-lo depois e explicite a tolerância à perda desse evento."
        ],
        scenario: "A consulta do destino leva 15 ms. A geração síncrona de um relatório consome mais 400 ms e o cliente só o consulta no dia seguinte.",
        question: "Que mudança reduz a espera no clique sem perder a função do relatório?",
        options: ["Registrar o evento e gerar o relatório fora do fluxo de resposta.", "Gerar o relatório duas vezes para garantir o resultado.", "Fazer o navegador esperar mais tempo pela mesma resposta."],
        correct: 0, explanation: "O relatório pode ser calculado depois do registro do evento. Isso remove seus 400 ms do caminho do clique e cria uma responsabilidade nova de processar o registro pendente.",
        exercise: "Descreva o caminho de um clique e a consequência de uma falha em cada etapa. Escolha uma etapa que poderia ocorrer depois da resposta.",
        reference: {title: "IETF · Semântica HTTP e redirecionamento", url: "https://www.rfc-editor.org/rfc/rfc9110#section-15.4"}
      }
    ]
  },
  {
    title: "Redes e APIs", description: "Acompanhe o tráfego do DNS ao contrato de uma API.",
    icon: "network", color: "violet",
    lessons: [
      {
        title: "DNS e troca de endereço", minutes: 12,
        paragraphs: [
          "O navegador precisa localizar o servidor antes de enviar a requisição. O resolvedor DNS pode reutilizar uma resposta em cache enquanto o TTL, seu tempo de vida, permitir. O servidor autoritativo fornece os registros do domínio quando uma consulta precisa seguir até a origem.",
          "Durante uma migração, alguns clientes ainda recebem o endereço antigo de seus resolvedores. Reduzir o TTL com antecedência encurta a coexistência dos dois endereços. Uma redução publicada no momento da troca só alcança os caches quando eles consultarem novamente."
        ],
        scenario: "O TTL anterior é de uma hora. A alteração para 60 segundos e a troca do endereço foram feitas ao mesmo tempo.",
        question: "Que medida protege quem ainda usa o endereço antigo?",
        options: ["Reiniciar apenas o servidor autoritativo.", "Manter o endereço antigo atendendo e observar o tráfego residual.", "Apagar a versão antiga do registro mais uma vez."],
        correct: 1, explanation: "Os resolvedores podem manter a resposta anterior pelo TTL que receberam. O serviço antigo precisa atender esses clientes durante a transição.",
        exercise: "Planeje uma troca de endereço em três momentos. Inclua quando reduzir o TTL e um sinal para desligar o endereço anterior.",
        reference: {title: "IETF · Conceitos e funcionamento do DNS", url: "https://www.rfc-editor.org/rfc/rfc1034"}
      },
      {
        title: "Contratos HTTP", minutes: 15,
        paragraphs: [
          "Um contrato descreve método, entrada, resultado e erros observáveis. Uma API pode aceitar POST em /links para criar o recurso e devolver 201 com a localização do link criado. Quem visita esse endereço realiza um GET e recebe a indicação do destino.",
          "Escolha o comportamento de cache de acordo com a vida do dado. Um destino editável pode usar redirecionamento temporário acompanhado de uma política explícita para caches. Se o sistema permitir guardar o resultado por cinco minutos, o proprietário precisa conhecer esse atraso após uma edição."
        ],
        scenario: "O produto precisa editar destinos. Durante o piloto, toda nova visita deve consultar o serviço, inclusive logo após uma edição.",
        question: "Que contrato de leitura atende ao piloto?",
        options: ["Responder a GET com redirecionamento temporário e Cache-Control: no-store.", "Responder a GET com um destino armazenável durante um dia.", "Responder a GET com 201 e criar outro link a cada visita."],
        correct: 0, explanation: "O redirecionamento temporário indica onde seguir. A diretiva no-store instrui os caches a não guardar a resposta, coerente com a política de atualização imediata do piloto.",
        exercise: "Especifique a criação e a visita de um link. Registre métodos, códigos de resposta e o comportamento quando o código solicitado não existir.",
        reference: {title: "IETF · Métodos e códigos de resposta HTTP", url: "https://www.rfc-editor.org/rfc/rfc9110"}
      },
      {
        title: "Idempotência e repetição", minutes: 18,
        paragraphs: [
          "Um timeout deixa o cliente sem saber se a operação terminou. Se a criação já foi confirmada no banco e a resposta se perdeu, repetir o pedido pode criar outro link. Uma chave de idempotência identifica a intenção do cliente e acompanha todas as tentativas daquela operação.",
          "Associe a chave ao usuário, ao conteúdo do pedido e ao resultado. Uma gravação atômica impede que duas tentativas simultâneas produzam dois efeitos. Defina a janela de retenção e como responder quando alguém reutilizar a mesma chave com conteúdo diferente."
        ],
        scenario: "Dois pedidos simultâneos do mesmo usuário chegam com a mesma chave e o mesmo destino.",
        question: "Como preservar uma única criação?",
        options: ["Atribuir uma chave nova a cada tentativa.", "Consultar uma lista em memória separada em cada servidor.", "Reservar a chave de modo atômico e devolver o resultado registrado."],
        correct: 2, explanation: "A reserva compartilhada controla a concorrência entre servidores. O resultado persistido permite responder a uma repetição mesmo depois da perda da primeira resposta.",
        exercise: "Defina o resultado de três casos: primeira criação, repetição após timeout e repetição com outro destino. Justifique a retenção escolhida para a chave.",
        reference: {title: "AWS Builders’ Library · Making retries safe with idempotent APIs", url: "https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/"}
      }
    ]
  },
  {
    title: "Armazenamento de dados", description: "Escolha chaves, índices e garantias de leitura para cada fluxo.",
    icon: "database", color: "teal",
    lessons: [
      {
        title: "Modelagem e integridade", minutes: 16,
        paragraphs: [
          "Comece pelas perguntas do produto. Para abrir um link, a consulta recebe um código e precisa de um destino. Para listar os links de uma pessoa, precisa de um identificador do proprietário. Uma tabela inicial pode guardar código, destino, proprietário e data de criação.",
          "Duas criações podem escolher o mesmo código entre a consulta e a inserção. Uma chave primária no código faz o próprio banco arbitrar essa disputa. A aplicação pode gerar outro código automático em caso de colisão ou explicar que um apelido escolhido já está ocupado."
        ],
        scenario: "Duas contas tentam registrar o mesmo apelido ao mesmo tempo. Apenas uma pode se tornar proprietária.",
        question: "Onde a regra de unicidade deve ser garantida?",
        options: ["Em uma verificação visual na tela de cadastro.", "Em uma restrição única no banco, com tratamento de conflito na API.", "Em uma tarefa que elimina duplicados à noite."],
        correct: 1, explanation: "A restrição arbitra inserções concorrentes no momento da gravação. A API pode então informar o conflito à conta que fez a segunda tentativa.",
        exercise: "Liste os campos obrigatórios da tabela de links e desenhe a resposta para uma colisão em código automático e outra em apelido personalizado.",
        reference: {title: "PostgreSQL · Restrições e chaves primárias", url: "https://www.postgresql.org/docs/current/ddl-constraints.html"}
      },
      {
        title: "Índices e padrões de acesso", minutes: 16,
        paragraphs: [
          "Um índice mantém uma estrutura que permite encontrar linhas por uma ou mais colunas. O índice da chave primária atende à busca por código. Já o painel que lista os 20 links mais recentes de uma conta procura primeiro o proprietário, depois a ordem de criação.",
          "Um índice composto por proprietário e data pode atender ao filtro e à ordenação. Ele ocupa armazenamento e precisa ser atualizado a cada escrita relevante. Compare o plano da consulta e as medições de leitura e inserção com um volume representativo."
        ],
        scenario: "O painel ficou lento com 40 milhões de linhas. A consulta mais frequente filtra uma conta e ordena por data. Cada conta tem centenas de links.",
        question: "Qual índice vale testar primeiro para o painel?",
        options: ["Um índice somente sobre a URL de destino.", "Um índice sobre o comprimento do código curto.", "Um índice composto por proprietário e data de criação."],
        correct: 2, explanation: "A primeira coluna localiza a conta e a segunda organiza seus registros por data. A medição confirma se o ganho compensa o custo de manter o índice.",
        exercise: "Escreva duas consultas de produto e proponha um índice para cada uma. Descreva uma medição que justificaria remover um dos índices.",
        reference: {title: "PostgreSQL · Introdução aos índices", url: "https://www.postgresql.org/docs/current/indexes-intro.html"}
      },
      {
        title: "Replicação e consistência", minutes: 18,
        paragraphs: [
          "Na replicação assíncrona, o primário pode confirmar uma escrita antes de a réplica aplicá-la. Isso libera o cliente mais cedo, mas uma leitura imediata na réplica pode devolver o valor anterior ou dizer que o link ainda não existe.",
          "Defina a garantia por fluxo. O proprietário costuma esperar que sua edição apareça ao recarregar a tela. Ler do primário depois da gravação atende essa expectativa, ao custo de consumir capacidade ali. Um relatório histórico pode tolerar atraso e consultar uma réplica."
        ],
        scenario: "A criação termina com sucesso. Logo depois, a tela do proprietário lê de uma réplica atrasada e mostra que o link está ausente.",
        question: "Qual ajuste garante a leitura imediata da escrita confirmada nesse fluxo, com o primário saudável?",
        options: ["Encaminhar a leitura de confirmação ao primário.", "Aguardar sempre 10 ms e ler da réplica.", "Adicionar réplicas assíncronas e escolher uma ao acaso."],
        correct: 0, explanation: "Com a transação confirmada, o primário já contém o registro. Uma espera fixa continua sujeita a atrasos maiores na replicação.",
        exercise: "Escolha a origem das leituras para edição, visita pública e relatório. Para cada fluxo, declare o atraso tolerado e o efeito de ultrapassá-lo.",
        reference: {title: "PostgreSQL · Replicação e servidores de espera", url: "https://www.postgresql.org/docs/current/warm-standby.html"}
      }
    ]
  },
  {
    title: "Escalabilidade e desempenho", description: "Distribua carga e descubra o limite de cada componente.",
    icon: "scale", color: "amber",
    lessons: [
      {
        title: "Balanceamento de carga", minutes: 15,
        paragraphs: [
          "Um balanceador distribui requisições entre instâncias aptas a atendê-las. Se a sessão e os dados duráveis estiverem fora do processo, um cliente pode trocar de instância entre pedidos. A equipe consegue adicionar capacidade e retirar uma máquina para manutenção.",
          "Reserve capacidade para falhas. Com quatro instâncias que sustentam 300 requisições por segundo cada e tráfego de 1.000 por segundo, a perda de uma deixa apenas 900 de capacidade. Teste o limite com a distribuição real de requisições e verifique se o banco também suporta a carga."
        ],
        scenario: "Cada instância atende 300 cliques por segundo no teste. O pico é de 1.000, e o sistema deve tolerar a perda de uma instância. Considere distribuição uniforme.",
        question: "Qual é o mínimo de instâncias nesse modelo?",
        options: ["Quatro.", "Cinco.", "Três."],
        correct: 1, explanation: "São necessárias quatro instâncias saudáveis para sustentar 1.000 cliques por segundo. A quinta mantém essa capacidade quando uma sai de operação.",
        exercise: "Refaça o cálculo para um pico de 1.400 cliques por segundo. Cite um gargalo compartilhado que pode invalidar a conta.",
        reference: {title: "Google SRE · Load Balancing in the Datacenter", url: "https://sre.google/sre-book/load-balancing-datacenter/"}
      },
      {
        title: "Cache e invalidação", minutes: 16,
        paragraphs: [
          "Guardar respostas de redirecionamento perto dos usuários reduz viagens até a origem. Com 10 mil leituras por segundo e 95% de acertos no cache, cerca de 500 leituras por segundo alcançam a origem, supondo uma consulta por falta e sem revalidações adicionais.",
          "A taxa média de acertos esconde a expiração simultânea de chaves populares. Defina validade coerente com a atualização de destinos e planeje a carga durante um cache frio. Um destino que precisa ser revogado em segundos exige uma estratégia de atualização compatível em todas as camadas."
        ],
        scenario: "Um cache compartilhado guarda redirecionamentos por uma hora. O contrato permite até um minuto para uma edição chegar às novas visitas. Assuma que o navegador consulta o serviço a cada clique.",
        question: "Qual política satisfaz a janela de atualização?",
        options: ["Aumentar a validade para reduzir leituras.", "Atualizar somente o banco ao editar o link.", "Limitar a validade a um minuto e impedir uso de conteúdo vencido."],
        correct: 2, explanation: "Sem reutilização de respostas vencidas, uma entrada anterior à edição expira dentro da janela. A origem precisa suportar a frequência maior de consultas.",
        exercise: "Defina uma política de cache para links editáveis. Calcule as consultas à origem com 10 mil leituras por segundo e 85% de acertos.",
        reference: {title: "IETF · Cache HTTP", url: "https://www.rfc-editor.org/rfc/rfc9111"}
      },
      {
        title: "Particionamento e chaves quentes", minutes: 18,
        paragraphs: [
          "Particionar divide um conjunto de dados segundo uma regra. Uma tabela de eventos dividida por mês permite descartar um período antigo como unidade. Quando as consultas informam o período, o banco pode descartar partições irrelevantes durante a busca.",
          "Distribuir partições entre máquinas acrescenta decisões de roteamento e movimentação de dados. Distribuir por hash do código ajuda a espalhar muitos códigos distintos. Um único link viral, porém, continua concentrando leituras onde sua chave estiver. Cache ou réplicas podem aliviar essa concentração."
        ],
        scenario: "Os relatórios sempre filtram o mês de ocorrência. A equipe precisa descartar todos os eventos com mais de 12 meses e quer evitar grandes exclusões linha a linha.",
        question: "Que chave de partição atende melhor a essas duas operações?",
        options: ["O mês de ocorrência do evento.", "O primeiro caractere do código.", "Um número aleatório por evento."],
        correct: 0, explanation: "Os filtros podem selecionar os meses relevantes. Quando o período inteiro vencer, a equipe pode remover a partição correspondente segundo a política de retenção.",
        exercise: "Escolha uma chave para eventos de cliques e outra para os próprios links. Explique o que acontece se um único código concentrar metade das visitas.",
        reference: {title: "PostgreSQL · Particionamento de tabelas", url: "https://www.postgresql.org/docs/current/ddl-partitioning.html"}
      }
    ]
  },
  {
    title: "Confiabilidade e operação", description: "Meça a experiência, contenha falhas e ensaie a recuperação.",
    icon: "pulse", color: "rose",
    lessons: [
      {
        title: "Sinais de saúde e alertas", minutes: 15,
        paragraphs: [
          "Comece por tráfego, erros, latência e saturação. O tráfego informa a demanda, os erros e a latência mostram o impacto percebido, e a saturação ajuda a investigar escassez de recursos. Separe leituras e escritas para que o grande volume de cliques não esconda falhas de criação.",
          "Uma média baixa pode coexistir com uma experiência ruim para parte das pessoas. O p99 é o valor abaixo do qual ficam aproximadamente 99% das observações. Para alertar sobre um compromisso específico de tempo, conte também diretamente a fração de requisições que excede o limite."
        ],
        scenario: "A CPU está em 25%. Nas últimas duas horas, 8% das criações válidas falharam. Redirecionamentos continuam rápidos.",
        question: "Qual sinal deve conduzir a investigação imediata?",
        options: ["Média global de uso de CPU.", "Taxa de falha do fluxo de criação.", "Total de códigos já armazenados."],
        correct: 1, explanation: "O erro nas criações mede diretamente o impacto nesse grupo. Recursos com baixa utilização média podem coexistir com uma dependência específica indisponível.",
        exercise: "Defina numerador, denominador, janela e limite de um alerta para criações. Escolha uma segunda medida que ajude a localizar a causa.",
        reference: {title: "Google SRE · Monitoring Distributed Systems", url: "https://sre.google/sre-book/monitoring-distributed-systems/"}
      },
      {
        title: "Timeouts e falhas em cascata", minutes: 18,
        paragraphs: [
          "Uma dependência lenta prende conexões e ocupa concorrência. Um prazo total para a requisição limita quanto tempo o chamador espera. Cada chamada interna deve respeitar o tempo restante, incluindo o custo de uma eventual nova tentativa.",
          "Repetir uma operação custa capacidade justamente quando a dependência pode estar saturada. Restrinja as tentativas a falhas transitórias e operações seguras para repetição. Aumente o intervalo entre tentativas e varie a espera com jitter para reduzir picos sincronizados."
        ],
        scenario: "O prazo restante para responder é de 40 ms. Uma nova tentativa na dependência exige pelo menos 70 ms e a fila dela já está cheia.",
        question: "Qual comportamento preserva o prazo e reduz a pressão?",
        options: ["Duplicar as tentativas e aceitar o primeiro retorno.", "Manter a conexão aberta até a fila esvaziar.", "Encerrar dentro do prazo e aplicar a resposta degradada prevista."],
        correct: 2, explanation: "A nova tentativa já nasceria sem tempo para terminar. O comportamento degradado, como omitir uma estatística opcional, pode preservar a função principal.",
        exercise: "Distribua um prazo de 200 ms entre etapas de uma chamada. Defina quando faria uma nova tentativa e quando devolveria uma resposta degradada.",
        reference: {title: "AWS Builders’ Library · Timeouts, retries, and backoff with jitter", url: "https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/"}
      },
      {
        title: "Backup e recuperação", minutes: 18,
        paragraphs: [
          "RPO expressa a perda máxima de dados tolerada em tempo. Um RPO de 15 minutos permite recuperar um estado até 15 minutos anterior ao incidente. RTO expressa o tempo aceitável até restabelecer a operação. A estratégia precisa atender aos dois objetivos no cenário de falha escolhido.",
          "Uma réplica pode copiar prontamente uma exclusão por engano. Uma cópia histórica e registros para recuperação até um ponto no tempo permitem voltar a um estado anterior. Ensaiar uma restauração em ambiente isolado mede a duração e permite conferir os dados e o funcionamento da aplicação."
        ],
        scenario: "O serviço exige RPO de 15 minutos e RTO de duas horas. Há apenas uma cópia por dia, nunca restaurada em um ensaio.",
        question: "Qual ação aproxima a estratégia das duas metas?",
        options: ["Arquivar alterações com frequência compatível e cronometrar uma restauração completa.", "Duplicar o número de servidores da aplicação.", "Contar o número de arquivos da cópia diária."],
        correct: 0, explanation: "A frequência das alterações recuperáveis limita a perda potencial. O exercício completo verifica se recuperar, validar e reabrir o serviço cabe no prazo.",
        exercise: "Planeje um ensaio após uma exclusão acidental. Descreva o ponto de restauração, uma verificação de integridade e o critério para reabrir o tráfego.",
        reference: {title: "Google SRE · Data Integrity", url: "https://sre.google/sre-book/data-integrity/"}
      }
    ]
  },
  {
    title: "Projetos de arquitetura", description: "Defenda três desenhos com números, limites e alternativas.",
    icon: "blocks", color: "indigo",
    lessons: [
      {
        title: "Projete um encurtador de URLs", minutes: 30,
        paragraphs: [
          "Reúna o que você já decidiu em um desenho que caiba em uma página. Indique criação, redirecionamento, armazenamento, política de cache e tratamento de colisões. Para cada seta, anote o dado transportado. Para cada componente, explique qual requisito ele atende.",
          "Faça um teste de mesa. Siga uma criação duplicada, uma edição de destino e um clique com o cache indisponível. Estime a carga que volta ao banco. Compare essa estimativa à capacidade medida e decida qual comportamento o serviço deve oferecer enquanto se recupera."
        ],
        scenario: "A meta é atender 4.000 leituras por segundo. Todas as faltas de cache consultam o banco uma vez. O banco foi testado até 800 leituras por segundo, e o cache tem 90% de acertos.",
        question: "O que acontece com a demanda de leitura no banco se todo o cache falhar?",
        options: ["Passa de 400 para 800 leituras por segundo.", "Passa de 400 para 4.000 leituras por segundo.", "Permanece em 400 leituras por segundo."],
        correct: 1, explanation: "Normalmente 10% das leituras chegam ao banco. Sem cache, chegam todas, cinco vezes o limite testado. Essa diferença precisa aparecer no plano de degradação.",
        exercise: "Entregue seu desenho em texto com cinco partes: requisitos, API, modelo de dados, cálculo de capacidade e resposta à queda do cache. Declare uma alternativa que reconsideraria se o volume dobrasse.",
        reference: {title: "Google SRE · Handling Overload", url: "https://sre.google/sre-book/handling-overload/"}
      },
      {
        title: "Projete um serviço de notificações", minutes: 30,
        paragraphs: [
          "Um serviço de notificações recebe uma intenção, persiste o trabalho e o entrega a um provedor. A fila absorve variações entre a entrada e o ritmo de envio. Separe aceitação de entrega no contrato com o cliente e acompanhe a idade da mensagem mais antiga.",
          "Um consumidor pode enviar uma notificação e falhar antes de confirmar o processamento na fila. A mensagem pode reaparecer. Para controlar duplicatas no efeito externo, é preciso coordenar o registro local com a garantia oferecida pelo provedor, como uma chave estável para o mesmo envio."
        ],
        scenario: "O provedor aceita uma chave de idempotência por 48 horas. O consumidor caiu depois de um envio e a fila reentregou a mensagem dez minutos depois.",
        question: "Como repetir o envio respeitando a intenção original?",
        options: ["Criar uma nova chave e repetir o envio.", "Marcar todas as mensagens da fila como concluídas.", "Reutilizar a chave do envio original e registrar o resultado."],
        correct: 2, explanation: "A mesma chave, dentro da janela acordada, permite ao provedor reconhecer a tentativa repetida. O consumidor pode então persistir o resultado e confirmar a mensagem.",
        exercise: "Modele os estados de uma notificação. Defina o que mostrar ao cliente se o provedor ficar fora por uma hora e como lidar com uma mensagem que falha repetidamente.",
        reference: {title: "RabbitMQ · Garantias de entrega e reentrega", url: "https://www.rabbitmq.com/docs/reliability"}
      },
      {
        title: "Projete um painel de eventos", minutes: 35,
        paragraphs: [
          "Um painel de cliques pode consumir eventos, agrupá-los por campanha e minuto e servir os totais pré-calculados. Diferencie o instante do clique do instante em que ele foi processado. Eventos atrasados podem corrigir uma janela anterior conforme a regra de fechamento do relatório.",
          "O desafio final é conciliar exatidão, atraso e custo. Guarde uma identidade por evento para tratar reentregas. Defina por quanto tempo o dado original ficará disponível para recalcular os totais e como priorizar dados recentes se houver um acúmulo grande de mensagens."
        ],
        scenario: "O painel aceita atraso de cinco minutos e deve contar uma vez cada clique. A mesma mensagem pode ser entregue várias vezes. Dois cliques legítimos podem ter o mesmo código e horário.",
        question: "Qual estratégia preserva a contagem nesse cenário?",
        options: ["Usar um ID estável por clique e atualizar o total junto ao registro de processamento, em uma transação.", "Eliminar todo clique com o mesmo código e horário.", "Incrementar o total sempre que a fila entregar uma mensagem."],
        correct: 0, explanation: "O ID distingue eventos legítimos de reentregas. Registrar a identidade e o incremento atomicamente evita perder ou aplicar duas vezes um efeito depois de uma falha.",
        exercise: "Apresente seu desenho do produtor ao painel. Inclua a chave de agregação, o limite de atraso, como recuperar duas horas de acúmulo e qual indicador mostrará que o painel voltou ao normal.",
        reference: {title: "AWS Builders’ Library · Avoiding insurmountable queue backlogs", url: "https://aws.amazon.com/builders-library/avoiding-insurmountable-queue-backlogs/"}
      }
    ]
  }
];
