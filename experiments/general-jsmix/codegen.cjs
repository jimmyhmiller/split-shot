// Generic JavaScript staging primitives. No source-language opcode names.
function dynamic(value) { return value !== null && typeof value === 'object' && value.dynamic === true; }
function argument(value) {
  if (dynamic(value)) return value.source;
  if (value === undefined) return 'undefined';
  if (typeof value === 'number') {
    if (Object.is(value, -0)) return '-0';
    if (Number.isNaN(value)) return 'NaN';
    if (value === Infinity) return 'Infinity';
    if (value === -Infinity) return '-Infinity';
  }
  return JSON.stringify(value);
}
function binary(op, a, b) {
  if (dynamic(a) || dynamic(b)) return {dynamic: true, source: '(' + argument(a) + ' ' + op + ' ' + argument(b) + ')'};
  switch(op) {
    case '+': return a+b; case '-': return a-b; case '*': return a*b;
    case '/': return a/b; case '%': return a%b; case '**': return a**b; case '&': return a&b;
    case '===': return a===b; case '!==': return a!==b;
    case '==': return a==b; case '!=': return a!=b;
    case '<': return a<b; case '>': return a>b; case '<=': return a<=b; case '>=': return a>=b;
    default: throw new Error('Unsupported operator: ' + op);
  }
}
// IdentifierName permits keywords after a dot, as well as Unicode names.
const identifierName = /^[$_\p{ID_Start}][$\u200C\u200D\p{ID_Continue}]*$/u;
function memberSource(receiver, key) {
  const base = identifierName.test(receiver) ? receiver : '(' + receiver + ')';
  if (!dynamic(key) && typeof key === 'string' && identifierName.test(key)) {
    return base + '.' + key;
  }
  return base + '[' + argument(key) + ']';
}
function property(object, key) {
  if (dynamic(object) || dynamic(key)) return {dynamic: true, source: memberSource(argument(object), key)};
  return object[key];
}
function test(value) {
  if (dynamic(value)) throw new Error('Dynamic control requires residual branching');
  return !!value;
}
function call(lines, receiver, method, args) {
  if (!dynamic(receiver) && receiver !== null && typeof receiver === 'object') throw new StagingError('Static object method calls require a builtin model');
  const name = fresh(lines);
  lines.push('var ' + name + ' = ' + memberSource(argument(receiver), method) + '(' + args.map(argument).join(', ') + ');\n');
  return {dynamic: true, source: name};
}
function slice(value, start) {
  if (dynamic(value) || dynamic(start)) return {dynamic: true, source: memberSource(argument(value), 'slice') + '(' + argument(start) + ')'};
  return value.slice(start);
}
function construct(name, args) {
  if (args.some(dynamic)) return {dynamic:true,source:'new '+name+'('+args.map(argument).join(', ')+')'};
  const constructors = {Error, TypeError, RangeError, SyntaxError, ReferenceError};
  if (!Object.hasOwn(constructors, name)) throw new Error('Unsupported constructor: ' + name);
  return new constructors[name](...args);
}
function finish(lines, value) { return 'function run(io) {\n' + lines.join('') + 'return ' + argument(value) + ';\n}'; }
function literal(value) { return {dynamic: true, source: argument(value)}; }
module.exports = {buffer: () => [], literal, argument, binary, property, test, call, slice, construct, finish};

