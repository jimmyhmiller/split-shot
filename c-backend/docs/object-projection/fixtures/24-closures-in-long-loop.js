// @case {"description": "Closures created in a long loop each keep their own iteration's bindings, and the environments of discarded closures are reclaimed.", "inputs": ["0", "2"], "collection": {"minCollections": 2, "maxPeakHeapBytes": 24000000}}
function counter(start) {
  var count = start;
  return function (step) { count = count + step; return count; };
}
function main(x) {
  var kept = [], total = 0;
  for (let i = 0; i < 80000; i++) {
    var next = counter(i + x);
    var read = () => i * 2 + x;
    total = total + next(1) + next(2) + read();
    if (i % 10000 === 0) { kept[kept.length] = next; kept[kept.length] = read; }
  }
  var sum = 0, k = 0;
  while (k < kept.length) { var each = kept[k]; sum = sum + each(5); k = k + 1; }
  var third = kept[2], fourth = kept[3];
  return [total, kept.length, sum, third(1), fourth(0)];
}
