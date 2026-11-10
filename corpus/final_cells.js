// inputs: [0, 1, 5, 22]
// A captured `let`/`const` that a closure made before its initialization
// reads lives in a cell; when no code assigns it after that, the cell's
// value is final even once runtime code holds the closure. A cell some code
// assigns is not.
function main(n) {
  const k = n * 2;
  let fixedLet = "L" + n;
  let counter = 0;
  function readK() {
    return k + fixedLet.length;
  }
  function bump() {
    counter += 1;
    return counter;
  }
  var calls = [readK, bump];
  var runner = new Function("fs", "return fs.map(function (f) { return f(); }).join('/')");
  var first = runner(calls);
  return [first, k + 1, fixedLet, counter, readK()].join(",");
}
