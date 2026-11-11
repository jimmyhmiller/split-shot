// inputs: [{"x":1}, {"x":"q"}]
// forbid-main: getOwnPropertyDescriptor
// `Object.getOwnPropertyDescriptor` of a modeled array: its `length` (writable but when frozen, neither enumerable nor configurable), an element it has, a hole or a missing index (undefined), a named property of its own. The `gopd` package probes `$gOPD([], "length")` at load.
function main(input) {
  var a = [1, , 3]; a.tag = "t";
  var f = Object.freeze([7]);
  var d = function (o, k) { var r = Object.getOwnPropertyDescriptor(o, k); return r === undefined ? "none" : [r.value, r.writable, r.enumerable, r.configurable].join(","); };
  return [d([], "length"), d(a, "length"), d(a, 0), d(a, 1), d(a, "5"), d(a, "tag"), d(f, 0), d(f, "length"), d(a, "nope"), input.x];
}
