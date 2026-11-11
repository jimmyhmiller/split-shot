// Feature rows of the reduction matrix (see tools/matrix.js).
//
// The export is a plain array of
//
//   { id, group, setup, expr, staticArg, staticArg2, dynArg, na }
//
//   expr(x)       source of an expression computing a PRIMITIVE from the
//                 operand `x` (a source text: a literal, `input.n`, or the
//                 name of a variable). Deterministic, and the same value every
//                 time it is evaluated.
//   setup         declarations placed at the top of `main`, before the
//                 expression (classes, functions). No state the expression
//                 changes: a context may evaluate the expression many times.
//   staticArg     a known operand; staticArg2 a second, different one
//   dynArg        an operand read from `input`
//                 ({n: number, s: string, flag: boolean, list: number[]})
//   na            contexts that make no sense for the feature (with a comment
//                 saying why)
//
// Names ending in `_` belong to the contexts: do not use them here.
//
// To add a row, call one of the helpers below under the right `group(...)`:
//   num(id, expr)   operands 5 / 9 / input.n
//   str(id, expr)   operands "hello world" / "Foo Bar" / input.s
//   arr(id, expr)   operands [3, 1, 2] / [9, 8, 7, 6] / input.list
//   bool(id, expr)  operands true / false / input.flag
//   row(id, expr, staticArg, staticArg2, dynArg)
// each takes a last `{ setup, na }`.

const features = [];
let current = '';
const group = (name) => { current = name; };
function row(id, expr, staticArg, staticArg2, dynArg, opts) {
  features.push({ id, group: current, setup: '', expr, staticArg, staticArg2, dynArg, ...(opts || {}) });
}
const num = (id, expr, opts) => row(id, expr, '5', '9', 'input.n', opts);
const str = (id, expr, opts) => row(id, expr, '"hello world"', '"Foo Bar"', 'input.s', opts);
const arr = (id, expr, opts) => row(id, expr, '[3, 1, 2]', '[9, 8, 7, 6]', 'input.list', opts);
const bool = (id, expr, opts) => row(id, expr, 'true', 'false', 'input.flag', opts);

// ---------------------------------------------------------------------------
group('Operators');

num('op.add', (x) => `${x} + 2`);
num('op.sub', (x) => `${x} - 2`);
num('op.mul', (x) => `${x} * 3`);
num('op.div', (x) => `${x} / 4`);
num('op.mod', (x) => `${x} % 4`);
num('op.exp', (x) => `${x} ** 3`);
num('op.unary-minus', (x) => `-${x}`);
num('op.unary-plus-string', (x) => `+(${x} + "1")`);
num('op.string-concat', (x) => `"a" + ${x} + "b"`);
num('op.number-plus-string-coercion', (x) => `${x} + 1 + "2" + ${x} + 1`);
num('op.lt', (x) => `${x} < 6`);
num('op.lte', (x) => `${x} <= 5`);
num('op.gt', (x) => `${x} > 6`);
num('op.gte', (x) => `${x} >= 9`);
num('op.eq-loose', (x) => `${x} == "5"`);
num('op.eq-strict', (x) => `${x} === 5`);
num('op.neq-loose', (x) => `${x} != "9"`);
num('op.neq-strict', (x) => `${x} !== 9`);
num('op.eq-coercion-table', (x) => `(${x} == "5") + ":" + (null == undefined) + ":" + ("" == 0) + ":" + (null == 0) + ":" + ([${x}] == ${x})`);
num('op.string-compare', (x) => `("a" + ${x}) < "a7"`);
num('op.logical-and', (x) => `(${x} > 6) && "yes"`);
num('op.logical-or', (x) => `(${x} > 6 ? 0 : "") || "dflt"`);
num('op.logical-not', (x) => `!(${x} - 5)`);
num('op.short-circuit-effects', (x) => `(function (v) { var s = ""; function t(a) { s += a; return a; } t(v > 6) && t("A"); t(v > 6) || t("B"); return s; })(${x})`);
num('op.bit-and', (x) => `${x} & 6`);
num('op.bit-or', (x) => `${x} | 18`);
num('op.bit-xor', (x) => `${x} ^ 15`);
num('op.bit-not', (x) => `~${x}`);
num('op.shl', (x) => `${x} << 3`);
num('op.shr', (x) => `(-${x} * 1000) >> 2`);
num('op.ushr', (x) => `(-${x}) >>> 28`);
num('op.int32-overflow', (x) => `(${x} * 1000000000) | 0`);
num('op.typeof', (x) => `typeof ${x}`);
num('op.typeof-table', (x) => `typeof [${x}] + typeof null + typeof undefined + typeof function () {} + typeof "s" + typeof true + typeof (${x} + "")`);
num('op.in', (x) => `("a" + ${x}) in { a5: 1, a3: 2 }`);
num('op.in-array-index', (x) => `${x} in [1, 2, 3, 4, 5, 6]`);
num('op.instanceof', (x) => `([${x}] instanceof Array) + ":" + ([${x}] instanceof Object) + ":" + ({} instanceof Array)`);
num('op.comma', (x) => `(${x} + 1, ${x} + 2)`);
num('op.void', (x) => `void ${x} === undefined`);
num('op.delete', (x) => `(function () { var o = { a: ${x}, b: 2 }; var d = delete o.a; return d + ":" + ("a" in o) + ":" + o.a + ":" + o.b; })()`);
num('op.nullish', (x) => `(${x} > 6 ? null : ${x}) ?? "nul"`);
num('op.nullish-zero', (x) => `(${x} - 5) ?? "nul"`);
num('op.optional-member', (x) => `(${x} > 6 ? null : { b: { c: ${x} } })?.b.c`);
num('op.optional-deep', (x) => `({ a: { b: ${x} } }).a?.b + ":" + ({ a: null }).a?.b`);
num('op.optional-call', (x) => `({ f: ${x} > 6 ? null : function (a) { return a + 1; } }).f?.(${x})`);
num('op.optional-index', (x) => `(${x} > 6 ? undefined : [10, 20])?.[1]`);
num('op.ternary', (x) => `${x} > 6 ? "big" : ${x} > 4 ? "mid" : "small"`);
num('op.template-literal', (x) => '`n=${' + x + '}, twice=${' + x + ' * 2}!`');
num('op.template-nested', (x) => '`a${' + x + ' > 6 ? `[${' + x + '}]` : "-"}b`');
num('op.tagged-template', (x) => 'tag`a${' + x + '}b${' + x + ' * 2}c`', {
  setup: 'function tag(s, ...v) { return s.join("_") + "|" + s.raw.length + "|" + v.join("+"); }',
});
num('op.compound-assign', (x) => `(function () { var a = ${x}; a += 2; a *= 3; a -= 1; a /= 2; a %= 7; a **= 2; a <<= 1; a |= 1; a ^= 2; a &= 255; a >>= 1; return a; })()`);
num('op.logical-assign', (x) => `(function () { var a = ${x}, b = null, c = 0, d = 4; b ??= a; c ||= a; a &&= 1; d ??= 9; return a + ":" + b + ":" + c + ":" + d; })()`);
num('op.inc-dec', (x) => `(function () { var a = ${x}; var b = a++ + ++a; var c = a-- - --a; return b * 100 + c * 10 + a; })()`);
num('op.chained-assign', (x) => `(function () { var a, b, c; a = b = c = ${x}; b += 1; return a + ":" + b + ":" + c; })()`);
num('op.eval-order', (x) => `(function (v) { var log = ""; function t(a) { log += a; return a; } var r = t(1) + t(v) * t(3) - t(4); return log + "=" + r; })(${x})`);
num('op.number-string-arith', (x) => `("3" * ${x}) + ":" + ("10" - ${x}) + ":" + ("3" + ${x}) + ":" + (true + ${x}) + ":" + (null + ${x}) + ":" + (undefined + ${x})`);

// ---------------------------------------------------------------------------
group('Spread & destructuring');

num('spread.call', (x) => `add3(...[1, ${x}, 3])`, { setup: 'function add3(a, b, c) { return a + b * 10 + c * 100; }' });
num('spread.array', (x) => `[0, ...[1, ${x}], ...[7]][2]`);
arr('spread.array-copy', (x) => `(function (a) { var b = [...a]; b[0] = 99; return a[0] + ":" + b[0] + ":" + b.length; })(${x})`);
str('spread.string', (x) => `[...${x}].length + ":" + [...${x}][1]`);
num('spread.object', (x) => `({ ...{ a: 1, b: ${x} }, c: 3 }).b`);
num('spread.object-override', (x) => `(function (o) { return o.a + ":" + o.b + ":" + o.c; })({ a: 1, ...{ a: ${x}, b: 2 }, b: 7, c: 3 })`);
num('destructure.array', (x) => `(function () { var [a, b] = [${x}, 2]; return a * 10 + b; })()`);
num('destructure.array-default-rest', (x) => `(function () { var [a, b = 10, , ...rest] = [${x}, undefined, 3, 4, 5]; return a + ":" + b + ":" + rest.length + ":" + rest[1]; })()`);
num('destructure.swap', (x) => `(function () { var a = ${x}, b = 2; [a, b] = [b, a]; return a + ":" + b; })()`);
num('destructure.object', (x) => `(function () { var { a, b } = { a: ${x}, b: 2 }; return a * 10 + b; })()`);
num('destructure.object-nested-default-rest', (x) => `(function () { var { a, b: { c }, d = 7, ...rest } = { a: ${x}, b: { c: 2 }, e: 5, f: 6 }; return a + ":" + c + ":" + d + ":" + rest.e + ":" + rest.f + ":" + ("a" in rest); })()`);
num('destructure.object-rename-computed', (x) => `(function () { var key = "k" + ${x}; var { [key]: v, other: w = "dflt" } = { k5: "five", k9: "nine" }; return v + ":" + w; })()`);
num('destructure.params', (x) => `(function ({ a, b = 2 }, [c, d]) { return a + ":" + b + ":" + c + ":" + d; })({ a: ${x} }, [3, 4])`);
arr('destructure.dynamic-array', (x) => `(function ([a, b = "none", ...rest]) { return a + ":" + b + ":" + rest.length; })(${x})`);
str('destructure.string', (x) => `(function () { var [a, b] = ${x}; return a + ":" + b; })()`);
num('destructure.for-of', (x) => `(function () { var s = ""; for (var [key, v] of [["a", ${x}], ["b", 2]]) s += key + v; return s; })()`);

// ---------------------------------------------------------------------------
group('Control flow');

num('flow.if-else-chain', (x) => `(function (v) { if (v < 0) return "neg"; else if (v === 0) return "zero"; else if (v < 6) return "small"; else return "big"; })(${x})`);
num('flow.switch-fallthrough', (x) => `(function (v) { var s = ""; switch (v) { case 5: s += "five"; case 6: s += "six"; break; case 9: s += "nine"; break; default: s += "other"; } return s; })(${x})`);
num('flow.switch-default-middle', (x) => `(function (v) { var s = ""; switch (v) { case 1: s += "one"; default: s += "dflt"; case 9: s += "nine"; } return s; })(${x})`);
str('flow.switch-string', (x) => `(function (v) { switch (v) { case "hello world": return 1; case "ab": return 2; case "": return 3; default: return 4; } })(${x})`);
num('flow.switch-true', (x) => `(function (v) { switch (true) { case v < 6: return "lt6"; case v < 10: return "lt10"; default: return "ge10"; } })(${x})`);
num('flow.for', (x) => `(function (n) { var s = 0; for (var i = 0; i < n; i++) s += i * i; return s; })(${x})`);
num('flow.for-continue-break', (x) => `(function (n) { var s = 0; for (var i = 0; i < 100; i++) { if (i % 2) continue; if (i > n) break; s += i; } return s; })(${x})`);
num('flow.while', (x) => `(function (n) { var s = 1, i = 0; while (i < n) { s = s * 2 + i; i++; } return s; })(${x})`);
num('flow.do-while', (x) => `(function (n) { var s = 0, i = 0; do { s += i + 1; i += 2; } while (i < n); return s; })(${x})`);
num('flow.for-in', (x) => `(function (v) { var o = { a: 1, b: v, c: 3 }; var s = ""; for (var key in o) s += key + o[key]; return s; })(${x})`);
num('flow.for-in-inherited', (x) => `(function (v) { var o = Object.create({ p: v }); o.own = 1; var s = ""; for (var key in o) s += key + o[key]; return s; })(${x})`);
arr('flow.for-in-array', (x) => `(function (a) { var s = ""; for (var i in a) s += i + "=" + a[i] + ";"; return s; })(${x})`);
arr('flow.for-of-array', (x) => `(function (a) { var s = 0; for (var v of a) s = s * 10 + v; return s; })(${x})`);
str('flow.for-of-string', (x) => `(function (t) { var s = ""; for (var ch of t) s = ch + s; return s; })(${x})`);
num('flow.labeled-break', (x) => `(function (n) { var c = 0; outer: for (var i = 0; i < 4; i++) { for (var j = 0; j < 4; j++) { if (i * j >= n) break outer; c++; } } return c; })(${x})`);
num('flow.labeled-continue', (x) => `(function (n) { var c = 0; outer: for (var i = 0; i < 4; i++) { for (var j = 0; j < 4; j++) { if (j * 3 > n) continue outer; c += j; } } return c; })(${x})`);
num('flow.labeled-block', (x) => `(function (v) { var s = "a"; blk: { s += "b"; if (v > 6) break blk; s += "c"; } return s; })(${x})`);
num('flow.try-catch-finally', (x) => `(function (v) { var s = ""; try { s += "t"; if (v > 6) throw new Error("big"); s += "n"; } catch (e) { s += "c" + e.message; } finally { s += "f"; } return s; })(${x})`);
num('flow.throw-catch-value', (x) => `(function (v) { try { throw v * 2; } catch (e) { return e + 1; } })(${x})`);
num('flow.throw-through-calls', (x) => `(function (v) { function a(n) { if (n > 6) throw { code: n }; return n; } function b(n) { return a(n) + 1; } try { return b(v); } catch (e) { return "code" + e.code; } })(${x})`);
num('flow.finally-overrides-return', (x) => `(function (v) { try { return v; } finally { if (v > 6) return -1; } })(${x})`);
num('flow.finally-runs-on-return', (x) => `(function (v) { var log = ""; function f() { try { log += "t"; return v; } finally { log += "f"; } } var r = f(); return log + r; })(${x})`);
num('flow.nested-try-rethrow', (x) => `(function (v) { try { try { throw new Error("in" + v); } catch (e) { throw new Error(e.message + "+out"); } } catch (e) { return e.message; } })(${x})`);
num('flow.let-per-iteration', (x) => `(function (n) { var fs = []; for (let i = 0; i < 3; i++) fs.push(function () { return i * n; }); return fs[0]() + ":" + fs[1]() + ":" + fs[2](); })(${x})`);
num('flow.var-hoisting', (x) => `(function (v) { var r = typeof a + ":"; if (v > 6) { var a = v; } return r + a; })(${x})`);
num('flow.tdz-caught', (x) => `(function (v) { try { if (v > 6) return b; let b = v; return b; } catch (e) { return e.name; } })(${x})`);
num('flow.tdz-caught-message', (x) => `(function (v) { try { if (v > 6) return b; let b = v; return b; } catch (e) { return e.message; } })(${x})`);
num('flow.block-scope-shadow', (x) => `(function (v) { let a = v; { let a = v + 1; { const b = a * 2; a = b; } v = a; } return a + ":" + v; })(${x})`);
num('flow.nested-loops', (x) => `(function (n) { var s = 0; for (var i = 0; i < n; i++) for (var j = 0; j <= i; j++) s += j; return s; })(${x})`);
num('flow.collatz-while', (x) => `(function (n) { var steps = 0; n = Math.abs(n | 0) + 1; while (n !== 1 && steps < 200) { n = n % 2 ? 3 * n + 1 : n / 2; steps++; } return steps; })(${x})`);

