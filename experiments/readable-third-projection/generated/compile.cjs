const {fix,code,quote,match,matchCode}=require("../helpers.cjs");
const compile = fix(compileTerm => term => matchCode(term, {
  variable: value => value,
  application: left => right => code.application(() => compileTerm(left), () => compileTerm(right)),
  abstraction: body => code.abstraction(
    () => bound1 => compileTerm(body(code.variable(() => bound1)))
  )
}));

module.exports={compile};
