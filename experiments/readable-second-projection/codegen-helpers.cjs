// Compiler-time helpers, linked after specialization so their bodies stay out
// of the residual compiler loop. They do not execute the generated program.
function argument(value) {
  if (value !== null && typeof value === 'object' && value.dynamic === true) {
    return value.source;
  }
  return JSON.stringify(value);
}
function emit(lines, method, args) {
  const name = 'v' + lines.length;
  lines.push('var ' + name + ' = io.' + method + '(' + args.map(argument).join(', ') + ');\n');
  return {dynamic: true, source: name};
}
function finish(lines, value) {
  return 'function run(io) {\n' + lines.join('') + 'return ' + argument(value) + ';\n}';
}
module.exports = {argument, emit, finish};
