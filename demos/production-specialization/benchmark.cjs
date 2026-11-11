const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const Module = require('node:module');
const os = require('node:os');
const { createHash } = require('node:crypto');
const out = path.join(__dirname, 'generated');
const hash = text => createHash('sha256').update(text).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
const serveRequire = Module.createRequire(require.resolve('serve-handler'));
const host = {
  nextUtils: require('next/dist/shared/lib/utils'),
  path: require('node:path'), url: require('node:url'),
  slasher: serveRequire('./glob-slash'), minimatch: serveRequire('minimatch'), pathToRegExp: serveRequire('path-to-regexp'),
};

// Load the installed module unchanged, only appending access to its internal
// function. This oracle includes the real module's lexical dependencies.
function serveOracle() {
  const filename = require.resolve('serve-handler');
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(fs.readFileSync(filename, 'utf8') + '\nmodule.exports.poc = {applyRewrites, shouldRedirect};\n', filename);
  return mod.exports.poc;
}
function outcome(fn, input) {
  try { return { value: fn(input) }; }
  catch (error) { return { error: { name: error.name, message: error.message } }; }
}
function load(code) { return new Function('host', code + '\nreturn main;')(host); }
function median(values) { const sorted = [...values].sort((a,b) => a-b); return sorted[Math.floor(sorted.length / 2)]; }
let sink = 0;
function makeBatch(fn, inputs, consume, label) {
  // Separate compiled call sites avoid timing a shared polymorphic harness.
  return new Function('fn', 'inputs', 'consume', `// ${label}\nreturn function(iterations) {
    let checksum = 0;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) checksum += consume(fn(inputs[i % inputs.length]));
    return {ms: performance.now() - start, checksum};
  };`)(fn, inputs, consume);
}

