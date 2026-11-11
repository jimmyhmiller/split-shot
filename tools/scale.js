#!/usr/bin/env node
//
// Scaling check: does specialization cost grow in line with the program?
//
//   node tools/scale.js [--bin path] [--filter REGEX] [--factor F] [--json out.json]
//
// Each case is a program generator `make(n)`. It is specialized at a size `n`
// and at `2n`, and the time and the residual's size are compared: doubling
// the program should about double both. A case fails when the larger run
// takes more than `F` times the smaller one (default 3.2: quadratic growth
// is 4), or when its residual has more than 2.6 times the lines, beyond a
// small allowance for fixed costs. A case also fails when either size does
// not finish in the time limit.
//
// These are the shapes that have gone quadratic (or worse) before: an
// interpreter's dispatch loop running a known program, a bundler's module
// wrappers, a loop over a large known table, a runtime loop beside a large
// known heap. Whether a residual is *right* is tools/corpus.js's question.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
let bin = path.join(root, 'target/release/js-frontend');
let filter = null;
let factor = 3.2;
let jsonOut = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--bin') bin = argv[++i];
  else if (argv[i] === '--filter') filter = new RegExp(argv[++i]);
  else if (argv[i] === '--factor') factor = Number(argv[++i]);
  else if (argv[i] === '--json') jsonOut = argv[++i];
  else {
    console.error('unknown argument ' + argv[i]);
    process.exit(2);
  }
}

const TIMEOUT_MS = 120000;
// (Fixed costs: starting up, the prelude.)
const SLACK_S = 0.25;
const SLACK_LINES = 60;

const BF = `
function brainfuck(code, input) {
  const tape = new Uint8Array(30000);
  const jumps = {}, stack = [];
  let pointer = 0, inputPointer = 0, output = "";
  for (let i = 0; i < code.length; i++) {
    if (code[i] === "[") stack.push(i);
    if (code[i] === "]") { const start = stack.pop(); jumps[start] = i; jumps[i] = start; }
  }
  for (let i = 0; i < code.length; i++) {
    switch (code[i]) {
      case ">": pointer++; break;
      case "<": pointer--; break;
      case "+": tape[pointer]++; break;
      case "-": tape[pointer]--; break;
      case ".": output += String.fromCharCode(tape[pointer]); break;
      case ",": tape[pointer] = inputPointer < input.length ? input.charCodeAt(inputPointer++) : 0; break;
      case "[": if (!tape[pointer]) i = jumps[i]; break;
      case "]": if (tape[pointer]) i = jumps[i]; break;
    }
  }
  return output;
}`;

