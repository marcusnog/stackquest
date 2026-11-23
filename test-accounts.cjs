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
const {DatabaseSync}=require('node:sqlite');

test('Ranking inclui progresso anterior e pagina empates por nome',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'stackquest-ranking-')),file=join(dir,'old.sqlite');
  const db=new DatabaseSync(file);
  db.exec('CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, verifier TEXT NOT NULL); CREATE TABLE progress(user_id INTEGER,key TEXT,value TEXT,version INTEGER,PRIMARY KEY(user_id,key))');
  for(let i=1;i<=27;i++){
    db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(i,'aluno'+String(i).padStart(2,'0'),'','');
    db.prepare('INSERT INTO progress VALUES(?,?,?,1)').run(i,'stackquest.missao.v1.1-1','{"date":"2026-11-22","note":"privado"}');
  }
  db.close();
  const store=accounts(file),server=http.createServer(createHandler(store));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await new Promise(r=>server.close(r));store.close();rmSync(dir,{recursive:true,force:true});});
  const read=async page=>(await fetch('http://127.0.0.1:'+server.address().port+'/api/ranking?page='+page)).json();
  const first=await read(1),second=await read(2);
  assert.equal(first.total,27);assert.equal(first.entries.length,25);
  assert.equal(first.entries.at(-1).name,'aluno25');
  assert.deepEqual(second.entries,[{name:'aluno26',xp:100,position:1},{name:'aluno27',xp:100,position:1}]);
});

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
  const design={nodes:[{id:'n1',type:'api',x:32,y:85}],edges:[],provider:'azure',usage:{hours:100,rates:{storage:0.2}}};
  const board={...first,key:'stackquest.missao.v1.3-1',value:JSON.stringify({note:'Reserva condicional',architecture:design})};
  assert.equal((await call('progress',at,board,'PUT')).status,200);
  const prefKey='stackquest.preferencias.v1.aparencia';
  const appearance={key:prefKey,value:'{"theme":"dark","accent":"azul","text":"grande"}',version:0};
  assert.equal((await call('progress',at,appearance,'PUT')).status,200);
  assert.equal((await call('progress',at,{...appearance,key:prefKey+'-outra'},'PUT')).status,400);
  assert.equal((await call('progress',at,{...first,key:'stackquest.missao.v1.12-1'},'PUT')).status,400);
  assert.equal((await call('progress',at,first,'PUT')).data.version,1);
  assert.equal((await call('progress',at,{...first,value:'{}'},'PUT')).status,409);
  assert.equal((await call('me',bt)).data.records.length,0);
  const ranking=async(token,page=1)=>(await call('ranking?page='+page,token)).data;
  const expectedA={name:alice.name,xp:200,position:1};
  assert.deepEqual((await ranking()).entries,[expectedA]);
  assert.equal((await ranking()).mine,null);
  assert.deepEqual((await ranking(at)).mine,expectedA);
  assert.equal((await ranking(bt)).mine,null);
  assert.equal((await call('ranking?page=0')).status,400);
  assert.equal((await call('ranking','invalid')).status,401);
  const lab={key:'stackquest.lab.v1.cloud',value:JSON.stringify({schema:1,files:{},cluster:{},earned:true,xp:999999}),version:0};
  assert.equal((await call('progress',bt,lab,'PUT')).status,200);
  assert.equal((await call('progress',bt,lab,'PUT')).status,200);
  assert.deepEqual((await ranking()).entries,[expectedA,{name:bob.name,xp:200,position:1}]);
  const dbDecision={key:'stackquest.db.v1.checkout',value:JSON.stringify({trials:[],accepted:{date:'2026-11-22'}}),version:0};
  await call('progress',bt,dbDecision,'PUT');
  assert.deepEqual((await ranking(at)).mine,{...expectedA,position:2});
  assert.deepEqual((await ranking(bt,2)).entries,[]);
  assert.equal((await ranking(bt,2)).mine.xp,250);
  await stop();await start();
  const second=await call('auth/login',null,alice);assert.equal(second.status,200);
  assert.equal(second.data.records[0].value,first.value);
  assert.equal((await call('me',null)).status,401);
  assert.equal((await call('auth/logout',at,undefined,'POST')).status,200);
  assert.equal((await call('me',at)).status,401);
  const records=(await call('me',second.data.token)).data.records;
  assert.equal(records.length,4);
  assert.equal(records.find(r=>r.key===prefKey).value,appearance.value);
  assert.deepEqual(JSON.parse(records.find(r=>r.key===board.key).value).architecture,design);
});
