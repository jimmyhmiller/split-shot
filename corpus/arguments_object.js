// inputs: [0, 2, 5]
// after: [globalThis.argFns.wr(n => n, 1, 2), globalThis.argFns.ident(3), globalThis.argFns.kind(4), globalThis.argFns.mapped(7, 8), globalThis.argFns.strictArgs(1)].join("|")
// The arguments object: a distinct object (not an Array: [object Arguments],
// no map, Array.isArray false), one identity per call, writes stick,
// callee is the function (sloppy) or a throwing accessor (strict), and in a
// sloppy function with simple parameters its elements alias the parameters.
function main(n) {
  function wr() { arguments[0] = n + 5; return arguments[0] + arguments.length; }
  function ident() { return arguments === arguments; }
  function kind() {
    return [Object.prototype.toString.call(arguments), Array.isArray(arguments), typeof arguments.map,
            arguments.callee === kind, Object.keys(arguments).join(","), JSON.stringify(arguments),
            Array.prototype.slice.call(arguments).length, [...arguments].join(",")].join(";");
  }
  function mapped(a, b) { a = a + n; arguments[1] = 100; return [a, arguments[0], b, arguments.length].join(","); }
  function unmappedExtra(a) { var r = []; r.push(a); arguments[0] = 9; r.push(a); a = 3; r.push(arguments[0]); return r.join(","); }
  function strictArgs(a) { "use strict"; a = 5; var t; try { arguments.callee; t = "no"; } catch (e) { t = e instanceof TypeError; } return [arguments[0], t].join(","); }
  function short(a, b) { b = 4; return [arguments.length, arguments[1], b].join(","); }
  function returned() { return arguments; }
  var held = returned(n, "x");
  globalThis.argFns = { wr, ident, kind, mapped, strictArgs };
  return [wr(1), ident(), kind(n, 2), mapped(1, 2), unmappedExtra(n), strictArgs(1), short(1),
          Object.prototype.toString.call(held), held.length, held[0], held.callee === returned, Array.isArray(held)].join("|");
}
