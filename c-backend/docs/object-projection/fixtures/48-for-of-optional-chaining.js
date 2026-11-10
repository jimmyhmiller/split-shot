// @case {"description": "for-of over arrays and strings with fresh bindings per iteration, patterns, break and continue; optional chaining short-circuits the whole chain and keeps receivers; a method can be called through a computed key."}
function Counter() { this.n = 0; }
Counter.prototype.next = function (step) { this.n = this.n + step; return this.n; };
function main(x) {
  var sum = 0, text = "", closures = [], pairs = "";
  for (const item of [1, 2, x, 4]) { if (item === 2) continue; if (item === 4) break; sum = sum + item; }
  for (var c of "héy") text = c + text;
  for (let i of [10, 20, 30]) closures[closures.length] = () => i + x;
  for (const [key, { v }] of [["a", { v: 1 }], ["b", { v: x }]]) pairs = pairs + key + v;
  var grown = [1], visits = 0;
  for (var g of grown) { visits = visits + 1; if (grown.length < 4) grown[grown.length] = g + 1; }
  var holder = {}, last;
  for (holder.value of [7, 8]) last = holder.value;
  for (var outer of [[1, 2], [3]]) for (var inner of outer) sum = sum + inner * 100;
  var first = closures[0], third = closures[2];

  var deep = { a: { b: { c: x }, list: [5, 6], f: function (v) { return this.b.c + v; } }, n: null };
  var none = null, calls = 0;
  function tick() { calls = calls + 1; return 1; }
  var counter = new Counter(), method = "ne" + "xt", table = { double: v => v * 2, counter: counter };
  var chains = [deep?.a?.b?.c, deep.n?.b.c.d, none?.a, none?.[tick()], none?.f(tick()), deep.a?.list?.[1],
    deep.a.f?.(1), deep.a.missing?.(tick()), deep.missing?.f(tick()), deep?.a.f(2), deep.a?.["f"](3),
    typeof deep.zzz?.y, calls];
  var keyed = [counter[method](5), counter["next"](1), table["double"](x), table[x > 100 ? "double" : "double"](4), counter.n];
  return [sum, text, first(), third(), pairs, visits, grown, last, chains, keyed];
}
