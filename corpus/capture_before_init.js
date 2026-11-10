// inputs: [0, 2]
// after: globalThis.first() + "," + globalThis.loopFns.map(function (f) { return f(); }).join("")
// A closure made before a var's initializer runs (or in an earlier loop
// iteration) sees the initialized value: the var is a shared cell. A global
// read inside try that throws (a getter on the global object) is caught.
function main(n) {
  globalThis.first = function () { return second() + n; };
  var second = function () { return 20; };
  var fns = [];
  for (var i = 0; i < 3; i++) {
    fns.push(function () { return v; });
    var v = i * n;
  }
  globalThis.loopFns = fns;
  Object.defineProperty(globalThis, "probeGlobal", { configurable: true, get: function () { throw new Error("got " + n); } });
  var caught;
  try { caught = probeGlobal; } catch (e) { caught = e.message; }
  return [globalThis.first(), fns.map(function (f) { return f(); }).join(""), caught].join("|");
}
