// The playground: a program on the left, what split-shot makes of it on the
// right. split-shot specializes `main`; its parameter is the dynamic input,
// and everything else the program computes from known values happens now.
import { el, makePane, setDoc, getDoc, debounce, fmtNum, fmtMs, remeasureAll } from "./ui.js";
import { specialize, cancelSpecialization } from "./pe.js";
import { encodeState, decodeState } from "./share.js";
import { EXAMPLES, GROUPS } from "./examples.js";

const app = document.getElementById("app");
const st = { current: null, sourceNames: true, files: [], slow: false, example: null };
let seq = 0;
let loading = false;

// ───────────── toolbar ─────────────

const state = el("span", { class: "state", role: "status" });
const exampleSelect = el("select", { "aria-label": "Example", onchange: () => { location.hash = `#/${exampleSelect.value}`; } });
const shareBtn = el("button", { type: "button", onclick: share }, "Share");
const notice = el("div", { class: "toast-error", hidden: true });

function setState(text, kind = "") {
  state.textContent = text;
  state.className = "state" + (kind ? " " + kind : "");
}

function paintExamples() {
  exampleSelect.replaceChildren(
    ...(st.current ? [] : [el("option", { value: "", selected: true, disabled: true }, "(edited)")]),
    ...GROUPS.map((g) => el("optgroup", { label: g.label },
      ...g.examples.map((ex) => el("option", { value: ex.id, selected: ex.id === st.current }, ex.title)))));
}

// ───────────── panes ─────────────

const left = makePane({
  title: "Source",
  note: "split-shot specializes main; its parameter is the dynamic input",
  tabs: [{ id: "program.js", label: "program.js" }],
});

// The program: the files in order, as one script.
function program() {
  return st.files.map((f) => getDoc(left.views[f.name])).join("\n");
}

function setFiles(files) {
  st.files = files.map((f) => ({ name: f.name }));
  left.setTabs(files.map((f) => ({
    id: f.name, label: f.name, doc: f.src, wrap: true,
    onChange: () => { if (!loading) { st.current = null; paintExamples(); changed(); } },
  })));
  if (files.some((f) => f.name === "main.mjs")) left.select("main.mjs");
}

const namesBox = el("input", { type: "checkbox", checked: true, onchange: () => { st.sourceNames = namesBox.checked; changed(); } });
const copyBtn = el("button", { type: "button", onclick: () => copy(getDoc(right.views[right.current]), copyBtn) }, "Copy");
const right = makePane({
  title: "Residual",
  tools: [el("label", { class: "check", title: "Name residual variables as the source does, where one stands for one" }, namesBox, "source names"), copyBtn],
  tabs: [
    { id: "js", label: "residual.js", readOnly: true, wrap: true },
    { id: "ir", label: "IR", readOnly: true, lang: "text", wrap: true },
    { id: "why", label: "why", readOnly: true, lang: "text", wrap: true },
  ],
});
const runBtn = el("button", { type: "button", onclick: () => run() }, "Run specialization (~2 min)");
const slowNotice = el("div", { class: "slow-notice", hidden: true },
  el("span", {}, "This example takes about 2 minutes to specialize and may take longer on your device. Edits and settings changes do not run automatically."), runBtn);
right.root.querySelector(".pane-heading").after(slowNotice);

const errors = el("pre", { class: "errors" });
right.details.append(el("b", {}, "Error"), errors);

app.replaceChildren(el("div", { class: "shell" },
  el("header", { class: "toolbar" },
    el("span", { class: "brand" }, "split-shot"),
    el("label", {}, "Example", exampleSelect),
    shareBtn,
    notice,
    state),
  el("div", { class: "workspace" }, left.root, right.root)));

// ───────────── specializing ─────────────

function displayResult(r) {
  setDoc(right.views.js, r.js);
  setDoc(right.views.ir, r.ir);
  setDoc(right.views.why, formatWhy(r.why));
  for (const id of ["js", "ir", "why"]) right.placeholder(id, null);
  right.details.hidden = true;
}

