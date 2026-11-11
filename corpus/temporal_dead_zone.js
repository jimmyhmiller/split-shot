// inputs: [0, 7]
// A reference to a `let`, `const` or `class` binding before its declaration has run throws a ReferenceError (it read a global of that name, or an outer variable): a read, an assignment (after its value is computed), `typeof`, an update; a nearer block's later declaration hides an outer variable of the name. After the declaration the binding is the binding.
function main(input) {
  var out = [], log = [];
  out.push((function (v) { try { if (v > 6) return b; let b = v; return b; } catch (e) { return e.name + ": " + e.message; } })(input));
  out.push((function () { let x = 1; { try { return x; } catch (e) { return "inner: " + e.message; } let x = 2; } })());
  out.push((function (v) { try { if (v) c = (log.push("rhs"), 5); const c = 1; return c; } catch (e) { return e.message; } })(input));
  out.push((function () { try { return typeof K; } catch (e) { return e.message; } class K {} })());
  out.push((function () { try { n++; } catch (e) { return e.message; } let n = 0; return n; })());
  out.push((function (v) { try { if (v) q += (log.push("no"), 1); let q = 1; return q; } catch (e) { return e.message; } })(input));
  out.push((function () { let ok = 1; var r = ok + 1; let later = r; later += 1; return later; })());
  out.push((function (v) { let a = v; { let a2 = a + 1; { let a = a2 + 1; return a; } } })(input));
  out.push((function () { const unused = 1; let used = 2; used = 3; return used; })());
  return [out, log];
}
