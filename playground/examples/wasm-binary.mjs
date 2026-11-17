// Real .wasm bytes compiled from experiments/wasm-binary/hash.c with clang.
// The binary decoder and instruction dispatch specialize away.
const bytes = [0,97,115,109,1,0,0,0,1,12,2,96,2,127,127,1,127,96,1,127,1,127,3,3,2,0,1,5,3,1,0,1,7,17,2,6,109,101,109,111,114,121,2,0,4,104,97,115,104,0,1,10,79,2,17,0,32,1,32,0,115,65,5,119,65,177,243,221,241,121,108,11,59,1,3,127,65,197,187,242,136,120,33,1,2,64,32,0,65,1,72,13,0,65,0,33,2,3,64,32,1,32,2,16,128,128,128,128,0,33,1,32,2,65,1,106,34,3,33,2,32,0,32,3,71,13,0,11,11,32,1,11];
const wasmModule = decode(bytes);
export function main(input) {
  return invoke(wasmModule, instantiate(wasmModule), wasmModule.exports.hash.index, [input.n | 0]);
}
