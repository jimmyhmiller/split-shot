// @case {"description": "Sustained allocation of objects, arrays and strings is collected while a sparse chain, a rolling window and a growing array stay intact.", "inputs": ["0", "1", "3"], "collection": {"minCollections": 2, "maxPeakHeapBytes": 24000000}}
function Node(value, next) {
  this.value = value;
  this.next = next;
  this.items = [value, value + 1, value + 2];
  this.label = "n" + value;
}
function main(x) {
  var keep = null, kept = 0, total = 0, matched = 0, i = 0;
  var ring = [null, null, null, null, null, null, null, null];
  var grown = [];
  while (i < 60000) {
    var node = new Node(i + x, null);
    if (i % 1000 === 0) { node.next = keep; keep = node; kept = kept + 1; }
    if (i % 500 === 0) grown[grown.length] = node.items;
    ring[i % 8] = node;
    total = total + node.items[2];
    if (node.label === "n" + (i + x)) matched = matched + 1;
    i = i + 1;
  }
  var chain = 0, links = 0;
  while (keep !== null) { chain = chain + keep.value + keep.items[1]; links = links + 1; keep = keep.next; }
  var window = 0, j = 0;
  while (j < 8) { window = window + ring[j].value; j = j + 1; }
  var spread = 0, k = 0;
  while (k < grown.length) { spread = spread + grown[k][0]; k = k + 1; }
  return [total, matched, kept, links, chain, window, grown.length, spread, ring[7].label];
}
