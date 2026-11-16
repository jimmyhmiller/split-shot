// All three Futamura projections, run in a row by split-shot.
//
//   mix(mix, mix)       = cogen       the specializer applied to itself
//   cogen(interpreter)  = compiler    for the lambda calculus (EA below)
//   compiler(program)   = target      the square of a numeral (square below)
//
// Every stage is known now, so split-shot runs them all while specializing,
// and only the program's input k is left: what comes out is the target, the
// compiled square, as JavaScript loops. (k goes in as a Church numeral and
// the result comes back as a number, so no function is left to run later.)

// The interpreter given to the cogen: an evaluator for the lambda calculus,
// annotated (EA): Z (λe. λm. m v a l), static on the syntax it walks, dynamic
// on the values it computes.
function EA() {
  return S(Z(), LS((e) => LS((m) =>
    S(S(S(V(m),
      LS((x) => V(x))),                                                   // variable
      LS((f) => LS((x) => D(S(V(e), V(f)), S(V(e), V(x)))))),             // application
      LS((b) => LD((x) => S(V(e), S(V(b), V(x))))))                         // abstraction
  )));
}

// The program: the square of a Church numeral, λn. λf. n (n f), in the
// kernel's own syntax.
function square() {
  return abstraction((n) => abstraction((f) =>
    application(variable(n), application(variable(n), variable(f)))));
}

// A number as a Church numeral, and a Church numeral read back as a number.
function church(k) {
  return (f) => (x) => {
    var r = x;
    var i = 0;
    while (i < k) { r = f(r); i = i + 1; }
    return r;
  };
}
function count(numeral) {
  return numeral((v) => v + 1)(0);
}

function main(k) {
  var P = PA();
  var cogen = evaluate(mix(P)(P));            // mix(mix, mix) = cogen
  var compiler = evaluate(cogen(EA()));       // cogen(interpreter) = compiler
  var target = evaluate(compiler(square()));  // compiler(program) = target
  return count(target(church(k)));
}
