function rankingPage(){
  const owner=account.name;
  main.innerHTML=header('Conquistas','Ranking global','Compare o XP acumulado por quem estuda no StackQuest.')+
    '<section class="lessoncard leaderboard"><div class="ranking-toolbar"><h2>Classificação geral</h2><button class="textlink" type="button" data-refresh>Atualizar</button></div>'+
    '<p class="footnote">Missões valem 100 XP, labs de infraestrutura 200 XP e decisões de banco 50 XP. Cada atividade pontua uma vez. Contas com o mesmo XP dividem a posição.</p>'+
    '<div data-personal></div><p role="status" data-status></p><div data-list></div>'+
    '<div class="ranking-pages" hidden><button type="button" data-prev>Anterior</button><span data-page></span><button type="button" data-next>Próxima</button></div></section>';
  const panel=main.querySelector('.leaderboard'),field=name=>panel.querySelector('[data-'+name+']');
  const nav=panel.querySelector('.ranking-pages'),format=new Intl.NumberFormat('pt-BR');
  let current=1,lastPage=1,expired=false;
  async function load(page){
    field('refresh').disabled=true;field('prev').disabled=true;field('next').disabled=true;
    field('status').textContent='Carregando classificação…';
    try{
      if(owner&&!expired&&account.pending.size)await flushProgress();
      const path='/api/ranking?page='+page;
      let data;
      try{data=await callApi(path,'GET',undefined,{authenticated:!expired});}
      catch(error){
        if(error.status!==401||expired||!owner)throw error;
        expired=true;
        field('list').innerHTML='';
        field('personal').innerHTML='Sua sessão expirou. <a class="textlink" href="#conta">Entre novamente para ver sua posição.</a>';
        field('personal').querySelector('a').onclick=event=>{
          event.preventDefault();location.replace('#conta');location.reload();
        };
        data=await callApi(path,'GET',undefined,{authenticated:false});
      }
      if(!panel.isConnected||account.name!==owner)return;
      const pages=Math.max(1,Math.ceil(data.total/data.pageSize));
      if(page>pages){return await load(pages);}
      current=page;lastPage=pages;
      const mine=data.mine;
      if(!expired)field('personal').innerHTML=owner?(mine?'<b>Sua posição</b> '+mine.position+'º · '+format.format(mine.xp)+' XP':'Sua conta entra na classificação ao sincronizar a primeira atividade com XP.'):'<a href="#conta" class="textlink">Entre para acompanhar sua posição</a>';
      field('status').textContent=(data.total?format.format(data.total)+(data.total===1?' participante':' participantes'):'Ainda não há participantes com XP.')+(owner&&account.pending.size?' Há progresso pendente de sincronização.':'');
      field('list').innerHTML=data.entries.length?'<table><thead><tr><th scope="col">Posição</th><th scope="col">Participante</th><th scope="col">XP</th></tr></thead><tbody>'+
        data.entries.map(row=>'<tr'+(row.name===mine?.name?' class="ranking-mine"':'')+'><td>'+row.position+'º</td><th scope="row">'+studioText(row.name)+(row.name===mine?.name?' <small>(você)</small>':'')+'</th><td>'+format.format(row.xp)+'</td></tr>').join('')+'</tbody></table>':'';
      nav.hidden=pages<=1;field('page').textContent='Página '+current+' de '+pages;
      field('prev').disabled=current<=1;field('next').disabled=current>=pages;
    }catch(error){
      if(!panel.isConnected)return;
      field('status').textContent='Não foi possível carregar o ranking. Use Atualizar para tentar novamente.';
      // Restore navigation to the last successfully displayed page.
      field('prev').disabled=current<=1;field('next').disabled=current>=lastPage;
    }finally{field('refresh').disabled=false;}
  }
  field('prev').onclick=()=>load(current-1);field('next').onclick=()=>load(current+1);
  field('refresh').onclick=()=>load(current);load(1);
}
