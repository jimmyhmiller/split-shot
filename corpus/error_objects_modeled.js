// inputs: [1, 0, 9, -1, 6]
// Error objects: `new E(message)` for the standard errors and `super(message)` of a class extending one are known objects. Their own `message`; `name`, `constructor` and `toString` from `E.prototype`; `instanceof`; conversion to a string; the `[object Error]` tag. Handed to the runtime (read for its `stack`, thrown out of main) one is the real error, made by `new E(message)`, with its properties and its subclass prototype.
class MyErr extends Error {
  constructor(m, code) { super(m); this.code = code; this.name = "MyErr"; }
  describe() { return this.name + "#" + this.code; }
}
class Plain extends RangeError {}
function main(input) {
  var out = [];
  var e = new TypeError("boom");
  out.push(e.message, e.name, e instanceof TypeError, e instanceof Error, e instanceof RangeError, e.constructor === TypeError, String(e), "" + e, `${e}`, Object.prototype.toString.call(e), typeof e, e.code, "message" in e, Object.keys(e).length, JSON.stringify(e));
  try { throw new MyErr("bad", 7); } catch (x) { out.push(x.message, x.name, x.code, x.describe(), x instanceof MyErr, x instanceof Error, x instanceof TypeError, String(x)); }
  try { null.f; } catch (y) { out.push(y instanceof TypeError, y.name); }
  var p = new Plain("p");
  out.push(p.name, p.message, p instanceof Plain, p instanceof RangeError, p instanceof Error, String(p), String(new Error()), String(new Error(undefined)), new Error(5).message, new SyntaxError().message, Object.getOwnPropertyNames(new Error("z")).includes("message"));
  var noMsg = new Error(); noMsg.name = ""; out.push(String(noMsg) === "", Object.prototype.hasOwnProperty.call(noMsg, "message"));
  function thrower() { throw new RangeError("r" + 1); }
  try { thrower(); } catch (z) { out.push(z.message.length, z.name); }
  // Handed to the runtime: real errors, with their stacks.
  var kept = new TypeError("kept"); kept.extra = input;
  var keptSub = new MyErr("sub", input);
  out.push(typeof kept.stack, kept.stack.split("\n")[0], keptSub.stack.split("\n")[0], keptSub instanceof MyErr, Object.prototype.toString.call(keptSub));
  if (input > 5) throw new MyErr("thrown " + input, input);
  if (input < 0) throw new TypeError("neg");
  return out;
}
