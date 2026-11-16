// First projection: specialize a function to the arguments that are known now.
import { el, makePane, setDoc, getDoc, debounce, fmtNum, fmtMs, verdict } from "../ui.js";
import { specialize, evaluate } from "../pe.js";
import { topLevel, buildEntry } from "../entry.js";
import { SPECIALIZE } from "../examples.js";

export function createSpecialize(ctx) {
  const mode = {
    id: "specialize",
    title: "Specialize",
    examples: SPECIALIZE,
    current: null,
    blurb: "",
    state: { text: "", kind: "" },
  };
  const st = { entry: null, choices: {}, info: null, result: null, built: null, sourceNames: true };
  let seq = 0;
  let loading = false;

  const setState = (text, kind = "") => { mode.state = { text, kind }; ctx.changed(mode); };

  const left = makePane({
    title: "Source",
    tabs: [{ id: "src", label: "program.js", onChange: () => { if (!loading) { mode.current = null; ctx.changed(mode); } reparse(); } }],
  });

  const namesBox = el("input", { type: "checkbox", checked: true, onchange: () => { st.sourceNames = namesBox.checked; respecialize.now(); } });
  const copyBtn = el("button", { type: "button", onclick: () => copy(getDoc(right.views[right.current]), copyBtn) }, "Copy");
  const right = makePane({
    title: "Residual",
    tools: [el("label", { class: "check", title: "Name residual variables as the source does, where one stands for one" }, namesBox, "source names"), copyBtn],
    tabs: [
      { id: "js", label: "residual.js", readOnly: true, badge: false, wrap: true },
      { id: "input", label: "input.js", readOnly: true, badge: false },
      { id: "ir", label: "IR", readOnly: true, badge: false, wrap: true, lang: "text" },
      { id: "why", label: "why", readOnly: true, badge: false, wrap: true, lang: "text" },
    ],
  });

  mode.root = el("div", { class: "mode", "data-mode": "specialize" }, left.root, right.root);

  // ───── arguments (left details) ─────

  const fnSelect = el("select", { "aria-label": "Function to specialize", onchange: () => { st.entry = fnSelect.value; mode.current = null; renderArgs(); respecialize.now(); } });
  const argsBox = el("div", { class: "args" });
  const argErrors = el("pre", { class: "errors", hidden: true });
  left.details.append(
    el("span", { class: "label" }, "Arguments"),
    el("div", { class: "call" }, "specialize", fnSelect, el("span", { class: "muted" }, "with")),
    argsBox,
    argErrors,
    el("p", { class: "hint" }, "A static argument is known now and baked into the program; split-shot computes everything that depends only on static values. A dynamic argument arrives at run time, so the value here is only a sample used to run both versions."),
  );

  function renderArgs() {
    const fns = st.info ? st.info.functions : [];
    fnSelect.replaceChildren(...fns.map((f) => el("option", { value: f.name, selected: f.name === st.entry }, f.name)));
    const fn = fns.find((f) => f.name === st.entry);
    argsBox.replaceChildren();
    if (!fn) return;
    for (const p of fn.params) {
      const c = (st.choices[p.key] ??= { dynamic: false, value: "" });
      const input = el("input", {
        class: "value", value: c.value, spellcheck: "false", autocomplete: "off", "aria-label": `value of ${p.label}`,
        placeholder: c.dynamic ? "sample value" : "value (a JS expression)",
        oninput: () => { c.value = input.value; mode.current = null; ctx.changed(mode); (c.dynamic ? rerun : respecialize)(); },
      });
      const pick = (bt) => { c.dynamic = bt === "dynamic"; input.placeholder = c.dynamic ? "sample value" : "value (a JS expression)"; mode.current = null; ctx.changed(mode); respecialize.now(); };
      const seg = el("div", { class: "seg", role: "group", "aria-label": `binding time of ${p.label}` },
        ...["static", "dynamic"].map((bt) => el("button", { type: "button", "data-bt": bt, "aria-pressed": String(c.dynamic === (bt === "dynamic")),
          onclick: (e) => { for (const b of e.currentTarget.parentNode.children) b.setAttribute("aria-pressed", String(b === e.currentTarget)); pick(bt); } }, bt)));
      argsBox.append(el("span", { class: "name", text: p.label }), seg, input);
    }
    if (fn.params.length === 0) argsBox.append(el("span", { class: "hint", text: "(no parameters)" }));
  }

  // ───── run (right details) ─────

  const runBox = el("div");
  right.details.append(el("span", { class: "label" }, "Run"), runBox);

  function showRunError(msg) {
    runBox.replaceChildren(el("pre", { class: "errors", text: msg }));
  }

  // ───── pipeline ─────

  function reparse() {
    const src = getDoc(left.views.src);
    try {
      st.info = topLevel(src);
      argErrors.hidden = true;
    } catch (e) {
      // Keep the last arguments; split-shot will report the error too.
      argErrors.hidden = false;
      argErrors.textContent = "parse error: " + e.message;
    }
    if (st.info && !st.info.functions.some((f) => f.name === st.entry) && st.info.functions.length) {
      st.entry = st.info.functions[st.info.functions.length - 1].name;
    }
    renderArgs();
    respecialize();
  }

  async function run() {
    const s = seq;
    const r = st.result;
    if (!r || !st.built) { runBox.replaceChildren(); return; }
    const src = getDoc(left.views.src);
    // (The calls with the current sample values: a dynamic value's edit
    // reruns without specializing again.)
    let b = st.built;
    try { b = buildEntry(src, st.info, st.entry, st.choices); } catch { /* keep the last */ }
    const [orig, res] = await Promise.all([
      evaluate(`${src}\n;return ${b.originalCall};`).catch((e) => ({ ok: false, value: e.message })),
      evaluate(`${r.js}\n;return ${b.residualCall};`).catch((e) => ({ ok: false, value: e.message })),
    ]);
    if (s !== seq) return;
    const same = orig.ok === res.ok && orig.value === res.value;
    const row = (k, call, out) => [el("span", { class: "k", text: k }),
      el("span", { class: "v" }, clip(call), el("span", { class: "arrow", text: "→" }), el("span", { class: out.ok ? "" : "errors", text: out.ok ? out.value : "throws " + out.value }))];
    runBox.replaceChildren(
      el("div", { class: "results" }, ...row("original", b.originalCall, orig), ...row("residual", b.residualCall, res)),
      el("div", { class: "checks" }, el("div", {}, verdict(same, orig.ok ? "same result" : "both throw the same", "the results differ"))),
    );
  }
  const rerun = debounce(() => { seq++; run(); }, 250);

  async function doSpecialize() {
    const s = ++seq;
    const src = getDoc(left.views.src);
    let built;
    try {
      if (!st.info) throw new Error("the source does not parse");
      built = buildEntry(src, st.info, st.entry, st.choices);
    } catch (e) {
      fail(e.message);
      return;
    }
    setDoc(right.views.input, built.program);
    setState("specializing…", "busy");
    try {
      const r = await specialize(built.program, { entry: built.entry, sourceNames: st.sourceNames, why: true });
      if (s !== seq) return;
      st.result = r;
      st.built = built;
      setDoc(right.views.js, r.js);
      setDoc(right.views.ir, r.ir);
      setDoc(right.views.why, formatWhy(r.why));
      for (const id of ["js", "ir", "why"]) right.placeholder(id, null);
      setState(`${r.blocks} ${r.blocks === 1 ? "block" : "blocks"} · ${fmtNum(r.steps)} steps · ${fmtMs(r.ms)}`);
      run();
    } catch (e) {
      if (s !== seq) return;
      fail(e.message);
    }
  }
  const respecialize = debounce(doSpecialize, 350);

  function fail(msg) {
    st.result = null;
    for (const id of ["js", "ir", "why"]) {
      setDoc(right.views[id], "");
      right.placeholder(id, "split-shot could not specialize this program. The error is below.");
    }
    setState("error", "error");
    showRunError(msg);
  }

  // ───── mode interface ─────

  mode.load = (ex) => {
    mode.current = ex.id;
    mode.blurb = ex.blurb;
    st.entry = ex.entry;
    st.choices = structuredClone(ex.args);
    for (const c of Object.values(st.choices)) c.dynamic = !!c.dynamic;
    loading = true;
    setDoc(left.views.src, ex.src);
    loading = false;
    reparse();
    ctx.changed(mode);
    respecialize.now();
  };
  mode.snapshot = () => ({ src: getDoc(left.views.src), entry: st.entry, choices: st.choices, sourceNames: st.sourceNames });
  mode.restore = (o) => {
    st.entry = o.entry;
    st.choices = o.choices || {};
    st.sourceNames = o.sourceNames !== false;
    namesBox.checked = st.sourceNames;
    mode.blurb = "A shared program.";
    mode.current = null;
    loading = true;
    setDoc(left.views.src, o.src);
    loading = false;
    reparse();
    ctx.changed(mode);
    respecialize.now();
  };
  mode.activate = () => {};
  return mode;
}

