// The two validator cases exhaust the specializer's budget ("specialization
// budget exceeded (100000000 residual-expression nodes)", after about 45 s).
// The whole library is imported (`import validator from "validator"`): its
// index.js requires 101 Babel-compiled CommonJS modules through esbuild's
// lazy `__commonJS` wrappers. Each module alone specializes in well under a
// second. This script keeps `isEmail` and the first K other requires of the
// index of a kept bundle (wild.js --keep DIR; DIR/validator-email.top/bundle.mjs):
//
//   node cut-validator-index.cjs bundle.mjs K > cut.mjs
//   js-frontend --js --budget 100M cut.mjs | wc -l
//
//   K    residual lines   time
//   0          1,077      0.1 s
//   8          3,010      0.2 s
//   16         4,360      0.3 s
//   24        22,207      0.9 s
//   32        44,180      1.6 s
//   40       158,720      4.6 s
//   48       633,660       17 s
//   56     1,070,916       31 s
//   64     1,509,264       43 s
//   80     budget exceeded (48 s)
//
// The account (--why-json) of such a residual puts nearly every unit in the
// index module's body, under `merged merge-activation: an object in
// __require` and `gap builtin-effects-unknown: Object.defineProperty`.
const fs = require('fs');
const k = Number(process.argv[3]);
let lines = fs.readFileSync(process.argv[2], 'utf8').split('\n');
const start = lines.findIndex((l) => /^var require_validator = __commonJS/.test(l));
let kept = 0;
const removed = [];
lines = lines.map((l, i) => {
  if (i < start) return l;
  const m = l.match(/^    var (_\w+) = _interopRequire(Default|Wildcard)\(require_\w+\(\)(, true)?\);$/);
  if (!m) return l;
  if (m[1] === '_isEmail' || kept++ < k) return l;
  removed.push(m[1]);
  return null;
}).filter((l) => l !== null);
const re = new RegExp('\\b(' + removed.join('|') + ')\\.(\\w+)', 'g');
lines = lines.map((l, i) => (i >= start && removed.length ? l.replace(re, 'void 0') : l));
process.stdout.write(lines.join('\n'));
console.error(`kept ${Math.min(k, kept)} + isEmail, removed ${removed.length}`);
