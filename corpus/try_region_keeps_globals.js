// inputs: [0, 1, 2, 3]
// forbid-main: TABLE|c1:" \+
// A script's globals across a `try` that stays at runtime: what is known of them (a table, a function) is kept when the region's code neither assigns one nor runs code the specializer does not see; a region that assigns one, or calls such code, sees and leaves them as runtime state.
const TABLE = { a: 10, b: 20 };
function helper(k) { return TABLE[k] + 1; }
let counter = 0;
let label = "start";
function risky(x, at) { if (x === at) throw new RangeError("at " + at); return x; }
function main(input) {
  var out = [];
  try { out.push(risky(input, 1) + helper("a")); } catch (e) { out.push("c1:" + helper("b")); }
  out.push(helper("a") + helper("b"), TABLE.a);
  try { counter = counter + 1; risky(input, 2); label = "set"; } catch (e) { out.push("c2:" + counter + label); }
  out.push(counter > 0, label);
  try { out.push(String(input.toString())); risky(input, 3); } catch (e) { out.push("c3"); }
  out.push(helper("a"));
  return out;
}
