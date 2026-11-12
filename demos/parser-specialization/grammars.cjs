// Benchmark fixtures live here; the actual grammars are in grammars/.
const arithmetic = require('./grammars/arithmetic.cjs');
const assignments = require('./grammars/assignments.cjs');

function arithmeticInput(index) {
  const numbers = Array.from(
    { length: 1 + index % 12 },
    (_, position) => String((index * 31 + position * 7) % 10000),
  );
  const operator = ['+', '-', '*', '/'][index % 4];
  const invalidSuffix = index % 5 === 0 ? '?' : '';
  return numbers.join(operator) + invalidSuffix;
}

function assignmentsInput(index) {
  const names = ['alpha', 'Beta', '_count', 'x'];
  const items = Array.from({ length: 1 + index % 8 }, (_, position) => {
    const name = names[position % names.length];
    const value = (index * 31 + position) % 10000;
    return `${name}=${value}`;
  });
  const invalidSuffix = index % 5 === 0 ? ';' : '';
  return items.join(';') + invalidSuffix;
}

module.exports = [
  {
    name: 'arithmetic',
    grammar: arithmetic,
    oracle: /^(?:[0-9]+)(?:[+*/-][0-9]+)*$/,
    seeds: [
      '', '1', '12+3*456-7/89', '+1', '1+',
      '1++2', 'a', '1\n', '１２', '1 2',
    ],
    workload: Array.from({ length: 256 }, (_, index) => arithmeticInput(index)),
  },
  {
    name: 'assignments',
    grammar: assignments,
    oracle: /^[a-zA-Z_]+=[0-9]+(?:;[a-zA-Z_]+=[0-9]+)*$/,
    seeds: [
      '', 'a=0', 'name=123;B_=456', '=1', 'a=',
      'a=1;', 'a1=2', 'a=-1', 'a=1\n', 'é=2',
    ],
    workload: Array.from({ length: 256 }, (_, index) => assignmentsInput(index)),
  },
];
