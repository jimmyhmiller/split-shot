// mix: an offline specializer for flowcharts (flowchart.js), written in the
// subset it specializes, so it can be applied to itself. After the flowchart
// mix of Jones, Gomard and Sestoft (Partial Evaluation and Automatic Program
// Generation, ch. 4).
//
// `division` names the program's static variables; `vs0` their values at
// entry. A residual block, labeled S0, S1, ... in the order they are reached
// (the list `seen`), is made for each (block, static values) reached:
// assignments to static variables are done now, the rest emitted with what is
// static put in; a static test is decided now and its branch followed; a
// dynamic test is emitted, and each branch is specialized later with the
// static values it has. The residual program's parameters are the dynamic
// ones.
//
// The block a residual block starts at is found by walking the list of the
// blocks one can start at (the entry and the targets of dynamic tests) and
// comparing ("The Trick"): when mix is specialized to a program, that label is
// dynamic but each block it may name is static, so mix's code for a block is
// specialized to that block.
function mix(program, division, vs0) {
  var points = pointsOf(program, division);
  var seen = [[points[0], vs0]];
  var residual = [];
  var n = 0;
  while (n < seen.length) {
    var pp = seen[n][0];
    var vs = seen[n][1];
    var i = 0;
    while (i < points.length) {
      if (points[i] === pp) {
        var bb = blockOf(program, points[i]);
        var code = [];
        var jump = null;
        var open = true;
        while (open) {
          var assigns = bb[1];
          var k = 0;
          while (k < assigns.length) {
            var x = assigns[k][1];
            var e = assigns[k][2];
            if (division.indexOf(x) >= 0) {
              vs = setAt(vs, division.indexOf(x), evalStatic(e, division, vs));
            } else {
              code = code.concat([["=", x, reduce(e, division, vs)]]);
            }
            k = k + 1;
          }
          var j = bb[2];
          if (j[0] === "goto") {
            bb = blockOf(program, j[1]);
          } else if (j[0] === "if") {
            if (isStatic(j[1], division)) {
              if (evalStatic(j[1], division, vs)) {
                bb = blockOf(program, j[2]);
              } else {
                bb = blockOf(program, j[3]);
              }
            } else {
              var yes = intern([j[2], vs], seen);
              var no = intern([j[3], vs], yes[1]);
              seen = no[1];
              jump = ["if", reduce(j[1], division, vs), yes[0], no[0]];
              open = false;
            }
          } else {
            jump = ["return", reduce(j[1], division, vs)];
            open = false;
          }
        }
        residual = residual.concat([["S" + n, code, jump]]);
      }
      i = i + 1;
    }
    n = n + 1;
  }
  return ["flowchart", dynamicParams(program, division), residual];
}
