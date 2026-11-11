// inputs: [0, 1, 2, 3, 4, 5, 6, 7]
// forbid-main: scale|names|nested
// A `try` whose body cannot fold makes runtime state only of what its body, its handler and what they call write (or hand to runtime code); the objects they only read stay known after it. Whatever is written is seen by the handler however far the body got, and by the code after.
function risky(input, at) {
  if (input === at) throw new Error("at " + at);
  return input * 10 + at;
}
function bump(o) { o.n++; return o.n; }
function main(input) {
  var out = [];
  var cfg = { scale: 3, names: ["a", "b"], nested: { deep: 7 } };
  var counter = { n: 0 };
  var log = [];
  var viaCall = { n: 10 };
  var captured = 0;
  var inc = function () { captured++; };
  var alias = null;
  var stored = { tag: "s" };
  var handed = { seen: false };
  var r;
  try {
    r = risky(input, 1) + cfg.scale;
    counter.n++;
    log.push("a");
    bump(viaCall);
    r += risky(input, 2);
    inc();
    alias = stored;
    alias.tag = "changed";
    counter.n += cfg.nested.deep;
    r += risky(input, 3);
    log.push("b");
  } catch (e) {
    r = "err:" + e.message + ":" + cfg.names[0] + ":" + counter.n + ":" + log.join("");
    counter.n += 100;
  }
  out.push(r, cfg.scale * 2, cfg.names.join("-"), cfg.nested.deep, counter.n, log.length, viaCall.n, captured, stored.tag, alias === stored);
  // A handler that writes what the body only reads; a loop in the body; a nested try.
  var table = [1, 2, 3];
  var acc = { sum: 0 };
  try {
    for (var i = 0; i < table.length; i++) acc.sum += table[i] * risky(input, 4 + i);
    try { acc.sum += risky(input, 7); } catch (inner) { acc.sum = -acc.sum; table.push(99); }
  } catch (e2) {
    table.length = 1;
    acc.err = e2.message;
  }
  out.push(table.join(","), acc.sum, acc.err === undefined ? "none" : acc.err);
  // Handed to code the specializer does not see, in the body.
  try { input > 100 ? null : JSON.stringify(handed, function (k, v) { if (k === "") handed.seen = true; return v; }); risky(input, 5); } catch (e3) { out.push("h"); }
  out.push(handed.seen);
  return out;
}