const cases = [
  {
    name: 'interpreter-steps',
    what: 'a Brainfuck interpreter on a known program that runs n loop rounds after reading a byte',
    n: 1500,
    make: (n) => {
      // n = a * b rounds of the inner loop.
      const a = Math.floor(Math.sqrt(n));
      const b = Math.floor(n / a);
      return `${BF}\nfunction main(input) { return brainfuck(",>${'+'.repeat(a % 250 || 1)}${'>'}${'+'.repeat(b % 250 || 1)}[<[<+>>>+<<-]>>[<<+>>-]<-]<<.", String(input)); }\n`;
    },
  },
  {
    name: 'interpreter-program-size',
    what: 'the same interpreter on a known straight-line program of n instructions',
    n: 3000,
    make: (n) => `${BF}\nfunction main(input) { return brainfuck(",${'+>+<'.repeat(Math.floor(n / 4))}.", String(input)); }\n`,
  },
  {
    name: 'commonjs-modules',
    what: "n CommonJS modules behind esbuild's lazy wrappers, required by an index module",
    n: 80,
    make: (n) => {
      let s = `var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try { return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports; } catch (e) { throw mod = 0, e; }
};
`;
      for (let i = 0; i < n; i++) {
        s += `var require_m${i} = __commonJS({ "m${i}.js"(exports, module) { "use strict"; Object.defineProperty(exports, "__esModule", { value: true }); exports.default = f; var table = { a: ${i}, b: [${i}, ${i + 1}] }; function f(x) { return x + table.a + table.b.length; } module.exports = exports.default; module.exports.default = exports.default; } });\n`;
      }
      s += `var require_index = __commonJS({ "index.js"(exports, module) { "use strict";\n  Object.defineProperty(exports, "__esModule", { value: true }); exports.default = void 0;\n`;
      for (let i = 0; i < n; i++) s += `  var _m${i} = _interopRequireDefault(require_m${i}());\n`;
      s += `  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }\n  var api = { ${Array.from({ length: n }, (_, i) => `m${i}: _m${i}.default`).join(', ')} };\n  exports.default = api; module.exports = exports.default; module.exports.default = exports.default; } });\n`;
      s += `var lib = require_index();\nfunction main(input) { return lib.m0(input) + lib.m${n - 1}(input); }\n`;
      return s;
    },
  },
  {
    name: 'known-table-loop',
    what: 'a loop over a known table of n records, each combined with the input',
    n: 600,
    make: (n) => {
      const rows = Array.from({ length: n }, (_, i) => `{ id: ${i}, w: ${(i * 7) % 13}, tag: "t${i % 5}" }`).join(', ');
      return `var TABLE = [${rows}];\nfunction main(input) { var s = 0; for (var i = 0; i < TABLE.length; i++) { var r = TABLE[i]; if (r.tag === "t3") s = (s + r.w * input) | 0; } return s; }\n`;
    },
  },
  {
    name: 'runtime-loop-beside-known-heap',
    what: 'a loop the input bounds, in a program holding a known table of n records it reads by a runtime key',
    n: 1500,
    make: (n) => {
      const rows = Array.from({ length: n }, (_, i) => `k${i}: { w: ${(i * 7) % 13} }`).join(', ');
      return `var TABLE = { ${rows} };\nfunction weight(k) { var r = TABLE[k]; return r ? r.w : 0; }\nfunction main(input) { var s = 0; for (var i = 0; i < input.length; i++) { s += weight(input[i]); if (s > 1000) s -= 1000; } return s; }\n`;
    },
  },
  {
    name: 'known-loop-with-runtime-branch',
    what: 'a loop of n known rounds, each with a branch on the input that rejoins',
    n: 1600,
    make: (n) => `function main(input) { var s = 0; for (var i = 0; i < ${n}; i++) { var d = input > i ? 1 : 2; s = (s + d * i) | 0; } return s; }\n`,
  },
  {
    name: 'string-building',
    what: 'a known template of n pieces joined around runtime values',
    n: 600,
    make: (n) => {
      const parts = Array.from({ length: n }, (_, i) => `"p${i}"`).join(', ');
      return `var PARTS = [${parts}];\nfunction main(input) { var out = ""; for (var i = 0; i < PARTS.length; i++) { out += PARTS[i]; if (i % 50 === 0) out += input; } return out; }\n`;
    },
  },
];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scale-'));
// (As a module: a bundle's top-level bindings are the module's own.)
function run(name, src) {
  const file = path.join(tmp, name + '.mjs');
  fs.writeFileSync(file, src + '\nexport { main };\n');
  const t0 = process.hrtime.bigint();
  const r = spawnSync(bin, ['--js', '--budget', '200M', file], { encoding: 'utf8', timeout: TIMEOUT_MS, maxBuffer: 1 << 30 });
  const s = Number(process.hrtime.bigint() - t0) / 1e9;
  if (r.error || r.status !== 0) {
    const why = r.error ? (r.error.code === 'ETIMEDOUT' ? `no result in ${TIMEOUT_MS / 1000} s` : String(r.error.message)) : (r.stderr || '').trim().split('\n').pop().slice(0, 160);
    return { failed: why, s };
  }
  return { s, lines: r.stdout.split('\n').length };
}

const results = [];
let bad = 0;
for (const c of cases) {
  if (filter && !filter.test(c.name)) continue;
  const small = run(c.name + '-1', c.make(c.n));
  const large = run(c.name + '-2', c.make(2 * c.n));
  let verdict = 'ok';
  let detail = '';
  if (small.failed || large.failed) {
    verdict = 'FAIL';
    detail = small.failed ? `n=${c.n}: ${small.failed}` : `n=${2 * c.n}: ${large.failed}`;
  } else {
    const timeBound = factor * small.s + SLACK_S;
    const lineBound = 2.6 * small.lines + SLACK_LINES;
    if (large.s > timeBound) {
      verdict = 'SLOW';
      detail = `time grew ${(large.s / small.s).toFixed(1)}x`;
    } else if (large.lines > lineBound) {
      verdict = 'BLOAT';
      detail = `residual grew ${(large.lines / small.lines).toFixed(1)}x`;
    }
  }
  if (verdict !== 'ok') bad++;
  const fmt = (r) => (r.failed ? '-' : `${r.s.toFixed(2)} s, ${r.lines} lines`);
  console.log(`${verdict.padEnd(6)}${c.name.padEnd(34)} n=${String(c.n).padEnd(5)} ${fmt(small).padEnd(22)} 2n: ${fmt(large).padEnd(22)} ${detail}`);
  results.push({ name: c.name, what: c.what, n: c.n, small, large, verdict, detail });
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`SCALE ok ${results.length - bad}  failing ${bad}  (of ${results.length})`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(results, null, 2));
process.exit(bad ? 1 : 0);
