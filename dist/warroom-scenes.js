// The panorama stays behind the hull. Each sector also supplies the deck's surface materials.
const warScenes=[
  {name:'Santuário das copas',inspiration:'The Legend of Zelda',sky:['#193e42','#87cfa6'],floor:['#bdc6a0','#adba91','#b7c49d'],wall:'#637c69',trim:'#dfc895',
   surface:'<path d="m-19 6 6-3 5 2m20-12 5 2" stroke="#899f76" fill="none"/>',
   panorama:`<circle cx="459" cy="-27" r="13" fill="#fff0ab"/><path fill="#568e79" d="M0 3 62-24l28 13 61-30 68 40 71-40 62 30 66-20 49 20 62-29 91 42v22H0z"/>
   <g fill="#285c56"><path d="M0 29V-19h20v-12h36v12h16v24h-9v22zm61 2V-5h13v-17h23v11h15v24H98v17zm470 0V-8h11v-14h33v15h17v32zm55 0v-49h13v-14h21v64z"/></g>
   <g fill="#8cad89" stroke="#435f59" stroke-width="2"><path d="M163 24V-8h8v-5h17v37zm50 0v-37h18v5h7v32z"/><path d="M158-9v-10h12v-5h55v5h16v10z"/></g>
   <path d="M153 26h96v6h-96zm15-45h36v3h-36zm47 11h6v13h-6z" fill="#abd68b"/><path d="m302 18 4-6 4 6-4 5zm-178-22 2-4 2 4-2 4z" fill="#f7e59c"/>`},
  {name:'Gruta de basalto',inspiration:'Metroid',sky:['#1c1630','#74537d'],floor:['#b7a6b3','#ad9aa9','#c0adbc'],wall:'#68576e',trim:'#d9a5aa',
   surface:'<path d="m-21-6 5 3-4 3m24 4 6-3 4 1" fill="none" stroke="#8b768e"/>',
   panorama:`<path fill="#533d65" d="M0-55h620v15l-52 4-24 24-16-23-46 2-27 17-9-18-80-1-28 28-17-26-89-2-17 19-11-16-59-2-22 26-19-23-60 4L0-2z"/>
   <path fill="#30283e" d="M0-55h620v11h-35l-12 27-4-27h-32l-11 15-4-14H394l-12 24-9-23h-43l-11 39-12-41H163l-10 21-6-17H91L70-4 58-38H21L0-13z"/>
   <path fill="#40334f" d="M0 12 41 0l24 17 53-9 55 16 61-15 42 8 57-8 67 8 60-13 43 13 60-15 57 9v25H0z"/>
   <g fill="#69d4cc" stroke="#407680" stroke-width="2"><path d="m72 19-7-20 4-8 8 14 5-22 6 10-5 25zm389 4-6-18 4-8 5 11 4-24 6 5-3 33zm64 1 5-15 5-4-2 20z"/></g>
   <g fill="#efb679"><rect x="201" y="1" width="3" height="3"/><rect x="221" y="-5" width="2" height="2"/><rect x="414" y="-8" width="3" height="3"/></g>`},
  {name:'Cobertura da avenida',inspiration:'GTA: Vice City',sky:['#654071','#f3ac81'],floor:['#b8aebb','#aaa4b0','#c3b7bd'],wall:'#56657b',trim:'#e4a7a5',
   surface:'<path d="M-19 6h15m15-13h6" stroke="#938895" stroke-width="1.5"/>',
   panorama:`<circle cx="428" cy="-14" r="22" fill="#ffd099"/><path d="M398-8h61m-61 6h61m-58 6h55" stroke="#d68c91" stroke-width="2"/>
   <path fill="#665270" d="M0 23V-3h35v-18h24V3h13v-32h38v48h15v-21h34v-14h18v35h24V-9h38v28h14v-39h23v-9h20v49h22V-3h36v18h25v-28h17v34h50V-5h47v22h21v-42h17v-10h11v8h11v40h15V-4h29v23h24v-39h35v47H0z"/>
   <g stroke="#f2a8b8" stroke-width="2" stroke-dasharray="4 5"><path d="M75-18h32m-32 7h32m146 4h35m-35 7h35m205-14h32m-32 7h32"/></g>
   <path d="M0 19h620v8H0z" fill="#35384d"/><path d="M0 21h620" stroke="#8ad3cc"/><g class="wr-traffic"><path d="M0 17h11v-3h9l5 3h5v4H0z" fill="#f2b57c"/><path d="M22 17h5v2h-5z" fill="#fff2a8"/></g>
   <g fill="#363b51"><path d="m46 26 4-42h4l-1 42zm5-42-17-5-10 5 9-10 17 3-7-13 13 11 10-12-4 14 12-3 9 8-13-3-11 4z"/></g>`},
  {name:'Vale dos anéis',inspiration:'Sonic the Hedgehog',sky:['#387da7','#a3e2d4'],floor:['#cbb796','#c0a985','#d4c3a4'],wall:'#658b76',trim:'#efd08a',
   surface:'<path d="M-21-6h6v4h-6zm6 4h6v4h-6zm24 6h5v3h-5z" fill="#ac8d65" opacity=".65"/>',
   panorama:`<path fill="#e7f4dc" d="M48-29h12v-6h16v6h14v7H48zm267-10h12v-5h11v5h14v6h-37z"/>
   <path fill="#61a39a" d="M0 11 60-13l47 20 53-35 60 41 87-32 59 30 62-32 66 34 64-21 62 19v22H0z"/>
   <path d="M0 13h105l17 8h71q21 0 22-22a24 24 0 1 1 43 16q-4 8 15 8h91l30-12h94l20 9h112" fill="none" stroke="#966544" stroke-width="13"/>
   <path d="M0 8h106l18 8h69q17 0 17-18a29 29 0 1 1 52 21h102l30-13h94l20 9h112" fill="none" stroke="#94cc65" stroke-width="5"/>
   <g stroke="#ffda6c" stroke-width="3" fill="none"><ellipse cx="320" cy="3" rx="4" ry="6"/><ellipse cx="338" cy="0" rx="4" ry="6"/><ellipse cx="356" cy="-4" rx="4" ry="6"/></g>`},
  {name:'Câmara de sincronismo',inspiration:'Portal',sky:['#334955','#a4b5bc'],floor:['#ced0c6','#c0c5c1','#d6d7cb'],wall:'#818f93',trim:'#d4e4d9',
   surface:'<path d="m-22-9 12 0m22 18 7 0" stroke="#8f9d9d" stroke-width="2"/>',
   panorama:`<path d="M0-55h620v87H0z" fill="#7d8e93"/><path d="M0-54h620v12H0zM0 15h620v15H0z" fill="#475c65"/>
   <path d="M0-15h620M31-42v58m55-58v58m55-58v58m55-58v58m55-58v58m55-58v58m55-58v58m55-58v58m55-58v58m55-58v58m55-58v58" stroke="#63757e" stroke-width="2"/>
   <path d="M109-39h60m167 0h60m109 0h59" stroke="#def3e8" stroke-width="4"/>
   <g fill="#273d48" stroke-width="4"><ellipse cx="89" cy="-9" rx="10" ry="20" stroke="#70dce7"/><ellipse cx="440" cy="-9" rx="10" ry="20" stroke="#f3a96d"/></g>
   <path d="M205 13v-11h112v-10h29" fill="none" stroke="#d5ede3" stroke-width="3" stroke-dasharray="4 4"/><path d="M344-14h19v15h-19z" fill="#344c58"/><circle cx="353" cy="-7" r="3" fill="#efb582"/>`},
  {name:'Circuito de reentrada',inspiration:'F-Zero',sky:['#202547','#805984'],floor:['#aab8be','#bcc4c2','#9cabb2'],wall:'#536a78',trim:'#c2e2d9',
   surface:'<path d="m-19 2 5-4 5 4m-2 3 5-4 5 4" stroke="#81959a" fill="none"/>',
   panorama:`<circle cx="500" cy="-37" r="17" fill="#daa9ac"/><path d="M0 4 58-12l43 11 76-23 56 25 77-19 69 23 75-21 100 22 66-16v41H0z" fill="#4e4868"/>
   <path d="M0 27q152-13 220-37t172-12q96 10 228 8" fill="none" stroke="#2d374d" stroke-width="16"/><path d="M0 20q152-13 220-37t172-12q96 10 228 8" fill="none" stroke="#74dbdd" stroke-width="3"/>
   <path d="M0 33Q152 20 220-4t172-12q96 10 228 8" fill="none" stroke="#ed9dac" stroke-width="2"/>
   <g fill="none" stroke="#b1cbd1" stroke-width="4"><path d="m132 10 5-29h27l7 16m110-25 5-18h19l8 13m114 13 3-22h19l9 24"/></g>
   <path class="wr-racer" d="m0 0 9-5 12 2-4 4H2z" fill="#ffd776"/>`}
];
