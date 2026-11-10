// inputs: ["abc", 12, "x y/"]
// forbid-main: startsWith\("\."\)|toUpperCase
// A pure String.prototype method of a value known to be a string, unused, is dropped; a standard function ignoring extra arguments does not take them (an object there does not escape). The receiver that may be an object with its own startsWith keeps its call (split-shot-specialization-gaps #5).
var log = [];
function main(input) {
  const s = String(input);
  s.startsWith(".");                       // pure, dropped
  s.toUpperCase();                          // pure, dropped
  const k = s.indexOf("b") + s.slice(1).length;
  input.startsWith && input.startsWith("x"); // input may be an object with its own startsWith
  const n = Number(input);
  const t = encodeURIComponent(s, { a: 1 }) + parseInt(s, 10, { b: 2 });
  return [k, s.charAt(0), s.at(-1), t, n === n, log.length];
}
