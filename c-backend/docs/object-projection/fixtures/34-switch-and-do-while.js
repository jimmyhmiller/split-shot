// @case {"description": "switch selects by strict equality, falls through, honours default in any position and break; do-while runs its body before the test; continue inside a switch continues the enclosing loop.", "inputs": ["-1", "0", "1", "2", "3", "5"]}
function name(v) {
  switch (v) {
    case 0: return "zero";
    case 1: return "one";
    case "2": return "string two";
    case 2: return "two";
  }
  return "other";
}
function through(v) {
  var out = 0;
  switch (v) {
    case 1: out = out + 1;
    case 2: out = out + 10; break;
    default: out = out + 100;
    case 3: out = out + 1000;
  }
  return out;
}
function effects(v) {
  var log = "", calls = 0;
  function test(k) { calls = calls + 1; log = log + k; return k; }
  switch (v) {
    case test(0): log = log + "a"; break;
    case test(1): log = log + "b";
    case test(2): log = log + "c"; break;
    case test(3): log = log + "d";
  }
  return log + ":" + calls;
}
function loops(n) {
  var i = 0, sum = 0, runs = 0;
  do { runs = runs + 1; i = i + 1; if (i === 2) continue; sum = sum + i; } while (i < n);
  var skipped = 0;
  for (var k = 0; k < 6; k = k + 1) {
    switch (k % 3) {
      case 0: continue;
      case 1: skipped = skipped + 1; break;
      default: skipped = skipped + 10;
    }
    skipped = skipped + 100;
  }
  var once = 0;
  do { once = once + 1; if (once > 3) break; } while (true);
  return [runs, sum, skipped, once];
}
function main(x) {
  return [name(x), name("2"), through(x), effects(x), loops(x)];
}
