const {
  literal,
  range,
  characterSet,
  sequence,
  zeroOrMore,
  oneOrMore,
} = require('../grammar.cjs');

// number      <- [0-9]+
// name        <- [a-zA-Z_]+
// assignment  <- name '=' number
// assignments <- assignment (';' assignment)*
//
// Examples: "count=123", "alpha=1;Beta=2;_count=99".
// Names deliberately exclude digits; whitespace is not accepted.
const number = oneOrMore(range('0', '9'));

const name = oneOrMore(characterSet(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_',
));

const assignments = sequence(
  name,
  literal('='),
  number,
  zeroOrMore(sequence(
    literal(';'),
    name,
    literal('='),
    number,
  )),
);

module.exports = assignments;
