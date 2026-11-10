// inputs: [1, 0]
// forbid-return: \.name|getOwnPropertyDescriptor
// A function's `name` as its definition made it folds: declarations,
// NamedEvaluation of anonymous functions and classes (a binding, an
// assignment, an object literal's key, a computed key, a symbol key), and
// what Object.getOwnPropertyDescriptor gives of an accessor. (A plain
// `x = () => {}` statement used to leave the arrow unnamed.)
function main(x) {
  function decl() {}
  const arrow = () => {};
  const fexpr = function () {};
  const named = function inner() {};
  let assigned; assigned = () => {};
  const obj = { m() {}, get g() { return 1; }, ["c" + "k"]: function () {}, a: () => {} };
  class K { static s() {} m() {} }
  const anon = (0, function () {});
  const cls = class {};
  const Bound = decl.bind(null);
  const desc = Object.getOwnPropertyDescriptor(obj, "g");
  const sym = { [Symbol.iterator]() {} };
  return [decl.name, arrow.name, fexpr.name, named.name, assigned.name, obj.m.name, desc.get.name, obj.ck.name, obj.a.name,
    K.name, K.s.name, new K().m.name, anon.name, cls.name, sym[Symbol.iterator].name, x].join("|");
}
