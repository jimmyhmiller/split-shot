// scratch verifier (not part of the POC): residual vs installed css-select
const fs = require('fs');
const load = (file) => new Function(fs.readFileSync(file, 'utf8') + '\nreturn main;')();
const residual = load(process.argv[2]);
const original = require('css-select').compile('article.card[data-status="published"] > a.cta[href^="/docs/"]:not([aria-disabled="true"])', { cacheResults: false });
const { Element, Text } = require('domhandler');
const element = (name, attribs, children = []) => { const node = new Element(name, attribs, children); children.forEach((child, i) => { child.parent = node; child.prev = children[i-1] || null; child.next = children[i+1] || null; }); return node; };
const inputs = Array.from({ length: 256 }, (_, i) => { const link = element(i % 7 === 0 ? 'span' : 'a', { class: i % 5 === 0 ? 'other' : 'cta', href: i % 3 === 0 ? '/other/' + i : '/docs/' + i, ...(i % 11 === 0 ? { 'aria-disabled': 'true' } : {}) }, [new Text('Open ' + i)]); element('article', { class: 'card', 'data-status': i % 4 === 0 ? 'draft' : 'published' }, [link]); return link; });
let ok = 0; for (const x of inputs) { if (original(x) !== residual(x)) { console.log('MISMATCH at', ok); process.exit(1); } ok++; }
const time = (f) => { let c = 0; for (let r = 0; r < 200; r++) for (const x of inputs) c += f(x) ? 1 : 0; const t = process.hrtime.bigint(); for (let r = 0; r < 2000; r++) for (const x of inputs) c += f(x) ? 1 : 0; return (Number(process.hrtime.bigint() - t) / (2000 * 256)).toFixed(1); };
console.log('verified', ok, 'installed', time(original), 'ns/op residual', time(residual), 'ns/op');