const report = {
  measuredAt: new Date().toISOString(), node: process.version,
  platform: `${os.platform()} ${os.release()} ${os.arch()}`, cpu: os.cpus()[0].model,
  compilerSha256: manifest.compilerSha256,
  benchmarkSha256: hash(fs.readFileSync(__filename)), lockSha256: hash(fs.readFileSync(path.join(__dirname, 'package-lock.json'))),
  method: 'Installed, preconfigured upstream oracle vs unchanged source assembly vs PE residual. Same realm; separate monomorphic timing loops; common calibrated batch; 5 warmup batches; 15 rotating-order samples; median ns/op. Setup and specialization excluded. Checksum consumption included.',
  results: [],
};
for (const spec of manifest.cases) {
  const only = process.argv.find(arg => arg.startsWith('--case='))?.slice(7);
  if (only && spec.name !== only) continue;
  if (spec.failure) { report.results.push({ name: spec.name, blocked: spec.failure }); continue; }
  const source = fs.readFileSync(path.join(out, `${spec.name}.input.js`), 'utf8');
  const residual = fs.readFileSync(path.join(out, `${spec.name}.residual.js`), 'utf8');
  assert.equal(hash(source), spec.sourceSha256);
  assert.equal(hash(residual), spec.residualSha256);
  const assembled = load(source), specialized = load(residual);
  let original, inputs, edgeCases, consume;
  if (spec.name === 'next-route') {
    original = require('next/dist/shared/lib/router/utils/route-matcher').getRouteMatcher(
      require('next/dist/shared/lib/router/utils/route-regex').getRouteRegex(spec.config.route));
    inputs = Array.from({ length: 256 }, (_, i) => i % 5 === 0 ? `/unmatched/${i}` :
      `/teams/team${i % 17}/projects/project${i}/files/${i % 3 === 0 ? 'src/lib/' : ''}file%20${i}.js`);
    edgeCases = ['', '/', '/teams/a/projects/b/files', '/teams/a/projects/b/files/',
      '/teams/a/projects/b/files/%', '/teams/%E0%A4%A/projects/b/files/a',
      '/teams/a/projects/b/files/%2F', '/teams/a/projects/b/files/a/',
      '/teams/_NEXTSEP_a/projects/b/files/_NEXTSEP_x/y',
      '/teams/東京/projects/é/files/😀.txt', '/teams/a/projects/b/files/a?x=1'];
    consume = value => value === false ? 0 : value.team.length + value.project.length + value.path.length;
  } else if (spec.name === 'serve-rewrites') {
    const apply = serveOracle().applyRewrites;
    original = input => apply(input, spec.config.rules);
    const paths = ['/legacy/post-', '/docs/api/page-', '/user/id-', '/download/file-', '/articles/post-', '/unmatched/'];
    inputs = Array.from({ length: 256 }, (_, i) => paths[i % paths.length] + i);
    edgeCases = ['', '/', '/legacy/', '/legacy/a/b', '/legacy/a%20b', '/user/a%2Fb',
      '/legacy/%', '/docs/api/a?b=1', '/user/東京', '/download/a#b', '/articles/x.html', '/user/../legacy/a'];
    consume = value => value === null ? 0 : value.length;
  } else if (spec.name === 'serve-canonical') {
    const redirect = serveOracle().shouldRedirect;
    original = input => redirect(input, spec.config, true);
    const paths = ['/docs/page-', '/docs/page-', '/docs/page-', '/assets/app-', '/docs//section-', '/docs/'];
    const suffixes = ['.html', '/index', '/', '.js', '/', ''];
    inputs = Array.from({ length: 256 }, (_,i) => paths[i % paths.length] + i + suffixes[i % suffixes.length]);
    edgeCases = ['', '/', '/index', '/index.html', '//index', '/a//b/', '/.well-known/', '/a.html/', '/a.HTML', '/東京.html', '/a/index.html'];
    consume = value => value === null ? 0 : value.target.length + value.statusCode;
  } else if (spec.name === 'css-select' || spec.name === 'css-select-tokens') {
    original = require('css-select').compile(spec.config.selector, { cacheResults: false });
    const { Element, Text } = require('domhandler');
    const element = (name, attribs, children = []) => {
      const node = new Element(name, attribs, children);
      children.forEach((child, i) => { child.parent = node; child.prev = children[i-1] || null; child.next = children[i+1] || null; });
      return node;
    };
    inputs = Array.from({ length: 256 }, (_, i) => {
      const link = element(i % 7 === 0 ? 'span' : 'a', {
        class: i % 5 === 0 ? 'other' : 'cta', href: i % 3 === 0 ? '/other/' + i : '/docs/' + i,
        ...(i % 11 === 0 ? { 'aria-disabled': 'true' } : {}),
      }, [new Text('Open ' + i)]);
      element('article', { class: 'card', 'data-status': i % 4 === 0 ? 'draft' : 'published' }, [link]);
      return link;
    });
    edgeCases = [new Text('not an element'), element('a', {}), element('a', { class: 'cta', href: '/docs/x' })];
    consume = value => Number(value);
  } else if (spec.name === 'liquidjs') {
    const engine = new (require('liquidjs').Liquid)();
    const tpl = engine.parse(spec.config.template);
    original = input => engine.renderSync(tpl, input);
    inputs = Array.from({ length: 256 }, (_, i) => ({ title: `Post <${i}> & news`, published: i % 3 !== 0, url: '/posts/' + i, label: i % 4 ? 'Open' : '' }));
    edgeCases = [{}, { title: '<script>', published: false }, { title: '東京', published: true, label: null, url: '"&' }];
    consume = value => value.length;
  } else throw new Error(`Unknown case ${spec.name}`);

  let verified = 0, failure;
  for (const input of [...inputs, ...edgeCases, ...inputs.slice().reverse()]) {
    const expected = outcome(original, input);
    try {
      assert.deepEqual(outcome(assembled, input), expected, `${spec.name}: source extraction, case ${verified}`);
      assert.deepEqual(outcome(specialized, input), expected, `${spec.name}: residual, case ${verified}`);
    } catch (error) {
      failure = { caseIndex: verified, expected, assembled: outcome(assembled, input), residual: outcome(specialized, input) };
      break;
    }
    verified++;
  }
  if (failure) {
    report.results.push({name: spec.name, correctnessFailure: failure, sourceSha256: spec.sourceSha256, residualSha256: spec.residualSha256});
    console.log(`${spec.name}: INCORRECT; ${JSON.stringify(failure)}`);
    continue;
  }
  console.log(`${spec.name}: verified ${verified} calls, including exceptions`);
  const variants = { original, assembled, specialized };
  const runners = Object.fromEntries(Object.entries(variants).map(([name, fn]) => [name, makeBatch(fn, inputs, consume, `${spec.name}/${name}`)]));
  const batch = (name, iterations) => { const result = runners[name](iterations); sink ^= result.checksum; return result.ms; };
  let iterations = 256;
  while (iterations < 1048576 && batch('original', iterations) < 50) iterations *= 2;
  for (let warmup = 0; warmup < 5; warmup++) for (const name of Object.keys(variants)) batch(name, iterations);
  const samples = { original: [], assembled: [], specialized: [] };
  for (let sample = 0; sample < 15; sample++) {
    const names = ['original', 'assembled', 'specialized'];
    const order = [...names.slice(sample % 3), ...names.slice(0, sample % 3)];
    for (const name of order) samples[name].push(batch(name, iterations) * 1e6 / iterations);
  }
  const ns = Object.fromEntries(Object.entries(samples).map(([name, values]) => [name, median(values)]));
  const result = { name: spec.name, verified, inputs: inputs.length, iterationsPerSample: iterations, medianNs: ns,
    speedupVsInstalled: ns.original / ns.specialized, speedupVsAssembly: ns.assembled / ns.specialized,
    specializationMs: spec.specializationMs, sourceSha256: spec.sourceSha256, residualSha256: spec.residualSha256, samplesNs: samples };
  report.results.push(result);
  console.log(`${spec.name}: installed ${ns.original.toFixed(0)}, assembly ${ns.assembled.toFixed(0)}, residual ${ns.specialized.toFixed(0)} ns/op; ${(ns.original / ns.specialized).toFixed(2)}× vs installed`);
}
report.checksum = sink;
fs.writeFileSync(path.join(__dirname, 'results-single.json'), JSON.stringify(report, null, 2) + '\n');
