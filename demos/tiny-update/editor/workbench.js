import { basicSetup, EditorView } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';

// Two read-only CodeMirror 6 views, with real independent editor scrolling.
export function createCodeWorkbench(root, files) {
  const explorer = root.querySelector('.file-explorer');
  const panes = [...root.querySelectorAll('.editor-pane')];
  const buttons = new Map();
  let active = 0;
  function language(file) {
    return file.endsWith('.html') ? html() : file.endsWith('.json') ? json() : javascript();
  }
  const views = panes.map((pane, index) => {
    const compartment = new Compartment();
    const view = new EditorView({ parent: pane.querySelector('.editor-content'), state: EditorState.create({
      doc: '', extensions: [basicSetup, oneDark, compartment.of(javascript()),
        EditorState.readOnly.of(true), EditorView.editable.of(false),
        EditorView.contentAttributes.of({ tabindex: '0', 'aria-label': index === 0 ? 'Source file contents' : 'Generated file contents' }),
        EditorView.theme({ '&': { height: '100%', fontSize: '13px' }, '.cm-scroller': { overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', lineHeight: '1.65' } })]
    }) });
    pane.addEventListener('pointerdown', () => choosePane(index));
    pane.addEventListener('focusin', () => choosePane(index));
    return { pane, view, compartment, file: null, tabs: new Map(), scroll: new Map() };
  });
  function choosePane(index) {
    active = index;
    panes.forEach((pane, i) => pane.classList.toggle('active-pane', i === index));
    for (const [file, button] of buttons) button.setAttribute('aria-current', String(views[index].file === file));
  }
  function open(file, index = active) {
    const editor = views[index], item = files.find(item => item.name === file);
    if (!item) throw new Error('Unknown source file: ' + file);
    if (editor.file) editor.scroll.set(editor.file, { top: editor.view.scrollDOM.scrollTop, left: editor.view.scrollDOM.scrollLeft });
    if (!editor.tabs.has(file)) {
      const tab = document.createElement('button'); tab.type = 'button'; tab.className = 'file-tab';
      tab.textContent = file; tab.setAttribute('role', 'tab');
      tab.onclick = () => { choosePane(index); open(file, index); };
      editor.pane.querySelector('.editor-tabs').appendChild(tab); editor.tabs.set(file, tab);
    }
    editor.file = file;
    editor.view.dispatch({ changes: { from: 0, to: editor.view.state.doc.length, insert: item.text },
      selection: { anchor: 0 }, effects: editor.compartment.reconfigure(language(file)) });
    const saved = editor.scroll.get(file) || { top: 0, left: 0 };
    editor.view.scrollDOM.scrollTop = saved.top; editor.view.scrollDOM.scrollLeft = saved.left;
    for (const [name, tab] of editor.tabs) tab.setAttribute('aria-selected', String(name === file));
    const lines = editor.view.state.doc.lines;
    editor.pane.querySelector('.editor-status').textContent = file + ' · ' + lines.toLocaleString() + ' lines · ' + (new TextEncoder().encode(item.text).length / 1024).toFixed(1) + ' KiB · read only';
    choosePane(active);
  }
  const groups = [...new Set(files.map(file => file.group))];
  for (const group of groups) {
    const title = document.createElement('h3'); title.textContent = group; explorer.appendChild(title);
    for (const file of files.filter(file => file.group === group)) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'file-entry';
      button.dataset.file = file.name; button.textContent = file.name; button.title = file.name;
      button.onclick = () => open(file.name); explorer.appendChild(button); buttons.set(file.name, button);
    }
  }
  open('app.js', 0); open('compiled-update.js', 1); choosePane(0);
  return { open, choosePane, views: views.map(editor => editor.view),
    destroy() { views.forEach(editor => editor.view.destroy()); } };
}
