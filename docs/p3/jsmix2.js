// jsmix2: an online partial evaluator for a small pure JavaScript subset,
// written in that same subset, so it can be applied to itself.
//
// The subset (what jsmix2 accepts and what it is written in):
//   function declarations; `var x = e;`, `if (e) S else S`, `return e;`, blocks;
//   expressions: number/string/boolean/null literals, variables, array literals,
//   `a[i]`, `a.length`, `a.slice(i)`, `a.slice(i, j)`, `a.concat(b)`,
//   `s.indexOf(x)`,
//   `+ - * === !== < > <= >=`,
//   `&& || !`, `c ? a : b`, calls to declared functions, and the builtins `str`
//   (JSON.stringify), `isArr` (Array.isArray), `kind` (typeof, with "array"
//   and "null") and `fail(msg)` (throws).
//   No loops, no assignment, no mutation, no closures: loops are recursion.
//
// Values during specialization:
//   ["S", v]       static: v is known now
//   ["D", code]    dynamic: code is residual JavaScript computing the value
//   ["A", [vals]]  a partially static array: known length, each element its own
//                  value. Under self-application this is what keeps the inner
//                  specializer's binding-time tags static.
//   ["B", code]    (statement results only) a residual statement block that
//                  ends in `return`: a body that binds residual variables or
//                  branches on a dynamic `if`.
//
// A dynamic `var` whose value is non-trivial code is bound to a fresh residual
// variable `_vN` rather than copied into every use, which would multiply code
// size (and does, exponentially, under self-application).
//
// Calls: a call is unfolded, unless it happens under a dynamic condition (in a
// branch of an `if`/`?:`/`&&`/`||` whose test is dynamic). Such a call becomes a
// call to a residual function, memoized on the static skeleton of its
// arguments, whose parameters are the dynamic leaves; its body is specialized
// later from a pending list. Static values that only vary finitely (a VM's
// program counter) stay static, one residual function per value. Termination
// for values that keep growing: when a residual function for f would be created
// from inside a chain of residual functions that already has one for f with a
// smaller skeleton, the arguments that differ are generalized (made dynamic);
// and past MAX_VARIANTS residual functions for one f, all its static arguments
// are generalized.
//
// The context `cx` = [underDynamicControl, ancestry], where ancestry lists the
// [function name, skeleton] of the residual functions whose bodies led here.
//
// Specialization state `st` is threaded through everything (the subset has no
// mutation): st = [memo, pending, counter], memo = list of [key, name],
// pending = list of [name, fundecl, skeleton].
//
// Entry: mix(program, entryName, svals) specializes `entryName`, whose first
// svals.length parameters are static with those values and whose remaining
// parameters are dynamic. Returns the residual program as JavaScript source,
// with the specialized entry named `main`.

function S(v) { return ["S", v]; }
function D(c) { return ["D", c]; }
function isS(v) { return v[0] === "S"; }
function isD(v) { return v[0] === "D"; }
function isA(v) { return v[0] === "A"; }
function isB(v) { return v[0] === "B"; }

function allStatic(vals) {
  if (vals.length === 0) { return true; }
  return isS(vals[0]) && allStatic(vals.slice(1));
}
function staticsOf(vals) {
  if (vals.length === 0) { return []; }
  return [vals[0][1]].concat(staticsOf(vals.slice(1)));
}
// Build an array value, collapsing to fully static when every element is.
function mkArr(vals) {
  if (allStatic(vals)) { return S(staticsOf(vals)); }
  return ["A", vals];
}
// View a static array as a list of static element values.
function elemsOfStatic(xs) {
  if (xs.length === 0) { return []; }
  return [S(xs[0])].concat(elemsOfStatic(xs.slice(1)));
}
// The element values of an array value (S array or A), or null.
function elems(v) {
  if (isA(v)) { return v[1]; }
  if (isS(v) && isArr(v[1])) { return elemsOfStatic(v[1]); }
  return null;
}

