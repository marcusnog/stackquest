const labGuides = [
  {
    id: "vps", title: "Coloque uma VPS no ar",
    intro: "Seu primeiro servidor vai atender requisições de saúde na porta 8080. Use o terminal do simulador para criar a máquina e acompanhe o que precisa acontecer entre ligar a VPS e receber uma resposta HTTP.",
    prerequisites: "Em uma execução nova, você está no terminal do workspace. A lista de VPS está vazia. A máquina que você criar já terá o código de exemplo de app.js.",
    goal: "Deixe a sessão SSH em web-01 com a porta 8080 aberta e o serviço app ativo. A validação precisa receber HTTP 200 com corpo ok em /health.",
    steps: [
      {
        title: "Crie a máquina",
        body: "No terminal do workspace, execute o comando abaixo. Depois rode vps list e localize web-01 na coluna de nome.",
        command: "vps create web-01",
        why: "Provisionar cria a máquina que receberá o tráfego. Neste ponto o firewall está fechado e o processo da aplicação está parado.",
        expected: "A saída informa “VPS web-01 provisionada. Firewall fechado. Serviço app parado.”. A listagem identifica a rede pública.",
        troubleshoot: "Se aparecer “O recurso web-01 já existe”, confira a máquina com vps list e continue a partir do estado listado."
      },
      {
        title: "Entre na VPS",
        body: "Execute o comando de conexão e em seguida digite hostname para conferir o destino da sessão.",
        command: "ssh web-01",
        why: "Os comandos de firewall e de gerenciamento de serviços atuam no host selecionado por SSH. No workspace, hostname exibe workspace.",
        expected: "O terminal responde “Sessão de administração em web-01.” e hostname devolve web-01.",
        troubleshoot: "Se aparecer “Host web-01 não encontrado”, execute vps list. Crie a máquina com o nome web-01 se ela estiver ausente."
      },
      {
        title: "Libere a porta da aplicação",
        body: "Na sessão web-01, execute o comando abaixo e confira a regra com ufw status.",
        command: "ufw allow 8080",
        why: "A requisição TCP precisa chegar à porta em que a aplicação recebe conexões. Uma porta liberada permite a passagem pelo firewall mesmo que o serviço ainda esteja parado.",
        expected: "Aparece “Entrada TCP/8080 permitida.”. O comando ufw status inclui 8080 na entrada permitida.",
        troubleshoot: "Se o host estiver ausente ou hostname mostrar workspace, execute ssh web-01. Se a lista de portas mostrar outro número, repita a regra com 8080."
      },
      {
        title: "Inicie o serviço",
        body: "Na mesma sessão, execute o comando e depois consulte systemctl status app.",
        command: "systemctl start app",
        why: "O gerenciador de serviços inicia o processo app. É esse processo que interpreta /health e devolve o corpo da resposta HTTP.",
        expected: "O início e a consulta de estado mostram “app.service: active (running)”.",
        troubleshoot: "Se o terminal pedir uma sessão, entre com ssh web-01. Se o estado for inactive (dead), execute systemctl start app novamente."
      },
      {
        title: "Consulte a rota de saúde",
        body: "Execute a consulta com http://, o nome web-01, a porta 8080 e o caminho /health. Mantenha a sessão SSH aberta e clique em Validar lab.",
        command: "curl http://web-01:8080/health",
        why: "Esta consulta exercita a máquina, o firewall, o processo e o código da rota. A validação repete a chamada e verifica o corpo recebido.",
        expected: "O terminal apresenta HTTP 200 e, na linha seguinte, ok. A validação informa “Ambiente validado. GET /health → 200 ok.”.",
        troubleshoot: "Timeout indica que falta liberar 8080. Connection refused com essa porta aberta pede verificar systemctl status app. HTTP 404 pede conferir a grafia de /health."
      }
    ],
    challenge: "Em uma nova execução, consulte /health depois de liberar a porta e antes de iniciar o serviço. Compare o resultado com a consulta após o início da aplicação. Que evidência distingue uma porta liberada de um processo atendendo?",
    reference: {title: "Ubuntu Server · Regras de firewall com UFW", url: "https://ubuntu.com/server/docs/how-to/security/firewalls/"}
  },
  {
    id: "deploy", title: "Publique uma versão da aplicação",
    intro: "Entregue uma alteração em app.js ao servidor web-01. Compare três evidências ao longo do caminho: o teste do código editado, a resposta do serviço publicado e os registros da execução.",
    prerequisites: "Em uma execução nova, web-01 está ativa com a porta 8080 liberada e a sessão SSH já aberta. O host inicia com a aplicação saudável. A cópia de app.js no editor contém uma regressão proposital em /health. tests.json define três casos.",
    goal: "Faça os três testes passarem, implante exatamente o código testado e confirme HTTP 200 com corpo ok em /health. A validação também verifica a rota inicial e a resposta 404 para um caminho desconhecido.",
    steps: [
      {
        title: "Edite app.js",
        body: "Selecione app.js na IDE. No bloco de /health, troque { status: 503, body: \"indisponível\" } por { status: 200, body: \"ok\" }. Preserve a instrução return, as outras rotas e o restante da função handle. O editor salva automaticamente.",
        command: "",
        why: "O código de status e o corpo fazem parte do contrato da rota. O editor contém a versão que você vai testar e publicar. O servidor continua com sua própria cópia até o deploy.",
        expected: "Ao executar cat app.js, o retorno de /health contém status: 200 e body: \"ok\". A rota / continua devolvendo StackQuest API.",
        troubleshoot: "Se ainda houver dúvida sobre o retorno, abra tests.json e leia o caso de /health. Na aba app.js, mantenha as aspas, as chaves e a grafia minúscula de ok."
      },
      {
        title: "Teste o código editado",
        body: "Execute npm test. Leia as linhas de /health, / e /desconhecida. Após qualquer edição em app.js ou tests.json, execute os testes outra vez.",
        command: "npm test",
        why: "O simulador executa a função handle da versão do editor para cada caso de tests.json e compara os resultados com o contrato descrito.",
        expected: "A saída tem três linhas PASS e termina com “3/3 testes passaram.”. /desconhecida devolve 404.",
        troubleshoot: "Se /health mostrar FAIL com 503, corrija app.js conforme a etapa anterior. Se aparecer um erro de JavaScript, confira chaves e aspas em handle antes de testar novamente."
      },
      {
        title: "Envie a versão para a VPS",
        body: "Após os três testes passarem, execute o deploy abaixo para web-01. Leia o número da release na saída.",
        command: "deploy web-01",
        why: "O deploy copia o app.js atual para o host, registra uma nova release e ativa o serviço. Esse passo liga a versão testada à máquina que será consultada.",
        expected: "Na primeira publicação, o terminal mostra “Release 1 de app.js instalada em web-01:8080.”. Novos deploys avançam o número da release.",
        troubleshoot: "Se aparecer “Host web-01 não encontrado”, confira o nome em vps list. Se editou o arquivo depois dos testes, repita npm test e deploy web-01 nessa ordem."
      },
      {
        title: "Confira a aplicação publicada",
        body: "Faça a requisição ao endereço de web-01 e confira tanto o status quanto o corpo antes de seguir para os registros.",
        command: "curl http://web-01:8080/health",
        why: "A chamada executa a cópia publicada no servidor. Como a VPS começa saudável, uma resposta ok sozinha não comprova que a edição foi testada e implantada.",
        expected: "O terminal mostra HTTP 200 seguido de ok. A requisição deixa uma linha GET /health 200 no diário da aplicação.",
        troubleshoot: "Se vier HTTP 503, revise o trecho de /health, rode npm test e publique a versão corrigida. Se a validação pedir a versão testada, confirme que o deploy veio depois da última edição."
      },
      {
        title: "Consulte os registros",
        body: "Execute o comando na sessão de web-01. Localize a release iniciada e a requisição GET /health correspondente. Clique em Validar lab.",
        command: "journalctl -u app",
        why: "O diário associa eventos de publicação e de atendimento ao processo do host. A validação compara arquivos testados e publicados e repete o contrato da aplicação.",
        expected: "Na primeira execução completa, aparecem “release 1 iniciada” e “GET /health 200”. A validação informa que o ambiente foi validado.",
        troubleshoot: "Se aparecer “Sem eventos.”, confira hostname, faça deploy web-01 e repita a requisição. Se tiver saído da sessão, volte com ssh web-01."
      }
    ],
    challenge: "Depois de um deploy bem-sucedido, altere o código no editor e consulte novamente a VPS antes de publicar. Qual versão responde? Registre a diferença entre um teste local aprovado e uma versão em execução.",
    reference: {title: "npm · Execução do teste do projeto", url: "https://docs.npmjs.com/cli/v11/commands/npm-test/"}
  },
  {
    id: "cloud", title: "Monte uma infraestrutura em nuvem",
    intro: "Construa o caminho de uma requisição do cliente até a API. Os comandos cloud pertencem ao emulador e representam recursos encontrados em provedores de nuvem: rede, instância, regra de entrada e balanceador.",
    prerequisites: "Em uma execução nova, o workspace tem app.js e tests.json. O inventário de nuvem está vazio. A aplicação de exemplo atende /health quando publicada.",
    goal: "Conecte entrada, na porta 80, a api-01 na rede privada. Publique app.js, abra a porta 8080 no alvo e obtenha HTTP 200 com corpo ok pelo balanceador.",
    steps: [
      {
        title: "Crie a rede",
        body: "Crie uma rede com o nome literal privada. Depois use cloud list para localizar a seção Redes.",
        command: "cloud network create privada",
        why: "A rede fornece o local em que a instância será conectada. O próximo comando procura por esse nome no inventário do simulador.",
        expected: "A confirmação é “Rede privada privada criada.”. Em cloud list aparece “Redes: privada”.",
        troubleshoot: "Se aparecer “Essa rede já existe”, verifique privada em cloud list e prossiga. Se criou outro nome, crie também a rede privada exigida pela missão."
      },
      {
        title: "Adicione a instância",
        body: "Execute a criação de api-01 com a opção --network privada. Em cloud list, confira a rede, as portas e o estado da aplicação.",
        command: "cloud instance create api-01 --network privada",
        why: "A opção --network liga a instância à rede existente. A máquina começa com firewall fechado e aplicação parada. Clientes externos usarão o balanceador para alcançá-la.",
        expected: "O terminal mostra “Instância api-01 na rede privada.”. A listagem contém api-01, privada e app parado.",
        troubleshoot: "Se aparecer “Crie a rede antes da instância”, volte à criação de privada. Se api-01 já existir, verifique sua rede com cloud list."
      },
      {
        title: "Permita o tráfego da API",
        body: "Execute o comando de firewall usando api-01 e a porta 8080. Leia a linha da instância em cloud list para confirmar a regra.",
        command: "cloud firewall allow api-01 8080",
        why: "O balanceador entrega a requisição na porta 8080 da instância. A liberação dessa porta permite a travessia mesmo dentro da infraestrutura privada.",
        expected: "O terminal mostra “Entrada TCP/8080 permitida.”. A porta 8080 passa a constar na linha da instância.",
        troubleshoot: "Se aparecer “Host api-01 não encontrado”, confirme a etapa de criação e o nome exato. Se a consulta posterior indicar Timeout, revise a lista de portas."
      },
      {
        title: "Publique a aplicação",
        body: "Publique o app.js do editor em api-01 com o comando abaixo. Confira em cloud list que app passou para ativo.",
        command: "deploy api-01",
        why: "A instância precisa de um processo atendendo para devolver resultados ao balanceador. O deploy copia a aplicação e inicia uma release na porta 8080.",
        expected: "Na primeira publicação aparece “Release 1 de app.js instalada em api-01:8080.”.",
        troubleshoot: "Se faltar o host, consulte cloud list. Se a requisição indicar Connection refused apesar da regra de entrada, repita deploy api-01 e confira o estado ativo."
      },
      {
        title: "Conecte o balanceador",
        body: "Crie entrada usando --target api-01 e confira em cloud list a associação entre os dois nomes.",
        command: "cloud lb create entrada --target api-01",
        why: "O cliente acessa entrada na porta 80. O listener encaminha a conexão para a porta 8080 de api-01. Com apenas um alvo, a disponibilidade ainda depende daquela instância.",
        expected: "A mensagem é “Listener entrada:80 → api-01:8080.”. A listagem inclui “entrada → api-01”.",
        troubleshoot: "Se aparecer “Alvo api-01 não encontrado”, crie a instância na rede privada. Se entrada já existir, veja em cloud list para onde ela aponta."
      },
      {
        title: "Teste o caminho completo",
        body: "Execute a consulta pelo endereço de entrada, sem acrescentar :8080. Confira o resultado e clique em Validar lab.",
        command: "curl http://entrada/health",
        why: "A chamada verifica se o listener na porta 80 alcança o alvo privado pela porta permitida e recebe a resposta do código publicado.",
        expected: "O terminal mostra HTTP 200 e ok. A validação verifica também a associação de entrada a api-01, a rede privada e a existência de uma release.",
        troubleshoot: "“Sem rota pública” indica acesso direto à instância privada. Use entrada. Em caso de Timeout confira o firewall de api-01 e, com Connection refused, o estado do app."
      }
    ],
    challenge: "Descreva o caminho da requisição e diga qual componente consulta o cliente. Com apenas api-01 como destino, o que aconteceria se essa instância parasse? Desenhe uma mudança para tolerar a perda dela.",
    reference: {title: "AWS · Componentes de um Application Load Balancer", url: "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html"}
  },
  {
    id: "k8s", title: "Execute e escale uma API no Kubernetes",
    intro: "Declare como a API deve rodar, dê a ela um endereço estável no cluster e aumente o número de cópias. O Deployment mantém a quantidade desejada de pods. O Service encaminha requisições aos pods que correspondem ao seu seletor.",
    prerequisites: "Em uma execução nova, o terminal já oferece kubeadm e kubectl. O cluster começa sem control plane nem workers. app.js, deployment.yaml e service.yaml estão prontos na IDE. A imagem disponível no simulador é app:local.",
    goal: "Inicialize o cluster com um worker pronto, execute três réplicas de api com app:local e conecte o Service api a elas. Valide que api.default.svc atende /health na porta 80 com HTTP 200 e corpo ok.",
    steps: [
      {
        title: "Inicialize o control plane",
        body: "Execute o comando com --node-name control-01. Leia a saída até a linha de ingresso, que contém o endereço do control plane e o token do exercício.",
        command: "kubeadm init --node-name control-01",
        why: "O control plane fornece a API pela qual kubectl cria e consulta recursos. O emulador configura a rede de pods nesta etapa.",
        expected: "A saída informa “Control plane ativo em control-01:6443” e exibe a instrução kubeadm join para worker-01.",
        troubleshoot: "Se aparecer “O control plane já foi inicializado”, use kubectl get nodes para ver o nó existente. Com control-01 pronto, siga para o ingresso do worker."
      },
      {
        title: "Adicione um worker",
        body: "Execute a linha completa de ingresso abaixo, incluindo :6443, --token e --node-name worker-01.",
        command: "kubeadm join control-01:6443 --token abcdef.0123456789abcdef --node-name worker-01",
        why: "O worker oferece o nó em que os pods podem rodar. A porta aponta para a API do cluster e o token didático identifica o ingresso autorizado neste exercício.",
        expected: "A confirmação é “node/worker-01 Ready. O agendador já pode alocar pods.”.",
        troubleshoot: "Para “Endpoint ou token de ingresso inválido”, compare o comando com a saída da inicialização. Se o nó já existir, confira worker-01 com kubectl get nodes."
      },
      {
        title: "Confira os nós",
        body: "Liste os nós e leia as colunas de nome, estado e papel. Confirme a presença de control-01 e worker-01 antes de aplicar os arquivos.",
        command: "kubectl get nodes",
        why: "Control plane e worker têm responsabilidades diferentes. Neste emulador, um Deployment pode ser declarado antes do ingresso do worker, mas os pods ficam em espera.",
        expected: "A tabela contém control-01 como Ready e control-plane e worker-01 como Ready e worker.",
        troubleshoot: "Se apenas o control plane aparecer, execute o ingresso do worker. “Cluster indisponível” pede voltar à inicialização do cluster."
      },
      {
        title: "Aplique o Deployment",
        body: "Abra deployment.yaml. Confira name: api, replicas: 1, image: app:local e containerPort: 8080. Veja que matchLabels e o template usam app: api. Execute o comando de aplicação do arquivo.",
        command: "kubectl apply -f deployment.yaml",
        why: "O Deployment descreve o estado desejado. O seletor associa o controlador aos pods do template. O emulador usa o conteúdo atual de app.js ao aplicar o manifesto.",
        expected: "Com o arquivo inicial, aparece “deployment.apps/api configurado · 1 réplica(s).”.",
        troubleshoot: "Se houver erro de seletor, deixe app: api tanto em spec.selector.matchLabels quanto em spec.template.metadata.labels. Para erro de YAML, confira a linha indicada e a indentação antes de reaplicar."
      },
      {
        title: "Inspecione os pods",
        body: "Liste os pods. Localize o pod com prefixo api-, anote o estado e o nó em que ele foi colocado. Guarde a contagem para comparar depois da escala.",
        command: "kubectl get pods",
        why: "A lista mostra o estado observado dos pods. Um Deployment definido ainda pode ter réplicas pendentes de nó ou com imagem indisponível.",
        expected: "Com os arquivos iniciais e o worker pronto, há um pod api-… em Running no worker-01.",
        troubleshoot: "Pending pede conferir kubectl get nodes e adicionar o worker. ImagePullBackOff pede definir image: app:local em deployment.yaml e reaplicar o arquivo."
      },
      {
        title: "Crie o Service",
        body: "Abra service.yaml. Confira name: api, selector com app: api, port: 80 e targetPort: 8080. Aplique o arquivo e inspecione o resultado com kubectl get svc.",
        command: "kubectl apply -f service.yaml",
        why: "O Service dá um nome estável ao grupo de pods. O seletor aproxima o serviço dos pods rotulados e a porta de destino precisa coincidir com a porta da aplicação.",
        expected: "Aparece “service/api configurado.”. Em kubectl get svc, a linha de api mostra 80, 8080 e app=api.",
        troubleshoot: "Se aparecer campo obrigatório ausente, confira as seções spec.selector e spec.ports em service.yaml. Um Service criado com seletor incorreto só revelará a falta de destinos na consulta HTTP."
      },
      {
        title: "Aumente a capacidade",
        body: "Execute a escala para três réplicas. Confira o resultado com kubectl get deployments e kubectl get pods antes de prosseguir.",
        command: "kubectl scale deployment/api --replicas=3",
        why: "O número após --replicas= altera o estado desejado do Deployment existente. O controlador cria os pods adicionais a partir do mesmo template.",
        expected: "O terminal mostra “deployment.apps/api escalado para 3.”. A listagem de Deployments deve indicar 3/3 e a de pods deve conter três em Running.",
        troubleshoot: "Se api estiver ausente, reaplique deployment.yaml e repita a escala. Se READY/DESIRED mostrar 0/3, verifique a imagem dos pods e a presença de worker-01."
      },
      {
        title: "Verifique a rota do serviço",
        body: "Execute a consulta pelo nome interno api.default.svc. Repita a mesma chamada para gerar registros de atendimento por réplicas diferentes.",
        command: "curl http://api.default.svc/health",
        why: "O nome identifica o Service api no namespace default. Neste emulador, cada chamada é encaminhada ao próximo pod compatível com o seletor e a porta de destino.",
        expected: "Cada chamada retorna HTTP 200 e ok. O endereço permanece o mesmo com três réplicas.",
        troubleshoot: "Para “503 Service Unavailable · sem endpoints”, confira pods Running, imagem app:local, selector app: api e targetPort: 8080. Porta incorreta do Service pede consultar a porta 80."
      },
      {
        title: "Leia o log da aplicação",
        body: "Execute o comando abaixo e leia o nome do pod no início de cada registro. Em seguida, clique em Validar lab.",
        command: "kubectl logs deployment/api",
        why: "O emulador reúne neste comando as requisições registradas no Deployment. O nome do pod indica qual réplica atendeu cada chamada enviada pelo Service.",
        expected: "A saída contém o nome de um pod seguido de “GET /health 200”. Com consultas repetidas aparecem outros pods. A validação confirma o ambiente.",
        troubleshoot: "Se aparecer “Sem requisições registradas”, faça uma consulta bem-sucedida a /health pelo Service e releia os logs. Se a validação reclamar das réplicas, consulte kubectl get deployments."
      }
    ],
    challenge: "Compare a lista de pods antes e depois da escala e mostre o endereço que usou para acessar a API. Explique por que o consumidor pode continuar usando esse mesmo nome com três réplicas.",
    reference: {title: "Kubernetes · Escalando uma aplicação", url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/scale/scale-intro/"}
  }
];
