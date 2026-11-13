// A callback given to runtime code (`input.map`'s) that captures a program
// `main` itself made, by parsing a constant text before reading any input:
// its residual function knows that tree as it is when the closure is made
// (see `ArgShape::Made`) and is not given it, so the interpreter's walk of
// it unfolds in the callback's body. The tree's objects are watched from
// then on (`MADE_HELD`): runtime code may call the closure at any later
// time. The callback's `try` stays, around the compiled expression.
const SRC = "a + b * 2 - c * a";
function parse(tokens) {
  let pos = 0;
  function primary() {
    const t = tokens[pos++];
    return t >= "0" && t <= "9" ? { type: "Num", value: Number(t) } : { type: "Var", name: t };
  }
  function term() {
    let l = primary();
    while (tokens[pos] === "*") {
      pos++;
      l = { type: "Bin", op: "*", left: l, right: primary() };
    }
    return l;
  }
  let l = term();
  while (tokens[pos] === "+" || tokens[pos] === "-") {
    const op = tokens[pos++];
    l = { type: "Bin", op, left: l, right: term() };
  }
  return l;
}
function evaluate(node, env) {
  switch (node.type) {
    case "Num": return node.value;
    case "Var":
      if (!Object.prototype.hasOwnProperty.call(env, node.name)) throw new ReferenceError("unbound " + node.name);
      return env[node.name];
    case "Bin": {
      const a = evaluate(node.left, env), b = evaluate(node.right, env);
      switch (node.op) { case "+": return a + b; case "-": return a - b; case "*": return a * b; }
    }
  }
  throw new Error("bad node " + node.type);
}
export function main(input) {
  const ast = parse(SRC.split(" "));
  return input.map((env) => {
    try {
      return { ok: evaluate(ast, env) };
    } catch (e) {
      return { error: e.name + ": " + e.message };
    }
  });
}
