// inputs: [{"x": 1}, {"x": 2, "redefine": true}]
// A global the program redefines with `Object.defineProperty` is no
// plain binding: its value is not tracked, closed world or not.
var mode = function (x) { return "plain " + x; };
function main(v) {
  Object.hasOwn(v, "y");
  if (v.redefine) Object.defineProperty(globalThis, "mode", { value: function (x) { return "defined " + x; }, writable: true });
  return [mode(v.x), [v.x].map((x) => mode(x))];
}
