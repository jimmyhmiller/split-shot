function interp(p,io){var value="hello".toUpperCase();io.print(value);return value;}

// A parser for jsmix's JavaScript subset, in plain JavaScript with no
// dependencies. It builds the same AST as parse.cjs (which lowers Acorn's), so a
// program can parse its own interpreter, `parseProgram(interp.toString())`, and
// split-shot runs the parse at specialization time.
//
// AST (arrays tagged at [0]):
//   program     [fundecl...]
//   fundecl     ["fundecl", name, params, body, names]   names: params, then vars
//   statements  ["block", stmts] ["var", name, e] ["assign", name, e]
//               ["expr", e] ["return", e] ["throw", e] ["while", e, s]
//               ["if", e, s, s | null]
//   expressions ["lit", v] ["var", name] ["undef"] ["arr", es] ["idx", e, e]
//               ["dot", e, name] ["bin", op, e, e] ["unary", op, e]
//               ["cond", e, e, e] ["call", callee, args] ["new", name, args]
// Anything else is rejected with an error, as parse.cjs rejects it.

function parseProgram(source) {
  var toks = tokenize(source);
  var p = { toks: toks, i: 0 };
  var functions = [];
  while (peek(p).type !== "eof") functions.push(parseFunction(p));
  checkProgram(functions);
  return functions;
}

// ───────────── tokens ─────────────

// { type: "name" | "num" | "str" | "punct" | "eof", value, nl }: `nl` when a
// line break comes before the token (for `return`'s restricted production).
function tokenize(src) {
  var toks = [];
  var i = 0;
  var nl = false;
  while (i < src.length) {
    var c = src[i];
    if (c === "\n" || c === "\r" || c === " " || c === " ") { nl = true; i = i + 1; continue; }
    if (c === " " || c === "\t" || c === "\v" || c === "\f" || c === " " || c === "﻿") { i = i + 1; continue; }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n" && src[i] !== "\r") i = i + 1;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      var end = src.indexOf("*/", i + 2);
      if (end < 0) throw new SyntaxError("Unterminated comment");
      if (hasLineBreak(src.slice(i, end))) nl = true;
      i = end + 2;
      continue;
    }
    var start = i;
    if (isIdStart(c)) {
      while (i < src.length && isIdPart(src[i])) i = i + 1;
      toks.push({ type: "name", value: src.slice(start, i), nl: nl });
    } else if (isDigit(c) || (c === "." && isDigit(src[i + 1]))) {
      var num = readNumber(src, i);
      toks.push({ type: "num", value: num.value, nl: nl });
      i = num.end;
    } else if (c === "\"" || c === "'") {
      var str = readString(src, i);
      toks.push({ type: "str", value: str.value, nl: nl });
      i = str.end;
    } else if (c === "`") {
      throw new SyntaxError("Unsupported JavaScript subset syntax: TemplateLiteral");
    } else {
      var op = readPunct(src, i);
      toks.push({ type: "punct", value: op, nl: nl });
      i = i + op.length;
    }
    nl = false;
  }
  toks.push({ type: "eof", value: "", nl: nl });
  return toks;
}

function hasLineBreak(s) {
  for (var k = 0; k < s.length; k++) {
    if (s[k] === "\n" || s[k] === "\r" || s[k] === " " || s[k] === " ") return true;
  }
  return false;
}

