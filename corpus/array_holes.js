// inputs: [0, 5]
// after: [globalThis.h1.length, 1 in globalThis.h1, Object.keys(globalThis.h1).join(), globalThis.h2.length, 3 in globalThis.h2, JSON.stringify(globalThis.h2)].join("|")
// Array holes: writes past the end, delete, elisions and new Array(n) make
// holes, which in, Object.keys, for..in and the iteration methods respect,
// and materialization keeps (an escaped holey array).
function main(n) {
  var a = [];
  a[3] = n;
  var calls = 0;
  a.forEach(function () { calls++; });
  var m = a.map(function (x) { return x * 2; });
  var b = [1, 2, 3];
  delete b[1];
  var keys = Object.keys(a).join(",") + "|" + Object.keys(b).join(",");
  var inn = [1 in a, 3 in a, 1 in b];
  var forin = [];
  for (var k in b) forin.push(k);
  var c = new Array(3);
  globalThis.h1 = [1, , 3];
  var h2 = new Array(5); h2[1] = n; globalThis.h2 = h2;
  var mm = [4, , 6].map(function (x) { return x + 1; });
  var srt = [3, , 1, undefined].sort();
  var rev = [1, , 3, , ].reverse();
  return [mm.length + ":" + (1 in mm), srt.length + ":" + Object.keys(srt).join("") + ":" + srt[0], rev.length + ":" + Object.keys(rev).join(""), calls, m.length, 0 in m, keys, inn.join(","), forin.join(","), c.length, 0 in c, JSON.stringify(a), a.indexOf(undefined), a.includes(undefined), b.filter(function () { return true; }).length].join(" ; ");
}
