// inputs: [{"n": -2, "x": -7, "replace": false}, {"n": -2, "x": -7, "replace": true}, {"n": -2, "x": 0, "replace": false}, {"n": -2, "x": 0, "replace": true}, {"n": -2, "x": 4, "replace": false}, {"n": -2, "x": 4, "replace": true}, {"n": 0, "x": -7, "replace": false}, {"n": 0, "x": -7, "replace": true}, {"n": 0, "x": 0, "replace": false}, {"n": 0, "x": 0, "replace": true}, {"n": 0, "x": 4, "replace": false}, {"n": 0, "x": 4, "replace": true}, {"n": 1, "x": -7, "replace": false}, {"n": 1, "x": -7, "replace": true}, {"n": 1, "x": 0, "replace": false}, {"n": 1, "x": 0, "replace": true}, {"n": 1, "x": 4, "replace": false}, {"n": 1, "x": 4, "replace": true}, {"n": 3, "x": -7, "replace": false}, {"n": 3, "x": -7, "replace": true}, {"n": 3, "x": 0, "replace": false}, {"n": 3, "x": 0, "replace": true}, {"n": 3, "x": 4, "replace": false}, {"n": 3, "x": 4, "replace": true}, {"n": 8, "x": -7, "replace": false}, {"n": 8, "x": -7, "replace": true}, {"n": 8, "x": 0, "replace": false}, {"n": 8, "x": 0, "replace": true}, {"n": 8, "x": 4, "replace": false}, {"n": 8, "x": 4, "replace": true}, {"n": 100, "x": -7, "replace": false}, {"n": 100, "x": -7, "replace": true}, {"n": 100, "x": 0, "replace": false}, {"n": 100, "x": 0, "replace": true}, {"n": 100, "x": 4, "replace": false}, {"n": 100, "x": 4, "replace": true}]
// From the residual-language branch's C corpus (corpus-c/cases/native-materialized-function-identity.js),
// where master's specializer got it wrong or did not finish.
// A growing structure reuses the exact source function object after materialization.
function scale(x) { return x * 3; }
function main(input) {
  let first = scale;
  first.tag = 'initial';
  let node = {run: first, previous: null};
  for (let i = 0; i < input.n; i++) {
    if (input.replace && i === 1) scale = function replacement(x) { return x + 9; };
    node = {run: scale, previous: node};
    first.tag = i;
  }
  let count = 0, same = 0, cursor = node;
  while (cursor !== null) {
    count++;
    if (cursor.run === first) same++;
    cursor = cursor.previous;
  }
  return [node.run(input.x), node.run === first, scale === first, first.tag, count, same];
}
