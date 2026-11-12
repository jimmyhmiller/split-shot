function main(b) {
  let a, d, c;
  a = true;
  d = 0;
  while (true) {
    a: {
      if (a) {
        break a;
      }
      a = d;
      d = a + 1;
      a = a < b.length;
    }
    if (a) {
      b: {
        if (d < b.length && "a" === b[d]) {
          a = d + 1;
          c = a;
          a = true;
          while (true) {
            c: {
              if (a) {
                break c;
              }
              a = c < b.length;
              if (a) {
                a = c;
                c = a + 1;
                a = b[a] === "b" || false;
              }
            }
            if (a) {
              if (c < b.length && "b" === b[c]) {
                a = c + 1;
                if (a < b.length && "c" === b[a]) {
                  return true;
                }
              }
              a = false;
              continue;
            }
            break b;
          }
        }
      }
      a = false;
      continue;
    }
    return false;
  }
}
