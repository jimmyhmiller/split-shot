// Only the module state the calls change is runtime state: the frozen limits
// fold into `main`.
import { LIMITS, record, cached, history } from './store.mjs';
export function main(x) {
  const r = cached(x % 2);
  return [record(x), history(), r.name, r.id, LIMITS.step * LIMITS.max + x];
}
