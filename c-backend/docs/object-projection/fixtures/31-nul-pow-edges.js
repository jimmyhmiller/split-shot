// @case {"description":"Embedded NUL must not truncate numeric strings; exponentiation handles NaN and infinite exponents using JavaScript semantics."}
function main(x) {
  return [+('12\u0000junk'), +('Infinity\u0000junk'),
    1 ** (0 / 0), (0 / 0) ** 0, (-1) ** (1 / 0)];
}
