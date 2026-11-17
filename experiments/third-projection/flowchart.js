// Flowchart programs, after the flowchart language of Jones, Gomard and
// Sestoft's `mix` (Partial Evaluation and Automatic Program Generation, ch. 4),
// with JavaScript's expressions.
//
//   program  ["flowchart", params, blocks]       the first block is the entry
//   block    [label, assignments, jump]
//   assign   ["=", name, expression]
//   jump     ["goto", label] | ["if", expression, label, label] | ["return", expression]
//
// Expressions are subset-parse's trees: ["lit", v], ["var", x], ["undef"],
// ["arr", es], ["idx", a, i], ["dot", a, "length"], ["bin", op, a, b],
// ["unary", op, a], ["cond", c, a, b], ["call", ["var", f], args] for a
// builtin f, ["call", ["dot", a, m], args] for a method m. Everything is
// pure: no mutation, no effects, so evaluating an expression early is safe.
//
// This file is the host: the front end from a JavaScript function to a
// flowchart, the evaluator, the builtins, and the binding-time division.
// It holds only function declarations.

// ───────────── front end ─────────────

// A function of the subset (a subset-parse fundecl: var, assignment, if,
// while, return, throw) as a flowchart.
function toFlowchart(fn) {
  var state = { blocks: [], next: 0 };
  var entry = freshLabel(state);
  var open = { label: entry, assigns: [] };
  open = lowerStatements(fn[3], open, state, null);
  if (open !== null) closeBlock(state, open, ["return", ["undef"]]);
  return deepFreeze(simplify(["flowchart", fn[2], state.blocks], entry));
}

// A program, frozen through: nothing changes it once made, and split-shot,
// which then knows that, keeps knowing it where it hands the program, or a
// part of it, to runtime code (a compiler's output holds parts of the
// interpreter's expressions).
function deepFreeze(x) {
  if (Array.isArray(x) && !Object.isFrozen(x)) {
    for (var i = 0; i < x.length; i++) deepFreeze(x[i]);
    Object.freeze(x);
  }
  return x;
}

// A jump to a block that only jumps on goes where that block goes, and the
// blocks no jump reaches are dropped; the entry block is first.
function simplify(program, entry) {
  var byLabel = new Map(program[2].map(function (b) { return [b[0], b]; }));
  var through = function (l) {
    var seenLabels = new Set();
    while (true) {
      var b = byLabel.get(l);
      if (b[1].length !== 0 || b[2][0] !== "goto" || seenLabels.has(l)) return l;
      seenLabels.add(l);
      l = b[2][1];
    }
  };
  var jumpOf = function (j) {
    if (j[0] === "goto") return ["goto", through(j[1])];
    if (j[0] === "if") return ["if", j[1], through(j[2]), through(j[3])];
    return j;
  };
  var start = through(entry);
  var order = [start], out = [];
  for (var i = 0; i < order.length; i++) {
    var b = byLabel.get(order[i]);
    var j = jumpOf(b[2]);
    out.push([b[0], b[1], j]);
    (j[0] === "goto" ? [j[1]] : j[0] === "if" ? [j[2], j[3]] : []).forEach(function (l) { if (order.indexOf(l) < 0) order.push(l); });
  }
  return [program[0], program[1], out];
}

function freshLabel(state) { state.next += 1; return fn_label(state.next); }
function fn_label(n) { return "L" + n; }
function closeBlock(state, open, jump) { state.blocks.push([open.label, open.assigns, jump]); }

// Lower statements into the open block; returns the block left open after
// them, or null when control does not fall through.
function lowerStatements(stmts, open, state) {
  for (var i = 0; i < stmts.length; i++) {
    if (open === null) return null;
    open = lowerStatement(stmts[i], open, state);
  }
  return open;
}

