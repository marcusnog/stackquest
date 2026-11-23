const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const vm = require('node:vm');

const read = name => readFileSync(join(__dirname, 'dist', name), 'utf8');
function studySession() {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      innerHTML: '', addEventListener() {}, replaceChildren() { this.innerHTML = ''; }
    });
    return elements.get(id);
  }
  const account = {name:''};
  const context = vm.createContext({
    account, document:{querySelector:element, getElementById:element},
    window:{addEventListener() {}}, restoreAccount:()=>new Promise(()=>{}),
    labGuides:[], dbCases:[], icon:()=>'', syncLabel:()=>'', labXP:()=>0
  });
  vm.runInContext(['course.js','distributed.js','ai-course.js','app.js'].map(read).join('\n'),context);
  return {context,account,element};
}

test('A retomada prioriza a última missão aberta da trilha e aceita registros antigos',()=>{
  const {context}=studySession();
  const run=source=>vm.runInContext(source,context);
  assert.equal(run('nextLesson().id'),'1-1');
  run("records.set('2-1',{started:true})");
  assert.equal(run('nextLesson().id'),'2-1');
  run("records.set('8-1',{started:true,lastOpened:10});records.set('1-3',{started:true,lastOpened:20})");
  assert.equal(run('nextLesson().id'),'1-3');
  assert.equal(run('nextLesson(lessons.filter(l=>l.m>=coreModules.length)).id'),'8-1');
  run("records.get('1-3').date='2026-11-23'");
  assert.equal(run('nextLesson().id'),'8-1');
  run("lessons.forEach(l=>records.set(l.id,{date:'2026-11-23'}))");
  assert.equal(run('nextLesson()'),undefined);
});

test('O cartão acompanha a sessão e os sete níveis da trilha', () => {
  assert.match(read('index.html'), /id="profile" hidden/);
  const {context,account,element}=studySession();
  const render = () => vm.runInContext("chrome('roadmap','Roadmap')",context);
  const profile = element('profile');
  render();
  assert.equal(profile.hidden,true);
  assert.equal(profile.innerHTML,'');
  assert.doesNotMatch(element('nav').innerHTML,/#comunidades/);

  account.name='aluno';
  const titles=['Estagiário de Engenharia de Software','Engenheiro de Software Júnior',
    'Engenheiro de Software Pleno','Engenheiro de Software Sênior','Staff Software Engineer',
    'Principal Software Engineer','Distinguished Engineer'];
  for (const [i,title] of titles.entries()) {
    if (i>0) vm.runInContext(`lessons.filter(l=>l.m===${i-1}).forEach(l=>records.set(l.id,{date:'2026-11-22'}))`,context);
    render();
    assert.match(element('nav').innerHTML,/#comunidades/);
    assert.equal(profile.hidden,false);
    assert.ok(profile.innerHTML.includes('<strong>'+title+'</strong>'));
    assert.ok(profile.innerHTML.includes('Nível 0'+(i+1)+' · '+(i*300)+' XP'));
  }
  assert.equal(vm.runInContext("badges.find(b=>b.title==='Stack completa').progress()",context),18);
  vm.runInContext("lessons.forEach(l=>records.set(l.id,{date:'2026-11-22'}))",context);
  render();
  assert.ok(profile.innerHTML.includes('Nível 07 · 3300 XP'));
  assert.ok(profile.innerHTML.includes('Distinguished Engineer'));
  account.name='';
  render();
  assert.equal(profile.hidden,true);
  assert.equal(profile.innerHTML,'');
});
