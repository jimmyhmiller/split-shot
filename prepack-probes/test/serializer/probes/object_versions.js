// An object that existed before an if-converted branch, which each arm
// changes: after the join it is a choice of the two versions. Its aliases
// and the objects holding it see the version the condition chose; it is
// itself (`===`); an intrinsic array method on it runs on each version
// (one whose result is the array gives the choice back); an array given
// itself, a version holding another object changed so, and a loop pushing
// under a runtime test stay correct.
var t = global.__abstract ? __abstract("boolean", "true") : true;
var f = global.__abstract ? __abstract("boolean", "false") : false;
var out = {};
(function () {
  function run(c) {
    var arr = [1, 2, 3];
    var alias = arr;
    var holder = { arr: arr };
    if (c) {
      arr.push(4);
    } else {
      arr.pop();
    }
    var rev = arr.reverse();
    var obj = { n: 1 };
    var same = obj;
    if (c) {
      obj.n = 2;
      obj.extra = { deep: "yes" };
    } else {
      obj.n = 3;
    }
    var self = [0];
    if (c) {
      self.push(1);
    } else {
      self.push(2, 3);
    }
    self.push(self);
    var inner = { v: 1 };
    var outer = { inner: inner };
    if (c) {
      inner.v = 2;
      outer.w = 1;
    } else {
      inner.v = 3;
      outer.w = 2;
    }
    var kept = [];
    var xs = [c ? 1 : -1, 2, c ? -3 : 3];
    for (var i = 0; i < xs.length; i++) {
      if (xs[i] > 0) kept.push(xs[i]);
    }
    return {
      read: function () {
        return [arr.length, arr[0], arr[1], arr[2], arr[3], alias === arr, holder.arr === arr, rev === arr, alias.join("-")].join(",");
      },
      obj: [obj.n, same === obj, obj.extra && obj.extra.deep, JSON.stringify(same)].join(","),
      self: [self.length, self[self.length - 1] === self, self[1]].join(","),
      nested: [outer.inner.v, outer.w, outer.inner === inner].join(","),
      kept: kept.join(","),
    };
  }
  out.t = run(t);
  out.f = run(f);
})();
inspect = function () {
  return [out.t.read(), out.t.obj, out.t.self, out.t.nested, out.t.kept, out.f.read(), out.f.obj, out.f.self, out.f.nested, out.f.kept].join(" | ");
};
