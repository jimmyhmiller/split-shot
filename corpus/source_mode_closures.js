// inputs: [0, 3]
// after: globalThis.run() + globalThis.who()
// Escaped closures emitted from their source (see js-frontend/src/source_mode.rs)
// must behave as the originals when run later: captured cells read and written
// through .value (assignments, ++, compound, shorthand properties,
// destructuring), an arrow's lexical this, labels named like a capture, strict
// code, a function keeping its name.
function main(n) {
  "use strict";
  var count = n;
  var log = [];
  function bump(k) {
    count += k;
    count++;
    log.push({ count });
    [count] = [count * 2];
    count: for (var i = 0; i < 1; i++) { continue count; }
    return count;
  }
  var holder = {
    base: 10,
    make() {
      return () => this.base + count;
    },
  };
  var arrow = holder.make();
  var strictThis = function () { return this === undefined; };
  function named() { return named.name + ":" + typeof bump; }
  function withDefault(a, b = 2) { globalThis.zz = a + b; return [this === undefined, withDefault.length, globalThis.zz].join("/"); }
  // (A call of a function held in a cell: no `this`.)
  var who = function () { return this === undefined ? "none" : typeof this; };
  if (n > 100) who = null;
  globalThis.who = function () { return who() + "|" + who.call(undefined); };
  globalThis.run = function () {
    var r = [bump(1), bump(2), arrow(), strictThis(), named(), withDefault(5), JSON.stringify(log), count];
    count = 100;
    r.push(arrow());
    return r.join(";");
  };
  return count;
}
