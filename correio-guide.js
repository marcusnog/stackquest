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
      return action(1,'Colete '+m.name.toLowerCase(),'Use '+m.source.toLowerCase()+' para recolher '+m.name.toLowerCase()+'. A receita pede '+qty+' e você tem '+shop.bag[id]+'.','[data-collect="'+id+'"]');
    }
    if (recipeId!=='bench') return action(2,'Escolha a receita de bancada','Você já tem a madeira e o metal. Selecione a bancada na oficina.','[data-recipe="bench"]');
    return action(2,'Fabrique a segunda bancada','A oficina usará duas unidades de madeira e uma de metal. A nova bancada permite atender outro pedido ao mesmo tempo.','#cj-craft');
  }
  if (state.config.workers<2)
    return action(3,'Ative o segundo worker','Em Workers ativos, escolha 2 bancadas. Cada pedido leva 2 segundos e o prazo para quatro pedidos é de 4 segundos.','#cj-workers');
  if (view!=='operation') return action(4,'Abra a triagem','As bancadas estão prontas. Abra a triagem para acompanhar o caminho dos envelopes.','[data-view="operation"]');
  if (state.cursor===0) return action(4,'Retire o primeiro envelope','Avance um evento para ver um worker retirar seu primeiro pedido da fila.','#cj-step');
  if (!frame.sent) {
    const busy=frame.workers.filter(Boolean).length;
    if(busy<frame.workers.length && frame.waiting.length)
      return action(4,busy===1?'Ocupe a outra bancada':'Ocupe a bancada livre','Avance um evento e observe mais um worker receber um pedido enquanto os demais trabalham.','#cj-step');
    return action(4,'Acompanhe a primeira etiqueta','Os workers estão atendendo em paralelo. Avance para ver a primeira etiqueta na conferência de expedição.','#cj-step');
  }
  return action(4,'Conclua o malote','Já há '+frame.sent+(frame.sent===1?' etiqueta emitida.':' etiquetas emitidas.')+' Rode até o fim para conferir o prazo e a etiqueta de cada pedido.','#cj-finish');
}
