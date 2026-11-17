function main(program) {
// Accumulator IR: {op, arg}; arithmetic uses signed 32-bit integers.
// Passes are ordinary data. Each rewrite emits zero or one instruction.
function rewrite(pass, instruction) {
  if (pass === 'lower-sub' && instruction.op === 'sub') {
    return {op: 'add', arg: (-instruction.arg) | 0};
  }
  if (pass === 'strength-reduce' && instruction.op === 'mul' && instruction.arg === 2) {
    return {op: 'shl', arg: 1};
  }
  if (pass === 'remove-identities' && instruction.op === 'add' && instruction.arg === 0) {
    return null;
  }
  return instruction;
}

// Streaming composition: a pass feeds its result into the next pass.
// No special cases for particular pipelines, and no code generation here.
function emit(passes, stage, instruction, output) {
  if (stage === passes.length) {
    output.push(instruction);
  } else {
    const next = rewrite(passes[stage], instruction);
    if (next !== null) emit(passes, stage + 1, next, output);
  }
}

function compile(passes, program) {
  const output = [];
  for (let i = 0; i < program.length; i++) {
    emit(passes, 0, program[i], output);
  }
  return output;
}

return compile(["lower-sub","strength-reduce","remove-identities"], program);
}
