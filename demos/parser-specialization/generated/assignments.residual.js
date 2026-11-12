var __s0 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";

function main(e) {
  let b, c, a, d, f, g;
  b = 0;
  c = 0;
  while (true) {
    a = b < e.length;
    if (a) {
      a = (__s0).indexOf(e[b]) >= 0;
    }
    a = a ? b + 1 : -1;
    if (a < 0) {
      a: {
        a = c >= 1 ? b : -1;
        if (a < 0) {
          d = -1;
          break a;
        }
        if (e[a + 0] !== "=") {
          d = -1;
          break a;
        }
        a += 1;
        if (a < 0) {
          d = -1;
          break a;
        }
        b = a;
        c = 0;
        while (true) {
          b: {
            if (b >= e.length) {
              break b;
            }
            a = e.charCodeAt(b);
            a = a >= 48 && a <= 57 ? b + 1 : -1;
            if (a < 0) {
              break b;
            }
            if (a === b) {
              throw new Error("Nullable repetition");
            }
            c += 1;
            b = a;
            continue;
          }
          a = c >= 1 ? b : -1;
          if (a < 0) {
            d = -1;
            break a;
          }
          c: {
            d: {
              e: {
                f: {
                  if (e[a + 0] !== ";") {
                    d = -1;
                    if (d < 0) {
                      b = a;
                      c = 0;
                      break e;
                    }
                    if (d === a) {
                      break c;
                    }
                    b = d;
                    c = 1;
                    break f;
                  }
                  g: {
                    f = a;
                    a += 1;
                    if (a < 0) {
                      d = -1;
                      break g;
                    }
                    b = a;
                    c = 0;
                    while (true) {
                      a = b < e.length;
                      if (a) {
                        a = (__s0).indexOf(e[b]) >= 0;
                      }
                      a = a ? b + 1 : -1;
                      if (a < 0) {
                        a = c >= 1 ? b : -1;
                        if (a < 0) {
                          d = -1;
                          break g;
                        }
                        if (e[a + 0] !== "=") {
                          d = -1;
                          break g;
                        }
                        a += 1;
                        if (a < 0) {
                          d = -1;
                          break g;
                        }
                        b = a;
                        c = 0;
                        while (!(b >= e.length)) {
                          a = e.charCodeAt(b);
                          a = a >= 48 && a <= 57 ? b + 1 : -1;
                          if (a < 0) {
                            d = c >= 1 ? b : -1;
                            break g;
                          }
                          if (a === b) {
                            throw new Error("Nullable repetition");
                          }
                          b = a;
                          c += 1;
                        }
                        d = c >= 1 ? b : -1;
                        break g;
                      }
                      if (a === b) {
                        throw new Error("Nullable repetition");
                      }
                      c += 1;
                      b = a;
                    }
                  }
                  if (d < 0) {
                    return f === e.length;
                  }
                  if (d === f) {
                    break c;
                  }
                  b = d;
                  c = 1;
                }
                h: while (e[b + 0] === ";") {
                  a = b + 1;
                  if (a < 0) {
                    d = -1;
                    if (d < 0) {
                      break e;
                    }
                    if (d === b) {
                      break c;
                    }
                    c += 1;
                    b = d;
                    continue;
                  }
                  f = b;
                  g = c;
                  b = a;
                  c = 0;
                  while (true) {
                    a = b < e.length;
                    if (a) {
                      a = (__s0).indexOf(e[b]) >= 0;
                    }
                    a = a ? b + 1 : -1;
                    if (a < 0) {
                      i: {
                        a = c >= 1 ? b : -1;
                        if (a < 0) {
                          d = -1;
                          break i;
                        }
                        if (e[a + 0] !== "=") {
                          d = -1;
                          break i;
                        }
                        a += 1;
                        if (a < 0) {
                          d = -1;
                          break i;
                        }
                        b = a;
                        c = 0;
                        while (!(b >= e.length)) {
                          a = e.charCodeAt(b);
                          a = a >= 48 && a <= 57 ? b + 1 : -1;
                          if (a < 0) {
                            d = c >= 1 ? b : -1;
                            break i;
                          }
                          if (a === b) {
                            throw new Error("Nullable repetition");
                          }
                          b = a;
                          c += 1;
                        }
                        d = c >= 1 ? b : -1;
                      }
                      if (d < 0) {
                        d = g >= 0 ? f : -1;
                        break d;
                      }
                      if (d === f) {
                        break c;
                      }
                      c = g + 1;
                      b = d;
                      continue h;
                    }
                    if (a === b) {
                      throw new Error("Nullable repetition");
                    }
                    c += 1;
                    b = a;
                  }
                }
              }
              d = c >= 0 ? b : -1;
            }
            return d === e.length;
          }
          throw new Error("Nullable repetition");
        }
      }
      return d === e.length;
    }
    if (a === b) {
      throw new Error("Nullable repetition");
    }
    c += 1;
    b = a;
  }
}
