import { LRUCache } from "lru-cache";
// KNOWN: the cache's configuration. RUNTIME: what is asked of it; the cache
// lives across calls.
const cache = new LRUCache({ max: 3 });
let computed = 0;
export function main(input) {
  let v = cache.get(input);
  if (v === undefined) { computed++; v = String(input).toUpperCase(); cache.set(input, v); }
  return { v, computed, keys: [...cache.keys()], size: cache.size };
}
export const inputs = ["a", "b", "a", "c", "d", "é", "a", 5];
