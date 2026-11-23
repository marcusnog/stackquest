const warPoint=([x,y])=>[72+55*x+10*y,100+32*y];
const warAt=(pos,art)=>'<g transform="translate('+warPoint(pos).join(' ')+')">'+art+'</g>';
function warItemArt(kind){
  if(kind==='torch')return '<path fill="#327b82" d="m-10 2 13-9 5 6-13 10z"/><path fill="#f3bc67" d="m1-7 5-4 7 7-6 4z"/><path fill="#fff2b4" d="m6-11 4-2 6 7-3 2z"/>';
  if(kind===1)return '<path fill="#335d68" d="m-12-3 16-7 9 10-16 8z"/><path fill="#90dfc7" d="m-11-6 15-6 9 9-16 7z"/><path stroke="#326c66" stroke-width="2" d="m-6-6 8-3m-5 6 8-3"/>';
  return '<path fill="#ac795c" d="m-12-6 15-5 9 12-16 6z"/><path fill="#ffdfa2" d="m-12-8 15-5 9 12-16 6z"/><path stroke="#956750" stroke-width="1.8" d="m-6-7 7-3m-5 6 9-3m-7 6 7-2"/>';
}
function warMap(){
  let floor='',markers='',furniture='';
  for(let y=0;y<5;y++)for(let x=0;x<9;x++){
    floor+=warAt([x,y],'<path d="m-32-16 55 0 10 32h-55z" fill="'+(['#aab5a4','#b9bfa9','#b4bca8'][(x+y*2)%3])+'" stroke="#909e96" stroke-width=".8"/><path d="m-27-12 5 0m40 22 4 0" stroke="#c9cebb"/>');
  }
  for(let x=0;x<9;x++)markers+=warAt([x,4],'<text x="8" y="32" text-anchor="middle">'+warCoord([x,0])[0]+'</text>');
  for(let y=0;y<5;y++)markers+=warAt([0,y],'<text x="-42" y="4" text-anchor="middle">'+(y+1)+'</text>');
  const consoleArt=(i)=>'<path fill="#496574" d="m-19-12 28-5 13 7-30 8z"/><path fill="#315262" d="m-19-12 11 10v11l-11-8z"/><path fill="#527782" d="m-8-2 30-8v11L-8 9z"/><path fill="#284656" d="m-15-28 27-3 2 17-28 4z"/><path class="wr-display" fill="#85dcca" d="m-12-25 21-2 1 10-21 3z"/><path d="m-9-19 4-2 3 1 3-4 3 1 3-2" fill="none" stroke="#375f62" stroke-width="1.8"/><text x="2" y="19" class="wr-sign">'+['OBS','POOL','ACK'][i]+'</text>';
  warChapters.forEach((ch,i)=>{furniture+=warAt(ch.desk,consoleArt(i));});
  furniture+=warAt(warBreaker,'<path fill="#415864" d="m-11-29 20-2 4 4v24l-22 4-3-4z"/><path fill="#82969c" d="m-8-26 19-2v23L-8-2z"/><rect x="-4" y="-21" width="10" height="13" fill="#314758"/><path class="wr-switch" stroke="#f4c272" stroke-width="4" d="m-2-13 7-3"/>');
  furniture+=warAt([3,2],'<path d="m-22-15 153-1 15 13-155 4z" fill="#ddbd8b"/><path d="m-22-15 13 16v11l-13-11z" fill="#877455"/><path d="m-9 1 155-4v7L-9 9z" fill="#ab8865"/><path d="M-4 8v9m138-13v10" stroke="#546974" stroke-width="6"/><path d="m15-11 28-1 6 6-29 2z" fill="#e6dfac"/><path d="m47-13 24-1 4 9-24 2z" fill="#3b5966"/><path d="m50-11 17-1 2 5-17 2z" fill="#92ccb8"/><path d="m105-11 9-1 2 7-9 1z" fill="#c36b4e"/>');
  const player='<ellipse cy="2" rx="12" ry="4" fill="#314752" opacity=".45"/><g class="wr-body"><path fill="#283d55" d="M-7-9H6v10H2l-2-6-2 6h-5z"/><path fill="#d9854f" d="m-9-20 11-3 7 5-1 12-12 2-5-5z"/><path fill="#f2b768" d="m-9-20 10-3 7 3-11 4z"/><path fill="#a75c43" d="m-4-16 12-4-1 14-11 2z"/><path fill="#95d1c5" d="m-2-14 6-2v4l-6 2z"/><path fill="#dfac87" d="M-6-29 4-31l6 4-1 8-9 3-6-4z"/><path fill="#413a42" d="m-8-31 10-4 9 5-1 5-7 1-4-2-5 4-3-2z"/><path d="M-5-27q-5 7-4 12" fill="none" stroke="#50404a" stroke-width="4"/><path d="M6-24h2" stroke="#4a3b36" stroke-width="2"/></g>';
  return '<svg viewBox="0 0 620 278" aria-hidden="true" class="wr-map"><defs><radialGradient id="wr-beam" gradientUnits="userSpaceOnUse" r="91"><stop offset="0" stop-color="#091220" stop-opacity=".08"/><stop offset=".55" stop-color="#091220" stop-opacity=".18"/><stop offset="1" stop-color="#091220" stop-opacity=".97"/></radialGradient></defs>'+
    '<rect width="620" height="278" fill="#1d3743"/><ellipse cx="320" cy="233" rx="275" ry="28" fill="#172d37"/><path d="M40 84V41h495v43z" fill="#637f84"/><path d="m535 41 49 158v44l-49-159z" fill="#4d6973"/><path d="M40 42h495" stroke="#d7bc8b" stroke-width="5"/><path d="M43 75h489" stroke="#40727a" stroke-width="7"/>'+
    '<rect x="231" y="46" width="119" height="29" rx="2" fill="#2c4653"/><path class="wr-display" d="M237 66h14l5-5 7 3 8-12 9 14h14l7-6h10l6 3h17" fill="none" stroke="#8adfc2" stroke-width="2"/>'+
    '<text x="56" y="65" fill="#e1e8d0" font-family="monospace" font-size="11">SALA DE INCIDENTES</text>'+
    '<g transform="translate(389 36)">'+plantaoSprite('api')+'</g><g transform="translate(422 36)">'+plantaoSprite('api')+'</g>'+
    '<path d="m40 84 50 160h495v9H85L35 91z" fill="#687b78"/>'+floor+'<g fill="#deead7" font-family="monospace" font-size="9">'+markers+'</g>'+furniture+
    '<g id="wr-drop"></g><g id="wr-player">'+player+'</g><rect id="wr-dark" width="620" height="278" fill="#091220" opacity="0" pointer-events="none"/><g id="wr-beacon"></g></svg>';
}
