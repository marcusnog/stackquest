// Compact, labeled fixtures let the learner inspect every retrieval and prediction.
const ragPassages=[
  {id:'P1',text:'O reembolso de uma compra aprovada volta ao cartão em até cinco dias úteis.',v:[1,0,0]},
  {id:'P2',text:'O prazo da devolução do pagamento começa no dia da aprovação pelo financeiro.',v:[.95,.05,0]},
  {id:'P3',text:'O extrato apresenta a palavra estorno junto ao identificador da compra.',v:[.4,.1,.5]},
  {id:'P4',text:'Após a expedição, a encomenda pode ser rastreada pelo código da transportadora.',v:[0,1,0]},
  {id:'P5',text:'Uma entrega sem atualização por três dias úteis deve ser encaminhada ao suporte.',v:[0,.95,.05]},
  {id:'P6',text:'O comprovante do pedido inclui o endereço de faturamento da conta.',v:[0,.1,.9]},
  {id:'P7',text:'Clientes de outra organização consultam um contrato distinto para reembolso e entrega.',v:[1,1,0],tenant:'B'}
];
const ragQueries=[
  {text:'Quando cai meu estorno?',v:[1,0,0],gold:['P1','P2']},
  {text:'Onde está meu pacote e quando devo pedir ajuda?',v:[0,1,0],gold:['P4','P5']}
];
function words(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]+/g)||[];}
function dot(a,b){return a.reduce((sum,x,i)=>sum+x*b[i],0);}
function retrieve(query,mode,k){
  const corpus=ragPassages.filter(p=>p.tenant!=='B');
  const docs=corpus.map(p=>words(p.text));
  const terms=[...new Set(words(query.text).filter(t=>t.length>3))];
  const avg=docs.reduce((n,d)=>n+d.length,0)/docs.length;
  const ranked=corpus.map((p,i)=>{
    const lexical=terms.reduce((score,t)=>{
      const df=docs.filter(d=>d.includes(t)).length;
      const tf=docs[i].filter(x=>x===t).length;
      const idf=Math.log(1+(docs.length-df+.5)/(df+.5));
      return score+idf*tf*2.2/(tf+1.2*(.25+.75*docs[i].length/avg));
    },0);
    return {p,lexical,semantic:dot(query.v,p.v)/Math.sqrt(dot(query.v,query.v)*dot(p.v,p.v))};
  });
  const lex=ranked.filter(r=>r.lexical>0).sort((a,b)=>b.lexical-a.lexical);
  const sem=ranked.filter(r=>r.semantic>0).sort((a,b)=>b.semantic-a.semantic);
  function reciprocal(list,row){const pos=list.indexOf(row);return pos<0?0:1/(61+pos);}
  const hits=ranked.map(row=>({p:row.p,score:mode==='lex'?row.lexical:mode==='sem'?row.semantic:reciprocal(lex,row)+reciprocal(sem,row)}))
    .filter(r=>r.score>0).sort((a,b)=>b.score-a.score).slice(0,k);
  const relevant=hits.filter(r=>query.gold.includes(r.p.id)).length;
  return {hits,relevant,recall:relevant/query.gold.length,precisionAtK:relevant/k};
}
const labelsAI=['Cobrança','Acesso','Entrega'];
const featuresAI=['pagamento','senha','frete','boleto','pix','token','credencial','remessa','coleta'];
const trainAI=[
  ['boleto e pagamento pendentes',0],['falha no pix',0],['boleto expirado',0],
  ['senha e credencial inválidas',1],['token bloqueado',1],['credencial expirada',1],
  ['frete de uma remessa',2],['coleta pendente',2],['atraso na remessa',2]
];
const holdoutAI=[['segunda via do boleto',0],['pix voltou hoje',0],['token do aplicativo expirou',1],
  ['recuperar minha credencial',1],['rastrear remessa internacional',2],['reagendar coleta de amanhã',2]];
