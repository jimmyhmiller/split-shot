// inputs: [0, 1, 2, 3, 7, 200]
// forbid-main: unreachable
// An if whose arms only compute values needs no residual branch: the values
// merge as `c ? a : b` (an object made in one arm, a literal made only on
// its side, once), and what each side is decides later tests (`a === 200`
// is false on both sides; `ob` is null exactly when `o == null`).
function crcStep(c) {
  for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
}
function main(n) {
  var flag = n > 2;
  var a = {};
  if (flag) a = 100;
  var same = a === 200 ? "unreachable" : "ok";
  var o = n % 2 ? null : { k: n };
  var ob = o == null ? null : { bar: o.k };
  var pick = !(o == null) ? "str" : ob;
  var op = n % 3, kind = "?";
  var table = [[0, "x"], [1, "y"], [2, "z"]];
  for (var c = 0; c < table.length; c++) {
    if (table[c][0] === op) kind = table[c][1];
  }
  var objs = flag ? { side: "t" } : { side: "f" };
  objs.side += "!";
  return [same, typeof a, pick, JSON.stringify(ob), kind, objs.side, crcStep(n)].join(",");
}
