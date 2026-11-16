// subset-parse.js (plain JavaScript) against parse.cjs (Acorn): the same AST
// for every interpreter the checks use, and the same rejections.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const acornParse = require('./parse.cjs').parseProgram;
const plainParse = Function(fs.readFileSync(path.join(__dirname, 'subset-parse.js'), 'utf8') + '\nreturn parseProgram;')();
const sources = [];
const checkSrc = fs.readFileSync(path.join(__dirname, 'check.cjs'), 'utf8');
for (const m of checkSrc.matchAll(/`(function [^`]*)`/g)) sources.push(Function('return `' + m[1] + '`;')());
for (const m of checkSrc.matchAll(/'(function interp[^']*)'/g)) sources.push(m[1]);
sources.push(fs.readFileSync(path.join(__dirname, '../readable-second-projection/interpreter.js'), 'utf8'));
// The interpreters the compiler examples use, as their main parses them: the
// functions' own source text.
const interpreters = path.join(__dirname, 'interpreters');
for (const f of fs.readdirSync(interpreters).filter(f => f.endsWith('.js'))) {
  const src = fs.readFileSync(path.join(interpreters, f), 'utf8');
  const names = [...src.matchAll(/^function ([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
  const fns = Function(src + '\nreturn [' + names.join(', ') + '];')();
  sources.push(fns.map(fn => fn.toString()).join('\n'));
}
for (const f of process.argv.slice(2)) sources.push(fs.readFileSync(f, 'utf8'));
// Reformatted and commented variants, and what toString gives of functions.
const extra = [
  'function interp(p, io) {\n  // a comment\n  var a = 1, b; /* block */ b = a + 2 * 3 ** 2 ** 2 - -a;\n  return b\n}',
  'function interp(p, io) { if (p[0] === "x") return io.prompt(); else { return [1, "two", null, true, false, undefined]; } }',
  'function interp(p, io) { var s = "esc: \\n\\t\\\\ \\" \\x41 \\u0042 \\u{1F600}"; return s + typeof p + (p.length > 0 ? p[0] : -1); }',
  'function interp(p, io) { while (p.length > 0) p = p.slice(1); return\n  p; }',
  'function interp(p, io) { return !p & 1 == 2 != 3 <= 4 >= 5 < 6 > 7 % 8 / 9; }',
  'function interp(p, io) { throw new TypeError("bad " + p); }',
  'function interp(p, io) { throw new Error(); }',
  'function interp(p, io) { return 0x1F + 1.5e3 + .25 + 10; }',
];
let same = 0;
let rejects = 0;
for (const src of [...sources, ...extra]) {
  let expected;
  try { expected = acornParse(src); } catch {
    assert.throws(() => plainParse(src), undefined, 'subset-parse accepts ' + src);
    rejects++;
    continue;
  }
  assert.deepEqual(plainParse(src), expected, src);
  same++;
}
// Both reject what is outside the subset (the messages need not match).
const rejected = [
  'function interp(p, io) { let x = 1; return x; }', 'function interp(p, io) { return p || io; }',
  'function interp(p, io) { p.x = 1; }', 'function interp(p, io) { return y; }', 'function interp(p, io) { return () => 1; }',
  'function interp(p, io) { for (var i = 0; i < 1; i = i + 1) {} }', 'function interp(p, io) { return {a: 1}; }',
  'function interp(p, io) { x = 1; }', 'function interp(p, io) { return new Error("x"); }', 'function interp(p, io) { return `t`; }',
  'var x = 1;', 'function f() {} function f() {}', 'function interp(p, io) { throw new Map(); }',
  'function interp(p, io) { return p++; }', 'function interp(p, io) { return 1e999; }', 'function interp(p, io) { return [1,,2]; }',
];
for (const src of rejected) {
  assert.throws(() => acornParse(src), undefined, 'acorn accepts ' + src);
  assert.throws(() => plainParse(src), undefined, 'subset-parse accepts ' + src);
  rejects++;
}
console.log(`${same} programs parse to the same AST; ${rejects} rejected by both`);
