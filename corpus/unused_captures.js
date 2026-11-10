// inputs: [0, 2, 5]
// after: globalThis.later()
// A residual function is passed only the captures its body reads: one
// known where it is made, or read only by code that folds away, is not
// passed (nor made to escape). A closure made while its own function is
// being built keeps them all. Closures made more than once stay distinct.
function main(n) {
  const fixed = 10;
  let shared = { hits: 0 };
  var unusedObj = { big: [1, 2, 3] };
  function usesFixed(x) {
    if (false) return unusedObj;
    return x + fixed;
  }
  function* gen(k) {
    yield k + fixed;
    yield shared.hits;
  }
  function Point(x) {
    this.x = x + fixed;
  }
  function fact(k) {
    return k <= 1 ? 1 : k * fact(k - 1);
  }
  var makers = [];
  for (var i = 0; i < 2; i++) {
    makers.push(function (y) {
      return y + fixed;
    });
  }
  globalThis.later = function () {
    shared.hits++;
    var g = gen(n);
    return [usesFixed(n), g.next().value, g.next().value, new Point(n).x, fact(n), makers[0] === makers[1], makers[1](n)].join(",");
  };
  return usesFixed(1);
}
