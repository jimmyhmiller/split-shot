// inputs: [0, 2, 5]
// async: true
// Async functions, arrows and methods: never inlined (their awaits resume
// from the microtask queue); each becomes a residual async function whose
// synchronous stretches are specialized and whose awaits stay. The log
// records the interleaving, which must match exactly.
async function main(n) {
  const log = [];
  async function step(x) {
    log.push("start " + x);
    const a = await x;
    log.push("got " + a);
    const b = await Promise.resolve(a * 2);
    return b + n;
  }
  const add = async (p, q) => (await p) + (await q);
  const obj = { async m(v) { log.push("m"); return [await v, this === obj]; } };
  const p1 = step(3);
  log.push("after call");
  const p2 = obj.m(n);
  Promise.resolve().then(() => log.push("tick"));
  const r1 = await p1;
  const r2 = await add(r1, p2.then((x) => x[0]));
  let total = 0;
  for (let i = 0; i < n; i++) total += await step(i);
  let threw = "";
  try { new add(1, 2); } catch (e) { threw = e instanceof TypeError; }
  return { log, r1, r2, total, kinds: [step.constructor.name, add.constructor.name, add.length, obj.m.name, threw] };
}
