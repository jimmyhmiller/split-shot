// Fixed patterns are the static input. Only text varies at runtime.
module.exports = [
  {
    name: 'anchored-star',
    pattern: '^ab*c$',
    examples: ['ac', 'abc', 'abbbbbc', 'abbbd', 'xabc', 'abc\n'],
    inputs: Array.from({ length: 256 }, (_, i) =>
      'a' + 'b'.repeat(i % 48) + (i % 4 === 0 ? 'd' : 'c')),
  },
  {
    name: 'literal-search',
    pattern: 'needle',
    examples: ['', 'needle', 'a needle here', 'needles', 'need', 'NEEDLE'],
    inputs: Array.from({ length: 256 }, (_, i) =>
      'hay '.repeat(i % 12) + (i % 4 === 0 ? 'needless' : 'missing')),
  },
  {
    name: 'dot-star',
    pattern: '^a.*z$',
    examples: ['az', 'abz', 'a\nz', 'azz', 'za', 'az\n'],
    inputs: Array.from({ length: 256 }, (_, i) =>
      'a' + 'xyz\n'.repeat(i % 16) + (i % 4 === 0 ? '!' : 'z')),
  },
  {
    name: 'backtracking',
    pattern: 'ab*bc',
    examples: ['abc', 'abbc', 'ac', 'xabbbbbc!', 'abbbd', 'aabc'],
    inputs: Array.from({ length: 256 }, (_, i) =>
      'xx'.repeat(i % 8) + 'a' + 'b'.repeat(i % 32) + (i % 4 === 0 ? 'd' : 'c')),
  },
];
