--- residual as JavaScript (32 block(s)) ---
function main(b) {
  let a, c, e, d;
  a = b !== null ? typeof b === "object" : b !== null;
  if (a) {
    a = !Array.isArray(b);
  }
  a: {
    if (a) {
      a = Object.hasOwn(b, "name");
      if (a) {
        a = b["name"];
        c = typeof a === "string";
        a = c ? a.length >= 1 : typeof a === "string";
      }
      b: {
        if (!a) {
          break b;
        }
        a = Object.hasOwn(b, "age");
        if (a) {
          a = b["age"];
          c = typeof a === "number";
          if (c) {
            c = Number.isFinite(a);
          }
          a = c ? a >= 0 : c;
        }
        if (!a) {
          break b;
        }
        c: {
          a = Object.hasOwn(b, "tags");
          if (a) {
            a = b["tags"];
            if (!Array.isArray(a)) {
              a = false;
              break c;
            }
            c = a.length;
            e = 0;
            while (e < c) {
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
