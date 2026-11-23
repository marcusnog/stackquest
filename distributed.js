const distributedModule = {
  title:'Sistemas distribuídos sob falha', icon:'network', color:'blue',
  description:'Investigue o que acontece entre o commit, a resposta ao cliente e a recuperação de uma partição.',
  lessons:[
    {
      title:'Consenso durante uma partição', minutes:22,
      paragraphs:[
        'Um serviço de configuração mantém um log Raft em cinco réplicas. Para confirmar uma nova entrada do termo atual, o líder precisa que ela esteja em uma maioria, contando a si próprio. Se duas máquinas ficarem isoladas das outras três, o lado de duas pode continuar recebendo pedidos, mas não consegue confirmar entradas novas sozinho.',
        'Considere um cliente que perde a conexão após enviar uma mudança. Um timeout não revela se a mudança chegou a ser confirmada. Inclua um identificador da operação, persista o resultado junto à alteração e defina como o cliente consulta esse resultado depois da troca de líder.'
      ],
      scenario:'O líder antigo fica no lado de duas réplicas. As outras três se comunicam e podem eleger um líder. Duas equipes tentam atualizar a mesma configuração.',
      question:'Em qual condição a API pode informar que uma nova escrita foi confirmada?',
      options:['Quando o líder antigo persistir o pedido localmente.','Quando o líder em um termo válido confirmar a entrada pela maioria segundo o protocolo.','Quando os dois lados devolverem suas versões com timestamp.'],
      correct:1, explanation:'Num grupo estável de cinco, a maioria é três. A eleição e as regras de commit do Raft preservam o histórico confirmado. Um relógio mais recente ou um registro local isolado não oferecem essa garantia.',
      exercise:'Desenhe a divisão 2 + 3. Marque onde cada escrita pode ser confirmada, qual resposta o cliente recebe durante a eleição e como ele repete um pedido cujo resultado desconhece.',
      reference:{title:'Ongaro e Ousterhout · Raft, seções 5 e 8',url:'https://raft.github.io/raft.pdf'}
    },{
      title:'Outbox e entrega duplicada', minutes:20,
      paragraphs:[
        'O serviço grava um pedido e precisa emitir PedidoConfirmado. Uma queda entre o commit e a publicação deixaria um pedido sem evento. Na outbox transacional, o pedido e a intenção de publicar compartilham a mesma transação local. Um processo separado lê os registros pendentes e publica as mensagens.',
        'Se o publicador cair depois de enviar a mensagem e antes de marcar a linha, ele tentará enviá-la de novo. A proteção no consumidor deve cobrir o efeito da mensagem. Para uma reserva local de estoque, persista o ID do evento com restrição de unicidade e a reserva na mesma transação. Para uma chamada externa, a fronteira muda: é preciso combinar idempotência com o serviço chamado ou reconciliar o resultado.'
      ],
      scenario:'Após uma reinicialização, o estoque recebe duas vezes o evento e-42 do pedido 901. Reservar duas unidades para esse pedido viola o contrato.',
      question:'Qual desenho tolera uma queda do consumidor entre a reserva local e a confirmação ao broker?',
      options:['Guardar os IDs já lidos na memória do consumidor.','Confirmar a mensagem antes de gravar a reserva.','Efetivar a reserva e o registro único de e-42 na mesma transação; confirmar ao broker após o commit.'],
      correct:2,explanation:'Se o commit falhar, o evento ainda pode ser processado. Se o commit funcionar e a confirmação se perder, a restrição única identifica a repetição e impede uma segunda reserva.',
      exercise:'Faça uma linha do tempo com três quedas: antes do commit do pedido, depois da publicação e depois do commit do estoque. Para cada uma, descreva o estado durável e quem deve repetir a operação.',
      reference:{title:'AWS · Transactional outbox',url:'https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html'}
    },{
      title:'Quóruns e versões concorrentes', minutes:24,
      paragraphs:[
        'Um carrinho distribuído aceita atualizações em réplicas diferentes durante uma interrupção. Se a regra de reconciliação for escolher a última gravação pelo relógio, um item adicionado em outro dispositivo pode desaparecer. Versões causais permitem identificar atualizações concorrentes e pedir à aplicação uma regra de combinação.',
        'Com três réplicas fixas, gravar em duas e ler de duas garante uma interseção entre os conjuntos. Essa conta, sozinha, não ordena escritas concorrentes. Em desenhos com substituição temporária de réplicas, até a hipótese de conjuntos fixos precisa ser revista. A regra do produto também importa: unir dois carrinhos preserva adições, mas pode ressuscitar um item removido.'
      ],
      scenario:'O celular remove um livro enquanto o notebook adiciona um teclado à mesma versão do carrinho. As duas operações são aceitas durante a falha de comunicação.',
      question:'Que decisão falta antes de escolher a política de reconciliação?',
      options:['Definir como adições e remoções concorrentes devem aparecer ao cliente, e representar essas operações no histórico.','Aumentar a precisão dos relógios para transformar concorrência em causalidade.','Usar união dos conjuntos para garantir qualquer regra de remoção.'],
      correct:0,explanation:'O produto precisa definir a semântica de conflito. IDs de operação e histórico de remoções permitem distinguir um item antigo de uma nova adição. Quóruns não fornecem essa semântica.',
      exercise:'Parta de um carrinho com livro e caneta. Mostre o resultado de união e de última escrita após edições em dois dispositivos. Escolha uma regra de remoção e explique qual metadado precisa ser retido.',
      reference:{title:'DeCandia et al. · Dynamo, versionamento e reconciliação',url:'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf'}
    }
  ]
};
