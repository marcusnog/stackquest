import {basicSetup, EditorView} from 'codemirror';
import {EditorState, Compartment} from '@codemirror/state';
import {javascript} from '@codemirror/lang-javascript';
import {json} from '@codemirror/lang-json';
import {yaml} from '@codemirror/lang-yaml';
import {oneDark} from '@codemirror/theme-one-dark';
import {openSearchPanel} from '@codemirror/search';

export function openEditor(parent, files, initial, save, cursor) {
  let file = initial;
  const states = new Map();
  const access = new Compartment();
  let locked = false;
  function notify(view) {
    const head = view.state.selection.main.head;
    const line = view.state.doc.lineAt(head);
    cursor(line.number, head - line.from + 1);
  }
  function create(name) {
    const language = name.endsWith('.json') ? json() : name.endsWith('.yaml') ? yaml() : javascript();
    return EditorState.create({doc:files[name], extensions:[
      basicSetup, oneDark, language, EditorState.tabSize.of(2),
      EditorState.phrases.of({Find:'Buscar',Replace:'Substituir',next:'próximo',previous:'anterior',
        all:'todos','match case':'diferenciar maiúsculas','by word':'palavra inteira',regexp:'expressão regular',
        replace:'substituir','replace all':'substituir todos',close:'fechar','Go to line':'Ir para linha'}),
      EditorView.lineWrapping, access.of(EditorState.readOnly.of(locked)),
      EditorView.contentAttributes.of({'aria-label':'Código de ' + name, spellcheck:'false'}),
      EditorView.updateListener.of(update => {
        if (update.docChanged) save(name, update.state.doc.toString());
        if (update.docChanged || update.selectionSet) notify(update.view);
      })
    ]});
  }
  const view = new EditorView({state:create(file), parent});
  return {
    select(name) {
      if (name !== file) {
        states.set(file,view.state);
        file = name;
        view.setState(states.get(file) || create(file));
        this.lock(locked);
      }
      notify(view);
    },
    lock(value) {
      locked = value;
      if(view.state.readOnly !== value) view.dispatch({effects:access.reconfigure(EditorState.readOnly.of(value))});
    },
    search() {openSearchPanel(view);},
    focus() {view.focus();},
    destroy() {view.destroy();}
  };
}
