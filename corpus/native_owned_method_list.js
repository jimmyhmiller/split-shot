// inputs: [{"n": -1, "x": -7}, {"n": -1, "x": 0}, {"n": -1, "x": 4}, {"n": 0, "x": -7}, {"n": 0, "x": 0}, {"n": 0, "x": 4}, {"n": 1, "x": -7}, {"n": 1, "x": 0}, {"n": 1, "x": 4}, {"n": 3, "x": -7}, {"n": 3, "x": 0}, {"n": 3, "x": 4}, {"n": 25, "x": -7}, {"n": 25, "x": 0}, {"n": 25, "x": 4}, {"n": 1000, "x": -7}, {"n": 1000, "x": 0}, {"n": 1000, "x": 4}]
// From the residual-language branch's C corpus (corpus-c/cases/native-owned-method-list.js),
// where master's specializer got it wrong or did not finish.
function scale(x) { return x * 3; }
function main(input) {
  let node = {run: scale, previous: null};
  for (let i = 0; i < input.n; i++) node = {run: scale, previous: node};
  return node.run(input.x);
}
