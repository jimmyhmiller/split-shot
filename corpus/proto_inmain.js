// inputs: [0, 1, 4, -3]
// forbid: prototype|instanceof|hasOwnProperty|\.call|Object\.
function A(v) { this.v = v; }
function Pt(x, y) { this.x = x; this.y = y; }
function main(n) {
  A.prototype.inc = function () { return this.v + 1; };
  Pt.prototype.len2 = function () { return this.x * this.x + this.y * this.y; };
  var a = new A(n);
  var p = new Pt(3, n);
  function add(k) { return this.v + k; }
  return [a.inc(), p.len2(), a instanceof A, p instanceof A, a.constructor === A, "v" in a, "inc" in a,
          a.hasOwnProperty("inc"), a.hasOwnProperty("v"), add.call(a, 10), add.apply(a, [20]), a instanceof Object];
}
