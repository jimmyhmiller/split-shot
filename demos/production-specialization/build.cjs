const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');
const { execFileSync, spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const out = path.join(__dirname, 'generated');
fs.mkdirSync(out, { recursive: true });
const hash = text => createHash('sha256').update(text).digest('hex');

// Select complete declarations by AST span. Their bodies are copied verbatim;
// this exposes internal routing functions without loading HTTP/filesystem code.
function declarations(modulePath, names) {
  const filename = require.resolve(modulePath);
  const source = fs.readFileSync(filename, 'utf8');
  const ast = acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'script' });
  return names.map(name => {
    const node = ast.body.find(node =>
      (node.type === 'FunctionDeclaration' && node.id.name === name) ||
      (node.type === 'VariableDeclaration' && node.declarations.length === 1 && node.declarations[0].id.name === name));
    if (!node) throw new Error(`Missing declaration ${name} in ${filename}`);
    return source.slice(node.start, node.end);
  }).join('\n');
}

const nextMatcher = declarations('next/dist/shared/lib/router/utils/route-matcher', ['getRouteMatcher']);
const nextSafe = declarations('next/dist/shared/lib/router/utils/route-match-utils', ['safeRouteMatcher']);
const nextClean = declarations('next/dist/lib/route-pattern-normalizer', ['PARAM_SEPARATOR', 'stripParameterSeparators']);
const nextLibrary = `${nextClean}\nconst _routepatternnormalizer = {stripParameterSeparators};\n${nextSafe}\nconst _routematchutils = {safeRouteMatcher};\nconst _utils = host.nextUtils;\n${nextMatcher}`;
const { getRouteRegex } = require('next/dist/shared/lib/router/utils/route-regex');
const route = '/teams/[team]/projects/[project]/files/[...path]';
const routeRegex = getRouteRegex(route);
const nextProgram = `function main(input) {\n${nextLibrary}\nconst matcher = getRouteMatcher({re: ${routeRegex.re}, groups: ${JSON.stringify(routeRegex.groups)}});\nreturn matcher(input);\n}\n`;

const serveLibrary = declarations('serve-handler/src/index', ['sourceMatches', 'toTarget', 'applyRewrites']);
const rules = [
  { source: '/legacy/:slug', destination: '/articles/:slug' },
  { source: '/docs/:section/:page', destination: '/manual/:section/:page.html' },
  { source: '/user/:id', destination: '/profiles/:id.html' },
  { source: '/download/:file', destination: '/assets/:file' },
  { source: '/articles/:slug', destination: '/content/:slug.html' },
];
const serveProgram = `function main(input) {\nconst path = host.path;\nconst url = host.url;\nconst slasher = host.slasher;\nconst minimatch = host.minimatch;\nconst pathToRegExp = host.pathToRegExp;\n${serveLibrary}\nconst rules = ${JSON.stringify(rules)};\nreturn applyRewrites(input, rules);\n}\n`;
const canonicalLibrary = declarations('serve-handler/src/index', ['ensureSlashStart', 'shouldRedirect']);
const canonicalConfig = { redirects: [], trailingSlash: false };
const canonicalProgram = `function main(input) {\nconst path = host.path;\n${canonicalLibrary}\nreturn shouldRedirect(input, ${JSON.stringify(canonicalConfig)}, true);\n}\n`;

const specs = [
  { name: 'next-route', program: nextProgram, config: { route }, scope: 'Preconfigured Next.js getRouteMatcher, including safeRouteMatcher and parameter cleaning' },
  { name: 'serve-rewrites', program: serveProgram, config: { rules }, scope: 'serve-handler applyRewrites, sourceMatches and toTarget; real dependencies remain runtime calls' },
  { name: 'serve-canonical', program: canonicalProgram, config: canonicalConfig, scope: 'serve-handler shouldRedirect with clean URLs enabled and trailing slashes disabled; no configured redirects' },
];

