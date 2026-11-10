// inputs: [0, 1, 2, 3, 4, 7]
// A labeled continue out of two nested runtime tries and a finally, in loops of a runtime count.
function main(x){ var n = 0; outer: for (var i = 0; i < x; i++) { for (var j = 0; j < 3; j++) { try { try { if (j === i % 3) continue outer; n += JSON.parse("" + j); } finally { n += 100; } } catch (e) { n = -1; } } } return n; }
