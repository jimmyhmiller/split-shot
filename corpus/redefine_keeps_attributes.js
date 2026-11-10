// inputs: [0, 1]
// Redefining an existing property keeps the attributes the new descriptor
// leaves out (they default to false only for a new property).
function main(n) {
  var o = typeof globalThis === "object" ? globalThis : {};
  var key = "__redef_probe" + n;
  Object.defineProperty(o, key, { value: 1, enumerable: true, configurable: true, writable: true });
  Object.defineProperty(o, key, { value: 2, enumerable: false });
  var d = Object.getOwnPropertyDescriptor(o, key);
  delete o[key];
  return [d.value, d.enumerable, d.configurable, d.writable].join(",");
}
