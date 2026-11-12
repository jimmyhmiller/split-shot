const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const os = require('node:os');
const assert = require('node:assert/strict');
const {spawnSync, execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const specs = require('./patterns.cjs').filter(s => !process.env.REGEX_CASE || s.name === process.env.REGEX_CASE);
const root = path.resolve(__dirname, '../..');
const out = path.join(__dirname, 'generated');
const binary = path.join(root, 'target/release/js-frontend');
const specializationEnv = {PE_NO_SHARED_CONTEXTS: '1', PE_CONTEXT_POINTS: '1'};
const matcher = require('./matcher.cjs');
const parser = Object.values(matcher).map(fn => fn.toString()).join('\n\n');
const hash = value => createHash('sha256').update(value).digest('hex');
const median = values => [...values].sort((a,b) => a-b)[values.length >> 1];
function load(source, expression) {
  // Both variants use the same realm and builtins, each with isolated lexical scope.
  return vm.runInThisContext(`(function(){${source}\nreturn ${expression};})()`);
}
// Translate this tiny regex language into an independent native RegExp oracle.
// Use dotAll for Pike's dot and an absolute-end assertion for Pike's dollar.
function oracle(pattern) {
  let source = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '^' && i === 0) source += '^';
    else if (c === '$' && i === pattern.length - 1) source += '(?![\\s\\S])';
    else if (c === '.' || c === '*') source += c;
    else source += String.fromCharCode(92) + 'u' + c.charCodeAt(0).toString(16).padStart(4, '0');
  }
  return new RegExp(source, 's');
}
function verify(spec, generic, specialized) {
  const expected = oracle(spec.pattern);
  const inputs = [...spec.examples, ...spec.inputs, '', '\n', '\0', 'é', '😀'];
  // Exhaustive short strings exercise search, anchors and star backtracking.
  let layer = [''];
  for (let length = 1; length <= 5; length++) {
    layer = layer.flatMap(prefix => ['a', 'b', 'c', 'z', '\n'].map(c => prefix + c));
    inputs.push(...layer);
  }
  let state = 7321;
  const random = n => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state % n; };
  const alphabet = 'abcxyzneedl ?\n\0é';
  for (let i = 0; i < 2000; i++) {
    let text = '';
    const length = random(80);
    for (let j = 0; j < length; j++) text += alphabet[random(alphabet.length)];
    inputs.push(text);
    const original = spec.inputs[random(spec.inputs.length)];
    const pos = random(original.length + 1);
    inputs.push(original.slice(0, pos) + alphabet[random(alphabet.length)] + original.slice(pos + 1));
  }
  inputs.push('a' + 'b'.repeat(2048) + 'c', 'a' + 'x'.repeat(2048) + 'z');
  for (const input of [...inputs, ...inputs.slice().reverse()]) {
    assert.equal(generic(input), expected.test(input), `generic ${spec.name}: ${JSON.stringify(input)}`);
    assert.equal(specialized(input), expected.test(input), `residual ${spec.name}: ${JSON.stringify(input)}`);
  }
  return inputs.length * 2;
}
function measure(fn, inputs, rounds) {
  let checksum = 0;
  const start = process.hrtime.bigint();
  for (let r = 0; r < rounds; r++) for (let i = 0; i < inputs.length; i++) checksum += fn(inputs[i]) ? 1 : 0;
  return {ns: Number(process.hrtime.bigint() - start) / (rounds * inputs.length), checksum};
}
function worker() {
  return specs.map(spec => {
    const pattern = JSON.stringify(spec.pattern);
    const generic = load(parser + `\nconst pattern=${pattern};`, '(text => match(pattern, text))');
    const residual = fs.readFileSync(path.join(out, spec.name + '.residual.js'), 'utf8');
    const specialized = load(residual, 'main');
    const checks = verify(spec, generic, specialized);
    // Give both variants time to tier up before calibrating the common batch.
    for (const fn of [generic, specialized]) {
      const until = performance.now() + 250;
      do { measure(fn, spec.inputs, 100); } while (performance.now() < until);
    }
    const fastestNs = Math.min(
      measure(generic, spec.inputs, 300).ns,
      measure(specialized, spec.inputs, 300).ns,
    );
    const rounds = Math.max(100, Math.ceil(40e6 / (fastestNs * spec.inputs.length)));
    const samples = {generic: [], specialized: []};
    for (let i = 0; i < 15; i++) {
      for (const name of i % 2 ? ['specialized', 'generic'] : ['generic', 'specialized']) {
        const result = measure(name === 'generic' ? generic : specialized, spec.inputs, rounds);
        assert.equal(result.checksum, rounds * spec.inputs.filter(s => generic(s)).length);
        samples[name].push(result.ns);
      }
    }
    const genericNs = median(samples.generic), specializedNs = median(samples.specialized);
    return {name: spec.name, checks, rounds, genericNs, specializedNs, speedup: genericNs / specializedNs, samples};
  });
}
// Edge cases outside the timed patterns, including metacharacters that this
// small language treats literally. Native RegExp needs these escaped.
for (const pattern of ['', '^', '$', '^$', '.', '.*', 'a*', '^a*$', 'a$b', 'a^b', '[x]', 'a+b', 'é', '😀']) {
  const expected = oracle(pattern);
  for (const text of ['', 'a', 'aa', 'b', '\n', 'a\n', '\0', 'a$b', 'a^b', '[x]', 'a+b', 'é', '😀']) {
    assert.equal(matcher.match(pattern, text), expected.test(text), `${pattern}: ${JSON.stringify(text)}`);
  }
}
if (process.argv.includes('--worker')) {
  process.stdout.write(JSON.stringify(worker()));
} else {
  if (!process.argv.includes('--no-build')) {
    execFileSync('cargo', ['build', '-q', '--release', '-p', 'js-frontend', '--bin', 'js-frontend'], {cwd: root, stdio: ['ignore', 'pipe', 'pipe']});
  }
  fs.mkdirSync(out, {recursive: true});
  const builds = specs.map(spec => {
    const source = `function main(input) {\n${parser}\nconst pattern = ${JSON.stringify(spec.pattern)};\nreturn match(pattern, input);\n}\n`;
    const filename = path.join(out, spec.name + '.input.js');
    fs.writeFileSync(filename, source);
    const start = performance.now();
    const result = spawnSync(binary, ['--js', '--budget', '2M', filename], {env: {...process.env, ...specializationEnv}, encoding: 'utf8', timeout: 60000, maxBuffer: 32 * 1024 * 1024});
    fs.writeFileSync(path.join(out, spec.name + '.stderr.txt'), result.stderr || '');
    if (result.status !== 0) throw new Error(result.error?.message || result.stderr);
    const specializationMs = performance.now() - start;
    const residual = result.stdout.replace(/^---[^\n]*\n/, '');
    new vm.Script(residual);
    fs.writeFileSync(path.join(out, spec.name + '.residual.js'), residual);
    console.log(`${spec.name}: ${Buffer.byteLength(source)} -> ${Buffer.byteLength(residual)} bytes; ${specializationMs.toFixed(1)} ms specialization`);
    return {name: spec.name, pattern: spec.pattern, specializationMs, sourceSha256: hash(source), residualSha256: hash(residual), sourceBytes: Buffer.byteLength(source), residualBytes: Buffer.byteLength(residual)};
  });
  const processes = [];
  for (let i = 0; i < 3; i++) {
    processes.push(JSON.parse(execFileSync(process.execPath, [__filename, '--worker'], {encoding: 'utf8'})));
    console.log(`Verified and measured process ${i + 1}/3`);
  }
  const summary = specs.map((spec, i) => ({name: spec.name, genericNs: median(processes.map(p => p[i].genericNs)), specializedNs: median(processes.map(p => p[i].specializedNs)), speedup: median(processes.map(p => p[i].speedup)), speedupRange: processes.map(p => p[i].speedup), checksPerProcess: processes[0][i].checks}));
  const report = {date: new Date().toISOString(), node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0].model, specializationEnv, budget: '2M', gitHead: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(), compilerSha256: hash(fs.readFileSync(binary)), matcherSha256: hash(fs.readFileSync(path.join(__dirname, 'matcher.cjs'))), assemblySha256: hash(parser), patternsSha256: hash(fs.readFileSync(path.join(__dirname, 'patterns.cjs'))), runnerSha256: hash(fs.readFileSync(__filename)), builds, summary, processes};
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(report, null, 2) + '\n');
  console.table(summary);
}
