/* A cell spans one world unit. Local building coordinates use the same axes at a smaller scale. */
const {plantaoMap, plantaoSprite} = (() => {
  const names = {client:'Loja', api:'Servidor de API', sql:'Banco SQL', kv:'Banco chave-valor', cache:'Cache'};
  const glyph = {client:'LOJA', api:'API', sql:'SQL', kv:'KV', cache:'CACHE'};
  const area = (points, fill, attrs='') => '<polygon points="'+points.map(p=>p.join(',')).join(' ')+'" fill="'+fill+'" '+attrs+'/>';
  const box = (x,y,w,h,fill) => '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+fill+'"/>';
  const at = (x,y,body) => '<g transform="translate('+x+' '+y+')">'+body+'</g>';
  const iso = ([u,v,h=0]) => [u-v,(u+v)*.5-h];
  const face = (points,fill) => area(points.map(iso),fill);
  function cube(u,v,z,width,depth,height,top,left,right) {
    const x=u+width, y=v+depth, h=z+height;
    return face([[u,y,z],[x,y,z],[x,y,h],[u,y,h]],left)+
      face([[x,y,z],[x,v,z],[x,v,h],[x,y,h]],right)+
      face([[u,v,h],[x,v,h],[x,y,h],[u,y,h]],top);
  }
  function front(u,v,z,w,h,color) {
    return face([[u,v,z],[u+w,v,z],[u+w,v,z+h],[u,v,z+h]],color);
  }
  function side(u,v,z,w,h,color) {
    return face([[u,v,z],[u,v+w,z],[u,v+w,z+h],[u,v,z+h]],color);
  }
  const plinth = () => cube(-16,-14,0,32,28,3,'#cbd6a8','#738b70','#526e60');
  function shop() {
    let s=plinth()+cube(-13,-10,3,26,20,22,'#ffe9b4','#ecc68c','#ba865a');
    s+=front(-10,10,6,9,13,'#674b48')+front(-8,10,8,5,8,'#86cbd0');
    s+=front(2,10,7,8,11,'#5c5b60')+front(3,10,9,6,8,'#a5e6e1');
    s+=side(13,-6,10,10,8,'#a67b58')+side(13,-5,11,8,6,'#73b1b5');
    s+=cube(-15,-12,25,30,24,3,'#ffc877','#d58045','#be6242');
    for (let i=0;i<6;i++) {
      const x=-15+i*5, bright=i%2?'#fff1ca':'#ee704c', shade=i%2?'#ddce9f':'#bd4b38';
      s+=face([[x,8,27],[x+5,8,27],[x+5,16,23],[x,16,23]],bright)+front(x,16,20,5,3,shade);
    }
    return s+cube(-5,-6,28,11,3,6,'#fff0b0','#718d80','#4b7168');
  }
  function server() {
    let s=plinth()+cube(-12,-10,3,24,20,4,'#95bdc7','#486c7a','#355768');
    for (const z of [7,16,25]) {
      s+=cube(-12,-10,z,24,20,8,'#88aebe','#4c6a81','#344d66');
      s+=front(-10,10,z+1,14,5,'#203c50')+front(-9,10,z+3,10,1.6,'#7ed0e7');
      s+=front(7,10,z+2,2.3,2.3,'#afff9a')+front(4,10,z+2,1.5,2.3,'#ffca71');
      for(const v of [-6,-2,2,6]) s+=side(12,v,z+2,1.6,4,'#223d52');
    }
    s+=cube(-10,-8,33,20,16,2,'#b9d5d5','#829ca7','#577986');
    for (const v of [-3,0,3]) s+=face([[-6,v,35],[5,v,35],[5,v+1,35],[-6,v+1,35]],'#637f90');
    return s;
  }
  function cylinder(r,y,h,cap,colors) {
    const floor=[[-r,-3],[-r*.57,-r*.43],[r*.47,-r*.43],[r,-3],[r,3],[r*.53,r*.45],[-r*.53,r*.45],[-r,3]];
    const top=floor.map(([x,k])=>[x,k+y-h]);
    let svg='';
    for(let i=3;i<8;i++) {
      const j=(i+1)%8;
      svg+=area([top[i],top[j],[floor[j][0],floor[j][1]+y],[floor[i][0],floor[i][1]+y]],colors[i-3]);
    }
    return svg+area(top,cap);
  }
  function database() {
    let s=plinth();
    for (let layer=0;layer<3;layer++) {
      const y=-3-layer*9;
      s+=cylinder(19,y,8,'#b2dce5',['#427f9b','#599ab4','#86becd','#6ba6bc','#538da4']);
      s+=cylinder(19,y-5,2,'#d6eff0',['#89bac7','#99cbd4','#c8e2df','#a7d3da','#94bcc8']);
    }
    return s+cylinder(17,-28,2,'#d5ecdf',['#90c5cd','#a7d4d5','#b7dcd8','#a6cdd0','#91bec4'])+
      area([[-8,-30],[0,-34],[8,-30],[0,-26]],'#739dac')+box(5,-9,3,2,'#b6ffad');
  }
  function keyValue() {
    let s=plinth();
    s+=cube(-11,-13,3,19,15,25,'#cfb2f5','#8c6ebe','#70589d');
    s+=cube(-12,-14,27,21,17,3,'#e2c8fa','#a585cf','#8a71b4');
    s+=cube(-5,1,3,19,14,16,'#bb9be4','#8f69b2','#684c87');
    s+=cube(-6,0,18,21,16,3,'#d8b8ed','#b194d3','#8269ab');
    s+=front(-2,15,8,5,5,'#ffe2a0')+front(2,15,10,6,2,'#ffe2a0')+front(6,15,8,2,3,'#ffe2a0');
    return s+side(14,5,8,6,2,'#bca3d4');
  }
  function cache() {
    let s=plinth()+cube(-13,-11,3,26,22,6,'#80baab','#438575','#32695f');
    s+=cube(-10,-8,9,20,16,15,'#75c9b3','#318c79','#247768');
    for(const z of [11,16,21]) s+=front(-8,8,z,16,1.5,'#75e0bc')+side(10,-6,z,12,1.5,'#53b6a0');
    s+=cube(-13,-11,24,26,22,3,'#96e2bf','#509e83','#387b70');
    return s+area([[-1,-27],[-1,-32],[-5,-32],[2,-45],[8,-45],[4,-37],[9,-37]],'#a57934')+
      area([[-3,-28],[-3,-33],[-7,-33],[0,-46],[6,-46],[2,-38],[7,-38]],'#ffe37e');
  }
  const blocks = {client:shop(),api:server(),sql:database(),kv:keyValue(),cache:cache()};
  const valid = i => Number.isInteger(i) && i>=0 && i<16;
  const coord = i => 'ABCD'[i%4]+(Math.floor(i/4)+1);
  const pos = i => [232+(i%4-Math.floor(i/4))*53,97+(i%4+Math.floor(i/4))*25];
  const lawn=['#9cc66a','#91bf64','#9dc970','#a7ce75'];
  const diamond=[[-53,0],[0,-25],[53,0],[0,25]];
  function ground(i) {
    const r=Math.floor(i/4),c=i%4,seed=(r*7+c*11)%4;
    let s=area(diamond,lawn[seed]);
    s+=area([[-53,0],[0,25],[53,0],[0,22]],'#709e55');
    s+=area([[-53,0],[0,-25],[3,-24],[-50,1]],'#bed995');
    // Worn stones form a build pad; tiny grasses mark the corners of each lot.
    s+=area([[-36,0],[-3,-16],[3,-16],[36,0],[3,17],[-3,17]],'#80a95f');
    s+=area([[-32,-1],[0,-16],[32,-1],[0,14]],'#adc67d');
    s+=area([[23,-7],[27,-9],[31,-7],[27,-5]],'#c2d68a');
    s+=box(-39,-3,2,3,'#518c58')+box(-36,-5,2,4,'#528954')+box(-33,-3,2,2,'#679d5a');
    if ((c+r)%3===0) s+=box(15,13,2,2,'#edcf7a')+box(18,10,2,3,'#528c56');
    return at(...pos(i),s);
  }
  function cliff(i,frontLeft) {
    const [x,y]=pos(i), sign=frontLeft?-1:1;
    const f=(t,h)=>[x+sign*53*t,y+25*(1-t)+h];
    const side=(t0,t1,top,bottom,fill)=>area([f(t0,top),f(t1,top),f(t1,bottom),f(t0,bottom)],fill);
    const depth=29+(i%3)*4;
    let s=side(0,1,-1,depth,frontLeft?'#53646a':'#45575f');
    s+=side(0,1,-1,10,frontLeft?'#947453':'#806447')+side(0,1,-1,4,frontLeft?'#76a45c':'#5c9257');
    for(let k=0;k<4;k++) {
      const start=k*.23+.025, end=start+.13;
      s+=side(start,end,11+(i+k)%4,16+(i+k)%4,frontLeft?'#a19170':'#908268');
      s+=side(start+.07,end+.06,20+(i+k)%3,24+(i+k)%3,frontLeft?'#718083':'#617177');
      if ((i+k)%3===0) s+=side(start,end,-1,7,'#729e50')+side(start+.035,end-.03,depth-2,depth+3,'#4a5d64');
    }
    return s;
  }
  function wire(a,b) {
    const [ax,ay]=pos(a),[bx,by]=pos(b);
    const sx=ax-13,sy=ay+12,ex=bx-13,ey=by+12;
    const turns=(b%4-a%4)*53;
    const mx=sx+turns,my=sy+turns*25/53;
    const d='M'+sx+' '+sy+'L'+mx+' '+my+' '+ex+' '+ey;
    const lastX=mx===ex&&my===ey?sx:mx,lastY=mx===ex&&my===ey?sy:my;
    const dx=ex-lastX,dy=ey-lastY,angle=Math.atan2(dy,dx)*180/Math.PI;
    return '<path d="'+d+'" stroke="#37565a" stroke-width="5" fill="none"/><path data-wire="'+a+'-'+b+'" pathLength="1" d="'+d+'" stroke="#ffcf71" stroke-width="2.3" fill="none"/>'+
      '<path transform="translate('+(lastX+dx*.57)+' '+(lastY+dy*.57)+') rotate('+angle+')" d="M-3 -3L4 0L-3 3Z" fill="#fff1aa" stroke="#546459" stroke-width=".8"/>';
  }
  function scenery() {
    let s=area([[27,256],[219,183],[438,256],[240,320]],'#173444');
    for(const [x,y,size] of [[28,46,2],[79,66,1],[368,52,2],[421,113,1],[57,257,1],[401,276,2],[172,37,1],[330,279,1],[312,26,1],[124,278,2]]) {
      s+=box(x,y,size,size,'#7daba8');
    }
    for (const [x,y] of [[48,105],[386,86],[92,243]]) {
      s+=at(x,y,box(-3,0,7,1,'#7fafac')+box(0,-3,1,7,'#7fafac'));
    }
    for (const [x,y,z] of [[77,228,1],[338,263,1],[202,306,.7]]) {
      s+='<g transform="translate('+x+' '+y+') scale('+z+')">'+cube(-4,-3,0,8,6,4,'#82918a','#566a70','#4b6067')+'</g>';
    }
    return s;
  }

  function plantaoMap(tiles=[],options={}) {
    const cells=Array.from({length:16},(_,i)=>Object.hasOwn(names,tiles?.[i])?tiles[i]:null);
    const wires=(Array.isArray(options.edges)?options.edges:[]).filter(e=>valid(e?.from)&&valid(e?.to)&&e.from!==e.to);
    let terrain=scenery();
    for(let n=0;n<4;n++) terrain+=cliff(12+n,true)+cliff(n*4+3,false);
    for(let i=0;i<16;i++) terrain+=ground(i);
    const keys=cells.map((type,i)=>{
      const selected=options.selected===i, active=options.active===i;
      const [x,y]=pos(i), code=coord(i);
      let s=area(diamond,'none','pointer-events="all"');
      s+=area([[-50,0],[0,-23],[50,0],[0,23]],'none','class="pt-rim" stroke="'+(selected?'#173d50':'none')+'" stroke-width="4.5"');
      s+=area([[-50,0],[0,-23],[50,0],[0,23]],'none','class="pt-ring" stroke="'+(selected?'#ffe28a':'none')+'" stroke-width="2.1"');
      if(type) {
        s+=area([[-25,4],[1,-6],[31,3],[4,17]],'#688f59')+blocks[type];
      } else {
        s+=area([[-5,0],[0,-2.5],[5,0],[0,2.5]],'#91b56c');
      }
      if(active) {
        s+=at(0,type?-49:-11,area([[-5,0],[0,-4],[5,0],[0,4]],'#244756')+area([[-3.1,0],[0,-2.4],[3.1,0],[0,2.4]],'#fdf9be'));
      }
      const caption=type?code+'·'+glyph[type]:code;
      const w=type?8+caption.length*4.65:15;
      s+=at(0,15,'<rect x="'+(-w/2)+'" y="-2" width="'+w+'" height="10" rx="2" fill="'+(selected?'#193c4b':type?'#2c5149':'#54764a')+'"/>'+
        '<text y="5.9" text-anchor="middle" fill="#fff7d6" font-family="ui-monospace,Consolas,monospace" font-size="8" font-weight="700">'+caption+'</text>');
      return '<g class="pt-cell" transform="translate('+x+' '+y+')" role="button" tabindex="0" data-cell="'+i+'" aria-pressed="'+selected+'" aria-label="'+
        code+', '+(type?names[type]:'terreno vazio')+(active?', em atividade':'')+'">'+s+'</g>';
    }).join('');
    return '<svg class="plantao-map" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 464 324" role="group" aria-label="Ilha de servidores, quatro colunas e quatro linhas" style="display:block;width:100%;height:auto;background:radial-gradient(ellipse at 50% 45%,#294c55,#1a3848 67%,#162e40)">'+
      '<style>.plantao-map .pt-cell{cursor:pointer;touch-action:manipulation}.plantao-map .pt-cell:focus-visible{outline:none}.plantao-map .pt-cell:is(:focus-visible,:hover) .pt-rim{stroke:#123c50}.plantao-map .pt-cell:is(:focus-visible,:hover) .pt-ring{stroke:#d5ffff;stroke-width:2.8}.plantao-map .pt-cell:focus-visible .pt-ring{stroke-dasharray:6 2}</style>'+
      '<g aria-hidden="true" pointer-events="none">'+terrain+wires.map(e=>wire(e.from,e.to)).join('')+'</g>'+keys+'</svg>';
  }
  const hardware={
    cpu:cube(-12,-12,0,24,24,3,'#e5bf76','#ac8348','#916b3d')+
      cube(-10,-10,3,20,20,3,'#41756c','#315b54','#264e48')+
      cube(-6,-6,6,12,12,4,'#dfede2','#a8c2c3','#839dad'),
    ram:cube(-19,-2,3,38,4,12,'#85bd9d','#499273','#396b5f')+
      [-15,-7,1,9].map(x=>front(x,2,7,6,6,'#213d44')+front(x,2,3,5,2,'#ffce75')).join(''),
    ssd:cube(-16,-10,0,32,20,6,'#9fb8c7','#546d86','#344658')+
      cube(-11,-7,6,23,14,1,'#e5ebe3','#c4d3cd','#93ada8')+
      cube(-9,-4,7,10,2,1,'#4d7d88','#41616c','#34505e')+front(-10,10,1,9,2,'#e2b55c')
  };
  function plantaoSprite(type) {
    if(Object.hasOwn(hardware,type))return '<svg class="plantao-sprite" viewBox="-28 -22 56 40" aria-hidden="true" focusable="false">'+hardware[type]+'</svg>';
    const shape=Object.hasOwn(blocks,type)?blocks[type]:'';
    return '<svg class="plantao-sprite" xmlns="http://www.w3.org/2000/svg" viewBox="-33 -49 66 68" width="48" height="48" aria-hidden="true" focusable="false">'+shape+'</svg>';
  }
  return {plantaoMap,plantaoSprite};
})();