function lowerStatement(s, open, state) {
  var tag = s[0];
  if (tag === "block") return lowerStatements(s[1], open, state);
  if (tag === "var" || tag === "assign") { open.assigns.push(["=", s[1], s[2]]); return open; }
  if (tag === "expr") throw new Error("flowchart: an expression statement has no effect in this subset");
  if (tag === "return") { closeBlock(state, open, ["return", s[1]]); return null; }
  if (tag === "throw") { closeBlock(state, open, ["return", ["call", ["var", "fail"], [throwMessage(s[1])]]]); return null; }
  if (tag === "if") {
    var yes = freshLabel(state), no = freshLabel(state), join = freshLabel(state);
    closeBlock(state, open, ["if", s[1], yes, no]);
    var y = lowerStatement(s[2], { label: yes, assigns: [] }, state);
    if (y !== null) closeBlock(state, y, ["goto", join]);
    var n = s[3] ? lowerStatement(s[3], { label: no, assigns: [] }, state) : { label: no, assigns: [] };
    if (n !== null) closeBlock(state, n, ["goto", join]);
    return { label: join, assigns: [] };
  }
  if (tag === "while") {
    var head = freshLabel(state), body = freshLabel(state), exit = freshLabel(state);
    closeBlock(state, open, ["goto", head]);
    closeBlock(state, { label: head, assigns: [] }, ["if", s[1], body, exit]);
    var b = lowerStatement(s[2], { label: body, assigns: [] }, state);
    if (b !== null) closeBlock(state, b, ["goto", head]);
    return { label: exit, assigns: [] };
  }
  throw new Error("flowchart: unsupported statement " + tag);
}

// `throw new Error(m)`: the message.
function throwMessage(e) {
  if (e[0] === "new" && e[2].length === 1) return e[2][0];
  throw new Error("flowchart: only `throw new Error(message)` is supported");
}

// ───────────── evaluation ─────────────

// Run a flowchart on its arguments. (Blocks by number: a jump's label is
// looked up once, and `pc` indexes the list of blocks, as a VM's program
// counter does.)
function runFlowchart(program, args) {
  var blocks = program[2];
  var index = new Map();
  for (var b = 0; b < blocks.length; b++) index.set(blocks[b][0], b);
  var target = function (label) {
    if (!index.has(label)) throw new Error("flowchart: no block " + label);
    return index.get(label);
  };
  var store = new Map();
  // Flowchart locals are function-scoped, like the subset's `var` bindings.
  // Declare every assignment target before execution, including ones whose
  // block is never taken. A genuinely undeclared name still throws below.
  for (var b = 0; b < blocks.length; b++) {
    for (var a = 0; a < blocks[b][1].length; a++) {
      store.set(blocks[b][1][a][1], undefined);
    }
  }
  var params = program[1];
  for (var i = 0; i < params.length; i++) store.set(params[i], args[i]);
  var pc = 0;
  while (true) {
    var block = blocks[pc];
    var assigns = block[1];
    for (var a = 0; a < assigns.length; a++) store.set(assigns[a][1], evalExpression(assigns[a][2], store));
    var jump = block[2];
    if (jump[0] === "return") return evalExpression(jump[1], store);
    if (jump[0] === "goto") pc = target(jump[1]);
    else if (evalExpression(jump[1], store)) pc = target(jump[2]);
    else pc = target(jump[3]);
  }
}

// (Loops and direct recursion, no callbacks: what split-shot specializes this
// evaluator to is each expression of a program, and a recursion through a
// callback made anew for each call it stops unfolding.)
function evalExpression(e, store) {
  switch (e[0]) {
    case "lit": return e[1];
    case "undef": return undefined;
    case "var":
      if (!store.has(e[1])) throw new Error("flowchart: unbound variable " + e[1]);
      return store.get(e[1]);
    case "arr": return evalList(e[1], store);
    case "idx": return evalExpression(e[1], store)[evalExpression(e[2], store)];
    case "dot":
      if (e[2] !== "length") throw new Error("flowchart: unsupported property " + e[2]);
      return evalExpression(e[1], store).length;
    case "unary": return unary(e[1], evalExpression(e[2], store));
    case "bin": return binary(e[1], evalExpression(e[2], store), evalExpression(e[3], store));
    case "cond": return evalExpression(e[1], store) ? evalExpression(e[2], store) : evalExpression(e[3], store);
    case "call": {
      // (Each argument evaluated and passed as it is, not gathered in a list
      // first: a builtin takes at most three.)
      var receiver = e[1][0] === "dot" ? evalExpression(e[1][1], store) : undefined;
      var args = e[2];
      if (args.length > 3) throw new Error("flowchart: a call with more than three arguments");
      var a0 = args.length > 0 ? evalExpression(args[0], store) : undefined;
      var a1 = args.length > 1 ? evalExpression(args[1], store) : undefined;
      var a2 = args.length > 2 ? evalExpression(args[2], store) : undefined;
      return callBuiltin(e[1], args.length, a0, a1, a2, receiver);
    }
  }
  throw new Error("flowchart: unsupported expression " + e[0]);
}

