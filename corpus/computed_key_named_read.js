// inputs: [0, 3, "k"]
// forbid-main: defineProperty|\["g"\]|\.length
// A computed read whose key is known is the named read: a getter runs, a method is found up the prototype chain, an array's `length` and methods by string, a function's property.
function main(input) {
  var o = { get g() { return 7; }, plain: 1 };
  var keys = Object.keys(o);
  var proto = { m: function () { return this.plain + 1; } };
  var child = Object.create(proto);
  child.plain = 10;
  var name = "m";
  var arr = [1, 2, 3];
  function f() {}
  f.tag = "t";
  var prop = "ta" + "g";
  return [o[keys[0]], o["pla" + "in"], child[name](), arr["len" + "gth"], arr["jo" + "in"]("-"), f[prop], o["missing"], input];
}
