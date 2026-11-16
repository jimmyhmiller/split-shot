// Second projection: mix(jsmix, interpreter) = compiler.
import { el, makePane, setDoc, getDoc, debounce, fmtNum, fmtMs, verdict, reindent } from "../ui.js";
import { p2 } from "../pe.js";
import { COMPILER } from "../examples.js";
import { copy } from "./specialize.js";
import jsmixSrc from "../../../../experiments/general-jsmix/jsmix.js?raw";
import codegenSrc from "../../../../experiments/general-jsmix/codegen.cjs?raw";

export function createCompiler(ctx) {
  const mode = {
    id: "compiler",
    title: "Compiler",
    examples: COMPILER,
    current: null,
    blurb: "",
    state: { text: "", kind: "" },
  };
  const st = { derived: null, src: null, reads: ["prompt"] };
  let seq = 0;
  let loading = false;
  const setState = (text, kind = "") => { mode.state = { text, kind }; ctx.changed(mode); };

  const left = makePane({
    title: "Interpreter",
    tabs: [
      { id: "int", label: "interpreter.js", onChange: () => { if (!loading) { mode.current = null; ctx.changed(mode); stale(); rederive(); } } },
      { id: "jsmix", label: "jsmix.js", readOnly: true, doc: jsmixSrc },
      { id: "codegen", label: "codegen.cjs", readOnly: true, doc: codegenSrc },
    ],
  });
  const copyBtn = el("button", { type: "button", onclick: () => copy(getDoc(right.views[right.current]), copyBtn) }, "Copy");
  const right = makePane({
    title: "Compiler",
    tools: [copyBtn],
    tabs: [
      { id: "readable", label: "compiler.js", readOnly: true, badge: false, wrap: true },
      { id: "raw", label: "residual.js", readOnly: true, badge: false, wrap: true },
      { id: "target", label: "target.js", readOnly: true, badge: false, wrap: true },
      { id: "input", label: "input.js", readOnly: true, badge: false, wrap: true },
    ],
  });
  mode.root = el("div", { class: "mode", "data-mode": "compiler" }, left.root, right.root);

  // ───── binding times (left details) ─────

  const btBox = el("div", { class: "bt" });
  const intErrors = el("pre", { class: "errors", hidden: true });
  left.details.append(
    el("span", { class: "label" }, "Binding times"),
    btBox, intErrors,
    el("div", { class: "legend" }, el("span", { class: "s" }, "static"), " is known when compiling; ", el("span", { class: "d" }, "dynamic"), " only when the target runs. Found by a fixed-point analysis from interp(program static, io dynamic)."),
    el("p", { class: "hint" }, "The subset: function declarations, var, =, if, while, return, throw new Error(…), calls, arrays and the usual operators. No closures, and loops may only test static values."),
  );

  function renderBindingTimes(bts) {
    btBox.replaceChildren(...bts.map((f) => el("div", {},
      f.name, "(", ...joined(f.params.map(([n, d]) => el("span", { class: d ? "d" : "s", text: n }))), ")",
      f.locals.length ? el("span", { class: "muted" }, "  locals ") : null,
      ...joined(f.locals.map(([n, d]) => el("span", { class: d ? "d" : "s", text: n }))))));
  }

  // ───── compile a program (right details) ─────

  const chips = el("div", { class: "chips" });
  const progInput = el("input", { class: "value", spellcheck: "false", autocomplete: "off", "aria-label": "program", oninput: () => { mode.current = null; ctx.changed(mode); rerun(); } });
  const inputsInput = el("input", { class: "value", spellcheck: "false", autocomplete: "off", "aria-label": "inputs", oninput: () => rerun() });
  const runBox = el("div");
  right.details.append(
    el("span", { class: "label" }, "Compile a program"),
    chips,
    el("div", { class: "fields" },
      el("span", { class: "k", text: "program" }), progInput,
      el("span", { class: "k", text: "inputs" }), inputsInput),
    runBox,
  );

  function stale() {
    if (st.derived) setState("interpreter changed…", "busy");
  }

  async function derive() {
    const s = ++seq;
    const src = getDoc(left.views.int);
    setState("deriving the compiler…", "busy");
    try {
      const d = await p2("derive", { src });
      if (s !== seq) return;
      st.derived = d;
      st.src = src;
      intErrors.hidden = true;
      renderBindingTimes(d.bindingTimes);
      setDoc(right.views.raw, d.raw);
      setDoc(right.views.readable, d.readable ?? `// The readability pass failed: ${d.readableError}\n// This is the compiler exactly as split-shot emitted it.\n\n${d.raw}`);
      setDoc(right.views.input, d.input);
      for (const id of ["readable", "raw", "target", "input"]) right.placeholder(id, null);
      setState(`compiler: ${d.blocks} ${d.blocks === 1 ? "block" : "blocks"} · ${fmtNum(d.raw.split("\n").length)} lines · ${fmtNum(d.steps)} steps · ${fmtMs(d.ms)}`);
      await run();
    } catch (e) {
      if (s !== seq) return;
      st.derived = null;
      intErrors.hidden = false;
      intErrors.textContent = e.message;
      btBox.replaceChildren();
      for (const id of ["readable", "raw", "target", "input"]) {
        setDoc(right.views[id], "");
        right.placeholder(id, "No compiler: the interpreter could not be specialized. The error is under the interpreter.");
      }
      runBox.replaceChildren();
      setState("error", "error");
    }
  }
  const rederive = debounce(derive, 600);

  async function run() {
    const d = st.derived;
    if (!d) return;
    const s = seq;
    let program, inputs;
    try { program = JSON.stringify(JSON.parse(progInput.value)); } catch { runBox.replaceChildren(el("pre", { class: "errors", text: "The program must be JSON." })); return; }
    try { inputs = JSON.stringify(JSON.parse(inputsInput.value || "[]")); } catch { runBox.replaceChildren(el("pre", { class: "errors", text: "The inputs must be a JSON array." })); return; }
    try {
      const r = await p2("run", { src: st.src, raw: d.raw, readable: d.readable, program, inputs, reads: st.reads }, 10000);
      if (s !== seq) return;
      if (r.compileError) {
        setDoc(right.views.target, `// compile(program) threw ${r.compileError}`);
        runBox.replaceChildren(el("div", { class: "results" },
          el("span", { class: "k", text: "compile" }), el("span", { class: "v errors", text: "throws " + r.compileError })),
          el("p", { class: "hint", text: "The compiler rejects the program at compile time, as the interpreter would when it reached that instruction." }));
        return;
      }
      setDoc(right.views.target, reindent(r.target));
      const same = r.compiled.ok === r.interpreted.ok && r.compiled.result === r.interpreted.result && r.compiled.events.join("\n") === r.interpreted.events.join("\n");
      const outcome = (o) => el("span", { class: "v" },
        el("span", { class: o.ok ? "" : "errors", text: (o.ok ? "returns " : "throws ") + o.result }),
        o.events.length ? el("span", { class: "muted", text: "  ·  " + o.events.join(", ") }) : null);
      runBox.replaceChildren(
        el("div", { class: "results" },
          el("span", { class: "k", text: "target" }), outcome(r.compiled),
          el("span", { class: "k", text: "interpreter" }), outcome(r.interpreted)),
        el("div", { class: "checks" },
          el("div", {}, verdict(same, "same result and the same io calls", "the target and the interpreter differ")),
          el("div", {}, verdict(r.identical, "target.js is byte-identical to jsmix(interpreter, program) run directly", "target.js differs from jsmix(interpreter, program)")),
          r.readableSame === null ? null : el("div", {}, verdict(r.readableSame, "the readable compiler.js emits the same target", "compiler.js and residual.js disagree"))),
      );
    } catch (e) {
      if (s !== seq) return;
      runBox.replaceChildren(el("pre", { class: "errors", text: e.message }));
    }
  }
  const rerun = debounce(run, 300);

  function setPrograms(ex) {
    chips.replaceChildren(...ex.programs.map((p) => el("button", { type: "button", onclick: () => { progInput.value = p.program; inputsInput.value = p.inputs; rerun.now(); } }, p.title)));
  }

  mode.load = (ex) => {
    mode.current = ex.id;
    mode.blurb = ex.blurb + ` io.${ex.reads.join("(), io.")}() returns the next input; other io calls are recorded.`;
    st.reads = ex.reads;
    setPrograms(ex);
    progInput.value = ex.programs[0].program;
    inputsInput.value = ex.programs[0].inputs;
    loading = true;
    setDoc(left.views.int, ex.src);
    loading = false;
    ctx.changed(mode);
    if (mode.active) rederive.now(); else st.pending = true;
  };
  mode.snapshot = () => ({ src: getDoc(left.views.int), program: progInput.value, inputs: inputsInput.value, reads: st.reads });
  mode.restore = (o) => {
    mode.current = null;
    mode.blurb = "A shared interpreter.";
    st.reads = o.reads || ["prompt"];
    chips.replaceChildren();
    progInput.value = o.program;
    inputsInput.value = o.inputs;
    loading = true;
    setDoc(left.views.int, o.src);
    loading = false;
    ctx.changed(mode);
    if (mode.active) rederive.now(); else st.pending = true;
  };
  // (Deriving starts the wasm engine on a big input: only once the mode is shown.)
  mode.activate = () => { if (st.pending) { st.pending = false; rederive.now(); } };
  return mode;
}

function joined(items, sep = ", ") {
  return items.flatMap((x, i) => (i ? [sep, x] : [x]));
}
