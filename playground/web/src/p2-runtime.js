// The second projection, in the worker: mix(jsmix, interpreter) = compiler.
//
// jsmix is experiments/general-jsmix/jsmix.js, an AST-based specializer for a
// JS subset. The interpreter is parsed and annotated with binding times by
// that experiment's own parse.cjs and binding-times.cjs, then split-shot (the
// Rust engine, as wasm) specializes jsmix with the annotated interpreter
// static and the program dynamic. What comes out is a compiler: it reads a
// program and builds target code with the helpers in codegen.cjs.
import * as acorn from "acorn";
import * as astring from "astring";
import * as eslintScope from "eslint-scope";
import { loadCjs } from "./cjs.js";
import jsmixSrc from "../../../experiments/general-jsmix/jsmix.js?raw";
import parseSrc from "../../../experiments/general-jsmix/parse.cjs?raw";
import btSrc from "../../../experiments/general-jsmix/binding-times.cjs?raw";
import codegenSrc from "../../../experiments/general-jsmix/codegen.cjs?raw";
import readableSrc from "../../../tools/readable-js/index.cjs?raw";
import bindingsSrc from "../../../tools/readable-js/bindings.cjs?raw";

const npm = { acorn, astring, "eslint-scope": eslintScope };
const { parseProgram } = loadCjs(parseSrc, { acorn }, "parse.cjs");
const { analyze } = loadCjs(btSrc, {}, "binding-times.cjs");
const codegen = loadCjs(codegenSrc, {}, "codegen.cjs");
const { simplify } = loadCjs(readableSrc, npm, "readable-js/index.cjs");
const { cleanBindings } = loadCjs(bindingsSrc, npm, "readable-js/bindings.cjs");
const jsmix = Function("codegen", jsmixSrc + "\nreturn jsmix;")(codegen);

export { jsmixSrc, codegenSrc };

// The interpreter's AST with binding-time annotations. (`analyze` annotates
// in place, so each use parses afresh.)
function annotated(src) {
  return analyze(parseProgram(src), "interp");
}

function show(v) {
  if (v === undefined) return "undefined";
  if (typeof v === "number" && !Number.isFinite(v)) return String(v);
  if (typeof v === "number" && Object.is(v, -0)) return "-0";
  try { return JSON.stringify(v); } catch { return String(v); }
}

// A host object that logs every method call. A method named in `reads`
// returns the next of `inputs`; any other returns undefined.
function recordingIo(reads, inputs, events) {
  let pos = 0;
  return new Proxy({}, {
    get(_, name) {
      if (typeof name !== "string") return undefined;
      return (...args) => {
        if (reads.includes(name)) {
          const v = pos < inputs.length ? inputs[pos] : undefined;
          pos++;
          events.push(`io.${name}() → ${show(v)}`);
          return v;
        }
        events.push(`io.${name}(${args.map(show).join(", ")})`);
        return undefined;
      };
    },
  });
}

function observe(fn, reads, inputs) {
  const events = [];
  try {
    const result = fn(recordingIo(reads, inputs, events));
    return { ok: true, result: show(result), events };
  } catch (e) {
    return { ok: false, result: `${e && e.name}: ${e && e.message}`, events };
  }
}

export function p2(op, args, specialize) {
  if (op === "derive") {
    const ast = annotated(args.src);
    // fn: ["fundecl", name, params, body, names, paramFlags, nameFlags]
    const bindingTimes = ast.map((fn) => ({
      name: fn[1],
      params: fn[2].map((p, i) => [p, fn[5][i]]),
      locals: fn[4].filter((n) => !fn[2].includes(n)).map((n) => [n, fn[6][fn[4].indexOf(n)]]),
    }));
    const input = jsmixSrc + "\nfunction main(program) { var INT = " + JSON.stringify(ast) + "; return jsmix(INT, \"interp\", program); }\n";
    const t0 = performance.now();
    const r = specialize(input, "main", 0, true, false);
    const ms = performance.now() - t0;
    const raw = r.js.replace(/^function main\(/m, "function compile(");
    const out = { raw, input, bindingTimes, blocks: r.blocks, steps: r.steps, ms, readable: null, readableError: null };
    r.free();
    try {
      out.readable = cleanBindings(simplify(raw).code).code;
    } catch (e) {
      out.readableError = e.message;
    }
    return out;
  }
  if (op === "run") {
    const program = JSON.parse(args.program);
    const inputs = JSON.parse(args.inputs);
    if (!Array.isArray(inputs)) throw new Error("inputs must be a JSON array");
    const compile = Function("codegen", args.raw + "\nreturn compile;")(codegen);
    let target;
    try {
      target = compile(program);
    } catch (e) {
      return { compileError: `${e.name}: ${e.message}` };
    }
    const readableSame = args.readable ? Function("codegen", args.readable + "\nreturn compile;")(codegen)(program) === target : null;
    const direct = jsmix(annotated(args.src), "interp", program);
    const run = Function("return (" + target + ");")();
    const interp = Function(args.src + "\nreturn interp;")();
    return {
      target,
      identical: target === direct,
      readableSame,
      compiled: observe((io) => run(io), args.reads, inputs),
      interpreted: observe((io) => interp(program, io), args.reads, inputs),
    };
  }
  throw new Error("unknown p2 op " + op);
}
