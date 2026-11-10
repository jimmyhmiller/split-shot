import { EditorView, basicSetup } from "codemirror";
import { EditorState, Compartment } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { specialize, evaluate, jsmix2 } from "./pe.js";
import { P1_EXAMPLES } from "./examples.js";
import { P3_INTERPRETERS, jsmix2Src } from "./p3.js";
import { intSrc, jsmixSrc, parseSrc, parseProgram, projectionSource, opcodesOf, PROGRAM_EXAMPLES } from "./p2.js";

const $ = (id) => document.getElementById(id);
const P2_BUDGET = 12_000_000;

// ───────────── editors ─────────────

const dark = window.matchMedia("(prefers-color-scheme: dark)");
const editors = [];

function makeEditor(parent, doc, { readOnly = false, onChange = null, wrap = true } = {}) {
  const theme = new Compartment();
  const extensions = [
    basicSetup,
    javascript(),
    theme.of(dark.matches ? oneDark : []),
  ];
  // Read-only views wrap: the derived compiler has a very long declaration line.
  if (readOnly) extensions.push(EditorState.readOnly.of(true), EditorView.editable.of(false));
  if (readOnly && wrap) extensions.push(EditorView.lineWrapping);
  if (onChange) {
    extensions.push(EditorView.updateListener.of((u) => { if (u.docChanged) onChange(u.state.doc.toString()); }));
  }
  const view = new EditorView({ state: EditorState.create({ doc, extensions }), parent });
  editors.push({ view, theme });
  return view;
}

dark.addEventListener("change", () => {
  for (const { view, theme } of editors) view.dispatch({ effects: theme.reconfigure(dark.matches ? oneDark : []) });
});

function setDoc(view, text) {
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
}

// The dynamic input as a JS literal: JSON when it parses, otherwise a string.
function inputLiteral(text) {
  const t = text.trim();
  if (t === "") return "undefined";
  try { JSON.parse(t); return t; } catch { return JSON.stringify(t); }
}

function fmtNum(n) { return Math.round(n).toLocaleString("en-US"); }

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
  }
  for (const k of kids) e.append(k);
  return e;
}

// ───────────── tabs ─────────────

const visited = new Set();
function showTab() {
  const name = (location.hash || "#p1").slice(1);
  const tab = ["p1", "p2", "p3", "about"].includes(name) ? name : "p1";
  for (const s of document.querySelectorAll(".tab")) s.hidden = s.id !== `tab-${tab}`;
  for (const a of document.querySelectorAll(".projections a")) a.setAttribute("aria-current", String(a.dataset.tab === tab ? "page" : "false"));
  if (!visited.has(tab)) {
    visited.add(tab);
    if (tab === "p2") derive();
    if (tab === "p3") startP3();
  }
  for (const { view } of editors) view.requestMeasure();
}
window.addEventListener("hashchange", showTab);

// ───────────── first projection ─────────────

let p1View = "js";
let p1Last = null;      // last successful specialization
let p1Seq = 0;
let p1Timer = null;

const p1Src = makeEditor($("p1-src"), "", { onChange: () => schedule() });
const p1Res = makeEditor($("p1-res"), "", { readOnly: true });

function schedule() {
  clearTimeout(p1Timer);
  p1Timer = setTimeout(runP1, 350);
}

function renderResidual() {
  if (!p1Last) return;
  setDoc(p1Res, p1View === "js" ? p1Last.js : p1Last.ir);
}

async function runP1() {
  const seq = ++p1Seq;
  const status = $("p1-status");
  status.className = "status busy";
  status.textContent = "specializing…";
  try {
    const r = await specialize(p1Src.state.doc.toString());
    if (seq !== p1Seq) return;
    p1Last = r;
    renderResidual();
    status.className = "status";
    status.replaceChildren(
      stat(r.blocks, r.blocks === 1 ? "block" : "blocks"),
      stat(fmtNum(r.steps), "steps"),
      stat(r.ms < 10 ? r.ms.toFixed(1) : fmtNum(r.ms), "ms"),
    );
    runBoth();
  } catch (err) {
    if (seq !== p1Seq) return;
    p1Last = null;
    setDoc(p1Res, "");
    status.className = "status error";
    status.textContent = err.message;
    $("p1-results").replaceChildren();
  }
}

