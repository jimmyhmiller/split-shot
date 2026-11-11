// inputs: [{"i":0}, {"i":2}, {"i":5}]
// forbid: \b\w+\[\d+\] = (\d|")
// A graph the program builds that has a cycle (a parser whose table refers back to it) is made in two phases only where it must be: an object on a cycle, or one that reaches one, is made empty and filled after; every other object (the table's rows, a row shared by two entries) is a literal of what it holds, made before the fills that refer to it. Shared objects stay shared.
var shared = [7, 1];
var parser = { name: "p", table: [], shared: shared };
for (var r = 0; r < 6; r++) parser.table.push([r, r * 2, r % 3 === 0 ? shared : [r, "s" + r]]);
parser.table.push({ owner: parser });
parser.self = parser;
function main(input) {
  var row = parser.table[input.i];
  return [parser.self === parser, parser.table[6].owner === parser, row[0], row[1], row[2] === shared, String(row[2]), parser.table.length];
}