// ───────────── residual code ─────────────

function lift(v) {
  if (isS(v)) { return str(v[1]); }
  if (isD(v)) { return v[1]; }
  return "[" + joinCodes(v[1]) + "]";
}
function joinCodes(vals) {
  if (vals.length === 0) { return ""; }
  if (vals.length === 1) { return lift(vals[0]); }
  return lift(vals[0]) + ", " + joinCodes(vals.slice(1));
}
// A statement result as a statement block.
function body(r) {
  if (isB(r)) { return r[1]; }
  return "return " + lift(r) + ";\n";
}
// A statement result as an expression value.
function asValue(r) {
  if (isB(r)) { return D("(function () {\n" + r[1] + "})()"); }
  return r;
}
// Code that is cheap to copy: a name or a literal without spaces or brackets.
function isAtom(code) {
  return code.indexOf(" ") < 0 && code.indexOf("(") < 0 && code.indexOf("[") < 0;
}
// Bind the non-trivial dynamic leaves of `v` to fresh residual variables.
// Returns [value, st, bindingCode].
function nameLeaves(v, st) {
  if (isS(v)) { return [v, st, ""]; }
  if (isD(v)) {
    if (isAtom(v[1])) { return [v, st, ""]; }
    var name = "_v" + st[2];
    return [D(name), [st[0], st[1], st[2] + 1], "var " + name + " = " + v[1] + ";\n"];
  }
  var r = nameLeavesList(v[1], st);
  return [mkArr(r[0]), r[1], r[2]];
}
function nameLeavesList(vals, st) {
  if (vals.length === 0) { return [[], st, ""]; }
  var a = nameLeaves(vals[0], st);
  var b = nameLeavesList(vals.slice(1), a[1]);
  return [[a[0]].concat(b[0]), b[1], a[2] + b[2]];
}

function joinStrs(xs) {
  if (xs.length === 0) { return ""; }
  if (xs.length === 1) { return xs[0]; }
  return xs[0] + ", " + joinStrs(xs.slice(1));
}

// ───────────── environments and programs ─────────────

function lookup(env, name) {
  if (env.length === 0) { return D(name); }
  if (env[0][0] === name) { return env[0][1]; }
  return lookup(env.slice(1), name);
}
function bindAll(names, vals, env) {
  if (names.length === 0) { return env; }
  return bindAll(names.slice(1), vals.slice(1), [[names[0], vals[0]]].concat(env));
}
function findFn(prog, name) {
  if (prog.length === 0) { return null; }
  if (prog[0][1] === name) { return prog[0]; }
  return findFn(prog.slice(1), name);
}

// ───────────── skeletons (the static part of a value) ─────────────