// ---------------------------------------------------------------------------
group('Functions');

num('fn.iife', (x) => `(function () { return ${x} + 1; })()`);
num('fn.arrow', (x) => `((a, b) => a * b)(${x}, 3)`);
num('fn.arrow-block-body', (x) => `((a) => { var b = a + 1; return b * 2; })(${x})`);
num('fn.default-params', (x) => `(function (a, b = a * 2, c = b + 1) { return a + ":" + b + ":" + c; })(${x})`);
num('fn.default-param-undefined', (x) => `(function (a, b = "dflt") { return a + ":" + b; })(${x}, undefined) + (function (a, b = "dflt") { return b; })(${x}, null)`);
num('fn.rest-params', (x) => `(function (a, ...r) { return a + ":" + r.length + ":" + r[1]; })(${x}, 1, 2, 3)`);
num('fn.arguments', (x) => `(function () { return arguments.length + ":" + arguments[0] + ":" + arguments[1]; })(${x}, 2)`);
num('fn.arguments-slice', (x) => `(function () { return Array.prototype.slice.call(arguments, 1).join(","); })(1, ${x}, 3)`);
num('fn.arguments-aliasing', (x) => `(function (a) { arguments[0] = a + 1; return a; })(${x})`);
num('fn.missing-args', (x) => `(function (a, b) { return a + ":" + b; })(${x})`);
num('fn.closure-counter', (x) => `(function (start) { var c = start; var inc = function () { return ++c; }; inc(); inc(); return inc(); })(${x})`);
num('fn.closure-shared-state', (x) => `(function (v) { function make() { var n = v; return { inc: function () { n++; }, get: function () { return n; } }; } var a = make(), b = make(); a.inc(); a.inc(); b.inc(); return a.get() + ":" + b.get(); })(${x})`);
num('fn.recursion-factorial', (x) => `fact(${x})`, { setup: 'function fact(n) { return n <= 1 ? 1 : n * fact(n - 1); }' });
row('fn.recursion-fib', (x) => `fib(${x})`, '10', '7', 'input.n', { setup: 'function fib(n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); }' });
num('fn.mutual-recursion', (x) => `isEven(${x})`, {
  setup: 'function isEven(n) { return n <= 0 ? true : isOdd(n - 1); } function isOdd(n) { return n <= 0 ? false : isEven(n - 1); }',
});
num('fn.recursion-accumulator', (x) => `(function sum(n, acc) { return n <= 0 ? acc : sum(n - 1, acc + n); })(${x}, 0)`);
arr('fn.recursion-over-array', (x) => `(function sum(a, i) { return i >= a.length ? 0 : a[i] + sum(a, i + 1); })(${x}, 0)`);
num('fn.higher-order', (x) => `(function (f, v) { return f(f(v)); })(function (a) { return a * 3; }, ${x})`);
num('fn.returns-function', (x) => `(function (a) { return function (b) { return function (c) { return a + b * c; }; }; })(${x})(2)(3)`);
num('fn.curry-arrows', (x) => `((a) => (b) => (c) => a + b * c)(${x})(2)(3)`);
num('fn.compose', (x) => `(function () { var compose = function (f, g) { return function (v) { return f(g(v)); }; }; var inc = function (v) { return v + 1; }; var dbl = function (v) { return v * 2; }; return compose(inc, dbl)(${x}) + ":" + compose(dbl, inc)(${x}); })()`);
num('fn.bind', (x) => `(function (a, b) { return this.k + ":" + a + ":" + b; }).bind({ k: 1 }, ${x})(10)`);
num('fn.call', (x) => `(function (a) { return this.k + a; }).call({ k: 100 }, ${x})`);
num('fn.apply', (x) => `(function (a, b) { return this.k + a * b; }).apply({ k: 100 }, [${x}, 2])`);
num('fn.method-this', (x) => `({ k: ${x}, get: function () { return this.k * 2; } }).get()`);
num('fn.arrow-this', (x) => `({ k: ${x}, get: function () { return (() => this.k * 2)(); } }).get()`);
num('fn.method-shorthand', (x) => `({ m(a) { return a + 1; } }).m(${x})`);
num('fn.getter-setter', (x) => `(function (v) { var o = { _a: 1, get a() { return this._a * 2; }, set a(n) { this._a = n + 1; } }; o.a = v; return o.a; })(${x})`);
num('fn.length-name', (x) => `(function foo(a, b) {}).length + ":" + (function foo(a, b) {}).name + ":" + ${x}`);
num('fn.properties-on-function', (x) => `(function () { function g() { return g.count * 2; } g.count = ${x}; return g(); })()`);
num('fn.constructor-prototype', (x) => `(function () { function P(a) { this.a = a; } P.prototype.get = function () { return this.a + 1; }; return new P(${x}).get(); })()`);
num('fn.constructor-returns-object', (x) => `(function () { function P(a) { this.a = a; return { a: a * 2 }; } return new P(${x}).a; })()`);
num('fn.new-target', (x) => `(function () { function P() { this.t = new.target === P; } return new P().t + ":" + ${x}; })()`);
num('fn.memoize', (x) => `(function (n) { var cache = {}; function f(k) { if (k in cache) return cache[k]; return (cache[k] = k < 2 ? k : f(k - 1) + f(k - 2)); } return f(n > 0 ? n : 0); })(${x})`);
num('fn.callback-with-index', (x) => `(function (f) { var s = ""; for (var i = 0; i < 3; i++) s += f(i); return s; })(function (i) { return i * ${x} + ","; })`);
num('fn.strict-this-undefined', (x) => `(function () { "use strict"; return this === undefined; })() + ":" + ${x}`);
num('fn.function-as-argument-table', (x) => `(function (ops, v) { return ops.add(v, 1) + ":" + ops.mul(v, 2); })({ add: function (a, b) { return a + b; }, mul: function (a, b) { return a * b; } }, ${x})`);
num('fn.trampoline', (x) => `(function (n) { function step(i, acc) { return i <= 0 ? acc : function () { return step(i - 1, acc + i); }; } var r = step(n, 0); while (typeof r === "function") r = r(); return r; })(${x})`);

// ---------------------------------------------------------------------------
group('Objects');

num('obj.literal-read', (x) => `({ a: ${x}, b: 2 }).a + ({ a: 1, b: 2 }).b`);
num('obj.nested-read', (x) => `({ a: { b: { c: [1, ${x}] } } }).a.b.c[1]`);
num('obj.missing-property', (x) => `({ a: ${x} }).nope + ""`);
num('obj.computed-key', (x) => `({ ["k" + ${x}]: 7, k0: 1 })["k" + ${x}]`);
num('obj.shorthand', (x) => `(function () { var a = ${x}, b = 2; var o = { a, b }; return o.a + o.b; })()`);
num('obj.mutation', (x) => `(function () { var o = { a: 1 }; o.a += ${x}; o.b = o.a * 2; o["c"] = o.b + 1; return o.a + ":" + o.b + ":" + o.c; })()`);
num('obj.numeric-keys', (x) => `(function () { var o = {}; o[${x}] = "n"; o["1"] = "one"; return o[1] + o[${x} + ""]; })()`);
num('obj.keys', (x) => `Object.keys({ a: 1, ["b" + ${x}]: 2 })[1] + Object.keys({ a: 1, b: 2, c: 3 }).length`);
num('obj.keys-join', (x) => `Object.keys({ z: 1, ["b" + ${x}]: 2, a: 3 }).join(",")`);
num('obj.values', (x) => `Object.values({ a: 1, b: ${x} })[1] + Object.values({ a: 1, b: ${x} }).length`);
num('obj.entries', (x) => `(function () { var e = Object.entries({ a: ${x}, b: 2 }); return e[0][0] + e[0][1] + e[1][0] + e[1][1] + e.length; })()`);
num('obj.assign', (x) => `(function () { var t = { a: 1 }; var r = Object.assign(t, { b: ${x} }, { a: 3 }); return r.a + ":" + r.b + ":" + (r === t); })()`);
num('obj.freeze', (x) => `(function () { var o = Object.freeze({ a: ${x} }); o.a = 99; o.b = 1; return o.a + ":" + o.b + ":" + Object.isFrozen(o); })()`);
num('obj.freeze-strict-throws', (x) => `(function () { "use strict"; var o = Object.freeze({ a: ${x} }); try { o.a = 99; return "no throw"; } catch (e) { return e.name + ":" + o.a; } })()`);
num('obj.seal', (x) => `(function () { var o = Object.seal({ a: ${x} }); o.a = 99; o.b = 1; delete o.a; return o.a + ":" + o.b + ":" + Object.isSealed(o); })()`);
num('obj.preventExtensions', (x) => `(function () { var o = Object.preventExtensions({ a: ${x} }); o.b = 1; return o.a + ":" + o.b + ":" + Object.isExtensible(o); })()`);
num('obj.fromEntries', (x) => `Object.fromEntries([["a", ${x}], ["b", 2]]).a`);
num('obj.create', (x) => `(function () { var o = Object.create({ inherited: ${x} }); o.own = 1; return o.inherited + ":" + o.own + ":" + o.hasOwnProperty("inherited"); })()`);
num('obj.create-null', (x) => `(function () { var o = Object.create(null); o.a = ${x}; return o.a + ":" + ("toString" in o); })()`);
num('obj.create-with-descriptors', (x) => `Object.create({}, { a: { value: ${x}, enumerable: true } }).a`);
num('obj.defineProperty', (x) => `(function () { var o = { z: 1 }; Object.defineProperty(o, "a", { value: ${x}, enumerable: false }); o.a = 77; return o.a + ":" + Object.keys(o).length; })()`);
num('obj.defineProperty-getter', (x) => `(function () { var o = { n: ${x} }; Object.defineProperty(o, "dbl", { get: function () { return this.n * 2; } }); return o.dbl; })()`);
num('obj.defineProperties', (x) => `(function () { var o = {}; Object.defineProperties(o, { a: { value: ${x}, writable: true }, b: { value: 2 } }); o.a++; o.b++; return o.a + ":" + o.b; })()`);
num('obj.getOwnPropertyNames', (x) => `Object.getOwnPropertyNames({ a: 1, ["b" + ${x}]: 2 })[1]`);
num('obj.getOwnPropertyDescriptor', (x) => `(function () { var d = Object.getOwnPropertyDescriptor({ a: ${x} }, "a"); return d.value + ":" + d.writable + ":" + d.enumerable + ":" + d.configurable; })()`);
num('obj.hasOwn', (x) => `Object.hasOwn({ a5: 1 }, "a" + ${x}) + ":" + Object.hasOwn({}, "toString")`);
num('obj.hasOwnProperty', (x) => `({ a5: 1 }).hasOwnProperty("a" + ${x}) + ":" + ({}).hasOwnProperty("toString")`);
num('obj.getPrototypeOf', (x) => `(function () { var p = { v: ${x} }; var o = Object.create(p); return (Object.getPrototypeOf(o) === p) + ":" + (Object.getPrototypeOf({}) === Object.prototype) + ":" + Object.getPrototypeOf(o).v; })()`);
num('obj.setPrototypeOf', (x) => `(function () { var o = { own: 1 }; Object.setPrototypeOf(o, { v: ${x} }); return o.v + o.own; })()`);
num('obj.proto-literal', (x) => `({ __proto__: { p: ${x} }, q: 1 }).p`);
num('obj.prototype-chain', (x) => `(function () { function A() {} A.prototype.who = function () { return "A" + this.n; }; function B(n) { this.n = n; } B.prototype = Object.create(A.prototype); B.prototype.constructor = B; var b = new B(${x}); return b.who() + ":" + (b instanceof A) + ":" + (b.constructor === B); })()`);
num('obj.prototype-shadowing', (x) => `(function () { var p = { v: 1, get: function () { return this.v; } }; var o = Object.create(p); var before = o.get(); o.v = ${x}; return before + ":" + o.get() + ":" + p.v; })()`);
num('obj.enumeration-order', (x) => `(function () { var o = { b: 1, 2: 1, a: 1, 1: 1 }; o["k" + ${x}] = 1; o[0] = 1; var s = ""; for (var key in o) s += key + ","; return s; })()`);
num('obj.in', (x) => `(function () { var o = { a5: 1 }; return (("a" + ${x}) in o) + ":" + ("toString" in o) + ":" + ("zz" in o); })()`);
num('obj.delete-then-enumerate', (x) => `(function () { var o = { a: 1, b: 2, c: 3 }; delete o[${x} > 6 ? "a" : "b"]; var s = ""; for (var key in o) s += key; return s; })()`);
num('obj.is', (x) => `Object.is(${x} * 0, -0) + ":" + Object.is(${x} - ${x}, 0) + ":" + Object.is(NaN, ${x} / "a") + ":" + Object.is(${x}, ${x})`);
num('obj.toString-tag', (x) => `Object.prototype.toString.call([${x}]) + Object.prototype.toString.call(null) + Object.prototype.toString.call(${x}) + ({}) + ""`);
num('obj.valueOf-override', (x) => `({ valueOf() { return ${x}; } }) + 1`);
num('obj.toString-override', (x) => `"" + ({ toString() { return "T" + ${x}; } })`);
num('obj.identity', (x) => `(function () { var a = { v: ${x} }, b = { v: ${x} }, c = a; return (a === b) + ":" + (a === c) + ":" + (a == b); })()`);
num('obj.aliasing', (x) => `(function () { var a = { v: 1 }; var b = a; b.v = ${x}; return a.v; })()`);
num('obj.entries-for-of', (x) => `(function () { var s = ""; for (var [key, v] of Object.entries({ a: ${x}, b: 2 })) s += key + "=" + v + ";"; return s; })()`);
num('obj.getter-on-prototype', (x) => `(function () { var p = { get twice() { return this.n * 2; } }; var o = Object.create(p); o.n = ${x}; return o.twice; })()`);
num('obj.getOwnPropertyNames-nonenumerable', (x) => `(function () { var o = { a: 1 }; Object.defineProperty(o, "hid" + ${x}, { value: 2, enumerable: false }); return Object.getOwnPropertyNames(o).length + ":" + Object.keys(o).length + ":" + Object.getOwnPropertyNames(o)[1]; })()`);
num('obj.propertyIsEnumerable', (x) => `(function () { var o = { a: ${x} }; return o.propertyIsEnumerable("a") + ":" + [${x}].propertyIsEnumerable("length"); })()`);
num('obj.isPrototypeOf', (x) => `(function () { var p = { v: ${x} }; var o = Object.create(p); return p.isPrototypeOf(o) + ":" + o.isPrototypeOf(p) + ":" + Object.prototype.isPrototypeOf(o); })()`);
num('obj.structured-data-walk', (x) => `(function (cfg) { var s = 0; for (var i = 0; i < cfg.items.length; i++) s += cfg.items[i].w * cfg.scale; return s; })({ scale: ${x}, items: [{ w: 1 }, { w: 2 }, { w: 3 }] })`);

