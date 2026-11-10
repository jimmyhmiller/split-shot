// inputs: [0, 1]
// max-lines: 20
// A long string the residual repeats is defined once and named, and one
// that is a short unit repeated is written as `unit.repeat(n)`. (The
// script's top-level code is the residual's load code, run once: its
// function and the variable it gives `main` take 4 lines.)
var sep = new Array(81).join("=-");
var banner = sep + "\n  title: " + "x".repeat(3) + "\n" + sep;
var mixed = "abcdefghijklmnopqrstuvwxyz0123456789 and more";
var twice = [mixed, mixed + "!"];
function main(n) { return [banner.length, sep.slice(n, n + 4), twice[1].length].join(":"); }
