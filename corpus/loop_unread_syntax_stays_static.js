// inputs: [0, 1, 2, 5, 9]
// forbid-main: evaluate|execute|nodes|\.value\b
// An interpreter over a flat node table, with a variable its functions share and assign: the statement list the outer loop walks is not read by the loop that runs a guest while, though it is reachable from the table that loop reads, and it stays static across it.
function main(x) {
  var nodes = [
    ["num", 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ["setlocal", 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ["setlocal", 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ["local", 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ["local", 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ["bin", "<", 3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ["local", 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ["bin", "+", 6, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ["setlocal", 1, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ["num", 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ["bin", "+", 3, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ["setlocal", 2, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ["block", [8, 11], 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ["while", 5, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ["return", 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ["block", [1, 2, 13, 14], 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]];
  var kind = 0;
  function evaluate(e, values) {
    var tag = e[0];
    if (tag === "num") { kind = 1; return e[1]; }
    if (tag === "local") { kind = 2; return values[e[1]]; }
    var a = evaluate(nodes[e[2]], values), ak = kind;
    var b = evaluate(nodes[e[3]], values);
    kind = ak + kind;
    return e[1] === "<" ? a < b : a + b;
  }
  function execute(block, values, frame) {
    var list = block[1], i = 0;
    while (i < list.length) {
      var s = nodes[list[i]], tag = s[0];
      if (tag === "setlocal") { values[s[1]] = evaluate(nodes[s[2]], values); frame.kinds = frame.kinds + kind; }
      else if (tag === "while") { while (evaluate(nodes[s[1]], values)) execute(nodes[s[2]], values, frame); }
      else if (tag === "return") frame.result = evaluate(nodes[s[1]], values);
      i = i + 1;
    }
  }
  var values = [x, 0, 0], frame = { result: 0, kinds: 0 };
  execute(nodes[15], values, frame);
  return [frame.result, frame.kinds];
}