async function run() {
  const s = ++seq;
  respecialize.cancel();
  runBtn.disabled = true;
  setState("specializing…", "busy");
  try {
    const r = await specialize(program(), { sourceNames: st.sourceNames, why: true });
    if (s !== seq) return;
    displayResult(r);
    setState(`${r.blocks} ${r.blocks === 1 ? "block" : "blocks"} · ${fmtNum(r.steps)} steps · ${fmtMs(r.ms)}`);
  } catch (e) {
    if (s !== seq) return;
    for (const id of ["js", "ir", "why"]) {
      setDoc(right.views[id], "");
      right.placeholder(id, "split-shot could not specialize this program. The error is below.");
    }
    errors.textContent = e.message;
    right.details.hidden = false;
    setState("error", "error");
  } finally {
    if (s === seq) runBtn.disabled = false;
  }
}
const respecialize = debounce(run, 350);

function stop() {
  ++seq;
  respecialize.cancel();
  cancelSpecialization();
  runBtn.disabled = false;
}

async function showPrecomputed() {
  const s = ++seq;
  const example = st.example;
  if (!example?.precomputed) {
    setState("Run manually · slow example");
    return;
  }
  setState("loading precomputed result…");
  try {
    const snapshot = await example.precomputed();
    const sourceHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(program()))),
      b => b.toString(16).padStart(2, "0")).join("");
    if (s !== seq) return;
    if (snapshot.sourceHash !== sourceHash || snapshot.sourceNames !== st.sourceNames) {
      setState("Source or settings changed · result out of date");
      return;
    }
    displayResult(snapshot.result);
    setState(`${snapshot.result.blocks} blocks · precomputed result`);
  } catch (e) {
    if (s !== seq) return;
    setState("Precomputed result unavailable · run manually");
    errors.textContent = e.message;
    right.details.hidden = false;
  }
}

function changed() {
  stop();
  if (st.slow) showPrecomputed();
  else respecialize();
}

function load(files, current, slow = false) {
  stop();
  st.current = current;
  st.example = EXAMPLES.find(e => e.id === current) ??
    EXAMPLES.find(e => e.precomputed && JSON.stringify(e.files) === JSON.stringify(files));
  st.slow = slow || !!st.example?.slow;
  slowNotice.hidden = !st.slow;
  right.root.classList.toggle("has-slow-notice", st.slow);
  paintExamples();
  loading = true;
  setFiles(files);
  loading = false;
  for (const id of ["js", "ir", "why"]) {
    setDoc(right.views[id], "");
    right.placeholder(id, st.slow ? "Run specialization to generate a result for this source and these settings." : null);
  }
  right.details.hidden = true;
  if (st.slow) showPrecomputed();
  else respecialize.now();
}

// ───────────── sharing and routing ─────────────

async function share() {
  const files = st.files.map((f) => ({ name: f.name, src: getDoc(left.views[f.name]) }));
  const data = await encodeState({ files, sourceNames: st.sourceNames, slow: st.slow });
  const url = `${location.origin}${location.pathname}#/?s=${data}`;
  history.replaceState(null, "", url);
  try {
    await navigator.clipboard.writeText(url);
    shareBtn.textContent = "Link copied";
  } catch {
    shareBtn.textContent = "Link in address bar";
  }
  setTimeout(() => { shareBtn.textContent = "Share"; }, 1500);
}

// `#/<example>`, or `#/?s=<shared program>`. (An earlier layout's links,
// `#/play/<mode>/<example>`, name the example third.)
async function route() {
  const [path, query = ""] = location.hash.replace(/^#/, "").split("?");
  const parts = path.split("/").filter(Boolean);
  const shared = new URLSearchParams(query).get("s");
  notice.hidden = true;
  if (shared) {
    try {
      const o = await decodeState(shared);
      st.sourceNames = o.sourceNames !== false;
      namesBox.checked = st.sourceNames;
      // (A link of one program, `src`, from before programs had files.)
      load(o.files ?? [{ name: "program.js", src: o.src }], null, o.slow === true);
    } catch (e) {
      notice.hidden = false;
      notice.textContent = "This link's program could not be read: " + e.message;
      if (st.files.length === 0) load(EXAMPLES[0].files, EXAMPLES[0].id);
    }
  } else {
    const id = parts[0] === "play" ? parts[2] : parts[0];
    const ex = EXAMPLES.find((x) => x.id === id) ?? EXAMPLES[0];
    if (ex.id !== st.current) load(ex.files, ex.id);
  }
  requestAnimationFrame(remeasureAll);
}

window.addEventListener("hashchange", route);
route();

// ───────────── helpers ─────────────

async function copy(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "Copied";
  } catch {
    button.textContent = "Copy failed";
  }
  setTimeout(() => { button.textContent = "Copy"; }, 1200);
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
    "  gap:    work split-shot could have done now but did not",
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
