// inputs: [0, 1, 2]
// forbid-main: made\(|"return a \* b"\)
// `Function(...)` or `new Function(...)` of literal strings, the standard
// `Function`: a function compiled from that source in the global scope (it
// sees globals, not the caller's variables), named `anonymous`, its source
// what the engine gives back. Written out where it escapes as the same
// call, a new function each time.
var secret = "global secret";
function outer() {
  var secret = "local";
  return Function("return typeof secret === 'string' ? secret : 'none'")();
}
var root = Function("return this")();
var add = new Function("a", "b", "return a + b");
var twice = Function("x", "return x * 2");
var broken = (function () { try { return Function("return )"); } catch (e) { return e.name; } })();
function main(i) {
  var made = new Function("a", "b", "return a * b");
  return [root === globalThis, add(i, 3), twice(i), outer(), add.name, add.length, String(add), Function("return this")() === globalThis,
    add === new Function("a", "b", "return a + b"), made(i, 4), String(made), broken];
}
