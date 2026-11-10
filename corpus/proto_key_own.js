// inputs: [0, 2, 5]
// after: [Object.prototype.hasOwnProperty.call(globalThis.protoKey, "__proto__"), Object.getPrototypeOf(globalThis.protoKey) === Object.prototype, globalThis.protoKey.__proto__ === Object.prototype].join("|")
// A computed `["__proto__"]` key is an own property (only a plain
// `__proto__: v` sets the prototype); materialized as a literal it must stay
// computed.
function main(n) {
  var o = { ["__proto__"]: "own" + n, a: 1 };
  var p = { __proto__: { inherited: n } };
  globalThis.protoKey = o;
  return [Object.prototype.hasOwnProperty.call(o, "__proto__"), Object.keys(o).join(","), p.inherited, Object.keys(p).length].join("|");
}
