// An AST-based offline specializer for the documented JavaScript subset.
// Binding-time annotations come from generic fixed-point analysis, not opcode
// rules. Static values execute normally; dynamic bindings store source refs.
// All var bindings are predeclared as stable cells with JS function scope.
// Code generation is external, so it does not obscure the residual compiler.
function emptyEnv(fn) {
  var env = Object.create(null);
  var i = 0;
  while (i < fn[4].length) {
    env[fn[4][i]] = {value: fn[6][i] ? "undefined" : undefined};
    i = i + 1;
  }
  return env;
}
function envLookup(env, name) { return env[name].value; }
function fnLookup(funcs, name) {
  var i = 0;
  while (i < funcs.length) { if (funcs[i][1] === name) { return funcs[i]; } i = i + 1; }
  throw new Error("Unknown function: " + name);
}

// Every dynamic binding holds an already evaluated reference or literal.
// An opaque method call also binds its result. More complex expressions must
// be evaluated once before they are stored or cross another effect.
function atomic(expr) {
  if (expr[0] === "var" || expr[0] === "lit" || expr[0] === "undef") { return true; }
  return expr[0] === "call" && expr[1][0] === "dot" && expr[1][2] !== "slice";
}
function evalExpr(funcs, expr, env, effects, underDynamic) {
  var tag = expr[0];
  if (tag === "undef") { return undefined; }
  if (tag === "lit") { return expr[1]; }                 // plain program datum
  if (tag === "var") {
    var loaded = envLookup(env, expr[1]);
    if (expr[2]) { return codegen.reference(loaded); }
    return loaded;
  }
  if (tag === "arr") {
    var els = expr[1]; var out = []; var i = 0;
    while (i < els.length) {
      var element = evalExpr(funcs, els[i], env, effects, underDynamic);
      if (els[i][els[i].length - 1] && !atomic(els[i])) { element = codegen.bindExpression(effects, element); }
      out.push(element); i = i + 1;
    }
    if (expr[2]) { return codegen.array(out); }
    return out;
  }
  if (tag === "unary") {
    var operand = evalExpr(funcs, expr[2], env, effects, underDynamic);
    if (expr[3]) { return codegen.unary(expr[1], operand); }
    if (expr[1] === "!") { return !operand; }
    if (expr[1] === "-") { return -operand; }
    if (expr[1] === "+") { return +operand; }
    if (expr[1] === "typeof") { return typeof operand; }
  }
  if (tag === "idx") {
    var a = evalExpr(funcs, expr[1], env, effects, underDynamic);
    if (expr[1][expr[1].length - 1] && !atomic(expr[1])) { a = codegen.bindExpression(effects, a); }
    var b = evalExpr(funcs, expr[2], env, effects, underDynamic);
    if (expr[3]) { return codegen.property(a, b); }
    return a[b];
  }
  if (tag === "dot") {
    var o = evalExpr(funcs, expr[1], env, effects, underDynamic);
    if (expr[3]) { return codegen.property(o, expr[2]); }
    return o[expr[2]];
  }
  if (tag === "bin") {
    var op = expr[1];
    var left = evalExpr(funcs, expr[2], env, effects, underDynamic);
    if (expr[2][expr[2].length - 1] && !atomic(expr[2])) { left = codegen.bindExpression(effects, left); }
    var right = evalExpr(funcs, expr[3], env, effects, underDynamic);
    if (expr[4]) { return codegen.binary(op, left, right); }
    if (op === "+") { return left + right; }
    if (op === "-") { return left - right; }
    if (op === "*") { return left * right; }
    if (op === "/") { return left / right; }
    if (op === "%") { return left % right; }
    if (op === "**") { return left ** right; }
    if (op === "&") { return left & right; }
    if (op === "===") { return left === right; }
    if (op === "!==") { return left !== right; }
    if (op === "==") { return left == right; }
    if (op === "!=") { return left != right; }
    if (op === "<") { return left < right; }
    if (op === ">") { return left > right; }
    if (op === "<=") { return left <= right; }
    if (op === ">=") { return left >= right; }
    throw new Error("Unsupported operator: " + op);
  }
  if (tag === "cond") {
    if (expr[1][expr[1].length - 1]) {
      var condition = evalExpr(funcs, expr[1], env, effects, underDynamic);
      var yesEffects = codegen.fork(effects);
      var noEffects = codegen.fork(effects);
      var yesValue;
      try { yesValue = evalExpr(funcs, expr[2], env, yesEffects, true); }
      catch (error) { yesValue = codegen.caught(yesEffects, error)[1]; }
      var noValue;
      try { noValue = evalExpr(funcs, expr[3], env, noEffects, true); }
      catch (error) { noValue = codegen.caught(noEffects, error)[1]; }
      return codegen.conditional(effects, condition, yesEffects, yesValue, noEffects, noValue);
    }
    if (evalExpr(funcs, expr[1], env, effects, underDynamic)) {
      var chosenYes = evalExpr(funcs, expr[2], env, effects, underDynamic);
      if (expr[4] && !expr[2][expr[2].length - 1]) { return codegen.literal(chosenYes); }
      return chosenYes;
    }
    var chosenNo = evalExpr(funcs, expr[3], env, effects, underDynamic);
    if (expr[4] && !expr[3][expr[3].length - 1]) { return codegen.literal(chosenNo); }
    return chosenNo;
  }
  if (tag === "new") {
    var values = [];
    var ni = 0;
    while (ni < expr[2].length) {
      var value = evalExpr(funcs, expr[2][ni], env, effects, underDynamic);
      if (expr[2][ni][expr[2][ni].length - 1] && !atomic(expr[2][ni])) { value = codegen.bindExpression(effects, value); }
      values.push(value); ni = ni + 1;
    }
    if (!expr[3]) {
      if (expr[1] === "Error") {
        if (values.length === 0) { return new Error(); }
        if (values.length === 1) { return new Error(values[0]); }
        return new Error(values[0], values[1]);
      }
      if (expr[1] === "TypeError") { return new TypeError(values[0], values[1]); }
      if (expr[1] === "RangeError") { return new RangeError(values[0], values[1]); }
      if (expr[1] === "SyntaxError") { return new SyntaxError(values[0], values[1]); }
      if (expr[1] === "ReferenceError") { return new ReferenceError(values[0], values[1]); }
    }
    return codegen.construct(expr[1], values);
  }
  if (tag === "call") {
    var callee = expr[1];
    var args = expr[2];
    if (callee[0] === "dot" && callee[2] === "slice" && !expr[3]) {
      var sliced = evalExpr(funcs, callee[1], env, effects, underDynamic);
      var sliceArgs = [];
      var si = 0;
      while (si < args.length) { sliceArgs.push(evalExpr(funcs, args[si], env, effects, underDynamic)); si = si + 1; }
      if (sliceArgs.length === 0) { return sliced.slice(); }
      if (sliceArgs.length === 1) { return sliced.slice(sliceArgs[0]); }
      return sliced.slice(sliceArgs[0], sliceArgs[1]);
    }
    // A method on the dynamic entry input is an opaque runtime operation.
    // Emit each call once into a temporary, including discarded calls. This
    // preserves order and sharing across assignments and loop iterations.
    // This subset represents dynamic expressions as source strings.
    if (callee[0] === "dot") {
      var receiver = evalExpr(funcs, callee[1], env, effects, underDynamic);
      var simple = true;
      var check = 0;
      while (check < args.length) { if (args[check][0] !== "var" && args[check][0] !== "lit" && args[check][0] !== "undef") { simple = false; } check = check + 1; }
      if (simple) {
        var direct = [];
        var di = 0;
        while (di < args.length) { direct.push(evalExpr(funcs, args[di], env, effects, underDynamic)); di = di + 1; }
        return codegen.call(effects, receiver, callee[2], direct);
      }
      if (!atomic(callee[1])) { receiver = codegen.bindExpression(effects, receiver); }
      var prepared = codegen.prepare(effects, receiver, callee[2]);
      var actual = [];
      var ai = 0;
      while (ai < args.length) {
        var argument = evalExpr(funcs, args[ai], env, effects, underDynamic);
        if (args[ai][args[ai].length - 1] && !atomic(args[ai])) { argument = codegen.bindExpression(effects, argument); }
        actual.push(argument);
        ai = ai + 1;
      }
      return codegen.invoke(effects, prepared, actual);
    }

    // named function call -> inline
    var argv = [];
    var k = 0;
    while (k < args.length) {
      var actualArg = evalExpr(funcs, args[k], env, effects, underDynamic);
      if (args[k][args[k].length - 1] && !atomic(args[k])) { actualArg = codegen.bindExpression(effects, actualArg); }
      argv.push(actualArg); k = k + 1;
    }
    var fn = fnLookup(funcs, callee[1]);
    var fenv = emptyEnv(fn);
    var j = 0;
    while (j < fn[2].length) {
      var parameter = argv[j];
      if (fn[5][j]) {
        if (j < args.length && args[j][args[j].length - 1]) { parameter = parameter.source; }
        else { parameter = codegen.literal(parameter).source; }
      }
      envSet(fenv, fn[2][j], parameter); j = j + 1;
    }
    return evalStmts(funcs, fn[3], fenv, effects, underDynamic)[1];
  }
  throw new Error("Unsupported expression: " + tag);
}

