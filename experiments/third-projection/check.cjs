// mix3's three projections on the interpreters of docs/p3, run by eval3:
// the target does what the interpreter does (P1), the compiler mix3 makes of
// itself makes that target (P2), and the cogen makes that compiler (P3).
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const P3 = path.join(__dirname, '../../docs/p3');
const read = (f) => fs.readFileSync(f, 'utf8');
const prelude = read(path.join(P3, 'prelude.js')).replace(/^if \(typeof module.*$/m, '');
const parse = (() => { const m = { exports: {} }; Function('module', read(path.join(P3, 'parse2.js')))(m); return m.exports.parseProgram; })();
const mixSrc = read(path.join(__dirname, 'mix3.js'));
const { mix } = Function(prelude + mixSrc + '\nreturn {mix};')();
const { runProgram: run } = Function(read(path.join(__dirname, 'eval3.js')) + '\nreturn {runProgram};')();
const MIX = parse(mixSrc);
const size = (x) => JSON.stringify(x).length;
const t0 = Date.now();
const cogen = mix(MIX, 'mix', [MIX, 'mix']);
console.log(`cogen: ${cogen.length} functions, ${size(cogen)} bytes as JSON, ${Date.now() - t0} ms`);
const cases = [
  ['int.js', [[['addin', 0], ['addlit', 1], ['mullit', 3]], [['addin', 0], ['mullit', 4], ['subin', 0]], []]],
  ['vm.js', [[['jz', 4], ['add'], ['dec'], ['jmp', 0], ['ret']], [['add'], ['add'], ['ret']]]],
];
for (const [file, programs] of cases) {
  const src = read(path.join(P3, file));
  const INT = parse(src);
  const entry = INT[0][1];
  const interp = Function(prelude + src + '\nreturn ' + entry + ';')();
  const compiler = mix(MIX, 'mix', [INT, entry]);
  const fromCogen = run(cogen, 'main', [[INT, entry]]);
  assert.deepEqual(fromCogen, compiler, file + ': cogen(interpreter) differs from mix(mix, interpreter)');
  for (const prog of programs) {
    const target = mix(INT, entry, [prog]);
    assert.deepEqual(run(compiler, 'main', [[prog]]), target, file + ': compiler(program) differs from mix(interpreter, program)');
    for (const x of [0, 1, 5, 7]) assert.equal(run(target, 'main', [x]), interp(prog, x), file + ' ' + JSON.stringify(prog) + ' ' + x);
  }
  console.log(`${file}: compiler ${compiler.length} functions, ${size(compiler)} bytes; P1, P2, P3 agree`);
}
