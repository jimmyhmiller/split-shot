// inputs: [{"x":1,"f":true}, {"x":"y","f":false}]
// A fresh symbol's description is what `Symbol(...)` gave it (a fixed property its variable's facts carry along the path), and its `toString()` follows; two variables of `Symbol()` results are the same symbol only when they are one variable. An unread fresh symbol is dropped. One call site giving different descriptions on two arms (`mk("x")` or `mk("y")`) is told apart per path; where the arms meet, the description is the runtime's.
function mk(d) { return Symbol(d); }
function main(input) {
  var a = Symbol("s"), b = Symbol("s");
  var names = [];
  for (var i = 0; i < 2; i++) { var t = Symbol(i === 0 ? "first" : "second"); names.push(t.description); }
  var c = input.f ? mk("x") : mk("y");
  var arm;
  if (input.f) { arm = mk("p"); names.push(arm.description); } else { arm = mk("q"); names.push(arm.toString()); }
  return [Symbol("d" + 5).description, Symbol().description, Symbol("t").toString(), a === b, a === a, a !== b, typeof a, names, c.description, c.toString(), arm.description, input.x];
}
