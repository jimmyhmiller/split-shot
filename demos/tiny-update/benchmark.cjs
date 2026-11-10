// NODE_PATH=/path/to/node_modules node demos/tiny-update/benchmark.cjs
// Requires jsdom, installed outside the project like verify-dom.cjs.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');
async function main() {
  const { page, errors } = require('./dom-env.cjs').createPage();
  page.window.eval('codeWorkbench.destroy()');
  try {
    const api = page.window.eval('({ original: interpretedProgram, compiled: RelayDesk, run: benchmarkUI })');
    const results = await api.run({ document: page.window.document,
      original: api.original, compiled: api.compiled,
      now: () => performance.now(), pause: () => new Promise(resolve => setImmediate(resolve)) });
    assert.deepEqual(errors, []);
    const report = { measuredAt: new Date().toISOString(),
      environment: `Node ${process.version}, jsdom ${require('jsdom/package.json').version}, ${os.platform()} ${os.arch()}, ${os.cpus()[0].model}`,
      inputHash: createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'compiled.js'))).update(fs.readFileSync(path.join(__dirname, 'benchmark.js'))).digest('hex'),
      scope: 'Detached jsdom DOM API work including data preparation and keyed reconciliation; not browser layout/paint. 24 visible rows. Compilation, parsing, demo observers, and logging excluded.',
      results: JSON.parse(JSON.stringify(results)) };
    fs.writeFileSync(path.join(__dirname, 'benchmark-results.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(report.environment);
    console.log(report.scope);
    console.table(report.results.map(row => ({ operation: row.scenario, records: row.records,
      'original µs/op': row.originalUs.toFixed(2), 'generated µs/op': row.compiledUs.toFixed(2),
      speedup: row.speedup.toFixed(2) + '×', 'ops/sample': row.iterationsPerSample, samples: row.samples })));
  } finally { page.window.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
