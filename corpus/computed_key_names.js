// inputs: [0, 2, 5]
// An anonymous function under a computed key is named after the key
// (SetFunctionName: the key converted once, `[description]` for a symbol,
// `get `/`set ` for accessors), in object literals, classes and fields.
function main(n) {
  const k = n > 1 ? "f" : "g";
  const s = Symbol("desc");
  const anon = Symbol();
  let conversions = 0;
  const keyObj = { toString() { conversions++; return "obj" + n; } };
  const o = {
    [k]: function () {},
    [k + "2"]: () => 1,
    ["lit"]: function () {},
    [s]: function () {},
    [anon]: () => 0,
    get [k + "g"]() { return 1; },
    [keyObj]: function () {},
    plain: function () {},
    named: function own() {},
  };
  class C { [k]() {} static [k + "s"]() {} [s]() {} [k + "f"] = () => 2; }
  const c = new C();
  const getter = Object.getOwnPropertyDescriptor(o, k + "g").get;
  return [o[k].name, o[k + "2"].name, o.lit.name, o[s].name, o[anon].name, getter.name, o["obj" + n].name, conversions, o.plain.name, o.named.name,
          C.prototype[k].name, C[k + "s"].name, C.prototype[s].name, c[k + "f"].name].join("|");
}
