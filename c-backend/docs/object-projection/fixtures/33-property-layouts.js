// @case {"description": "Constructor fields created conditionally, reassigned later, added after construction and overflowing inline storage keep their values; instances of different constructors with the same field at different positions are read through one site."}
function Left(a, b) { this.first = a; this.shared = b; this.count = 0; }
function Right(a, b) { this.shared = b; this.extra = a; this.first = a + 1; }
function Either(flag, value) {
  if (flag) { this.state = value; } else { this.state = -value; }
  this.other = flag;
}
function Wide(x) {
  this.a = x; this.b = x + 1; this.c = x + 2;
}
Left.prototype.bump = function () { this.count = this.count + 1; this.shared = this.shared + this.first; return this; };
function pick(which, a, b) { return which ? new Left(a, b) : new Right(a, b); }
function main(x) {
  var left = new Left(x, 10), right = new Right(x, 20);
  left.bump().bump();
  var mixed = [pick(true, x, 1), pick(false, x, 2)];
  var seen = mixed[0].shared + mixed[1].shared * 10 + mixed[0].first + mixed[1].first;
  mixed[1].shared = 7;
  var yes = new Either(true, x), no = new Either(false, x);
  yes.state = yes.state + 1;
  var wide = new Wide(x);
  wide.d = 4; wide.e = 5; wide.f = 6; wide.g = 7; wide.h = 8; wide.i = 9; wide.j = 10;
  wide.a = wide.a + wide.j;
  var record = { p: x, q: x + 1 };
  record.r = record.p + record.q;
  record.p = 100;
  return [left.count, left.shared, left.first, right.shared, right.extra, right.first, seen,
    mixed[1].shared, yes.state, no.state, yes.other, no.other,
    wide.a, wide.b, wide.c, wide.d, wide.g, wide.j, wide.missing === undefined,
    record.p, record.q, record.r];
}