// Completion records distinguish return from normal completion. The stable
// function-scoped binding cells are updated in place, not returned/replaced.
function cloneEnv(env) {
  var copy = Object.create(null);
  var names = Object.keys(env);
  var i = 0;
  while (i < names.length) { copy[names[i]] = {value: env[names[i]].value}; i = i + 1; }
  return copy;
}
function envSet(env, name, value) { env[name].value = value; return env; }
// A list of statements: its completion, [returned, value].
function evalStmts(funcs, stmts, env, effects, underDynamic) {
  var i = 0;
  while (i < stmts.length) {
    var done = evalStmt(funcs, stmts[i], env, effects, underDynamic);
    if (done[0]) { return done; }
    i = i + 1;
  }
  return [false, undefined];
}

// One statement. (A nested statement is evaluated as it is, not wrapped in a
// new list: what the specializer of this file allocates in a loop it cannot
// treat as the program's fixed syntax.)
function evalStmt(funcs, s, env, effects, underDynamic) {
  var st = s[0];
  if (st === "throw") {
    var error = evalExpr(funcs, s[1], env, effects, underDynamic);
    if (underDynamic || s[1][s[1].length - 1]) { codegen.throwValue(effects, error); return [true, undefined]; }
    throw error;
  }
  if (st === "return") {
    var returned = evalExpr(funcs, s[1], env, effects, underDynamic);
    if (s[2] && !s[1][s[1].length - 1]) { returned = codegen.literal(returned); }
    return [true, returned];
  }
  if (st === "var" || st === "assign") {
    var assigned = evalExpr(funcs, s[2], env, effects, underDynamic);
    if (s[3]) {
      if (s[2][s[2].length - 1]) {
        if (!atomic(s[2])) { assigned = codegen.bindExpression(effects, assigned); }
        assigned = assigned.source;
      }
      else { assigned = codegen.literal(assigned).source; }
    }
    envSet(env, s[1], assigned);
    return [false, undefined];
  }
  if (st === "expr") {
    var discarded = evalExpr(funcs, s[1], env, effects, underDynamic);
    if (s[1][s[1].length - 1] && !atomic(s[1])) { codegen.discard(effects, discarded); }
    return [false, undefined];
  }
  if (st === "if") {
    if (s[1][s[1].length - 1]) {
      var condition = evalExpr(funcs, s[1], env, effects, underDynamic);
      var yesEnv = cloneEnv(env);
      var noEnv = cloneEnv(env);
      var yesEffects = codegen.fork(effects);
      var noEffects = codegen.fork(effects);
      var yesResult;
      try { yesResult = evalStmt(funcs, s[2], yesEnv, yesEffects, true); }
      catch (error) { yesResult = codegen.caught(yesEffects, error); }
      var noResult = [false, undefined];
      if (s[3]) {
        try { noResult = evalStmt(funcs, s[3], noEnv, noEffects, true); }
        catch (error) { noResult = codegen.caught(noEffects, error); }
      }
      return codegen.branch(effects, condition, yesEffects, noEffects, yesResult, noResult, env, yesEnv, noEnv);
    }
    if (evalExpr(funcs, s[1], env, effects, underDynamic)) {
      return evalStmt(funcs, s[2], env, effects, underDynamic);
    }
    if (s[3]) {
      return evalStmt(funcs, s[3], env, effects, underDynamic);
    }
    return [false, undefined];
  }
  if (st === "block") {
    return evalStmts(funcs, s[1], env, effects, underDynamic);
  }
  if (st === "while") {
    if (s[1][s[1].length - 1]) {
      return evalDynamicWhile(funcs, s, env, effects);
    }
    while (evalExpr(funcs, s[1], env, effects, underDynamic)) {
      var body = evalStmt(funcs, s[2], env, effects, underDynamic);
      if (body[0]) { return body; }
    }
    return [false, undefined];
  }
  throw new Error("Unsupported statement: " + st);
}

