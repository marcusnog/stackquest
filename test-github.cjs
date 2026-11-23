const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {once}=require('node:events');
const fs=require('node:fs');
const vm=require('node:vm');
const {join}=require('node:path');
const {accounts}=require('./backend/accounts.cjs');
const {createHandler}=require('./backend/server.cjs');

test('OAuth cria, identifica e vincula perfis pelo ID, preservando contas e progresso',async t=>{
  let profile={id:42,login:'antigo'};
  const verifier='x'.repeat(43);
  const githubFetch=async(url,options)=>{
    if(url.endsWith('/access_token')){
      assert.equal(options.body.get('code_verifier'),verifier);
      assert.equal(options.body.get('client_secret'),'test-secret');
      assert.equal(options.body.get('redirect_uri'),'https://marcusnog.github.io/stackquest/github-callback.html');
      return Response.json(options.body.get('code')==='valid'?{access_token:'test-token'}:{error:'bad_verification_code'});
    }
    assert.equal(url,'https://api.github.com/user');
    assert.equal(options.headers.Authorization,'Bearer test-token');
    return Response.json(profile);
  };
  const store=accounts(':memory:',{clientId:'test-id',clientSecret:'test-secret',githubFetch});
  const server=http.createServer(createHandler(store));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await new Promise(done=>server.close(done));store.close();});
  async function call(path,body,token,method=body?'POST':'GET'){
    const headers={'Content-Type':'application/json'};
    if(token)headers.Authorization='Bearer '+token;
    const res=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{method,headers,body:JSON.stringify(body)});
    return {status:res.status,...await res.json()};
  }
  const config=await call('auth/github/config');
  assert.equal(config.enabled,true);assert.equal(config.clientId,'test-id');assert.ok(!JSON.stringify(config).includes('test-secret'));
  const creds={name:'antigo',password:'uma senha para testes'};
  const local=await call('auth/register',creds);
  const progress={key:'stackquest.missao.v1.1-1',value:'{"note":"minha nota"}',version:0};
  await call('progress',progress,local.token,'PUT');
  const params={code:'valid',verifier};
  assert.equal((await call('auth/github/link',params)).status,401);
  assert.equal((await call('auth/github/login',{...params,code:'expired'})).status,401);
  const other=await call('auth/github/login',params);
  assert.equal(other.name,'gh-42');assert.equal(other.records.length,0);
  assert.equal((await call('auth/login',{...creds,name:other.name})).status,401);
  assert.equal((await call('auth/github/link',params,local.token)).status,409);
  profile={id:99,login:'jogador'};
  assert.equal((await call('auth/github/link',params,local.token)).githubLinked,true);
  profile.login='renomeado';
  const again=await call('auth/github/login',params);
  assert.equal(again.name,local.name);assert.equal(again.records[0].value,progress.value);
  assert.equal((await call('auth/login',creds)).githubLinked,true);
  profile.id=100;
  assert.equal((await call('auth/github/link',params,local.token)).status,409);
});

test('retorno exige estado, aba, prazo e conta compatíveis antes da troca do código',async()=>{
  const storage=new Map(),calls=[];
  const context=vm.createContext({
    sessionStorage:{getItem:k=>storage.get(k)||null,removeItem:k=>storage.delete(k),setItem:(k,v)=>storage.set(k,v)},
    AbortSignal,window:{addEventListener(){}},document:{addEventListener(){}},
    async fetch(url,opts){
      calls.push({url,body:JSON.parse(opts.body),headers:opts.headers});
      return Response.json({name:'usuario',token:'session',records:[],githubLinked:true});
    }
  });
  vm.runInContext(fs.readFileSync(join(__dirname,'dist/account.js'),'utf8'),context);
  const flow={name:'',state:'original',started:Date.now(),verifier:'verifier'};
  const result={state:'original',code:'code'};
  async function finish(saved,reply){
    storage.set('stackquest.github.flow',JSON.stringify(saved));
    storage.set('stackquest.github.result',JSON.stringify(reply));
    await vm.runInContext('finishGithub()',context);
    assert.ok(!storage.has('stackquest.github.result'));assert.ok(!storage.has('stackquest.github.flow'));
  }
  await finish(null,result);
  await finish(flow,{...result,state:'different'});
  await finish({...flow,started:Date.now()-610000},result);
  await finish({...flow,name:'outra_conta'},result);
  await finish(flow,{...result,error:'access_denied'});
  assert.equal(calls.length,0);
  await finish(flow,result);
  assert.deepEqual(calls.map(c=>c.body),[{code:'code',verifier:'verifier'}]);
  assert.equal(storage.get('stackquest.session.v1'),'session');
});
