// inputs: [0, 1, 4, 9]
// A generator suspended at a yield when control turns dynamic: it is rebuilt
// at runtime from a resume function (locals and operand stack as arguments,
// advanced to the resume point), so next(v) delivers v to the paused yield.
function main(n) {
  function* acc(start) {
    let total = start;
    let steps = 0;
    while (true) {
      const d = yield [total, steps];
      if (d === undefined) return "done";
      total += d;
      steps++;
    }
  }
  const it = acc(100);
  it.next();
  it.next(5);
  const seen = [];
  for (let k = 0; k < n; k++) {
    const r = it.next(k).value;
    seen.push(r[0] + ":" + r[1]);
  }
  const last = it.next();
  return seen.join(" ") + " | " + last.value + " " + last.done + " | " + JSON.stringify(it.next());
}
