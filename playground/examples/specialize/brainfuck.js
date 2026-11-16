// A Brainfuck interpreter in two stages: parse the program text into a tree,
// then walk the tree. The program is static, so parsing and dispatch happen
// at specialization time; the input is dynamic, so tape arithmetic is left.
function brainfuck(program, input) {
  const tape = [0, 0, 0, 0, 0, 0, 0, 0];
  const out = [];
  const tree = parse(program, 0);
  exec(tree.body, tape, 0, input, 0, out);
  return out;
}

// Parse from `i` up to the matching "]" (or the end): { body, end }.
function parse(program, i) {
  const body = [];
  while (i < program.length && program[i] !== "]") {
    if (program[i] === "[") {
      const loop = parse(program, i + 1);
      body.push({ op: "loop", body: loop.body });
      i = loop.end + 1;
    } else {
      body.push({ op: program[i] });
      i = i + 1;
    }
  }
  return { body: body, end: i };
}

// Run `body`; returns [ptr, read] for the caller to continue from.
function exec(body, tape, ptr, input, read, out) {
  for (let k = 0; k < body.length; k++) {
    const node = body[k];
    if (node.op === "+") tape[ptr] = tape[ptr] + 1;
    else if (node.op === "-") tape[ptr] = tape[ptr] - 1;
    else if (node.op === ">") ptr = ptr + 1;
    else if (node.op === "<") ptr = ptr - 1;
    else if (node.op === ".") out.push(tape[ptr]);
    else if (node.op === ",") { tape[ptr] = input[read]; read = read + 1; }
    else if (node.op === "loop") {
      while (tape[ptr] !== 0) {
        const r = exec(node.body, tape, ptr, input, read, out);
        ptr = r[0];
        read = r[1];
      }
    }
  }
  return [ptr, read];
}
