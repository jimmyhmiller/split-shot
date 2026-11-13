// A state machine whose next step is looked up in a Map by `state + " " +
// symbol`: the lookup's cases (see `Js::trick_lookup`) are runtime branches,
// so the loop they steer is a runtime loop (its step counter a variable, not
// unrolled value by value until the cases ran out and the table became a
// runtime value), and each state runs as its own code, the table gone.
const RULES = new Map();
const rule = (state, sym, write, move, next) => RULES.set(state + " " + sym, { write, move, next });
rule("SM_SCAN", "a", "b", 1, "SM_SCAN");
rule("SM_SCAN", "b", "a", 1, "SM_SCAN");
rule("SM_SCAN", "_", "_", -1, "SM_BACK");
rule("SM_BACK", "a", "a", -1, "SM_BACK");
rule("SM_BACK", "b", "b", -1, "SM_BACK");
rule("SM_BACK", "_", "_", 1, "SM_DONE");
function run(rules, word) {
  const tape = ["_", ...word.split(""), "_"];
  let head = 1;
  let state = "SM_SCAN";
  let steps = 0;
  while (state !== "SM_DONE") {
    const r = rules.get(state + " " + tape[head]);
    if (r === undefined) return { error: state, steps };
    tape[head] = r.write;
    head += r.move;
    state = r.next;
    steps++;
  }
  return { tape: tape.join(""), steps };
}
export function main(input) {
  return run(RULES, input.word);
}