function stat(value, label) {
  return el("span", { class: "stat" }, el("b", {}, String(value)), " " + label);
}

async function runBoth() {
  const out = $("p1-results");
  if (!p1Last) { out.replaceChildren(); return; }
  const x = inputLiteral($("p1-x").value);
  const src = p1Src.state.doc.toString();
  const res = p1Last.js;
  const run = (code) => evaluate(`${code}\n;return main(${x});`).then(
    (v) => ({ ok: true, v }), (e) => ({ ok: false, v: e.message }));
  const [a, b] = await Promise.all([run(src), run(res)]);
  const same = a.ok && b.ok && a.v === b.v;
  out.replaceChildren(
    resultCell("original", a),
    resultCell("residual", b),
    el("span", { class: `verdict ${same ? "good" : "bad"}` }, same ? "✓ same result" : "✗ differ"),
  );
}

function resultCell(label, r) {
  return el("span", { class: "result" }, el("span", { class: "muted" }, label + " "),
    el("code", { class: r.ok ? "" : "err" }, r.ok ? r.v : "threw: " + r.v));
}

function loadExample(ex) {
  for (const b of document.querySelectorAll("#p1-examples button")) b.setAttribute("aria-checked", String(b.dataset.id === ex.id));
  $("p1-blurb").textContent = ex.blurb;
  $("p1-x").value = ex.input;
  setDoc(p1Src, ex.src);
  clearTimeout(p1Timer);
  runP1();
}

for (const ex of P1_EXAMPLES) {
  $("p1-examples").append(el("button", { role: "radio", "data-id": ex.id, onclick: () => loadExample(ex) }, ex.title));
}
for (const b of document.querySelectorAll(".seg button")) {
  b.addEventListener("click", () => {
    p1View = b.dataset.view;
    for (const o of document.querySelectorAll(".seg button")) o.classList.toggle("on", o === b);
    renderResidual();
  });
}
$("p1-run").addEventListener("click", runBoth);
$("p1-x").addEventListener("keydown", (e) => { if (e.key === "Enter") runBoth(); });

// ───────────── second projection ─────────────

let compiler = null;          // { src, intSrc } of the last derived compiler
let deriving = false;

const p2Int = makeEditor($("p2-int"), intSrc.trimEnd() + "\n", { onChange: () => markStale() });
makeEditor($("p2-jsmix"), jsmixSrc, { readOnly: true });
const p2Compiler = makeEditor($("p2-compiler"), "", { readOnly: true });

function markStale() {
  if (!compiler) return;
  const s = $("p2-derive-status");
  s.className = "status inline warn";
  s.textContent = "The interpreter changed. Derive again to update the compiler.";
}

