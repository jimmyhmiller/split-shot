// A tree-walking interpreter whose program (built at load) calls its own
// functions: each interpreted function becomes a residual function of its
// own (see `Js::arg_shapes`), its argument list unfolded per call site
// (`static_program_list`), the syntax tree and the interpreter gone.
const num = (v) => ({ op: "num", v });
const arg = (i) => ({ op: "arg", i });
const bin = (o, l, r) => ({ op: "bin", o, l, r });
const FUNS = {};
FUNS.fib = { params: 1, body: { op: "if", c: bin("<", arg(0), num(2)), t: arg(0), f: bin("+", { op: "call", fn: "fib", args: [bin("-", arg(0), num(1))] }, { op: "call", fn: "fib", args: [bin("-", arg(0), num(2))] }) } };
function ev(node, frame) {
  switch (node.op) {
    case "num": return node.v;
    case "arg": return frame[node.i];
    case "bin": {
      const a = ev(node.l, frame), b = ev(node.r, frame);
      switch (node.o) { case "+": return a + b; case "-": return a - b; case "<": return a < b; }
      throw new Error("bad op");
    }
    case "if": return ev(node.c, frame) ? ev(node.t, frame) : ev(node.f, frame);
    case "call": {
      const f = FUNS[node.fn];
      const args = node.args.map((a) => ev(a, frame));
      return ev(f.body, args);
    }
  }
  throw new Error("bad node " + node.op);
}
export function main(input) {
  return ev({ op: "call", fn: "fib", args: [num(input.n)] }, []);
}
