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
export function fmtBytes(n) { return n < 1024 ? n + " B" : n < 1024 * 1024 ? (n / 1024).toFixed(1) + " KB" : (n / 1024 / 1024).toFixed(1) + " MB"; }

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
  ".cm-gutters": { backgroundColor: "var(--paper)", color: "var(--muted)", border: "none", opacity: ".7" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 .25rem 0 .75rem", minWidth: "2.5rem" },
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

export function setDoc(view, text) {
  if (view.state.doc.toString() === text) return;
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
}
export const getDoc = (view) => view.state.doc.toString();

export function remeasureAll() {
  for (const { view } of views) view.requestMeasure();
}

// ───────────── panes ─────────────

// A pane: heading (title + tools), tabs, one editor per tab, details footer.
// `tabs`: [{ id, label, readOnly, lang, wrap, doc, onChange, placeholder }].
export function makePane({ title, tools = [], tabs, onTab = null }) {
  const tabBar = el("div", { class: "tabs", role: "tablist" });
  const editorBox = el("div", { class: "editor" });
  const details = el("div", { class: "details" });
  const root = el("section", { class: "pane" },
    el("div", { class: "pane-heading" }, el("span", { class: "pane-title", text: title }), el("div", { class: "tools" }, ...tools)),
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
    if (onTab) onTab(id);
  }
  for (const tab of tabs) {
    const box = el("div", { class: "view" });
    editorBox.append(box);
    boxes[tab.id] = box;
    views[tab.id] = makeEditor(box, tab);
    const ph = el("div", { class: "placeholder", hidden: true });
    box.append(ph);
    placeholders[tab.id] = ph;
    buttons[tab.id] = el("button", { role: "tab", onclick: () => select(tab.id) }, tab.label, tab.readOnly && tab.badge !== false ? el("span", { class: "ro", text: "read-only" }) : null);
    tabBar.append(buttons[tab.id]);
  }
  select(tabs[0].id);
  return {
    root, details, views, select,
    get current() { return current; },
    // Show `text` over a tab's editor (or clear it with null).
    placeholder(id, text) {
      placeholders[id].hidden = text === null;
      placeholders[id].textContent = text ?? "";
    },
  };
}

export function seg(options, value, onPick) {
  const box = el("div", { class: "seg", role: "group" });
  const buttons = options.map(([v, label, extra = {}]) => el("button", { type: "button", "aria-pressed": String(v === value), ...extra, onclick: () => { set(v); onPick(v); } }, label));
  function set(v) { for (const [i, b] of buttons.entries()) b.setAttribute("aria-pressed", String(options[i][0] === v)); }
  box.append(...buttons);
  box.set = set;
  return box;
}

// Re-indent code emitted one statement per line with no indentation (jsmix2
// and the codegen helpers do that). Depth follows braces outside string
// literals. Display only: every comparison uses the raw text.
export function reindent(src) {
  let depth = 0;
  const out = [];
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    let opens = 0, closes = 0, leading = 0, inStr = null;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inStr) {
        if (c === "\\") i++;
        else if (c === inStr) inStr = null;
      } else if (c === '"' || c === "'") inStr = c;
      else if (c === "{") opens++;
      else if (c === "}") { if (opens > 0) opens--; else closes++; }
    }
    for (const c of line) { if (c === "}") leading++; else break; }
    const d = Math.max(0, depth - Math.min(leading, closes));
    out.push(line === "" ? "" : "  ".repeat(d) + line);
    depth = Math.max(0, depth + opens - closes);
  }
  return out.join("\n");
}

export function verdict(ok, yes, no) {
  return el("span", { class: `verdict ${ok ? "good" : "bad"}`, text: ok ? "✓ " + yes : "✗ " + no });
}

// A debounced caller.
export function debounce(fn, ms) {
  let timer = null;
  const d = (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  d.now = (...args) => { clearTimeout(timer); return fn(...args); };
  return d;
}
