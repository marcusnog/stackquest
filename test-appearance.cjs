const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {runInNewContext}=require('node:vm');
const {join}=require('node:path');

test('A aparência acompanha a conta e o sistema e tolera preferências antigas',()=>{
  const media={matches:true,addEventListener(_,fn){this.changed=fn;}};
  const dataset={},account={name:''},stored=new Map();
  const progressStore={getItem:key=>stored.get(account.name+'|'+key)};
  const context={document:{documentElement:{dataset}},window:{matchMedia:()=>media,addEventListener(){}},account,progressStore};
  const source=readFileSync(join(__dirname,'dist','appearance.js'),'utf8');
  const {key,apply}=runInNewContext(source+'\n({key:appearanceKey,apply:applyAppearance})',context);
  assert.deepEqual(dataset,{theme:'dark',accent:'laranja',text:'normal'});
  media.matches=false;media.changed();
  assert.equal(dataset.theme,'light');
  account.name='aluna';
  stored.set('aluna|'+key,'{"theme":"dark","accent":"azul","text":"grande"}');
  apply();assert.deepEqual(dataset,{theme:'dark',accent:'azul',text:'grande'});
  media.changed();assert.equal(dataset.theme,'dark');
  account.name='outra';stored.set('outra|'+key,'{"theme":"unknown","accent":"verde"}');
  apply();assert.deepEqual(dataset,{theme:'light',accent:'verde',text:'normal'});
  account.name='';apply();assert.equal(dataset.accent,'laranja');
  stored.set('|'+key,'bad json');apply();assert.equal(dataset.text,'normal');
});
