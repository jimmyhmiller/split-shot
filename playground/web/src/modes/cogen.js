// Third projection: mix(mix, mix) = cogen, cogen(interpreter) = compiler.
import { el, makePane, setDoc, getDoc, debounce, fmtNum, fmtMs, fmtBytes, verdict, reindent } from "../ui.js";
import { p3 } from "../pe.js";
import { COGEN } from "../examples.js";
import { copy } from "./specialize.js";
import jsmix2Src from "../../../../docs/p3/jsmix2.js?raw";

export function createCogen(ctx) {
  const mode = {
    id: "cogen",
    title: "Cogen",
    examples: COGEN,
    current: null,
    blurb: "",
    state: { text: "", kind: "" },
  };
  const st = { which: "self", cogen: null, compiler: null, pending: false };
  let seq = 0;
  let loading = false;
  const setState = (text, kind = "") => { mode.state = { text, kind }; ctx.changed(mode); };

  const outer = el("div", { class: "seg", role: "group", "aria-label": "outer mix" });
  const outerButtons = [["self", "jsmix2"], ["rust", "split-shot (~30 s)"]].map(([v, label]) =>
    el("button", { type: "button", "aria-pressed": String(v === st.which), title: v === "self" ? "cogen = jsmix2(jsmix2, jsmix2)" : "cogen = split-shot(jsmix2, jsmix2): the Rust engine specializes jsmix2 to itself", onclick: () => pickOuter(v) }, label));
  outer.append(...outerButtons);

  const left = makePane({
    title: "Interpreter",
    tools: [el("span", { class: "check" }, "outer mix"), outer],
    tabs: [
      { id: "int", label: "interpreter.js", onChange: () => { if (!loading) { mode.current = null; ctx.changed(mode); remake(); } } },
      { id: "jsmix2", label: "jsmix2.js", readOnly: true, doc: jsmix2Src },
    ],
  });
  const copyBtn = el("button", { type: "button", onclick: () => copy(getDoc(right.views[right.current]), copyBtn) }, "Copy");
  const right = makePane({
    title: "Output",
    tools: [copyBtn],
    tabs: [
      { id: "compiler", label: "compiler.js", readOnly: true, badge: false },
      { id: "target", label: "target.js", readOnly: true, badge: false, wrap: true },
      { id: "cogen", label: "cogen.js", readOnly: true, badge: false },
    ],
  });
  mode.root = el("div", { class: "mode", "data-mode": "cogen" }, left.root, right.root);

  // ───── left details: the cogen ─────
  const cogenBox = el("div");
  const intErrors = el("pre", { class: "errors", hidden: true });
  left.details.append(
    el("span", { class: "label" }, "The compiler generator"),
    cogenBox, intErrors,
    el("p", { class: "hint" }, "jsmix2 is a partial evaluator written in a small pure subset of JavaScript (functions, var, if, recursion, arrays) that it can process itself. Specialized to itself it is a cogen: give it an interpreter and it returns a compiler. The interpreter's first function is the entry point; its first parameter is the program, the rest arrive at run time."),
  );

  // ───── right details: compile a program ─────
  const chips = el("div", { class: "chips" });
  const progInput = el("input", { class: "value", spellcheck: "false", autocomplete: "off", "aria-label": "program", oninput: () => { mode.current = null; ctx.changed(mode); rerun(); } });
  const xInput = el("input", { class: "value", spellcheck: "false", autocomplete: "off", "aria-label": "runtime input", oninput: () => rerun() });
  const runBox = el("div");
  right.details.append(
    el("span", { class: "label" }, "Compile a program"),
    chips,
    el("div", { class: "fields" },
      el("span", { class: "k", text: "program" }), progInput,
      el("span", { class: "k", text: "input" }), xInput),
    runBox,
  );

  async function makeCogen() {
    const s = ++seq;
    for (const b of outerButtons) b.disabled = true;
    setState(st.which === "self" ? "cogen = mix(mix, mix) with jsmix2…" : "split-shot is specializing jsmix2 to itself…", "busy");
    try {
      const r = await p3("cogen", { which: st.which }, 180000);
      if (s !== seq) return false;
      st.cogen = r;
      setDoc(right.views.cogen, reindent(r.src));
      right.placeholder("cogen", null);
      cogenBox.replaceChildren(el("div", { class: "results" },
        el("span", { class: "k", text: "cogen" }),
        el("span", { class: "v", text: `${r.which === "self" ? "jsmix2(jsmix2, jsmix2)" : "split-shot(jsmix2, jsmix2)"} · ${fmtNum(r.functions)} functions · ${fmtBytes(r.src.length)}${r.blocks ? ` · ${fmtNum(r.blocks)} blocks` : ""} · ${fmtMs(r.ms)}` })));
      return true;
    } catch (e) {
      if (s !== seq) return false;
      cogenBox.replaceChildren(el("pre", { class: "errors", text: e.message }));
      setState("error", "error");
      return false;
    } finally {
      for (const b of outerButtons) b.disabled = false;
    }
  }

  async function makeCompiler() {
    const s = ++seq;
    setState("compiler = cogen(interpreter)…", "busy");
    try {
      const r = await p3("compiler", { intSrc: getDoc(left.views.int) });
      if (s !== seq) return false;
      st.compiler = r;
      intErrors.hidden = true;
      setDoc(right.views.compiler, reindent(r.src));
      right.placeholder("compiler", null);
      cogenBox.querySelector(".checks")?.remove();
      cogenBox.append(el("div", { class: "checks" },
        el("div", {}, verdict(r.identical, "compiler.js is byte-identical to mix(mix, interpreter), the second projection run directly", "compiler.js differs from mix(mix, interpreter)"))));
      setState(`compiler: ${fmtNum(r.functions)} functions · ${fmtBytes(r.src.length)} · ${fmtMs(r.ms)} · entry ${r.entry}`);
      return true;
    } catch (e) {
      if (s !== seq) return false;
      st.compiler = null;
      intErrors.hidden = false;
      intErrors.textContent = e.message;
      setDoc(right.views.compiler, "");
      right.placeholder("compiler", "No compiler: see the error under the interpreter.");
      runBox.replaceChildren();
      setState("error", "error");
      return false;
    }
  }

  async function run() {
    if (!st.compiler) return;
    const s = seq;
    let prog, x;
    try { prog = JSON.stringify(JSON.parse(progInput.value)); } catch { runBox.replaceChildren(el("pre", { class: "errors", text: "The program must be JSON." })); return; }
    try { x = JSON.stringify(JSON.parse(xInput.value)); } catch { runBox.replaceChildren(el("pre", { class: "errors", text: "The input must be JSON." })); return; }
    try {
      const r = await p3("target", { intSrc: getDoc(left.views.int), compilerSrc: st.compiler.src, prog, x }, 10000);
      if (s !== seq) return;
      setDoc(right.views.target, reindent(r.src));
      right.placeholder("target", null);
      runBox.replaceChildren(
        el("div", { class: "results" },
          el("span", { class: "k", text: "target" }), el("span", { class: "v", text: `main(${x}) → ${r.target}` }),
          el("span", { class: "k", text: "interpreter" }), el("span", { class: "v", text: `${st.compiler.entry}(program, ${x}) → ${r.interp}` })),
        el("div", { class: "checks" },
          el("div", {}, verdict(r.target === r.interp, "same result", "the results differ")),
          el("div", {}, verdict(r.identical, "target.js is byte-identical to mix(interpreter, program), the first projection", "target.js differs from mix(interpreter, program)"))),
      );
    } catch (e) {
      if (s !== seq) return;
      runBox.replaceChildren(el("pre", { class: "errors", text: e.message }));
    }
  }
  const rerun = debounce(run, 300);
  const remake = debounce(async () => { if (st.cogen && (await makeCompiler())) await run(); }, 600);

  async function pickOuter(v) {
    if (v === st.which && st.cogen) return;
    st.which = v;
    for (const [i, b] of outerButtons.entries()) b.setAttribute("aria-pressed", String(["self", "rust"][i] === v));
    await all();
  }

  async function all() {
    if (!(await makeCogen())) return;
    if (!(await makeCompiler())) return;
    await run();
  }

  function setPrograms(ex) {
    chips.replaceChildren(...ex.programs.map((p) => el("button", { type: "button", onclick: () => { progInput.value = p.program; rerun.now(); } }, p.title)));
  }

  function start() {
    if (!mode.active) { st.pending = true; return; }
    st.pending = false;
    if (st.cogen) remake.now(); else all();
  }

  mode.load = (ex) => {
    mode.current = ex.id;
    mode.blurb = ex.blurb;
    setPrograms(ex);
    progInput.value = ex.programs[0].program;
    xInput.value = ex.x;
    loading = true;
    setDoc(left.views.int, ex.src);
    loading = false;
    ctx.changed(mode);
    start();
  };
  mode.snapshot = () => ({ src: getDoc(left.views.int), program: progInput.value, x: xInput.value });
  mode.restore = (o) => {
    mode.current = null;
    mode.blurb = "A shared interpreter.";
    chips.replaceChildren();
    progInput.value = o.program;
    xInput.value = o.x;
    loading = true;
    setDoc(left.views.int, o.src);
    loading = false;
    ctx.changed(mode);
    start();
  };
  mode.activate = () => { if (st.pending) start(); };
  for (const id of ["compiler", "target", "cogen"]) right.placeholder(id, "Generating…");
  return mode;
}
