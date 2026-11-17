const cogen = fix(generate => term => match(term, {
  variable: value => value,
  staticApplication: left => right => code.application(() => generate(left), () => generate(right)),
  staticAbstraction: body => code.abstraction(
    () => bound1 => generate(body(code.variable(() => bound1)))
  ),
  dynamicApplication: left => right => quote.application(() => generate(left), () => generate(right)),
  dynamicAbstraction: body => quote.abstraction(
    () => code.abstraction(
      () => bound2 => generate(body(quote.variable(() => code.variable(() => bound2))))
    )
  )
}));
