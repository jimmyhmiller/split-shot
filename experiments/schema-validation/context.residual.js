--- residual as JavaScript (26 block(s)) ---
function __mk0(a, b) {
  return (c) => {
    return (0 , b.value)(a.items, c);
  };
}

function __mk1(e) {
  return function validate(d, b) {
    let a, c;
    a = d.type;
    if (a === "string") {
      a = typeof b === "string";
      c = a ? d.minLength === void 0 : void 0;
      c = a ? c ? c : b.length >= d.minLength : c;
      a = a ? c : typeof b === "string";
      return a;
    }
    if (a === "number") {
      a = typeof b === "number";
      if (a) {
        a = Number.isFinite(b);
      }
      c = a ? d.min === void 0 : void 0;
      c = a ? c ? c : b >= d.min : c;
      return a ? c : a;
    }
    if (a === "boolean") {
      return typeof b === "boolean";
    }
    if (a === "array") {
      a = Array.isArray(b);
      if (a) {
        a = b.every(__mk0(d, e));
      }
      return a;
    }
    if (a === "object") {
      a = b !== null ? typeof b === "object" : b !== null;
      if (a) {
        a = !Array.isArray(b);
      }
      if (a) {
        a = Object.keys(d.properties);
        a = a.every(__mk2(d, e, b));
      }
      return a;
    }
    throw new Error("Unknown schema type: " + d.type);
  };
}

function __mk2(d, e, c) {
  return (b) => {
    let a;
    a = Object.hasOwn(c, b);
    if (a) {
      a = (0 , e.value)(d.properties[b], c[b]);
    }
    return a;
  };
}

function main(c) {
  let a, b, d, e;
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
        c: {
          a = Object.hasOwn(c, "tags");
          if (a) {
            d: {
              a = c["tags"];
              b = Array.isArray(a);
              if (b) {
                d = a.every;
                b = {};
                e = __mk0({type: "array", items: {type: "string"}}, b);
                b.value = __mk1(b);
                a = d.call(a, e);
                break d;
              }
              a = b;
              b = {};
              b.value = __mk1(b);
            }
            break c;
          }
          b = {};
          b.value = __mk1(b);
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
