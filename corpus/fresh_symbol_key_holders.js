// inputs: [1, 7]
// Reads keyed by a fresh symbol on objects that do hold one, set every way
// the language has (a write, a literal's computed key, a class's computed
// accessor, defineProperty, assign, an inherited one): each finds it.
const kInternal = Symbol('kInternal');
const other = Symbol('other');
function opts(h = {}) { return { json: h[kInternal]?.json, allow: h[kInternal]?.allow }; }
// Objects that do hold a fresh-symbol key, set every way the language has.
const base = {}; base[kInternal] = { json: 'base' };
const child = Object.create(base);
const lit = { [kInternal]: { json: 'lit' } };
class C { get [kInternal]() { return { json: 'getter' }; } }
const viaDefine = Object.defineProperty({}, kInternal, { value: { json: 'define' } });
const viaAssign = Object.assign({}, lit);
function main(x) {
  const o = opts();
  const p = opts(x > 3 ? lit : {});
  const fresh = {};
  fresh[other] = x;
  return [
    o.json, o.allow, p.json, fresh[kInternal], fresh[other],
    child[kInternal].json, lit[kInternal].json, new C()[kInternal].json,
    viaDefine[kInternal].json, viaAssign[kInternal].json,
    typeof kInternal, kInternal in {}, Object.getOwnPropertySymbols(lit).length,
  ];
}
