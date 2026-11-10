// inputs: [0, 1, 2]
// forbid: delete|void 0
// An array index named by its canonical string (`o["2"]`) is that index, and
// a hole is an elision of the array literal (not a `void 0` element deleted
// at runtime).
function main(n) {
  var o = [11, 22, 33, 44];
  o["2"] = 333;
  delete o[1];
  var p = [1, 2, 3];
  delete p[2];
  return [o, p, o["0"], 1 in o, 2 in p, p.length, o[n]];
}
