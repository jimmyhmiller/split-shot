function main(a) {
  return "/legacy/:slug" instanceof RegExp ? a + 1 : a;
}
