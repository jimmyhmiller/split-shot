// inputs: [0, 1, 4]
// A class's constructor and field initializers refer to the class by its
// own name (an inner binding set once the class exists): they read
// undefined, so `Foo.count` threw.
class Foo {
  tag = Foo.label;
  constructor() { Foo.count = (Foo.count || 0) + 1; }
  static label = "foo";
}
const Bar = class Baz {
  constructor(n) { this.n = n; Baz.made = (Baz.made || 0) + 1; }
};
function main(n) {
  new Foo();
  var f = new Foo();
  var b = new Bar(n);
  new Bar(n + 1);
  return [Foo.count, f.tag, b.n, Bar.made].join(",");
}
