// inputs: [0, 1, 2, 3, 900]
// forbid: 800
// A counter a closure keeps in a variable, which a runtime branch bumps or
// resets (lodash's shortOut): it stays known across the branch, as what each
// arm leaves (0, or one more), so a test of it no run can pass folds.
function mk() { var count = 0; return function (x) { if (x > 0) { if (++count >= 800) return "hot"; } else { count = 0; } return "cold"; }; }
function main(i) { var f = mk(); return [f(i), f(i - 1), f(i - 2)]; }
