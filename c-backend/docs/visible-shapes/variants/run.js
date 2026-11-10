'use strict';
// Driver for the shape-variant experiment. See ../README.md.
//
// Specializes interpreter.js once per (guest function, receiver shape) from a
// worklist. The shape table grows as specialization discovers transitions,
// and everything is specialized again until nothing new turns up. Then the
// residual variants are run against a small host heap and compared with the
// same program in plain JavaScript.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const specializer = path.resolve(__dirname, '../../../../target/release/js-frontend');
const interpreter = fs.readFileSync(path.join(__dirname, 'interpreter.js'), 'utf8');

// function Vec(x, y) { this.x = x; this.y = y; }
// Vec.prototype.add = function (o) { return new Vec(this.x + o.x, this.y + o.y); };
// function Ent(p, v) { this.pos = p; this.vel = v; }
// Ent.prototype.step = function () { this.pos = this.pos.add(this.vel); };
// function main(n) { var e = new Ent(new Vec(1, 2), new Vec(n, 3)); var i = 0;
//   while (i < 3) { e.step(); i = i + 1; } return e.pos.x + e.pos.y; }
const L = i => ['local', i], T = ['this'], N = n => ['num', n];
const prog = {
  functions: [
    { name: 'main', params: 1, locals: 3, body: [
      ['setlocal', 1, ['new', 1, [['new', 0, [N(1), N(2)]], ['new', 0, [L(0), N(3)]]]]],
      ['setlocal', 2, N(0)],
      // DYNAMIC_LOOP=1 bounds the loop by the input, so it stays a loop.
      ['while', ['bin', '<', L(2), process.env.DYNAMIC_LOOP ? L(0) : N(3)], [['expr', ['call', L(1), 'step', []]], ['setlocal', 2, ['bin', '+', L(2), N(1)]]]],
      ['return', ['bin', '+', ['get', ['get', L(1), 'pos'], 'x'], ['get', ['get', L(1), 'pos'], 'y']]]] },
    { name: 'Vec', params: 2, locals: 2, body: [['setprop', T, 'x', L(0)], ['setprop', T, 'y', L(1)]] },
    { name: 'Vec.add', params: 1, locals: 1, body: [
      ['return', ['new', 0, [['bin', '+', ['get', T, 'x'], ['get', L(0), 'x']], ['bin', '+', ['get', T, 'y'], ['get', L(0), 'y']]]]]] },
    { name: 'Ent', params: 2, locals: 2, body: [['setprop', T, 'pos', L(0)], ['setprop', T, 'vel', L(1)]] },
    { name: 'Ent.step', params: 0, locals: 0, body: [
      ['setprop', T, 'pos', ['call', ['get', T, 'pos'], 'add', [['get', T, 'vel']]]]] },
  ],
  classes: [{ ctor: 1, methods: { add: 2 }, empty: 0 }, { ctor: 3, methods: { step: 4 }, empty: 1 }],
};
function plain(n) {
  function Vec(x, y) { this.x = x; this.y = y; }
  Vec.prototype.add = function (o) { return new Vec(this.x + o.x, this.y + o.y); };
  function Ent(p, v) { this.pos = p; this.vel = v; }
  Ent.prototype.step = function () { this.pos = this.pos.add(this.vel); };
  var e = new Ent(new Vec(1, 2), new Vec(n, 3)), i = 0;
  while (i < (process.env.DYNAMIC_LOOP ? n : 3)) { e.step(); i = i + 1; }
  return e.pos.x + e.pos.y;
}

