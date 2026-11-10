// Module state: evaluated once, when the program loads; every call of the
// entry sees what the calls before it left.
export const LIMITS = Object.freeze({ max: 3, step: 10 });
let calls = 0;
const seen = [];
const cache = new Map();
export class Registry {
  static #count = 0;
  constructor(name) { this.name = name; this.id = ++Registry.#count; }
}
export function record(x) {
  calls++;
  seen.push(x);
  if (seen.length > LIMITS.max) seen.shift();
  return calls;
}
export function cached(x) {
  if (!cache.has(x)) cache.set(x, new Registry("r" + x));
  return cache.get(x);
}
export function history() { return seen.join(","); }
