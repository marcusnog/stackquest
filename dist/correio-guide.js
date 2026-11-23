// Coordinates use the same viewport space as getBoundingClientRect().
function correioTipPosition(rect,tip,viewport) {
  const gap=12, margin=8, center=rect.left+rect.width/2;
  const left=Math.max(viewport.left+margin,Math.min(center-tip.width/2,viewport.right-margin-tip.width));
  const above=rect.top-viewport.top,below=viewport.bottom-rect.bottom;
  const onTop=below<tip.height+gap+margin && above>below;
  return {left,top:onTop?rect.top-gap-tip.height:rect.bottom+gap,onTop,
    arrow:Math.max(14,Math.min(center-left,tip.width-14))};
}

function correioGuide(state,view,recipeId,run) {
  const action=(stage,title,body,target)=>({stage,title,body,target});
  const shop=state.workshop, frame=run.frames[state.cursor];
  if (state.shift!==0)
    return action(4,'Guia do primeiro turno','Você pode revisitar a montagem e a primeira carga com os equipamentos que já tem.',null);
  if (state.cursor===run.frames.length-1 && run.pass)
    return action(4,'Primeiro turno concluído','Você despachou os quatro pedidos em '+run.time+' segundos. O próximo turno testa o que acontece quando um worker cai.',null);
  if (!shop.built.bench) {
    for (const [id,qty] of Object.entries(correioRecipes.bench.cost)) {
      if (shop.bag[id]>=qty) continue;
      const m=correioMaterials[id];
      if (view!=='depot') return action(1,'Abra o almoxarifado','A bancada precisa de '+qty+' de '+m.name.toLowerCase()+'. Recolha o material na central.','[data-view="depot"]');
      return action(1,'Colete '+m.name.toLowerCase(),'Clique em '+m.source+' para recolher '+m.name.toLowerCase()+'. A receita pede '+qty+' e você tem '+shop.bag[id]+'.','[data-collect="'+id+'"]');
    }
    if (recipeId!=='bench') return action(2,'Escolha a receita de bancada','Você já tem a madeira e o metal. Selecione a bancada na oficina.','[data-recipe="bench"]');
    return action(2,'Fabrique a segunda bancada','Clique em Fabricar bancada. A oficina usa 2 de madeira e 1 de metal para abrir espaço para outro worker.','#cj-craft');
  }
  if (state.config.workers<2)
    return action(3,'Ative o segundo worker','Em Workers ativos, escolha 2 bancadas. Cada pedido leva 2 segundos e o prazo para quatro pedidos é de 4 segundos.','#cj-workers');
  if (view!=='operation') return action(4,'Abra a triagem','As bancadas estão prontas. Abra a triagem para acompanhar o caminho dos envelopes.','[data-view="operation"]');
  if (state.cursor===0) return action(4,'Retire o primeiro envelope','Clique em Próximo evento para ver o primeiro worker retirar um pedido da fila.','#cj-step');
  if (!frame.sent) {
    const busy=frame.workers.filter(Boolean).length;
    if(busy<frame.workers.length && frame.waiting.length)
      return action(4,busy===1?'Ocupe a outra bancada':'Ocupe a bancada livre','Avance um evento e observe mais um worker receber um pedido enquanto os demais trabalham.','#cj-step');
    return action(4,'Acompanhe a primeira etiqueta','Os workers estão atendendo em paralelo. Avance para ver a primeira etiqueta na conferência de expedição.','#cj-step');
  }
  return action(4,'Conclua o malote','Já há '+frame.sent+(frame.sent===1?' etiqueta emitida.':' etiquetas emitidas.')+' Rode até o fim para conferir o prazo e a etiqueta de cada pedido.','#cj-finish');
}
