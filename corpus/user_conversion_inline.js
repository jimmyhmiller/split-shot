// inputs: [1, "x", 0]
// forbid-main: valueOf\(|toPrimitive
// An operator over a known object whose conversion is the program's own code (`valueOf`, `toString`, `@@toPrimitive`) runs that code here, in the order and with the hint the operator gives: `+`, the arithmetic and relational ones, loose equality, templates, `String` and `Number`. With a runtime operand the operator stays the runtime's.
function main(input) {
  var log = [];
  var s = { toString() { log.push("s.ts"); return "a b"; } };
  var v = { valueOf() { log.push("v.vo"); return 7; }, toString() { log.push("v.ts"); return "seven"; } };
  var p = { [Symbol.toPrimitive](hint) { log.push("p:" + hint); return hint === "number" ? 3 : "three"; } };
  var both = { valueOf() { log.push("b.vo"); return {}; }, toString() { log.push("b.ts"); return "fallback"; } };
  class Money { constructor(n) { this.n = n; } valueOf() { return this.n; } toString() { return "$" + this.n; } }
  var m = new Money(5), k = new Money(8);
  var out = ["" + s, `${s}`, s + "!", v + 1, `${v}`, v * 2, -v, +v, v < 10, 10 > v, v == 7, v != 7, s == "a b", p + "", p * 2, `${p}`, both + "", m + k, m < k, `${m}`, m - 1, v & 3, v ** 2, v / 2, v % 4, ~v, v << 1, v >= 7, (v in { 7: 1 }), s === s, v == v, null == v, [1, s] + "", String(s), Number(v), input + v];
  return [out, log.join(",")];
}
