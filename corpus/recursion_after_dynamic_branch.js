// inputs: [1, 5]
// forbid-main: \bparse\(|parseExpr|forEach|Object\.create
// A recursive-descent parser over a static source, run after main has
// taken a dynamic branch: the branch decides nothing in the parse (it is
// a caller of the whole recursion), so the scope's `forEach` over its
// flags folds and the parse leaves only the evaluation.
const Flag = { in: 1, lexical: 2 };
class Scope {
  constructor() { this.flags = 0; this.stack = []; }
  with(flags, f) {
    const old = this.flags;
    Object.entries(flags).forEach(([k, v]) => {
      if (k in Flag && typeof Flag[k] === 'number') {
        if (v === true) this.flags |= Flag[k]; else if (v === false) this.flags &= ~Flag[k];
      }
    });
    if (flags.lexical) this.stack.push({ flags });
    const r = f();
    if (flags.lexical) this.stack.pop();
    this.flags = old;
    return r;
  }
}
class Parser {
  constructor(src) { this.src = src; this.pos = 0; this.scope = new Scope(); }
  peek() { return this.src[this.pos]; }
  next() { return this.src[this.pos++]; }
  parseExpr() {
    return this.scope.with({ in: true }, () => {
      let l = this.parseUnary();
      while (this.peek() === '+') { this.next(); l = { type: 'Add', l, r: this.parseUnary() }; }
      return l;
    });
  }
  parseUnary() {
    return this.scope.with({ in: true }, () => {
      const c = this.peek();
      if (c === '-') { this.next(); return { type: 'Neg', e: this.parseUnary() }; }
      if (c === '(') { this.next(); const e = this.scope.with({ lexical: true }, () => this.parseExpr()); this.next(); return e; }
      this.next();
      return { type: 'Num', v: +c };
    });
  }
}
function parse(src) {
  const p = new Parser(src);
  try { return p.parseExpr(); } catch (e) { return { type: 'Num', v: 0 }; }
}
function ev(n, x) {
  switch (n.type) {
    case 'Add': return ev(n.l, x) + ev(n.r, x);
    case 'Neg': return -ev(n.e, x);
    case 'Num': return n.v * x;
  }
}
const log = [];
function main(x) {
  if (x > 3) { log.push('big'); } else { log.push('small'); console.log('small'); }
  return [ev(parse('1+(2+-(3+4))+5'), x), log.length];
}