function clip(s, n = 90) {
  const one = s.replace(/\s+/g, " ");
  return one.length > n ? one.slice(0, n - 1) + "…" : one;
}

export async function copy(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const old = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => { button.textContent = old; }, 1200);
  } catch {
    button.textContent = "Copy failed";
  }
}

// The engine's account of what the residual holds and why (`--why`).
function formatWhy(json) {
  if (!json) return "";
  const w = JSON.parse(json);
  const counts = (c) => `${c.units} unit${c.units === 1 ? "" : "s"}: ${c.needed} needed, ${c.merged} merged, ${c.gap} gap`;
  const lines = [
    "What the residual holds, and why.",
    "  needed: work on dynamic values, which has to happen at run time",
    "  merged: work left because paths with different static values were joined",
    "  gap:    work the evaluator could have done now but did not",
    "",
    `residual work: ${counts(w.summary)}`,
  ];
  for (const [name, c] of Object.entries(w.sections)) lines.push(`  ${name}: ${counts(c)}`);
  if (w.causes.length) {
    lines.push("", "causes:");
    for (const c of w.causes) lines.push(`  ${c.class.padEnd(7)} ${c.kind}${c.what ? " " + c.what : ""}: ${c.units} unit${c.units === 1 ? "" : "s"}${c.sole ? ` (${c.sole} by this cause alone)` : ""}`);
  }
  if (w.units.length) {
    lines.push("", "units:");
    let section = null;
    for (const u of w.units) {
      if (u.section !== section) { section = u.section; lines.push(`  ${section}`); }
      lines.push(`    ${u.class.padEnd(7)} ${u.kind.padEnd(6)} ${u.text}`);
    }
  }
  return lines.join("\n");
}
