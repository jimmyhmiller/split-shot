// inputs: [0, 1]
// What lodash's getTag asks of standard instances folds: a well-known symbol
// in one (its prototype's), `Object.prototype.toString` of it, and a write
// of its prototype's read-only `@@toStringTag`, which fails.
var symToStringTag = Symbol.toStringTag;
var hasOwnProperty = Object.prototype.hasOwnProperty, nativeObjectToString = Object.prototype.toString;
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
  try { value[symToStringTag] = undefined; var unmasked = true; } catch (e) {}
  var result = nativeObjectToString.call(value);
  if (unmasked) { if (isOwn) value[symToStringTag] = tag; else delete value[symToStringTag]; }
  return result;
}
function baseGetTag(value) {
  if (value == null) return value === undefined ? "[object Undefined]" : "[object Null]";
  return (symToStringTag && symToStringTag in Object(value)) ? getRawTag(value) : nativeObjectToString.call(value);
}
var tags = [baseGetTag(new DataView(new ArrayBuffer(1))), baseGetTag(new Map()), baseGetTag(new Set()), baseGetTag(new WeakMap()), baseGetTag([]), baseGetTag(new Date(0)), baseGetTag(/x/)];
function main(i) { var m = new Map([[i, 1]]); return [tags, baseGetTag(m), m.size, Object.prototype.toString.call(m)]; }
