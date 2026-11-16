// mix3: jsmix2 (docs/p3/jsmix2.js) emitting programs as syntax trees, in the
// format it reads (parse2's), instead of JavaScript text. What it makes can be
// given to it again, or run by an evaluator (eval3.js), with no Function(...):
// so a program can run the whole chain, the specializer applied to itself, the
// cogen that makes, and the compilers the cogen makes, and split-shot can
// specialize through all of it.
//
// The subset, the values during specialization (["S", v], ["D", code],
// ["A", vals], ["B", stmts]), the residual functions, their skeletons and the
// termination rules are jsmix2's; see there. Here `code` is an expression tree
// and a ["B", ...] result holds a list of statement trees ending in a return.
//
// Entry: mix(program, entryName, svals) specializes `entryName` to its first
// svals.length arguments; the residual program is a list of ["fundecl", ...],
// its entry named `main`.

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

// A value as an expression tree. (A static value of any kind is a literal:
// ["lit", v], whatever v is.)
function lift(v) {
  if (isS(v)) { return ["lit", v[1]]; }
  if (isD(v)) { return v[1]; }
  return ["arr", liftList(v[1])];
}
function liftList(vals) {
  if (vals.length === 0) { return []; }
  return [lift(vals[0])].concat(liftList(vals.slice(1)));
}
// A statement result as a list of statements ending in a return.
function body(r) {
  if (isB(r)) { return r[1]; }
  return [["return", lift(r)]];
}
// A statement result as an expression value.
function asValue(r) {
  if (isB(r)) { return D(["call", ["fun", [], r[1]], []]); }
  return r;
}
// Code that is cheap to copy: a variable or a literal.
function isAtom(code) {
  return code[0] === "var" || code[0] === "lit";
}
// Bind the non-trivial dynamic leaves of `v` to fresh residual variables.
// Returns [value, st, bindings], the bindings a list of `var` statements.
function nameLeaves(v, st) {
  if (isS(v)) { return [v, st, []]; }
  if (isD(v)) {
    if (isAtom(v[1])) { return [v, st, []]; }
    var name = "_v" + st[2];
    return [D(["var", name]), [st[0], st[1], st[2] + 1], [["var", name, v[1]]]];
  }
  var r = nameLeavesList(v[1], st);
  return [mkArr(r[0]), r[1], r[2]];
}
function nameLeavesList(vals, st) {
  if (vals.length === 0) { return [[], st, []]; }
  var a = nameLeaves(vals[0], st);
  var b = nameLeavesList(vals.slice(1), a[1]);
  return [[a[0]].concat(b[0]), b[1], a[2].concat(b[2])];
}

// ───────────── environments and programs ─────────────

function lookup(env, name) {
  if (env.length === 0) { return D(["var", name]); }
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
  if (k[0] === "D") { return [D(["var", "p" + n]), n + 1]; }
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
    return [D(["not", lift(rn[0])]), rn[1]];
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
    return [D(["cond", lift(rc[0]), lift(rt[0]), lift(rf[0])]), rf[1]];
  }
  if (tag === "call") { return evalCall(e, env, st, prog, cx); }
  return [fail("mix3: unsupported expression " + str(tag)), st];
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
  return [D(["bin", op, lift(rl[0]), lift(rr[0])]), rr[1]];
}


// Can a static value be indexed / have `.length` / `.slice` without throwing?
// When it can't (null on a path that is dead at runtime), the operation is left
// as residual code instead of failing during specialization.
function indexable(x) { return kind(x) === "array" || kind(x) === "string"; }

function index(a, i) {
  if (isS(a) && isS(i) && indexable(a[1])) { return S(a[1][i[1]]); }
  if (isA(a) && isS(i)) { return a[1][i[1]]; }
  return D(["idx", lift(a), lift(i)]);
}

function prop(o, name) {
  if (name === "length") {
    if (isS(o) && indexable(o[1])) { return S(o[1].length); }
    if (isA(o)) { return S(o[1].length); }
    return D(["dot", lift(o), "length"]);
  }
  return D(["dot", lift(o), name]);
}

