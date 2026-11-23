const screens=['central','briefing','diagnostico'];
const main=document.getElementById('conteudo');
function showScreen(){
  const target=location.hash.slice(1);
  const current=screens.includes(target)?target:'central';
  for(const name of screens)document.getElementById('screen-'+name).hidden=name!==current;
  for(const link of document.querySelectorAll('.preview-nav a')){
    if(link.hash==='#'+current)link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  }
  document.title=document.querySelector('#screen-'+current+' h1').textContent+' · StackQuest';
}
document.querySelector('.skip').onclick=event=>{event.preventDefault();main.focus();};
window.addEventListener('hashchange',()=>{showScreen();main.focus({preventScroll:true});window.scrollTo(0,0);});
showScreen();
const code=document.getElementById('sample-code'),hint=document.getElementById('sample-hint');
const output=document.getElementById('sample-output'),run=document.getElementById('sample-run');
code.value=warDeliveryFile;
code.oninput=()=>{hint.textContent='';};
function writeResult(message,level,test){
  const row=document.createElement(test?'button':'div');
  row.textContent=message+(test?' · Ver em app.js':'');
  if(level)row.dataset.level=level;
  if(test)row.onclick=()=>{
    const location=warTestLocation(code.value,test);
    const lines=code.value.split('\n');
    const offset=lines.slice(0,location.line-1).reduce((pos,line)=>pos+line.length+1,0);
    code.focus();code.setSelectionRange(offset,offset+lines[location.line-1].length);
    hint.textContent='Linha '+location.line+' · '+location.hint;
  };
  output.append(row);
}
run.onclick=async()=>{
  run.disabled=true;code.readOnly=true;output.replaceChildren();hint.textContent='';
  try{
    const result=await warDeliveryCommand(warDeliveryLab(code.value),'npm test',writeResult);
    writeResult(result.text,result.level);
  }catch(error){writeResult(error.message,'error',error.testCase);}
  finally{code.readOnly=false;run.disabled=false;}
};
