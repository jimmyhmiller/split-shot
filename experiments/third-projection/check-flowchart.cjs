// The three projections with the flowchart mix (mix.js), on a Brainfuck
// interpreter (brainfuck.js), every program a flowchart run by flowchart.js:
//   P1  target   = mix(brainfuck, its division, program)      computes what the interpreter does
//   P2  compiler = mix(mix, its division, brainfuck)          compiler(program) is that target
//   P3  cogen    = mix(mix, its division, mix)                 cogen(brainfuck) is that compiler
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const parse = Function(read('../general-jsmix/subset-parse.js') + '\nreturn parseProgram;')();
const F = Function(read('flowchart.js') + '\nreturn {toFlowchart, runFlowchart, division, BUILTINS};')();
const host = 'var str = BUILTINS.str, isArr = BUILTINS.isArr, fail = BUILTINS.fail, setAt = BUILTINS.setAt, member = BUILTINS.member, blockOf = BUILTINS.blockOf, pointsOf = BUILTINS.pointsOf, intern = BUILTINS.intern, isStatic = BUILTINS.isStatic, evalStatic = BUILTINS.evalStatic, reduce = BUILTINS.reduce, dynamicParams = BUILTINS.dynamicParams;\n';
const native = (src, name) => Function('BUILTINS', host + src + '\nreturn ' + name + ';')(F.BUILTINS);
const mix = native(read('mix.js'), 'mix');
const brainfuck = native(read('brainfuck.js'), 'brainfuck');
const MIX = F.toFlowchart(parse(read('mix.js'))[0]);
const BF = F.toFlowchart(parse(read('brainfuck.js'))[0]);
// (The worklist position n only grows: static, it would make a new state for
// each value when mix is specialized to itself.)
const MIXDIV = F.division(MIX, ['program', 'division'], ['n']);
const BFDIV = F.division(BF, ['program'], ['ptr']);
console.log('brainfuck static:', BFDIV.join(', '));
console.log('mix static:', MIXDIV.join(', '));
// The static variables' values at entry: the given ones, the rest undefined.
const initial = (div, given) => div.map((x) => (x in given ? given[x] : undefined));
const size = (x) => JSON.stringify(x).length;
const time = (label, f) => { const t = Date.now(); const r = f(); console.log(label, Date.now() - t, 'ms,', r[2].length, 'blocks,', size(r), 'bytes'); return r; };
const programs = [[',.', [65]], [',[->++<]>.', [21]], ['++[>++[>++<-]<-]>>.', []],
  ['++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.', []]];
const compiler = time('P2 compiler:', () => mix(MIX, MIXDIV, initial(MIXDIV, { program: BF, division: BFDIV })));
const cogen = time('P3 cogen:', () => mix(MIX, MIXDIV, initial(MIXDIV, { program: MIX, division: MIXDIV })));
const fromCogen = time('cogen(brainfuck):', () => F.runFlowchart(cogen, [initial(MIXDIV, { program: BF, division: BFDIV })]));
assert.deepEqual(fromCogen, compiler, 'cogen(brainfuck) differs from mix(mix, brainfuck)');
for (const [program, input] of programs) {
  const vs0 = initial(BFDIV, { program });
  const target = mix(BF, BFDIV, vs0);
  assert.deepEqual(F.runFlowchart(compiler, [vs0]), target, program + ': compiler(program) differs from mix(brainfuck, program)');
  assert.deepEqual(F.runFlowchart(target, [input]), brainfuck(program, input), program);
  console.log(JSON.stringify(program).slice(0, 30).padEnd(32), 'target', target[2].length, 'blocks; output', JSON.stringify(String.fromCharCode(...brainfuck(program, input))));
}
