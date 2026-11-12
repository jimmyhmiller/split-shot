// style: Turing machine (transition table parsed from rule text at load, keyed by state and symbol, tape grown on demand)
// residue: "TM_[A-Z_]+"|\brules\.get\b
// A one-tape Turing machine simulator: rules are written one per line as
// `state symbol -> write move next`, parsed at load into a Map keyed by
// state and symbol. A missing rule halts and rejects. The fixed machine
// decides whether a word over {a, b} is a palindrome by erasing matching
// ends; it returns the verdict, the steps taken and the final tape.
const RULES = `
TM_START   a -> _ R TM_HAVE_A
TM_START   b -> _ R TM_HAVE_B
TM_START   _ -> _ R TM_ACCEPT

TM_HAVE_A  a -> a R TM_HAVE_A
TM_HAVE_A  b -> b R TM_HAVE_A
TM_HAVE_A  _ -> _ L TM_CHECK_A
TM_HAVE_B  a -> a R TM_HAVE_B
TM_HAVE_B  b -> b R TM_HAVE_B
TM_HAVE_B  _ -> _ L TM_CHECK_B

TM_CHECK_A a -> _ L TM_BACK
TM_CHECK_A _ -> _ R TM_ACCEPT
TM_CHECK_B b -> _ L TM_BACK
TM_CHECK_B _ -> _ R TM_ACCEPT

TM_BACK    a -> a L TM_BACK
TM_BACK    b -> b L TM_BACK
TM_BACK    _ -> _ R TM_START
`;
const BLANK = "_";
const START = "TM_START";
const ACCEPT = "TM_ACCEPT";
const MAX_STEPS = 100000;

function parseRules(text) {
  const rules = new Map();
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (t === "" || t.startsWith("#")) continue;
    const m = /^(\S+)\s+(\S)\s+->\s+(\S)\s+([LRN])\s+(\S+)$/.exec(t);
    if (!m) throw new Error("bad rule: " + t);
    const key = m[1] + " " + m[2];
    if (rules.has(key)) throw new Error("nondeterministic rule: " + key);
    rules.set(key, { write: m[3], move: m[4] === "L" ? -1 : m[4] === "R" ? 1 : 0, next: m[5] });
  }
  return rules;
}

const MACHINE = { rules: parseRules(RULES), start: START, accept: ACCEPT };

function simulate(machine, word) {
  const rules = machine.rules;
  let tape = word.length === 0 ? [BLANK] : word.split("");
  let head = 0;
  let state = machine.start;
  let steps = 0;
  while (state !== machine.accept) {
    if (steps === MAX_STEPS) return { result: "timeout", steps, tape: tape.join("") };
    const rule = rules.get(state + " " + tape[head]);
    if (rule === undefined) break;
    tape[head] = rule.write;
    head += rule.move;
    if (head < 0) { tape.unshift(BLANK); head = 0; }
    else if (head === tape.length) tape.push(BLANK);
    state = rule.next;
    steps++;
  }
  return { result: state === machine.accept ? "accept" : "reject", steps, tape: tape.join("") };
}

export function main(input) {
  return simulate(MACHINE, input.word);
}
export const inputs = [
  { word: "" },
  { word: "a" },
  { word: "ab" },
  { word: "abba" },
  { word: "abca" },
  { word: "abaabbbaaba" },
  { word: "aabaaabaaaabbaaaababbabaaaabbaaaabaaabaa" },
  { word: "babbaababababaaaabaaabaababbaaaaabbabaabaaabaaaababababaabbab" },
  { word: "babbaababababaaaabaaabaababbaaabaabbabaabaaabaaaababababaabbab" },
];