// ---------------------------------------------------------------------------
group('Classes');

num('class.method', (x) => `new P(${x}).twice()`, { setup: 'class P { constructor(a) { this.a = a; } twice() { return this.a * 2; } }' });
num('class.fields', (x) => `(function () { var c = new C(${x}); return c.x + ":" + c.y + ":" + c.z; })()`, {
  setup: 'class C { x = 1; y = this.x + 1; constructor(z) { this.z = z + this.y; } }',
});
num('class.static-method', (x) => `S.make(${x}).v + S.count`, { setup: 'class S { static count = 10; static make(v) { var s = new S(); s.v = v; return s; } }' });
num('class.static-block', (x) => `T.table[1] + ${x}`, { setup: 'class T { static table; static { T.table = [10, 20, 30]; } }' });
num('class.private-field', (x) => `new Q(${x}).bump().bump().value`, {
  setup: 'class Q { #n; constructor(n) { this.#n = n; } bump() { this.#n++; return this; } get value() { return this.#n; } }',
});
num('class.private-method', (x) => `new Q(${x}).run()`, { setup: 'class Q { #n; constructor(n) { this.#n = n; } #dbl() { return this.#n * 2; } run() { return this.#dbl() + 1; } }' });
num('class.private-in', (x) => `Q.is(new Q()) + ":" + Q.is({}) + ":" + ${x}`, { setup: 'class Q { #brand = 1; static is(o) { return #brand in o; } }' });
num('class.private-static', (x) => `Q.next(${x})`, { setup: 'class Q { static #base = 100; static next(v) { return Q.#base + v; } }' });
num('class.inheritance-super', (x) => `new B(${x}).describe()`, {
  setup:
    'class A { constructor(n) { this.n = n; } describe() { return "A" + this.n; } } class B extends A { constructor(n) { super(n + 1); this.m = n; } describe() { return super.describe() + "/B" + this.m; } }',
});
num('class.inherit-no-constructor', (x) => `new B(${x}).get()`, { setup: 'class A { constructor(n) { this.n = n; } get() { return this.n; } } class B extends A { get() { return super.get() * 2; } }' });
num('class.three-levels', (x) => `new C(${x}).f()`, {
  setup: 'class A { f() { return "a" + this.v; } } class B extends A { f() { return "b" + super.f(); } } class C extends B { constructor(v) { super(); this.v = v; } f() { return "c" + super.f(); } }',
});
num('class.accessors', (x) => `(function () { var t = new Temp(); t.f = ${x} * 9 + 32; return t.c + ":" + t.f; })()`, {
  setup: 'class Temp { constructor() { this._c = 0; } get c() { return this._c; } set f(v) { this._c = (v - 32) / 9; } get f() { return this._c * 9 + 32; } }',
});
num('class.instanceof', (x) => `(function () { var b = new B(); return (b instanceof B) + ":" + (b instanceof A) + ":" + (new A() instanceof B) + ":" + (b instanceof Object) + ":" + ${x}; })()`, {
  setup: 'class A {} class B extends A {}',
});
num('class.toString-override', (x) => '`<${new V(' + x + ')}>` + new V(1)', { setup: 'class V { constructor(v) { this.v = v; } toString() { return "V(" + this.v + ")"; } }' });
num('class.valueOf-override', (x) => `new V(${x}) + new V(2) + (new V(${x}) > new V(2))`, { setup: 'class V { constructor(v) { this.v = v; } valueOf() { return this.v; } }' });
num('class.toPrimitive', (x) => '(+new M(' + x + ')) + ":" + `${new M(' + x + ')}` + ":" + (new M(' + x + ') + "")', {
  setup: 'class M { constructor(v) { this.v = v; } [Symbol.toPrimitive](hint) { return hint === "number" ? this.v : hint === "string" ? "M" + this.v : "d" + this.v; } }',
});
num('class.expression', (x) => `(function () { var K = class { constructor(v) { this.v = v; } get() { return this.v + 1; } }; return new K(${x}).get(); })()`);
num('class.computed-method', (x) => `(new K()["m" + ${x}] || new K().m3)()`, { setup: 'class K { ["m" + 5]() { return "five"; } ["m" + 9]() { return "nine"; } m3() { return "three"; } }', });
num('class.static-inheritance', (x) => `B.make(${x}) + ":" + B.kind`, { setup: 'class A { static kind = "k"; static make(v) { return this.name + v; } } class B extends A {}' });
num('class.method-chaining', (x) => `new Acc(${x}).add(2).mul(3).add(1).v`, { setup: 'class Acc { constructor(v) { this.v = v; } add(n) { this.v += n; return this; } mul(n) { this.v *= n; return this; } }' });
num('class.extends-array', (x) => `(function () { var s = new Stack(); s.push(1); s.push(${x}); return s.top() + ":" + s.length + ":" + (s instanceof Array); })()`, {
  setup: 'class Stack extends Array { top() { return this[this.length - 1]; } }',
});
num('class.new-target-abstract', (x) => `(function () { try { new Shape(); return "made"; } catch (e) { return e.message + new Sq(${x}).area(); } })()`, {
  setup: 'class Shape { constructor() { if (new.target === Shape) throw new Error("abstract:"); } } class Sq extends Shape { constructor(s) { super(); this.s = s; } area() { return this.s * this.s; } }',
});
num('class.polymorphic-dispatch', (x) => `(function (v) { var shapes = [new Sq(v), new Ci(v), new Sq(1)]; var s = 0; for (var i = 0; i < shapes.length; i++) s += shapes[i].area(); return s; })(${x})`, {
  setup: 'class Sq { constructor(s) { this.s = s; } area() { return this.s * this.s; } } class Ci { constructor(r) { this.r = r; } area() { return 3 * this.r * this.r; } }',
});
num('class.constructor-name', (x) => `new P().constructor.name + P.name + ${x}`, { setup: 'class P {}' });
num('class.typeof-and-call-error', (x) => `(function () { try { P(); return "called"; } catch (e) { return typeof P + ":" + e.name + ":" + ${x}; } })()`, { setup: 'class P {}' });
num('class.static-getter', (x) => `Cfg.limit + ${x}`, { setup: 'class Cfg { static get limit() { return 40 + 2; } }' });
num('class.super-property-in-object', (x) => `(function () { var base = { hi() { return "base" + this.n; } }; var o = { __proto__: base, n: ${x}, hi() { return "o>" + super.hi(); } }; return o.hi(); })()`);

// ---------------------------------------------------------------------------
group('Arrays');