function evalList(es, store) {
  var out = [];
  for (var i = 0; i < es.length; i++) out.push(evalExpression(es[i], store));
  return out;
}

function unary(op, v) {
  if (op === "!") return !v;
  if (op === "-") return -v;
  if (op === "+") return +v;
  if (op === "typeof") return typeof v;
  throw new Error("flowchart: unsupported operator " + op);
}

function binary(op, a, b) {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "%": return a % b;
    case "===": return a === b;
    case "!==": return a !== b;
    case "<": return a < b;
    case ">": return a > b;
    case "<=": return a <= b;
    case ">=": return a >= b;
  }
  throw new Error("flowchart: unsupported operator " + op);
}

// A builtin function (callee ["var", f]) or method (["dot", receiver, m],
// the receiver's value given), with its n arguments' values.
function callBuiltin(callee, n, a0, a1, a2, receiver) {
  if (callee[0] === "dot") {
    if (callee[2] === "slice") return n === 1 ? receiver.slice(a0) : receiver.slice(a0, a1);
    if (callee[2] === "concat") return receiver.concat(a0);
    if (callee[2] === "indexOf") return receiver.indexOf(a0);
    throw new Error("flowchart: unsupported method " + callee[2]);
  }
  var f = BUILTINS[callee[1]];
  if (!f) throw new Error("flowchart: unknown function " + callee[1]);
  return f(a0, a1, a2);
}

// ───────────── builtins ─────────────

var BUILTINS = {
  str: function (v) { return JSON.stringify(v); },
  isArr: function (v) { return Array.isArray(v); },
  fail: function (m) { throw new Error(m); },
  // A copy of `array` with element i set to v.
  setAt: function (array, i, v) { var c = array.slice(); c[i] = v; return c; },
  // Whether `item` is in `list`, by value.
  member: function (item, list) {
    for (var i = 0; i < list.length; i++) if (sameData(list[i], item)) return true;
    return false;
  },
  // The block of `program` labeled `label`.
  blockOf: function (program, label) {
    for (var i = 0; i < program[2].length; i++) if (program[2][i][0] === label) return program[2][i];
    throw new Error("flowchart: no block " + label);
  },
  // The labels a residual block can start at: the entry, and the targets of
  // the tests that are not static.
  pointsOf: function (program, names) {
    var points = [program[2][0][0]];
    for (var b = 0; b < program[2].length; b++) {
      var j = program[2][b][2];
      if (j[0] === "if" && !staticIn(j[1], names)) {
        if (points.indexOf(j[2]) < 0) points.push(j[2]);
        if (points.indexOf(j[3]) < 0) points.push(j[3]);
      }
    }
    return points;
  },
  // A state's label ("S" and its index in `seen`), and `seen` with it. (Only
  // the states at the same block are compared.)
  intern: function (state, seen) {
    for (var i = 0; i < seen.length; i++) if (seen[i][0] === state[0] && sameData(seen[i][1], state[1])) return ["S" + i, seen];
    return ["S" + seen.length, seen.concat([state])];
  },
  // Whether an expression uses only the static variables `names`.
  isStatic: function (e, names) { return staticIn(e, names); },
  // An expression's value, its variables the static ones: `names` and `values`.
  evalStatic: function (e, names, values) { return evalExpression(e, storeOf(names, values)); },
  // An expression with the static variables' values put in, and what is all
  // static computed: the residual expression.
  reduce: function (e, names, values) { return reduceExpression(e, names, values); },
  // The dynamic parameters of a program, given the static variables.
  dynamicParams: function (program, names) {
    var out = [];
    for (var i = 0; i < program[1].length; i++) if (names.indexOf(program[1][i]) < 0) out.push(program[1][i]);
    return out;
  },
};

