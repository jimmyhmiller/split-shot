// Third-projection sources, straight from docs/p3.
import jsmix2Src from "../../../docs/p3/jsmix2.js?raw";
import intSrc from "../../../docs/p3/int.js?raw";
import vmSrc from "../../../docs/p3/vm.js?raw";

export { jsmix2Src };

export const P3_INTERPRETERS = [
  {
    title: "Opcode interpreter",
    src: intSrc,
    progs: [
      { title: "(x + 1) * 3", prog: '[["addin", 0], ["addlit", 1], ["mullit", 3]]' },
      { title: "x * 4 - x", prog: '[["addin", 0], ["mullit", 4], ["subin", 0]]' },
      { title: "constant 42", prog: '[["addlit", 6], ["mullit", 7]]' },
    ],
  },
  {
    title: "Bytecode VM",
    src: vmSrc,
    progs: [
      { title: "sum 1..n", prog: '[["jz", 4], ["add"], ["dec"], ["jmp", 0], ["ret"]]' },
      { title: "n + n", prog: '[["add"], ["add"], ["ret"]]' },
    ],
  },
];
