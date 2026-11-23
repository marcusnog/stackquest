function plantaoGuide(state,{tool,source,locked,failed}={}) {
  const live=(type)=>state.tiles.indexOf(type);
  const at=i=>'[data-cell="'+i+'"]';
  const action=(stage,title,body,target)=>({stage,title,body,target});
  const area=name=>'[data-area="'+name+'"]';
  const terrain=(step)=>state.area==='terrain' ? step : {...step,target:area('terrain')};
  if(state.cleared>0) return action(4,'Primeira onda concluída','Sua loja já atendeu a primeira carga. Você pode explorar o pico de tráfego e a disputa de estoque.','#pg-waves');
  if(locked) return action(4,'Acompanhe a primeira onda','Observe os pedidos em trânsito. Espere a simulação terminar ou abra o resultado.','#pg-end');
  const api=live('api'),bank=live('sql')>=0?'sql':live('kv')>=0?'kv':state.guideBank;
  const db=live(bank);
  const type=api<0?'api':db<0?bank:null;
  if(type){
    const name=plantaoParts[type].name,stage=type==='api'?1:2;
    if(state.workshop.kits[type]){
      if(plantaoSpent(state.tiles)+plantaoParts[type].price>plantaoBudget)
        return terrain(action(stage,'Libere créditos para instalar','Remova um servidor que você pode dispensar. Ele volta ao estoque.','[data-tool="remove"]'));
      if(tool!==type)return action(stage,'Selecione o servidor pronto','Escolha '+name+' no estoque para colocá-lo no terreno.','[data-tool="'+type+'"]');
      return terrain(action(stage,'Instale '+name,'Escolha qualquer parcela vazia. A parcela destacada é uma sugestão.',at(state.tiles.indexOf(null))));
    }
    const bag=plantaoBag(state),cost=plantaoRecipes[type];
    const id=Object.keys(cost).find(k=>bag[k]<cost[k]);
    if(id){
      const mat=plantaoMaterials[id];
      if(state.workshop.harvested[id]>=mat.stock){
        const spare=Object.keys(plantaoRecipes).find(k=>state.workshop.kits[k] && plantaoRecipes[k][id]);
        if(spare)return action(stage,'Recupere '+mat.name,'Selecione '+plantaoParts[spare].name+' na oficina e desmonte um servidor em estoque.',state.recipe===spare?'#pg-recycle':'[data-recipe="'+spare+'"]');
        return terrain(action(stage,'Recupere peças instaladas','Remova um servidor que usa '+mat.name+' e desmonte-o na oficina.','[data-tool="remove"]'));
      }
      return action(stage,'Colete '+mat.name+' para '+name,'Sua receita pede '+cost[id]+' × '+mat.name+'. Você tem '+bag[id]+'. Recolha o componente no almoxarifado.',state.area==='depot'?'[data-gather="'+id+'"]':area('depot'));
    }
    if(state.recipe!==type)return action(stage,'Escolha a receita de '+name,'As peças estão no inventário. Selecione a receita na oficina.','[data-recipe="'+type+'"]');
    return action(stage,'Fabrique '+name,'Use as peças coletadas para montar um servidor. Ele ficará pronto para instalar.','#pg-craft');
  }
  for(const [from,to] of [[live('client'),api],[api,db]]){
    if(state.edges.some(e=>e.from===from && e.to===to))continue;
    const origin=plantaoCoord(from),dest=plantaoCoord(to);
    if(tool!=='wire')return terrain(action(3,'Ligue '+origin+' a '+dest,'Ative Ligar blocos. A seta deve seguir o caminho do pedido.','[data-tool="wire"]'));
    if(source!==null && source!==from)return terrain(action(3,'Troque a origem','Selecione Ligar blocos novamente e comece a ligação em '+origin+'.','[data-tool="wire"]'));
    if(source===null)return terrain(action(3,'Escolha a origem '+origin,'O pedido parte de '+origin+' e segue para '+dest+'.',at(from)));
    return terrain(action(3,'Escolha o destino '+dest,'Clique em '+dest+' para terminar a ligação.',at(to)));
  }
  if(failed)return action(4,'Investigue a primeira carga','Abra o diagnóstico e ajuste a arquitetura antes de repetir.','#pg-diagnose');
  return action(4,'Teste a loja','Inicie a primeira onda. A meta é confirmar os três pedidos dentro do limite de latência.','#pg-run');
}
