// A staged specializer for a small first-order JavaScript subset.
// Values are explicitly tagged: [0, static value] or [1, residual expression].
// The AST is static; program data is static to this inner specializer but can
// remain dynamic to the outer split-shot evaluator in the second projection.
function code(value) {
  if (value[0] === 0) { return JSON.stringify(value[1]); }
  return value[1];
}
function lookup(env, path) {
  if (path.length === 0) { return env; }
  return lookup(env[path[0]], path.slice(1));
}
function expression(expr, env, effects) {
  var tag = expr[0];
  if (tag === "lit") { return [0, expr[1]]; }
  if (tag === "var") { return lookup(env, expr[1]); }
  if (tag === "idx") {
    var array = expression(expr[1], env, effects);
    var index = expression(expr[2], env, effects);
    if (array[0] !== 0 || index[0] !== 0) { throw new Error("Index must be static"); }
    return [0, array[1][index[1]]];
  }
  if (tag === "dot") {
    var object = expression(expr[1], env, effects);
    if (object[0] !== 0 || expr[2] !== "length") { throw new Error("Unsupported property"); }
    return [0, object[1].length];
  }
  if (tag === "bin") {
    var left = expression(expr[2], env, effects);
    var right = expression(expr[3], env, effects);
    if (left[0] !== 0 || right[0] !== 0) { throw new Error("Comparison must be static"); }
    if (expr[1] === "===") { return [0, left[1] === right[1]]; }
    throw new Error("Unsupported operator");
  }
  if (tag === "call") {
    var callee = expr[1];
    var args = expr[2];
    if (callee[0] !== "dot") { throw new Error("Expected a method call"); }
    var receiver = expression(callee[1], env, effects);
    if (receiver[0] === 0) {
      if (callee[2] !== "reduce" || args.length !== 2 || args[0][0] !== "fun") {
        throw new Error("Unsupported static method");
      }
      var reducer = args[0];
      var remaining = receiver[1];
      var value = expression(args[1], env, effects);
      while (remaining.length > 0) {
        value = statements(reducer[2], [value, [0, remaining[0]], env], effects)[1];
        remaining = remaining.slice(1);
      }
      return value;
    }
    // Dynamic methods are opaque effects. Materialize each call once, even if
    // its result is unused, and reuse that result instead of repeating effects.
    var call = code(receiver) + "." + callee[2] + "(";
    var ai = 0;
    while (ai < args.length) {
      if (ai > 0) { call = call + ", "; }
      call = call + code(expression(args[ai], env, effects));
      ai = ai + 1;
    }
    var name = "v" + effects.length;
    effects.push("var " + name + " = " + call + ");\n");
    return [1, name];
  }
  throw new Error("Unsupported expression");
}
// Statement traversal is recursive over the fixed interpreter syntax, separate
// from the while loop over source-program data. Normal completion is explicit.
function statements(body, env, effects) {
  if (body.length === 0) { return [false, [0, null]]; }
  var stmt = body[0];
  if (stmt[0] === "return") { return [true, expression(stmt[1], env, effects)]; }
  if (stmt[0] === "expr") {
    expression(stmt[1], env, effects);
    return statements(body.slice(1), env, effects);
  }
  if (stmt[0] === "block") {
    var block = statements(stmt[1], env, effects);
    if (block[0]) { return block; }
    return statements(body.slice(1), env, effects);
  }
  if (stmt[0] === "if") {
    var condition = expression(stmt[1], env, effects);
    if (condition[0] !== 0) { throw new Error("Condition must be static"); }
    var branch = stmt[3];
    if (condition[1]) { branch = stmt[2]; }
    if (branch !== null) {
      var result = statements([branch], env, effects);
      if (result[0]) { return result; }
    }
    return statements(body.slice(1), env, effects);
  }
  throw new Error("Unsupported statement");
}
function mix(interpreter, program) {
  var env = [[0, program], [1, "io"]];
  var effects = [];
  var result = statements(interpreter[3], env, effects);
  return "function run(io) {\n" + effects.join("") + "return " + code(result[1]) + ";\n}";
}
