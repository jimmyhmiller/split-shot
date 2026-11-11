// inputs: [{"title": "T", "body": "b"}, {"title": 1}, {}]
// A runtime value a generator yields or returns is read once, where the generator produced it, however often its result object is read afterwards (a getter behind it ran three times for one `yield`). A small generator-driven template engine, its template known, renders by reading each field of the scope once.
function* renderAll(tpls, scope) { let out = ""; for (const t of tpls) { out += yield* t.render(scope); } return out; }
class Text { constructor(s) { this.s = s; } *render() { return this.s; } }
class Out { constructor(k) { this.k = k; } *render(scope) { const v = yield scope[this.k]; return String(v == null ? "" : v); } }
function toValueSync(it) { let value, done = false; do { const st = it.next(value); done = !!st.done; value = st.value; } while (!done); return value; }
function parse(src) { return src.split(/(\{\{\w+\}\})/).filter(Boolean).map(p => p.startsWith("{{") ? new Out(p.slice(2, -2)) : new Text(p)); }
function* g(scope) { return scope.title; }
function* h(scope) { const a = yield* g(scope); return a + scope.body; }
function main(input) {
  // (A runtime object whose reads are counted: a proxy over the input.)
  var reads = 0;
  var scope = new Proxy(input, { get(t, k) { reads++; return t[k]; } });
  var html = toValueSync(renderAll(parse("<h1>{{title}}</h1><p>{{body}}</p>{{title}}"), scope));
  var it = h(scope), r = it.next();
  return [html, r.value, r.value, r.done, reads];
}
