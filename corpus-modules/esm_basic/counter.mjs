export let count = 0;
export function bump(n) { count += n; return count; }
function helper(x) { return x * 10; }
export { helper as tenfold };
export default function () { return 'anon-default'; }
export class Box { constructor(v) { this.v = v; } get doubled() { return this.v * 2; } }
