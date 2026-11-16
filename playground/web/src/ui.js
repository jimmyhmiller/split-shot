// DOM and editor helpers shared by the three modes.
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, highlightSpecialChars } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { syntaxHighlighting, HighlightStyle, bracketMatching, indentOnInput } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { tags as t } from "@lezer/highlight";

export const $ = (sel, root = document) => root.querySelector(sel);

export function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "text") e.textContent = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) e.append(kid);
  return e;
}

export function fmtNum(n) { return Math.round(n).toLocaleString("en-US"); }
export function fmtMs(ms) { return ms < 10 ? ms.toFixed(1) + " ms" : ms < 10000 ? fmtNum(ms) + " ms" : (ms / 1000).toFixed(1) + " s"; }

// ───────────── editor ─────────────

const dark = window.matchMedia("(prefers-color-scheme: dark)");

const lightHighlight = HighlightStyle.define([
  { tag: t.comment, color: "#6b7684", fontStyle: "italic" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "#0a7d55" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "#9a5000" },
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword], color: "#1f5fbf" },
  { tag: [t.typeName, t.className], color: "#2f6f9f" },
  { tag: t.function(t.definition(t.variableName)), color: "#9b2c86", fontWeight: "500" },
  { tag: t.function(t.variableName), color: "#7a3fb8" },
  { tag: t.function(t.propertyName), color: "#7a3fb8" },
  { tag: t.definition(t.variableName), color: "#16191d" },
  { tag: t.self, color: "#b8471f" },
  { tag: t.invalid, color: "#b42318" },
]);

const darkHighlight = HighlightStyle.define([
  { tag: t.comment, color: "#7d8792", fontStyle: "italic" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "#6fcf97" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "#f0a35e" },
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword], color: "#7eaaf5" },
  { tag: [t.typeName, t.className], color: "#82b8e0" },
  { tag: t.function(t.definition(t.variableName)), color: "#e58fd0", fontWeight: "500" },
  { tag: t.function(t.variableName), color: "#c39bff" },
  { tag: t.function(t.propertyName), color: "#c39bff" },
  { tag: t.self, color: "#f0a072" },
  { tag: t.invalid, color: "#ff8b80" },
]);

const baseTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px", backgroundColor: "var(--paper)", color: "var(--ink)" },
  ".cm-scroller": { fontFamily: "var(--mono)", lineHeight: "1.55" },
  ".cm-content": { padding: "10px 0" },
  ".cm-line": { padding: "0 1rem 0 .75rem" },
  ".cm-gutters": { backgroundColor: "var(--paper)", color: "var(--gutter)", border: "none" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 .5rem 0 .75rem", minWidth: "2.75rem" },
  ".cm-activeLine": { backgroundColor: "var(--active-line)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--ink)" },
  "&.cm-focused": { outline: "none" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": { backgroundColor: "var(--selection) !important" },
  ".cm-cursor": { borderLeftColor: "var(--ink)" },
  ".cm-matchingBracket": { backgroundColor: "var(--selection)", outline: "none" },
});

const views = [];

export function makeEditor(parent, { doc = "", readOnly = false, lang = "js", wrap = false, onChange = null } = {}) {
  const highlight = new Compartment();
  const extensions = [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    drawSelection(),
    bracketMatching(),
    baseTheme,
    highlight.of(syntaxHighlighting(dark.matches ? darkHighlight : lightHighlight)),
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
  ];
  if (lang === "js") extensions.push(javascript());
  if (readOnly) extensions.push(EditorState.readOnly.of(true));
  else extensions.push(history(), indentOnInput(), highlightActiveLine());
  if (wrap) extensions.push(EditorView.lineWrapping);
  if (onChange) extensions.push(EditorView.updateListener.of((u) => { if (u.docChanged) onChange(u.state.doc.toString()); }));
  const view = new EditorView({ state: EditorState.create({ doc, extensions }), parent });
  views.push({ view, highlight });
  return view;
}

dark.addEventListener("change", () => {
  for (const { view, highlight } of views) {
    view.dispatch({ effects: highlight.reconfigure(syntaxHighlighting(dark.matches ? darkHighlight : lightHighlight)) });
  }
});

export function destroyEditor(view) {
  const i = views.findIndex((v) => v.view === view);
  if (i >= 0) views.splice(i, 1);
  view.destroy();
}

export function setDoc(view, text) {
  if (view.state.doc.toString() === text) return;
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
}
export const getDoc = (view) => view.state.doc.toString();

export function remeasureAll() {
  for (const { view } of views) view.requestMeasure();
}

// ───────────── panes ─────────────

// A pane: heading (title, note, tools), tabs, one editor per tab, and a
// details footer (hidden until something is put in it).
// `tabs`: [{ id, label, readOnly, lang, wrap, doc, onChange }].
export function makePane({ title, note = null, tools = [], tabs }) {
  const tabBar = el("div", { class: "tabs", role: "tablist" });
  const editorBox = el("div", { class: "editor" });
  const details = el("div", { class: "details", hidden: true });
  const root = el("section", { class: "pane" },
    el("div", { class: "pane-heading" },
      el("span", {}, el("span", { class: "pane-title", text: title }), note ? el("span", { class: "pane-note" }, note) : null),
      el("div", { class: "tools" }, ...tools)),
    tabBar, editorBox, details);
  const views = {};
  const boxes = {};
  const placeholders = {};
  const buttons = {};
  let current = null;
  function select(id) {
    current = id;
    for (const [k, b] of Object.entries(buttons)) b.classList.toggle("active", k === id);
    for (const [k, box] of Object.entries(boxes)) box.hidden = k !== id;
    views[id].requestMeasure();
  }
  // Replace the tabs (and their editors) with `tabs`.
  function setTabs(tabs) {
    for (const id of Object.keys(views)) {
      destroyEditor(views[id]);
      delete views[id]; delete boxes[id]; delete placeholders[id]; delete buttons[id];
    }
    tabBar.replaceChildren();
    editorBox.replaceChildren();
    for (const tab of tabs) {
      const box = el("div", { class: "view" });
      editorBox.append(box);
      boxes[tab.id] = box;
      views[tab.id] = makeEditor(box, tab);
      const ph = el("div", { class: "placeholder", hidden: true });
      box.append(ph);
      placeholders[tab.id] = ph;
      buttons[tab.id] = el("button", { role: "tab", onclick: () => select(tab.id) }, tab.label);
      tabBar.append(buttons[tab.id]);
    }
    select(tabs[0].id);
  }
  setTabs(tabs);
  return {
    root, details, views, select, setTabs,
    get current() { return current; },
    // Show `text` over a tab's editor (or clear it with null).
    placeholder(id, text) {
      placeholders[id].hidden = text === null;
      placeholders[id].textContent = text ?? "";
    },
  };
}

// A debounced caller.
export function debounce(fn, ms) {
  let timer = null;
  const d = (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  d.now = (...args) => { clearTimeout(timer); return fn(...args); };
  return d;
}
