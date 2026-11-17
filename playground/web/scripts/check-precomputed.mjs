// Refuse to publish a saved result for different example source or settings.
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({ root, server: { middlewareMode: true } });
try {
  const { EXAMPLES } = await server.ssrLoadModule('/src/examples.js');
  const example = EXAMPLES.find(e => e.id === 'cogen-brainfuck');
  const snapshot = JSON.parse(readFileSync(new URL('../src/precomputed/cogen-brainfuck.json', import.meta.url), 'utf8'));
  const source = example.files.map(f => f.src).join('\n');
  assert.equal(snapshot.sourceHash, createHash('sha256').update(source).digest('hex'),
    'Saved source is stale. Run npm run precompute.');
  assert.equal(snapshot.sourceNames, true);
  assert.equal(snapshot.result.js, readFileSync(new URL('../../../experiments/third-projection/generated/brainfuck.compiler.mjs', import.meta.url), 'utf8'),
    'Saved compiler must match the semantically verified compiler.');
  assert.ok(snapshot.result.ir.length > 0);
  assert.ok(JSON.parse(snapshot.result.why).summary);
  console.log('Precomputed Brainfuck source, settings, and verified compiler match.');
} finally {
  await server.close();
}
