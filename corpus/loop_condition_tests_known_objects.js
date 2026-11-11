// inputs: [0, 2, "x"]
// forbid-main: while|next|end
// A loop whose condition only tests known objects is run now, not left as a loop: a linked list walked to `null` (`n !== null`), a trie walked by the characters of a known string (`node[s[i]] && i < s.length`, past the string's end too, where the key is `undefined`), a path walked while the next node exists.
function createTrie(words) {
  var trie = {};
  for (var w of Object.keys(words)) {
    var node = trie;
    for (var i = 0; i < w.length; i++) { node[w[i]] = node[w[i]] || {}; node = node[w[i]]; }
    node.end = true; node.data = words[w];
  }
  return trie;
}
function lookup(trie, s) {
  var node = trie, i = 0, found;
  while (node[s[i]] && i < s.length) { node = node[s[i++]]; if (node.end) found = node; }
  return found ? found.data + ":" + i : "none:" + i;
}
function main(input) {
  var list = { v: 1, next: { v: 2, next: { v: 3, next: null } } };
  var sum = 0, n = list;
  while (n !== null) { sum += n.v; n = n.next; }
  var t = { a: { b: { tag: 1 } } }, node = t, path = ["a", "b", "zz"], i = 0;
  while (node && node[path[i]]) node = node[path[i++]];
  var trie = createTrie({ "true": 1, "false": 0, nil: -1, "null": -2 });
  return [sum, node.tag, i, lookup(trie, "nil"), lookup(trie, "nullx"), lookup(trie, "tru"), lookup(trie, ""), input];
}
