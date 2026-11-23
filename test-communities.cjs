const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {once}=require('node:events');
const {accounts}=require('./backend/accounts.cjs');
const {createHandler}=require('./backend/server.cjs');

test('comunidades exigem sessão e bibliotecas são compartilhadas apenas com membros',async t=>{
  const store=accounts(':memory:'),server=http.createServer(createHandler(store));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));store.close();});
  async function request(path,token,body){
    const headers={'Content-Type':'application/json'};
    if(token)headers.Authorization='Bearer '+token;
    const res=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{
      headers,method:body?'POST':'GET',body:JSON.stringify(body)
    });
    return {status:res.status,...await res.json()};
  }
  const register=async name=>(await request('auth/register',null,{name,password:'senha-local-de-teste'})).token;
  const owner=await register('criador'),other=await register('colega');
  assert.equal((await request('communities',null)).status,401);
  assert.equal((await request('communities',null,{name:'Grupo'})).status,401);
  const group=await request('communities',owner,{name:'Grupo'}),path='communities/'+group.id;
  assert.equal(group.status,201);
  assert.equal((await request('communities',owner,{name:'Grupo'})).status,409);
  assert.equal((await request('communities',other)).communities[0].member,0);
  assert.equal((await request(path,other)).status,403);
  const libs=path+'/libraries';
  const data={name:'Filas',items:[{title:'Documentação',url:'https://example.org/docs'}]};
  assert.equal((await request(libs,other,data)).status,403);
  assert.equal((await request(libs,owner,{...data,items:[...data.items,{title:'Inválido',url:'file:///temp'}]})).status,400);
  assert.deepEqual((await request(path,owner)).libraries,[]);
  const created=await request(libs,owner,data),lib=libs+'/'+created.id;
  assert.equal(created.status,201);
  assert.equal((await request(lib,other)).status,403);
  assert.equal((await request(path+'/join',other,{})).status,200);
  assert.equal((await request(path+'/join',other,{})).status,200);
  assert.deepEqual((await request(lib,other)).items,data.items);
  const item={title:'Segundo',url:'https://example.org/2'};
  const writes=await Promise.all([request(lib+'/items',other,item),request(lib+'/items',owner,item)]);
  assert.deepEqual(writes.map(r=>r.status).sort(),[201,409]);
  assert.equal((await request(path,owner)).libraries[0].count,2);
  const second=await request('communities',other,{name:'Outro'});
  const target='communities/'+second.id+'/libraries';
  assert.equal((await request(target+'/'+created.id,other)).status,404);
  const saved=await request(lib,other);
  const imported=await request(target,other,{name:saved.name,items:saved.items});
  assert.deepEqual((await request(target+'/'+imported.id,other)).items,[...data.items,item]);
  assert.equal((await request(target,other,data)).status,409);
  assert.equal((await request(target,owner,data)).status,403);
  await request('auth/logout',other,{});
  assert.equal((await request(lib,other)).status,401);
});
