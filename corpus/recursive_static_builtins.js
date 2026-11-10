// inputs: [0, 1, 5]
// forbid-main: \.forEach\(|Object\.entries
// A recursive descent over a static input calls array built-ins in its
// recursion. Under static control the ones that make no array (forEach, and
// Object.entries' result walked by it) fold, as engine262's parser needs (its
// scope's `with` is recursive); `map`, which makes an array a recursion could
// grow on, stays a runtime call there.
function parse(tokens, i, depth) {
  var flags = { nested: depth > 0, depth: depth };
  var seen = [];
  Object.entries(flags).forEach(function (kv) { seen.push(kv[0] + "=" + kv[1]); });
  if (tokens[i] === "(") {
    var inner = parse(tokens, i + 1, depth + 1);
    return { node: ["group", inner.node].map(function (x) { return x; }), next: inner.next + 1, seen: seen.concat(inner.seen) };
  }
  return { node: tokens[i], next: i + 1, seen: seen };
}
function main(x) {
  var r = parse(["(", "(", "a", ")", ")"], 0, 0);
  return [JSON.stringify(r.node), r.next, r.seen.join(","), x];
}
