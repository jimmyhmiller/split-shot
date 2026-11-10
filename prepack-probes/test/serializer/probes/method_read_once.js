// A method call `recv.m(args)` with arguments that call reads `recv.m` once,
// before the arguments, in a residual function (a getter counts its runs).
var k = 2;
function h(x) { return x * k; }
var f = function (r, g) {
  r.update(g(h(1)));
  return r.done;
};
inspect = function() {
  var reads = 0;
  var log = [];
  var r = { get update() { reads++; log.push("get"); return function (x) { this.done = x; }; } };
  var out = f(r, function (x) { log.push("arg"); return x + 1; });
  return reads + " " + out + " " + log.join(",");
};
