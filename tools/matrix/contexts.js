// Binding-time contexts of the reduction matrix (see tools/matrix.js).
//
// A context places a feature's expression `F(x)` in a program where its
// operand is known or not, and says what the specializer should leave of it.
//
//   build(f)            the program, as source text (a script defining
//                       `main(input)`), or null when the context does not
//                       apply
//   baseline(f, lit)    (optional) the same program with the feature's known
//                       value written in literally: what the context's own
//                       plumbing costs
//   check(c)            the residual units that should not be there, given
//                         c.report    the why report of the program
//                         c.baseline  the why report of the baseline, if any
//                         c.throws    the original throws on every input
//                       An empty list is the verdict `ok`.
//
// Names the programs use themselves end in `_`, so a feature's own names
// never meet them.

const fx = (f, x) => f.expr(x);
const setup = (f) => (f.setup ? '  ' + f.setup + '\n' : '');

const inMain = (u) => u.section === 'main';
const lost = (u) => u.class === 'gap' || u.class === 'merged' || u.static;

// `return <constant>`: nothing left in main, nothing lost anywhere. A
// program that throws whatever the input leaves the throw and what it throws.
function constant(c) {
  return c.report.units.filter((u) => {
    if (lost(u)) return true;
    if (!inMain(u)) return false;
    if (c.throws && (u.kind === 'throw' || u.kind === 'alloc')) return false;
    return true;
  });
}

// Units as a multiset, residual names apart.
const unitKey = (u) => `${u.section}|${u.kind}|${u.class}|${u.static}|${u.text.replace(/\bv\d+\b/g, 'v')}`;

function beyond(report, baseline) {
  const have = new Map();
  for (const u of baseline.units) have.set(unitKey(u), (have.get(unitKey(u)) || 0) + 1);
  const out = [];
  for (const u of report.units) {
    const k = unitKey(u);
    if (have.get(k) > 0) have.set(k, have.get(k) - 1);
    else out.push(u);
  }
  return out;
}

const sectionUnits = (report, name) => (report.sections[name] ? report.sections[name].units : 0);

const contexts = [
  {
    name: 'static',
    about: '`return F(S)` with a known operand: main is `return <constant>`',
    build: (f) => `function main(input) {\n${setup(f)}  return ${fx(f, f.staticArg)};\n}\n`,
    check: constant,
  },
  {
    name: 'branch',
    about:
      '`F(S)` in one arm of `if (input.flag)`, `F(S2)` in the other: only the branch is left (no gap, no merged, no call or new in main)',
    build: (f) =>
      `function main(input) {\n${setup(f)}  var r_;\n  if (input.flag) {\n    r_ = ${fx(f, f.staticArg)};\n  } else {\n    r_ = ${fx(f, f.staticArg2)};\n  }\n  return r_;\n}\n`,
    check: (c) => c.report.units.filter((u) => lost(u) || (inMain(u) && (u.kind === 'call' || u.kind === 'new'))),
  },
  {
    name: 'loop',
    // (The value is bound before the push. Written `out_.push(F(S))`, the
    // callee is read before the argument is evaluated, and when the argument
    // is anything the specializer has to unfold the residual keeps that read
    // as a statement of its own, `out.push;`: one unit over the baseline in
    // every such row, whatever the feature.)
    about:
      '`var t = F(S); out.push(t)` in a loop over `input.list`: no more gap, merged, static or total units than the same loop with the constant written in',
    build: (f) =>
      `function main(input) {\n${setup(f)}  var out_ = [];\n  for (var i_ = 0; i_ < input.list.length; i_++) {\n    var t_ = ${fx(f, f.staticArg)};\n    out_.push(t_);\n  }\n  return out_.join("|");\n}\n`,
    baseline: (f, lit) =>
      `function main(input) {\n  var out_ = [];\n  for (var i_ = 0; i_ < input.list.length; i_++) {\n    var t_ = ${lit};\n    out_.push(t_);\n  }\n  return out_.join("|");\n}\n`,
    check: (c) => {
      const r = c.report;
      const b = c.baseline;
      const over =
        r.summary.gap > b.summary.gap ||
        r.summary.merged > b.summary.merged ||
        r.summary.static > b.summary.static ||
        r.summary.units > b.summary.units ||
        sectionUnits(r, 'main') > sectionUnits(b, 'main');
      if (!over) return [];
      const extra = beyond(r, b);
      // (More units than the baseline, every one of them also in it: the
      // loop was unrolled or duplicated.)
      if (extra.length === 0) return r.units;
      // (A needed unit that differs from the baseline's only follows from a
      // lost one, when there is one: `t = <unfolded>`.)
      const lossy = extra.filter(lost);
      return lossy.length ? lossy : extra;
    },
  },
  {
    name: 'dynamic',
    about: '`return F(input.…)`: everything left depends on the input (no gap, no static unit; merged is reported, not failed)',
    build: (f) => `function main(input) {\n${setup(f)}  return ${fx(f, f.dynArg)};\n}\n`,
    check: (c) => c.report.units.filter((u) => u.class === 'gap' || u.static),
  },
  {
    name: 'helper',
    about: '`h(S) + "" + h(S2)` where `h(x)` returns `F(x)`: main is `return <constant>`',
    build: (f) =>
      `function main(input) {\n${setup(f)}  function h_(p_) { return ${fx(f, 'p_')}; }\n  return h_(${f.staticArg}) + "" + h_(${f.staticArg2});\n}\n`,
    check: constant,
  },
  {
    name: 'closure',
    about: 'a closure over `var k = S` returning `F(k)`, called once: main is `return <constant>`',
    build: (f) =>
      `function main(input) {\n${setup(f)}  var k_ = ${f.staticArg};\n  var f_ = function () { return ${fx(f, 'k_')}; };\n  return f_();\n}\n`,
    check: constant,
  },
  {
    name: 'try',
    about: '`try { return F(S); } catch (e) { return "caught"; }`: main is `return <constant>`',
    build: (f) =>
      `function main(input) {\n${setup(f)}  try {\n    return ${fx(f, f.staticArg)};\n  } catch (e_) {\n    return "caught";\n  }\n}\n`,
    // (Inside the try a throw is caught: nothing is left of it.)
    check: (c) => constant({ report: c.report, throws: false }),
  },
];

module.exports = contexts;
