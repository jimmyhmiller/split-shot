const {fix,code,bindCode,matchProgram,reference,functionCode}=require("../helpers.cjs");
const compile = program => functionCode(
  3,
  (prompt, print, initial) => fix(run => remaining => value => matchProgram(remaining, {
    end: ignored => value,
    prompt: tail => bindCode(
      () => code.application(() => reference(prompt), () => functionCode(1, unit => reference(unit))),
      nextValue => run(tail)(reference(nextValue))
    ),
    print: tail => bindCode(
      () => code.application(() => reference(print), () => value),
      ignoredPrint => run(tail)(value)
    )
  }))(program)(reference(initial))
);

module.exports={compile};
