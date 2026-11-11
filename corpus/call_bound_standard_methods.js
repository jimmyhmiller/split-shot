// inputs: [{"x":1}, {"x":"b"}]
// forbid-main: bind|call|replace|slice|exec|test
// The call-bind idiom of ljharb's packages (get-intrinsic, call-bound, qs): `bind.call(Function.prototype.call, String.prototype.replace)` is a function that calls `replace` on its first argument. Called on known strings it folds, a callback of `replace` included, as `call.call(F, s, ...)` does, and a RegExp's `exec`/`test` on a known pattern (get-intrinsic's `$exec(re, name)`).
function main(input) {
  var $call = Function.prototype.call;
  var bind = Function.prototype.bind;
  var $replace = bind.call($call, String.prototype.replace);
  var $slice = bind.call($call, String.prototype.slice);
  var $exec = bind.call($call, RegExp.prototype.exec);
  var $test = $call.bind(RegExp.prototype.test);
  var parts = [];
  $replace("%Array.prototype.indexOf%", /[^%.]+/g, function (m) { parts[parts.length] = m; });
  return [parts.join("|"), $slice("hello", 1, 3), $call.call(String.prototype.toUpperCase, "ab"), $replace.length, $exec(/^%?[^%]*%?$/, "%Map%") === null, $test(/b/, "abc"), input.x];
}
