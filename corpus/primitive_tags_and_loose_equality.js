// inputs: [1, 0]
// forbid-main: toString|==|globalThis|length
// Small things known without running anything: a function's `length`; `Object.prototype.toString` of a primitive; `==` of an array or plain object and a primitive; the global object's `undefined`, `NaN`, `Infinity`; a standard namespace is itself; a RegExp as a string.
function main(input) {
  var re = /a+b\/c/gi;
  return [(function foo(a, b) {}).length, ((a, b, c = 1) => 0).length, Object.prototype.toString.call(null), Object.prototype.toString.call(undefined), Object.prototype.toString.call(5), Object.prototype.toString.call("s"), Object.prototype.toString.call(true),
    [5] == 5, [3, 1, 2] == "3,1,2", [] == 0, [[]] == false, ({}) == "[object Object]", [1] != 1, null == [], 
    globalThis.undefined === undefined, globalThis.NaN !== globalThis.NaN, globalThis.Infinity > 5, Math === Math, JSON === globalThis.JSON, typeof globalThis,
    String(re), `${re}`, re + "", "" + /x/, input];
}
