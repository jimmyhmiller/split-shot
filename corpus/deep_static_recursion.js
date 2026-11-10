// inputs: [0, 2, 5]
// Static recursion deeper than the inliner goes continues as a runtime call
// (the inliner stopped with an error); a long string-building chain stays
// linear to analyze.
function main(n) {
  function loop(i) {
    if (i === 900) return "Hello";
    return loop(i + 1) + "!";
  }
  const s = loop(0);
  return [s.length, s.slice(0, 7), n].join("|");
}
