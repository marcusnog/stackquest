function warFieldPanel(state){
  if(state.stage===3){
    const labels=['norte','leste','sul','oeste'],ends=['12 0','24 12','12 24','0 12'];
    const trace=warTrace(state);
    const tiles=warPorts.map((_,i)=>{
      const ports=warPipePorts(state,i);
      const path=ports.map(p=>'M12 12L'+ends[p]).join('');
      return '<button type="button" data-turn="'+i+'" class="'+(trace.path.includes(i)?'wr-powered':'')+'" aria-label="Girar peça '+(i+1)+', '+ports.map(p=>labels[p]).join(' e ')+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg></button>';
    }).join('');
    return {title:'Reconecte a malha',hint:'O tremor soltou as conexões. O pacote entra pela esquerda da peça 1 e precisa sair pela direita da peça 6. Toque nas peças para girá-las. O trecho energizado acompanha o pacote.',
      body:'<div class="wr-pipes">'+tiles+'</div>',submit:'Enviar pacote de teste'};
  }
  if(state.stage===4){
    return {title:'Qual eco confirma a gravação?',hint:'O manifesto foi confirmado no registro 421. Os relógios das sondas podem estar adiantados. Compare as duas amostras e sincronize uma cópia que já aplicou a gravação.',
      body:warProbes.map((p,i)=>'<label class="wr-sample"><input type="radio" name="sample" required value="'+i+'"><span><strong>'+p.name+'</strong><br>'+p.time+' · último registro aplicado '+p.lsn+'</span></label>').join(''),submit:'Sincronizar esta cópia'};
  }
  const signal=warBeacon(state),dish=state.field.dish;
  const dial=Array.from({length:5},(_,i)=>'<span class="'+(i===dish?'wr-dish ':'')+(i===signal.goal?'wr-target':'')+'">'+(i+1)+'</span>').join('');
  return {title:'Pilote a antena',hint:'O receptor espera no setor '+(signal.goal+1)+'. Ao capturar, a rajada empurra a antena uma casa para '+(signal.gust<0?'a esquerda':'a direita')+'. Oriente a antena antes do pulso.',
    body:'<div class="wr-dial" aria-hidden="true">'+dial+'</div><p>Antena no setor '+(dish+1)+' · Pulso '+(state.field.pulse+1)+' de 3</p><div class="wr-steering"><button type="button" data-steer="-1">← Esquerda</button><button type="button" data-steer="1">Direita →</button></div>',submit:'Capturar pulso'};
}
