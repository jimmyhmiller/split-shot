// inputs: [0, 1, 5]
function main(n) {
  var m = /(?<a>\d+)-(\d+)?x?/.exec("ab 10-20x yz");
  var g = /o/g; var hits = []; var r; while ((r = g.exec("foo boo")) !== null) hits.push(r.index + ":" + g.lastIndex);
  var parts = "a1b22c333".split(/(\d+)/);
  var rep = "John Smith".replace(/(\w+)\s(\w+)/, "$2, $1");
  var rep2 = "aaa".replace(/a/g, "$&$&");
  var named = "2024-11-07".replace(/(?<y>\d+)-(?<m>\d+)-(?<d>\d+)/, "$<d>/$<m>/$<y>");
  var all = [..."x1y2z3".matchAll(/[a-z](\d)/g)].map(x => x[1] + "@" + x.index);
  return [m[0], m[1], m[2], m.index, m.groups.a, m.input, hits, parts, rep, rep2, named, all,
          /^\s*$/.test("   "), "abcabc".search(/c/), "AbC".match(/b/i).index, "a.b.c".split("."), /x/y.sticky, String(/a\/b/g), n + "!".replace(/!/, "?")];
}
