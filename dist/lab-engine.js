const starterApp = `// Contrato: handle recebe {method, path} e devolve {status, body}.
function handle(request) {
  if (request.path === "/health") {
    return { status: 200, body: "ok" };
  }
  if (request.path === "/") {
    return { status: 200, body: "StackQuest API" };
  }
  return { status: 404, body: "Rota desconhecida" };
}`;
const deploymentYaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: app:local
          ports:
            - containerPort: 8080`;
const serviceYaml = `apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 8080`;
const defaultTests=[
  {path:'/health',status:200,body:'ok'},
  {path:'/',status:200,body:'StackQuest API'},
  {path:'/desconhecida',status:404}
];
function hostConfig(network='pública') {return {network,ports:[],running:false,source:starterApp,release:0,logs:[]};}
function newLab(id) {
  const state={schema:1,files:{'app.js':id==='deploy'?starterApp.replace('status: 200, body: "ok"','status: 503, body: "indisponível"'):starterApp,
    'tests.json':JSON.stringify(defaultTests,null,2)},hosts:{},networks:[],balancers:{},ssh:null,deployments:{},services:{},lastTest:null,seq:0,earned:false,log:[]};
  if(id==='deploy') {state.hosts['web-01']={...hostConfig(),ports:[8080],running:true};state.ssh='web-01';}
  state.cluster={control:null,workers:[]};
  if(id==='k8s') Object.assign(state.files,{'deployment.yaml':deploymentYaml,'service.yaml':serviceYaml});
  return state;
}
function getItem(table,name,kind) {
  if(!Object.hasOwn(table,name))throw Error(kind+' '+name+' não encontrado.');
  return table[name];
}
function newName(table,name) {
  if(!/^[a-z][a-z0-9-]{0,40}$/.test(name)||name in Object.prototype)throw Error('Use um nome curto em minúsculas, com letras, números e hífen.');
  if(Object.hasOwn(table,name))throw Error('O recurso '+name+' já existe.');
}
function numberIn(value,min,max,label) {
  if(!/^\d+$/.test(String(value))||+value<min||+value>max)throw Error(label+' deve estar entre '+min+' e '+max+'.');
  return Number(value);
}
function logHost(host,line) {host.logs.push(line);host.logs=host.logs.slice(-60);}
// Flatten the supported YAML subset, preserving indentation and sequence indexes.
function manifest(text) {
  const fields=new Map(),parents=[{indent:-1,path:''}],indices=new Map();
  for(const [lineNumber,raw] of text.split(/\r?\n/).entries()) {
    const line=raw.replace(/\s+#.*$/,'').trimEnd();
    if(!line.trim()||line.trimStart().startsWith('#'))continue;
    const match=/^( *)(- )?([\w-]+):(?:\s+(.*))?$/.exec(line);
    if(!match)throw Error('YAML fora do formato suportado na linha '+(lineNumber+1)+'.');
    const [,spaces,item,key,rawValue]=match,indent=spaces.length;
    while(parents.length>1&&parents.at(-1).indent>=indent)parents.pop();
    let parent=parents.at(-1).path;
    if(item){const index=indices.get(parent)||0;indices.set(parent,index+1);parent+=(parent?'.':'')+index;parents.push({indent,path:parent});}
    const path=(parent?parent+'.':'')+key;
    if(fields.has(path))throw Error('Campo YAML duplicado: '+path);
    const value=(rawValue||'').trim().replace(/^"(.*)"$/,'$1').replace(/^'(.*)'$/,'$1');
    fields.set(path,value);
    if(!value)parents.push({indent:indent+(item?2:0),path});
  }
  return fields;
}
function reconcile(state,name) {
  const d=state.deployments[name];
  while(d.pods.length>d.replicas)d.pods.pop();
  while(d.pods.length<d.replicas)d.pods.push(name+'-'+String(++state.seq).padStart(4,'0'));
}
function applyYaml(s,filename) {
  if(!Object.hasOwn(s.files,filename))throw Error('Arquivo ausente: '+filename);
  const fields=manifest(s.files[filename]);
  function required(key) {const v=fields.get(key);if(!v)throw Error('Campo obrigatório ausente: '+key);return v;}
  const name=required('metadata.name'),kind=required('kind');
  newName({},name);
  if(kind==='Deployment') {
    if(required('apiVersion')!=='apps/v1')throw Error('Use apps/v1 para Deployment.');
    const selector=required('spec.selector.matchLabels.app'), label=required('spec.template.metadata.labels.app');
    if(selector!==label)throw Error('O seletor do Deployment precisa corresponder ao label app do template.');
    const replicas=numberIn(fields.get('spec.replicas')??1,0,20,'Réplicas');
    const image=required('spec.template.spec.containers.0.image');
    const port=numberIn(required('spec.template.spec.containers.0.ports.0.containerPort'),1,65535,'containerPort');
    const old=s.deployments[name],source=s.files['app.js'];
    const same=old&&old.image===image&&old.source===source&&old.port===port&&old.label===label;
    s.deployments[name]={label,image,replicas,port,source,pods:same?old.pods:[],logs:same?old.logs:[]};
    reconcile(s,name);return 'deployment.apps/'+name+' configurado · '+replicas+' réplica(s).';
  }
  if(kind==='Service'){
    if(required('apiVersion')!=='v1')throw Error('Use v1 para Service.');
    const selector=required('spec.selector.app');
    const port=numberIn(required('spec.ports.0.port'),1,65535,'port');
    const targetPort=numberIn(fields.get('spec.ports.0.targetPort')??port,1,65535,'targetPort');
    s.services[name]={selector,port,targetPort,requests:0};return 'service/'+name+' configurado.';
  }
  throw Error('O cluster didático suporta Deployment e Service.');
}
async function requestLab(s,address) {
  const url=new URL(address);
  if(url.protocol!=='http:')throw Error('Use http:// para consultar a rede emulada.');
  const host=url.hostname,port=Number(url.port||80);
  let source,log;
  if(host.endsWith('.default.svc')){
    const svc=getItem(s.services,host.slice(0,-12),'Service');
    if(port!==svc.port)throw Error('Connection refused · porta incorreta do Service.');
    const endpoints=Object.values(s.deployments).filter(d=>s.cluster.workers.length&&d.label===svc.selector&&d.port===svc.targetPort&&d.image==='app:local').flatMap(d=>d.pods.map(pod=>({pod,d})));
    if(!endpoints.length)throw Error('503 Service Unavailable · sem endpoints. Verifique réplicas, imagem, selector e targetPort.');
    const endpoint=endpoints[svc.requests++%endpoints.length];source=endpoint.d.source;
    log=line=>logHost(endpoint.d,endpoint.pod+' '+line);
  }else{
    const lb=Object.hasOwn(s.balancers,host)?s.balancers[host]:null;
    if(lb&&port!==80)throw Error('O balanceador atende na porta 80.');
    const machine=getItem(s.hosts,lb?lb.target:host,'Host');
    const targetPort=lb?8080:port;
    if(!lb&&machine.network!=='pública'&&s.ssh!==host)throw Error('Sem rota pública para esta instância privada. Use o balanceador.');
    if(!machine.ports.includes(targetPort))throw Error('Timeout · o firewall bloqueia a porta '+targetPort+'.');
    if(targetPort!==8080||!machine.running)throw Error('Connection refused · o serviço app precisa estar ativo na porta 8080.');
    source=machine.source;log=line=>logHost(machine,line);
  }
  try{
    const [r]=await runProgram(source,[{method:'GET',path:url.pathname}]);
    log('GET '+url.pathname+' '+r.status);return r;
  }catch(error){log('ERRO '+error.message);throw error;}
}
async function runTests(s,progress){
  s.lastTest=null;
  const source=s.files['app.js'],spec=s.files['tests.json'],tests=JSON.parse(spec);
  if(!Array.isArray(tests)||tests.length<1||tests.length>30||tests.some(t=>!t||typeof t.path!=='string'||!Number.isInteger(t.status)))throw Error('tests.json deve conter de 1 a 30 casos com path e status.');
  const requests=tests.map(t=>({method:'GET',path:t.path}));
  const lines=[];
  let passed=0;
  function record(result,i){
    const t=tests[i],ok=t.status===result.status&&(!Object.hasOwn(t,'body')||t.body===result.body);
    if(ok)passed++;
    const line=(ok?'PASS':'FAIL')+'  GET '+t.path+'  → '+result.status+' '+result.body+(ok?'':'  (esperado '+t.status+' '+(t.body??'')+')');
    lines.push(line);
    return progress?.(line,ok?'pass':'error',ok?undefined:t);
  }
  if(progress){
    await progress('Executando '+tests.length+' testes de app.js…');
    for(const [i,request] of requests.entries()){
      let result;
      try{[result]=await runProgram(source,[request]);}
      catch(error){throw Object.assign(Error('GET '+request.path+' · '+error.message),{testCase:tests[i]});}
      await record(result,i);
    }
  }else (await runProgram(source,requests)).forEach(record);
  if(passed===tests.length)s.lastTest={source,tests:spec};
  const summary=passed+'/'+tests.length+' testes passaram.';
  return progress?summary:[...lines,summary].join('\n');
}
function hostRows(s){return Object.entries(s.hosts).map(([name,h])=>name+'  '+h.network+'  app '+(h.running?'ativo':'parado')+'  portas '+(h.ports.join(',')||'—')).join('\n')||'Nenhuma instância provisionada.';}
async function labCommand(s,input,progress) {
  const cmd=input.trim().replace(/\s+/g,' ');let m;
  if(cmd==='help')return 'Arquivos: ls, cat ARQUIVO, npm test\nVPS: vps create NOME, vps list, ssh NOME, hostname, exit\nHost: ufw allow PORTA, ufw status, systemctl start|stop|status app, journalctl -u app\nDeploy: deploy HOST, curl http://HOST:8080/health\nCloud: cloud network create REDE, cloud instance create HOST --network REDE, cloud firewall allow HOST PORTA, cloud lb create LB --target HOST, cloud list\nKubernetes: kubectl apply -f ARQUIVO, kubectl get pods|deployments|svc, kubectl scale deployment/NOME --replicas=N, kubectl delete pod NOME, kubectl logs deployment/NOME';
  if(cmd==='ls')return Object.keys(s.files).join('  ');
  if((m=/^cat (\S+)$/.exec(cmd)))return getItem(s.files,m[1],'Arquivo');
  if(cmd==='npm test')return runTests(s,progress);
  if(cmd==='hostname')return s.ssh||'workspace';
  if(cmd==='exit'){s.ssh=null;return 'Você está no terminal do workspace.';}
  if(cmd==='vps list'||cmd==='cloud list')return hostRows(s)+(s.networks.length?'\nRedes: '+s.networks.join(', '):'')+(Object.keys(s.balancers).length?'\nBalanceadores: '+Object.entries(s.balancers).map(([k,v])=>k+' → '+v.target).join(', '):'');
  if((m=/^vps create (\S+)$/.exec(cmd))){newName(s.hosts,m[1]);s.hosts[m[1]]=hostConfig();return 'VPS '+m[1]+' provisionada. Firewall fechado. Serviço app parado.';}
  if((m=/^ssh (\S+)$/.exec(cmd))){getItem(s.hosts,m[1],'Host');s.ssh=m[1];return 'Sessão de administração em '+m[1]+'.';}
  if((m=/^cloud network create (\S+)$/.exec(cmd))){newName({},m[1]);if(s.networks.includes(m[1]))throw Error('Essa rede já existe.');s.networks.push(m[1]);return 'Rede privada '+m[1]+' criada.';}
  if((m=/^cloud instance create (\S+) --network (\S+)$/.exec(cmd))){newName(s.hosts,m[1]);if(!s.networks.includes(m[2]))throw Error('Crie a rede antes da instância.');s.hosts[m[1]]=hostConfig(m[2]);return 'Instância '+m[1]+' na rede '+m[2]+'.';}
  if((m=/^cloud lb create (\S+) --target (\S+)$/.exec(cmd))){newName(s.balancers,m[1]);getItem(s.hosts,m[2],'Alvo');s.balancers[m[1]]={target:m[2]};return 'Listener '+m[1]+':80 → '+m[2]+':8080.';}
  if((m=/^(?:cloud firewall allow (\S+)|ufw allow) (\d+)$/.exec(cmd))){const h=getItem(s.hosts,m[1]||s.ssh,'Host');const port=numberIn(m[2],1,65535,'Porta');if(!h.ports.includes(port))h.ports.push(port);return 'Entrada TCP/'+port+' permitida.';}
  if((m=/^deploy (\S+)$/.exec(cmd))){
    const host=m[1],h=getItem(s.hosts,host,'Host'),source=s.files['app.js'];
    if(progress){
      await progress('Conexão com '+host+' estabelecida.');
      await progress('Preparando app.js para publicação…');
      await progress('Iniciando o serviço app em '+host+':8080…');
    }
    const release=h.release+1;
    h.source=source;h.release=release;h.running=true;logHost(h,'release '+release+' iniciada');
    return 'Release '+release+' de app.js instalada em '+host+':8080.';
  }
  if(cmd==='ufw status'||cmd==='journalctl -u app'||cmd.startsWith('systemctl ')){
    if(!s.ssh)throw Error('Abra a sessão do host com ssh NOME.');
    const h=s.hosts[s.ssh];
    if(cmd==='ufw status')return 'Entrada permitida: '+(h.ports.join(', ')||'nenhuma');
    if(cmd==='journalctl -u app')return h.logs.join('\n')||'Sem eventos.';
    if(cmd==='systemctl start app'||cmd==='systemctl stop app'){h.running=cmd.includes('start');logHost(h,'app '+(h.running?'iniciado':'parado'));}
    else if(cmd!=='systemctl status app')throw Error('Use systemctl start, stop ou status app.');
    return 'app.service: '+(h.running?'active (running)':'inactive (dead)');
  }
  if((m=/^curl (http:\/\/\S+)$/.exec(cmd))){const r=await requestLab(s,m[1]);return 'HTTP '+r.status+'\n'+r.body;}
  if((m=/^kubeadm init --node-name (\S+)$/.exec(cmd))){
    newName({},m[1]);if(s.cluster.control)throw Error('O control plane já foi inicializado.');
    s.cluster.control=m[1];return 'Control plane ativo em '+m[1]+':6443. Rede de pods didática pronta.\nNo worker, execute kubeadm join '+m[1]+':6443 --token abcdef.0123456789abcdef --node-name worker-01';
  }
  if((m=/^kubeadm join (\S+):6443 --token (\S+) --node-name (\S+)$/.exec(cmd))){
    if(m[1]!==s.cluster.control||m[2]!=='abcdef.0123456789abcdef')throw Error('Endpoint ou token de ingresso inválido.');
    newName({},m[3]);if(s.cluster.workers.includes(m[3])||m[3]===s.cluster.control)throw Error('Esse nó já existe.');
    s.cluster.workers.push(m[3]);return 'node/'+m[3]+' Ready. O agendador já pode alocar pods.';
  }
  if(cmd.startsWith('kubectl ')&&!s.cluster.control)throw Error('Cluster indisponível. Inicialize o control plane com kubeadm init --node-name control-01.');
  if(cmd==='kubectl get nodes')return ['NAME       STATUS   ROLE',s.cluster.control+'  Ready    control-plane',...s.cluster.workers.map(n=>n+'  Ready    worker')].join('\n');
  if((m=/^kubectl apply -f (\S+)$/.exec(cmd)))return applyYaml(s,m[1]);
  if(cmd==='kubectl get pods')return ['NAME             STATUS           NODE',...Object.values(s.deployments).flatMap(d=>d.pods.map((p,i)=>p+'         '+(!s.cluster.workers.length?'Pending':d.image==='app:local'?'Running':'ImagePullBackOff')+'        '+(s.cluster.workers[i%s.cluster.workers.length]||'—')))].join('\n');
  if(cmd==='kubectl get deployments')return ['NAME   READY/DESIRED',...Object.entries(s.deployments).map(([n,d])=>n+'    '+(s.cluster.workers.length&&d.image==='app:local'?d.pods.length:0)+'/'+d.replicas)].join('\n');
  if(cmd==='kubectl get svc')return ['NAME   PORT   TARGET   SELECTOR',...Object.entries(s.services).map(([n,v])=>[n,v.port,v.targetPort,'app='+v.selector].join('    '))].join('\n');
  if((m=/^kubectl scale deployment\/(\S+) --replicas=(\d+)$/.exec(cmd))){const d=getItem(s.deployments,m[1],'Deployment');d.replicas=numberIn(m[2],0,20,'Réplicas');reconcile(s,m[1]);return 'deployment.apps/'+m[1]+' escalado para '+d.replicas+'.';}
  if((m=/^kubectl delete pod (\S+)$/.exec(cmd))){const entry=Object.entries(s.deployments).find(([,d])=>d.pods.includes(m[1]));if(!entry)throw Error('Pod inexistente.');entry[1].pods=entry[1].pods.filter(p=>p!==m[1]);reconcile(s,entry[0]);return 'Pod removido. O controlador reconciliou o número de réplicas.';}
  if((m=/^kubectl logs deployment\/(\S+)$/.exec(cmd)))return getItem(s.deployments,m[1],'Deployment').logs.join('\n')||'Sem requisições registradas.';
  throw Error('Comando fora do terminal didático. Digite help para ver a sintaxe disponível.');
}
async function checkLab(id,s) {
  let address;
  if(id==='vps'){if(s.ssh!=='web-01')throw Error('Abra a sessão SSH em web-01.');address='http://web-01:8080/health';}
  if(id==='deploy'){
    const h=getItem(s.hosts,'web-01','Host');
    if(!s.lastTest||s.lastTest.source!==s.files['app.js']||s.lastTest.tests!==s.files['tests.json'])throw Error('Execute npm test e corrija os testes que falharem.');
    if(!h.release||h.source!==s.files['app.js'])throw Error('Implante a versão testada em web-01.');
    const responses=await runProgram(h.source,defaultTests.map(t=>({method:'GET',path:t.path})));
    if(defaultTests.some((t,i)=>t.status!==responses[i].status||(t.body!=null&&t.body!==responses[i].body)))throw Error('O contrato de aceitação exige GET /health → 200 ok, GET / → 200 StackQuest API e 404 em rotas desconhecidas.');
    address='http://web-01:8080/health';
  }
  if(id==='cloud'){
    if(s.hosts['api-01']?.network!=='privada'||!s.hosts['api-01'].release||s.balancers.entrada?.target!=='api-01')throw Error('Conecte entrada à instância api-01 na rede privada e implante a aplicação.');
    address='http://entrada/health';
  }
  if(id==='k8s'){
    if(s.deployments.api?.replicas!==3||s.deployments.api.image!=='app:local'||!s.services.api||s.services.api.selector!==s.deployments.api.label||s.services.api.targetPort!==s.deployments.api.port)throw Error('O Service api deve alcançar o Deployment api com três réplicas da imagem app:local.');
    address='http://api.default.svc/health';
  }
  const response=await requestLab(s,address);
  if(response.status!==200||response.body!=='ok')throw Error('O endpoint /health precisa responder HTTP 200 com corpo ok.');
  return 'Ambiente validado. GET /health → 200 ok.';
}
