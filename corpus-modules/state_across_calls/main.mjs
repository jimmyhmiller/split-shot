import { LIMITS, record, cached, history } from './store.mjs';
import counter from './counter.cjs';
export function main(x) {
  const r = cached(x % 2);
  return [record(x), history(), r.name, r.id, counter.next(), counter.scale(LIMITS.step) + x];
}
