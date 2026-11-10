function main(input) {
  var total = 0;
  for (let i = 0; i < input; i = i + 1) {
    let subtotal = 0;
    for (let j = 0; j < 3; j = j + 1) subtotal = subtotal + i - j;
    total = total + subtotal;
  }
  return total;
}
