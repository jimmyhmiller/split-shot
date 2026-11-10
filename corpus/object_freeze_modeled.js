// inputs: [0, 1, 2]
// forbid-return: freeze|seal|isFrozen|handler
// Object.freeze / seal / preventExtensions of a modeled object keep it
// modeled (engine262 freezes its Proxy handlers and tables): reads fold,
// writes that a frozen object refuses do nothing (sloppy) or throw
// (strict), and a frozen object made at runtime is frozen there.
function main(x) {
  const handler = Object.freeze({ __proto__: null, apply: x, kind: "h" });
  const sealed = Object.seal({ a: x, b: 2 });
  const fixed = Object.preventExtensions({ c: 3 });
  handler.kind = "changed";
  handler.extra = 1;
  sealed.a = x + 10;
  sealed.z = 9;
  delete sealed.b;
  fixed.c = 4;
  fixed.d = 5;
  let threw = 0;
  (function () {
    "use strict";
    const f = Object.freeze({ k: 1 });
    const n = Object.preventExtensions({});
    try { f.k = 2; } catch (e) { threw += 1; }
    try { n.e = 1; } catch (e) { threw += 10; }
    try { delete f.k; } catch (e) { threw += 100; }
  })();
  const out = [
    handler.kind, handler.extra, handler.apply, Object.isFrozen(handler), Object.isExtensible(handler),
    sealed.a, sealed.z, sealed.b, Object.isSealed(sealed), Object.isFrozen(sealed),
    fixed.c, fixed.d, Object.isExtensible(fixed), threw, Object.freeze(7),
  ];
  const list = Object.freeze(["a", "b", x]);
  list[0] = "changed";
  out.push(list[0], list.length, list.map((v) => v + "!").join(""), Object.isFrozen(list), list.indexOf("b"));
  function pushFrozen(l) {
    try { l.push(1); return "pushed"; } catch (e) { return e.name; }
  }
  out.push(pushFrozen(list), list.length);
  globalThis.__l = list;
  out.push(Object.isFrozen(globalThis.__l), globalThis.__l.length);
  globalThis.__h = handler;
  globalThis.__s = sealed;
  out.push(Object.isFrozen(globalThis.__h), Object.isSealed(globalThis.__s), Object.isExtensible(globalThis.__s));
  return out.join("|");
}