// Flatten the syntax: every expression, statement and block becomes a row
// in `nodes` whose children are node ids. Rows have one fixed width (see
// the note at the top of interpreter.js).
const NODE_WIDTH = 17;
const nodes = [];
function row(fields) {
  if (fields.length > NODE_WIDTH) throw new Error('node row wider than NODE_WIDTH: ' + JSON.stringify(fields));
  while (fields.length < NODE_WIDTH) fields.push(0);
  return nodes.push(fields) - 1;
}
function flattenBlock(statements) { return row(['block', statements.map(flatten)]); }
function flatten(e) {
  const tag = e[0];
  if (tag === 'num' || tag === 'local' || tag === 'this') return row(e.slice());
  if (tag === 'bin') return row([tag, e[1], flatten(e[2]), flatten(e[3])]);
  if (tag === 'get') return row([tag, flatten(e[1]), e[2]]);
  if (tag === 'new') return row([tag, e[1], e[2].map(flatten)]);
  if (tag === 'call') return row([tag, flatten(e[1]), e[2], e[3].map(flatten)]);
  if (tag === 'setprop') return row([tag, flatten(e[1]), e[2], flatten(e[3])]);
  if (tag === 'setlocal') return row([tag, e[1], flatten(e[2])]);
  if (tag === 'while') return row([tag, flatten(e[1]), flattenBlock(e[2])]);
  if (tag === 'return' || tag === 'expr') return row([tag, flatten(e[1])]);
  throw new Error('unknown syntax tag ' + tag);
}
for (const f of prog.functions) f.body = flattenBlock(f.body);
const shapes = [{ cls: 0, keys: [] }, { cls: 1, keys: [] }];
const transitions = {}, exits = {};
// A variant is "code:shape:exact"; shape "dyn" means nothing is known about
// the receiver, and "none" that there is none.
const wanted = new Set(['0:none:0']);
for (let code = 0; code < prog.functions.length; code++) wanted.add(code + ':dyn:0');
const residuals = new Map();

function specialize(key) {
  const [code, shape, exact] = key.split(':');
  const receiver = shape === 'dyn' ? 'hostShapeOf(me)' : shape === 'none' ? '-2' : shape;
  // The tables and the interpreter are private to the entry: as module-level
  // declarations the specializer leaves them all in the residual.
  const source = `function entry(carrier) {
var prog = ${JSON.stringify(prog)};
var nodes = ${JSON.stringify(nodes)};
var shapes = ${JSON.stringify(shapes)};
var transitions = ${JSON.stringify(transitions)};
var exits = ${JSON.stringify(exits)};
${interpreter}
var f = prog.functions[${code}], values = [], known = [], exact = [], i = 0;
while (i < f.locals) { values[i] = 0; known[i] = -1; exact[i] = 0; i = i + 1; }
i = 0;
while (i < f.params) { var a = hostArg(carrier, i); values[i] = a; known[i] = hostShapeOf(a); i = i + 1; }
var me = hostThis(carrier), self = f.locals;
values[self] = me;
known[self] = ${receiver};
exact[self] = ${exact};
var frame = { result: 0 };
execute(nodes[f.body], self, values, known, exact, frame);
hostExit(known[self]);
return frame.result;
}
`;
  const file = path.join(__dirname, process.env.DYNAMIC_LOOP ? 'out-dynamic-loop' : 'out', key.replace(/:/g, '-') + '.source.js');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, source);
  const p = cp.spawnSync(specializer, ['--js', '--entry', 'entry', file], { encoding: 'utf8',
    env: { ...process.env, SPEC_WEIGHT_BUDGET: '2000000', PE_NO_SHARED_CONTEXTS: '1', PE_CONTEXT_POINTS: '1' } });
  if (p.status !== 0) throw new Error(key + ': specializer failed: ' + p.stderr.slice(-600));
  const residual = p.stdout.replace(/^--- residual as JavaScript ---\n/, '');
  fs.writeFileSync(file.replace('.source.js', '.residual.js'), residual);
  return residual;
}