function skel(v) {
  if (isS(v)) { return ["S", v[1]]; }
  if (isD(v)) { return ["D"]; }
  return ["A", skels(v[1])];
}
function skels(vals) {
  if (vals.length === 0) { return []; }
  return [skel(vals[0])].concat(skels(vals.slice(1)));
}
function sizeOfData(x) {
  if (isArr(x)) { return 1 + sizeOfList(x); }
  return 1;
}
function sizeOfList(xs) {
  if (xs.length === 0) { return 0; }
  return sizeOfData(xs[0]) + sizeOfList(xs.slice(1));
}
function sizeOfSkel(k) {
  if (k[0] === "S") { return sizeOfData(k[1]); }
  if (k[0] === "D") { return 1; }
  return 1 + sizeOfSkels(k[1]);
}
function sizeOfSkels(ks) {
  if (ks.length === 0) { return 0; }
  return sizeOfSkel(ks[0]) + sizeOfSkels(ks.slice(1));
}
// The dynamic leaves of a list of values, as residual code, in order.
function dynLeaves(vals) {
  if (vals.length === 0) { return []; }
  return dynLeavesOf(vals[0]).concat(dynLeaves(vals.slice(1)));
}
function dynLeavesOf(v) {
  if (isS(v)) { return []; }
  if (isD(v)) { return [v[1]]; }
  return dynLeaves(v[1]);
}
// Generalize `v` against an earlier skeleton `k`: keep what agrees, make the
// rest dynamic.
function generalize(v, k) {
  if (str(skel(v)) === str(k)) { return v; }
  var es = elems(v);
  if (es !== null && k[0] === "A" && es.length === k[1].length) {
    return mkArr(generalizeList(es, k[1]));
  }
  if (es !== null && k[0] === "S" && isArr(k[1]) && es.length === k[1].length) {
    return mkArr(generalizeList(es, skels(elemsOfStatic(k[1]))));
  }
  return D(lift(v));
}
function generalizeList(vals, ks) {
  if (vals.length === 0) { return []; }
  return [generalize(vals[0], ks[0])].concat(generalizeList(vals.slice(1), ks.slice(1)));
}
// Rebuild argument values from a skeleton, naming dynamic leaves p0, p1, ...
// Returns [values, nextIndex].
function rebuild(k, n) {
  if (k[0] === "S") { return [S(k[1]), n]; }
  if (k[0] === "D") { return [D("p" + n), n + 1]; }
  var r = rebuildList(k[1], n);
  return [mkArr(r[0]), r[1]];
}
function rebuildList(ks, n) {
  if (ks.length === 0) { return [[], n]; }
  var a = rebuild(ks[0], n);
  var b = rebuildList(ks.slice(1), a[1]);
  return [[a[0]].concat(b[0]), b[1]];
}
function paramNames(n, i) {
  if (i >= n) { return []; }
  return ["p" + i].concat(paramNames(n, i + 1));
}

// ───────────── evaluation ─────────────

// Every eval returns [value, st].

function evalExpr(e, env, st, prog, cx) {
  var tag = e[0];
  if (tag === "lit") { return [S(e[1]), st]; }
  if (tag === "var") { return [lookup(env, e[1]), st]; }
  if (tag === "arr") {
    var r = evalList(e[1], env, st, prog, cx);
    return [mkArr(r[0]), r[1]];
  }
  if (tag === "idx") {
    var ra = evalExpr(e[1], env, st, prog, cx);
    var rb = evalExpr(e[2], env, ra[1], prog, cx);
    return [index(ra[0], rb[0]), rb[1]];
  }
  if (tag === "dot") {
    var ro = evalExpr(e[1], env, st, prog, cx);
    return [prop(ro[0], e[2]), ro[1]];
  }
  if (tag === "not") {
    var rn = evalExpr(e[1], env, st, prog, cx);
    if (isS(rn[0])) { return [S(!rn[0][1]), rn[1]]; }
    return [D("!" + paren(lift(rn[0]))), rn[1]];
  }
  if (tag === "bin") {
    var op = e[1];
    if (op === "&&" || op === "||") { return evalLogic(op, e, env, st, prog, cx); }
    var rl = evalExpr(e[2], env, st, prog, cx);
    var rr = evalExpr(e[3], env, rl[1], prog, cx);
    return [binop(op, rl[0], rr[0]), rr[1]];
  }
  if (tag === "cond") {
    var rc = evalExpr(e[1], env, st, prog, cx);
    if (isS(rc[0])) {
      if (rc[0][1]) { return evalExpr(e[2], env, rc[1], prog, cx); }
      return evalExpr(e[3], env, rc[1], prog, cx);
    }
    var dcx = [true, cx[1]];
    var rt = evalExpr(e[2], env, rc[1], prog, dcx);
    var rf = evalExpr(e[3], env, rt[1], prog, dcx);
    return [D("(" + lift(rc[0]) + " ? " + lift(rt[0]) + " : " + lift(rf[0]) + ")"), rf[1]];
  }
  if (tag === "call") { return evalCall(e, env, st, prog, cx); }
  return [fail("jsmix2: unsupported expression " + str(tag)), st];
}

