// inputs: [0, 3]
// forbid-return: \bin\b|next
// `k in g` of a generator object folds: engine262 checks every result with
// `typeof r === "object" && "next" in r` (whether it is an evaluator to
// drive), and the generator escaping there took the whole realm with it.
function main(x) {
  function* gen(n) { yield n; yield n + 1; }
  const g = gen(x);
  const isEvaluator = typeof g === "object" && "next" in g;
  let sum = 0;
  if (isEvaluator) for (const v of g) sum += v;
  return [isEvaluator, "return" in g, "map" in g, "toString" in g, "nope" in g, sum].join();
}
