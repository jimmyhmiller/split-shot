function main(d) {
  let a, b, c, e;
  a: {
    if (d) {
      a = d["slug"];
      break a;
    }
    a = void 0;
  }
  if (Array.isArray(a)) {
    throw new TypeError("Expected \"slug\" to not repeat, but got array");
  }
  c = "/articles";
  if (typeof a === "string" || typeof a === "number" || typeof a === "boolean") {
    b = String(a);
    a = {name: "slug", prefix: "/", delimiter: "/", optional: false, repeat: false, pattern: "[^\\/]+?"};
    b = encodeURIComponent(b, a);
    e = (/^(?:[^\/]+?)$/i).test(b);
    if (!e) {
      throw new TypeError("Expected \"" + a.name + "\" to match \"" + a.pattern + "\", but got \"" + b + "\"");
    }
    c += a.prefix + b;
    return c;
  }
  throw new TypeError("Expected \"slug\" to be a string");
}
