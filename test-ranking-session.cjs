const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');

test('Sessão expirada conserva o ranking público e permite entrar novamente',async()=>{
  const fields=new Map(),calls=[],navigation=[];
  function element(key){
    if(!fields.has(key))fields.set(key,{isConnected:true,querySelector:element});
    return fields.get(key);
  }
  const context=vm.createContext({
    main:element('main'),header:()=>'',studioText:s=>s,AbortSignal,
    document:{addEventListener(){}},window:{addEventListener(){}},
    location:{replace:url=>navigation.push(url),reload:()=>navigation.push('reload')},
    async fetch(url,options){
      calls.push(options.headers.Authorization);
      if(options.headers.Authorization)return {ok:false,status:401,json:async()=>({error:'Sessão expirada'})};
      return {ok:true,json:async()=>({total:1,pageSize:25,mine:null,entries:[{name:'aluno',position:1,xp:100}]})};
    }
  });
  for(const file of ['account.js','ranking.js'])vm.runInContext(readFileSync(join(__dirname,'dist',file),'utf8'),context);
  vm.runInContext("account.name='aluno';account.token='expired';rankingPage()",context);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(calls,['Bearer expired',undefined]);
  assert.match(element('[data-list]').innerHTML,/aluno/);
  assert.doesNotMatch(element('[data-list]').innerHTML,/ranking-mine|você/);
  assert.match(element('[data-personal]').innerHTML,/sessão expirou/);
  await element('[data-refresh]').onclick();
  assert.deepEqual(calls,['Bearer expired',undefined,undefined]);
  element('a').onclick({preventDefault(){}});
  assert.deepEqual(navigation,['#conta','reload']);
});
