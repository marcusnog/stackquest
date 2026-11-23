const plantaoMaterials = {
  cpu:{name:'CPU', stock:8},
  ram:{name:'RAM', stock:12},
  ssd:{name:'SSD', stock:6}
};
const plantaoRecipes = {
  api:{cpu:2,ram:1}, sql:{cpu:1,ram:1,ssd:2},
  kv:{cpu:1,ram:2,ssd:1}, cache:{cpu:1,ram:2}
};

function plantaoInstalledCost(tiles) {
  const used={cpu:0,ram:0,ssd:0};
  for (const type of tiles) {
    if (Object.hasOwn(plantaoRecipes,type))
      for (const [id,n] of Object.entries(plantaoRecipes[type])) used[id]+=n;
  }
  return used;
}

function plantaoWorkshop(raw,tiles) {
  const installed=plantaoInstalledCost(tiles);
  const harvested={},kits={};
  for (const [id,m] of Object.entries(plantaoMaterials)) {
    const saved=raw?.harvested?.[id];
    // A carga de uma partida antiga já inclui as peças dos servidores instalados.
    harvested[id]=Math.max(installed[id],Number.isSafeInteger(saved)?Math.min(saved,m.stock):0);
  }
  const remaining={...harvested};
  for (const id of Object.keys(installed)) remaining[id]-=installed[id];
  for (const [type,cost] of Object.entries(plantaoRecipes)) {
    const saved=raw?.kits?.[type];
    const limit=Math.min(...Object.entries(cost).map(([id,n])=>Math.floor(remaining[id]/n)));
    kits[type]=Number.isSafeInteger(saved)?Math.max(0,Math.min(saved,limit)):0;
    for (const [id,n] of Object.entries(cost)) remaining[id]-=n*kits[type];
  }
  return {harvested,kits};
}

function plantaoBag(state) {
  const used=plantaoInstalledCost(state.tiles);
  for (const [type,cost] of Object.entries(plantaoRecipes))
    for (const [id,n] of Object.entries(cost)) used[id]+=n*state.workshop.kits[type];
  return Object.fromEntries(Object.keys(used).map(id=>[id,state.workshop.harvested[id]-used[id]]));
}

function plantaoCollect(state,id) {
  if (!Object.hasOwn(plantaoMaterials,id)) return 0;
  const harvested=state.workshop.harvested;
  const qty=Math.max(0,Math.min(2,plantaoMaterials[id].stock-harvested[id]));
  harvested[id]+=qty;
  return qty;
}

function plantaoCanCraft(type,bag) {
  return Object.hasOwn(plantaoRecipes,type) && Object.entries(plantaoRecipes[type]).every(([id,n])=>bag[id]>=n);
}
function plantaoCraft(state,type) {
  if (!plantaoCanCraft(type,plantaoBag(state))) return false;
  state.workshop.kits[type]++;
  return true;
}
function plantaoRecycle(state,type) {
  if (!Object.hasOwn(plantaoRecipes,type) || state.workshop.kits[type]<1) return false;
  state.workshop.kits[type]--;
  return true;
}

function plantaoInstall(state,type,i) {
  if (!Object.hasOwn(plantaoRecipes,type) || !Number.isInteger(i) || state.tiles[i]!==null ||
      state.workshop.kits[type]<1 || plantaoSpent(state.tiles)+plantaoParts[type].price>plantaoBudget) return false;
  state.workshop.kits[type]--;
  state.tiles[i]=type;
  return true;
}
function plantaoUninstall(state,i) {
  const type=state.tiles[i];
  if (!Object.hasOwn(plantaoRecipes,type)) return false;
  state.tiles[i]=null;
  state.edges=state.edges.filter(e=>e.from!==i && e.to!==i);
  state.workshop.kits[type]++;
  return true;
}
