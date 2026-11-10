// @case {"description": "Hole presence differs from present undefined and remains visible in returned nested arrays."}
function main(x) {
  var a = new Array(4);
  a[1] = undefined;
  a[3] = x;
  var b = [, undefined, null, false];
  return [a, b, a[0], a[1], a.length, b.length];
}