function isDigit(c) { return c !== undefined && c >= "0" && c <= "9"; }
function isIdStart(c) { return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_" || c === "$"; }
function isIdPart(c) { return isIdStart(c) || isDigit(c); }
function isHex(c) { return isDigit(c) || (c >= "a" && c <= "f") || (c >= "A" && c <= "F"); }

function readNumber(src, i) {
  var start = i;
  if (src[i] === "0" && (src[i + 1] === "x" || src[i + 1] === "X")) {
    i = i + 2;
    while (isHex(src[i])) i = i + 1;
    return { value: Number(src.slice(start, i)), end: noIdAfter(src, i) };
  }
  while (isDigit(src[i])) i = i + 1;
  if (src[i] === ".") { i = i + 1; while (isDigit(src[i])) i = i + 1; }
  if (src[i] === "e" || src[i] === "E") {
    i = i + 1;
    if (src[i] === "+" || src[i] === "-") i = i + 1;
    if (!isDigit(src[i])) throw new SyntaxError("Invalid number");
    while (isDigit(src[i])) i = i + 1;
  }
  return { value: Number(src.slice(start, i)), end: noIdAfter(src, i) };
}

// (A number may not run into a name: `3in` is a syntax error.)
function noIdAfter(src, i) {
  if (i < src.length && (isIdPart(src[i]) || src[i] === "n")) throw new SyntaxError("Unsupported JavaScript subset syntax: numeric literal");
  return i;
}

function readString(src, i) {
  var quote = src[i];
  var out = "";
  i = i + 1;
  while (true) {
    if (i >= src.length) throw new SyntaxError("Unterminated string constant");
    var c = src[i];
    if (c === quote) return { value: out, end: i + 1 };
    if (c === "\n" || c === "\r") throw new SyntaxError("Unterminated string constant");
    if (c !== "\\") { out = out + c; i = i + 1; continue; }
    var e = src[i + 1];
    i = i + 2;
    if (e === "n") out = out + "\n";
    else if (e === "t") out = out + "\t";
    else if (e === "r") out = out + "\r";
    else if (e === "b") out = out + "\b";
    else if (e === "f") out = out + "\f";
    else if (e === "v") out = out + "\v";
    else if (e === "0" && !isDigit(src[i])) out = out + "\0";
    else if (e === "x") {
      if (!isHex(src[i]) || !isHex(src[i + 1])) throw new SyntaxError("Bad character escape sequence");
      out = out + String.fromCharCode(parseInt(src.slice(i, i + 2), 16));
      i = i + 2;
    } else if (e === "u") {
      var code;
      if (src[i] === "{") {
        var close = src.indexOf("}", i);
        if (close < 0) throw new SyntaxError("Bad character escape sequence");
        code = parseInt(src.slice(i + 1, close), 16);
        i = close + 1;
      } else {
        for (var k = 0; k < 4; k++) if (!isHex(src[i + k])) throw new SyntaxError("Bad character escape sequence");
        code = parseInt(src.slice(i, i + 4), 16);
        i = i + 4;
      }
      out = out + String.fromCodePoint(code);
    } else if (e === "\r") {
      if (src[i] === "\n") i = i + 1;
    } else if (e === "\n" || e === " " || e === " ") {
      // a line continuation: nothing
    } else if (isDigit(e)) {
      throw new SyntaxError("Unsupported JavaScript subset syntax: octal escape");
    } else {
      out = out + e;
    }
  }
}

// (No top-level variables: a script's globals are observable by other
// scripts, so split-shot keeps them, and calls through them, at run time.)
// The longest punctuator at `i` (only those the subset can use, and those
// whose shorter prefix would mislead).
function puncts() {
  return ["===", "!==", "**=", "...", "==", "!=", "<=", ">=", "&&", "||", "??", "?.", "**", "++", "--",
  "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "=>", "<<", ">>",
  "{", "}", "(", ")", "[", "]", ";", ",", "<", ">", "+", "-", "*", "/", "%", "&", "|", "^", "!", "~", "?", ":", "=", "."];
}

function readPunct(src, i) {
  var ops = puncts();
  for (var k = 0; k < ops.length; k++) {
    var op = ops[k];
    if (src.slice(i, i + op.length) === op) return op;
  }
  throw new SyntaxError("Unexpected character " + JSON.stringify(src[i]));
}

// ───────────── parser ─────────────

function peek(p) { return p.toks[p.i]; }
function next(p) { var t = p.toks[p.i]; p.i = p.i + 1; return t; }
function isPunct(p, v) { var t = peek(p); return t.type === "punct" && t.value === v; }
function isName(p, v) { var t = peek(p); return t.type === "name" && t.value === v; }
function expectPunct(p, v) {
  var t = next(p);
  if (t.type !== "punct" || t.value !== v) throw new SyntaxError("Expected " + JSON.stringify(v) + " but found " + describe(t));
  return t;
}
function expectName(p) {
  var t = next(p);
  if (t.type !== "name" || reserved().indexOf(t.value) >= 0) throw new SyntaxError("Expected a name but found " + describe(t));
  return t.value;
}
function describe(t) { return t.type === "eof" ? "the end of the input" : JSON.stringify(t.value); }
function unsupported(what) { throw new Error("Unsupported JavaScript subset syntax: " + what); }

function reserved() {
  return ["function", "var", "let", "const", "return", "if", "else", "while", "for", "do", "throw", "new",
  "typeof", "true", "false", "null", "this", "class", "try", "catch", "finally", "switch", "case", "default",
  "break", "continue", "delete", "in", "instanceof", "void", "yield", "await", "async", "super", "import", "export", "with", "debugger"];
}

// A semicolon, or a place automatic semicolon insertion allows one.
function semicolon(p) {
  if (isPunct(p, ";")) { next(p); return; }
  var t = peek(p);
  if (t.type === "eof" || t.nl || (t.type === "punct" && t.value === "}")) return;
  throw new SyntaxError("Unexpected " + describe(t));
}

function parseFunction(p) {
  if (isName(p, "async")) unsupported("FunctionDeclaration");
  if (!isName(p, "function")) {
    var t = peek(p);
    unsupported(t.type === "name" && (t.value === "var" || t.value === "let" || t.value === "const") ? "VariableDeclaration" : "top-level statement " + describe(t));
  }
  next(p);
  if (isPunct(p, "*")) unsupported("FunctionDeclaration");
  var name = expectName(p);
  expectPunct(p, "(");
  var params = [];
  while (!isPunct(p, ")")) {
    if (peek(p).type !== "name") unsupported("FunctionDeclaration");
    params.push(expectName(p));
    if (isPunct(p, "=")) unsupported("FunctionDeclaration");
    if (!isPunct(p, ")")) expectPunct(p, ",");
  }
  next(p);
  var names = [];
  for (var k = 0; k < params.length; k++) if (names.indexOf(params[k]) < 0) names.push(params[k]);
  expectPunct(p, "{");
  var body = [];
  while (!isPunct(p, "}")) body.push(parseStatement(p, names));
  next(p);
  return ["fundecl", name, params, body, names];
}

function parseStatement(p, names) {
  var t = peek(p);
  if (t.type === "punct" && t.value === ";") { next(p); return ["block", []]; }
  if (t.type === "punct" && t.value === "{") {
    next(p);
    var stmts = [];
    while (!isPunct(p, "}")) stmts.push(parseStatement(p, names));
    next(p);
    return ["block", stmts];
  }
  if (t.type === "name") {
    if (t.value === "var") {
      next(p);
      var decls = [];
      while (true) {
        if (peek(p).type !== "name") unsupported("VariableDeclaration");
        var v = expectName(p);
        if (names.indexOf(v) < 0) names.push(v);
        if (isPunct(p, "=")) { next(p); decls.push(["var", v, parseAssign(p, false)]); }
        else decls.push(["block", []]);
        if (!isPunct(p, ",")) break;
        next(p);
      }
      semicolon(p);
      return ["block", decls];
    }
    if (t.value === "let" || t.value === "const") unsupported("VariableDeclaration");
    if (t.value === "return") {
      next(p);
      var arg = ["undef"];
      var u = peek(p);
      if (!(u.type === "eof" || u.nl || (u.type === "punct" && (u.value === ";" || u.value === "}")))) arg = parseExpression(p, false);
      semicolon(p);
      return ["return", arg];
    }
    if (t.value === "throw") {
      next(p);
      if (peek(p).nl) throw new SyntaxError("Illegal newline after throw");
      var thrown = parseExpression(p, true);
      semicolon(p);
      return ["throw", thrown];
    }
    if (t.value === "while") {
      next(p);
      expectPunct(p, "(");
      var test = parseExpression(p, false);
      expectPunct(p, ")");
      return ["while", test, parseStatement(p, names)];
    }
    if (t.value === "if") {
      next(p);
      expectPunct(p, "(");
      var cond = parseExpression(p, false);
      expectPunct(p, ")");
      var yes = parseStatement(p, names);
      var no = null;
      if (isName(p, "else")) { next(p); no = parseStatement(p, names); }
      return ["if", cond, yes, no];
    }
    var stmtNames = ["for", "do", "switch", "try", "break", "continue", "function", "class", "with", "debugger", "import", "export"];
    if (stmtNames.indexOf(t.value) >= 0) unsupported(t.value + " statement");
  }
  // An expression statement, or an assignment `name = e`.
  if (t.type === "name" && p.toks[p.i + 1].type === "punct") {
    var after = p.toks[p.i + 1].value;
    if (after === "=") {
      var target = expectName(p);
      next(p);
      var value = parseAssign(p, false);
      semicolon(p);
      return ["assign", target, value];
    }
  }
  var e = parseExpression(p, false);
  if (peek(p).type === "punct" && isAssignOp(peek(p).value)) unsupported("AssignmentExpression");
  semicolon(p);
  return ["expr", e];
}

function isAssignOp(v) {
  return v === "=" || v === "+=" || v === "-=" || v === "*=" || v === "/=" || v === "%=" || v === "**=" || v === "&=" || v === "|=" || v === "^=";
}

// Comma expressions are not in the subset: an expression is an assignment
// expression, and only `name = e` statements assign.
function parseExpression(p, allowError) {
  var e = parseAssign(p, allowError);
  if (isPunct(p, ",")) unsupported("SequenceExpression");
  return e;
}

function parseAssign(p, allowError) {
  var e = parseConditional(p, allowError);
  var t = peek(p);
  if (t.type === "punct" && (isAssignOp(t.value) || t.value === "=>")) unsupported(t.value === "=>" ? "ArrowFunctionExpression" : "AssignmentExpression");
  return e;
}

function parseConditional(p, allowError) {
  var test = parseBinary(p, 0, allowError);
  if (!isPunct(p, "?")) return test;
  next(p);
  var yes = parseAssign(p, false);
  expectPunct(p, ":");
  var no = parseAssign(p, false);
  return ["cond", test, yes, no];
}

// Binary operators by precedence, loosest first. `**` is right-associative.
function levels() {
  return [["&"], ["==", "!=", "===", "!=="], ["<", ">", "<=", ">="], ["+", "-"], ["*", "/", "%"], ["**"]];
}
function rejected() {
  return ["||", "&&", "??", "|", "^", "<<", ">>", "instanceof", "in"];
}

function parseBinary(p, level, allowError) {
  if (level === levels().length) return parseUnary(p, allowError);
  var left = parseBinary(p, level + 1, allowError);
  while (true) {
    var t = peek(p);
    if ((t.type === "punct" || t.type === "name") && rejected().indexOf(t.value) >= 0) unsupported(t.value === "&&" || t.value === "||" || t.value === "??" ? "LogicalExpression" : "BinaryExpression");
    if (t.type !== "punct" || levels()[level].indexOf(t.value) < 0) return left;
    next(p);
    var right = t.value === "**" ? parseBinary(p, level, allowError) : parseBinary(p, level + 1, allowError);
    left = ["bin", t.value, left, right];
    if (t.value === "**") return left;
  }
}

function parseUnary(p, allowError) {
  var t = peek(p);
  if (t.type === "punct" && (t.value === "!" || t.value === "-" || t.value === "+")) {
    next(p);
    return ["unary", t.value, parseUnary(p, false)];
  }
  if (t.type === "name" && t.value === "typeof") {
    next(p);
    return ["unary", "typeof", parseUnary(p, false)];
  }
  if ((t.type === "punct" && (t.value === "~" || t.value === "++" || t.value === "--")) || (t.type === "name" && (t.value === "void" || t.value === "delete" || t.value === "await"))) {
    unsupported(t.value === "++" || t.value === "--" ? "UpdateExpression" : "UnaryExpression");
  }
  var e = parsePostfix(p, allowError);
  if (isPunct(p, "++") || isPunct(p, "--")) unsupported("UpdateExpression");
  return e;
}

function parsePostfix(p, allowError) {
  var e = parsePrimary(p, allowError);
  while (true) {
    if (isPunct(p, ".")) {
      next(p);
      var t = next(p);
      if (t.type !== "name") throw new SyntaxError("Unexpected " + describe(t));
      e = ["dot", e, t.value];
    } else if (isPunct(p, "[")) {
      next(p);
      var index = parseExpression(p, false);
      expectPunct(p, "]");
      e = ["idx", e, index];
    } else if (isPunct(p, "(")) {
      if (!(e[0] === "var" || e[0] === "dot")) unsupported("CallExpression");
      e = ["call", e, parseArguments(p)];
    } else if (isPunct(p, "?.")) {
      unsupported("ChainExpression");
    } else {
      return e;
    }
  }
}

function parseArguments(p) {
  expectPunct(p, "(");
  var args = [];
  while (!isPunct(p, ")")) {
    if (isPunct(p, "...")) unsupported("CallExpression");
    args.push(parseAssign(p, false));
    if (!isPunct(p, ")")) expectPunct(p, ",");
  }
  next(p);
  return args;
}

function errorConstructors() {
  return ["Error", "TypeError", "RangeError", "SyntaxError", "ReferenceError"];
}

function parsePrimary(p, allowError) {
  var t = next(p);
  if (t.type === "num") {
    if (t.value === Infinity) unsupported("Literal");
    return ["lit", t.value];
  }
  if (t.type === "str") return ["lit", t.value];
  if (t.type === "punct") {
    if (t.value === "(") {
      var e = parseExpression(p, false);
      expectPunct(p, ")");
      return e;
    }
    if (t.value === "[") {
      var elems = [];
      while (!isPunct(p, "]")) {
        if (isPunct(p, ",") || isPunct(p, "...")) unsupported("ArrayExpression");
        elems.push(parseAssign(p, false));
        if (!isPunct(p, "]")) expectPunct(p, ",");
      }
      next(p);
      return ["arr", elems];
    }
    if (t.value === "{") unsupported("ObjectExpression");
    throw new SyntaxError("Unexpected " + describe(t));
  }
  if (t.type === "name") {
    if (t.value === "true") return ["lit", true];
    if (t.value === "false") return ["lit", false];
    if (t.value === "null") return ["lit", null];
    if (t.value === "new") {
      var ctor = peek(p);
      if (!allowError || ctor.type !== "name" || errorConstructors().indexOf(ctor.value) < 0) unsupported("NewExpression");
      next(p);
      var args = isPunct(p, "(") ? parseArguments(p) : [];
      if (args.length > 1) unsupported("NewExpression");
      return ["new", ctor.value, args];
    }
    if (t.value === "function") unsupported("FunctionExpression");
    if (t.value === "this") unsupported("ThisExpression");
    if (reserved().indexOf(t.value) >= 0) throw new SyntaxError("Unexpected keyword " + JSON.stringify(t.value));
    return ["var", t.value];
  }
  throw new SyntaxError("Unexpected " + describe(t));
}

// ───────────── checks (as parse.cjs makes them) ─────────────

function checkProgram(functions) {
  var functionNames = [];
  for (var k = 0; k < functions.length; k++) {
    if (functionNames.indexOf(functions[k][1]) >= 0) throw new Error("Duplicate function declarations are not supported");
    functionNames.push(functions[k][1]);
  }
  for (var f = 0; f < functions.length; f++) checkNode(functions[f][3], functions[f][4], functionNames);
}

function checkNode(n, names, functionNames) {
  if (!Array.isArray(n)) return;
  if (n[0] === "var" && n.length === 2 && names.indexOf(n[1]) < 0) {
    if (n[1] === "undefined") { n.splice(0, n.length, "undef"); return; }
    throw new Error("Unbound variable: " + n[1]);
  }
  if (n[0] === "new" && (names.indexOf(n[1]) >= 0 || functionNames.indexOf(n[1]) >= 0)) throw new Error("Shadowed builtin constructor is not supported: " + n[1]);
  if (n[0] === "assign" && names.indexOf(n[1]) < 0) throw new Error("Undeclared assignment: " + n[1]);
  if (n[0] === "call") {
    if (n[1][0] === "dot") checkNode(n[1][1], names, functionNames);
    for (var a = 0; a < n[2].length; a++) checkNode(n[2][a], names, functionNames);
    return;
  }
  for (var c = 0; c < n.length; c++) checkNode(n[c], names, functionNames);
}

// Monovariant, flow-insensitive binding-time analysis for the JS subset.
// No instruction names or host method names participate in this analysis.
function analyze(functions, entry, staticCount = 1) {
  const table = new Map(functions.map(fn => [fn[1], fn]));
  const flags = new Map(), returns = new Map();
  for (const fn of functions) { flags.set(fn[1], new Map(fn[4].map(name => [name, false]))); returns.set(fn[1], false); }
  const root = table.get(entry);
  if(!root)throw new Error("Unknown entry function: "+entry);
  if(root[2].length!==2)throw new Error("Entry requires one static and one dynamic parameter");
  root[2].forEach((name, i) => flags.get(entry).set(name, i >= staticCount));
  let changed;
  const promote = (map, name) => { if (!map.get(name)) { map.set(name, true); changed = true; } };
  function expr(e, env, propagate) {
    switch(e[0]) {
      case 'lit': case 'undef': return false;
      case 'var': return env.get(e[1]) || false;
      case 'unary': return expr(e[2],env,propagate);
      case 'arr': e[1].map(x => expr(x,env,propagate)); return true;
      case 'idx': return [expr(e[1],env,propagate), expr(e[2],env,propagate)].some(Boolean);
      case 'dot': return expr(e[1],env,propagate);
      case 'bin': return [expr(e[2],env,propagate), expr(e[3],env,propagate)].some(Boolean);
      case 'cond': return [e[1],e[2],e[3]].map(x => expr(x,env,propagate)).some(Boolean);
      case 'new': return e[2].map(x => expr(x,env,propagate)).some(Boolean);
      case 'call': {
        const args = e[2].map(x => expr(x,env,propagate));
        if(e[1][0] === 'var') {
          const fn=table.get(e[1][1]); if(!fn)throw new Error('Unknown function: '+e[1][1]);
          if(propagate) fn[2].forEach((p,i)=>{if(args[i])promote(flags.get(fn[1]),p);});
          return returns.get(fn[1]);
        }
        const receiver = expr(e[1][1],env,propagate);
        return e[1][2] === 'slice' ? receiver || args.some(Boolean) : true;
      }
      default: throw new Error('Unsupported binding-time expression: '+e[0]);
    }
  }
  function stmt(s, env, fn, control = false) {
    switch(s[0]) {
      case 'var': case 'assign': if(expr(s[2],env,true)||control)promote(env,s[1]); break;
      case 'return': if(expr(s[1],env,true)||control)promote(returns,fn); break;
      case 'expr': case 'throw': expr(s[1],env,true); break;
      case 'block': s[1].forEach(x=>stmt(x,env,fn,control)); break;
      case 'if': {const d=expr(s[1],env,true)||control;stmt(s[2],env,fn,d);if(s[3])stmt(s[3],env,fn,d);break;}
      case 'while': {const d=expr(s[1],env,true)||control;stmt(s[2],env,fn,d);break;}
      default: throw new Error('Unsupported binding-time statement: '+s[0]);
    }
  }
  do { changed=false;for(const fn of functions)fn[3].forEach(s=>stmt(s,flags.get(fn[1]),fn[1])); } while(changed);
  function annotate(e, env) {
    const d=expr(e,env,false);
    switch(e[0]) {
      case 'lit': case 'undef': case 'var': break;
      case 'unary': annotate(e[2],env);break;
      case 'idx': annotate(e[1],env);annotate(e[2],env);break;
      case 'dot': annotate(e[1],env);break;
      case 'bin': annotate(e[2],env);annotate(e[3],env);break;
      case 'cond': annotate(e[1],env);annotate(e[2],env);annotate(e[3],env);break;
      case 'arr': e[1].forEach(x=>annotate(x,env));break;
      case 'call': if(e[1][0]==='dot')annotate(e[1][1],env);e[2].forEach(x=>annotate(x,env));break;
      case 'new': e[2].forEach(x=>annotate(x,env));break;
    }
    e.push(d);
  }
  function annotateStmt(s,env,fn) {
    switch(s[0]) {
      case 'var': case 'assign': annotate(s[2],env);s.push(env.get(s[1]));break;
      case 'expr': case 'throw': annotate(s[1],env);break;
      case 'return': annotate(s[1],env);s.push(returns.get(fn));break;
      case 'block':s[1].forEach(x=>annotateStmt(x,env,fn));break;
      case 'if':annotate(s[1],env);annotateStmt(s[2],env,fn);if(s[3])annotateStmt(s[3],env,fn);break;
      case 'while':annotate(s[1],env);annotateStmt(s[2],env,fn);break;
    }
  }
  for(const fn of functions){annotateStmt(['block',fn[3]],flags.get(fn[1]),fn[1]);fn.push(fn[2].map(n=>flags.get(fn[1]).get(n)));fn.push(fn[4].map(n=>flags.get(fn[1]).get(n)));}
  return functions;
}

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

const INT = analyze(parseProgram(interp.toString()), "interp");
export function main(program) {
  return jsmix(INT, "interp", program);
}
