// @case {"description": "Array and object patterns in declarations, assignments and parameters: nesting, defaults, renaming, holes, rest elements, computed keys, and evaluation of the source exactly once."}
function point({ x, y = 10, label: name = "none" }, [first, , third = "t3"] = []) {
  return [x, y, name, first, third];
}
function main(input) {
  var evaluations = 0;
  function source() { evaluations = evaluations + 1; return { a: input, b: { c: [1, 2, 3], d: undefined }, e: null }; }
  var { a, b: { c: [head, ...tail], d = "defaulted" }, e = "not used", missing = a + 1 } = source();
  let [p, q = p * 2, [r] = [7], ...others] = [input, undefined, undefined, 4, 5];
  const { ["compu" + "ted"]: viaKey = 3, length } = "four";
  var swapA = 1, swapB = 2, holder = {};
  [swapA, swapB] = [swapB, swapA];
  var assigned = ({ a: holder.first, b: [holder.second] = [9] } = { a: "A" });
  var nestedArrow = ({ k }, [v]) => k + v;
  var chars = [];
  [chars[0], chars[1]] = "hi";
  return [a, head, tail, d, e, missing, p, q, r, others, viaKey, length, swapA, swapB, holder.first, holder.second,
    assigned.a, point({ x: input }), point({ x: 1, y: 2, label: "L" }, ["f", "s", undefined]),
    nestedArrow({ k: input }, [5]), chars, evaluations];
}
