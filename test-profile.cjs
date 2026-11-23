const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const vm = require('node:vm');

test('O cartão acompanha a sessão e os sete níveis da trilha', () => {
  const read = name => readFileSync(join(__dirname, 'dist', name), 'utf8');
  assert.match(read('index.html'), /id="profile" hidden/);
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
  const render = () => vm.runInContext("chrome('roadmap','Roadmap')",context);
  const profile = element('profile');
  render();
  assert.equal(profile.hidden,true);
  assert.equal(profile.innerHTML,'');

  account.name='aluno';
  const titles=['Estagiário de Engenharia de Software','Engenheiro de Software Júnior',
    'Engenheiro de Software Pleno','Engenheiro de Software Sênior','Staff Software Engineer',
    'Principal Software Engineer','Distinguished Engineer'];
  for (const [i,title] of titles.entries()) {
    if (i>0) vm.runInContext(`lessons.filter(l=>l.m===${i-1}).forEach(l=>records.set(l.id,{date:'2026-11-22'}))`,context);
    render();
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