arr('array.index-length', (x) => `(function (a) { return a[0] + ":" + a[a.length - 1] + ":" + a.length + ":" + a[99]; })(${x})`);
arr('array.map', (x) => `${x}.map(function (v) { return v * 2; }).join(",")`);
num('array.map-captured-operand', (x) => `[1, 2, 3].map((v) => v * ${x}).join(",")`);
arr('array.map-index', (x) => `${x}.map(function (v, i, all) { return v * i + all.length; }).join(",")`);
arr('array.filter', (x) => `${x}.filter(function (v) { return v % 2 === 1; }).join(",")`);
arr('array.reduce', (x) => `${x}.reduce(function (a, v) { return a + v; }, 0)`);
arr('array.reduce-no-init', (x) => `(function (a) { try { return a.reduce(function (p, v) { return p * 10 + v; }); } catch (e) { return e.name; } })(${x})`);
arr('array.reduceRight', (x) => `${x}.reduceRight(function (a, v) { return a + v; }, "")`);
arr('array.forEach', (x) => `(function (a) { var s = 0; a.forEach(function (v, i) { s += v * (i + 1); }); return s; })(${x})`);
arr('array.find', (x) => `${x}.find(function (v) { return v < 3; }) + ""`);
arr('array.findIndex', (x) => `${x}.findIndex(function (v) { return v < 3; })`);
arr('array.findLast', (x) => `${x}.findLast(function (v) { return v > 1; }) + ""`);
arr('array.findLastIndex', (x) => `${x}.findLastIndex(function (v) { return v > 1; })`);
arr('array.some', (x) => `${x}.some(function (v) { return v > 2; })`);
arr('array.every', (x) => `${x}.every(function (v) { return v > 1; })`);
arr('array.includes', (x) => `${x}.includes(2) + ":" + ${x}.includes(42) + ":" + [NaN].includes(NaN)`);
arr('array.indexOf', (x) => `${x}.indexOf(2) + ":" + ${x}.indexOf(42) + ":" + [NaN].indexOf(NaN)`);
arr('array.lastIndexOf', (x) => `${x}.concat(${x}).lastIndexOf(2)`);
arr('array.join', (x) => `${x}.join("-") + "|" + ${x}.join() + "|" + [1, null, undefined, "a", [2, 3]].join("+")`);
arr('array.toString', (x) => `${x}.toString() + "|" + String(${x}) + "|" + (${x} + "")`);
arr('array.slice', (x) => `${x}.slice(1).join(",") + "|" + ${x}.slice(-2, -1).join(",") + "|" + ${x}.slice().length`);
arr('array.splice', (x) => `(function (a) { var removed = a.splice(1, 1, "x", "y"); return a.join(",") + "|" + removed.join(","); })(${x})`);
arr('array.concat', (x) => `${x}.concat([10, 11], 12, [[13]]).length + ":" + ${x}.concat([10]).join(",")`);
arr('array.flat', (x) => `[${x}, [${x}, [7, [8]]]].flat().length + ":" + [${x}, [[7, [8]]]].flat(Infinity).join(",")`);
arr('array.flatMap', (x) => `${x}.flatMap(function (v) { return v % 2 ? [v, v * 10] : []; }).join(",")`);
arr('array.reverse', (x) => `(function (a) { var r = a.reverse(); return r.join(",") + ":" + (r === a); })(${x})`);
arr('array.sort-default', (x) => `${x}.concat([10, 25, 100]).sort().join(",")`);
arr('array.sort-comparator', (x) => `${x}.concat([10, 25, 100]).sort(function (a, b) { return b - a; }).join(",")`);
num('array.sort-stable-objects', (x) => `[{ k: 2, n: "a" }, { k: 1, n: "b" }, { k: 2, n: "c" }, { k: 1, n: "d" }, { k: ${x}, n: "e" }].sort(function (a, b) { return a.k - b.k; }).map(function (o) { return o.n; }).join("")`);
row('array.sort-strings', (x) => `["pear", "Apple", "fig", ${x}].sort().join(",")`, '"banana"', '"Zed"', 'input.s');
arr('array.fill', (x) => `(function (a) { a.fill(0, 1); return a.join(",") + ":" + new Array(3).fill(7).join(","); })(${x})`);
arr('array.push', (x) => `(function (a) { var n = a.push(8, 9); return n + ":" + a.join(","); })(${x})`);
arr('array.pop', (x) => `(function (a) { var p = a.pop(); return p + ":" + a.length; })(${x})`);
arr('array.shift', (x) => `(function (a) { var p = a.shift(); return p + ":" + a.join(","); })(${x})`);
arr('array.unshift', (x) => `(function (a) { var n = a.unshift(8, 9); return n + ":" + a.join(","); })(${x})`);
arr('array.at', (x) => `${x}.at(-1) + ":" + ${x}.at(0) + ":" + ${x}.at(99)`);
arr('array.entries', (x) => `(function (a) { var s = ""; for (var [i, v] of a.entries()) s += i + "=" + v + ";"; return s; })(${x})`);
arr('array.keys', (x) => `(function (a) { var s = ""; for (var i of a.keys()) s += i; return s; })(${x})`);
arr('array.values', (x) => `(function (a) { var s = ""; for (var v of a.values()) s += v; return s; })(${x})`);
arr('array.from-array', (x) => `Array.from(${x}).join(",") + ":" + (Array.from(${x}) !== ${x})`);
arr('array.from-map-fn', (x) => `Array.from(${x}, function (v, i) { return v + i; }).join(",")`);
num('array.from-length', (x) => `Array.from({ length: ${x} > 0 ? ${x} : 0 }, function (_, i) { return i * 2; }).join(",")`);
str('array.from-string', (x) => `Array.from(${x}).length + ":" + Array.from(${x}).join("-")`);
num('array.of', (x) => `Array.of(${x}).length + ":" + Array.of(1, ${x}, 3).join(",")`);
arr('array.isArray', (x) => `Array.isArray(${x}) + ":" + Array.isArray({ length: 1 }) + ":" + Array.isArray("ab")`);
num('array.constructor-length', (x) => `new Array(${x}).length + ":" + new Array(${x}, 1).length + ":" + Array(${x}).join("x").length`);
arr('array.length-truncate', (x) => `(function (a) { a.length = 1; return a.join(",") + ":" + a.length + ":" + a[1]; })(${x})`);
arr('array.length-extend', (x) => `(function (a) { a[a.length + 2] = "z"; return a.length + ":" + a.join(",") + ":" + ((a.length - 2) in a); })(${x})`);
num('array.holes', (x) => `(function () { var a = [1, , ${x}]; var c = 0; a.forEach(function () { c++; }); return a.length + ":" + c + ":" + (1 in a) + ":" + a[1] + ":" + a.join("-"); })()`);
arr('array.delete-element', (x) => `(function (a) { delete a[0]; return a.length + ":" + (0 in a) + ":" + a.join(","); })(${x})`);
arr('array.toSorted', (x) => `(function (a) { var s = a.toSorted(); return s.join(",") + ":" + a.join(","); })(${x})`);
arr('array.toReversed', (x) => `(function (a) { var s = a.toReversed(); return s.join(",") + ":" + a.join(","); })(${x})`);
arr('array.with', (x) => `(function (a) { try { return a.with(0, 99).join(",") + ":" + a.join(","); } catch (e) { return e.name; } })(${x})`);
arr('array.toSpliced', (x) => `${x}.toSpliced(0, 1, "x").join(",")`);
arr('array.copyWithin', (x) => `${x}.concat([4, 5]).copyWithin(0, 2).join(",")`);
arr('array.nested-index', (x) => `[[1, 2], ${x}, [5, 6]][1][0] + [[1, 2], ${x}][0][1]`);
arr('array.index-loop-sum', (x) => `(function (a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i] * (i + 1); return s; })(${x})`);
arr('array.build-in-loop', (x) => `(function (a) { var out = []; for (var i = 0; i < a.length; i++) { if (a[i] > 1) out.push(a[i] * 10); } return out.join(","); })(${x})`);
arr('array.chain-map-filter-reduce', (x) => `${x}.map(function (v) { return v + 1; }).filter(function (v) { return v > 2; }).reduce(function (a, v) { return a + v; }, 0)`);
arr('array.array-like-call', (x) => `Array.prototype.map.call({ 0: "a", 1: "b", length: 2 }, function (v) { return v + ${x}.length; }).join(",")`);
arr('array.string-keys', (x) => `(function (a) { a["1"] = "s"; a.extra = 5; return a[1] + ":" + a.length + ":" + a.extra; })(${x})`);
arr('array.identity-equality', (x) => `(function (a) { var b = a; var c = a.slice(); return (a === b) + ":" + (a === c) + ":" + (a == a.join(",")); })(${x})`);
arr('array.matrix-transpose', (x) => `(function (m) { var t = m[0].map(function (_, c) { return m.map(function (r) { return r[c]; }); }); return t.map(function (r) { return r.join(""); }).join("/"); })([${x}, [4, 5, 6]])`);
arr('array.max-via-spread', (x) => `Math.max(...${x}) + ":" + Math.min.apply(null, ${x})`);

// ---------------------------------------------------------------------------
group('Strings');

str('string.length-index', (x) => `${x}.length + ":" + ${x}[0] + ":" + ${x}[99]`);
str('string.charAt', (x) => `${x}.charAt(1) + ":" + ${x}.charAt(99)`);
str('string.charCodeAt', (x) => `${x}.charCodeAt(1) + ":" + ${x}.charCodeAt(99)`);
str('string.codePointAt', (x) => `${x}.codePointAt(0) + ":" + "\\u{1F600}".codePointAt(0)`);
str('string.at', (x) => `${x}.at(-1) + ":" + ${x}.at(0)`);
str('string.slice', (x) => `${x}.slice(1, 4) + ":" + ${x}.slice(-3) + ":" + ${x}.slice(2)`);
str('string.substring', (x) => `${x}.substring(4, 1) + ":" + ${x}.substring(2) + ":" + ${x}.substring(-3, 2)`);
str('string.substr', (x) => `${x}.substr(1, 3) + ":" + ${x}.substr(-3, 2)`);
str('string.indexOf', (x) => `${x}.indexOf("o") + ":" + ${x}.indexOf("o", 5) + ":" + ${x}.indexOf("zz") + ":" + ${x}.indexOf("")`);
str('string.lastIndexOf', (x) => `${x}.lastIndexOf("o") + ":" + ${x}.lastIndexOf("l", 3)`);
str('string.includes', (x) => `${x}.includes("lo w") + ":" + ${x}.includes("a") + ":" + ${x}.includes("")`);
str('string.startsWith', (x) => `${x}.startsWith("he") + ":" + ${x}.startsWith("o", 4)`);
str('string.endsWith', (x) => `${x}.endsWith("ld") + ":" + ${x}.endsWith("hell", 4)`);
num('string.padStart', (x) => `String(${x}).padStart(5, "0") + ":" + String(${x}).padStart(6, "ab") + ":" + String(${x}).padStart(1)`);
num('string.padEnd', (x) => `String(${x}).padEnd(5, "0") + ":" + String(${x}).padEnd(4) + "|"`);
str('string.repeat', (x) => `${x}.repeat(2) + ":" + ${x}.repeat(0).length`);
num('string.repeat-count', (x) => `"ab".repeat(${x})`);
str('string.trim', (x) => `("  " + ${x} + " \\n\\t").trim() + "|"`);
str('string.trimStart', (x) => `("  " + ${x} + "  ").trimStart() + "|"`);
str('string.trimEnd', (x) => `("  " + ${x} + "  ").trimEnd() + "|"`);
str('string.toUpperCase', (x) => `${x}.toUpperCase() + "stra\\u00dfe".toUpperCase()`);
str('string.toLowerCase', (x) => `${x}.toLowerCase() + "\\u00c4B".toLowerCase()`);
str('string.split', (x) => `${x}.split(" ").length + ":" + ${x}.split("o").join("0") + ":" + ${x}.split(" ")[0]`);
str('string.split-chars', (x) => `${x}.split("").reverse().join("")`);
str('string.split-limit', (x) => `${x}.split("", 3).join("|") + ":" + ${x}.split().length`);
str('string.split-regex', (x) => `${x}.split(/[ ,o]+/).join("|") + ":" + ${x}.split(/(l)/).length`);
str('string.replace-string', (x) => `${x}.replace("o", "0") + ":" + ${x}.replace("zz", "y")`);
str('string.replace-regex', (x) => `${x}.replace(/o/g, "0") + ":" + ${x}.replace(/[aeiou]/, "_")`);
str('string.replace-groups', (x) => `${x}.replace(/(\\w+) (\\w+)/, "$2 $1 [$&] $$")`);
str('string.replace-function', (x) => `${x}.replace(/[a-z]/g, function (m, off) { return off % 2 ? m.toUpperCase() : m; })`);
str('string.replace-function-groups', (x) => `${x}.replace(/(\\w)(\\w*)/g, function (m, a, b) { return a.toUpperCase() + b + "!"; })`);
str('string.replaceAll-string', (x) => `${x}.replaceAll("o", "00") + ":" + ${x}.replaceAll("", "-")`);
str('string.replaceAll-regex', (x) => `${x}.replaceAll(/l+/g, "L")`);
str('string.match', (x) => `(function (s) { var m = s.match(/(\\w)(\\w)/); return m ? m[0] + ":" + m[1] + ":" + m[2] + ":" + m.index + ":" + m.length : "none"; })(${x})`);
str('string.match-global', (x) => `(function (s) { var m = s.match(/o|l/g); return m ? m.join("") + m.length : "none"; })(${x})`);
str('string.matchAll', (x) => `(function (s) { var out = ""; for (var m of s.matchAll(/(\\w)o/g)) out += m[1] + m.index + ";"; return out; })(${x})`);
str('string.search', (x) => `${x}.search(/o/) + ":" + ${x}.search(/\\d/)`);
str('string.concat', (x) => `${x}.concat("!", 1, null) + "".concat(${x}, ${x})`);
str('string.normalize', (x) => `(${x} + "e\\u0301").normalize("NFC").length + ":" + (${x} + "\\u00e9").normalize("NFD").length`);
str('string.localeCompare', (x) => `${x}.localeCompare("hello") + ":" + "a".localeCompare("b") + ":" + "b".localeCompare("a") + ":" + ${x}.localeCompare(${x})`);
num('string.fromCharCode', (x) => `String.fromCharCode(60 + ${x}, 97, 98) + String.fromCharCode(0x20ac).length`);
num('string.fromCodePoint', (x) => `String.fromCodePoint(0x1F600 + (${x} > 0 ? ${x} | 0 : 0)).length + String.fromCodePoint(65 + (${x} > 0 ? ${x} | 0 : 0))`);
num('string.raw', (x) => 'String.raw`a\\n${' + x + '}\\tb` + String.raw`\\u00e9`.length');
num('string.String-conversion', (x) => `String(${x}) + String(null) + String(undefined) + String(true) + String([1, [2, ${x}]]) + String({}) + String(-0) + String(1e21) + String(1 / 3)`);
num('string.toString-number', (x) => `(${x}).toString() + (${x} + 0.5).toString() + (-${x}).toString()`);
str('string.iteration-codepoints', (x) => `(function (s) { var n = 0; for (var ch of s + "\\u{1F600}!") n++; return n + ":" + (s + "\\u{1F600}").length; })(${x})`);
str('string.comparison', (x) => `(${x} < "hello") + ":" + (${x} > "Hello") + ":" + (${x} === "hello world") + ":" + ("10" < "9") + ":" + ("10" < 9)`);
str('string.char-loop', (x) => `(function (s) { var n = 0; for (var i = 0; i < s.length; i++) { if (s.charCodeAt(i) > 108) n++; } return n; })(${x})`);
str('string.build-in-loop', (x) => `(function (s) { var out = ""; for (var i = s.length - 1; i >= 0; i--) out += s[i]; return out; })(${x})`);
str('string.isWellFormed', (x) => `${x}.isWellFormed() + ":" + ${x}.toWellFormed().length`);
// (A lone surrogate is a string of its own kind: it has rows of its own, so
// that what goes wrong with it stays out of the other rows.)
str('string.lone-surrogate', (x) => `(${x} + "\\ud800").length + ":" + (${x} + "\\ud800").charCodeAt(${x}.length) + ":" + ("\\ud83d" + "\\ude00" === "\\u{1F600}")`);
str('string.lone-surrogate-wellformed', (x) => `(${x} + "\\ud800").isWellFormed() + ":" + (${x} + "\\ud800").toWellFormed().charCodeAt(${x}.length)`);
str('string.lone-surrogate-json', (x) => `JSON.stringify(${x} + "\\ud800") + encodeURIComponent(${x} + "\\ud83d\\ude00")`);
str('string.escapes', (x) => `(${x} + "\\t\\"q\\"\\\\\\u0041\\x42\\0").length + ":" + "\\u0041\\x42"`);
str('string.wrapper-object', (x) => `typeof new String(${x}) + ":" + (new String(${x}) == ${x}) + ":" + (new String(${x}) === ${x}) + ":" + new String(${x}).length`);
str('string.number-coercion', (x) => `(+${x}) + ":" + (${x} * 1) + ":" + (+"42") + ":" + (+"") + ":" + (+" 12 ") + ":" + (+"0x1f") + ":" + (+"1e3")`);
str('string.word-count', (x) => `${x}.split(" ").filter(function (w) { return w.length > 0; }).map(function (w) { return w[0].toUpperCase() + w.slice(1); }).join(" ")`);

