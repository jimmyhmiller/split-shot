// @case {"description": "Rest parameters collect the remaining arguments into a fresh array; spread expands arrays and strings into array literals and into the arguments of calls, method calls and constructions, with holes becoming undefined."}
function tail(first, ...rest) { return [first, rest.length, rest]; }
function sum(...numbers) { var total = 0; for (const n of numbers) total = total + n; return total; }
function Pair(a, b) { this.a = a; this.b = b; this.count = arguments.length; }
function describe() { return this.tag + ":" + arguments.length; }
function pattern(...[head, ...others]) { return [head, others]; }
function main(x) {
  var base = [1, x, 3], sparse = [1, , 3], empty = [];
  var literals = [[...base], [0, ...base, 4], [...base, ...base].length, [..."hé"], [...empty], [...sparse],
    [x, ...sparse].length, [...[...base]].length, [...base, , 9].length];
  var copy = [...base];
  copy[0] = "changed";
  var holder = { tag: "h", describe: describe, sum: sum };
  var pair = new Pair(...base), short = new Pair(...empty);
  var calls = [sum(...base), sum(...base, 10, ...base), sum(), sum(...empty), holder.sum(...base),
    holder.describe(...base, "extra"), holder.describe(...empty), Math.max(...base, 2), tail(...base),
    tail(), tail(x), pair.a, pair.b, pair.count, short.a === undefined, short.count,
    pattern(7, 8, 9), sum(...sparse) !== sum(...sparse), base[0], copy[0]];
  var aliased = [1, 2];
  aliased = [...aliased, ...aliased];
  return [literals, calls, aliased];
}
