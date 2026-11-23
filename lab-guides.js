const labGuides = [
  {
    id: "vps", title: "Coloque uma VPS no ar",
    intro: "Seu primeiro servidor vai atender requisições de saúde na porta 8080. Use o terminal do simulador para criar a máquina e acompanhe o que precisa acontecer entre ligar a VPS e receber uma resposta HTTP.",
    steps: [
      {title: "Crie a máquina", body: "Provisione a VPS com o nome web-01. Esse nome identifica onde você vai entrar para configurar o serviço.", command: "vps create web-01"},
      {title: "Entre na VPS", body: "Abra uma sessão de administração em web-01. Confira o nome do host no terminal antes de mudar a configuração da máquina.", command: "ssh web-01"},
      {title: "Libere a porta da aplicação", body: "Adicione ao firewall uma regra de entrada para a porta 8080. A regra permite que as requisições alcancem o processo que estiver escutando nessa porta.", command: "ufw allow 8080"},
      {title: "Inicie o serviço", body: "Peça ao gerenciador de serviços que inicie a unidade app. A aplicação do exercício passa a atender no endereço da VPS.", command: "systemctl start app"},
      {title: "Consulte a rota de saúde", body: "Envie uma requisição a /health pelo nome da máquina e pela porta do serviço. Confira o resultado HTTP para verificar o caminho até a aplicação.", command: "curl http://web-01:8080/health"}
    ],
    challenge: "Em uma nova execução, consulte /health depois de liberar a porta e antes de iniciar o serviço. Compare o resultado com a consulta após o início da aplicação. Que evidência distingue uma porta liberada de um processo atendendo?",
    reference: {title: "Ubuntu Server · Regras de firewall com UFW", url: "https://ubuntu.com/server/docs/how-to/security/firewalls/"}
  },
  {
    id: "deploy", title: "Publique uma versão da aplicação",
    intro: "Entregue uma alteração em app.js ao servidor web-01. Compare três evidências ao longo do caminho: o teste do código editado, a resposta do serviço publicado e os registros da execução.",
    steps: [
      {title: "Edite app.js", body: "Abra app.js no editor do laboratório. Identifique o código que atende /health e ajuste a aplicação conforme o contrato do teste. Guarde sua alteração antes de testar.", command: ""},
      {title: "Teste o código editado", body: "Execute o teste do projeto e leia o resultado. Se falhar, compare o valor esperado com o produzido, ajuste app.js e rode o teste novamente.", command: "npm test"},
      {title: "Envie a versão para a VPS", body: "O comando de deploy do simulador publica a aplicação em web-01. Esse é o momento em que o servidor recebe a versão que você preparou no editor.", command: "deploy web-01"},
      {title: "Confira a aplicação publicada", body: "Consulte a rota de saúde da versão em execução na VPS. Compare o conteúdo recebido com o comportamento esperado durante o teste.", command: "curl http://web-01:8080/health"},
      {title: "Consulte os registros", body: "Filtre o diário do servidor pela unidade app. Leia os registros da aplicação e identifique uma entrada relacionada à execução que acabou de verificar.", command: "journalctl -u app"}
    ],
    challenge: "Depois de um deploy bem-sucedido, altere o código no editor e consulte novamente a VPS antes de publicar. Qual versão responde? Registre a diferença entre um teste local aprovado e uma versão em execução.",
    reference: {title: "npm · Execução do teste do projeto", url: "https://docs.npmjs.com/cli/v11/commands/npm-test/"}
  },
  {
    id: "cloud", title: "Monte uma infraestrutura em nuvem",
    intro: "Construa o caminho de uma requisição do cliente até a API. Os comandos cloud pertencem ao emulador e representam recursos encontrados em provedores de nuvem: rede, instância, regra de entrada e balanceador.",
    steps: [
      {title: "Crie a rede", body: "Crie a rede lógica privada. Guarde o nome porque a instância precisará indicar em qual rede será criada.", command: "cloud network create privada"},
      {title: "Adicione a instância", body: "Provisione a máquina api-01 na rede privada. A opção --network estabelece o vínculo entre a instância que executará a aplicação e a rede recém-criada.", command: "cloud instance create api-01 --network privada"},
      {title: "Permita o tráfego da API", body: "Adicione à instância uma regra para receber conexões na porta 8080. O balanceador usará o caminho permitido para chegar ao serviço.", command: "cloud firewall allow api-01 8080"},
      {title: "Publique a aplicação", body: "Instale a aplicação na instância api-01 com o comando de deploy do laboratório. A máquina passa a servir de destino para as requisições de saúde.", command: "deploy api-01"},
      {title: "Conecte o balanceador", body: "Crie o ponto de entrada chamado entrada. O argumento --target associa o tráfego recebido à instância api-01. O desenho atual tem um único destino.", command: "cloud lb create entrada --target api-01"},
      {title: "Teste o caminho completo", body: "Faça o pedido pelo nome do balanceador. Uma resposta saudável verifica o percurso do ponto de entrada até o serviço publicado.", command: "curl http://entrada/health"}
    ],
    challenge: "Descreva o caminho da requisição e diga qual componente consulta o cliente. Com apenas api-01 como destino, o que aconteceria se essa instância parasse? Desenhe uma mudança para tolerar a perda dela.",
    reference: {title: "AWS · Componentes de um Application Load Balancer", url: "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html"}
  },
  {
    id: "k8s", title: "Execute e escale uma API no Kubernetes",
    intro: "Declare como a API deve rodar, dê a ela um endereço estável no cluster e aumente o número de cópias. O Deployment mantém a quantidade desejada de pods. O Service encaminha requisições aos pods que correspondem ao seu seletor.",
    steps: [
      {title: "Inicialize o control plane", body: "O laboratório fornece os binários, o runtime e a rede de pods. Inicialize a API do cluster em control-01. O terminal exibirá um token didático para o ingresso do worker.", command: "kubeadm init --node-name control-01"},
      {title: "Adicione um worker", body: "Associe worker-01 ao control plane pelo endpoint e pelo token do exercício. O worker fornece capacidade para agendar pods. Em máquinas reais, o ingresso também exige validar a identidade do control plane.", command: "kubeadm join control-01:6443 --token abcdef.0123456789abcdef --node-name worker-01"},
      {title: "Confira os nós", body: "Verifique os papéis do control plane e do worker. Neste cluster, apenas o worker recebe a carga da aplicação.", command: "kubectl get nodes"},
      {title: "Aplique o Deployment", body: "Leia deployment.yaml no editor. Observe o nome, a imagem e a quantidade de réplicas. Aplique o manifesto para que o cluster simulado crie ou atualize o Deployment e seus pods.", command: "kubectl apply -f deployment.yaml"},
      {title: "Inspecione os pods", body: "Liste os pods e observe quantos aparecem e em que estado estão. Anote a quantidade inicial para comparar depois da escala.", command: "kubectl get pods"},
      {title: "Crie o Service", body: "Aplique service.yaml para obter um endereço de serviço no cluster. O seletor deve corresponder aos rótulos dos pods. Confira também como a porta do Service se relaciona com a porta da aplicação.", command: "kubectl apply -f service.yaml"},
      {title: "Aumente a capacidade", body: "Altere para três a quantidade desejada de réplicas do Deployment api. Volte a listar os pods para verificar o estado observado após a mudança.", command: "kubectl scale deployment/api --replicas=3"},
      {title: "Verifique a rota do serviço", body: "Consulte /health pelo endereço interno api.default.svc no laboratório. O nome identifica o Service api no namespace default e continua sendo usado quando a quantidade de pods muda.", command: "curl http://api.default.svc/health"},
      {title: "Leia o log da aplicação", body: "Peça os registros de um pod do Deployment api. Use a saída para complementar o que você observou na consulta HTTP.", command: "kubectl logs deployment/api"}
    ],
    challenge: "Compare a lista de pods antes e depois da escala e mostre o endereço que usou para acessar a API. Explique por que o consumidor pode continuar usando esse mesmo nome com três réplicas.",
    reference: {title: "Kubernetes · Escalando uma aplicação", url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/scale/scale-intro/"}
  }
];