// A loop whose test is dynamic becomes a loop in the target. Binding-time
// analysis makes every variable the body assigns dynamic, so each is carried
// around the target loop in a variable of its own; the test and the body are
// specialized once, with those variables, and the values the body leaves are
// assigned back to them on the back edge.
function evalDynamicWhile(funcs, s, env, effects) {
  var names = assignedNames(s[2], []);
  var carried = [];
  var c = 0;
  while (c < names.length) {
    var loopVar = codegen.carry(effects, codegen.reference(envLookup(env, names[c])));
    envSet(env, names[c], loopVar);
    carried.push(loopVar);
    c = c + 1;
  }
  var testEffects = codegen.fork(effects);
  var condition = evalExpr(funcs, s[1], env, testEffects, true);
  var bodyEffects = codegen.fork(effects);
  var bodyEnv = cloneEnv(env);
  var bodyResult;
  try { bodyResult = evalStmt(funcs, s[2], bodyEnv, bodyEffects, true); }
  catch (error) { bodyResult = codegen.caught(bodyEffects, error); }
  var after = [];
  var a = 0;
  while (a < names.length) { after.push(envLookup(bodyEnv, names[a])); a = a + 1; }
  codegen.loop(effects, testEffects, condition, bodyEffects, bodyResult, carried, after);
  return [false, undefined];
}

// The variables a statement assigns (not those of functions it calls, which
// have their own).
function assignedNames(s, names) {
  var st = s[0];
  if (st === "var" || st === "assign") {
    if (names.indexOf(s[1]) < 0) { names.push(s[1]); }
  } else if (st === "block") {
    var i = 0;
    while (i < s[1].length) { assignedNames(s[1][i], names); i = i + 1; }
  } else if (st === "if") {
    assignedNames(s[2], names);
    if (s[3]) { assignedNames(s[3], names); }
  } else if (st === "while") {
    assignedNames(s[2], names);
  }
  return names;
}

// entry: specialize the interpreter `entryName(prog, input)` for a given prog,
// with input dynamic. Returns source for a function of the dynamic input.
function jsmix(funcs, entryName, prog) {
  var fn = fnLookup(funcs, entryName);
  var env = envSet(envSet(emptyEnv(fn), fn[2][0], prog), fn[2][1], "io"); // dynamic input -> target parameter io
  var effects = codegen.buffer();
  var result = evalStmts(funcs, fn[3], env, effects, false)[1];
  return codegen.finish(effects, result);
}
