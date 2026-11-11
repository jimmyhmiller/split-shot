// inputs: [1, 7]
// forbid-main: \?\.|\bopts\(|== null
// A read keyed by a fresh symbol (`Symbol(d)`'s) on a modeled object is
// undefined: no modeled property has such a key (a write of one takes the
// object out of the model), and no standard prototype has one. engine262's
// `hostDefined[kInternal]?.json` on a fresh options object.
const kInternal = Symbol('kInternal');
function opts(h = {}) { return { json: h[kInternal]?.json, allow: h[kInternal]?.allow }; }
function main(x) {
  const o = opts();
  const inherits = Object.create({ a: 1 });
  return [o.json, o.allow, inherits[kInternal], [x][kInternal], (() => x)[kInternal], typeof kInternal];
}
