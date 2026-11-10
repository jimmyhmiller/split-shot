// inputs: [0, 5, 999]
// forbid-main: for \(|\.push\(
// A static loop building a 1000-entry table folds, however large the
// table: it becomes a 1000-element literal rather than a runtime loop
// (folding is the goal, not output size), as a short one does.
var table = [];
for (var i = 0; i < 1000; i++) table.push((i * i) % 7);
var small = [];
for (var j = 0; j < 10; j++) small.push(j * 3);
function main(n) { return table[n] + small[4]; }
