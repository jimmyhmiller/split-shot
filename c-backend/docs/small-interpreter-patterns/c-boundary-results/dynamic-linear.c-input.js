function main(a) {
  if (0 === a % 3) {
    return a + 7;
  }
  if (1 === a % 3) {
    return 9;
  }
  if (2 === a % 3) {
    return 10;
  }
  return 7;
}
