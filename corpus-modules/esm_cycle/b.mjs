import { fromA, lateA } from './a.mjs';
// b runs before a: a's function declarations already exist, its `let` does not
console.log('b runs; a hoisted:', fromA());
let tdz;
try { tdz = lateA; } catch (e) { tdz = e.name; }
console.log('b reading a.lateA:', tdz);
export function fromB() { return 'B'; }
export const lateB = 'lateB';
export function callA() { return fromA() + lateA; }
