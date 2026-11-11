// inputs: [{"n":1}, {"n":2}]
// An arrow function with a rest parameter, made as a runtime function (handed to the caller, or called where its arguments are not known): its body reads the arguments it was called with, which an arrow has none of (its `arguments` is the enclosing function's), so it is made as a method, which has them.
var collect = (...args) => args.length + ":" + args.join(",");
var tagged = (tag, ...rest) => tag + "[" + rest.join("|") + "]";
function main(input) {
  var fns = [collect, tagged];
  return [fns[input.n % 2](input.n, 2, 3), collect.length, tagged.length, typeof collect.prototype, (function () { return fns[0](7, 8); })(1, 2, 3, 4)];
}
