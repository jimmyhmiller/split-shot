import { el, remeasureAll } from "./ui.js";
import { warm } from "./pe.js";
import { encodeState, decodeState } from "./share.js";
import { SPECIALIZE, COMPILER, COGEN } from "./examples.js";
import { createSpecialize } from "./modes/specialize.js";
import { createCompiler } from "./modes/compiler.js";
import { createCogen } from "./modes/cogen.js";

const app = document.getElementById("app");

const FORMULAS = {
  specialize: () => [el("i", {}, "mix"), "(", el("span", { class: "s" }, "program"), ", ", el("span", { class: "s" }, "static args"), ") = ", el("span", { class: "r" }, "residual program")],
  compiler: () => [el("i", {}, "mix"), "(", el("span", { class: "s" }, "jsmix"), ", ", el("span", { class: "s" }, "interpreter"), ") = ", el("span", { class: "r" }, "compiler")],
  cogen: () => [el("i", {}, "mix"), "(", el("span", { class: "s" }, "mix"), ", ", el("span", { class: "s" }, "mix"), ") = ", el("span", { class: "r" }, "cogen")],
};

// ───────────── home ─────────────

function home() {
  const projection = (n, mode, formula, desc) => el("li", {}, el("a", { href: `#/play/${mode}` },
    el("span", { class: "n", text: n }), el("span", { class: "formula" }, ...formula), el("span", { class: "desc", text: desc })));
  return el("main", { class: "page" },
    el("h1", {}, "split-shot"),
    el("p", { class: "lede" }, "A partial evaluator for JavaScript. Give it a program and the part of the input that is already known, and it writes a specialized program that only needs the rest. It runs here in your browser, compiled to WebAssembly."),
    el("button", { class: "primary", onclick: () => { location.hash = "#/play"; } }, "Open the playground"),
    el("h2", {}, "The three projections"),
    el("ul", { class: "projections" },
      projection("1", "specialize", FORMULAS.specialize(), "Specialize a program to its static inputs. Specialize an interpreter to a program, and the program is compiled."),
      projection("2", "compiler", FORMULAS.compiler(), "Specialize a partial evaluator to an interpreter, and out comes a compiler. Nobody wrote its code generator."),
      projection("3", "cogen", FORMULAS.cogen(), "Specialize a partial evaluator to itself, and out comes a compiler generator: it turns interpreters into compilers.")),
    el("h2", {}, "Examples"),
    el("ul", { class: "examples" },
      ...SPECIALIZE.map((ex) => el("li", {}, el("a", { href: `#/play/specialize/${ex.id}`, text: ex.title }))),
      ...COMPILER.map((ex) => el("li", {}, el("a", { href: `#/play/compiler/${ex.id}`, text: ex.title }), el("span", { class: "what", text: " · compiler" }))),
      ...COGEN.map((ex) => el("li", {}, el("a", { href: `#/play/cogen/${ex.id}`, text: ex.title }), el("span", { class: "what", text: " · cogen" })))),
    el("footer", {}, "The first two projections run the Rust engine as wasm in a Web Worker. The third uses jsmix2, a small self-applicable partial evaluator, or the Rust engine specializing jsmix2 to itself."),
  );
}

// ───────────── playground ─────────────

let pg = null;

function playground() {
  const state = el("span", { class: "state", role: "status" });
  const exampleSelect = el("select", { "aria-label": "Example", onchange: () => { location.hash = `#/play/${pg.active.id}/${exampleSelect.value}`; } });
  const shareBtn = el("button", { type: "button", onclick: share }, "Share");
  const modeSeg = el("div", { class: "seg", role: "group", "aria-label": "Projection" });
  const formula = el("span", { class: "formula" });
  const blurb = el("span", { class: "blurb" });
  const workspace = el("div", { class: "workspace" });
  const notice = el("div", { class: "toast-error", hidden: true });

  const ctx = { changed: (m) => { if (pg && m === pg.active) paint(); } };
  const modes = [createSpecialize(ctx), createCompiler(ctx), createCogen(ctx)];
  for (const m of modes) { m.root.hidden = true; workspace.append(m.root); }
  const modeButtons = modes.map((m, i) => el("button", { type: "button", onclick: () => { location.hash = `#/play/${m.id}${m.current ? "/" + m.current : ""}`; } }, `${i + 1} · ${m.title}`));
  modeSeg.append(...modeButtons);

  const root = el("div", { class: "shell" },
    el("header", { class: "toolbar" },
      el("button", { class: "home", onclick: () => { location.hash = "#/"; } }, "split-shot"),
      modeSeg,
      el("label", {}, "Example", exampleSelect),
      shareBtn,
      state),
    el("div", { class: "strip" }, formula, blurb, notice),
    workspace);

  function paint() {
    const m = pg.active;
    for (const [i, b] of modeButtons.entries()) b.setAttribute("aria-pressed", String(modes[i] === m));
    exampleSelect.replaceChildren(
      ...(m.current ? [] : [el("option", { value: "", selected: true, disabled: true }, "(edited)")]),
      ...m.examples.map((ex) => el("option", { value: ex.id, selected: ex.id === m.current }, ex.title)));
    formula.replaceChildren(...FORMULAS[m.id]());
    blurb.textContent = m.blurb;
    state.textContent = m.state.text;
    state.className = "state" + (m.state.kind ? " " + m.state.kind : "");
  }

  async function share() {
    const m = pg.active;
    const data = await encodeState(m.snapshot());
    const url = `${location.origin}${location.pathname}#/play/${m.id}?s=${data}`;
    history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url);
      shareBtn.textContent = "Link copied";
    } catch {
      shareBtn.textContent = "Link in address bar";
    }
    setTimeout(() => { shareBtn.textContent = "Share"; }, 1500);
  }

  // Show `modeId`, and load the example or shared state the URL names.
  async function show(modeId, exampleId, shared) {
    const m = modes.find((x) => x.id === modeId) || modes[0];
    for (const x of modes) x.root.hidden = x !== m;
    pg.active = m;
    m.active = true;
    for (const x of modes) if (x !== m) x.active = false;
    notice.hidden = true;
    if (shared) {
      try {
        m.restore(await decodeState(shared));
      } catch (e) {
        notice.hidden = false;
        notice.textContent = "This link's program could not be read: " + e.message;
      }
    } else {
      const ex = m.examples.find((x) => x.id === exampleId);
      if (ex && ex.id !== m.current) m.load(ex);
      else if (!ex && !m.loaded) m.load(m.examples[0]);
    }
    m.loaded = true;
    m.activate();
    paint();
    requestAnimationFrame(remeasureAll);
  }

  return { root, show, active: modes[0] };
}

// ───────────── routing ─────────────

function route() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const [path, query = ""] = hash.split("?");
  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== "play") {
    document.title = "split-shot — a partial evaluator for JavaScript";
    app.replaceChildren(home());
    warm();
    return;
  }
  if (!pg) pg = playground();
  if (app.firstChild !== pg.root) app.replaceChildren(pg.root);
  document.title = "split-shot playground";
  pg.show(parts[1] || "specialize", parts[2], new URLSearchParams(query).get("s"));
}

window.addEventListener("hashchange", route);
route();
