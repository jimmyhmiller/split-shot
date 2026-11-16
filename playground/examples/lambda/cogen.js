// The third Futamura projection, mix(mix, mix) = cogen.
//
// main applies the specializer (specializer.js) to itself and runs the
// result on the interpreter, which split-shot leaves dynamic. What comes out
// is a compiler generator: give it an annotated interpreter and it returns a
// compiler for that interpreter's language.
function main(interpreter) {
  var P = PA();
  var generator = mix(P)(P);
  return evaluate(generator)(interpreter);
}
