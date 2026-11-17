// Every opcode, zero/nonzero and nested loops, byte wrapping, input, comments,
// and the classic Hello World. Inputs keep accesses inside the interpreter's
// sixteen-cell tape and provide every byte the programs read.
module.exports = [
  { program: '', inputs: [[]], output: [] },
  { program: ',.', inputs: [[0], [65], [255]] },
  { program: '-.+.', inputs: [[]], output: [255, 0] },
  { program: ',[->++<]>.', inputs: [[0], [1], [21], [127], [255]] },
  { program: '++[>++[>++<-]<-]>>.', inputs: [[]], output: [8] },
  { program: '[+[->+<]].', inputs: [[]], output: [0] },
  { program: ',>,<[->+<]>.', inputs: [[0, 0], [2, 3], [255, 2]] },
  { program: 'comments + > ++ < . > .', inputs: [[]], output: [1, 2] },
  { program: '++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.', inputs: [[]], output: Array.from(Buffer.from('Hello World!\n')) },
];
