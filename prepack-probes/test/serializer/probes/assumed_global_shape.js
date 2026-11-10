// add at runtime:global.ob = { foo: { a: 1 }, bar: "x" };
if (global.__abstract) {
  __assumeDataProperty(this, "ob", __abstract({ foo: __abstract({ a: __abstract("number") }), bar: __abstract("string") }));
}
var x1 = typeof ob.foo.a;
var t = ob.bar.length;
ob = { foo: { a: "now a string" }, bar: 5 };
var x2 = typeof ob.foo.a;
var x3 = typeof ob.bar;
inspect = function() { return [x1, t, x2, x3].join(","); };
