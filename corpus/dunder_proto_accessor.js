// inputs: [{"k":5}, {"k":"v"}]
// forbid: ERR_PROTO_ACCESS|\[\]\.__proto__
// forbid-main: getOwnPropertyDescriptor|typeof
// dunder-proto's probe folds: `[].__proto__` of a modeled array is `Array.prototype` (the standard `Object.prototype.__proto__` accessor, which gives `Object.getPrototypeOf`), unless something on the object's own chain defines `__proto__`. `Object.getOwnPropertyDescriptor(Object.prototype, "__proto__")` is its accessor descriptor, getter and setter standard functions, which runtime code then calls.
var h;
try { h = [].__proto__ === Array.prototype; } catch (e) { if (!e || typeof e !== "object" || e.code !== "ERR_PROTO_ACCESS") throw e; }
var desc = !!h && Object.getOwnPropertyDescriptor(Object.prototype, "__proto__");
var getD = desc && typeof desc.get === "function" ? Function.prototype.call.bind(desc.get) : null;
var setD = desc && typeof desc.set === "function" ? Function.prototype.call.bind(desc.set) : null;
var own = Object.defineProperty({}, "__proto__", { value: 7, enumerable: true });
var nul = Object.create(null);
var r = [h, typeof desc.get, typeof desc.set, ({}).__proto__ === Object.prototype, own.__proto__, nul.__proto__, desc.enumerable, desc.configurable];
function main(input) {
  var q = {};
  setD(q, input);
  return r.concat([getD(q) === input, q.k]);
}
