// inputs: [0, 1, 4, 7]
// A counter object with prototype methods, driven by a dynamic loop.
function Counter(start) { this.n = start; }
function main(x) {
  Counter.prototype.bump = function (k) { this.n = this.n + k; return this; };
  Counter.prototype.get = function () { return this.n; };
  var c = new Counter(x);
  for (var i = 0; i < x; i++) c.bump(i);
  return [c.get(), c instanceof Counter, c.n];
}
