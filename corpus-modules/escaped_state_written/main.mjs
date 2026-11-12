// State a module leaves that `main` hands to runtime code which writes it
// (a callback a runtime `forEach` calls) changes from one call to the next:
// made once at load, and runtime state from then on.
const STATE = { calls: 0, seen: [] };
function track(x, s) {
  [x].forEach((v) => {
    s.calls += 1;
    s.seen.push(v);
  });
  return s.calls;
}
export function main(input) {
  const n = track(input, STATE);
  return [n, STATE.calls, STATE.seen.length, STATE.seen.join("|")];
}