// ---------------------------------------------------------------------------
group('Numbers');

num('number.toFixed', (x) => `(${x} / 3).toFixed(2) + ":" + (1.005).toFixed(2) + ":" + (${x}).toFixed(0) + ":" + (1e21).toFixed(2)`);
num('number.toFixed-digits', (x) => `(3.14159).toFixed(${x})`);
num('number.toString-radix', (x) => `(${x} * 51).toString(2) + ":" + (${x} * 51).toString(16) + ":" + (${x} * 51).toString(36) + ":" + (0.5).toString(2) + ":" + (-255).toString(16)`);
num('number.toString-radix-dynamic', (x) => `(255).toString(${x})`);
num('number.toPrecision', (x) => `(${x} * 123.456).toPrecision(3) + ":" + (0.00001234).toPrecision(2) + ":" + (${x}).toPrecision(4)`);
num('number.toExponential', (x) => `(${x} * 123.456).toExponential(2) + ":" + (0).toExponential()`);
num('number.to-string-forms', (x) => `(${x} * 1e21) + ":" + (${x} * 1e-7) + ":" + (0.1 + 0.2) + ":" + (${x} / 0) + ":" + (-${x} / 0) + ":" + (0 / 0) + ":" + (123456789012345680000) + ":" + 1e300 * 1e10`);
row('number.parseInt', (x) => `parseInt(${x}) + ":" + parseInt(${x}, 16) + ":" + parseInt("0x1f") + ":" + parseInt("12px") + ":" + parseInt("") + ":" + parseInt("101", 2) + ":" + parseInt(" -7.9")`, '"42"', '"ff"', 'input.s');
row('number.parseFloat', (x) => `parseFloat(${x}) + ":" + parseFloat("3.14abc") + ":" + parseFloat(".5") + ":" + parseFloat("1e3") + ":" + parseFloat("-Infinity") + ":" + parseFloat("x")`, '"42.5"', '"1e2"', 'input.s');
row('number.Number-conversion', (x) => `Number(${x}) + ":" + Number("") + ":" + Number(" 12 ") + ":" + Number("12px") + ":" + Number(null) + ":" + Number(undefined) + ":" + Number(true) + ":" + Number([5]) + ":" + Number("0b101") + ":" + Number({})`, '"42"', '"0x10"', 'input.s');
num('number.isNaN', (x) => `isNaN(${x}) + ":" + isNaN("abc") + ":" + isNaN("12") + ":" + Number.isNaN("abc") + ":" + Number.isNaN(${x} / "a")`);
num('number.isFinite', (x) => `isFinite(${x}) + ":" + isFinite("12") + ":" + isFinite(${x} / 0) + ":" + Number.isFinite("12") + ":" + Number.isFinite(${x})`);
num('number.isInteger', (x) => `Number.isInteger(${x}) + ":" + Number.isInteger(${x} + 0.5) + ":" + Number.isInteger("5") + ":" + Number.isSafeInteger(${x} * 2 ** 53)`);
num('number.constants', (x) => `(Number.MAX_SAFE_INTEGER + ${x}) + ":" + Number.MIN_SAFE_INTEGER + ":" + Number.EPSILON + ":" + Number.MAX_VALUE + ":" + Number.MIN_VALUE + ":" + Number.POSITIVE_INFINITY + ":" + Number.NaN`);
num('number.negative-zero', (x) => `(1 / (${x} * -0)) + ":" + (-0 === 0) + ":" + Object.is(-0, ${x} * 0) + ":" + (-0 + "") + ":" + JSON.stringify(-0)`);
num('number.negative-zero-result', (x) => `${x} * -0`);
num('number.nan-result', (x) => `${x} / "a"`);
num('number.float-precision', (x) => `(0.1 * ${x}) + ":" + (0.1 + 0.2 === 0.3) + ":" + (${x} / 3) + ":" + (9007199254740992 + ${x})`);
num('number.integer-division-idioms', (x) => `((${x} * 7 / 2) | 0) + ":" + ~~(-${x} * 7 / 2) + ":" + Math.floor(-${x} * 7 / 2) + ":" + ((${x} * 7) % 2) + ":" + ((-${x} * 7) % 4)`);
num('number.wrapper-object', (x) => `typeof new Number(${x}) + ":" + (new Number(${x}) + 1) + ":" + (new Number(${x}) === ${x}) + ":" + typeof Number(${x})`);
num('number.toLocaleString-en', (x) => `(${x} * 1234567.891).toLocaleString("en-US")`);
num('number.literals', (x) => `0xff + 0b101 + 0o17 + 1_000 + 1e3 + .5 + 5. + ${x}`);
num('bigint.arithmetic', (x) => `(2n ** 64n + BigInt(${x} > 0 ? ${x} | 0 : 0)) * 3n - 1n`);
num('bigint.to-string', (x) => `String(123456789012345678901234567890n * BigInt(${x} > 0 ? ${x} | 0 : 1)) + ":" + (255n).toString(16) + ":" + typeof 1n`);
num('bigint.division-mod', (x) => `((10n ** 20n) / 7n % 1000n) + ":" + (-7n / 2n) + ":" + (-7n % 3n) + ":" + (BigInt(${x} > 0 ? ${x} | 0 : 0) << 70n)`);
num('bigint.comparison-mixed', (x) => `(2n > ${x}) + ":" + (5n == ${x}) + ":" + (5n === ${x}) + ":" + (BigInt(5) === 5n) + ":" + Number(2n ** 53n + 1n)`);
num('bigint.asUintN', (x) => `BigInt.asUintN(8, 257n + BigInt(${x} > 0 ? ${x} | 0 : 0)) + ":" + BigInt.asIntN(8, 255n)`);
num('bigint.from-fraction-throws', (x) => `(function (v) { try { return String(BigInt(v + 0.5)); } catch (e) { return e.name; } })(${x})`);
num('bigint.mixed-arithmetic-throws', (x) => `(function (v) { try { return 1n + v; } catch (e) { return e.name; } })(${x})`);

// ---------------------------------------------------------------------------
group('Math');

num('math.abs', (x) => `Math.abs(${x} - 7) + ":" + Math.abs(-0) + ":" + Math.abs("-3")`);
num('math.ceil', (x) => `Math.ceil(${x} / 4) + ":" + Math.ceil(-${x} / 4)`);
num('math.floor', (x) => `Math.floor(${x} / 4) + ":" + Math.floor(-${x} / 4)`);
num('math.round', (x) => `Math.round(${x} / 2) + ":" + Math.round(-${x} / 2) + ":" + Math.round(2.5) + ":" + Math.round(-2.5) + ":" + Math.round(0.49999999999999994)`);
num('math.trunc', (x) => `Math.trunc(${x} / 4) + ":" + Math.trunc(-${x} / 4)`);
num('math.sign', (x) => `Math.sign(${x} - 7) + ":" + Math.sign(0) + ":" + Math.sign(-${x})`);
num('math.sqrt', (x) => `Math.sqrt(${x}) + ":" + Math.sqrt(16) + ":" + Math.sqrt(-1)`);
num('math.cbrt', (x) => `Math.cbrt(${x}) + ":" + Math.cbrt(27)`);
num('math.pow', (x) => `Math.pow(${x}, 3) + ":" + Math.pow(2, 0.5) + ":" + Math.pow(${x}, -1) + ":" + Math.pow(NaN, 0)`);
num('math.min-max', (x) => `Math.max(1, ${x}, 3) + ":" + Math.min(1, ${x}, 3) + ":" + Math.max() + ":" + Math.min() + ":" + Math.max(1, "7", ${x}) + ":" + Math.max(1, NaN)`);
num('math.hypot', (x) => `Math.hypot(3, 4) + ":" + Math.hypot(${x}, 12)`);
num('math.log', (x) => `Math.log(${x}) + ":" + Math.log(1) + ":" + Math.log(0)`);
num('math.log2', (x) => `Math.log2(${x}) + ":" + Math.log2(8)`);
num('math.log10', (x) => `Math.log10(${x}) + ":" + Math.log10(1000)`);
num('math.log1p', (x) => `Math.log1p(${x})`);
num('math.exp', (x) => `Math.exp(${x}) + ":" + Math.exp(0)`);
num('math.expm1', (x) => `Math.expm1(${x} / 10)`);
num('math.sin', (x) => `Math.sin(${x}) + ":" + Math.sin(0)`);
num('math.cos', (x) => `Math.cos(${x}) + ":" + Math.cos(0)`);
num('math.tan', (x) => `Math.tan(${x})`);
num('math.asin', (x) => `Math.asin(${x} / 20) + ":" + Math.asin(2)`);
num('math.acos', (x) => `Math.acos(${x} / 20)`);
num('math.atan', (x) => `Math.atan(${x})`);
num('math.atan2', (x) => `Math.atan2(${x}, 3) + ":" + Math.atan2(0, -1)`);
num('math.sinh', (x) => `Math.sinh(${x} / 4)`);
num('math.cosh', (x) => `Math.cosh(${x} / 4)`);
num('math.tanh', (x) => `Math.tanh(${x} / 4)`);
num('math.asinh-acosh-atanh', (x) => `Math.asinh(${x}) + ":" + Math.acosh(${x} + 8) + ":" + Math.atanh(${x} / 20)`);
num('math.fround', (x) => `Math.fround(${x} / 3) + ":" + Math.fround(5.5)`);
num('math.imul', (x) => `Math.imul(${x} * 100000, 100000) + ":" + Math.imul(0xffffffff, 5)`);
num('math.clz32', (x) => `Math.clz32(${x}) + ":" + Math.clz32(0)`);
num('math.constants', (x) => `(Math.PI * ${x}) + ":" + Math.E + ":" + Math.LN2 + ":" + Math.SQRT2 + ":" + Math.LOG10E`);
num('math.clamp-idiom', (x) => `Math.min(Math.max(${x}, 6), 8) + ":" + Math.round(${x} * 100 / 7) / 100`);

// ---------------------------------------------------------------------------
group('JSON');

num('json.parse-object', (x) => `JSON.parse('{"a": ' + ${x} + ', "b": [1, 2, {"c": "d"}]}').a + JSON.parse('{"b": [1, 2, {"c": "d"}]}').b[2].c`);
num('json.parse-primitives', (x) => `JSON.parse("" + ${x}) + ":" + JSON.parse('"s"') + ":" + JSON.parse("null") + ":" + JSON.parse("true") + ":" + JSON.parse(" [1, 2] ").length + ":" + JSON.parse("-1.5e2")`);
str('json.parse-dynamic-text', (x) => `(function (s) { try { return typeof JSON.parse(s); } catch (e) { return e.name; } })(${x})`);
num('json.parse-reviver', (x) => `JSON.parse('{"a": 1, "b": {"c": 2}}', function (k, v) { return typeof v === "number" ? v * ${x} : v; }).b.c`);
num('json.parse-key-order', (x) => `Object.keys(JSON.parse('{"b": 1, "2": 1, "a": 1, "1": ' + ${x} + '}')).join(",")`);
num('json.parse-invalid', (x) => `(function () { try { JSON.parse("{bad " + ${x}); return "parsed"; } catch (e) { return e.name; } })()`);
num('json.stringify-primitives', (x) => `JSON.stringify(${x}) + JSON.stringify("a\\"b\\n") + JSON.stringify(null) + JSON.stringify(true) + JSON.stringify(NaN) + JSON.stringify(undefined) + JSON.stringify(${x} / 0)`);
num('json.stringify-nested', (x) => `JSON.stringify({ a: ${x}, b: [1, "two", { c: null, d: [true, false] }], e: { f: {} } })`);
arr('json.stringify-array', (x) => `JSON.stringify(${x}) + JSON.stringify({ list: ${x}, n: ${x}.length })`);
str('json.stringify-string', (x) => `JSON.stringify(${x}) + JSON.stringify({ s: ${x} + "\\u2028\\t\\u0001\\u00e9\\u{1F600}" })`);
num('json.stringify-skips', (x) => `JSON.stringify({ a: undefined, b: function () {}, c: ${x}, d: Symbol("s") }) + JSON.stringify([undefined, function () {}, ${x}])`);
num('json.stringify-replacer-fn', (x) => `JSON.stringify({ a: ${x}, b: { c: 2, d: "s" } }, function (k, v) { return typeof v === "number" ? v + 1 : v; })`);
num('json.stringify-replacer-array', (x) => `JSON.stringify({ a: ${x}, b: 2, c: { a: 3, z: 4 } }, ["a", "c"])`);
num('json.stringify-indent', (x) => `JSON.stringify({ a: ${x}, b: [1, { c: 2 }], d: [], e: {} }, null, 2) + JSON.stringify([${x}], null, "--")`);
num('json.stringify-toJSON', (x) => `JSON.stringify({ a: { toJSON: function (k) { return k + ${x}; } }, d: new Date(0) })`);
num('json.stringify-key-order', (x) => `JSON.stringify({ b: 1, 2: 1, a: 1, 1: ${x} })`);
num('json.roundtrip', (x) => `(function (o) { var c = JSON.parse(JSON.stringify(o)); c.b.push(4); return o.b.length + ":" + c.b.length + ":" + c.a; })({ a: ${x}, b: [1, 2, 3] })`);
num('json.stringify-cycle-throws', (x) => `(function () { var o = { v: ${x} }; o.self = o; try { return JSON.stringify(o); } catch (e) { return e.name; } })()`);
num('json.stringify-class-instance', (x) => `JSON.stringify(new P(${x}))`, { setup: 'class P { #hidden = 1; constructor(a) { this.a = a; this.b = [a]; } get g() { return 1; } }' });
num('json.stringify-map-set-bigint', (x) => `(function () { try { return JSON.stringify({ m: new Map([[1, ${x}]]), s: new Set([1]) }) + JSON.stringify(1n); } catch (e) { return e.name; } })()`);

