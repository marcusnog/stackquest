const correioMaterials = {
  wood:{name:'Madeira', source:'Paletes', supply:4},
  metal:{name:'Metal', source:'Sucata', supply:3},
  paper:{name:'Papel', source:'Bobinas', supply:2}
};
const correioRecipes = {
  bench:{name:'Bancada', cost:{wood:2,metal:1}, max:2, effect:'Permite ativar mais um worker para processar a fila em paralelo.'},
  ledger:{name:'Livro de registros', cost:{metal:1,paper:2}, max:1, effect:'Habilita o registro por ID de mensagem ou pedido para controlar etiquetas duplicadas.'}
};

function correioUncollected(shop,id) {
  let remaining = correioMaterials[id].supply - shop.bag[id];
  for (const [item,recipe] of Object.entries(correioRecipes)) remaining -= (recipe.cost[id] || 0)*shop.built[item];
  return remaining;
}

function correioWorkshop(raw,config) {
  const bounded = (value,limit)=>Number.isInteger(value) ? Math.max(0,Math.min(value,limit)) : 0;
  // As instalações em uso numa partida anterior à oficina já pertencem ao jogador.
  const built = raw ? {bench:bounded(raw.built?.bench,2),ledger:bounded(raw.built?.ledger,1)}
    : {bench:config.workers-1,ledger:Number(config.key!=='none')};
  const shop = {built,bag:{wood:0,metal:0,paper:0}};
  for (const id of Object.keys(correioMaterials)) shop.bag[id] = bounded(raw?.bag?.[id],correioUncollected(shop,id));
  return shop;
}

function correioCollect(shop,id) {
  if (!Object.hasOwn(correioMaterials,id)) return 0;
  const amount = Math.min(2,correioUncollected(shop,id));
  shop.bag[id] += amount;
  return amount;
}

function correioCanBuild(shop,item) {
  if (!Object.hasOwn(correioRecipes,item)) return false;
  const recipe = correioRecipes[item];
  return shop.built[item]<recipe.max && Object.entries(recipe.cost).every(([id,qty])=>shop.bag[id]>=qty);
}

function correioCanRecover(shop,item,config) {
  if (item==='bench') return shop.built.bench>=config.workers;
  return item==='ledger' && shop.built.ledger===1 && config.key==='none';
}

function correioCraft(shop,item,config,recover=false) {
  if (recover ? !correioCanRecover(shop,item,config) : !correioCanBuild(shop,item)) return false;
  const sign = recover ? -1 : 1;
  for (const [id,qty] of Object.entries(correioRecipes[item].cost)) shop.bag[id] -= qty*sign;
  shop.built[item] += sign;
  return true;
}

function correioItemArt(item) {
  const paths = {
    wood:'<path fill="#916038" d="m3 18 19-10 8 4v6L11 28l-8-4z"/><path fill="#edbc75" d="m3 18 19-10 8 4-19 10z"/><path stroke="#946442" d="m9 18 14-7m-9 9 13-7"/><path fill="#73482e" d="M11 22v6l19-10v-6z"/><path fill="#f7d99b" d="m2 13 18-9 8 4-18 9z"/><path fill="#ab7543" d="m2 13 8 4v5l-8-4z"/><path fill="#895937" d="m10 17 18-9v5l-18 9z"/>',
    metal:'<path fill="#849dac" d="m2 18 18-9 10 5v7l-18 9-10-5z"/><path fill="#d4e7e6" d="m2 18 18-9 10 5-18 9z"/><path fill="#496776" d="m12 23 18-9v7l-18 9z"/><path fill="#e6f7f1" d="m5 12 15-8 8 4-15 8z"/><path fill="#9dbbc6" d="m5 12 8 4v5l-8-4z"/><path fill="#587788" d="m13 16 15-8v5l-15 8z"/>',
    paper:'<path fill="#ddad59" d="m3 20 14-8 13 5v6l-15 8-12-6z"/><path fill="#ffe9ac" d="m3 20 14-8 13 5-15 9z"/><path fill="#f3d789" d="M5 12q0-4 4-6l11-3q7 0 8 8v5l-15 7q-8 0-8-11z"/><ellipse cx="11" cy="15" rx="6" ry="8" fill="#fff0bb"/><ellipse cx="11" cy="15" rx="2.5" ry="4" fill="#96633a"/><path fill="#e9bc68" d="m12 23 16-8v5l-16 8z"/>',
    bench:'<path fill="#64503b" d="M4 15h4v13H4zm20 0h4v13h-4zm-11 5h4v11h-4z"/><path fill="#b97e4b" d="m2 13 15-7 14 7v4l-16 7-13-6z"/><path fill="#f4cc85" d="m2 13 15-7 14 7-16 7z"/><path fill="#49777a" d="m12 8 8-4 6 3v7l-8 4-6-3z"/><path fill="#b8e5cb" d="m14 9 6-3 4 2-6 3z"/>',
    ledger:'<path fill="#8d6738" d="M4 9 20 3l9 5v15l-16 7-9-6z"/><path fill="#f2dfa9" d="m6 13 7 4 14-6v11l-14 6-7-4z"/><path fill="#588678" d="m4 9 16-6 9 5-16 7z"/><path fill="#32594e" d="m4 9 9 6v15l-9-6z"/><path stroke="#f4ce77" stroke-width="2" d="m10 8 8 5"/>'
  };
  return '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">'+paths[item]+'</svg>';
}
