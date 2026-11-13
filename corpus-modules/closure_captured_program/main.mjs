// A callback given to a runtime array's method closes over a program the
// load code made: `input.xs.map((x) => run(PROGRAM, 0, x))`. The array is
// a runtime value, so the callback is one too; its body is still
// specialized to the program (see `closure_data_fns`): the residual
// callback is the program's arithmetic, and neither the program nor the
// interpreter remains (the load code's unused functions are deleted, see
// `drop_dead_objects`).
function run(prog, acc, x) {
  if (prog.length === 0) return acc;
  const ins = prog[0];
  const next = ins[0] === "addlit" ? acc + ins[1]
    : ins[0] === "mullit" ? acc * ins[1]
    : ins[0] === "addin" ? acc + x
    : acc - x;
  return run(prog.slice(1), next, x);
}
const PROGRAM = [["addin"], ["addlit", 3], ["mullit", 2], ["subin"], ["mullit", 5], ["addin"]];
export function main(input) {
  return input.xs.map((x) => run(PROGRAM, 0, x));
}
