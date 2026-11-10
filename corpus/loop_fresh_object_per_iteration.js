// inputs: [0, 1, 2, 5, 9]
// forbid-main: evaluate|execute|\.v\b|v:
// A list-walking interpreter runs a guest loop of a runtime count whose body makes a guest object on every iteration: the object at the loop head is a different one each time, standing where the last one stood.
function main(x) {
function evaluate(e, values) {
  var tag = e[0];
  if (tag === "num") return e[1];
  if (tag === "local") return values[e[1]];
  if (tag === "box") return { v: evaluate(e[1], values) };
  if (tag === "unbox") return evaluate(e[1], values).v;
  var a = evaluate(e[2], values), b = evaluate(e[3], values);
  return e[1] === "<" ? a < b : a + b;
}
function execute(list, values, frame) {
  var i = 0;
  while (i < list.length) {
    var s = list[i], tag = s[0];
    if (tag === "setlocal") values[s[1]] = evaluate(s[2], values);
    else if (tag === "while") { while (evaluate(s[1], values)) execute(s[2], values, frame); }
    else if (tag === "return") frame.result = evaluate(s[1], values);
    i = i + 1;
  }
}
  var prog = [["setlocal", 1, ["box", ["num", 0]]], ["setlocal", 2, ["num", 0]],
  ["while", ["bin", "<", ["local", 2], ["local", 0]], [["setlocal", 1, ["box", ["bin", "+", ["unbox", ["local", 1]], ["local", 2]]]], ["setlocal", 2, ["bin", "+", ["local", 2], ["num", 1]]]]],
  ["return", ["unbox", ["local", 1]]]];
  var values = [x, 0, 0], frame = { result: 0 }; execute(prog, values, frame); return frame.result; }
