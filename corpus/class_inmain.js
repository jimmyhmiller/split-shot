// inputs: [0, 1, 4, -2]
// forbid: class|new |\.call|prototype
function main(n){
  class P { constructor(x){ this.x = x; } get dbl(){ return this.x * 2; } add(o){ return new P(this.x + o.x); } static of(v){ return new P(v); } }
  class Q extends P { constructor(x, y){ super(x); this.y = y; } sum(){ return this.x + this.y + super.add(this).x; } }
  class R extends Q { z = 5; }
  var o = { a: 1, get b(){ return this.a + 1; }, set c(v){ this.a = v; }, m(k){ return this.a * k; }, ...{e: 9} };
  o.c = 10;
  var r = new R(2, n);
  return [new P(n).add(new P(3)).dbl, P.of(4).x, new Q(1, n).sum(), r.z, r instanceof P, r.sum(), o.b, o.m(2), o.e, Object.keys(o).length];
}
