// inputs: [0, 1]
// A generic Array method called on a built-in receiver writes it:
// `Array.prototype.push.call(Object.prototype, x)` adds `0` and `length` to
// what every object inherits.
function main(n) {
  Array.prototype.push.call(Object.prototype, n + 5);
  const r = [({})[0], ({}).length];
  delete Object.prototype[0];
  delete Object.prototype.length;
  return r;
}
