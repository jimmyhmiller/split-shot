// inputs: [0, 2, 5]
// async: true
// `for await`: over an async generator, over a sync iterable of promises
// (each value awaited), and a `break` awaiting the iterator's `return()`
// (the generator's `finally` runs); the interleaving with other microtasks
// must match.
async function main(n) {
  const log = [];
  async function* gen(k) {
    try {
      for (let i = 0; i < 3; i++) {
        log.push("yield " + i);
        yield i + k;
      }
    } finally {
      log.push("closed");
    }
  }
  Promise.resolve().then(() => log.push("tick1")).then(() => log.push("tick2"));
  let sum = 0;
  for await (const v of gen(n)) sum += v;
  const seen = [];
  for await (const v of [1, Promise.resolve(n), 3]) seen.push(v);
  for await (const v of gen(10)) {
    if (v > 10) break;
    seen.push(v);
  }
  return [sum, seen.join(","), log.join(",")].join("|");
}
