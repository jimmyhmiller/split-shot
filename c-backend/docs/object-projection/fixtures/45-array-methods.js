// @case {"description": "The array methods of the prelude: searching, slicing, joining, reordering, and the callback-taking ones with their index, array and receiver arguments."}
function main(x) {
  var a = [5, 1, x, 4, 1];
  var search = [a.indexOf(1), a.indexOf(1, 2), a.indexOf(9), a.lastIndexOf(1), a.includes(x), a.includes(0 / 0),
    [0 / 0].includes(0 / 0), [0 / 0].indexOf(0 / 0), a.at(-1), a.at(9) === undefined, Array.isArray(a), Array.isArray("a")];
  var copies = [a.slice(1, 3), a.slice(-2), a.slice(), a.concat([7, 8], 9, [[10]]), [1, , 3].slice(0, 2).length,
    a.join("-"), [1, null, undefined, "s"].join(), [].join("x")];
  var b = a.slice();
  var changed = [b.reverse().join(), b.shift(), b.unshift(8, 9), b.join(), b.fill(0, 1, 3).join(),
    b.splice(1, 2, "p", "q", "r").join(), b.join(), b.splice(-2).join(), b.splice(1, 0, "z").length, b.join()];
  var seen = [];
  a.forEach(function (item, index, all) { seen[seen.length] = item * 10 + index + all.length + this.bias; }, { bias: 1000 });
  var mapped = a.map((item, index) => item + index);
  var higher = [seen, mapped, a.filter(item => item > 1), a.some(item => item === x), a.every(item => item > 0),
    a.find(item => item > 3), a.find(item => item > 99) === undefined, a.findIndex(item => item === 4),
    a.reduce((total, item) => total + item), a.reduce((total, item) => total + item, 100),
    a.reduceRight((text, item) => text + item, ""), [].reduce((t, i) => t + i, "empty")];
  var words = ["pear", "Apple", "fig", "apple", undefined, "banana"];
  var sorted = [words.slice().sort().join(), [10, 9, 1, 100].sort().join(), [10, 9, 1, 100].sort((p, q) => p - q).join(),
    [3, 1, 2].sort((p, q) => q - p).join(), a.slice().sort((p, q) => p - q).join(),
    [{ k: 1, v: "a" }, { k: 0, v: "b" }, { k: 1, v: "c" }, { k: 0, v: "d" }].sort((p, q) => p.k - q.k).map(o => o.v).join("")];
  return [search, copies, changed, higher, sorted];
}