function evalList(es, env, st, prog, cx) {
  if (es.length === 0) { return [[], st]; }
  var a = evalExpr(es[0], env, st, prog, cx);
  var b = evalList(es.slice(1), env, a[1], prog, cx);
  return [[a[0]].concat(b[0]), b[1]];
}

// `a && b` / `a || b`: the subset is pure, so this is a conditional.
function evalLogic(op, e, env, st, prog, cx) {
  var rl = evalExpr(e[2], env, st, prog, cx);
  if (isS(rl[0])) {
    if (op === "&&") {
      if (rl[0][1]) { return evalExpr(e[3], env, rl[1], prog, cx); }
      return rl;
    }
    if (rl[0][1]) { return rl; }
    return evalExpr(e[3], env, rl[1], prog, cx);
  }
  var rr = evalExpr(e[3], env, rl[1], prog, [true, cx[1]]);
  return [D("(" + lift(rl[0]) + " " + op + " " + lift(rr[0]) + ")"), rr[1]];
}

function paren(c) { return "(" + c + ")"; }

// Can a static value be indexed / have `.length` / `.slice` without throwing?
// When it can't (null on a path that is dead at runtime), the operation is left
// as residual code instead of failing during specialization.
function indexable(x) { return kind(x) === "array" || kind(x) === "string"; }

function index(a, i) {
  if (isS(a) && isS(i) && indexable(a[1])) { return S(a[1][i[1]]); }
  if (isA(a) && isS(i)) { return a[1][i[1]]; }
  return D(paren(lift(a)) + "[" + lift(i) + "]");
}

function prop(o, name) {
  if (name === "length") {
    if (isS(o) && indexable(o[1])) { return S(o[1].length); }
    if (isA(o)) { return S(o[1].length); }
    return D(paren(lift(o)) + ".length");
  }
  return D(paren(lift(o)) + "." + name);
}

function binop(op, a, b) {
  if (isS(a) && isS(b)) { return S(applyOp(op, a[1], b[1])); }
  return D("(" + lift(a) + " " + op + " " + lift(b) + ")");
}

function applyOp(op, x, y) {
  if (op === "+") { return x + y; }
  if (op === "-") { return x - y; }
  if (op === "*") { return x * y; }
  if (op === "===") { return x === y; }
  if (op === "!==") { return x !== y; }
  if (op === "<") { return x < y; }
  if (op === ">") { return x > y; }
  if (op === "<=") { return x <= y; }
  return x >= y;
}

// Builtins: `str(v)`, `isArr(v)`, `kind(v)`, `fail(msg)`, `a.slice(i)`,
// `a.slice(i, j)`, `a.concat(b)`, `s.indexOf(x)`. Any other arity is an error.
function evalBuiltin(name, recv, args) {
  if (name !== "slice" && args.length !== 1) {
    return fail("jsmix2: builtin " + str(name) + " takes 1 argument, got " + str(args.length));
  }
  if (name === "str") {
    if (isS(args[0])) { return S(str(args[0][1])); }
    return D("str(" + lift(args[0]) + ")");
  }
  if (name === "isArr") {
    if (isS(args[0])) { return S(isArr(args[0][1])); }
    if (isA(args[0])) { return S(true); }
    return D("isArr(" + lift(args[0]) + ")");
  }
  if (name === "kind") {
    if (isS(args[0])) { return S(kind(args[0][1])); }
    if (isA(args[0])) { return S("array"); }
    return D("kind(" + lift(args[0]) + ")");
  }
  if (name === "fail") {
    if (isS(args[0])) { return fail(args[0][1]); }
    return D("fail(" + lift(args[0]) + ")");
  }
  if (name === "slice") {
    if (args.length === 1) {
      if (isS(recv) && isS(args[0]) && indexable(recv[1])) { return S(recv[1].slice(args[0][1])); }
      if (isA(recv) && isS(args[0])) { return mkArr(recv[1].slice(args[0][1])); }
      return D(paren(lift(recv)) + ".slice(" + lift(args[0]) + ")");
    }
    if (args.length === 2) {
      if (isS(recv) && allStatic(args) && indexable(recv[1])) { return S(recv[1].slice(args[0][1], args[1][1])); }
      if (isA(recv) && allStatic(args)) { return mkArr(recv[1].slice(args[0][1], args[1][1])); }
      return D(paren(lift(recv)) + ".slice(" + joinCodes(args) + ")");
    }
    return fail("jsmix2: slice takes 1 or 2 arguments, got " + str(args.length));
  }
  if (name === "indexOf") {
    if (isS(recv) && isS(args[0]) && indexable(recv[1])) { return S(recv[1].indexOf(args[0][1])); }
    return D(paren(lift(recv)) + ".indexOf(" + lift(args[0]) + ")");
  }
  if (name === "concat") {
    var ea = elems(recv);
    var eb = elems(args[0]);
    if (ea !== null && eb !== null) { return mkArr(ea.concat(eb)); }
    return D(paren(lift(recv)) + ".concat(" + lift(args[0]) + ")");
  }
  return fail("jsmix2: unknown builtin " + str(name));
}

