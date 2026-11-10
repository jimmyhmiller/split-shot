// inputs: [0, 2, 5]
// async: true
// Async generators run as residual `async function*`s: awaits between
// yields, a yielded promise awaited by the yield, return, and the order of
// the consumer's steps against other microtasks.
async function main(n) {
  const log = [];
  async function* gen(k) {
    log.push("start");
    const a = await Promise.resolve(k + 1);
    yield a;
    yield Promise.resolve(a * 2);
    log.push("after");
    return k * 10;
  }
  const obj = { async *ag() { yield "obj-ag"; } };
  const it = gen(n);
  Promise.resolve().then(() => log.push("tick"));
  const r1 = await it.next();
  const r2 = await it.next();
  const r3 = await it.next();
  const r4 = await it.next();
  const o = await obj.ag().next();
  return [JSON.stringify([r1, r2, r3, r4]), o.value, log.join(","), Object.prototype.toString.call(it)].join("|");
}
