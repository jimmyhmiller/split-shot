// Validate the exact playground files, in the UI's concatenation order,
// using the native engine and the third-projection semantic checks.
import { createServer } from 'vite';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({ root, server: { middlewareMode: true } });
const dir = mkdtempSync(join(tmpdir(), 'split-shot-playground-p3-'));
try {
  const { EXAMPLES } = await server.ssrLoadModule('/src/examples.js');
  const example = EXAMPLES.find(e => e.id === 'cogen-brainfuck');
  if (!example) throw new Error('Brainfuck third-projection example is missing');
  const source = join(dir, 'playground.mjs');
  writeFileSync(source, example.files.map(f => f.src).join('\n'));
  const result = spawnSync(process.execPath,
    [resolve(root, '../../experiments/third-projection/check-compiler.cjs')],
    { stdio: 'inherit', env: { ...process.env, P3: '1', SOURCE_FILE: source } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Third-projection check failed: ${result.status ?? result.signal}`);
} finally {
  await server.close();
  rmSync(dir, { recursive: true, force: true });
}
