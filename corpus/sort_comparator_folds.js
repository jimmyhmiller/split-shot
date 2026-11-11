// inputs: [1, -1, 0]
// forbid-main: sort\(function|sort\(\(|toSorted
// `sort` and `toSorted` with a comparator over a known array fold (the self-hosted merge sort is iterative: it unfolds wherever it is called); stable; a comparator whose answer is a runtime value leaves the call to the runtime.
function main(input) {
  var objs = [{ k: 2, n: "a" }, { k: 1, n: "b" }, { k: 2, n: "c" }, { k: 1, n: "d" }, { k: 0, n: "e" }];
  return [[3, 1, 2].sort(function (a, b) { return b - a; }).join(","), [5, 3, 9, 1, 7, 2, 8, 6, 4, 0, 11].sort((a, b) => a - b).join(), ["b", "a", undefined, "c", , "d"].sort().join("|"),
    objs.slice().sort((x, y) => x.k - y.k).map(o => o.n).join(""), [3, 1, 2].toSorted((a, b) => a - b).join(), [10, 9, 1].sort().join(), [].sort((a, b) => a - b).length, [1].sort((a, b) => b - a)[0],
    [3, 1, 2].sort(function (a, b) { return (b - a) * input; }).length, typeof globalThis];
}
