// inputs: [{"n":1}, {"n":-2}]
// forbid-main: lookup|table|limits|\* 10|__x[0-9]+\(
// Top-level code that tests its environment (a UMD wrapper's `typeof define`, `typeof window`) ends in several states, one per answer. What they all agree on stays known to `main`: here the table, the function looking it up and an object of limits, which every path made the same, so `main` is the constant plus the input. Only what the paths disagree on (what one of them handed to `define` or wrote to `window`) is made runtime state.
var main = (function () {
  var table = { a: 1, b: 2 };
  var api = {};
  function lookup(k) { return table[k] * 10; }
  api.lookup = lookup;
  api.limits = { lo: 3, hi: 9 };
  var info = { name: "lib", version: 2 };
  var registered = "none";
  if (typeof define === "function" && define.amd) {
    define(function () { return info; });
    registered = "amd";
  } else if (typeof window !== "undefined") {
    window.someLib = info;
    registered = "window";
  }
  return function main(input) { return api.lookup("a") + api.lookup("b") + api.limits.hi * input.n + registered + info.version; };
})();
