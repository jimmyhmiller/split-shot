// inputs: [0, 3, 10]
// max-lines: 45
// An infinite generator escaping to runtime: its loop goes around a runtime
// yield, so it stays a loop instead of unrolling.
function main(n) {
  function* ids(start) {
    let i = start;
    while (true) yield i++;
  }
  globalThis.ids = ids;
  const it = globalThis.ids(5);
  let s = 0;
  for (let k = 0; k < n; k++) s += it.next().value;
  return s;
}
