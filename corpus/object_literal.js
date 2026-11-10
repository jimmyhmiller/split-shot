// inputs: [0, 1, 7]
// Object literals with methods, accessors, computed keys, spread and __proto__.
function main(n) {
  var base = { greet() { return "hi " + this.name; } };
  var k = "dyn" + (n % 3);
  var o = {
    __proto__: base,
    name: "o" + n,
    get upper() { return this.name.toUpperCase(); },
    set rename(v) { this.name = v; },
    [k]: n * 2,
    ...{ extra: true, count: n },
  };
  var before = o.greet();
  o.rename = "z";
  return [before, o.greet(), o.upper, o[k], o.extra, o.count, Object.keys(o).join(","), "greet" in o, o.hasOwnProperty("greet")];
}
