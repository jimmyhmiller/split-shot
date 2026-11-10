// a second module with the same top-level names as counter.mjs
function helper(x) { return x + 1; }
export let count = 100;
export const area = (r) => helper(r) * 3;
export class Box { static kind = 'shape'; }
export default class { hello() { return 'hi'; } }
