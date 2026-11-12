// style: closure compilation (AST compiled once at load into nested JS closures, then run)
// residue: \b(exec_while|exec_seq|exec_set|exec_if|exec_return|eval_binop|eval_var|eval_call|eval_num)\b
// A tagged-array AST for a small language with functions, compiled once into
// closures (each node becomes a function of the frame), then run: the sum of
// gcd(a*i, b+i) for i from 1 to n, gcd by Euclid's loop.

// def gcd(x, y) { while (y != 0) { t = x % y; x = y; y = t; } return x; }
// total = 0; i = 1;
// while (i <= n) { total = total + gcd(a * i, b + i); i = i + 1; }
// return total;
const PROGRAM = ["seq",
  ["def", "gcd", ["x", "y"], ["seq",
    ["while", ["bin", "!=", ["var", "y"], ["num", 0]], ["seq",
      ["set", "t", ["bin", "%", ["var", "x"], ["var", "y"]]],
      ["set", "x", ["var", "y"]],
      ["set", "y", ["var", "t"]]]],
    ["return", ["var", "x"]]]],
  ["set", "total", ["num", 0]],
  ["set", "i", ["num", 1]],
  ["while", ["bin", "<=", ["var", "i"], ["var", "n"]], ["seq",
    ["set", "total", ["bin", "+", ["var", "total"],
      ["call", "gcd", [["bin", "*", ["var", "a"], ["var", "i"]], ["bin", "+", ["var", "b"], ["var", "i"]]]]]],
    ["set", "i", ["bin", "+", ["var", "i"], ["num", 1]]]]],
  ["return", ["var", "total"]],
];

const BINOPS = {
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "*": (a, b) => a * b,
  "%": (a, b) => a % b,
  "<": (a, b) => a < b,
  "<=": (a, b) => a <= b,
  "==": (a, b) => a === b,
  "!=": (a, b) => a !== b,
};

// A frame: { vars, returned, value, program }. Statement closures run for
// effect and stop early once `returned` is set.
function compileExpr(node) {
  switch (node[0]) {
    case "num": {
      const k = node[1];
      return function eval_num() { return k; };
    }
    case "var": {
      const name = node[1];
      return function eval_var(frame) {
        if (!(name in frame.vars)) throw new ReferenceError("undefined variable " + name);
        return frame.vars[name];
      };
    }
    case "bin": {
      const f = BINOPS[node[1]];
      if (!f) throw new Error("unknown operator " + node[1]);
      const left = compileExpr(node[2]);
      const right = compileExpr(node[3]);
      return function eval_binop(frame) { return f(left(frame), right(frame)); };
    }
    case "call": {
      const name = node[1];
      const args = node[2].map(compileExpr);
      return function eval_call(frame) {
        const fn = frame.functions[name];
        if (!fn) throw new ReferenceError("undefined function " + name);
        const vars = {};
        for (let i = 0; i < fn.params.length; i++) vars[fn.params[i]] = args[i](frame);
        const callee = { vars, functions: frame.functions, returned: false, value: undefined };
        fn.body(callee);
        return callee.value;
      };
    }
    default:
      throw new Error("unknown expression " + node[0]);
  }
}

function compileStmt(node) {
  switch (node[0]) {
    case "seq": {
      const stmts = node.slice(1).map(compileStmt);
      return function exec_seq(frame) {
        for (let i = 0; i < stmts.length && !frame.returned; i++) stmts[i](frame);
      };
    }
    case "set": {
      const name = node[1];
      const value = compileExpr(node[2]);
      return function exec_set(frame) { frame.vars[name] = value(frame); };
    }
    case "while": {
      const test = compileExpr(node[1]);
      const body = compileStmt(node[2]);
      return function exec_while(frame) {
        while (!frame.returned && test(frame)) body(frame);
      };
    }
    case "if": {
      const test = compileExpr(node[1]);
      const then = compileStmt(node[2]);
      const otherwise = node[3] ? compileStmt(node[3]) : null;
      return function exec_if(frame) {
        if (test(frame)) then(frame);
        else if (otherwise) otherwise(frame);
      };
    }
    case "return": {
      const value = compileExpr(node[1]);
      return function exec_return(frame) {
        frame.value = value(frame);
        frame.returned = true;
      };
    }
    case "def": {
      const name = node[1];
      const fn = { params: node[2], body: compileStmt(node[3]) };
      return function exec_def(frame) { frame.functions[name] = fn; };
    }
    default:
      throw new Error("unknown statement " + node[0]);
  }
}

const compiled = compileStmt(PROGRAM);

export function main(input) {
  const frame = { vars: { n: input.n, a: input.a, b: input.b }, functions: {}, returned: false, value: undefined };
  compiled(frame);
  return frame.value;
}

export const inputs = [
  { n: 0, a: 1, b: 1 },
  { n: 1, a: 0, b: 0 },
  { n: 5, a: 12, b: 18 },
  { n: 40, a: 6, b: 9 },
  { n: 100, a: 7, b: 3 },
  { n: 150, a: 1001, b: 77 },
];