// ---------------------------------------------------------------------------
group('RegExp');

str('regexp.test', (x) => `/o w/.test(${x}) + ":" + /^h.*d$/.test(${x}) + ":" + /\\d/.test(${x})`);
str('regexp.exec-groups', (x) => `(function (s) { var m = /(\\w+)\\s(\\w+)/.exec(s); return m ? m[1] + "|" + m[2] + "|" + m.index + "|" + m.input.length : "none"; })(${x})`);
str('regexp.named-groups', (x) => `(function (s) { var m = /(?<first>\\w+)\\s(?<second>\\w+)/.exec(s); return m ? m.groups.second + "," + m.groups.first : "none"; })(${x})`);
str('regexp.optional-group-undefined', (x) => `(function (s) { var m = /(h)?(e)?(z)?/.exec(s); return m[1] + ":" + m[2] + ":" + m[3] + ":" + m.length; })(${x})`);
str('regexp.flag-g-lastIndex', (x) => `(function (s) { var re = /o/g; var out = ""; var m; while ((m = re.exec(s)) !== null) out += m.index + "@" + re.lastIndex + ";"; return out + re.lastIndex; })(${x})`);
str('regexp.flag-i', (x) => `/HELLO|foo/i.test(${x}) + ":" + ${x}.replace(/O/gi, "0")`);
str('regexp.flag-m', (x) => `(${x} + "\\nsecond line").match(/^\\w+$/gm) + ":" + (${x} + "\\nsecond").replace(/^/gm, "> ")`);
str('regexp.flag-s', (x) => `/o.s/s.test(${x} + "o\\ns") + ":" + /o.s/.test(${x} + "o\\ns")`);
str('regexp.flag-u', (x) => `/^.$/u.test("\\u{1F600}") + ":" + /^.$/.test("\\u{1F600}") + ":" + /\\u{1F600}/u.test(${x} + "\\u{1F600}") + ":" + /\\p{Lu}/u.test(${x})`);
str('regexp.flag-y', (x) => `(function (s) { var re = /o/y; re.lastIndex = 4; var a = re.test(s); var b = re.lastIndex; re.lastIndex = 0; return a + ":" + b + ":" + re.test(s) + ":" + re.lastIndex; })(${x})`);
str('regexp.test-global-stateful', (x) => `(function (s) { var re = /l/g; return re.test(s) + ":" + re.lastIndex + ":" + re.test(s) + ":" + re.lastIndex + ":" + re.test("x") + ":" + re.lastIndex; })(${x})`);
str('regexp.replace-dollar', (x) => `${x}.replace(/(\\w+) (\\w+)/, "$2, $1") + ":" + ${x}.replace(/o/g, "[$&]") + ":" + ${x}.replace(/ /, "$\`|$'")`);
str('regexp.replace-named', (x) => `${x}.replace(/(?<a>\\w)(?<b>\\w)/g, "$<b>$<a>")`);
str('regexp.split', (x) => `${x}.split(/\\s*o\\s*/).join("|") + ":" + ${x}.split(/(?=o)/).length`);
str('regexp.match-global', (x) => `(${x}.match(/\\w+/g) || []).length + ":" + (${x}.match(/[lo]+/g) || []).join(",")`);
str('regexp.matchAll-groups', (x) => `[...${x}.matchAll(/(?<c>[a-z])(?<d>[a-z])/g)].map(function (m) { return m.groups.d + m.groups.c + m.index; }).join(",")`);
str('regexp.lookaround', (x) => `${x}.replace(/o(?= )/g, "0") + ":" + ${x}.replace(/(?<=l)o/g, "0") + ":" + ${x}.replace(/(?<!l)o/g, "#") + ":" + /l(?!l)/.exec(${x} + "l").index`);
str('regexp.backreference', (x) => `/(l)\\1/.test(${x}) + ":" + ${x}.replace(/(\\w)\\1/g, "<$1$1>") + ":" + /(?<q>o).*\\k<q>/.test(${x})`);
str('regexp.char-classes', (x) => `${x}.replace(/[^a-h\\s]/g, "*") + ":" + ${x}.replace(/\\b\\w/g, "^") + ":" + ${x}.replace(/\\W+/g, "_") + ":" + ${x}.replace(/[\\d\\s]/g, "")`);
str('regexp.quantifiers', (x) => `${x}.match(/l{2}/) + ":" + ${x}.match(/o.*o/) + ":" + ${x}.match(/o.*?o/) + ":" + ${x}.match(/l{1,}?/) + ":" + ${x}.match(/x*/)[0].length`);
str('regexp.alternation-anchors', (x) => `${x}.replace(/^hello|world$/g, "X") + ":" + /^(?:ab|hello world|Foo Bar)$/.test(${x})`);
str('regexp.source-flags', (x) => `(function () { var re = /a+b/gi; return re.source + ":" + re.flags + ":" + re.global + ":" + re.sticky + ":" + String(re) + ":" + ${x}.length; })()`);
str('regexp.constructor-from-string', (x) => `new RegExp("o\\\\s*w", "i").test(${x}) + ":" + new RegExp("[" + "lo" + "]+", "g")[Symbol.replace](${x}, "_")`);
str('regexp.constructor-dynamic-pattern', (x) => `(function (s) { try { return "hello world foo".replace(new RegExp(s.slice(0, 2), "g"), "#"); } catch (e) { return e.name; } })(${x})`);
str('regexp.sticky-tokenizer', (x) => `(function (s) { var re = /\\s*(\\d+|[a-zA-Z]+|.)/y; var out = []; var m; while (re.lastIndex < s.length && (m = re.exec(s))) out.push(m[1]); return out.join("|"); })(${x})`);
str('regexp.exec-no-match-null', (x) => `(/zzz/.exec(${x}) === null) + ":" + (${x}.match(/zzz/) === null) + ":" + (${x}.match(/zzz/g) === null)`);
str('regexp.unicode-escapes', (x) => `/\\u0068/.test(${x}) + ":" + /\\x68/.test(${x}) + ":" + /[\\u0041-\\u005a]/.test(${x}) + ":" + /\\p{L}+/u.exec(${x} + "!")[0]`);
str('regexp.match-indices-d', (x) => `(function (s) { var m = /(o)/d.exec(s + "o"); return m.indices[1][0] + ":" + m.indices[0][1]; })(${x})`);

// ---------------------------------------------------------------------------
group('Collections');

num('map.set-get-has', (x) => `(function () { var m = new Map(); m.set("a", ${x}); m.set("b", 2); m.set("a", m.get("a") + 1); return m.get("a") + ":" + m.has("b") + ":" + m.has("z") + ":" + m.get("z") + ":" + m.size; })()`);
num('map.from-entries', (x) => `new Map([["a", ${x}], ["b", 2]]).get("a") + new Map([[1, "x"]]).size`);
num('map.delete-clear', (x) => `(function () { var m = new Map([["a", ${x}], ["b", 2]]); var d = m.delete("a"); var d2 = m.delete("zz"); var n = m.size; m.clear(); return d + ":" + d2 + ":" + n + ":" + m.size; })()`);
num('map.iteration-order', (x) => `(function () { var m = new Map(); m.set("z", 1); m.set("a", ${x}); m.set("z", 3); m.delete("a"); m.set("a", 4); var s = ""; for (var [k, v] of m) s += k + v; return s; })()`);
num('map.keys-values-entries', (x) => `(function () { var m = new Map([["a", ${x}], ["b", 2]]); return [...m.keys()].join("") + ":" + [...m.values()].join("") + ":" + [...m.entries()].length + ":" + [...m][1][0]; })()`);
num('map.forEach', (x) => `(function () { var s = ""; new Map([["a", ${x}], ["b", 2]]).forEach(function (v, k) { s += k + "=" + v + ";"; }); return s; })()`);
num('map.object-keys', (x) => `(function () { var k1 = {}, k2 = {}; var m = new Map([[k1, ${x}], [k2, 2]]); return m.get(k1) + ":" + m.get(k2) + ":" + m.get({}) + ":" + m.size; })()`);
num('map.key-equality', (x) => `(function () { var m = new Map(); m.set(NaN, "nan"); m.set(0, "zero"); m.set("1", "str"); m.set(1, "num" + ${x}); return m.get(NaN) + ":" + m.get(-0) + ":" + m.get(1) + ":" + m.get("1") + ":" + m.size; })()`);
arr('map.count-occurrences', (x) => `(function (a) { var m = new Map(); for (var v of a.concat(a, [1])) m.set(v, (m.get(v) || 0) + 1); var s = ""; m.forEach(function (c, v) { s += v + "x" + c + ","; }); return s; })(${x})`);
num('map.chained-set', (x) => `new Map().set(1, ${x}).set(2, 3).get(1)`);
num('set.add-has-size', (x) => `(function () { var s = new Set(); s.add(${x}).add(2).add(${x}); return s.has(${x}) + ":" + s.has(99) + ":" + s.size; })()`);
arr('set.dedupe-spread', (x) => `[...new Set(${x}.concat(${x}, [1, 1]))].join(",")`);
num('set.delete-clear', (x) => `(function () { var s = new Set([1, ${x}, 3]); var d = s.delete(${x}); var n = s.size; s.clear(); return d + ":" + n + ":" + s.size; })()`);
num('set.iteration-order', (x) => `(function () { var s = new Set(["z", "a"]); s.add("k" + ${x}); s.delete("z"); s.add("z"); var out = ""; for (var v of s) out += v + ","; return out; })()`);
num('set.forEach', (x) => `(function () { var t = 0; new Set([1, ${x}, 1]).forEach(function (v) { t = t * 10 + v; }); return t; })()`);
str('set.from-string', (x) => `new Set(${x}).size + ":" + [...new Set(${x})].join("")`);
arr('set.from-array-size', (x) => `new Set(${x}).size + ":" + Array.from(new Set(${x})).length`);
num('set.operations', (x) => `(function () { var a = new Set([1, 2, ${x}]), b = new Set([2, ${x}, 7]); return [...a.union(b)].join("") + ":" + [...a.intersection(b)].join("") + ":" + [...a.difference(b)].join("") + ":" + a.isSubsetOf(b); })()`);
num('weakmap.basics', (x) => `(function () { var k = {}, k2 = {}; var w = new WeakMap(); w.set(k, ${x}); return w.get(k) + ":" + w.has(k) + ":" + w.has(k2) + ":" + w.get(k2) + ":" + w.delete(k) + ":" + w.has(k); })()`);
num('weakmap.private-data-pattern', (x) => `(function () { var priv = new WeakMap(); function P(v) { priv.set(this, { v: v }); } P.prototype.get = function () { return priv.get(this).v * 2; }; return new P(${x}).get(); })()`);
num('weakset.basics', (x) => `(function () { var k = {}; var w = new WeakSet([k]); return w.has(k) + ":" + w.has({}) + ":" + ${x}; })()`);

// ---------------------------------------------------------------------------
group('Symbols');

