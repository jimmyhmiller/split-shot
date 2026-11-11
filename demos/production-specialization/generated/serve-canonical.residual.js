function main(d) {
  let a, b, c;
  a = host.path;
  b = /(\.html|\/index)$/g;
  if (b.test(d)) {
    a: {
      a = d.replace(b, "");
      if (a.indexOf("//") > -1) {
        b = a.replace;
        c = /\/+/g;
        b = b.call(a, c, "/");
        break a;
      }
      b = a;
    }
    a = b.startsWith("/");
    a = {target: a ? b : "/" + `${b}`, statusCode: 301};
    return a;
  }
  b = d;
  a = a.parse(b);
  if (a == null) {
    throw new TypeError("Cannot destructure a null or undefined value");
  }
  b: {
    a.ext;
    a = a.name;
    c = b.endsWith("/");
    a.startsWith(".");
    if (c) {
      c = b.slice(0, -1);
      break b;
    }
    c = null;
  }
  if (b.indexOf("//") > -1) {
    a = b.replace;
    c = /\/+/g;
    c = a.call(b, c, "/");
  }
  if (c) {
    a = c.startsWith("/");
    a = {target: a ? c : "/" + `${c}`, statusCode: 301};
    return a;
  }
  return null;
}
