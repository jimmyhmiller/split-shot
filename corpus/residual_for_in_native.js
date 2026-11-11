// inputs: [{"o":{"a":1,"skip":2,"b":3,"stop":4,"c":5}}, {"o":{"x":1,"y":2,"z":3}}, {"o":{}}, {"o":null}]
// forbid-main: __pe_forInKeys|!\(c in
// A `for..in` over a runtime object is the engine's own in the residual (the lowering's snapshot of the keys and the test of each against the object is what the engine does): `extend` loops, a `continue`, a key deleted during the loop, a `break` out of it. The lowering's test that skips a key the object no longer has is dropped with the snapshot: the engine does it, and running it again would ask a proxy twice.
function extend(obj) {
  for (var i = 1; i < arguments.length; i++) {
    for (var key in arguments[i]) {
      if (Object.prototype.hasOwnProperty.call(arguments[i], key)) obj[key] = arguments[i][key];
    }
  }
  return obj;
}
function main(input) {
  var names = [];
  for (var k in input.o) { if (k === "skip") continue; names.push(k); if (k === "stop") break; }
  var d = { a: 1 }; for (var k2 in input.o) { if (k2 === "x") delete input.o.y; }
  return [extend({}, input.o, { z: 1 }), names, input.o];
}
