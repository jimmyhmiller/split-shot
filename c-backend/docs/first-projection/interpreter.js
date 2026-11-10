// A deliberately small executable JS target: function/var/if/while/return,
// primitive operators, arrays, indexing and calls. Guest functions are DATA.
// No eval, Function, host callbacks, native new/this, for or switch.
// Plain records and the numeric Math.PI/Math.sqrt primitives are allowed.
function frame(env, depth) {
  var i = 0;
  while (i < depth) { env = env[0]; i = i + 1; }
  return env;
}
function lookup(env, depth, slot) { return frame(env, depth)[1][slot]; }
function store(env, depth, slot, value) { frame(env, depth)[1][slot] = value; return value; }
function scope(env, count) {
  var values = [];
  var i = 0;
  while (i < count) { values[i] = undefined; i = i + 1; }
  return [env, values, env[2]];
}
function nextIteration(env) {
  var values = [];
  var i = 0;
  while (i < env[1].length) { values[i] = env[1][i]; i = i + 1; }
  return [env[0], values, env[2]];
}
function invoke(program, closure, args, receiver) {
  var fn = closure[0];
  var values = [];
  var i = 0;
  while (i < fn[1]) {
    values[i] = undefined;
    i = i + 1;
  }
  if (closure[3]) receiver = closure[1][2];
  var env = [closure[1], values, receiver];
  var code = [closure[2], fn];
  i = 0;
  while (i < fn[0]) {
    values[i] = args[i];
    i = i + 1;
  }
  var completion = exec(program, fn[3], env, code);
  if (completion[0] === 1) return completion[1];
  return undefined;
}
function binary(op, left, right) {
  if (op === "+") return left + right;
  if (op === "-") return left - right;
  if (op === "*") return left * right;
  if (op === "/") return left / right;
  if (op === "%") return left % right;
  if (op === "**") return left ** right;
  if (op === "===") return left === right;
  if (op === "!==") return left !== right;
  if (op === "==") return left == right;
  if (op === "!=") return left != right;
  if (op === "<") return left < right;
  if (op === "<=") return left <= right;
  if (op === ">") return left > right;
  if (op === ">=") return left >= right;
  if (op === "|") return left | right;
  if (op === "&") return left & right;
  if (op === "^") return left ^ right;
  if (op === "<<") return left << right;
  if (op === ">>") return left >> right;
  return left >>> right;
}
function expression(program, node, env, code) {
  var tag = node[0];
  if (tag === "lit") return node[1];
  if (tag === "undefined") return undefined;
  if (tag === "var") return lookup(env, node[1], node[2]);
  if (tag === "this") return env[2];
  if (tag === "mathconst") return 3.141592653589793;
  if (tag === "mathcall") return Math.sqrt(expression(program, node[2][0], env, code));
  if (tag === "decl") {
    var declarationCode = frame(code, node[1]);
    return [declarationCode[1][2][node[2]][1], frame(env, node[1]), declarationCode, false];
  }
  if (tag === "global") {
    var g = 0;
    while (g < program.length) {
      if (program[g][0] === node[1]) return [program[g][1], null, null, false];
      g = g + 1;
    }
  }
  if (tag === "bin") {
    var left = expression(program, node[2], env, code);
    if (node[1] === "&&") {
      if (left) return expression(program, node[3], env, code);
      return left;
    }
    if (node[1] === "||") {
      if (left) return left;
      return expression(program, node[3], env, code);
    }
    if (node[1] === "??") {
      if (left === null || left === undefined) return expression(program, node[3], env, code);
      return left;
    }
    return binary(node[1], left, expression(program, node[3], env, code));
  }
  if (tag === "unary") {
    var operand = expression(program, node[2], env, code);
    if (node[1] === "!") return !operand;
    if (node[1] === "-") return -operand;
    if (node[1] === "+") return +operand;
    if (node[1] === "~") return ~operand;
    if (node[1] === "void") return undefined;
    return typeof operand;
  }
  if (tag === "cond") {
    if (expression(program, node[1], env, code)) return expression(program, node[2], env, code);
    return expression(program, node[3], env, code);
  }
  if (tag === "array") {
    var array = [];
    var i = 0;
    while (i < node[1].length) {
      array[i] = expression(program, node[1][i], env, code);
      i = i + 1;
    }
    return array;
  }
  if (tag === "get") {
    var base = expression(program, node[1], env, code);
    var property = expression(program, node[2], env, code);
    if (property === "length") return base.length;
    return base[property];
  }
  if (tag === "assign") {
    // Resolve the LHS before evaluating the RHS, as JavaScript does.
    var receiver = null;
    var key = null;
    if (node[2][0] === "get") {
      receiver = expression(program, node[2][1], env, code);
      key = expression(program, node[2][2], env, code);
    }
    var old = undefined;
    if (node[1] !== "=") {
      if (node[2][0] === "get") old = receiver[key];
      else old = lookup(env, node[2][1], node[2][2]);
    }
    var value = expression(program, node[3], env, code);
    if (node[1] !== "=") value = binary(node[1], old, value);
    if (node[2][0] === "get") receiver[key] = value;
    else store(env, node[2][1], node[2][2], value);
    return value;
  }
  if (tag === "update") {
    var previous = +lookup(env, node[2], node[3]);
    var next = previous + node[1];
    store(env, node[2], node[3], next);
    if (node[4]) return next;
    return previous;
  }
  if (tag === "fun") return [node[1], env, code, node[2]];
  if (tag === "call" || tag === "new") {
    var callee = expression(program, node[1], env, code);
    var args = [];
    var j = 0;
    while (j < node[2].length) {
      args[j] = expression(program, node[2][j], env, code);
      j = j + 1;
    }
    if (tag === "new") {
      var instance = {};
      var constructed = invoke(program, callee, args, instance);
      if (constructed !== null && (typeof constructed === "object" || typeof constructed === "function")) return constructed;
      return instance;
    }
    return invoke(program, callee, args, undefined);
  }
  var result = undefined;
  var k = 0;
  while (k < node[1].length) {
    result = expression(program, node[1][k], env, code);
    k = k + 1;
  }
  return result;
}
function exec(program, node, env, code) {
  var tag = node[0];
  if (tag === "empty") return [0, undefined];
  if (tag === "expr") {
    expression(program, node[1], env, code);
    return [0, undefined];
  }
  if (tag === "var") {
    var i = 0;
    while (i < node[1].length) {
      if (node[1][i][2] !== null) store(env, node[1][i][0], node[1][i][1], expression(program, node[1][i][2], env, code));
      i = i + 1;
    }
    return [0, undefined];
  }
  if (tag === "return") return [1, expression(program, node[1], env, code)];
  if (tag === "break") return [2, undefined];
  if (tag === "continue") return [3, undefined];
  if (tag === "if") {
    if (expression(program, node[1], env, code)) return exec(program, node[2], env, code);
    return exec(program, node[3], env, code);
  }
  if (tag === "while" || tag === "for") {
    if (tag === "for") {
      if (node[5] > 0) { env = scope(env, node[5]); code = [code, null]; }
      exec(program, node[3], env, code);
      // JS creates a distinct first per-iteration binding as well as the
      // copies between iterations (closures in initializers keep the old one).
      if (node[5] > 0) env = nextIteration(env);
    }
    while (expression(program, node[1], env, code)) {
      // Explicitly expose the mutable store to the PE's loop analysis. The
      // identity write is internal, never a guest-visible property operation.
      env[1] = env[1];
      var step = exec(program, node[2], env, code);
      if (step[0] === 1) return step;
      if (step[0] === 2) return [0, undefined];
      if (tag === "for") {
        if (node[5] > 0) env = nextIteration(env);
        expression(program, node[4], env, code);
      }
    }
    return [0, undefined];
  }
  if (node[2] > 0) { env = scope(env, node[2]); code = [code, null]; }
  var j = 0;
  while (j < node[1].length) {
    var completion = exec(program, node[1][j], env, code);
    if (completion[0] !== 0) return completion;
    j = j + 1;
  }
  return [0, undefined];
}
function interpret(program, input) {
  var i = 0;
  while (i < program.length) {
    if (program[i][0] === "main") return invoke(program, [program[i][1], null, null, false], [input], undefined);
    i = i + 1;
  }
}
