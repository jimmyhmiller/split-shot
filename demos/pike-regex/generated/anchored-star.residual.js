function main(b) {
  let a, c;
  if (0 < b.length && "a" === b[0]) {
    a = true;
    c = 1;
    while (true) {
      a: {
        if (a) {
          break a;
        }
        a = c < b.length;
        if (a) {
          a = c;
          c = a + 1;
          a = b[a] === "b" || false;
        }
      }
      if (a) {
        if (c < b.length && "c" === b[c]) {
          if (c + 1 === b.length) {
            return true;
          }
        }
        a = false;
        continue;
      }
      return false;
    }
  }
  return false;
}
