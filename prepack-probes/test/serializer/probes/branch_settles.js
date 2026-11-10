// A runtime value made before a branch on its condition, used inside the
// branch: the side the condition takes there. A variable the branch tests
// that a loop at runtime assigns again, or a call, is known no longer.
var t = global.__abstract ? __abstract("boolean", "true") : true;
var f = global.__abstract ? __abstract("boolean", "false") : false;
var k = global.__abstract ? __abstract("number", "3") : 3;
var out = {};
(function () {
  function run(c) {
    var label = c ? "on" : "off";
    var n = c && 7;
    var log = [];
    if (c) {
      log.push(label, n, !c ? "never" : "sure");
    } else {
      log.push(label, n, c || "fallback");
    }
    var x = c;
    for (var i = 0; i < k; i++) {
      if (x) {
        log.push(x ? "x on" : "x off");
      }
      x = !x;
      log.push(x ? "now on" : "now off");
    }
    var o = { flag: c };
    if (o.flag) {
      o.flag = false;
      log.push(o.flag ? "stale" : "fresh");
    }
    return log.join(",");
  }
  out.t = run(t);
  out.f = run(f);
})();
inspect = function () {
  return out.t + " | " + out.f;
};
