// style: Brainfuck (optimizing: run-length folded ops, [-] as clear, matched jumps, switch dispatch over op objects)
// residue: "BF_[A-Z]+"
// The usual "optimizing" Brainfuck interpreter: at load the source is
// folded into ops (runs of + - into one BF_ADD, runs of < > into one
// BF_MOVE, [-] into BF_CLEAR) with each bracket holding its partner's index;
// then a switch runs them on a byte tape. The fixed program is the classic
// ROT13 filter (divide by 32, then by 13), run on the input string; EOF
// leaves the cell unchanged.
const ROT13 = `
-,+[
    -[
        >>++++[>++++++++<-]
        <+<-[
            >+>+>-[>>>]
            <[[>+<-]>>+>]
            <<<<<-
        ]
    ]>>>[-]+
    >--[-[<->+++[-]]]<[
        ++++++++++++<[
            >-[>+>>]
            >[+[<+>-]>+>>]
            <<<<<-
        ]
        >>[<+>-]
        >[
            -[
                -<<[-]>>
            ]<<[<<->>-]>>
        ]<<[<<+>>-]
    ]
    <[-]
    <.[-]
    <-,+
]
`;

function parse(source) {
  const ops = [];
  const open = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === "+" || c === "-") {
      let n = 0;
      while (i < source.length && (source[i] === "+" || source[i] === "-" || !"<>[].,".includes(source[i]))) {
        if (source[i] === "+") n++;
        else if (source[i] === "-") n--;
        i++;
      }
      if (n !== 0) ops.push({ op: "BF_ADD", arg: n });
      continue;
    }
    if (c === ">" || c === "<") {
      let n = 0;
      while (i < source.length && (source[i] === ">" || source[i] === "<" || !"+-[].,".includes(source[i]))) {
        if (source[i] === ">") n++;
        else if (source[i] === "<") n--;
        i++;
      }
      if (n !== 0) ops.push({ op: "BF_MOVE", arg: n });
      continue;
    }
    i++;
    switch (c) {
      case ".": ops.push({ op: "BF_OUT", arg: 0 }); break;
      case ",": ops.push({ op: "BF_IN", arg: 0 }); break;
      case "[":
        if (source.startsWith("-]", i)) {
          ops.push({ op: "BF_CLEAR", arg: 0 });
          i += 2;
        } else {
          open.push(ops.length);
          ops.push({ op: "BF_JZ", arg: -1 });
        }
        break;
      case "]": {
        if (open.length === 0) throw new Error("unmatched ] at " + (i - 1));
        const start = open.pop();
        ops[start].arg = ops.length;
        ops.push({ op: "BF_JNZ", arg: start });
        break;
      }
      default: break; // anything else is a comment
    }
  }
  if (open.length !== 0) throw new Error("unmatched [");
  return ops;
}

const PROGRAM = parse(ROT13);

function run(ops, input) {
  const tape = new Uint8Array(30000);
  let ptr = 0;
  let inPos = 0;
  let out = "";
  for (let pc = 0; pc < ops.length; pc++) {
    const ins = ops[pc];
    switch (ins.op) {
      case "BF_ADD": tape[ptr] += ins.arg; break;
      case "BF_MOVE":
        ptr += ins.arg;
        if (ptr < 0 || ptr >= tape.length) throw new Error("tape pointer out of range");
        break;
      case "BF_CLEAR": tape[ptr] = 0; break;
      case "BF_OUT": out += String.fromCharCode(tape[ptr]); break;
      case "BF_IN": if (inPos < input.length) tape[ptr] = input.charCodeAt(inPos++) & 255; break;
      case "BF_JZ": if (tape[ptr] === 0) pc = ins.arg; break;
      case "BF_JNZ": if (tape[ptr] !== 0) pc = ins.arg; break;
      default: throw new Error("bad op " + ins.op);
    }
  }
  return out;
}

export function main(input) {
  return run(PROGRAM, String(input));
}
export const inputs = [
  "",
  "a",
  "Z",
  "Hello, World!",
  "abcxyzABCXYZ 09 ~@[`{",
  "Gb trg gb gur bgure fvqr!",
];
