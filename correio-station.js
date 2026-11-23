// The drawing uses only fixed artwork, validated counts and palette indices derived from job IDs.
function correioStation(frame = {}, warehouseOnly = false, previousFrame) {
  const waiting = Array.isArray(frame?.waiting) ? frame.waiting : [];
  const workers = Array.isArray(frame?.workers) ? frame.workers : [];
  const number = n => Number.isSafeInteger(n) && n >= 0 ? n : 0;
  const sent = number(frame?.sent), retries = number(frame?.retries);
  const occupied = value => typeof value === 'string' && value.length > 0;
  const busy = workers.filter(occupied).length;
  const svg = p => p.map(point => point.join(',')).join(' ');
  const polygon = (points, fill) => '<polygon points="'+svg(points)+'" fill="'+fill+'"/>';
  const line = (points, stroke, width=1) => '<polyline points="'+svg(points)+'" stroke="'+stroke+'" stroke-width="'+width+'" fill="none"/>';
  const rect = (x,y,w,h,fill) => '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+fill+'"/>';
  const ellipse = (x,y,rx,ry,fill) => '<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="'+fill+'"/>';
  const move = (x,y,art) => '<g transform="translate('+x+' '+y+')">'+art+'</g>';
  const iso = ([a,b,z]) => [a-b,(a+b)/2-z];
  const face = (p,c) => polygon(p.map(iso),c);
  function block(a,b,z,w,d,h,top,front,end) {
    const x=a+w,y=b+d,t=z+h;
    return face([[a,y,z],[x,y,z],[x,y,t],[a,y,t]],front)+
      face([[x,y,z],[x,b,z],[x,b,t],[x,y,t]],end)+
      face([[a,b,t],[x,b,t],[x,y,t],[a,y,t]],top);
  }
  const front = (a,b,z,w,h,c) => face([[a,b,z],[a+w,b,z],[a+w,b,z+h],[a,b,z+h]],c);
  const side = (a,b,z,w,h,c) => face([[a,b,z],[a,b+w,z],[a,b+w,z+h],[a,b,z+h]],c);

  function parcel(id, size=10) {
    const tapes = ['#f2efa4','#78c6bf','#dd8a82','#a5b9e2'];
    let hash = 0;
    if (typeof id === 'string') {
      for (let k=0;k<Math.min(id.length,48);k++) hash=(Math.imul(hash,31)+id.charCodeAt(k))>>>0;
    }
    const tape=tapes[hash%tapes.length], d=size*.82, h=size*.82, b=-d/2,a=-size/2;
    let shape=block(a,b,0,size,d,h,'#edbd7e','#c08b5d','#99684e');
    shape+=face([[-1,b,h],[1.5,b,h],[1.5,b+d,h],[-1,b+d,h]],tape)+front(-1,b+d,h-3,2.5,3,tape);
    return shape+front(a+1.5,b+d,1.5,2.5,1.5,'#f6e7bd');
  }
  function depot() {
    let s=ellipse(312,219,246,41,'#173644');
    const floor=[[20,158],[164,86],[452,86],[604,162],[456,236],[176,236]];
    s+=polygon([[20,158],[176,236],[456,236],[604,162],[604,173],[456,247],[176,247],[20,169]],'#4e6571');
    s+=polygon([[20,163],[176,241],[456,241],[604,167],[604,171],[456,245],[176,245],[20,167]],'#b67855');
    s+=polygon(floor,'#d2ba91');
    // Tiled floor clipped to the hexagon without SVG IDs, so several maps can coexist.
    for(let i=-8;i<=16;i++) {
      const k=i*37;
      for(const dir of [-.5,.5]) {
        const intercept=116+k, points=[];
        for(let j=0;j<floor.length;j++) {
          const [x1,y1]=floor[j],[x2,y2]=floor[(j+1)%floor.length];
          const den=(y2-y1)-dir*(x2-x1);
          if (Math.abs(den)<.0001) continue;
          const t=(dir*x1+intercept-y1)/den;
          if(t>=0&&t<=1) points.push([x1+t*(x2-x1),y1+t*(y2-y1)]);
        }
        if(points.length>=2) s+=line(points.slice(0,2),'#baa382',.9);
      }
    }
    s+=polygon([[20,158],[164,86],[164,46],[20,118]],'#9b9b89');
    s+=polygon([[164,46],[452,46],[452,86],[164,86]],'#bec0a7');
    s+=polygon([[452,46],[604,122],[604,162],[452,86]],'#a3a58e');
    s+=polygon([[20,119],[164,47],[452,47],[604,123],[604,127],[452,51],[164,51],[20,123]],'#e8d7a5');
    s+=polygon([[20,145],[164,73],[452,73],[604,149],[604,155],[452,79],[164,79],[20,151]],'#437874');
    s+=polygon([[20,148],[164,76],[452,76],[604,152],[604,154],[452,78],[164,78],[20,150]],'#6fa39a');
    for(const x of [217,281,345]) {
      s+=rect(x,53,44,19,'#477473')+rect(x+2,55,40,15,'#75a6a6')+
        polygon([[x+4,67],[x+13,55],[x+19,55],[x+8,70],[x+4,70]],'#acd0bb')+
        rect(x+20,54,2,17,'#567d79')+rect(x+1,62,42,2,'#567d79');
    }
    s+=rect(390,53,23,17,'#387776')+rect(392,56,19,11,'#f7dfad')+
      line([[392,56],[401.5,62],[411,56]],'#a9584a',1.8);
    for(const x of [183,422]) {
      s+=rect(x,46,2,11,'#6f7d76')+polygon([[x-6,58],[x-1,53],[x+3,53],[x+8,58]],'#777d71')+rect(x-7,58,16,2,'#ffe6a4');
    }
    // Front pedestrian lane, with a gap for the loading dock.
    s+=polygon([[58,164],[162,216],[175,216],[70,164]],'#ab8f6b');
    s+=polygon([[62,163],[166,214],[170,214],[66,162]],'#f3db9a');
    for(const x of [192,216,240,264,288,312,336,360,384,408]) {
      s+=polygon([[x,220],[x+12,220],[x+16,222],[x+4,222]],'#f4dc9a');
    }
    return s;
  }
  if (warehouseOnly) return '<svg viewBox="0 39 624 219" aria-hidden="true" focusable="false">'+depot()+'</svg>';
  function conveyor(x,y,length,loaded) {
    let s=block(-length/2,-6,2,length,12,4,'#496a74','#354b58','#273e49');
    for(let a=-length/2+3;a<length/2;a+=5)
      s+=face([[a,-4,6],[a+1.6,-4,6],[a+1.6,4,6],[a,4,6]],'#9aafb0');
    if(loaded) s+='<g class="cj-belt">'+face([[-5,1,6],[-3,-1,6],[1,1,6],[2,-3,6],[5,-2,6],[4,4,6]],'#f2cc72')+'</g>';
    return move(x,y,s);
  }
  function intake() {
    let s=ellipse(130,152,57,15,'#b09f80');
    // A sorting rack remains visibly empty when no orders are queued.
    for(const [x,y] of [[103,128],[143,147]]) s+=move(x,y,block(-1,-1,0,3,3,27,'#6d8785','#527775','#3f6669'));
    s+=move(114,128,block(-19,-9,19,38,18,3,'#ffe2a6','#d7b780','#a68a64'));
    s+=move(114,128,block(-19,-9,2,38,18,3,'#e9d49d','#b79d70','#9b815f'));
    const spots=[[110,100],[123,106],[102,106],[114,112],[110,120],[123,126]];
    for(const [i,[x,y]] of spots.entries()) if(i+1<waiting.length) s+=move(x,y,parcel(waiting[i+1],9));
    for(const [x,y] of [[87,133],[125,152]]) s+=move(x,y,block(-1,-1,0,3,3,27,'#728e88','#577b76','#46696a'));
    s+=move(90,127,block(-4,-2,0,9,4,6,'#ebc886','#c99b6b','#ad8159'));
    s+=conveyor(177,149,37,waiting.length>0);
    if(waiting.length) s+=move(174,141,parcel(waiting[0],9));
    return s;
  }
  function clerk() {
    return block(-5,-4,0,9,7,11,'#83ac9c','#477d77','#316967')+
      block(-4,-4,11,8,7,8,'#edc89d','#ddb183','#ba8d6a')+
      block(-5,-5,18,10,9,3,'#4a7f79','#306963','#275c5d')+
      block(-5,3,18,10,3,1,'#689389','#4a7872','#315e5b');
  }
  function workbench(id,index) {
    const active=occupied(id);
    let s=ellipse(0,6,29,9,'#b29f7e');
    if(active) s+=move(-2,-12,'<g class="cj-clerk">'+clerk()+'</g>');
    else s+=move(-2,-12,block(-4,-3,2,8,6,7,'#80918b','#4a6564','#395557'));
    for(const [a,b] of [[-14,4],[12,4],[12,-7]]) s+=block(a,b,0,3,3,13,'#899592','#577473','#446768');
    s+=block(-15,-8,13,31,17,4,'#f3d49b','#bd986b','#987c5b');
    s+=front(-13,9,14,8,1.5,'#e2be86')+side(16,-6,14,5,1.5,'#c8a67b');
    s+=move(8,-20,block(-3,-3,0,7,6,3,'#84a8a0','#4d7874','#396862'));
    s+=move(8,-22,block(-2,-1,0,7,1.5,6,'#94b6aa','#314d55','#273f48'));
    s+=move(8,-22,front(-1,.5,1,5,4,active?'#8ee5bc':'#7b9997'));
    if(active) {
      s+=move(-5,-18,parcel(id,8));
      s+='<g class="correio-stamp"><path d="M-12 -25l3 -2 3 2 -3 2z" fill="#ffdc7d"/></g>';
    }
    s+=move(3,1,block(-2,-2,0,4,4,2,'#b5b5a2','#87928b','#6b7975'));
    return s+front(-13,9,14,2+(index%3),1.5,active?'#b5f1b4':'#879e90');
  }
  function wheel(x,y) {
    return move(x,y,polygon([[-5,-3],[-2,-6],[2,-6],[5,-3],[5,3],[2,6],[-2,6],[-5,3]],'#30454d')+
      ellipse(0,0,2.4,3.4,'#abb9b0')+ellipse(0,0,.85,1.5,'#677b7d'));
  }
  function van() {
    let s=ellipse(0,8,45,13,'#ad9d80');
    s+=block(-24,-12,5,52,23,5,'#78918a','#4c696a','#3a5862');
    s+=block(-24,-12,10,33,23,22,'#f3e4b5','#e5cf9e','#b7a37d');
    s+=front(-24,11,13,33,5,'#ba5549')+side(9,-12,13,23,5,'#9d4b42');
    s+=front(-18,11,21,14,7,'#6a9790')+face([[-18,11,28],[-11,11,23],[-4,11,28]],'#f8e8c0');
    s+=block(10,-11,10,15,21,15,'#6aaca3','#4a8c83','#35766f');
    s+=block(24,-11,10,6,21,7,'#7faf9d','#61978b','#487d77');
    s+=front(12,10,17,9,5,'#a9d1c5')+side(25,-8,18,15,5,'#99c2ba');
    s+=front(12,10,14,2,1,'#ebd59e')+side(30,-9,13,4,2,'#ffe399')+side(30,6,13,3,2,'#ffe399');
    s+=wheel(-25,-1)+wheel(9,16);
    return s;
  }
  function dispatch() {
    let s=move(477,125,van());
    s+=move(468,168,block(-14,-8,0,28,15,6,'#cadaaa','#8ba186','#708b79'));
    s+=move(468,163,block(-9,-6,0,18,12,12,'#568985','#396b66','#315d5d'));
    s+=move(468,163,front(-7,6,6,14,3,'#283f48'));
    if(sent>0) {
      const sheets=Math.min(sent,4);
      for(let i=0;i<sheets;i++) s+=move(465,165-i*1.5,block(-4,0,0,9,7,1,'#fff3ce','#d6be92','#b8a385'));
      s+=polygon([[456,152],[463,155],[463,161],[460,161],[456,159]],'#fff0c5')+
        line([[457,155],[461,157]],'#6a827b',1.1);
    }
    s+=move(494,176,block(-3,-2,0,6,4,16,'#899b8a','#6b877c','#50736d'));
    s+=move(494,157,block(-4,-3,0,8,6,4,retries?'#ffce74':'#c8c6a7',retries?'#d18b4b':'#8a9a89',retries?'#aa713e':'#71867a'));
    return s;
  }
  function marker(x,y,text,value,accent) {
    const count=String(value);
    const w=Math.max(text.length*6.4+16,count.length*9.4+16);
    return move(x,y,'<rect x="'+(-w/2)+'" y="0" width="'+w+'" height="32" rx="4" fill="#213e47"/>'+
      '<text x="0" y="12" text-anchor="middle" fill="#e4efe5" font-family="system-ui,sans-serif" font-size="10" font-weight="700">'+text+'</text>'+
      '<text x="0" y="27" text-anchor="middle" fill="'+accent+'" font-family="ui-monospace,Consolas,monospace" font-size="14" font-weight="700">'+count+'</text>');
  }
  const short = n => n < 1000 ? String(n) : new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(n);
  const positions=workers.length<=2?[[295,144],[326,167]]:[[296,136],[337,155],[258,156],[300,177]];
  const event=frame?.event||{}, desk=Number.isInteger(event.worker)?positions[event.worker]:null;
  const queue=[174,141], printer=[467,148], retryRack=[494,150];
  let movingParcel='',signal='';
  if(previousFrame){
    let from,to;
    if(event.kind==='receive'){from=queue;to=desk;}
    if(event.kind==='print'){from=desk;to=printer;}
    if(event.kind==='retry'){from=retryRack;to=queue;}
    if(event.kind==='crash' && frame.delayed>previousFrame.delayed){from=desk;to=retryRack;}
    if(from && to) movingParcel=move(...from,'<g class="cj-transit" style="--travel-x:'+(to[0]-from[0])+'px;--travel-y:'+(to[1]-from[1])+'px">'+parcel(event.order,12)+'</g>');
  }
  const labels={crash:'QUEDA',retry:'REENTREGA',dedupe:'JÁ REGISTRADO',print:'ETIQUETA',receive:'EM TRIAGEM'};
  if(Object.hasOwn(labels,event.kind)){
    const [x,y]=event.kind==='retry'?queue:event.kind==='print'?printer:desk||queue;
    const id=/^P-\d{3}$/.test(event.order)?event.order:'';
    signal=marker(x,y-67,labels[event.kind],id,event.kind==='crash'?'#ffaf95':'#ffe0a0');
  }
  let desks='';
  for(let i=0;i<Math.min(positions.length,workers.length);i++) desks+=move(...positions[i],workbench(workers[i],i));
  if(!workers.length) desks=move(295,148,block(-12,-8,0,26,16,3,'#c5ad85','#ab9677','#97866d'));
  const aria='Oficina postal. '+waiting.length+' na fila, '+busy+' de '+workers.length+' bancadas ocupadas, '+sent+' despachos e '+retries+' reentregas.';
  return '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+aria+'" class="correio-station" viewBox="0 0 624 280" style="display:block;width:100%;height:auto">'+
    '<rect width="624" height="280" fill="#203e4b"/><path d="M0 213L168 150 376 124 624 205V280H0Z" fill="#1e3946"/>'+
    depot()+intake()+conveyor(368,169,40,busy>0)+desks+dispatch()+movingParcel+
    marker(115,178,'NA FILA',short(waiting.length),'#ffda92')+marker(295,201,'EM TRABALHO',short(busy)+'/'+short(workers.length),'#a2edcf')+
    marker(440,192,'DESPACHOS',short(sent),'#a2edcf')+marker(535,174,'REENTREGAS',short(retries),'#ffda92')+signal+'</svg>';
}
