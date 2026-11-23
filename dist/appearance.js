const appearanceKey='stackquest.preferencias.v1.aparencia';
const appearanceChoices=[
  {key:'theme',label:'Tema',options:[['auto','Automático'],['light','Claro'],['dark','Escuro']]},
  {key:'accent',label:'Cor de destaque',options:[['laranja','Laranja'],['azul','Azul'],['verde','Verde']]},
  {key:'text',label:'Tamanho do texto',options:[['normal','Padrão'],['grande','Ampliado']]}
];
const colorPreference=window.matchMedia('(prefers-color-scheme: dark)');
function appearanceValues(raw){
  let data;try{data=JSON.parse(raw);}catch{}
  return Object.fromEntries(appearanceChoices.map(({key,options})=>[key,
    options.some(([value])=>value===data?.[key])?data[key]:options[0][0]]));
}
function loadAppearance(){
  try{return appearanceValues(progressStore.getItem(appearanceKey));}catch{return appearanceValues(null);}
}
function applyAppearance(settings=loadAppearance()){
  const {theme,accent,text}=settings;
  const html=document.documentElement;
  html.dataset.theme=theme==='auto'?(colorPreference.matches?'dark':'light'):theme;
  html.dataset.accent=accent;html.dataset.text=text;
}
function appearancePage(){
  let settings=loadAppearance();
  main.innerHTML=header('Preferências','Aparência','Escolha como ler as missões e trabalhar nos laboratórios.')+
    '<form class="lessoncard appearance">'+appearanceChoices.map(({key,label,options})=>'<fieldset><legend>'+label+'</legend>'+
      options.map(([value,name])=>'<label><input type="radio" name="'+key+'" value="'+value+'" '+(value===settings[key]?'checked':'')+'><span>'+name+'</span></label>').join('')+
    '</fieldset>').join('')+'<p>'+(account.name?'Suas preferências acompanham sua conta nos dispositivos em que você entrar.':'Suas preferências de visitante ficam neste navegador.')+'</p><button type="button" class="textlink">Restaurar padrão</button><p role="status" id="appearance-status"></p></form>';
  const form=main.querySelector('.appearance'),status=form.querySelector('[role=status]');
  function storeSettings(){
    applyAppearance(settings);
    try{progressStore.setItem(appearanceKey,JSON.stringify(settings));status.textContent=account.name?'Preferência aplicada à conta.':'Preferência salva neste navegador.';}
    catch{status.textContent='Preferência aplicada. O navegador bloqueou o salvamento.';}
  }
  form.onchange=e=>{settings={...settings,[e.target.name]:e.target.value};storeSettings();};
  form.querySelector('button').onclick=()=>{
    settings=appearanceValues(null);
    for(const [key,value] of Object.entries(settings))form.elements[key].value=value;
    storeSettings();
  };
}
colorPreference.addEventListener('change',()=>applyAppearance());
window.addEventListener('storage',e=>{
  if(!account.name&&e.key===appearanceKey){applyAppearance();if(location.hash==='#aparencia')appearancePage();}
});
applyAppearance();
