// inputs: [0, 1, 4]
// forbid: Symbol|next\(|Reflect|propertyIsEnumerable
// Destructuring in declarations, parameters, assignments and loops, with
// defaults and rest; all over static data, so it folds.
function area({ w, h = 2 }, [sx, sy] = [1, 1]) { return w * h * sx * sy; }
function first(...xs) { return xs[0] + xs.length; }
function main(n) {
  var [a, , b = 10, ...rest] = [n, 1, undefined, 3, 4];
  let { p, q: { r }, ...others } = { p: n + 1, q: { r: 2 }, s: 3, t: 4 };
  var x = 1, y = 2;
  [x, y] = [y, x];
  var sum = 0;
  for (const [k, v] of [["a", 1], ["b", n]]) sum += v;
  for (const ch of "hé!") sum += ch.length;
  var keys = [];
  for (var key in { u: 1, v: 2 }) keys.push(key);
  outer: for (var i = 0; i < 3; i++) { for (var j = 0; j < 3; j++) { if (j === 1) continue outer; if (i === 2) break outer; sum += 100; } }
  return [a, b, rest, p, r, others, x, y, sum, keys, area({ w: n }), area({ w: 3, h: 1 }, [2, n]), first(n, 5, 6), [...rest, ..."ab", n]];
}
