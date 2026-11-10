// inputs: [0, 1, 5]
// forbid: next\(|yield|function\*
function* range(a, b) { for (let i = a; i < b; i++) yield i; return "end"; }
function* echo() { let got = []; while (got.length < 3) { const v = yield got.length; got.push(v); } return got; }
function* outer(n) { const r = yield* range(0, 3); yield r; yield n; }
function main(n) {
  const e = echo();
  const a = [e.next("ignored"), e.next("x"), e.next("y"), e.next(n)];
  const b = [...outer(n)];
  const c = [...range(1, 4)].map(x => x * n);
  const g = range(0, 10); g.next(); const ret = g.return(42); const after = g.next();
  return [a.map(r => [r.value, r.done]), b, c, ret, after, Array.from ? 1 : 0];
}
