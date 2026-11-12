function main(b) {
  let a, c;
  a = true;
  c = 0;
  while (true) {
    a: {
      if (a) {
        break a;
      }
      a = c;
      c = a + 1;
      a = a < b.length;
    }
    if (a) {
      if (c < b.length && "n" === b[c]) {
        a = c + 1;
        if (a < b.length && "e" === b[a]) {
          a = a + 1;
          if (a < b.length && "e" === b[a]) {
            a = a + 1;
            if (a < b.length && "d" === b[a]) {
              a = a + 1;
              if (a < b.length && "l" === b[a]) {
                a = a + 1;
                if (a < b.length && "e" === b[a]) {
                  return true;
                }
              }
            }
          }
        }
      }
      a = false;
      continue;
    }
    return false;
  }
}
