// jsmix: a partial evaluator for a reasonable JS subset, WRITTEN IN the subset.
// It takes a parsed interpreter AST (see parse.js) and specializes it. Generic:
// the only codegen is pevalArith ("an arithmetic op with a dynamic operand
// residualizes to the same op"), so a compiler's `+`/`*`/`-` FALL OUT of the
// interpreter's operators. Loops come from `.reduce`, walked STRUCTURALLY (list
// shrinks via slice) so RustPE's growth whistle ties the residual compiler loop.
//
// Value domain:
//   source value : ["S", n] static | ["D", codeAST] dynamic   (codeAST = compiled output)
//   program datum: a plain number/string/bool, or a program array (instr/prog)
// codeAST: ["rlit",n] | ["rin"] | ["radd",a,b] | ["rsub",a,b] | ["rmul",a,b]

// A SOURCE VALUE: a STATIC one is a bare number; a DYNAMIC one is a JS SOURCE
// STRING (the compiled target text). The compiler the projection derives emits
// real JS source -- the `+`/`*`/`-` come straight from the interpreter's ops.
function toCode(v) { if (v === null) { return "null"; } if (typeof v === "number") { return "" + v; } return v; }

function pevalArith(op, a, b) {
  if (typeof a === "number" && typeof b === "number") {
    if (op === "+") { return a + b; }
    if (op === "-") { return a - b; }
    return a * b;
  }
  var ca = toCode(a); var cb = toCode(b);
  if (op === "+") { return "(" + ca + " + " + cb + ")"; }
  if (op === "-") { return "(" + ca + " - " + cb + ")"; }
  return "(" + ca + " * " + cb + ")";
}

// The environment is a FIXED-SIZE frame: exactly ENVN slots, unused ones holding
// the sentinel name "". Every scan iterates the LITERAL constant ENVN, never
// env.length -- so the loop bound stays a compile-time constant even if RustPE
// materializes the env into a runtime value, and the scan unrolls (no runaway)
// instead of becoming a dynamic-bound loop.
function emptyEnv() {
  return [["",0],["",0],["",0],["",0],["",0],["",0],["",0],["",0]];
}
function envLookup(env, name) {
  var i = 0;
  while (i < 8) { if (env[i][0] === name) { return env[i][1]; } i = i + 1; }
  return 0;
}
function envExtend(env, name, val) {
  var e2 = [];
  var placed = 0;
  var i = 0;
  while (i < 8) {
    if (placed === 0 && env[i][0] === "") { e2.push([name, val]); placed = 1; }
    else { e2.push(env[i]); }
    i = i + 1;
  }
  return e2;
}
function fnLookup(funcs, name) {
  var i = 0;
  while (i < funcs.length) { if (funcs[i][1] === name) { return funcs[i]; } i = i + 1; }
  return funcs[0];
}