// A call in expression position: a body that binds variables or branches is
// wrapped in a function expression.
function evalCall(e, env, st, prog, cx) {
  var r = evalCallStmt(e, env, st, prog, cx);
  return [asValue(r[0]), r[1]];
}

// A call whose result may be a statement block (`return f(...)` splices it).
function evalCallStmt(e, env, st, prog, cx) {
  var callee = e[1];
  var ra = evalList(e[2], env, st, prog, cx);
  var args = ra[0];
  var st1 = ra[1];
  if (callee[0] === "dot") {
    var rr = evalExpr(callee[1], env, st1, prog, cx);
    return [evalBuiltin(callee[2], rr[0], args), rr[1]];
  }
  var f = findFn(prog, callee[1]);
  if (f === null) { return [evalBuiltin(callee[1], null, args), st1]; }
  if (!cx[0] || allStatic(args)) { return unfold(f, args, st1, prog, cx); }
  return residualCall(f, args, st1, cx[1]);
}

function unfold(f, args, st, prog, cx) {
  return evalStmts(f[3], bindAll(f[2], args, []), st, prog, cx);
}

function MAX_VARIANTS() { return 64; }

// A call to the residual function for (f, skeleton of args), creating it (and
// scheduling its body) on first use, after the termination checks.
function residualCall(f, args, st, anc) {
  var k = skels(args);
  var key = f[1] + ":" + str(k);
  var found = memoFind(st[0], key);
  var call = "(" + joinStrs(dynLeaves(args)) + ")";
  if (found !== null) { return [D(found + call), st]; }
  var smaller = smallerAncestor(anc, f[1], sizeOfSkels(k));
  if (smaller !== null) {
    var g = generalizeList(args, smaller[1]);
    if (str(skels(g)) !== str(k)) { return residualCall(f, g, st, anc); }
  }
  if (countFor(st[0], f[1] + ":") >= MAX_VARIANTS() && !allDynamic(args)) {
    return residualCall(f, liftAll(args), st, anc);
  }
  var name = f[1] + "_" + st[2];
  var item = [name, f, k, anc.concat([[f[1], k]])];
  return [D(name + call), [[[key, name]].concat(st[0]), st[1].concat([item]), st[2] + 1]];
}

