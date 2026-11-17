// Exact call-by-value Z combinator; no partial evaluator is called here.
const fix = f => (x => f(z => x(x)(z)))(x => f(z => x(x)(z)));
// Lazy constructor fields preserve the evaluation point in the original lambda
// encoding. The three handlers implement variable/application/abstraction.
const code = {
  variable: value => variable => application => abstraction => variable(value()),
  application: (fn,arg) => variable => application => abstraction => application(fn())(arg()),
  abstraction: body => variable => application => abstraction => abstraction(body())
};
// Code which, when executed, constructs a three-case code value. These helpers
// implement one level of quotation; they contain no specialization or dispatch
// on an interpreter's instructions.
const quote = {
  variable: value => code.abstraction(() => variable =>
    code.abstraction(() => application =>
      code.abstraction(() => abstraction =>
        code.application(() => code.variable(() => variable), value)))),
  application: (fn,arg) => code.abstraction(() => variable =>
    code.abstraction(() => application =>
      code.abstraction(() => abstraction =>
        code.application(() => code.application(() => code.variable(() => application), fn), arg)))),
  abstraction: body => code.abstraction(() => variable =>
    code.abstraction(() => application =>
      code.abstraction(() => abstraction =>
        code.application(() => code.variable(() => abstraction), body))))
};
function match(term, cases) {
  return term(cases.variable)(cases.staticApplication)(cases.staticAbstraction)(cases.dynamicApplication)(cases.dynamicAbstraction);
}
function matchCode(term, cases) {
  return term(cases.variable)(cases.application)(cases.abstraction);
}
module.exports={fix,code,quote,match,matchCode};
// Exact constructor contraction for an application of an abstraction.
function bindCode(value, body) {
  return code.application(() => code.abstraction(() => body), value);
}
function matchProgram(program, cases) {
  return program(cases.end)(cases.prompt)(cases.print);
}
module.exports.bindCode=bindCode;
module.exports.matchProgram=matchProgram;
function reference(value) { return code.variable(() => value); }
// Group consecutive residual abstractions without changing their curried ABI.
function functionCode(count, body) {
  function next(args) {
    if (args.length === count) { return body(...args); }
    return code.abstraction(() => value => next([...args, value]));
  }
  return next([]);
}
module.exports.reference=reference;
module.exports.functionCode=functionCode;