function evalExpr(funcs, expr, env, effects) {
  var tag = expr[0];
  if (tag === "lit") { return expr[1]; }                 // plain program datum
  if (tag === "var") { return envLookup(env, expr[1]); }
  if (tag === "arr") {
    var els = expr[1]; var out = []; var i = 0;
    while (i < els.length) { out.push(evalExpr(funcs, els[i], env, effects)); i = i + 1; }
    return out;
  }
  if (tag === "idx") {
    var a = evalExpr(funcs, expr[1], env, effects);
    var b = evalExpr(funcs, expr[2], env, effects);
    return a[b];
  }
  if (tag === "dot") {
    var o = evalExpr(funcs, expr[1], env, effects);
    if (expr[2] === "length") { return o.length; }
    return 0;
  }
  if (tag === "bin") {
    var op = expr[1];
    if (op === "+" || op === "-" || op === "*") {
      return pevalArith(op, evalExpr(funcs, expr[2], env, effects), evalExpr(funcs, expr[3], env, effects));
    }
    var l = evalExpr(funcs, expr[2], env, effects);
    var r = evalExpr(funcs, expr[3], env, effects);
    if (op === "===" || op === "==") { return l === r; }
    if (op === "!==" || op === "!=") { return l !== r; }
    if (op === "<") { return l < r; }
    if (op === ">") { return l > r; }
    if (op === "<=") { return l <= r; }
    return l >= r;
  }
  if (tag === "cond") {
    if (evalExpr(funcs, expr[1], env, effects)) { return evalExpr(funcs, expr[2], env, effects); }
    return evalExpr(funcs, expr[3], env, effects);
  }
  if (tag === "call") {
    var callee = expr[1];
    var args = expr[2];
    // structural reduce: list.reduce(reducerFun, init)
    if (callee[0] === "dot" && callee[2] === "reduce") {
      var list = evalExpr(funcs, callee[1], env, effects);
      var reducer = args[0];                              // ["fun",[accP,instrP],body]
      var acc = toCode(evalExpr(funcs, args[1], env, effects)); // init lifted to a dynamic source STRING (uniform)
      var ap = reducer[1][0]; var ip = reducer[1][1];
      while (list.length > 0) {
        // Build the reducer frame INLINE (do not store it in a loop-carried var):
        // a persistent `var env2`/`var item` would be live across the loop head and
        // get materialized, flickering the env's `input` binding and breaking the
        // memo tie. Keeping it transient (like peval2) leaves only acc & list
        // loop-carried, both of which materialize to clean runtime vars.
        acc = evalStmts(funcs, reducer[2], envExtend(envExtend(env, ap, acc), ip, list[0]), effects)[1];
        list = list.slice(1);
      }
      return acc;
    }
    if (callee[0] === "dot" && callee[2] === "slice") {
      return evalExpr(funcs, callee[1], env, effects).slice(evalExpr(funcs, args[0], env, effects));
    }
    // A method on the dynamic entry input is an opaque runtime operation.
    // Emit each call once into a temporary, including discarded calls. This
    // preserves order and sharing across assignments and loop iterations.
    // This subset represents dynamic expressions as source strings.
    if (callee[0] === "dot") {
      var receiver = evalExpr(funcs, callee[1], env, effects);
      var callCode = toCode(receiver) + "." + callee[2] + "(";
      var ai = 0;
      while (ai < args.length) {
        if (ai > 0) { callCode = callCode + ", "; }
        callCode = callCode + toCode(evalExpr(funcs, args[ai], env, effects));
        ai = ai + 1;
      }
      var temp = "v" + effects.length;
      effects.push("var " + temp + " = " + callCode + ");\n");
      return temp;
    }
    // named function call -> inline
    var argv = [];
    var k = 0;
    while (k < args.length) { argv.push(evalExpr(funcs, args[k], env, effects)); k = k + 1; }
    var fn = fnLookup(funcs, callee[1]);
    var fenv = emptyEnv();
    var j = 0;
    while (j < fn[2].length) { fenv = envExtend(fenv, fn[2][j], argv[j]); j = j + 1; }
    return evalStmts(funcs, fn[3], fenv, effects)[1];
  }
  return 0;
}

// Completion records distinguish return from normal completion and carry the
// updated function-scoped environment through blocks, branches and loop bodies.
function envSet(env, name, value) {
  var out = [];
  var found = false;
  var i = 0;
  while (i < 8) {
    if (env[i][0] === name) { out.push([name, value]); found = true; }
    else { out.push(env[i]); }
    i = i + 1;
  }
  if (found) { return out; }
  return envExtend(env, name, value);
}
function evalStmts(funcs, stmts, env, effects) {
  var i = 0;
  while (i < stmts.length) {
    var s = stmts[i];
    var st = s[0];
    if (st === "return") { return [true, evalExpr(funcs, s[1], env, effects), env]; }
    if (st === "var" || st === "assign") {
      env = envSet(env, s[1], evalExpr(funcs, s[2], env, effects));
    } else if (st === "expr") { evalExpr(funcs, s[1], env, effects); }
    else if (st === "if") {
      var branch = s[3];
      if (evalExpr(funcs, s[1], env, effects)) { branch = s[2]; }
      if (branch) {
        var br = evalStmts(funcs, [branch], env, effects);
        if (br[0]) { return br; }
        env = br[2];
      }
    } else if (st === "block") {
      var block = evalStmts(funcs, s[1], env, effects);
      if (block[0]) { return block; }
      env = block[2];
    } else if (st === "while") {
      while (evalExpr(funcs, s[1], env, effects)) {
        var body = evalStmts(funcs, [s[2]], env, effects);
        if (body[0]) { return body; }
        env = body[2];
      }
    }
    i = i + 1;
  }
  return [false, null, env];
}

// entry: specialize the interpreter `entryName(prog, input)` for a given prog,
// with input dynamic. Returns a JavaScript expression (an IIFE when effects
// require an ordered statement sequence).
function jsmix(funcs, entryName, prog) {
  var fn = fnLookup(funcs, entryName);
  var env = envExtend(envExtend(emptyEnv(), fn[2][0], prog), fn[2][1], "x"); // input -> the source var "x"
  var effects = [];
  var result = toCode(evalStmts(funcs, fn[3], env, effects)[1]);
  if (effects.length === 0) { return result; }
  return "(function(){\n" + effects.join("") + "return " + result + ";\n})()";
}
