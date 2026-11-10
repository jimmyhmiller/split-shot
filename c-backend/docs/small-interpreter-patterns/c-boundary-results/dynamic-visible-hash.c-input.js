function main(a) {
  let b, c;
  b = Math.floor((a % 3 % 4 + 4) % 4);
  if ((a % 3 % 4 + 4) % 4 !== b) {
    return 7;
  }
  b = [[[0, a]], [[1, 2]], [[2, 3]], []][(a % 3 % 4 + 4) % 4];
  c = 0;
  while (c < b.length) {
    if (b[c][0] === a % 3) {
      return b[c][1] + 7;
    }
    c += 1;
  }
  return 7;
}
