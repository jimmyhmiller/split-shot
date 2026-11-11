// inputs: [1, "n", null]
// A known array given a `length` (shorter: the rest is gone; longer: holes) or a property that is no element (`arr.extra = v`) stays known: its elements, its length, its keys in order, what `JSON.stringify` prints of it.
function main(input) {
  var a = [3, 1, 2, 9]; a.length = 2;
  var b = [1]; b.length = 4; b[2] = "x";
  var c = [1, 2, 3]; c.extra = 5; c.extra += 1; c["1"] = "s"; c.tag = { t: 1 };
  var d = [1, 2]; d.length = 0; d.push(7);
  var e = [5, 6]; e.map = "shadow";
  var keys = []; for (var k in c) keys.push(k);
  var f = [1, 2, 3]; f.name = input;
  return [a.join(), a.length, a[2], b.length, b.join("-"), 1 in b, 2 in b, Object.keys(b).join(), c.extra, c[1], c.length, c.tag.t, keys.join(), Object.keys(c).join(), JSON.stringify(c), d.join(), e.map, e.length, c.slice().extra, f, f.name, Array.isArray(c)];
}
