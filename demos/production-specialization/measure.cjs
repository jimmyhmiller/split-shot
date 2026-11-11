const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const runs = [];
const median = values => [...values].sort((a,b)=>a-b)[Math.floor(values.length / 2)];
for (let i = 0; i < 3; i++) {
  console.log(`\nFresh Node process ${i + 1}/3`);
  execFileSync(process.execPath, [path.join(__dirname, 'benchmark.cjs')], { cwd: __dirname, stdio: 'inherit' });
  runs.push(JSON.parse(fs.readFileSync(path.join(__dirname, 'results-single.json'), 'utf8')));
}
const summary = runs[0].results.map(first => {
  const cases = runs.map(run => run.results.find(result => result.name === first.name));
  if (!first.medianNs) return first;
  const ratios = cases.map(result => result.speedupVsInstalled);
  return {
    name: first.name, verifiedPerProcess: first.verified,
    medianNs: Object.fromEntries(Object.keys(first.medianNs).map(name => [name, median(cases.map(result => result.medianNs[name]))])),
    speedup: median(ratios), processSpeedups: ratios, minSpeedup: Math.min(...ratios), maxSpeedup: Math.max(...ratios),
    specializationMs: first.specializationMs, sourceSha256: first.sourceSha256, residualSha256: first.residualSha256,
  };
});
fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify({summary, runs}, null, 2) + '\n');
console.log('\nAcross three fresh processes:');
for (const row of summary) console.log(`${row.name}: ${row.speedup ? row.speedup.toFixed(2) + '× (' + row.minSpeedup.toFixed(2) + '–' + row.maxSpeedup.toFixed(2) + '×)' : 'blocked / incorrect'}`);
