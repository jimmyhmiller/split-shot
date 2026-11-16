// An evaluator for the programs mix3 reads and makes (parse2's syntax trees):
// runProgram(program, entry, args) calls the function `entry` of `program` with
// `args`. It is how a program runs what mix3 made of it, a compiler or a
// cogen, without turning it into text: what split-shot specializes is this
// evaluator, given that tree.
//
// The subset is jsmix2's: function declarations; var, if/else, return,
// blocks; literals, variables, arrays, a[i], a.length, ! && || ?:, the
// operators + - * === !== < > <= >=, calls to declared functions, a function
// expression called at once, the builtins str, isArr, kind, fail, and the
// methods slice, concat, indexOf. No loops and no mutation.

function runProgram(program, entry, args) {
  return callFunction(program, findFunction(program, entry), args);
}

function findFunction(program, name) {
  for (var i = 0; i < program.length; i++) {
    if (program[i][1] === name) return program[i];
  }
  return null;
}

function callFunction(program, fn, args) {
  var env = new Map();
  var params = fn[2];
  for (var i = 0; i < params.length; i++) env.set(params[i], args[i]);
  return execStatements(program, fn[3], env);
}

// A list of statements, which ends in a return.
function execStatements(program, stmts, env) {
  for (var i = 0; i < stmts.length; i++) {
    var s = stmts[i];
    var tag = s[0];
    if (tag === "return") return evaluate(program, s[1], env);
    if (tag === "var") {
      env.set(s[1], evaluate(program, s[2], env));
    } else if (tag === "block") {
      var rest = s[1].concat(stmts.slice(i + 1));
      return execStatements(program, rest, env);
    } else if (tag === "if") {
      var branch = evaluate(program, s[1], env) ? s[2] : s[3];
      var after = stmts.slice(i + 1);
      return execStatements(program, branch === null ? after : [branch].concat(after), env);
    } else {
      throw new Error("eval3: unsupported statement " + tag);
    }
  }
  return null;
}

function evaluate(program, e, env) {
  var tag = e[0];
  if (tag === "lit") return e[1];
  if (tag === "var") {
    if (!env.has(e[1])) throw new Error("eval3: unbound variable " + e[1]);
    return env.get(e[1]);
  }
  if (tag === "arr") return e[1].map(function (x) { return evaluate(program, x, env); });
  if (tag === "idx") return evaluate(program, e[1], env)[evaluate(program, e[2], env)];
  if (tag === "dot") {
    var o = evaluate(program, e[1], env);
    if (e[2] === "length") return o.length;
    throw new Error("eval3: unsupported property " + e[2]);
  }
  if (tag === "not") return !evaluate(program, e[1], env);
  if (tag === "cond") return evaluate(program, e[1], env) ? evaluate(program, e[2], env) : evaluate(program, e[3], env);
  if (tag === "bin") return binary(program, e[1], e[2], e[3], env);
  if (tag === "call") return call(program, e, env);
  throw new Error("eval3: unsupported expression " + tag);
}

function binary(program, op, left, right, env) {
  var a = evaluate(program, left, env);
  if (op === "&&") return a ? evaluate(program, right, env) : a;
  if (op === "||") return a ? a : evaluate(program, right, env);
  var b = evaluate(program, right, env);
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "*") return a * b;
  if (op === "===") return a === b;
  if (op === "!==") return a !== b;
  if (op === "<") return a < b;
  if (op === ">") return a > b;
  if (op === "<=") return a <= b;
  if (op === ">=") return a >= b;
  throw new Error("eval3: unsupported operator " + op);
}

function call(program, e, env) {
  var callee = e[1];
  var args = e[2].map(function (x) { return evaluate(program, x, env); });
  if (callee[0] === "fun") {
    var local = new Map(env);
    for (var i = 0; i < callee[1].length; i++) local.set(callee[1][i], args[i]);
    return execStatements(program, callee[2], local);
  }
  if (callee[0] === "dot") {
    var recv = evaluate(program, callee[1], env);
    var m = callee[2];
    if (m === "slice") return args.length === 1 ? recv.slice(args[0]) : recv.slice(args[0], args[1]);
    if (m === "concat") return recv.concat(args[0]);
    if (m === "indexOf") return recv.indexOf(args[0]);
    throw new Error("eval3: unsupported method " + m);
  }
  var name = callee[1];
  var fn = findFunction(program, name);
  if (fn !== null) return callFunction(program, fn, args);
  if (name === "str") return JSON.stringify(args[0]);
  if (name === "isArr") return Array.isArray(args[0]);
  if (name === "kind") return args[0] === null ? "null" : Array.isArray(args[0]) ? "array" : typeof args[0];
  if (name === "fail") throw new Error(args[0]);
  throw new Error("eval3: unknown function " + name);
}
