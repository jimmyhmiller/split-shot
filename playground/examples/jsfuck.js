// JSFuck: JavaScript written with only six characters: [ ] ( ) ! +
// Every value is built from type coercions ([]+[] is "", ![] is false, ...)
// and indexing into the strings they produce. All of it is static, so the
// partial evaluator runs the coercions and folds each expression away.
function main(x) {
  const word =
    ([]+{})[+!![]+!![]] +                               // "b"  from "[object Object]"[2]
    ([]+{})[+!![]] +                                    // "o"
    ([][+[]]+[])[+!![]] +                               // "n"  from "undefined"[1]
    ([]+{})[+!![]+!![]+!![]] +                          // "j"
    ([]+{})[+!![]] +                                    // "o"
    ([][+[]]+[])[+[]] +                                 // "u"
    (!![]+[])[+!![]];                                   // "r"  from "true"[1]
  const ten = +((+!![]+[]) + (+[]));                    // +("1" + "0") = 10
  return word + " " + (x * ten);
}
