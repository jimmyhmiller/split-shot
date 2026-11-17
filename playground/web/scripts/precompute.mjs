// Generate the complete saved result with the same WebAssembly API as the UI.
import { createServer } from 'vite';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { initSync, specialize } from '../src/pkg/partial_wasm.js';
const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({ root, server: { middlewareMode: true } });
try {
  const { EXAMPLES } = await server.ssrLoadModule('/src/examples.js');
  const example = EXAMPLES.find(e => e.id === 'cogen-brainfuck');
  const source = example.files.map(f => f.src).join('\n');
  initSync({ module: readFileSync(new URL('../src/pkg/partial_wasm_bg.wasm', import.meta.url)) });
  const start = performance.now();
  const r = specialize(source, 'main', 0, true, true);
  const result = { js: r.js, ir: r.ir, why: r.why, blocks: r.blocks, steps: r.steps, weight: r.weight, ms: performance.now() - start };
  r.free();
  const snapshot = { sourceHash: createHash('sha256').update(source).digest('hex'), sourceNames: true, result };
  const dir = new URL('../src/precomputed/', import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('cogen-brainfuck.json', dir), JSON.stringify(snapshot) + '\n');
  console.log(`Precomputed ${example.id}: ${result.blocks} blocks in ${(result.ms / 1000).toFixed(1)} s`);
} finally {
  await server.close();
}
