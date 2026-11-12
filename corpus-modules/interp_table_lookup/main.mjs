// A lookup of a runtime key in a small known table is a case on the key
// (see `Js::trick_lookup`): each case's answer is known, so a state machine
// stepping through its table by runtime symbols keeps its state known, and
// its table is gone from the residual.
const TRANSITIONS = new Map([
  ["start a", "seen_a"], ["start b", "start"],
  ["seen_a a", "seen_a"], ["seen_a b", "accept"],
  ["accept a", "seen_a"], ["accept b", "start"],
]);
export function main(input) {
  const word = String(input);
  let state = "start";
  for (let i = 0; i < word.length; i++) {
    const next = TRANSITIONS.get(state + " " + word[i]);
    if (next === undefined) return "reject";
    state = next;
  }
  return state === "accept" ? "accept" : "no:" + state;
}
