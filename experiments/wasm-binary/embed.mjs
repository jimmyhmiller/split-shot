import {readFileSync, writeFileSync} from 'node:fs';
const bytes = readFileSync(new URL('hash.wasm',import.meta.url));
writeFileSync(new URL('../../playground/examples/wasm-binary.mjs',import.meta.url), `// Real .wasm bytes compiled from experiments/wasm-binary/hash.c with clang.
// The binary decoder and instruction dispatch specialize away.
const bytes = ${JSON.stringify([...bytes])};
const wasmModule = decode(bytes);
export function main(input) {
  return invoke(wasmModule, instantiate(wasmModule), wasmModule.exports.hash.index, [input.n | 0]);
}
`);