num('symbol.description', (x) => `Symbol("d" + ${x}).description + ":" + Symbol().description + ":" + Symbol("t").toString()`);
num('symbol.typeof-unique', (x) => `(function () { var a = Symbol("s"), b = Symbol("s"); return typeof a + ":" + (a === b) + ":" + (a === a) + ":" + ${x}; })()`);
num('symbol.as-key', (x) => `(function () { var k = Symbol("k"); var o = { [k]: ${x}, plain: 1 }; return o[k] + ":" + Object.keys(o).length + ":" + Object.getOwnPropertySymbols(o).length + ":" + JSON.stringify(o); })()`);
num('symbol.for-registry', (x) => `(Symbol.for("app" + ${x}) === Symbol.for("app" + ${x})) + ":" + Symbol.keyFor(Symbol.for("app" + ${x})) + ":" + Symbol.keyFor(Symbol("x"))`);
num('symbol.iterator-custom', (x) => `(function (n) { var it = { [Symbol.iterator]: function () { var i = 0; return { next: function () { return i < 3 ? { value: i++ * n, done: false } : { value: undefined, done: true }; } }; } }; var s = ""; for (var v of it) s += v + ","; return s + [...it].length; })(${x})`);
num('symbol.iterator-generator-method', (x) => `(function (n) { var o = { *[Symbol.iterator]() { yield n; yield n + 1; } }; var [a, b] = o; return a + ":" + b + ":" + Array.from(o).length; })(${x})`);
num('symbol.toStringTag', (x) => `Object.prototype.toString.call({ [Symbol.toStringTag]: "T" + ${x} }) + String(new Map()) + Object.prototype.toString.call(function* () {})`);
num('symbol.hasInstance', (x) => `(function () { var Even = { [Symbol.hasInstance]: function (v) { return v % 2 === 0; } }; return (${x} instanceof Even) + ":" + (4 instanceof Even); })()`);
num('symbol.toPrimitive-object', (x) => `(function () { var o = { [Symbol.toPrimitive]: function (hint) { return hint === "number" ? ${x} : hint + ${x}; } }; return (+o) + ":" + (o + "") + ":" + String(o) + ":" + (o * 2); })()`);
num('symbol.to-string-throws', (x) => `(function () { try { return "" + Symbol("s" + ${x}); } catch (e) { return e.name; } })()`);
num('symbol.well-known-identity', (x) => `(typeof Symbol.iterator) + ":" + (Symbol.iterator === Symbol.iterator) + ":" + (typeof [][Symbol.iterator]) + ":" + Symbol.iterator.toString() + ":" + Symbol.asyncIterator.description + ":" + ${x}`);

// ---------------------------------------------------------------------------
group('Iterators & generators');

num('gen.sum', (x) => `(function (n) { function* g(k) { for (var i = 0; i < k; i++) yield i * 2; } var s = 0; for (var v of g(n)) s += v; return s; })(${x})`);
num('gen.spread', (x) => `(function (n) { function* g() { yield 1; yield n; yield 3; } return [...g()].join(",") + ":" + Math.max(...g()); })(${x})`);
num('gen.yield-star', (x) => `(function (n) { function* inner() { yield "a"; yield n; return "ret"; } function* outer() { yield "start"; var r = yield* inner(); yield r; yield* [7, 8]; } return [...outer()].join(","); })(${x})`);
num('gen.early-return-finally', (x) => `(function (n) { var log = ""; function* g() { try { yield 1; yield 2; yield 3; } finally { log += "cleanup"; } } for (var v of g()) { log += v; if (v * 3 >= n) break; } return log; })(${x})`);
num('gen.manual-next', (x) => `(function (n) { function* g() { yield n; yield n + 1; return "end"; } var it = g(); var a = it.next(), b = it.next(), c = it.next(), d = it.next(); return a.value + ":" + a.done + ":" + b.value + ":" + c.value + ":" + c.done + ":" + d.value + ":" + d.done; })(${x})`);
num('gen.next-with-values', (x) => `(function (n) { function* g() { var a = yield "first"; var b = yield a * 2; return a + b; } var it = g(); it.next(); var r1 = it.next(n).value; var r2 = it.next(1); return r1 + ":" + r2.value + ":" + r2.done; })(${x})`);
num('gen.infinite-take', (x) => `(function (n) { function* nat() { var i = 0; while (true) yield i++; } function* take(it, k) { var c = 0; for (var v of it) { if (c++ >= k) return; yield v; } } var s = 0; for (var v of take(nat(), n)) s += v; return s; })(${x})`);
num('gen.return-method', (x) => `(function (n) { function* g() { yield 1; yield 2; } var it = g(); it.next(); var r = it.return(n); var after = it.next(); return r.value + ":" + r.done + ":" + after.done; })(${x})`);
num('gen.throw-method', (x) => `(function (n) { function* g() { try { yield 1; } catch (e) { yield "caught" + e; } } var it = g(); it.next(); return it.throw(n).value; })(${x})`);
num('gen.destructure', (x) => `(function (n) { function* g() { yield n; yield n * 2; yield n * 3; } var [a, , c] = g(); return a + ":" + c; })(${x})`);
num('gen.fibonacci', (x) => `(function (n) { function* fib() { var a = 0, b = 1; for (;;) { yield a; var t = a + b; a = b; b = t; } } var out = []; for (var v of fib()) { if (out.length >= n) break; out.push(v); } return out.join(","); })(${x})`);
num('gen.pipeline', (x) => `(function (n) { function* range(k) { for (var i = 0; i < k; i++) yield i; } function* map(it, f) { for (var v of it) yield f(v); } function* filter(it, p) { for (var v of it) if (p(v)) yield v; } return [...filter(map(range(n), function (v) { return v * v; }), function (v) { return v % 2 === 0; })].join(","); })(${x})`);
arr('iter.array-iterator-manual', (x) => `(function (a) { var it = a[Symbol.iterator](); var r1 = it.next(); it.next(); it.next(); var r4 = it.next(); return r1.value + ":" + r1.done + ":" + r4.value + ":" + r4.done; })(${x})`);
num('iter.protocol-object', (x) => `(function (n) { var c = 0; var iter = { next: function () { c++; return c > 3 ? { done: true } : { done: false, value: c * n }; }, [Symbol.iterator]: function () { return this; } }; var s = 0; for (var v of iter) s += v; return s + ":" + c; })(${x})`);
num('iter.return-called-on-break', (x) => `(function (n) { var log = ""; var iter = { [Symbol.iterator]: function () { var i = 0; return { next: function () { return { done: false, value: i++ }; }, return: function () { log += "closed"; return {}; } }; } }; for (var v of iter) { if (v * 4 >= n) break; log += v; } return log; })(${x})`);
str('iter.string-iterator', (x) => `(function (s) { var it = s[Symbol.iterator](); var a = it.next(); return a.value + ":" + a.done + ":" + [...it].length; })(${x})`);
num('iter.map-entries-iterator', (x) => `(function (n) { var it = new Map([["a", n], ["b", 2]]).entries(); var e = it.next().value; return e[0] + e[1] + ":" + it.next().value[0] + ":" + it.next().done; })(${x})`);
num('iter.helpers', (x) => `(function (n) { function* g() { yield 1; yield 2; yield 3; yield 4; } return g().map(function (v) { return v * n; }).filter(function (v) { return v % 2 === 0; }).take(2).toArray().join(","); })(${x})`);

// ---------------------------------------------------------------------------
group('Date');

num('date.epoch-getTime', (x) => `new Date(0).getTime() + ${x}`);
num('date.from-ms-utc-fields', (x) => `(function (d) { return d.getUTCFullYear() + "-" + d.getUTCMonth() + "-" + d.getUTCDate() + " " + d.getUTCDay() + " " + d.getUTCHours(); })(new Date(${x} * 86400000 * 400 + 3600000))`);
num('date.local-constructor-fields', (x) => `(function (d) { return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes(); })(new Date(2020, 0, ${x}, 13, 45))`);
num('date.UTC', (x) => `Date.UTC(2020, 0, ${x}) + ":" + Date.UTC(1970, 0, 1) + ":" + Date.UTC(2020, 11, 31, 23, 59, 59, 999)`);
num('date.toISOString', (x) => `new Date(Date.UTC(2020, 1, ${x}, 3, 4, 5, 6)).toISOString()`);
num('date.parse-iso', (x) => `new Date("2020-01-02T03:04:05Z").getTime() + ${x} + ":" + Date.parse("2020-01-02T03:04:05.123+02:00") + ":" + Date.parse("2020-01-02")`);
num('date.invalid', (x) => `isNaN(new Date("nonsense" + ${x}).getTime()) + ":" + String(new Date(NaN)) + ":" + new Date(8.64e15 + ${x}).getTime()`);
num('date.setters-arith', (x) => `(function (d) { d.setUTCDate(d.getUTCDate() + ${x} * 10); d.setUTCHours(25); return d.toISOString() + ":" + (d - new Date(Date.UTC(2020, 0, 1))); })(new Date(Date.UTC(2020, 0, 31)))`);
num('date.toJSON-valueOf', (x) => `JSON.stringify(new Date(${x} * 1000)) + ":" + (+new Date(${x})) + ":" + new Date(${x}).valueOf() + ":" + typeof (new Date(${x}) + 1)`);

// ---------------------------------------------------------------------------
group('Typed arrays');

num('typed.uint8-wrap', (x) => `(function () { var a = new Uint8Array(4); a[0] = ${x} * 60; a[1] = -1; a[2] = 3.7; a[9] = 1; return a[0] + ":" + a[1] + ":" + a[2] + ":" + a[3] + ":" + a[9] + ":" + a.length; })()`);
num('typed.uint8-clamped', (x) => `(function () { var a = new Uint8ClampedArray([${x} * 60, -5, 1.5, 2.5]); return a[0] + ":" + a[1] + ":" + a[2] + ":" + a[3]; })()`);
num('typed.int32-from-array', (x) => `(function () { var a = new Int32Array([${x}, 2 ** 31, -1.9, "7"]); return a[0] + ":" + a[1] + ":" + a[2] + ":" + a[3] + ":" + a.byteLength + ":" + Int32Array.BYTES_PER_ELEMENT; })()`);
num('typed.float64-float32', (x) => `(function () { var f = new Float32Array([${x} / 3]); var d = new Float64Array([${x} / 3]); return f[0] + ":" + d[0]; })()`);
num('typed.shared-buffer-views', (x) => `(function () { var buf = new ArrayBuffer(8); var u8 = new Uint8Array(buf); var u32 = new Uint32Array(buf); u32[0] = 0x01020304 + ${x}; return u8[0] + ":" + u8[3] + ":" + buf.byteLength + ":" + u32.length; })()`);
arr('typed.from-list-methods', (x) => `(function (l) { var a = Uint8Array.from(l); return a.map(function (v) { return v * 100; }).join(",") + ":" + a.reduce(function (p, v) { return p + v; }, 0) + ":" + a.indexOf(2) + ":" + Array.from(a.slice(1)).length; })(${x})`);
num('typed.set-subarray', (x) => `(function () { var a = new Uint16Array(6); a.set([1, ${x}, 3], 2); var s = a.subarray(2, 5); s[0] = 99; return a.join(",") + ":" + s.length + ":" + a.fill(7, 4).join(""); })()`);
num('typed.sort-numeric', (x) => `new Int16Array([10, ${x}, 100, -1]).sort().join(",") + ":" + [10, ${x}, 100, -1].sort().join(",")`);
num('typed.dataview', (x) => `(function () { var dv = new DataView(new ArrayBuffer(16)); dv.setInt16(0, -2 - ${x}); dv.setUint32(2, 0xdeadbeef, true); dv.setFloat64(8, ${x} / 4); return dv.getUint16(0) + ":" + dv.getUint8(2).toString(16) + ":" + dv.getUint32(2, true).toString(16) + ":" + dv.getUint32(2).toString(16) + ":" + dv.getFloat64(8) + ":" + dv.byteLength; })()`);
num('typed.arraybuffer-slice', (x) => `(function () { var b = new Uint8Array([1, 2, ${x}, 4]).buffer; var c = new Uint8Array(b.slice(1, 3)); return c.length + ":" + c[1] + ":" + ArrayBuffer.isView(c) + ":" + (c.buffer !== b); })()`);
num('typed.for-of-spread', (x) => `(function () { var s = 0; for (var v of new Uint8Array([1, ${x}, 3])) s += v; return s + ":" + [...new Uint8Array([${x}, 257])].join(","); })()`);
str('typed.text-encoder-idiom', (x) => `(function (s) { var bytes = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff; var h = 0; for (var j = 0; j < bytes.length; j++) h = (h * 31 + bytes[j]) >>> 0; return h; })(${x})`);

// ---------------------------------------------------------------------------
group('Reflect & Proxy');

