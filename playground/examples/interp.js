// A tree-walking expression interpreter. Specialized to one expression tree,
// the interpreter disappears: no dispatch on `op`, no tree, just arithmetic on
// the environment.
function evaluate(node, env) {
  switch (node.op) {
    case "lit": return node.val;
    case "var": return env[node.name];
    case "add": return evaluate(node.l, env) + evaluate(node.r, env);
    case "mul": return evaluate(node.l, env) * evaluate(node.r, env);
    default: throw new Error("unknown op " + node.op);
  }
}

function main(env) {
  // (x + 3) * (x + y)
  const tree = {
    op: "mul",
    l: { op: "add", l: { op: "var", name: "x" }, r: { op: "lit", val: 3 } },
    r: { op: "add", l: { op: "var", name: "x" }, r: { op: "var", name: "y" } },
  };
  return evaluate(tree, env);
}
