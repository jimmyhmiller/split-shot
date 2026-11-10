// jsmix2 (docs/p3) in the worker: the self-applicable partial evaluator and
// the three projections it performs on itself. Sources come straight from
// docs/p3 so the page never holds a copy.
import jsmix2Src from "../../../docs/p3/jsmix2.js?raw";
import parse2Src from "../../../docs/p3/parse2.js?raw";
import preludeRaw from "../../../docs/p3/prelude.js?raw";

const prelude = preludeRaw.replace(/^if \(typeof module.*$/m, "");
const mod = { exports: {} };
Function("module", parse2Src)(mod);
const parse = mod.exports.parseProgram;

// Run subset source with the builtins and return the named function.
function load(src, name) {
  return Function(prelude + "\n" + src + "\nreturn " + name + ";")();
}

const mix = load(jsmix2Src, "mix");
const MIX = parse(jsmix2Src);
const countFns = (src) => (src.match(/^function /gm) || []).length;

// Two ways to get the cogen, each generated once per worker:
//   self: cogen = mix(mix, mix), jsmix2 applied to itself;
//   rust: cogen = RustPE(main(input) = mix(MIX, "mix", [input[0], input[1]])),
//         the Rust evaluator (wasm) specializing jsmix2 to its own AST.
const cogens = { self: null, rust: null };
let current = "self";

function getCogen(which, specialize) {
  if (!cogens[which]) {
    const t0 = performance.now();
    let src, blocks = null;
    if (which === "self") {
      src = mix(MIX, "mix", [MIX, "mix"]);
    } else {
      const input = prelude + "\n" + jsmix2Src +
        `\nfunction main(input) {\n  var MIX = ${JSON.stringify(MIX)};\n  return mix(MIX, "mix", [input[0], input[1]]);\n}\n`;
      const r = specialize(input, 100000000);
      src = r.js;
      blocks = r.blocks;
      r.free();
    }
    cogens[which] = { src, fn: load(src, "main"), ms: performance.now() - t0, blocks };
  }
  current = which;
  return cogens[which];
}

// The entry point: the interpreter's first function.
function entryOf(ast) {
  if (ast.length === 0) throw new Error("the interpreter has no functions");
  return ast[0][1];
}

export function p3(op, args, specialize) {
  if (op === "cogen") {
    const c = getCogen(args.which || "self", specialize);
    return { src: c.src, ms: c.ms, functions: countFns(c.src), blocks: c.blocks, which: current };
  }
  if (op === "compiler") {
    const c = getCogen(current, specialize);
    const INT = parse(args.intSrc);
    const entry = entryOf(INT);
    const t0 = performance.now();
    const src = c.fn([INT, entry]);
    const ms = performance.now() - t0;
    const direct = mix(MIX, "mix", [INT, entry]);
    return { src, ms, entry, functions: countFns(src), identical: src === direct, which: current };
  }
  if (op === "target") {
    const INT = parse(args.intSrc);
    const entry = entryOf(INT);
    const compile = load(args.compilerSrc, "main");
    const prog = JSON.parse(args.prog);
    const src = compile([prog]);
    const direct = mix(INT, entry, [prog]);
    const x = JSON.parse(args.x);
    const target = load(src, "main")(x);
    const interp = load(args.intSrc, entry)(prog, x);
    return { src, identical: src === direct, target: JSON.stringify(target), interp: JSON.stringify(interp) };
  }
  throw new Error("unknown p3 op " + op);
}

export { jsmix2Src };
