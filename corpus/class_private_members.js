// inputs: [0, 2, 5]
// after: [new globalThis.Priv(3).compute(2, 9), globalThis.Priv.check(new globalThis.Priv(1)), globalThis.Priv.check({}), globalThis.privInst.bump(), globalThis.privInst.bump(), globalThis.privErr()].join("|")
// Private fields, methods and accessors (instance and static), brand checks
// (a TypeError on an object without them), `#x in o`, computed field keys
// evaluated once in member order, static blocks, field initializer order.
function main(n) {
  const log = [];
  const key = () => { log.push("key"); return "dyn" + n; };
  class Priv {
    #secret = n + 7;
    static #seed = 100;
    [key()] = log.push("field") && "computed";
    plain = this.#secret * 2;
    #count = 0;
    constructor(extra) { this.extra = extra; }
    #double(k) { return (k + this.#secret) * 2; }
    get #val() { return this.#secret; }
    set #val(v) { this.#secret = v; }
    static #helper(z) { return z + Priv.#seed; }
    static { log.push("static block " + (Priv.#seed + n)); }
    compute(k, next) {
      const first = this.#double(k);
      this.#val = next;
      return [first, this.#val, this.#double(k), Priv.#helper(5), this.#val++, ++this.#val, this.#secret += 1].join(":");
    }
    bump() { return ++this.#count; }
    static check(o) { return #secret in o; }
  }
  const p = new Priv(n);
  let threw = "";
  try { Priv.prototype.compute.call({}, 1, 2); } catch (e) { threw = e instanceof TypeError ? e.message : "other"; }
  let threw2 = "";
  try { Priv.check(5); } catch (e) { threw2 = e instanceof TypeError; }
  globalThis.Priv = Priv;
  globalThis.privInst = new Priv(1);
  globalThis.privErr = () => { try { Priv.prototype.bump.call(Object.create(Priv.prototype)); return "no"; } catch (e) { return e.message; } };
  return [p.compute(1, n), p.plain, p["dyn" + n], Object.keys(p).join(","), Priv.check(p), Priv.check({}), threw, threw2, log.join(";"), Object.getOwnPropertySymbols(p).length].join("|");
}
