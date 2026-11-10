import { fromB, lateB, callA } from './b.mjs';
console.log('a runs; b says', fromB());
export function fromA() { return 'A'; }
export let lateA = 'lateA-initialized';
export function main(input) { return [fromB(), lateB, callA(), input * 2]; }
