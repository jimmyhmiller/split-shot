// inputs: [{"a": 1, "c": 2}, {"a": -1, "c": 2, "swap": true}, {"a": 1, "c": -2, "key": "helper"}, {"a": 1, "c": 2, "key": "other"}]
// The closed world is the program's own code changing its globals: a global
// function `main` reassigns, by name or through the global object with a
// computed key, is runtime state after runtime code; one it leaves alone
// stays known. A function's properties stay the runtime's.
function helper(x) { return x >= 0; }
function steady(x) { return x * 2; }
var counter = { n: 0 };
function main(v) {
  const first = helper(v.a);
  Object.hasOwn(v, "b");
  if (v.swap) helper = function (x) { return "swapped " + x; };
  if (v.key) globalThis[v.key] = function (x) { return "keyed " + x; };
  counter.n++;
  steady.calls = (steady.calls || 0) + 1;
  return [first, helper(v.c), steady(v.c), [v.c].map((x) => helper(x) + "/" + steady(x) + "/" + steady.calls)];
}