function binop(op, a, b) {
  if (isS(a) && isS(b)) { return S(applyOp(op, a[1], b[1])); }
  return D(["bin", op, lift(a), lift(b)]);
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
    return fail("mix3: builtin " + str(name) + " takes 1 argument, got " + str(args.length));
  }
  if (name === "str") {
    if (isS(args[0])) { return S(str(args[0][1])); }
    return D(["call", ["var", "str"], [lift(args[0])]]);
  }
  if (name === "isArr") {
    if (isS(args[0])) { return S(isArr(args[0][1])); }
    if (isA(args[0])) { return S(true); }
    return D(["call", ["var", "isArr"], [lift(args[0])]]);
  }
  if (name === "kind") {
    if (isS(args[0])) { return S(kind(args[0][1])); }
    if (isA(args[0])) { return S("array"); }
    return D(["call", ["var", "kind"], [lift(args[0])]]);
  }
  if (name === "fail") {
    if (isS(args[0])) { return fail(args[0][1]); }
    return D(["call", ["var", "fail"], [lift(args[0])]]);
  }
  if (name === "slice") {
    if (args.length === 1) {
      if (isS(recv) && isS(args[0]) && indexable(recv[1])) { return S(recv[1].slice(args[0][1])); }
      if (isA(recv) && isS(args[0])) { return mkArr(recv[1].slice(args[0][1])); }
      return D(["call", ["dot", lift(recv), "slice"], [lift(args[0])]]);
    }
    if (args.length === 2) {
      if (isS(recv) && allStatic(args) && indexable(recv[1])) { return S(recv[1].slice(args[0][1], args[1][1])); }
      if (isA(recv) && allStatic(args)) { return mkArr(recv[1].slice(args[0][1], args[1][1])); }
      return D(["call", ["dot", lift(recv), "slice"], liftList(args)]);
    }
    return fail("mix3: slice takes 1 or 2 arguments, got " + str(args.length));
  }
  if (name === "indexOf") {
    if (isS(recv) && isS(args[0]) && indexable(recv[1])) { return S(recv[1].indexOf(args[0][1])); }
    return D(["call", ["dot", lift(recv), "indexOf"], [lift(args[0])]]);
  }
  if (name === "concat") {
    var ea = elems(recv);
    var eb = elems(args[0]);
    if (ea !== null && eb !== null) { return mkArr(ea.concat(eb)); }
    return D(["call", ["dot", lift(recv), "concat"], [lift(args[0])]]);
  }
  return fail("mix3: unknown builtin " + str(name));
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
  var leaves = dynLeaves(args);
  if (found !== null) { return [D(["call", ["var", found], leaves]), st]; }
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
  return [D(["call", ["var", name], leaves]), [[[key, name]].concat(st[0]), st[1].concat([item]), st[2] + 1]];
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
    if (nb[2].length === 0) { return rs; }
    return [["B", nb[2].concat(body(rs[0]))], rs[1]];
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
      return [D(["cond", lift(rc[0]), lift(rt[0]), lift(rf[0])]), rf[1]];
    }
    return [["B", [["if", lift(rc[0]), ["block", body(rt[0])], ["block", body(rf[0])]]]], rf[1]];
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
  var fn = ["fundecl", item[0], paramNames(rb[1], 0), body(r[0])];
  return specializePending(r[1], prog, out.concat([fn]));
}

function staticArgs(svals) {
  if (svals.length === 0) { return []; }
  return [S(svals[0])].concat(staticArgs(svals.slice(1)));
}
function dynArgs(names) {
  if (names.length === 0) { return []; }
  return [D(["var", names[0]])].concat(dynArgs(names.slice(1)));
}

function mix(prog, entry, svals) {
  var f = findFn(prog, entry);
  var dynNames = f[2].slice(svals.length);
  var args = staticArgs(svals).concat(dynArgs(dynNames));
  var r = unfold(f, args, [[], [], 0], prog, [false, []]);
  var main = ["fundecl", "main", dynNames, body(r[0])];
  return specializePending(r[1], prog, [main]);
}
