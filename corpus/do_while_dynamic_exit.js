// inputs: [0, 1, 2, 5]
// max-lines: 40
// A do..while whose test is dynamic (and has a side effect) generalizes its
// counter: the loop's exit test was mistaken for the short-circuit inside
// `first || test`, so it unrolled forever. The `for (;;)` exits only through
// a dynamic `break`, so it is a runtime loop too (it was unrolled 5000 times).
function main(n) {
  const log = [];
  let i = 0;
  do {
    log.push(i++);
  } while (i++ < n);
  let j = 0;
  for (;;) {
    j += 2;
    if (j > n * 3) break;
  }
  return [i, log.join(","), j].join("|");
}