// A shared counter prevents branch-local temporary names colliding at joins.
const COUNTER = Symbol('staging temporary counter');
function fresh(lines) {
  if (!lines[COUNTER]) lines[COUNTER] = {next: lines.length};
  return 'v' + lines[COUNTER].next++;
}
function fork(lines) {
  if (!lines[COUNTER]) lines[COUNTER] = {next: lines.length};
  const child = [];
  child[COUNTER] = lines[COUNTER];
  return child;
}
function bindExpression(lines, value) {
  if (!dynamic(value)) return value;
  // References and serialized primitive literals have no repeated effects.
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value.source) ||
      /^"(?:[^"\\]|\\.)*"$/.test(value.source) ||
      /^(?:-?(?:\d+(?:\.\d+)?(?:e[+-]?\d+)?|Infinity)|NaN)$/.test(value.source)) return value;
  const name = fresh(lines);
  lines.push('var ' + name + ' = ' + value.source + ';\n');
  return {dynamic:true, source:name};
}
function array(values) { return {dynamic:true,source:'['+values.map(argument).join(', ')+']'}; }
function discard(lines,value) { if(dynamic(value)) lines.push(argument(value)+';\n'); }
function throwValue(lines,value) {
  if (value instanceof Error) lines.push('throw new '+value.name+'('+(Object.hasOwn(value,'message')?JSON.stringify(value.message):'')+');\n');
  else lines.push('throw '+argument(value)+';\n');
}
function branch(lines, condition, yesLines, noLines, yesResult, noResult, env, yesEnv, noEnv) {
  if (yesResult[0]) yesLines.push('return '+argument(yesResult[1])+';\n');
  if (noResult[0]) noLines.push('return '+argument(noResult[1])+';\n');
  if (!yesResult[0] && !noResult[0]) {
    for (const key of Object.keys(env)) {
      const a=yesEnv[key].value,b=noEnv[key].value;
      if (a===b) {env[key].value=a;continue;}
      // Binding-time analysis promotes every assignment under dynamic control.
      const name=fresh(lines);lines.push('var '+name+';\n');
      yesLines.push(name+' = '+a+';\n');noLines.push(name+' = '+b+';\n');
      env[key].value=name;
    }
  } else if (!yesResult[0] || !noResult[0]) {
    const source=yesResult[0]?noEnv:yesEnv;
    for (const key of Object.keys(env)) env[key].value=source[key].value;
  }
  lines.push('if ('+argument(condition)+') {\n'+yesLines.join('')+'} else {\n'+noLines.join('')+'}\n');
  return [yesResult[0] && noResult[0], undefined];
}
function conditional(lines, condition, yesLines, yes, noLines, no) {
  const name=fresh(lines);
  lines.push('var '+name+';\nif ('+argument(condition)+') {\n'+yesLines.join('')+name+' = '+argument(yes)+';\n} else {\n'+noLines.join('')+name+' = '+argument(no)+';\n}\n');
  return {dynamic:true,source:name};
}
Object.assign(module.exports,{fork,bindExpression,array,discard,throwValue,branch,conditional});

function unary(op,value) {
  if(dynamic(value))return {dynamic:true,source:'('+op+' '+argument(value)+')'};
  switch(op){case '!':return !value;case '-':return -value;case '+':return +value;case 'typeof':return typeof value;default:throw new Error('Unsupported unary operator: '+op);}
}
module.exports.unary=unary;
function prepare(lines,receiver,method) {
  if (!dynamic(receiver) && receiver !== null && typeof receiver === 'object') {
    throw new StagingError('Static object method calls require a builtin model');
  }
  const object=fresh(lines),callee=fresh(lines);
  lines.push('var '+object+' = '+argument(receiver)+';\n');
  lines.push('var '+callee+' = '+memberSource(object, method)+';\n');
  return {object,callee};
}
function invoke(lines,prepared,args) {
  const name=fresh(lines);
  lines.push('var '+name+' = Reflect.apply('+prepared.callee+', '+prepared.object+', ['+args.map(argument).join(', ')+']);\n');
  return {dynamic:true,source:name};
}
Object.assign(module.exports,{prepare,invoke});

module.exports.reference = source => ({dynamic:true,source:source === undefined ? "undefined" : source});

class StagingError extends Error {}
module.exports.caught = function(lines,error) {
  if(error instanceof StagingError)throw error;
  throwValue(lines,error);
  return [true,undefined];
};