function trainAdapter(rank,epochs,noisy){
  const xFor=s=>featuresAI.map(f=>Number(words(s).includes(f)));
  const base=labelsAI.map((_,i)=>featuresAI.map((_,j)=>i===j?3:0));
  const A=Array.from({length:rank},(_,r)=>featuresAI.map((_,j)=>.12*Math.sin((r+1)*(j+1))));
  const B=labelsAI.map(()=>Array(rank).fill(0));
  function forward(x){
    const h=A.map(row=>dot(row,x));
    const logits=base.map((row,i)=>dot(row,x)+dot(B[i],h));
    const exp=logits.map(z=>Math.exp(z-Math.max(...logits)));
    const total=exp.reduce((n,v)=>n+v,0);
    return {h,probs:exp.map(n=>n/total)};
  }
  function evaluate(){
    const rows=holdoutAI.map(([text,target])=>{
      const {probs}=forward(xFor(text));
      return {text,target,predicted:probs.indexOf(Math.max(...probs)),loss:-Math.log(Math.max(probs[target],1e-12))};
    });
    return {rows,correct:rows.filter(e=>e.target===e.predicted).length,loss:rows.reduce((n,e)=>n+e.loss,0)/rows.length};
  }
  const before=evaluate();
  for(let e=0;e<epochs;e++){
    for(const [i,[text,target]] of trainAI.entries()){
      const y=noisy&&(i===4||i===5)?2:target;
      const x=xFor(text),{h,probs}=forward(x);
      const dz=probs.map((p,c)=>p-Number(c===y));
      const dh=A.map((_,r)=>dz.reduce((sum,g,c)=>sum+g*B[c][r],0));
      for(let c=0;c<B.length;c++)for(let r=0;r<rank;r++)B[c][r]-=.16*dz[c]*h[r];
      for(let r=0;r<rank;r++)for(let j=0;j<x.length;j++)A[r][j]-=.16*dh[r]*x[j];
    }
  }
  return {before,after:evaluate(),parameters:rank*(featuresAI.length+labelsAI.length)};
}
function mountAiPractice(box,id,prior,saveSettings){
  const rag=id==='9-2';
  const fields=rag?[
    ['query','Pergunta',ragQueries.map((q,i)=>[String(i),q.text])],
    ['mode','Recuperador',[['lex','Lexical · BM25'],['sem','Vetores didáticos · cosseno'],['rrf','Fusão de rankings · RRF']]],
    ['k','Limite de trechos',[['1','1'],['2','2'],['3','3']]]
  ]:[
    ['rank','Posto do adaptador',[['1','1'],['2','2']]],
    ['epochs','Épocas de treino',[['0','0 · linha de base'],['10','10'],['60','60']]],
    ['data','Exemplos de treino',[['clean','Rótulos revisados'],['noise','Dois rótulos de acesso trocados por entrega']]]
  ];
  box.innerHTML='<h2>'+(rag?'Bancada de recuperação':'Bancada de fine-tuning')+'</h2><p>'+
    (rag?'Recupere evidências de um manual de suporte. O filtro de organização é aplicado antes da busca. Os vetores de três dimensões foram atribuídos à mão para tornar visível o efeito de vocabulários diferentes.':'Ajuste de fato as matrizes A e B de um classificador linear congelado para encaminhar chamados. O modelo base reconhece pagamento, senha e frete. Nove exemplos ensinam o vocabulário do suporte; seis frases ficam reservadas para avaliação. O exemplo demonstra a atualização de baixo posto em escala pequena.')+
    '</p>'+practiceTutorial(rag?'rag':'adapter')+'<form class="ai-controls"></form><div class="ai-result" role="status"></div>';
  const form=box.querySelector('form'),result=box.querySelector('.ai-result');
  for(const [key,label,choices] of fields){
    const field=document.createElement('label');field.textContent=label;
    const select=document.createElement('select');select.name=key;
    choices.forEach(([value,text])=>select.add(new Option(text,value)));
    if(choices.some(([value])=>value===prior?.[key]))select.value=prior[key];
    field.append(select);form.append(field);
  }
  const button=document.createElement('button');button.type='submit';button.className='act';button.textContent=rag?'Recuperar evidências':'Executar treino e avaliação';form.append(button);
  function run(settings){
    if(rag){
      const q=ragQueries[Number(settings.query)],k=Number(settings.k),r=retrieve(q,settings.mode,k);
      result.innerHTML='<h3>Evidências recuperadas</h3><p>Recall@'+k+': '+r.relevant+'/'+q.gold.length+' · Precisão@'+k+': '+r.relevant+'/'+k+'. Evidências esperadas: '+q.gold.join(' e ')+'.</p>'+
        (r.hits.length?'<ol>'+r.hits.map(({p})=>'<li><b>'+p.id+'</b> '+p.text+'</li>').join('')+'</ol>':'<p>Nenhum trecho pontuou. A resposta deve pedir esclarecimento ou se abster.</p>')+
        '<p class="footnote">Compare o ranking lexical com o vetorial mantendo o mesmo k. Um trecho que menciona o termo pode não conter a resposta.</p>';
    }else{
      const r=trainAdapter(+settings.rank,+settings.epochs,settings.data==='noise');
      result.innerHTML='<h3>Avaliação reservada</h3><p>Acertos: '+r.before.correct+'/6 antes e '+r.after.correct+'/6 depois. Entropia cruzada média: '+r.before.loss.toFixed(3)+' → '+r.after.loss.toFixed(3)+'. Parâmetros treináveis: '+r.parameters+'.</p>'+
        '<div class="ai-table"><table><thead><tr><th>Chamado</th><th>Esperado</th><th>Previsto</th></tr></thead><tbody>'+r.after.rows.map(row=>'<tr><td>'+row.text+'</td><td>'+labelsAI[row.target]+'</td><td>'+labelsAI[row.predicted]+'</td></tr>').join('')+'</tbody></table></div>'+
        '<p class="footnote">O cálculo usa W + BA e descida do gradiente. Compare os erros por classe ao trocar os rótulos. Seis frases servem para inspecionar o mecanismo; uma decisão de produção exige um teste maior e independente.</p>';
    }
  }
  form.onchange=()=>{result.replaceChildren();};
  form.onsubmit=e=>{e.preventDefault();const settings=Object.fromEntries(new FormData(form));saveSettings(settings);run(settings);};
  if(prior&&fields.every(([key,,choices])=>choices.some(([value])=>value===prior[key])))run(prior);
}
