// style: npm sval (JavaScript interpreter in JS: acorn ESTree, evaluator table keyed by node.type, scope objects)
// residue: "(BinaryExpression|ForStatement|WhileStatement|CallExpression|MemberExpression|UpdateExpression|AssignmentExpression)"
// sval running a fixed JavaScript program, parsed and run once at load: it
// defines a word-frequency counter, a sieve and a run-length encoder, and
// exports one entry point that main calls with the input (so every call is
// interpreted by sval).
import Sval from "sval";
const PROGRAM = `
  function sieve(limit) {
    const marks = [];
    const primes = [];
    for (let i = 2; i <= limit; i++) {
      if (!marks[i]) {
        primes.push(i);
        for (let j = i * i; j <= limit; j += i) marks[j] = true;
      }
    }
    return primes;
  }
  function wordCounts(text) {
    const counts = {};
    const words = text.toLowerCase().split(/[^a-z]+/);
    for (const w of words) {
      if (w.length === 0) continue;
      counts[w] = (counts[w] || 0) + 1;
    }
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a] || (a < b ? -1 : 1)).slice(0, 3)
      .map((w) => [w, counts[w]]);
  }
  function rle(s) {
    let out = "";
    let i = 0;
    while (i < s.length) {
      let j = i;
      while (j < s.length && s[j] === s[i]) j++;
      out += (j - i > 1 ? j - i : "") + s[i];
      i = j;
    }
    return out;
  }
  exports.run = function (input) {
    const primes = sieve(input.limit);
    return {
      primes: primes.length,
      last: primes.length ? primes[primes.length - 1] : null,
      top: wordCounts(input.text),
      rle: rle(input.text.replace(/ /g, "")).slice(0, 40),
    };
  };
`;
const interpreter = new Sval({ ecmaVer: "latest", sandBox: true });
interpreter.run(PROGRAM);
const run = interpreter.exports.run;
export function main(input) {
  return run(input);
}
export const inputs = [
  { limit: 0, text: "" },
  { limit: 2, text: "a" },
  { limit: 30, text: "the cat and the hat and the bat" },
  { limit: 100, text: "aaabbbcccd eee ffff ggggg zz z z z" },
  { limit: 120, text: "To be, or not to be, that is the question: Whether tis nobler in the mind to suffer" },
  { limit: 200, text: "mississippi mississippi river river river banks" },
];
