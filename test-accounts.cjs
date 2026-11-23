const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {once}=require('node:events');
const {mkdtempSync,rmSync}=require('node:fs');
const {join}=require('node:path');
const {tmpdir}=require('node:os');
const {randomBytes}=require('node:crypto');
const {accounts}=require('./backend/accounts.cjs');
const {createHandler}=require('./backend/server.cjs');

test('Cadastro, isolamento, retomada, conflito e saída',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'stackquest-'));
  const file=join(dir,'test.sqlite');
  let store,server;
  async function start(){
    store=accounts(file);server=http.createServer(createHandler(store));
    server.listen(0,'127.0.0.1');await once(server,'listening');
  }
  async function stop(){
    await new Promise(r=>server.close(r));store.close();
  }
  await start();
  t.after(async()=>{await stop();rmSync(dir,{recursive:true,force:true});});
  async function call(path,token,body,method=body?'POST':'GET'){
    const headers={'Content-Type':'application/json'};if(token)headers.Authorization='Bearer '+token;
    const res=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{method,headers,body:body?JSON.stringify(body):undefined});
    return {status:res.status,data:await res.json()};
  }
  const password=randomBytes(20).toString('hex');
  const alice={name:'aprendiz_a',password},bob={name:'aprendiz_b',password};
  const a=await call('auth/register',null,alice),b=await call('auth/register',null,bob);
  assert.equal(a.status,201);assert.equal(b.status,201);
  const at=a.data.token,bt=b.data.token;
  assert.equal((await call('auth/login',null,{...alice,password:'senha incorreta aqui'})).status,401);
  const first={key:'stackquest.missao.v1.1-1',value:JSON.stringify({note:'Justificativa individual',date:'2026-11-22'}),version:0};
  assert.equal((await call('progress',at,first,'PUT')).data.version,1);
  const advanced={...first,key:'stackquest.missao.v1.11-3'};
  assert.equal((await call('progress',at,advanced,'PUT')).status,200);
  assert.equal((await call('progress',at,{...first,key:'stackquest.missao.v1.12-1'},'PUT')).status,400);
  assert.equal((await call('progress',at,first,'PUT')).data.version,1);
  assert.equal((await call('progress',at,{...first,value:'{}'},'PUT')).status,409);
  assert.equal((await call('me',bt)).data.records.length,0);
  await stop();await start();
  const second=await call('auth/login',null,alice);assert.equal(second.status,200);
  assert.equal(second.data.records[0].value,first.value);
  assert.equal((await call('me',null)).status,401);
  assert.equal((await call('auth/logout',at,undefined,'POST')).status,200);
  assert.equal((await call('me',at)).status,401);
  assert.equal((await call('me',second.data.token)).data.records.length,2);
});
