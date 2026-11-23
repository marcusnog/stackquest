const warAt=(pos,art)=>'<g transform="translate('+warPoint(pos).join(' ')+')">'+art+'</g>';
function warItemArt(kind){
  if(kind==='cobre')return '<g fill="none" stroke="#713c27" stroke-width="5"><ellipse cx="-4" cy="-3" rx="6" ry="8"/><ellipse cx="3" cy="-4" rx="6" ry="8"/></g><g fill="none" stroke="#eea66b" stroke-width="2"><ellipse cx="-4" cy="-3" rx="6" ry="8"/><ellipse cx="3" cy="-4" rx="6" ry="8"/></g>';
  if(kind==='titanio')return '<path d="m-12 0 5-9 14-3 5 8-4 6-16 3z" fill="#a6b8c3" stroke="#374e61" stroke-width="2"/><path d="m-7-8 4 7 14-3" fill="none" stroke="#e0eff3" stroke-width="2"/>';
  if(kind==='ceramica')return '<path d="m-12-4 15-5 9 6-15 6zM-12 1l9 6 15-6" fill="#f0dfb5" stroke="#795a44" stroke-width="2"/>';
  if(kind==='relay')return '<path d="m-9 4 9-16 9 16z" fill="#d4b274" stroke="#334950" stroke-width="2"/><path d="M0-7v6m-8 6H8" stroke="#294b53" stroke-width="3"/><circle cy="-10" r="3" fill="#fff4ba"/>';
  if(kind===3)return '<path d="m-12-7 17-3 7 8-18 5z" fill="#7abac4" stroke="#284852" stroke-width="2"/><path d="m-5-5 8-2m-4 5 8-2" stroke="#e5ddaf" stroke-width="2"/>';
  if(kind===4)return '<path d="m-9 7 11-14 4 3-11 14z" fill="#b4a9d5" stroke="#38495a" stroke-width="2"/><circle cx="4" cy="-7" r="5" fill="#8ad7cc" stroke="#36565a" stroke-width="2"/>';
  if(kind===5)return '<path d="m-11-4 17-3 6 9-18 4z" fill="#d88f68" stroke="#394854" stroke-width="2"/><path d="m4-6 2-8m-12 14 7-1" stroke="#ffe3a1" stroke-width="2"/>';
  if(kind==='torch')return '<path fill="#327b82" d="m-10 2 13-9 5 6-13 10z"/><path fill="#f3bc67" d="m1-7 5-4 7 7-6 4z"/><path fill="#fff2b4" d="m6-11 4-2 6 7-3 2z"/>';
  if(kind===1)return '<path fill="#335d68" d="m-12-3 16-7 9 10-16 8z"/><path fill="#90dfc7" d="m-11-6 15-6 9 9-16 7z"/><path stroke="#326c66" stroke-width="2" d="m-6-6 8-3m-5 6 8-3"/>';
  return '<path fill="#ac795c" d="m-12-6 15-5 9 12-16 6z"/><path fill="#ffdfa2" d="m-12-8 15-5 9 12-16 6z"/><path stroke="#956750" stroke-width="1.8" d="m-6-7 7-3m-5 6 9-3m-7 6 7-2"/>';
}
function warMap(){
  let floor='',markers='',furniture='';
  for(let y=0;y<5;y++)for(let x=0;x<9;x++){
    floor+=warAt([x,y],'<path d="m-32-16 55 0 10 32h-55z" fill="var(--wr-floor-'+((x+y*2)%3)+')" stroke="#899493" stroke-width=".8"/><use href="#wr-floor-mark"/>');
  }
  for(let x=0;x<9;x++)markers+=warAt([x,4],'<text x="8" y="32" text-anchor="middle">'+warCoord([x,0])[0]+'</text>');
  for(let y=0;y<5;y++)markers+=warAt([0,y],'<text x="-42" y="4" text-anchor="middle">'+(y+1)+'</text>');
  const consoleArt=(i)=>'<path fill="#496574" d="m-19-12 28-5 13 7-30 8z"/><path fill="#315262" d="m-19-12 11 10v11l-11-8z"/><path fill="#527782" d="m-8-2 30-8v11L-8 9z"/><path fill="#284656" d="m-15-28 27-3 2 17-28 4z"/><path class="wr-display" fill="#85dcca" d="m-12-25 21-2 1 10-21 3z"/><path d="m-9-19 4-2 3 1 3-4 3 1 3-2" fill="none" stroke="#375f62" stroke-width="1.8"/><text x="2" y="19" class="wr-sign">'+['OBS','POOL','ACK'][i]+'</text>';
  warDesks.forEach((desk,i)=>{furniture+=warAt(desk,'<g class="wr-console" style="--boot-delay:'+i*220+'ms">'+consoleArt(i)+'</g>');});
  furniture+=warAt(warBulkhead,'<g id="wr-hatch"><path d="M-15-31h29v29l-5 4h-24z" fill="#384b55" stroke="#b7a178" stroke-width="2"/><path d="M-10-25H9v17h-19z" fill="#78928e"/><path d="m-8-23 15 13m0-13-15 13" stroke="#455762" stroke-width="2"/><circle cy="-15" r="4" fill="#d2ac6b"/></g>');
  furniture+=warAt(warBreaker,'<path fill="#415864" d="m-11-29 20-2 4 4v24l-22 4-3-4z"/><path fill="#82969c" d="m-8-26 19-2v23L-8-2z"/><rect x="-4" y="-21" width="10" height="13" fill="#314758"/><path class="wr-switch" stroke="#f4c272" stroke-width="4" d="m-2-13 7-3"/>');
  furniture+=warAt([3,2],'<path d="m-22-15 153-1 15 13-155 4z" fill="#ddbd8b"/><path d="m-22-15 13 16v11l-13-11z" fill="#877455"/><path d="m-9 1 155-4v7L-9 9z" fill="#ab8865"/><path d="M-4 8v9m138-13v10" stroke="#546974" stroke-width="6"/><path d="m15-11 28-1 6 6-29 2z" fill="#e6dfac"/><path d="m47-13 24-1 4 9-24 2z" fill="#3b5966"/><path d="m50-11 17-1 2 5-17 2z" fill="#92ccb8"/><path d="m105-11 9-1 2 7-9 1z" fill="#c36b4e"/>');
  // Three 24 × 28 frames per direction: idle, left stride, right stride.
  const player='<path d="M-11 0h22v3h-22zM-7-1H7v5H-7z" fill="#314752" opacity=".4"/>'+
    '<g id="wr-facing"><svg id="wr-pose" x="-21" y="-45" width="42" height="49" viewBox="0 0 24 28" overflow="hidden">'+
    '<image href="warroom-lia.png" width="72" height="84" style="image-rendering:pixelated"/><image x="72" href="warroom-lia-actions.png" width="48" height="84" style="image-rendering:pixelated"/></svg></g>'+
    '<g id="wr-held" visibility="hidden"><path d="M-3-2H5v-2h4v8H5V2h-8z" fill="#478b89"/><path d="M6-3h4v6H6z" fill="#ffe6a0"/><path d="M-3-1h4v3h-4z" fill="#efb585"/></g>';
  return '<svg viewBox="0 -55 620 333" aria-hidden="true" class="wr-map"><defs>'+
    '<linearGradient id="wr-sky" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="var(--wr-zenith)"/><stop offset="1" stop-color="var(--wr-horizon)"/></linearGradient><g id="wr-floor-mark"></g>'+
    '<linearGradient id="wr-falloff"><stop stop-color="#080808"/><stop offset=".72" stop-color="#191919"/><stop offset="1" stop-color="#bbb"/></linearGradient>'+
    '<mask id="wr-light-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="620" height="278"><rect width="620" height="278" fill="white"/><g id="wr-light-carrier"><g id="wr-beam"><circle r="26" fill="#555"/><path d="M0 0 123-89 Q170 0 123 89Z" fill="url(#wr-falloff)"/></g></g></mask></defs>'+
    '<rect x="0" y="-55" width="620" height="90" fill="url(#wr-sky)"/><g id="wr-panorama"></g><path class="wr-solar-veil" d="m0-42 66 23 64-17 66 13 90-24 100 29 94-22 140 18v10l-140-18-94 22-100-29-90 24-66-13-64 17L0-32z" fill="#bbf5ae"/>'+
    '<path d="M0 33Q310 18 620 33v245H0z" fill="#223b46"/><path d="M0 33Q310 18 620 33" stroke="var(--wr-trim)" stroke-width="4" fill="none"/><ellipse cx="320" cy="233" rx="275" ry="28" fill="#152c37"/><path d="M40 84V41h495v43z" fill="var(--wr-wall)"/><path d="m535 41 49 158v44l-49-159z" fill="#4d6973"/><path d="M40 42h495" stroke="var(--wr-trim)" stroke-width="5"/><path d="M43 75h489" stroke="#40727a" stroke-width="7"/>'+
    '<rect x="231" y="46" width="119" height="29" rx="2" fill="#2c4653"/><path class="wr-display" d="M237 66h14l5-5 7 3 8-12 9 14h14l7-6h10l6 3h17" fill="none" stroke="#8adfc2" stroke-width="2"/>'+
    '<text x="56" y="65" fill="#e1e8d0" font-family="monospace" font-size="11">CONVÉS ORBITAL</text>'+
    '<path d="M422 76h74" stroke="#34545e" stroke-width="3"/>'+
    '<g class="wr-wall-rack" transform="translate(423 44) scale(.65)">'+plantaoSprite('api')+'</g><g class="wr-wall-rack" transform="translate(464 44) scale(.65)">'+plantaoSprite('api')+'</g>'+
    '<path d="m40 84 50 160h495v9H85L35 91z" fill="#687b78"/>'+floor+'<g fill="#deead7" font-family="monospace" font-size="9">'+markers+'</g>'+
    '<g id="wr-conduit" visibility="hidden"><path d="M237 68h115v-8h67v22h90" fill="none" stroke="#334c57" stroke-width="5"/><path d="M237 68h115v-8h67v22h90" fill="none" stroke="#e8b969" stroke-width="2"/><rect x="227" y="63" width="20" height="10" rx="1" fill="#ffe7a2"/><text x="237" y="71" text-anchor="middle" font-size="8" font-family="monospace" fill="#3f342b">B</text></g>'+furniture+
    '<g id="wr-ice">'+warIce.map(pos=>warAt(pos,'<path d="m-29-14 49-1 12 28-48 1z" fill="#b3eeeb" opacity=".86"/><path d="m-18 1 11-6 8 4 14-8m-18 9 4 7 12 4" stroke="#6ba6b4" stroke-width="1.4" fill="none"/><path d="m-17-5 3-8 3 8-2 4zM15 4l3-7 3 8z" fill="#f2ffff"/>')).join('')+'</g>'+
    Object.entries(warMaterials).map(([key,m])=>warAt(m.pos,'<ellipse class="wr-material-pin '+key+'" cy="2" rx="23" ry="13" fill="none" stroke="#ffe18b" stroke-width="3" stroke-dasharray="5 3"/>'+warItemArt(key)+'<text class="wr-sign" text-anchor="middle" y="12">'+m.name+'</text>')).join('')+
    '<g id="wr-drop"></g><g id="wr-player">'+player+'</g><g id="wr-pickups"></g><rect id="wr-dark" width="620" height="278" fill="#091220" opacity="0" pointer-events="none"/><g id="wr-beacon">'+warAt(warTorch,'<circle r="11" fill="#f2cd84" opacity=".25"/>'+warItemArt('torch'))+'<use href="#wr-player" opacity=".32"/></g></svg>';
}
