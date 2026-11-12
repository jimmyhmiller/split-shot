function main(c) {
  let b, e, a, d, f;
  b = 0;
  e = 0;
  while (true) {
    a: {
      if (b >= c.length) {
        break a;
      }
      a = c.charCodeAt(b);
      a = a >= 48 && a <= 57 ? b + 1 : -1;
      if (a < 0) {
        break a;
      }
      if (a === b) {
        throw new Error("Nullable repetition");
      }
      e += 1;
      b = a;
      continue;
    }
    d = e >= 1 ? b : -1;
    if (d < 0) {
      a = -1;
      return a === c.length;
    }
    b: {
      c: {
        d: {
          e: {
            f: {
              if (c[d + 0] !== "+") {
                if (c[d + 0] !== "-") {
                  if (c[d + 0] !== "*") {
                    if (c[d + 0] !== "/") {
                      a = -1;
                      break b;
                    }
                    a = d + 1;
                    if (a < 0) {
                      break d;
                    }
                    break c;
                  }
                  a = d + 1;
                  if (a >= 0) {
                    break e;
                  }
                  if (c[d + 0] !== "/") {
                    a = -1;
                    break e;
                  }
                  a = d + 1;
                  break e;
                }
                a = d + 1;
                if (a >= 0) {
                  break f;
                }
                if (c[d + 0] !== "*") {
                  if (c[d + 0] !== "/") {
                    a = -1;
                    break e;
                  }
                  a = d + 1;
                  break e;
                }
                a = d + 1;
                if (a >= 0) {
                  break e;
                }
                if (c[d + 0] !== "/") {
                  a = -1;
                  break e;
                }
                a = d + 1;
                break e;
              }
              a = d + 1;
              if (a >= 0) {
                if (a < 0) {
                  break d;
                }
                break c;
              }
              if (c[d + 0] !== "-") {
                if (c[d + 0] !== "*") {
                  if (c[d + 0] !== "/") {
                    a = -1;
                    break e;
                  }
                  a = d + 1;
                  break e;
                }
                a = d + 1;
                if (a >= 0) {
                  break e;
                }
                if (c[d + 0] !== "/") {
                  a = -1;
                  break e;
                }
                a = d + 1;
                break e;
              }
              a = d + 1;
              if (a >= 0) {
                break f;
              }
              if (c[d + 0] !== "*") {
                if (c[d + 0] !== "/") {
                  a = -1;
                  break e;
                }
                a = d + 1;
                break e;
              }
              a = d + 1;
              if (a >= 0) {
                break e;
              }
              if (c[d + 0] !== "/") {
                a = -1;
                break e;
              }
              a = d + 1;
              break e;
            }
            if (a < 0) {
              break d;
            }
            break c;
          }
          if (a < 0) {
            break d;
          }
          break c;
        }
        a = -1;
        break b;
      }
      b = a;
      e = 0;
      while (!(b >= c.length)) {
        a = c.charCodeAt(b);
        a = a >= 48 && a <= 57 ? b + 1 : -1;
        if (a < 0) {
          a = e >= 1 ? b : -1;
          break b;
        }
        if (a === b) {
          throw new Error("Nullable repetition");
        }
        e += 1;
        b = a;
      }
      a = e >= 1 ? b : -1;
    }
    if (a < 0) {
      return d === c.length;
    }
    g: {
      if (a === d) {
        break g;
      }
      b = a;
      e = 1;
      h: while (true) {
        i: {
          j: {
            k: {
              l: {
                m: {
                  n: {
                    if (c[b + 0] !== "+") {
                      if (c[b + 0] !== "-") {
                        if (c[b + 0] !== "*") {
                          if (c[b + 0] !== "/") {
                            break k;
                          }
                          a = b + 1;
                          if (a < 0) {
                            break l;
                          }
                          break j;
                        }
                        a = b + 1;
                        if (a >= 0) {
                          break m;
                        }
                        if (c[b + 0] !== "/") {
                          a = -1;
                          break m;
                        }
                        a = b + 1;
                        break m;
                      }
                      a = b + 1;
                      if (a >= 0) {
                        break n;
                      }
                      if (c[b + 0] !== "*") {
                        if (c[b + 0] !== "/") {
                          a = -1;
                          break m;
                        }
                        a = b + 1;
                        break m;
                      }
                      a = b + 1;
                      if (a >= 0) {
                        break m;
                      }
                      if (c[b + 0] !== "/") {
                        a = -1;
                        break m;
                      }
                      a = b + 1;
                      break m;
                    }
                    a = b + 1;
                    if (a >= 0) {
                      if (a < 0) {
                        break l;
                      }
                      break j;
                    }
                    if (c[b + 0] !== "-") {
                      if (c[b + 0] !== "*") {
                        if (c[b + 0] !== "/") {
                          a = -1;
                          break m;
                        }
                        a = b + 1;
                        break m;
                      }
                      a = b + 1;
                      if (a >= 0) {
                        break m;
                      }
                      if (c[b + 0] !== "/") {
                        a = -1;
                        break m;
                      }
                      a = b + 1;
                      break m;
                    }
                    a = b + 1;
                    if (a >= 0) {
                      break n;
                    }
                    if (c[b + 0] !== "*") {
                      if (c[b + 0] !== "/") {
                        a = -1;
                        break m;
                      }
                      a = b + 1;
                      break m;
                    }
                    a = b + 1;
                    if (a >= 0) {
                      break m;
                    }
                    if (c[b + 0] !== "/") {
                      a = -1;
                      break m;
                    }
                    a = b + 1;
                    break m;
                  }
                  if (a < 0) {
                    break l;
                  }
                  break j;
                }
                if (a < 0) {
                  break l;
                }
                break j;
              }
              a = -1;
              if (a < 0) {
                break k;
              }
              if (a === b) {
                break g;
              }
              e += 1;
              b = a;
              continue;
            }
            a = e >= 0 ? b : -1;
            break i;
          }
          d = b;
          f = e;
          b = a;
          e = 0;
          while (true) {
            o: {
              if (b >= c.length) {
                break o;
              }
              a = c.charCodeAt(b);
              a = a >= 48 && a <= 57 ? b + 1 : -1;
              if (a < 0) {
                break o;
              }
              if (a === b) {
                throw new Error("Nullable repetition");
              }
              e += 1;
              b = a;
              continue;
            }
            a = e >= 1 ? b : -1;
            if (a < 0) {
              a = f >= 0 ? d : -1;
              break i;
            }
            if (a === d) {
              break g;
            }
            e = f + 1;
            b = a;
            continue h;
          }
        }
        return a === c.length;
      }
    }
    throw new Error("Nullable repetition");
  }
}
