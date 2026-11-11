// inputs: [0, 1, "x", null, [1, 2]]
// forbid-return: JSON\.stringify\((?!\{a: )
// JSON.stringify beyond plain data, folded by its self-hosted version (prelude.js `__pe_std_JSON_stringify`): a key list, indentation by number and by string, a replacer function, `toJSON`, a getter, skipped members (undefined, functions, symbol keys), array holes and non-finite numbers; and with a runtime value inside, where the call stays the runtime's and gives the same.
function main(input) {
  var o = { k: 1, s: "a\"b\n ", n: [1, 2, { z: null }], d: { toJSON: function (key) { return "J:" + key; } }, u: undefined, f: function () {} };
  var out = [];
  out.push(JSON.stringify(o, ["k", "n", "z", "k", 5]));
  out.push(JSON.stringify(o, null, 2));
  out.push(JSON.stringify(o, null, 40));
  out.push(JSON.stringify(o, function (k, v) { return typeof v === "number" ? v * 10 : v; }, "--"));
  out.push(JSON.stringify(o, function (k, v) { return k === "n" ? undefined : v; }, "0123456789abc"));
  out.push(JSON.stringify([undefined, function () {}, NaN, -0, 1e21, Infinity, , "😀"], null, "\t"));
  out.push(JSON.stringify({ get g() { return 7; }, [Symbol.iterator]: 1, 2: "two", b: true, 1: "one" }));
  out.push(JSON.stringify({ a: [], b: {}, c: [[]], d: { e: {} } }, null, 1));
  out.push(JSON.stringify("top"), JSON.stringify(undefined), JSON.stringify(null, null, 2), JSON.stringify(function () {}));
  var holder = { v: 1, toJSON: function () { return { seen: this.v, nested: [this.v] }; } };
  out.push(JSON.stringify({ h: holder }, null, ""));
  class P { constructor() { this.x = 1; this.y = [2]; } get hidden() { return 3; } }
  out.push(JSON.stringify(new P(), null, 1));
  // A runtime value inside: the runtime's call, the same answer.
  out.push(JSON.stringify({ a: input, b: [input] }, ["a", "b"], 1));
  out.push(JSON.stringify({ a: 1, t: { toJSON: function () { return input; } } }));
  return out;
}
