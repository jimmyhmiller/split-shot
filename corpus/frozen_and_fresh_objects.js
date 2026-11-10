// inputs: [0, 1, 2]
// A frozen object's own data properties never change, whatever runtime code
// does with it; an unfrozen one's may. A fresh object that never escaped is
// no runtime value, so comparing it with one is false.
function mutate(o) {
  try { o.foo = "changed"; } catch (e) {}
  if (o.inner) o.inner.n = 99;
  return o;
}
function main(n) {
  var frozen = { foo: "bar", inner: { n: n } };
  Object.freeze(frozen);
  var loose = { foo: "bar" };
  var unknown = n > 0 ? loose : frozen;
  var fresh = { x: 1 };
  var same = fresh === unknown;
  mutate(frozen);
  mutate(loose);
  return [frozen.foo, frozen.inner.n, loose.foo, same, fresh.x + n].join(",");
}
