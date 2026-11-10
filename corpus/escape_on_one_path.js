// inputs: [0, 2, 5]
// after: [globalThis.oneReg.k ? globalThis.oneReg.k() === globalThis.oneGet() : "none", globalThis.oneGet().v].join("|")
// An object that escapes on only one side of a runtime branch is still one
// object after the paths join (it was materialized again, a second object).
function main(n) {
  var target = { v: n };
  var reg = JSON.parse(n > 1 ? "{}" : '{"k":1}');
  if (!("k" in reg)) {
    reg.k = function () { return target; };
  }
  globalThis.oneReg = reg;
  globalThis.oneGet = function () { return target; };
  target.v = n + 1;
  return typeof reg.k;
}
