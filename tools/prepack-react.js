#!/usr/bin/env node
//
// Run prepack-revived's React fixtures (test/react) through partial-new and
// render both the original and the residual the way its own runner
// (test/react/setupReactTests.js) does: Babel's JSX/Flow transform, one
// realm for both, the original's getTrials() driving each through
// react-test-renderer, results compared after mergeAdjacentJSONTextNodes.
// Prepack's own output is made too, for comparison (sizes, createElement
// sites, functions).
//
//   node tools/prepack-react.js <prepack-revived> [--react] [--show] [--json out.json] [--dir fixtures] [filter...]
//
// `--react` specializes with React's model (see src/js/react.rs). `--show`
// prints each residual next to Prepack's. Status per fixture: PASS (renders
// as the original), WRONG, CRASH/UNSUPPORTED (the specializer failed),
// LOADERR (the residual failed to load), ORIG-ERR (the original itself does
// not run here: it needs a DOM, React Native, ...). `--dir` runs the
// fixtures of another directory laid out as test/react is (one folder per
// category): prepack-probes/test/react holds this repo's own.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const argv = process.argv.slice(2);
const PR = argv.shift();
if (!PR) {
  console.error('usage: node tools/prepack-react.js <prepack-revived> [--react] [--show] [--json out.json] [--dir fixtures] [filter...]');
  process.exit(2);
}
const BIN = path.resolve(__dirname, '../target/release/js-frontend');
const req = (m) => require(require.resolve(m, { paths: [PR] }));
let show = false, jsonOut = null, react = false, fixtures = null;
const filters = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--show') show = true;
  else if (argv[i] === '--json') jsonOut = argv[++i];
  else if (argv[i] === '--react') react = true;
  else if (argv[i] === '--dir') fixtures = path.resolve(argv[++i]);
  else filters.push(argv[i]);
}

const babel = req('babel-core');
const React = req('react');
const ReactDOM = req('react-dom');
const ReactDOMServer = req('react-dom/server');
const PropTypes = req('prop-types');
const ReactTestRenderer = req('react-test-renderer');
let ReactRelay = null, ReactNative = null;
try { ReactRelay = req('react-relay'); } catch (e) {}
const { mergeAdjacentJSONTextNodes } = require(path.join(PR, 'lib/utils/json.js'));
let prepackSources = null;
try { ({ prepackSources } = require(path.join(PR, 'lib/prepack-node.js'))); } catch (e) {}

function transpile(src) {
  return babel.transform(src, {
    configFile: false, babelrc: false,
    presets: [req('@babel/preset-flow')],
    plugins: [
      [req('@babel/plugin-proposal-object-rest-spread'), { loose: true, useBuiltIns: true }],
      [req('@babel/plugin-transform-react-jsx'), { useBuiltIns: true }],
    ],
  }).code;
}

function cxShim(...args) {
  const out = [];
  for (const a of args) {
    if (typeof a === 'string') out.push(a);
    else if (a && typeof a === 'object') for (const k of Object.keys(a)) if (a[k]) out.push(k);
  }
  return out.join(' ');
}
function MockURI(url) { this.url = url; }
MockURI.prototype.addQueryData = function () { this.url += '&queryData'; return this; };
MockURI.prototype.makeString = function () { return this.url; };
const babelHelpers = {
  inherits(sub, sup) { Object.assign(sub, sup); sub.prototype = Object.create(sup && sup.prototype); sub.prototype.constructor = sub; sub.__superConstructor__ = sup; return sup; },
  _extends: Object.assign, extends: Object.assign,
  objectWithoutProperties(obj, keys) { const t = {}; for (const i in obj) { if (!Object.prototype.hasOwnProperty.call(obj, i) || keys.indexOf(i) >= 0) continue; t[i] = obj[i]; } return t; },
  taggedTemplateLiteralLoose(s, raw) { s.raw = raw; return s; },
  bind: Function.prototype.bind,
};
function requireShim(name) {
  switch (name) {
    case 'React': case 'react': return React;
    case 'react-dom': case 'ReactDOM': return ReactDOM;
    case 'react-dom/server': case 'ReactDOMServer': return ReactDOMServer;
    case 'ReactNative': case 'react-native': if (!ReactNative) ReactNative = req('react-native'); return ReactNative;
    case 'PropTypes': case 'prop-types': return PropTypes;
    case 'RelayModern': return ReactRelay;
    case 'cx': return cxShim;
    case 'FBEnvironment': return {};
    case 'URI': return MockURI;
    default: throw new Error(`Unrecognized import: "${name}".`);
  }
}

