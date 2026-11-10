// inputs: [0, 2, 5]
// A function with a direct eval of code it is given runs as is: the eval
// sees its parameters and locals and the globals, as in the original (it
// was an "unsupported direct eval" error). The rest still specializes.
var base = 100;
function run(code, x) {
  var local = 7;
  return eval(code);
}
var table = [1, 2, 3].map(function (v) { return v * 2; });
function main(n) {
  return [run("x + local + base", n), run("typeof local", n), table[1] + n].join(",");
}
