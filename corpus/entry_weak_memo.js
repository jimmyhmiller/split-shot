// inputs: [3, 4]
// forbid-main: memo
// A WeakMap of the top-level code given an entry for an object a call makes:
// no later call reaches that object, so the map stays as the code left it
// and each call folds. (`keyed`, whose key is the module's own object, is
// changed by each call: the next sees the last value. After its runtime
// calls the script's globals are not known: runtime code may change them.)
const memo = new WeakMap();
const key = {};
const keyed = new WeakMap();
function main(x) {
  const o = { x };
  memo.set(o, x * 2);
  const doubled = memo.get(o);
  const prev = keyed.has(key) ? keyed.get(key) : -1;
  keyed.set(key, x);
  return [doubled, prev];
}
