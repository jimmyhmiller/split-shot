// inputs: [0, 1, 7]
// forbid-return: log|key\(|setFactor|bump
// A class with computed keys, private members, static fields and a static
// block is modeled like any other: its heritage, keys and static
// initializers run where the original runs them, in order, and it sees
// the enclosing variables it names, also one assigned later or not yet
// initialized when the class is made.
function main(n) {
  var log = [];
  const tag = "t" + n;
  function key(k) {
    log.push(k);
    return k;
  }
  class Base {
    base() {
      return "base:" + tag;
    }
  }
  const sym = Symbol("s");
  class Thing extends (n > 3 ? Base : Object) {
    #secret = n * 2;
    static count = key("static") && 1;
    [key("a")]() {
      return "a" + this.#secret;
    }
    get [key("b")]() {
      return tag;
    }
    [sym]() {
      return "sym";
    }
    static {
      log.push("block");
    }
    reveal() {
      return this.#secret + Thing.count;
    }
  }
  const t = new Thing();
  var later = makeLater();
  function makeLater() {
    class UsesLater {
      [key("m")]() {
        return zero.v;
      }
    }
    const zero = { v: 42 };
    return new UsesLater();
  }
  // A variable the class shares with other code that assigns it.
  let factor = n + 1;
  function setFactor(v) {
    factor = v;
  }
  class Scaled {
    #k = 2;
    scaled(x) {
      return x * factor * this.#k;
    }
    static bump() {
      factor += 10;
    }
  }
  const sc = new Scaled();
  const s1 = sc.scaled(3);
  setFactor(5);
  Scaled.bump();
  const s2 = sc.scaled(3);
  Thing.prototype[Symbol.iterator] = function* () {
    yield "it";
  };
  return [
    s1,
    s2,
    factor,
    [...t].join(""),
    log.join("/"),
    t.a(),
    t.b,
    t[sym](),
    t.reveal(),
    typeof t.base,
    later.m(),
    Object.getOwnPropertyNames(Thing.prototype).join("|"),
    Thing.name,
  ].join(",");
}