const esbuild = require('esbuild');
function bundledProgram(source) {
  const bundle = esbuild.buildSync({ stdin: { contents: source, resolveDir: __dirname, sourcefile: 'entry.js' },
    bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2020',
    legalComments: 'inline', treeShaking: true }).outputFiles[0].text;
  const ast = acorn.parse(bundle, {ecmaVersion: 'latest', sourceType:'module'});
  const exports = ast.body.filter(node => node.type === 'ExportNamedDeclaration');
  assertExport(exports);
  const linked = exports.reduceRight((text,node) => text.slice(0,node.start) + text.slice(node.end), bundle);
  return `function main(input) {\n${linked}\nreturn run(input);\n}\n`;
}
function assertExport(exports) {
  if (exports.length !== 1 || exports[0].declaration || exports[0].specifiers.length !== 1 || exports[0].specifiers[0].local.name !== 'run') {
    throw new Error('Unexpected esbuild entry exports');
  }
}
const selector = 'article.card[data-status="published"] > a.cta[href^="/docs/"]:not([aria-disabled="true"])';
specs.push({ name: 'css-select', config: { selector },
  scope: 'css-select compile and predicate, fixed selector and cacheResults:false; baseline compiles once',
  program: bundledProgram(`import {compile} from 'css-select';\nexport function run(input) { return compile(${JSON.stringify(selector)}, {cacheResults:false})(input); }`) });
const tokens = require('css-what').parse(selector);
specs.push({ name: 'css-select-tokens', config: { selector, tokens },
  scope: 'css-select with build-time parsed selector tokens; installed baseline still compiles once',
  program: bundledProgram(`import {compile} from 'css-select';\nexport function run(input) { return compile(${JSON.stringify(tokens)}, {cacheResults:false})(input); }`) });
const template = '<article class="card"><h2>{{ title | escape }}</h2>{% if published %}<a href="{{ url | escape }}">{{ label | default: "Read more" | escape }}</a>{% else %}<span>Draft</span>{% endif %}</article>';
specs.push({ name: 'liquidjs', config: { template },
  scope: 'LiquidJS synchronous template rendering; baseline parses once',
  program: bundledProgram(`import {Liquid} from 'liquidjs';\nexport function run(input) { const engine = new Liquid(); const tpl=engine.parse(${JSON.stringify(template)}); return engine.renderSync(tpl,input); }`) });

execFileSync('cargo', ['build', '-q', '--release', '-p', 'js-frontend', '--bin', 'js-frontend'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
const binary = path.join(root, 'target/release/js-frontend');
const only = process.argv.find(arg => arg.startsWith('--case='))?.slice(7);
const previous = only && fs.existsSync(path.join(out, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8')).cases : [];
const manifest = { node: process.version, compilerSha256: hash(fs.readFileSync(binary)),
  gitCommit: execFileSync('git', ['rev-parse','HEAD'], {cwd:root,encoding:'utf8'}).trim(), cases: previous.filter(spec => spec.name !== only) };
for (const spec of specs) {
  const only = process.argv.find(arg => arg.startsWith('--case='))?.slice(7);
  if (only && spec.name !== only) continue;
  const inputFile = path.join(out, `${spec.name}.input.js`);
  fs.writeFileSync(inputFile, spec.program);
  const start = performance.now();
  const result = spawnSync(binary, ['--js', '--entry', 'main', '--budget', '2M', inputFile], {
    cwd: root, encoding: 'utf8', timeout: 60000, maxBuffer: 32 * 1024 * 1024,
  });
  const elapsedMs = performance.now() - start;
  const metadata = { name: spec.name, config: spec.config, scope: spec.scope, sourceSha256: hash(spec.program), specializationMs: elapsedMs };
  fs.writeFileSync(path.join(out, `${spec.name}.stderr.txt`), result.stderr || '');
  if (result.status !== 0) {
    const stale = path.join(out, `${spec.name}.residual.js`);
    if (fs.existsSync(stale)) fs.unlinkSync(stale);
    metadata.failure = result.error?.message || result.stderr;
    console.log(`${spec.name}: BLOCKED: ${metadata.failure.slice(0, 500)}`);
  } else {
    const residual = result.stdout.replace(/^---[^\n]*\n/, '');
    new vm.Script(residual);
    fs.writeFileSync(path.join(out, `${spec.name}.residual.js`), residual);
    metadata.residualSha256 = hash(residual);
    metadata.sourceBytes = Buffer.byteLength(spec.program);
    metadata.residualBytes = Buffer.byteLength(residual);
    console.log(`${spec.name}: ${metadata.sourceBytes} → ${metadata.residualBytes} bytes (${elapsedMs.toFixed(0)} ms)`);
  }
  manifest.cases.push(metadata);
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