// Equal as data (arrays element by element, the rest by ===). The same object
// is equal at once: states share their large static values, such as a whole
// program.
// (A loop over pairs, not a recursion over the data's depth.)
function sameData(a, b) {
  var pairs = [[a, b]];
  while (pairs.length > 0) {
    var pair = pairs.pop();
    var x = pair[0], y = pair[1];
    if (x === y) continue;
    if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length) return false;
    for (var i = 0; i < x.length; i++) pairs.push([x[i], y[i]]);
  }
  return true;
}

function storeOf(names, values) {
  var store = new Map();
  for (var i = 0; i < names.length; i++) store.set(names[i], values[i]);
  return store;
}

function staticIn(e, names) {
  switch (e[0]) {
    case "lit": case "undef": return true;
    case "var": return names.indexOf(e[1]) >= 0;
    case "arr": return allStaticIn(e[1], names);
    case "idx": return staticIn(e[1], names) && staticIn(e[2], names);
    case "dot": return staticIn(e[1], names);
    case "unary": return staticIn(e[2], names);
    case "bin": return staticIn(e[2], names) && staticIn(e[3], names);
    case "cond": return staticIn(e[1], names) && staticIn(e[2], names) && staticIn(e[3], names);
    case "call":
      if (e[1][0] === "var" && e[1][1] === "fail") return false;
      return (e[1][0] !== "dot" || staticIn(e[1][1], names)) && allStaticIn(e[2], names);
  }
  throw new Error("flowchart: unsupported expression " + e[0]);
}

function allStaticIn(es, names) {
  for (var i = 0; i < es.length; i++) if (!staticIn(es[i], names)) return false;
  return true;
}

function reduceExpression(e, names, values) {
  if (staticIn(e, names)) return ["lit", evalExpression(e, storeOf(names, values))];
  switch (e[0]) {
    case "var": return e;
    case "arr": return ["arr", reduceList(e[1], names, values)];
    case "idx": return ["idx", reduceExpression(e[1], names, values), reduceExpression(e[2], names, values)];
    case "dot": return ["dot", reduceExpression(e[1], names, values), e[2]];
    case "unary": return ["unary", e[1], reduceExpression(e[2], names, values)];
    case "bin": return ["bin", e[1], reduceExpression(e[2], names, values), reduceExpression(e[3], names, values)];
    case "cond":
      if (staticIn(e[1], names)) return evalExpression(e[1], storeOf(names, values)) ? reduceExpression(e[2], names, values) : reduceExpression(e[3], names, values);
      return ["cond", reduceExpression(e[1], names, values), reduceExpression(e[2], names, values), reduceExpression(e[3], names, values)];
    case "call":
      return ["call", e[1][0] === "dot" ? ["dot", reduceExpression(e[1][1], names, values), e[1][2]] : e[1], reduceList(e[2], names, values)];
  }
  throw new Error("flowchart: unsupported expression " + e[0]);
}

function reduceList(es, names, values) {
  var out = [];
  for (var i = 0; i < es.length; i++) out.push(reduceExpression(es[i], names, values));
  return out;
}

// ───────────── division ─────────────

// The static variables of `program` (in a fixed order), given which
// parameters are static: every variable is static unless an assignment gives
// it a value computed from a dynamic one, to a fixed point. (Control does not
// enter: mix specializes each branch of a dynamic test with its own static
// values.) `dynamic` lists variables to make dynamic as well: a pointer that
// a program can move without bound, for one.
function division(program, staticParams, dynamic) {
  var names = [];
  var add = function (x) { if (names.indexOf(x) < 0) names.push(x); };
  program[1].forEach(add);
  program[2].forEach(function (b) { b[1].forEach(function (a) { add(a[1]); }); });
  var stat = names.filter(function (x) { return (program[1].indexOf(x) < 0 || staticParams.indexOf(x) >= 0) && (dynamic || []).indexOf(x) < 0; });
  var changed = true;
  while (changed) {
    changed = false;
    program[2].forEach(function (b) {
      b[1].forEach(function (a) {
        if (stat.indexOf(a[1]) >= 0 && !staticIn(a[2], stat)) { stat = stat.filter(function (x) { return x !== a[1]; }); changed = true; }
      });
    });
  }
  return stat;
}
