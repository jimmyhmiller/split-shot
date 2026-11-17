var __s0 = "Loops are not supported in this subset";
function compile(program) {
  const lines = codegen.buffer();
  let remaining = program;
  let pointer = 0;
  while (remaining.length > 0) {
    const remainingItem = remaining[0];
    if (remainingItem === "+") {
      const ioReference = codegen.reference("io");
      const prepare2 = codegen.prepare(lines, ioReference, "set");
      const ioReference2 = codegen.reference("io");
      const call2 = codegen.call(lines, ioReference2, "get", [pointer]);
      const binary2 = codegen.binary("+", call2, 1);
      const bindExpression2 = codegen.bindExpression(lines, binary2);
      const binary3 = codegen.binary("&", bindExpression2, 255);
      const tempValue = [pointer, codegen.bindExpression(lines, binary3)];
      codegen.invoke(lines, prepare2, tempValue);
    } else if (remainingItem === "-") {
      const ioReference3 = codegen.reference("io");
      const prepare3 = codegen.prepare(lines, ioReference3, "set");
      const ioReference4 = codegen.reference("io");
      const call3 = codegen.call(lines, ioReference4, "get", [pointer]);
      const binary4 = codegen.binary("-", call3, 1);
      const bindExpression3 = codegen.bindExpression(lines, binary4);
      const binary5 = codegen.binary("&", bindExpression3, 255);
      const tempValue2 = [pointer, codegen.bindExpression(lines, binary5)];
      codegen.invoke(lines, prepare3, tempValue2);
    } else if (remainingItem === ">") {
      if (pointer + 1 >= 16) {
        throw new RangeError("Tape pointer out of range");
      }
      pointer += 1;
    } else if (remainingItem === "<") {
      if (pointer - 1 < 0) {
        throw new RangeError("Tape pointer out of range");
      }
      pointer -= 1;
    } else if (remainingItem === ",") {
      const ioReference5 = codegen.reference("io");
      const prepare4 = codegen.prepare(lines, ioReference5, "set");
      const ioReference6 = codegen.reference("io");
      const tempValue3 = [pointer, codegen.call(lines, ioReference6, "read", [])];
      codegen.invoke(lines, prepare4, tempValue3);
    } else if (remainingItem === ".") {
      const ioReference7 = codegen.reference("io");
      const prepare5 = codegen.prepare(lines, ioReference7, "write");
      const ioReference8 = codegen.reference("io");
      const tempValue4 = [codegen.call(lines, ioReference8, "get", [pointer])];
      codegen.invoke(lines, prepare5, tempValue4);
    } else {
      if (remainingItem === "[") {
        throw new Error(__s0);
      }
      if (remainingItem === "]") {
        throw new Error(__s0);
      }
    }
    remaining = remaining.slice(1);
  }
  return codegen.finish(lines, pointer);
}

const codegen = require("../../general-jsmix/codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
