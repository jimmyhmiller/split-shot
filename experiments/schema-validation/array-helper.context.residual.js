--- residual as JavaScript (33 block(s)) ---
function main(c) {
  let a, b, e, d;
  a = c !== null ? typeof c === "object" : c !== null;
  if (a) {
    a = !Array.isArray(c);
  }
  a: {
    if (a) {
      a = Object.hasOwn(c, "name");
      if (a) {
        a = c["name"];
        b = typeof a === "string";
        a = b ? a.length >= 1 : typeof a === "string";
      }
      b: {
        if (!a) {
          break b;
        }
        a = Object.hasOwn(c, "age");
        if (a) {
          a = c["age"];
          b = typeof a === "number";
          if (b) {
            b = Number.isFinite(a);
          }
          a = b ? a >= 0 : b;
        }
        if (!a) {
          break b;
        }
        a = Object.hasOwn(c, "tags");
        if (a) {
          c: {
            a = c["tags"];
            b = Array.isArray(a);
            if (b) {
              b = a.length;
              e = 0;
              while (e < b) {
                d = e in a;
                if (d) {
                  d = a[e];
                  d = !(typeof d === "string" ? true : typeof d === "string");
                }
                if (d) {
                  a = false;
                  break c;
                }
                e += 1;
              }
              a = true;
              break c;
            }
            a = b;
          }
        }
        if (!a) {
          break b;
        }
        a = true;
        break a;
      }
      a = false;
    }
  }
  return a;
}
