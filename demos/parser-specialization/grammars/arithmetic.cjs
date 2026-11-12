const {
  literal,
  range,
  sequence,
  choice,
  zeroOrMore,
  oneOrMore,
} = require('../grammar.cjs');

// number     <- [0-9]+
// operator   <- '+' / '-' / '*' / '/'
// arithmetic <- number (operator number)*
//
// Examples: "123", "12+3*456-7/89".
// This recognizes expressions; it does not evaluate them or build an AST.
const number = oneOrMore(range('0', '9'));

const operator = choice(
  literal('+'),
  literal('-'),
  literal('*'),
  literal('/'),
);

const arithmetic = sequence(
  number,
  zeroOrMore(sequence(operator, number)),
);

module.exports = arithmetic;