// The nearest ancestor residual function for `fname` whose skeleton is smaller.
function smallerAncestor(anc, fname, size) {
  if (anc.length === 0) { return null; }
  var last = anc[anc.length - 1];
  if (last[0] === fname && sizeOfSkels(last[1]) < size) { return last; }
  return smallerAncestor(anc.slice(0, anc.length - 1), fname, size);
}
function startsWith(s, prefix) { return s.slice(0, prefix.length) === prefix; }
function countFor(memo, prefix) {
  if (memo.length === 0) { return 0; }
  return (startsWith(memo[0][0], prefix) ? 1 : 0) + countFor(memo.slice(1), prefix);
}
function allDynamic(vals) {
  if (vals.length === 0) { return true; }
  return isD(vals[0]) && allDynamic(vals.slice(1));
}
function liftAll(vals) {
  if (vals.length === 0) { return []; }
  return [D(lift(vals[0]))].concat(liftAll(vals.slice(1)));
}

function memoFind(memo, key) {
  if (memo.length === 0) { return null; }
  if (memo[0][0] === key) { return memo[0][1]; }
  return memoFind(memo.slice(1), key);
}

function evalStmts(stmts, env, st, prog, cx) {
  if (stmts.length === 0) { return [S(null), st]; }
  var s = stmts[0];
  var rest = stmts.slice(1);
  var t = s[0];
  if (t === "return") {
    if (s[1][0] === "call") { return evalCallStmt(s[1], env, st, prog, cx); }
    return evalExpr(s[1], env, st, prog, cx);
  }
  if (t === "var") {
    var rv = evalExpr(s[2], env, st, prog, cx);
    var nb = nameLeaves(rv[0], rv[1]);
    var rs = evalStmts(rest, [[s[1], nb[0]]].concat(env), nb[1], prog, cx);
    if (nb[2] === "") { return rs; }
    return [["B", nb[2] + body(rs[0])], rs[1]];
  }
  if (t === "block") { return evalStmts(s[1].concat(rest), env, st, prog, cx); }
  if (t === "if") {
    var rc = evalExpr(s[1], env, st, prog, cx);
    var thenS = [s[2]].concat(rest);
    var elseS = s[3] === null ? rest : [s[3]].concat(rest);
    if (isS(rc[0])) {
      if (rc[0][1]) { return evalStmts(thenS, env, rc[1], prog, cx); }
      return evalStmts(elseS, env, rc[1], prog, cx);
    }
    var dcx = [true, cx[1]];
    var rt = evalStmts(thenS, env, rc[1], prog, dcx);
    var rf = evalStmts(elseS, env, rt[1], prog, dcx);
    if (!isB(rt[0]) && !isB(rf[0])) {
      return [D("(" + lift(rc[0]) + " ? " + lift(rt[0]) + " : " + lift(rf[0]) + ")"), rf[1]];
    }
    return [["B", "if (" + lift(rc[0]) + ") {\n" + body(rt[0]) + "} else {\n" + body(rf[0]) + "}\n"], rf[1]];
  }
  return evalStmts(rest, env, st, prog, cx);
}

// ───────────── driver ─────────────

function specializePending(st, prog, out) {
  if (st[1].length === 0) { return out; }
  var item = st[1][0];
  var st1 = [st[0], st[1].slice(1), st[2]];
  var rb = rebuildList(item[2], 0);
  var r = unfold(item[1], rb[0], st1, prog, [false, item[3]]);
  var code = "function " + item[0] + "(" + joinStrs(paramNames(rb[1], 0)) + ") {\n" + body(r[0]) + "}\n";
  return specializePending(r[1], prog, out + code);
}

function staticArgs(svals) {
  if (svals.length === 0) { return []; }
  return [S(svals[0])].concat(staticArgs(svals.slice(1)));
}
function dynArgs(names) {
  if (names.length === 0) { return []; }
  return [D(names[0])].concat(dynArgs(names.slice(1)));
}

function mix(prog, entry, svals) {
  var f = findFn(prog, entry);
  var dynNames = f[2].slice(svals.length);
  var args = staticArgs(svals).concat(dynArgs(dynNames));
  var r = unfold(f, args, [[], [], 0], prog, [false, []]);
  var main = "function main(" + joinStrs(dynNames) + ") {\n" + body(r[0]) + "}\n";
  return specializePending(r[1], prog, main);
}