let round = 0, changed = true;
while (changed) {
  changed = false;
  round++;
  // Every shape of a class is a possible guard arm for that class's methods.
  shapes.forEach((shape, id) => {
    for (const code of Object.values(prog.classes[shape.cls].methods)) wanted.add(`${code}:${id}:0`);
  });
  for (const key of [...wanted]) {
    const residual = specialize(key);
    residuals.set(key, residual);
    for (const m of residual.matchAll(/hostNeedShape\((\d+), "(\w+)"\)/g)) {
      const name = m[1] + ':' + m[2];
      if (transitions[name] === undefined) {
        const parent = shapes[Number(m[1])];
        transitions[name] = shapes.push({ cls: parent.cls, keys: [...parent.keys, m[2]] }) - 1;
        changed = true;
      }
    }
    for (const m of residual.matchAll(/\b\w+\((\d+), (\d+), ([01]), "/g)) {
      const variant = `${m[1]}:${m[2]}:${m[3]}`;
      if (!wanted.has(variant)) { wanted.add(variant); changed = true; }
    }
    const [code, shape, exact] = key.split(':');
    const exit = /hostExit\((-?\d+)\)/.exec(residual);
    if (exact === '1' && exit && exits[code + ':' + shape] !== Number(exit[1])) {
      exits[code + ':' + shape] = Number(exit[1]);
      changed = true;
    }
  }
  console.log(`round ${round}: ${shapes.length} shapes, ${wanted.size} variants`);
}

// ---- A host heap to run the residual variants against.
const count = { loadFixed: 0, loadGeneric: 0, storeFixed: 0, addStatic: 0, setGeneric: 0, arithGeneric: 0,
  callResolved: 0, callGeneric: 0, variantMissing: 0 };
const host = {
  hostShapeOf: v => typeof v === 'number' ? -1 : v.shape,
  hostNew: (shape, capacity) => ({ shape, slots: new Array(capacity) }),
  hostLoad(ref, slot, key) {
    if (slot >= 0) { count.loadFixed++; return ref.slots[slot]; }
    count.loadGeneric++;
    return ref.slots[shapes[ref.shape].keys.indexOf(key)];
  },
  hostStore(ref, slot, value) { count.storeFixed++; ref.slots[slot] = value; },
  hostAdd(ref, shape, slot, value) { count.addStatic++; ref.shape = shape; ref.slots[slot] = value; },
  hostSetGeneric(ref, key, value) {
    count.setGeneric++;
    let slot = shapes[ref.shape].keys.indexOf(key);
    if (slot < 0) {
      const name = ref.shape + ':' + key;
      if (transitions[name] === undefined) {
        const parent = shapes[ref.shape];
        transitions[name] = shapes.push({ cls: parent.cls, keys: [...parent.keys, key] }) - 1;
      }
      ref.shape = transitions[name];
      slot = shapes[ref.shape].keys.length - 1;
    }
    ref.slots[slot] = value;
  },
  hostArith(op, a, b) { count.arithGeneric++; return op === '+' ? a + b : a < b ? 1 : 0; },
  hostNeedShape() {}, hostNeedExit() {}, hostExit() {},
  hostArg: (frame, i) => frame.args[i],
  hostThis: frame => frame.self,
  hostCall(code, variant, exact, name, ref, args) {
    if (code < 0) {
      count.callGeneric++;
      code = prog.classes[shapes[ref.shape].cls].methods[name];
      variant = 'dyn';
    } else count.callResolved++;
    let f = compiled.get(`${code}:${variant}:${exact}`);
    if (!f) { count.variantMissing++; f = compiled.get(`${code}:dyn:0`); }
    return f({ self: ref, args });
  },
};
const compiled = new Map();
for (const [key, residual] of residuals) {
  compiled.set(key, new Function(...Object.keys(host), residual + '\nreturn entry;')(...Object.values(host)));
}
let agree = true;
for (const n of [0, 1, 7, -2.5]) {
  const got = compiled.get('0:none:0')({ self: 0, args: [n] });
  if (got !== plain(n)) { agree = false; console.log(`MISMATCH n=${n}: residual ${got}, plain ${plain(n)}`); }
}
console.log('results agree with plain JavaScript on 4 inputs:', agree);
for (const key of Object.keys(count)) count[key] = 0;
compiled.get('0:none:0')({ self: 0, args: [7] });
console.log('one run of main(7):', JSON.stringify(count));

// ---- What the specializer left at each site, by variant.
const site = (text, re) => (text.match(re) || []).length;
console.log('\nvariant                         loads fixed/other  stores fixed  static adds  generic sets  calls literal/other  helpers left');
for (const [key, text] of [...residuals].sort()) {
  const [code, shape, exact] = key.split(':');
  const label = `${prog.functions[code].name} [${shape === 'dyn' || shape === 'none' ? shape : '{' + shapes[shape].keys + '}'}${exact === '1' ? ' exact' : ''}]`;
  console.log(label.padEnd(32) +
    `${site(text, /hostLoad\(\w+, \d+,/g)}/${site(text, /hostLoad\(/g) - site(text, /hostLoad\(\w+, \d+,/g)}`.padEnd(19) +
    String(site(text, /hostStore\(\w+, \d+,/g)).padEnd(14) + String(site(text, /hostAdd\(/g)).padEnd(13) +
    String(site(text, /hostSetGeneric\(/g)).padEnd(14) +
    `${site(text, /\b\w+\(\d+, \d+, [01], "/g)}/${site(text, /\b\w+\((?!\d)[^()]*?, [01], "/g)}`.padEnd(21) +
    site(text, /function __|__mk\d|\.value\)/g));
}
console.log('\nshapes:', shapes.map((s, i) => `${i}:${prog.functions[prog.classes[s.cls].ctor].name}{${s.keys}}`).join('  '));
console.log('constructor exit shapes:', JSON.stringify(exits));