// Load a (transpiled, JSX-free) program in a fresh context that has the
// runner's globals; `entry` (if given) is then called. Returns module.exports.
// As in Prepack's runner, the original and the residual share one realm
// (its global object), so the original's getTrials can drive both.
// (No `__optimizeReactComponentTree`: as in Prepack's runner, the original
// runs as it does unoptimized, `this.__optimizeReactComponentTree`
// undefined; the residual has the specializer's answer.)
function newRealm() {
  return vm.createContext({
    require: requireShim, babelHelpers, cx: cxShim, console,
  });
}
function load(ctx, code, entry) {
  const module = { exports: null };
  ctx.module = module;
  vm.runInContext(code, ctx, { timeout: 5000 });
  if (entry) vm.runInContext(entry + '()', ctx, { timeout: 5000 });
  return module.exports;
}

function trials(mod, other) {
  const r = ReactTestRenderer.create(null, { createNodeMock: (x) => x });
  return other.getTrials(r, mod, undefined, false);
}
// `firstRenderOnly`: as Prepack's runner (setupReactTests.js), a tree
// rendered once is compared without its functions (event handlers a server
// does not render).
function compare(A, B, firstRenderOnly) {
  const util = require('util');
  const ra = trials(A, A), rb = trials(B, A);
  for (let i = 0; i < ra.length; i++) {
    const [na, va] = ra[i], [nb, vb] = rb[i];
    const ma = typeof va === 'string' ? va : mergeAdjacentJSONTextNodes(va, firstRenderOnly);
    const mb = typeof vb === 'string' ? vb : mergeAdjacentJSONTextNodes(vb, firstRenderOnly);
    if (na !== nb || !util.isDeepStrictEqual(JSON.parse(JSON.stringify(ma, cyc())), JSON.parse(JSON.stringify(mb, cyc())))) {
      if (process.env.FULL) console.error('EXPECTED', util.inspect(ma, { depth: 20 }), '\nGOT', util.inspect(mb, { depth: 20 }));
      return `trial ${i} "${na}" differs`;
    }
  }
  return null;
}
// JSON replacer that writes a back-reference for cycles, so cyclic props compare structurally.
function cyc() {
  const stack = [];
  return function (k, v) {
    if (v && typeof v === 'object') {
      while (stack.length && stack[stack.length - 1] !== this) stack.pop();
      const at = stack.indexOf(v);
      if (at >= 0) return '[cycle ' + (stack.length - at) + ']';
      stack.push(v);
    }
    return v;
  };
}
function countCalls(code, re) { return (code.match(re) || []).length; }

