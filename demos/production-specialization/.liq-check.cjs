// scratch verifier (not part of the POC): residual vs installed liquidjs
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync(__dirname + '/generated/manifest.json', 'utf8'));
const spec = manifest.cases.find((c) => c.name === 'liquidjs');
const load = (file) => new Function(fs.readFileSync(file, 'utf8') + '\nreturn main;')();
const residual = load(process.argv[2]);
const engine = new (require('liquidjs').Liquid)();
const tpl = engine.parse(spec.config.template);
const original = (input) => engine.renderSync(tpl, input);
const outcome = (f, x) => { try { return { v: f(x) }; } catch (e) { return { e: e.name + ': ' + e.message }; } };
const inputs = Array.from({ length: 256 }, (_, i) => ({ title: `Post <${i}> & news`, published: i % 3 !== 0, url: '/posts/' + i, label: i % 4 ? 'Open' : '' }));
const edge = [{}, { title: '<script>', published: false }, { title: '東京', published: true, label: null, url: '"&' }];
let ok = 0;
for (const x of [...inputs, ...edge]) { const a = JSON.stringify(outcome(original, x)), b = JSON.stringify(outcome(residual, x)); if (a !== b) { console.log('MISMATCH', ok, a.slice(0, 200), b.slice(0, 200)); process.exit(1); } ok++; }
const time = (f) => { let c = 0; for (let r = 0; r < 50; r++) for (const x of inputs) c += f(x).length; const t = process.hrtime.bigint(); for (let r = 0; r < 500; r++) for (const x of inputs) c += f(x).length; return (Number(process.hrtime.bigint() - t) / (500 * 256)).toFixed(1); };
console.log('verified', ok, 'installed', time(original), 'ns/op residual', time(residual), 'ns/op');