num('reflect.ownKeys', (x) => `(function () { var s = Symbol("s"); return Reflect.ownKeys({ b: 1, [s]: 2, 1: 3, ["a" + ${x}]: 4 }).length + ":" + String(Reflect.ownKeys({ b: 1, 1: 3, ["a" + ${x}]: 4 })); })()`);
num('reflect.get-set-has', (x) => `(function () { var o = { a: ${x} }; var ok = Reflect.set(o, "b", 2); return Reflect.get(o, "a") + ":" + ok + ":" + Reflect.has(o, "b") + ":" + Reflect.has(o, "zz") + ":" + Reflect.deleteProperty(o, "a") + ":" + ("a" in o); })()`);
num('reflect.apply-construct', (x) => `(function () { function P(a) { this.a = a; } return Reflect.apply(function (a, b) { return this.k + a + b; }, { k: 1 }, [${x}, 3]) + ":" + Reflect.construct(P, [${x}]).a + ":" + (Reflect.construct(P, [1]) instanceof P); })()`);
num('reflect.getPrototypeOf-defineProperty', (x) => `(function () { var o = {}; var ok = Reflect.defineProperty(o, "a", { value: ${x} }); var ok2 = Reflect.defineProperty(Object.freeze({}), "a", { value: 1 }); return ok + ":" + ok2 + ":" + o.a + ":" + (Reflect.getPrototypeOf(o) === Object.prototype); })()`);
num('proxy.get-trap', (x) => `new Proxy({ a: ${x} }, { get: function (t, k) { return k in t ? t[k] * 2 : "no:" + String(k); } }).a + ":" + new Proxy({}, { get: function (t, k) { return "no:" + k; } }).zz`);
num('proxy.set-trap', (x) => `(function () { var log = ""; var p = new Proxy({}, { set: function (t, k, v) { log += k + "=" + v + ";"; t[k] = v * 2; return true; } }); p.a = ${x}; p.b = 1; return log + p.a + ":" + p.b; })()`);
num('proxy.has-delete-ownKeys', (x) => `(function () { var p = new Proxy({ a: 1, _hid: ${x} }, { has: function (t, k) { return k[0] !== "_" && k in t; }, ownKeys: function (t) { return Reflect.ownKeys(t).filter(function (k) { return k[0] !== "_"; }); }, deleteProperty: function (t, k) { return false; } }); return ("a" in p) + ":" + ("_hid" in p) + ":" + Object.keys(p).join(",") + ":" + delete p.a + ":" + p._hid; })()`);
num('proxy.passthrough', (x) => `(function () { var t = { a: ${x}, f: function () { return this.a + 1; } }; var p = new Proxy(t, {}); p.b = 2; return p.a + ":" + t.b + ":" + p.f() + ":" + (p === t); })()`);
num('proxy.apply-construct', (x) => `(function () { var f = new Proxy(function (a) { return a + 1; }, { apply: function (t, th, args) { return t(args[0]) * 10; } }); return f(${x}) + ":" + typeof f; })()`);
num('proxy.default-values-pattern', (x) => `(function () { var withDefault = function (o, d) { return new Proxy(o, { get: function (t, k, r) { return Reflect.has(t, k) ? Reflect.get(t, k, r) : d; } }); }; var c = withDefault({ a: ${x} }, 0); return c.a + c.b + c.c; })()`);
num('proxy.revocable', (x) => `(function () { var r = Proxy.revocable({ a: ${x} }, {}); var v = r.proxy.a; r.revoke(); try { return r.proxy.a; } catch (e) { return v + ":" + e.name; } })()`);

// ---------------------------------------------------------------------------
group('Errors');

num('error.message', (x) => `new Error("boom " + ${x}).message + ":" + new Error().message.length + ":" + String(new Error("s"))`);
num('error.name', (x) => `new TypeError("t").name + ":" + new RangeError("r" + ${x}).name + ":" + new Error("e").name + ":" + Object.prototype.toString.call(new Error("x"))`);
num('error.instanceof', (x) => `(function () { var e = new TypeError("t" + ${x}); return (e instanceof TypeError) + ":" + (e instanceof Error) + ":" + (e instanceof RangeError) + ":" + (e.constructor === TypeError); })()`);
num('error.custom-class', (x) => `(function () { try { throw new MyErr("bad", ${x}); } catch (e) { return e.name + ":" + e.message + ":" + e.code + ":" + (e instanceof MyErr) + ":" + (e instanceof Error) + ":" + String(e); } })()`, {
  setup: 'class MyErr extends Error { constructor(m, code) { super(m); this.name = "MyErr"; this.code = code; } }',
});
num('error.custom-class-hierarchy', (x) => `(function (v) { try { if (v > 6) throw new NotFound("x" + v); throw new Invalid("y" + v); } catch (e) { return (e instanceof Http) + ":" + (e instanceof NotFound) + ":" + e.status + ":" + e.message; } })(${x})`, {
  setup: 'class Http extends Error { constructor(s, m) { super(m); this.status = s; } } class NotFound extends Http { constructor(m) { super(404, m); } } class Invalid extends Http { constructor(m) { super(400, m); } }',
});
num('error.typeerror-call-undefined', (x) => `(function () { var o = { v: ${x} }; try { return o.nope(); } catch (e) { return e.name + ":" + (e instanceof TypeError); } })()`);
num('error.typeerror-null-property', (x) => `(function () { var o = ${x} > 100 ? {} : null; try { return o.a; } catch (e) { return e.constructor.name + ":" + (e instanceof TypeError); } })()`);
num('error.typeerror-message', (x) => `(function () { var o = ${x} > 100 ? {} : null; try { return o.a; } catch (e) { return e.message; } })()`);
num('error.referenceerror', (x) => `(function () { try { return notDefinedAnywhere + ${x}; } catch (e) { return e.name + ":" + e.message; } })()`);
num('error.rangeerror-array-length', (x) => `(function () { try { return new Array(-1 - ${x}).length; } catch (e) { return e.name + ":" + e.message; } })()`);
num('error.cause', (x) => `(function () { var e = new Error("outer", { cause: new Error("inner" + ${x}) }); return e.cause.message + ":" + ("cause" in new Error("x")); })()`);
num('error.throw-non-error', (x) => `(function () { try { throw { code: ${x}, toString: function () { return "obj"; } }; } catch (e) { return e.code + ":" + e + ":" + (e instanceof Error); } })()`);
num('error.catch-rethrow-finally-order', (x) => `(function (v) { var log = []; function f() { try { log.push("try"); throw new Error("e" + v); } catch (e) { log.push("catch"); throw e; } finally { log.push("finally"); } } try { f(); } catch (e) { log.push(e.message); } return log.join(">"); })(${x})`);
num('error.optional-catch-binding', (x) => `(function () { try { null.x; } catch { return "caught" + ${x}; } })()`);
num('error.aggregate', (x) => `(function () { var e = new AggregateError([new Error("a"), new TypeError("b" + ${x})], "many"); return e.errors.length + ":" + e.errors[1].message + ":" + e.name + ":" + e.message; })()`);
// The original throws whatever the operand (5 and 9 are both over 4): the
// loop context has no constant to compare with, and is n/a by itself.
num('error.uncaught-throw', (x) => `(function (v) { if (v > 4) throw new RangeError("too big: " + v); return v; })(${x})`);
// (Here the engine throws, not a `throw`: the read that throws is as far as
// the program reduces, so where the expectation is `return <constant>` or
// "nothing but the branch" there is nothing to expect. In `try` the answer is
// the constant "caught".)
num('error.uncaught-builtin-throw', (x) => `(function (v) { return null[v]; })(${x})`, { na: ['static', 'branch', 'helper', 'closure'] });
num('error.stack-is-string', (x) => `typeof new Error("s" + ${x}).stack`);

// ---------------------------------------------------------------------------
group('Globals');

num('global.globalThis-builtins', (x) => `(globalThis.Math === Math) + ":" + typeof globalThis + ":" + globalThis.parseInt("12") + ":" + (globalThis.globalThis === globalThis) + ":" + ${x}`);
num('global.undefined-nan-infinity', (x) => `(globalThis.undefined === undefined) + ":" + (NaN !== NaN) + ":" + (Infinity > ${x}) + ":" + typeof NaN + ":" + (undefined == null) + ":" + (undefined === null)`);
num('global.typeof-undeclared', (x) => `typeof notDeclaredAnywhere + ":" + (typeof notDeclaredAnywhere === "undefined") + ":" + ${x}`);
num('global.typeof-builtins', (x) => `typeof Math + typeof JSON + typeof Array + typeof Symbol + typeof Promise + typeof Map + typeof parseInt + typeof globalThis.Object + ${x}`);
num('global.encodeURIComponent', (x) => `encodeURIComponent("a b&c=" + ${x} + "/\\u00e9") + ":" + decodeURIComponent("%E2%82%AC%20" + ${x}) + ":" + encodeURI("a b/" + ${x} + "?q=1")`);
num('global.boolean-conversion', (x) => `Boolean(${x}) + ":" + Boolean("") + ":" + Boolean("0") + ":" + Boolean([]) + ":" + !!NaN + ":" + !!null + ":" + !!{} + ":" + Boolean(${x} - ${x})`);
num('global.isNaN-parse-chain', (x) => `(function (s) { var n = parseInt(s, 10); return isNaN(n) ? "nan" : n * 2; })("" + ${x})`);

// ---------------------------------------------------------------------------
group('Misc');

num('misc.getter-side-effect-order', (x) => `(function (v) { var log = ""; var o = { get a() { log += "a"; return v; }, get b() { log += "b"; return 2; } }; var r = o.b + o.a * o.b; return log + r; })(${x})`);
num('misc.computed-key-eval-order', (x) => `(function (v) { var log = ""; function t(a) { log += a; return a; } var o = { [t("k1")]: t(v), [t("k2")]: t(2) }; return log + ":" + o.k1; })(${x})`);
num('misc.call-arg-eval-order', (x) => `(function (v) { var log = ""; function t(a) { log += a; return a; } function f(a, b, c) { return a + b + c; } var r = f(t(v), t(2), t(3)); return log + ":" + r; })(${x})`);
num('misc.assignment-eval-order', (x) => `(function (v) { var a = [0, 0, 0]; var i = 0; a[i++] = i + v; a[i] = i++; return a.join(",") + ":" + i; })(${x})`);
num('misc.toString-valueOf-order', (x) => `(function (v) { var log = ""; var o = { valueOf: function () { log += "v"; return v; }, toString: function () { log += "s"; return "str"; } }; var r = o + 1; var r2 = String(o); var r3 = o + ""; return log + ":" + r + ":" + r2 + ":" + r3; })(${x})`);
num('misc.state-machine', (x) => `(function (n) { var state = "a", steps = ""; for (var i = 0; i < 6; i++) { switch (state) { case "a": state = n > 6 ? "b" : "c"; break; case "b": state = "c"; break; case "c": state = "a"; break; } steps += state; } return steps; })(${x})`);
num('misc.interpreter-loop', (x) => `(function (v) { var prog = [["push", v], ["push", 3], ["mul"], ["push", 1], ["add"], ["dup"], ["add"]]; var st = []; for (var pc = 0; pc < prog.length; pc++) { var op = prog[pc]; switch (op[0]) { case "push": st.push(op[1]); break; case "add": st.push(st.pop() + st.pop()); break; case "mul": st.push(st.pop() * st.pop()); break; case "dup": st.push(st[st.length - 1]); break; } } return st.pop(); })(${x})`);
str('misc.string-builder-format', (x) => `(function (tpl, vals) { return tpl.replace(/\\{(\\w+)\\}/g, function (m, k) { return k in vals ? vals[k] : m; }); })("{greeting}, {name}! {missing}", { greeting: "Hi", name: ${x} })`);
num('misc.object-dispatch-table', (x) => `(function (v) { var ops = { 5: function (a) { return a + 1; }, 9: function (a) { return a * 2; } }; var f = ops[v] || function (a) { return -a; }; return f(10); })(${x})`);
num('misc.linked-list', (x) => `(function (n) { var head = null; for (var i = 0; i < 4; i++) head = { v: i * n, next: head }; var s = ""; for (var p = head; p; p = p.next) s += p.v + ","; return s; })(${x})`);
num('misc.matrix-multiply', (x) => `(function (k) { var a = [[1, 2], [3, 4]], b = [[k, 0], [1, k]]; var c = [[0, 0], [0, 0]]; for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) for (var m = 0; m < 2; m++) c[i][j] += a[i][m] * b[m][j]; return c[0].join(",") + ";" + c[1].join(","); })(${x})`);
num('misc.label-as-statement', (x) => `(function (v) { var r = 0; a: b: for (;;) { r = v; break a; } return r; })(${x})`);
num('misc.void-iife-comma-chain', (x) => `(function (v) { var a = (v++, v++, v); var b = void (v = 100); return a + ":" + b + ":" + v; })(${x})`);
num('misc.with-statement', (x) => `(function (o) { with (o) { return a + b; } })({ a: ${x}, b: 2 })`);
num('misc.indirect-eval', (x) => `(0, eval)("1 + " + ${x})`);
num('misc.function-constructor', (x) => `new Function("a", "return a * 2")(${x})`);
num('misc.getter-on-class-with-cache', (x) => `(function () { var calls = 0; var o = { get v() { calls++; delete this.v; return (this.v = ${x} * 2); } }; return o.v + o.v + ":" + calls; })()`);
num('misc.promise-sync-part', (x) => `(function (v) { var log = "a"; new Promise(function (res) { log += "b"; res(v); }).then(function () { log += "never-before-return"; }); log += "c"; return log + v; })(${x})`);
num('misc.async-function-returns-promise', (x) => `(function (v) { var p = (async function () { return v; })(); return (p instanceof Promise) + ":" + typeof p.then; })(${x})`);
num('misc.arguments-callee-length', (x) => `(function () { return arguments.length + ":" + (typeof arguments) + ":" + Array.isArray(arguments) + ":" + Object.prototype.toString.call(arguments); })(${x}, 2, 3)`);
num('misc.sparse-object-as-array', (x) => `(function () { var o = { length: 3, 0: "a", 2: ${x} }; return Array.prototype.join.call(o, "-") + ":" + Array.from(o).length; })()`);
num('misc.number-format-idiom', (x) => `(function (v) { var s = String(v * 1234567); var out = ""; for (var i = 0; i < s.length; i++) { if (i > 0 && (s.length - i) % 3 === 0) out += ","; out += s[i]; } return out; })(${x})`);
num('misc.bit-flags', (x) => `(function (v) { var READ = 1, WRITE = 2, EXEC = 4; var perm = READ | EXEC; if (v > 6) perm |= WRITE; perm &= ~READ; return (perm & WRITE ? "w" : "-") + (perm & EXEC ? "x" : "-") + (perm & READ ? "r" : "-") + perm; })(${x})`);
num('misc.string-hash', (x) => `(function (s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return h; })("key" + ${x})`);

module.exports = features;
