// inputs: [0, 2, 5]
// after: [globalThis.stored.reg[0] ? globalThis.stored.reg[0].factory() === globalThis.stored.get() : "none", globalThis.stored.get().v, globalThis.stored.list[0] === globalThis.stored.get()].join("|")
// An object stored into a runtime container (an indexed write, a push) is
// the runtime's from then on: it was copied while the specializer kept
// modeling the original, so a later use made a second object.
function main(n) {
  var modules = JSON.parse(n > 1 ? "{}" : '{"0":1}');
  function define(factory, id) {
    if (id in modules) return;
    modules[id] = { factory: factory };
  }
  var target = { v: n };
  define(function () { return target; }, 0);
  var list = JSON.parse("[]");
  list.push(target);
  target.v = n + 10;
  globalThis.stored = { reg: modules, list: list, get: function () { return target; } };
  return [list[0] === target, list[0].v].join("|");
}
