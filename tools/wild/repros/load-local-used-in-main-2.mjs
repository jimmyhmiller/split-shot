// From query-string (stringify with fixed options). Cut down from the bundle
// by tools/wild/reduce.cjs. The same fault as load-local-used-in-main.mjs:
// the cell of the self-recursive `encode` is a local of the load block
// (`a = {}; a.value = __mk0(a)`), and `main` names it (`__mk5(h, h, ...)`).
//   original: main({"b":[1,2,3],"a":"x y"}) === "a=x%20y&b[]=1|2|3"
//   residual: ReferenceError: h is not defined
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var base_exports = {};
__export(base_exports, {
  stringify: () => stringify,
});
function encoderForArrayFormat(options) {
  const { arrayFormat } = options;
    const keyValueSeparator = arrayFormat === "bracket-separator" ? "[]=" : "=";
    return (key) => (result, value) => {
      const item = encodeArrayItem(value === null ? "" : value, options);
      if (result.length === 0) {
        result.push([encode(key, options), keyValueSeparator, item].join(""));
        return result;
      }
      result.push(item);
      return result;
    };
}
function encode(value, options) {
    try {
      return options.strict ? strictUriEncode(value) : encodeURIComponent(value);
    } catch {
      return encode(String(value).replaceAll(new RegExp("\\p{Surrogate}", "gv"), "\uFFFD"), options);
    }
}
function encodeArrayItem(value, options) {
  const stringValue = String(value);
  const { arrayFormatSeparator } = options;
  const percentEncodedSeparator = encodeURIComponent(arrayFormatSeparator);
  const encodedSeparator = percentEncodedSeparator === arrayFormatSeparator ? `%${arrayFormatSeparator.codePointAt(0).toString(16).toUpperCase().padStart(2, "0")}` : percentEncodedSeparator;
  return stringValue.split(arrayFormatSeparator).map((piece) => encode(piece, options)).join(encodedSeparator);
}
function stringify(object, options) {
  const formatter = encoderForArrayFormat(options);
  const objectCopy = {};
  for (const [key, value] of Object.entries(object)) {
    objectCopy[key] = value;
  }
  const keys = Object.keys(objectCopy);
    keys.sort(typeof options.sort === "function" ? options.sort : void 0);
  return keys.map((key) => {
    let value = objectCopy[key];
    if (Array.isArray(value)) {
      let processedArray = value;
      const result = processedArray.reduce(formatter(key), []);
      const arrayFormatSeparator = ["comma", "separator", "bracket-separator"].includes(options.arrayFormat) ? options.arrayFormatSeparator : "&";
      return result.join(arrayFormatSeparator);
    }
    const encodedValue = options.arrayFormat === "comma" || options.arrayFormat === "separator" ? encodeArrayItem(value, options) : encode(value, options);
    return encode(key, options) + "=" + encodedValue;
  }).filter((x) => x.length > 0).join("&");
}
var query_string_default = base_exports;
var OPTIONS = { arrayFormat: "bracket-separator", arrayFormatSeparator: "|", skipNull: true, skipEmptyString: true };
export function main(input) {
  return query_string_default.stringify(input, OPTIONS);
}