async function derive() {
  if (deriving) return;
  deriving = true;
  const s = $("p2-derive-status");
  const btn = $("p2-derive");
  btn.disabled = true;
  s.className = "status inline busy";
  s.textContent = "specializing jsmix to the interpreter…";
  const src = p2Int.state.doc.toString();
  try {
    let ast;
    try { ast = parseProgram(src); } catch (e) { throw new Error("parse.js: " + e.message); }
    if (!ast.some((f) => f[1] === "interp")) throw new Error("the interpreter must define interp(prog, input)");
    const r = await specialize(projectionSource(ast, "interp"), P2_BUDGET);
    const code = r.js.replace(/^function main\(/m, "function compile(");
    compiler = { src: code, intSrc: src };
    setDoc(p2Compiler, code);
    s.className = "status inline";
    s.replaceChildren(el("span", { class: "verdict good" }, "✓ derived"),
      stat(r.blocks, "blocks"), stat(fmtNum(r.steps), "steps"), stat(r.ms < 10 ? r.ms.toFixed(1) : fmtNum(r.ms), "ms"));
    $("p2-verify-status").textContent = "";
    runP2();
  } catch (err) {
    compiler = null;
    setDoc(p2Compiler, "");
    s.className = "status inline error";
    s.textContent = err.message;
    $("p2-out").replaceChildren();
  } finally {
    deriving = false;
    btn.disabled = false;
  }
}

// One worker program: compile with the derived compiler, run the target,
// run the interpreter directly, and run jsmix directly (P1 by hand).
function p2Body(prog, x) {
  return `
    const compile = Function(${JSON.stringify(compiler.src + "\nreturn compile;")})();
    const interp = Function(${JSON.stringify(compiler.intSrc + "\nreturn interp;")})();
    const jsmix = Function(${JSON.stringify(jsmixSrc + "\nreturn jsmix;")})();
    const prog = ${prog};
    const x = ${x};
    const INT = (${parseProgramSource})(${JSON.stringify(compiler.intSrc)});
    const compiled = compile(prog);
    const target = Function("x", "return " + compiled + ";")(x);
    const direct = interp(prog, x);
    const byHand = jsmix(INT, "interp", prog);
    return { compiled: String(compiled), target, direct, byHand: String(byHand) };
  `;
}

// parseProgram travels to the worker as source, so the worker can run jsmix
// on exactly the AST the projection used.
const parseProgramSource = `function (src) {
  const mod = { exports: {} };
  Function("module", ${JSON.stringify(parseSrc)})(mod);
  return mod.exports.parseProgram(src);
}`;

async function runP2() {
  const out = $("p2-out");
  if (!compiler) { out.replaceChildren(); return; }
  let prog;
  try { prog = JSON.stringify(JSON.parse($("p2-prog").value)); }
  catch { out.replaceChildren(el("p", { class: "status error" }, "The program must be JSON: an array of instructions like [\"addlit\", 2].")); return; }
  const x = inputLiteral($("p2-x").value);
  try {
    const r = await evaluate(p2Body(prog, x), { raw: true });
    const okRun = r.target === r.direct;
    const okP1 = r.compiled === r.byHand;
    out.replaceChildren(
      row("compiled", el("code", { class: "target" }, `function (x) { return ${r.compiled}; }`)),
      row("run target", el("code", {}, String(r.target)), el("span", { class: "muted" }, " vs interp(prog, x) = "), el("code", {}, String(r.direct)),
        el("span", { class: `verdict ${okRun ? "good" : "bad"}` }, okRun ? "✓ same" : "✗ differ")),
      row("first projection", el("span", { class: "muted" }, "jsmix(interpreter, prog) run directly gives "),
        el("span", { class: `verdict ${okP1 ? "good" : "bad"}` }, okP1 ? "✓ identical code" : "✗ different code")),
    );
  } catch (err) {
    out.replaceChildren(el("p", { class: "status error" }, err.message));
  }
}

function row(label, ...kids) {
  return el("div", { class: "out-row" }, el("span", { class: "out-label" }, label), el("span", { class: "out-val" }, ...kids));
}

async function verify() {
  const s = $("p2-verify-status");
  if (!compiler) { s.className = "status inline error"; s.textContent = "Derive the compiler first."; return; }
  const ops = opcodesOf(compiler.intSrc);
  if (ops.length === 0) { s.className = "status inline error"; s.textContent = "Couldn't find any opcodes (instr[0] === \"…\") in the interpreter."; return; }
  s.className = "status inline busy";
  s.textContent = "checking…";
  const body = `
    const compile = Function(${JSON.stringify(compiler.src + "\nreturn compile;")})();
    const interp = Function(${JSON.stringify(compiler.intSrc + "\nreturn interp;")})();
    const jsmix = Function(${JSON.stringify(jsmixSrc + "\nreturn jsmix;")})();
    const INT = (${parseProgramSource})(${JSON.stringify(compiler.intSrc)});
    const ops = ${JSON.stringify(ops)};
    let seed = 12345;
    const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    let progs = 0, runs = 0, bad = null;
    for (let t = 0; t < 500 && !bad; t++) {
      const prog = [];
      const len = 1 + rnd(7);
      for (let k = 0; k < len; k++) prog.push([ops[rnd(ops.length)], rnd(9) - 4]);
      const code = compile(prog);
      if (code !== jsmix(INT, "interp", prog)) { bad = { prog, why: "compiled code differs from jsmix(interpreter, prog)" }; break; }
      const f = Function("x", "return " + code + ";");
      for (let x = -3; x <= 3; x++) {
        runs++;
        const a = f(x), b = interp(prog, x);
        if (!Object.is(a, b)) { bad = { prog, why: "at x = " + x + ": target gives " + a + ", interp gives " + b }; break; }
      }
      progs++;
    }
    return { progs, runs, bad };
  `;
  try {
    const r = await evaluate(body, { raw: true, timeoutMs: 20000 });
    if (r.bad) {
      s.className = "status inline error";
      s.textContent = `✗ ${JSON.stringify(r.bad.prog)}: ${r.bad.why}`;
    } else {
      s.className = "status inline";
      s.replaceChildren(el("span", { class: "verdict good" }, "✓ all agree"),
        stat(r.progs, "programs"), stat(fmtNum(r.runs), "runs vs interp"), stat(r.progs, "code matches vs jsmix"));
    }
  } catch (err) {
    s.className = "status inline error";
    s.textContent = err.message;
  }
}

for (const p of PROGRAM_EXAMPLES) {
  $("p2-progs").append(el("button", { class: "chip", onclick: () => { $("p2-prog").value = p.prog; runP2(); } }, p.title));
}
$("p2-prog").value = PROGRAM_EXAMPLES[0].prog;
$("p2-derive").addEventListener("click", derive);
$("p2-run").addEventListener("click", runP2);
$("p2-verify").addEventListener("click", verify);
for (const id of ["p2-prog", "p2-x"]) $(id).addEventListener("keydown", (e) => { if (e.key === "Enter") runP2(); });

// ───────────── third projection ─────────────

const p3State = { compilerSrc: null, intIndex: 0 };
makeEditor($("p3-jsmix2"), jsmix2Src, { readOnly: true });
const p3Cogen = makeEditor($("p3-cogen"), "", { readOnly: true, wrap: false });
const p3Int = makeEditor($("p3-int"), P3_INTERPRETERS[0].src, { onChange: () => p3Stale() });
const p3Compiler = makeEditor($("p3-compiler"), "", { readOnly: true });
const p3Target = makeEditor($("p3-target"), "", { readOnly: true });

// Re-indent jsmix2's output for display (it emits one statement per line with
// no indentation). Depth follows braces outside string literals. Display only:
// every identity check compares the raw output.
function reindent(src) {
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

function show(id, view, text) {
  setDoc(view, reindent(text));
  $(id).classList.add("shown");
  view.requestMeasure();
}

function p3Stale() {
  if (!p3State.compilerSrc) return;
  const s = $("p3-compiler-status");
  s.className = "status inline warn";
  s.textContent = "The interpreter changed. Make the compiler again.";
}

async function p3MakeCogen(which = "self") {
  const s = $("p3-cogen-status");
  s.className = "status inline busy";
  s.textContent = which === "self" ? "running mix(mix, mix) with jsmix2…" : "the Rust evaluator is specializing jsmix2 to itself (several seconds)…";
  for (const id of ["p3-cogen-btn", "p3-cogen-rust-btn"]) $(id).disabled = true;
  try {
    const r = await jsmix2("cogen", { which }, 180000);
    show("p3-cogen", p3Cogen, r.src);
    s.className = "status inline";
    s.replaceChildren(el("span", { class: "verdict good" }, which === "self" ? "✓ cogen by jsmix2" : "✓ cogen by the Rust evaluator"),
      ...(r.blocks ? [stat(r.blocks, "blocks")] : []),
      stat(r.functions, "functions"), stat(fmtNum(r.src.length / 1024), "KB"), stat(fmtNum(r.ms), "ms"));
    if (p3State.compilerSrc) {
      // A different cogen: make the compiler again with it.
      if (await p3MakeCompiler()) await p3Run();
    }
    return true;
  } catch (err) {
    s.className = "status inline error";
    s.textContent = err.message;
    return false;
  } finally {
    for (const id of ["p3-cogen-btn", "p3-cogen-rust-btn"]) $(id).disabled = false;
  }
}

async function p3MakeCompiler() {
  const s = $("p3-compiler-status");
  s.className = "status inline busy";
  s.textContent = "running cogen(interpreter)…";
  try {
    const r = await jsmix2("compiler", { intSrc: p3Int.state.doc.toString() });
    p3State.compilerSrc = r.src;
    show("p3-compiler", p3Compiler, r.src);
    s.className = "status inline";
    s.replaceChildren(
      el("span", { class: `verdict ${r.identical ? "good" : "bad"}` }, r.identical ? "✓ identical to mix(mix, interpreter)" : "✗ differs from mix(mix, interpreter)"),
      el("span", { class: "muted" }, r.which === "self" ? "cogen: jsmix2" : "cogen: Rust evaluator"),
      stat(r.functions, "functions"), stat(fmtNum(r.src.length / 1024), "KB"), stat(r.ms < 10 ? r.ms.toFixed(1) : fmtNum(r.ms), "ms"),
      el("span", { class: "muted" }, "entry: " + r.entry));
    return true;
  } catch (err) {
    p3State.compilerSrc = null;
    s.className = "status inline error";
    s.textContent = err.message;
    return false;
  }
}

async function p3Run() {
  const out = $("p3-out");
  if (!p3State.compilerSrc) { out.replaceChildren(el("p", { class: "status error" }, "Make the compiler first.")); return; }
  let prog;
  try { prog = JSON.stringify(JSON.parse($("p3-prog").value)); }
  catch { out.replaceChildren(el("p", { class: "status error" }, "The program must be JSON.")); return; }
  const x = inputLiteral($("p3-x").value);
  try {
    const r = await jsmix2("target", { intSrc: p3Int.state.doc.toString(), compilerSrc: p3State.compilerSrc, prog, x }, 10000);
    show("p3-target", p3Target, r.src);
    const okRun = r.target === r.interp;
    out.replaceChildren(
      row("run target", el("code", {}, r.target), el("span", { class: "muted" }, " vs interpreter "), el("code", {}, r.interp),
        el("span", { class: `verdict ${okRun ? "good" : "bad"}` }, okRun ? "✓ same" : "✗ differ")),
      row("first projection", el("span", { class: "muted" }, "mix(interpreter, program) run directly gives "),
        el("span", { class: `verdict ${r.identical ? "good" : "bad"}` }, r.identical ? "✓ identical code" : "✗ different code")),
    );
  } catch (err) {
    out.replaceChildren(el("p", { class: "status error" }, err.message));
  }
}

function p3SelectInterpreter(i) {
  p3State.intIndex = i;
  for (const [j, b] of [...$("p3-ints").children].entries()) b.setAttribute("aria-pressed", String(j === i));
  setDoc(p3Int, P3_INTERPRETERS[i].src);
  $("p3-progs").replaceChildren(...P3_INTERPRETERS[i].progs.map((p) =>
    el("button", { class: "chip", onclick: () => { $("p3-prog").value = p.prog; p3Run(); } }, p.title)));
  $("p3-prog").value = P3_INTERPRETERS[i].progs[0].prog;
}

async function startP3() {
  if (!(await p3MakeCogen())) return;
  if (!(await p3MakeCompiler())) return;
  await p3Run();
}

P3_INTERPRETERS.forEach((it, i) => {
  $("p3-ints").append(el("button", { class: "chip", onclick: async () => {
    p3SelectInterpreter(i);
    if (await p3MakeCompiler()) await p3Run();
  } }, it.title));
});
p3SelectInterpreter(0);
$("p3-cogen-btn").addEventListener("click", () => p3MakeCogen("self"));
$("p3-cogen-rust-btn").addEventListener("click", () => p3MakeCogen("rust"));
$("p3-compiler-btn").addEventListener("click", async () => { if (await p3MakeCompiler()) await p3Run(); });
$("p3-run").addEventListener("click", p3Run);
for (const id of ["p3-prog", "p3-x"]) $(id).addEventListener("keydown", (e) => { if (e.key === "Enter") p3Run(); });

// ───────────── boot ─────────────

loadExample(P1_EXAMPLES[0]);
showTab();
