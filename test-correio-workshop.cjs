const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {correioCollect,correioCraft,correioWorkshop,correioUncollected} = vm.runInNewContext(
  fs.readFileSync(require.resolve('./dist/correio-workshop.js'),'utf8')+'; ({correioCollect,correioCraft,correioWorkshop,correioUncollected})'
);
const basic = {workers:1,key:'none'};
test('a receita consome apenas o estoque necessário e desmontar devolve exatamente o custo',()=>{
  const shop=correioWorkshop(null,basic);
  assert.equal(correioCraft(shop,'bench',basic),false);
  assert.equal(correioCollect(shop,'wood'),2);
  assert.equal(correioCraft(shop,'bench',basic),false);
  assert.equal(shop.bag.wood,2);
  correioCollect(shop,'metal');
  assert.ok(correioCraft(shop,'bench',basic));
  assert.equal(shop.bag.wood,0);
  assert.equal(shop.bag.metal,1);
  assert.equal(correioCraft(shop,'bench',{workers:2,key:'none'},true),false);
  assert.ok(correioCraft(shop,'bench',basic,true));
  assert.equal(correioCraft(shop,'bench',basic,true),false);
  assert.equal(shop.bag.wood,2);
  assert.equal(shop.bag.metal,2);
});
test('qualquer ordem de fabricação comporta o livro e duas novas bancadas sem duplicar recursos',()=>{
  for (const sequence of [['ledger','bench','bench'],['bench','ledger','bench'],['bench','bench','ledger']]) {
    const shop=correioWorkshop(null,basic);
    for (const id of ['wood','metal','paper']) {
      while(correioCollect(shop,id)) {}
      assert.equal(correioUncollected(shop,id),0);
    }
    for (const item of sequence) assert.ok(correioCraft(shop,item,basic));
    for (const id of ['wood','metal','paper']) assert.equal(shop.bag[id],0);
    assert.equal(correioCraft(shop,'ledger',{workers:1,key:'order'},true),false);
    assert.ok(correioCraft(shop,'ledger',basic,true));
    assert.equal(correioCollect(shop,'paper'),0);
    assert.ok(correioCraft(shop,'ledger',basic));
    assert.deepEqual(correioWorkshop(JSON.parse(JSON.stringify(shop)),basic),shop);
  }
});
test('a oficina importa equipamentos ativos da partida antiga e limita estoque inválido',()=>{
  const upgraded=correioWorkshop(null,{workers:3,key:'message'});
  assert.equal(upgraded.built.bench,2);
  assert.equal(upgraded.built.ledger,1);
  const repaired=correioWorkshop({built:{bench:9,ledger:-1},bag:{wood:30,metal:20,paper:'2'}},basic);
  assert.equal(repaired.bag.wood,0);
  assert.equal(repaired.bag.metal,1);
  assert.equal(repaired.bag.paper,0);
  assert.equal(correioCollect(repaired,'__proto__'),0);
});
