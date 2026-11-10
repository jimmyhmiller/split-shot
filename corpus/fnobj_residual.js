// inputs: [0, 1, 5]
// A residual function (it has a try) constructs A after main changed A.prototype,
// and an escaped closure changes A at runtime before main reads it.
function A(v) { this.v = v; }
function mk(n) { try { return new A(n); } catch (e) { return null; } }
function main(n) {
  A.prototype.inc = function () { return this.v + 1; };
  var a = mk(n).inc();
  [n].forEach(function () { A.prototype.inc = function () { return this.v + 100; }; });
  var b = new A(n).inc();
  return [a, b, A.prototype.hasOwnProperty("inc")];
}
