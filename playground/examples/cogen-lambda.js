// The third Futamura projection, mix(mix, mix) = cogen.
//
// mix is Mogensen's five-case specializer for the lambda calculus, written
// below as a lambda term (PA) with every application and abstraction marked
// static (done now) or dynamic (left in the output). main applies the
// specializer to itself and runs the result on the interpreter, which
// split-shot leaves dynamic. What comes out is a compiler generator: give it
// an annotated interpreter and it returns a compiler for that interpreter's
// language.
//
// A term is a function of five handlers, one per case (higher-order abstract
// syntax): a variable, a static or dynamic application, a static or dynamic
// abstraction. An abstraction's body is a JavaScript function of its variable.
function V(x) { return (h0) => (h1) => (h2) => (h3) => (h4) => h0(x); }
function S(f, a) { return (h0) => (h1) => (h2) => (h3) => (h4) => h1(f)(a); }
function LS(body) { return (h0) => (h1) => (h2) => (h3) => (h4) => h2(body); }
function D(f, a) { return (h0) => (h1) => (h2) => (h3) => (h4) => h3(f)(a); }
function LD(body) { return (h0) => (h1) => (h2) => (h3) => (h4) => h4(body); }

// A call-by-value fixed point: λh. (λx. h (λz. x x z)) (λx. h (λz. x x z)).
function Z() {
  return LS((h) => S(LS((x) => S(V(h), LS((z) => S(S(V(x), V(x)), V(z))))),
                     LS((x) => S(V(h), LS((z) => S(S(V(x), V(x)), V(z)))))));
}

// The specializer, annotated (Wand 1993): Z (λp. λm. m v a l A L), one handler
// per case of the term m it specializes.
function PA() {
  return S(Z(), LS((p) => LS((m) =>
    S(S(S(S(S(V(m),
      LS((x) => V(x))),                                                   // variable
      LS((w) => LS((u) => D(S(V(p), V(w)), S(V(p), V(u)))))),             // static application
      LS((w) => LD((x) => S(V(p), S(V(w), V(x)))))),                      // static abstraction
      LS((w) => LS((u) => LD((a) => LD((b) => LD((c) =>                    // dynamic application
        D(D(V(b), S(V(p), V(w))), S(V(p), V(u))))))))),
      LS((w) => LD((a) => LD((b) => LD((c) =>                              // dynamic abstraction
        D(V(c), LD((x) => S(V(p), S(V(w), LD((a) => LD((b) => LD((c) => D(V(a), V(x))))))))))))))
  )));
}

// ───── the kernel: residual syntax, the specializer, an evaluator ─────
function variable(x) { return (a) => (b) => (c) => a(x); }
function application(f, x) { return (a) => (b) => (c) => b(f)(x); }
function abstraction(body) { return (a) => (b) => (c) => c(body); }
function mix(term) {
  return term((x) => x)
    ((f) => (x) => mix(f)(mix(x)))
    ((body) => (x) => mix(body(x)))
    ((f) => (x) => application(mix(f), mix(x)))
    ((body) => abstraction((x) => mix(body(variable(x)))));
}
function evaluate(term) {
  return term((x) => x)
    ((f) => (x) => evaluate(f)(evaluate(x)))
    ((body) => (x) => evaluate(body(x)));
}

function main(interpreter) {
  var P = PA();
  var generator = mix(P)(P);
  return evaluate(generator)(interpreter);
}
