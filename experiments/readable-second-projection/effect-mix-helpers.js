// Same effect-only staging contract as effect-mix.js. The free `codegen`
// binding is supplied by a compiler-time module whose implementation is not
// part of the outer specialization input. This is an explicit module boundary.
function residualMethod(method, lines) {
  return function() {
    var args = [];
    var i = 0;
    while (i < arguments.length) {
      args.push(arguments[i]);
      i = i + 1;
    }
    return codegen.emit(lines, method, args);
  };
}
function effectMix(interpreter, program, methods) {
  var lines = [];
  var host = {};
  var i = 0;
  while (i < methods.length) {
    host[methods[i]] = residualMethod(methods[i], lines);
    i = i + 1;
  }
  var value = interpreter(program, host);
  return codegen.finish(lines, value);
}
