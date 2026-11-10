function main(input) {
  const scale = 1.5;
  function outer(x) {
    const bias = x + 2;
    function inner(y) { return y * scale + bias; }
    return inner(x) + inner(input);
  }
  return outer(input - 1) + outer(input + 1);
}
