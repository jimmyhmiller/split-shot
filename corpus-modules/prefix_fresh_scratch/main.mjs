// Scratch state `main` replaces on every call before its input matters (a
// parser's fresh `yy`): a second run of that prefix makes another object of
// the same shape where the first made one, the same state up to which object
// it is, so the prefix is run at load. But each call then replaces it again,
// which the boundary's watch counts as a change (another object than the one
// the load code left), so `parser` is runtime state still: what each call
// sees is what the one before left.
const parser = { yy: null };
function setup() {
  parser.yy = { mode: "plain", rules: ["x", "y"] };
  return parser.yy;
}
export function main(input) {
  const yy = setup();
  const k = yy.rules.length + yy.mode.length;
  return [k, parser.yy === yy, input ? yy.rules[0] : yy.mode];
}
