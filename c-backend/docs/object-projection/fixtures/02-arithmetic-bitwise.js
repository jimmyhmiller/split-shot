// @case {"description": "Numeric edge cases use JS remainder, shifts and ToInt32/ToUint32 semantics."}
function main(x) {
  return [x + 2, x - 2, x * -1, x / 2, x % 2, x ** 2,
    -5 % 2, 5 % -2, 1 / 0, -1 / 0, 0 / 0,
    4294967295 | 0, 2147483648 >> 0, -1 >>> 0, 1 << 33,
    x | 3, x & 3, x ^ 3, ~x, x << 2, x >> 2, x >>> 2,
    +null, +false, +true, +undefined, +"12.5", +"no"];
}
