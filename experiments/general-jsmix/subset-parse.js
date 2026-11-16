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