const dir = fixtures || path.join(PR, 'test/react');
const files = [];
for (const sub of fs.readdirSync(dir)) {
  const p = path.join(dir, sub);
  if (!fs.statSync(p).isDirectory() || sub.startsWith('__')) continue;
  for (const f of fs.readdirSync(p)) if (f.endsWith('.js')) files.push(path.join(sub, f));
}
files.sort();
const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'ppreact-'));
const results = [];
for (const rel of files) {
  if (filters.length && !filters.some((f) => rel.includes(f))) continue;
  const raw = fs.readFileSync(path.join(dir, rel), 'utf8');
  let js;
  try { js = transpile(raw); } catch (e) { results.push({ rel, status: 'BABEL', detail: e.message.split('\n')[0] }); continue; }
  // As setupReactTests.runSource: `global` is the global object, the test in an IIFE.
  const program = `var global = this;\n(function () {\n${js}\n})();\n`;
  let A;
  const realm = newRealm();
  try { A = load(realm, program); } catch (e) { results.push({ rel, status: 'ORIG-ERR', detail: String(e).slice(0, 100) }); continue; }

  const wfile = path.join(tmp, rel.replace(/\//g, '__'));
  fs.writeFileSync(wfile, program + 'function __pe_entry() {}\n');
  const t0 = Date.now();
  const r = spawnSync(BIN, ['--js', '--prepack-intrinsics', '--closed-script', ...(react ? ['--react'] : []), '--entry', '__pe_entry', wfile], { encoding: 'utf8', timeout: 60000 });
  const ms = Date.now() - t0;
  if (r.status !== 0) {
    const last = (r.stderr || String(r.error)).trim().split('\n').filter((l) => l && !l.startsWith('note:')).pop();
    results.push({ rel, status: /panicked/.test(r.stderr) ? 'CRASH' : 'UNSUPPORTED', detail: (last || '').slice(0, 140), ms });
    continue;
  }
  const residual = r.stdout.replace(/^--- residual as JavaScript.*\n/, '');
  fs.writeFileSync(wfile.replace(/\.js$/, '.pn.js'), residual);

  let pp = null;
  if (prepackSources) {
    try {
      const ser = prepackSources([{ filePath: '', fileContents: `(function() {\n${js}\n})()`, sourceMapContents: '' }], {
        errorHandler: (d) => (d.severity !== 'Warning' && d.severity !== 'Information' && d.errorCode !== 'PP0025' ? 'Fail' : 'Recover'),
        compatibility: 'fb-www', serialize: true, uniqueSuffix: '', maxStackDepth: 100, reactEnabled: true,
        reactOutput: 'create-element', reactOptimizeNestedFunctions: true, arrayNestedOptimizedFunctionsEnabled: true,
        inlineExpressions: true, invariantLevel: 0, stripFlow: true,
      });
      pp = ser.code;
      fs.writeFileSync(wfile.replace(/\.js$/, '.prepack.js'), pp);
    } catch (e) { pp = null; }
  }

  let B, status = 'PASS', detail = '';
  try { B = load(realm, residual, '__pe_entry'); } catch (e) { status = 'LOADERR'; detail = String(e).slice(0, 120); }
  if (status === 'PASS') {
    if (typeof A !== typeof B) { status = 'WRONG'; detail = `exports ${typeof A} vs ${typeof B}`; }
    else if (A != null && typeof A.getTrials === 'function') {
      let ea = null, eb = null, d = null;
      try { trials(A, A); } catch (e) { ea = String(e); }
      // (Both throwing alike passes, but compares no trial: said so.)
      if (ea) { try { trials(B, A); } catch (e) { eb = String(e); } d = ea === eb ? null : `orig threw ${ea.slice(0, 60)}, residual ${eb ? 'threw ' + eb.slice(0, 60) : 'did not'}`; if (!d) detail = `both threw: ${ea.slice(0, 60)}`; }
      else { try { d = compare(A, B, /firstRenderOnly:\s*true/.test(raw)); } catch (e) { d = 'residual threw: ' + String(e).slice(0, 100); } }
      if (d) { status = 'WRONG'; detail = d; }
    } else if (A == null) detail = '(no exports: compile-only)';
  }
  const ce = /\bcreateElement\b/g;
  const fnDefs = (c) => countCalls(c, /\bfunction\b/g);
  results.push({
    rel, status, detail, ms,
    sizes: { orig: js.length, ours: residual.length, prepack: pp ? pp.length : null },
    createElement: { orig: countCalls(js, ce), ours: countCalls(residual, ce), prepack: pp ? countCalls(pp, ce) : null },
    fns: { orig: fnDefs(js), ours: fnDefs(residual), prepack: pp ? fnDefs(pp) : null },
  });
  if (show) {
    console.log(`==== ${rel} (${status}) ====\n--- partial-new:\n${residual}\n--- prepack:\n${pp}\n`);
  }
}
const counts = {};
for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
for (const r of results) {
  const s = r.sizes ? ` size o/us/pp ${r.sizes.orig}/${r.sizes.ours}/${r.sizes.prepack}  createElement ${r.createElement.orig}/${r.createElement.ours}/${r.createElement.prepack}  fns ${r.fns.orig}/${r.fns.ours}/${r.fns.prepack}` : '';
  console.log(`${r.status.padEnd(11)} ${r.rel.padEnd(52)}${s} ${r.detail || ''}`);
}
console.log(JSON.stringify(counts));
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(results, null, 2));
console.error('residuals in', tmp);
