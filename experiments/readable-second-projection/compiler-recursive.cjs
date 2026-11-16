// Compiler derived from interpreter-recursive.js by specializing jsmix (RustPE, 592 blocks).
// Use:  node experiments/readable-second-projection/compiler-recursive.cjs '<program-json>' [input]
function __rf0(f, g, d, i) {
  let a, c, b, e, h, n, j, o, l, k, p, m;
  a = g[0];
  if (a === "lit") {
    return g[1];
  }
  if (a === "var") {
    a = g[1];
    if (d[0][0] === a) {
      return d[0][1];
    }
    if (d[1][0] === a) {
      return d[1][1];
    }
    if (d[2][0] === a) {
      return d[2][1];
    }
    if (d[3][0] === a) {
      return d[3][1];
    }
    if (d[4][0] === a) {
      return d[4][1];
    }
    if (d[5][0] === a) {
      return d[5][1];
    }
    if (d[6][0] === a) {
      return d[6][1];
    }
    if (d[7][0] === a) {
      return d[7][1];
    }
    return 0;
  }
  if (a === "arr") {
    a = g[1];
    c = [];
    b = 0;
    while (b < a.length) {
      c.push;
      e = __rf0(f, a[b], d, i);
      c.push(e);
      b += 1;
    }
    return c;
  }
  if (a === "idx") {
    return __rf0(f, g[1], d, i)[__rf0(f, g[2], d, i)];
  }
  if (a === "dot") {
    a = __rf0(f, g[1], d, i);
    if (g[2] === "length") {
      return a.length;
    }
    return 0;
  }
  if (a === "bin") {
    a = g[1];
    c = a === "+" ? a === "+" : a === "-";
    c = c ? c : a === "*";
    if (c) {
      c = __rf0(f, g[2], d, i);
      b = __rf0(f, g[3], d, i);
      if (typeof c === "number" ? typeof b === "number" : typeof c === "number") {
        if (a === "+") {
          return c + b;
        }
        if (a === "-") {
          return c - b;
        }
        return c * b;
      }
      c = __rf1(c);
      b = __rf1(b);
      if (a === "+") {
        return "(" + c + " + " + b + ")";
      }
      if (a === "-") {
        return "(" + c + " - " + b + ")";
      }
      return "(" + c + " * " + b + ")";
    }
    c = __rf0(f, g[2], d, i);
    b = __rf0(f, g[3], d, i);
    e = a === "===" ? a === "===" : a === "==";
    if (e) {
      return c === b;
    }
    e = a === "!==" ? a === "!==" : a === "!=";
    if (e) {
      return c !== b;
    }
    if (a === "<") {
      return c < b;
    }
    if (a === ">") {
      return c > b;
    }
    if (a === "<=") {
      return c <= b;
    }
    return c >= b;
  }
  if (a === "cond") {
    if (__rf0(f, g[1], d, i)) {
      return __rf0(f, g[2], d, i);
    }
    return __rf0(f, g[3], d, i);
  }
  c = i;
  if (a === "call") {
    a = g[1];
    b = g[2];
    e = a[0] === "dot";
    e = e ? a[2] === "reduce" : e;
    if (e) {
      a = __rf0(f, a[1], d, c);
      e = b[0];
      b = __rf1(__rf0(f, b[1], d, c));
      h = e[1][0];
      n = e[1][1];
      a: while (a.length > 0) {
        j = [];
        if (d[0][0] === "") {
          j.push;
          o = [h, b];
          p = e[2];
          j.push(o);
          l = 1;
          k = 0;
          while (true) {
            k += 1;
            if (k < 8) {
              m = l === 0;
              m = m ? d[k][0] === "" : l === 0;
              if (m) {
                j.push;
                j.push([h, b]);
                l = 1;
                continue;
              }
              j.push(d[k]);
              continue;
            }
            b = __rf3(f, p, __rf2(j, n, a[0]), c)[1];
            a = a.slice(1);
            continue a;
          }
        }
        o = e[2];
        j.push(d[0]);
        l = 0;
        k = 0;
        while (true) {
          k += 1;
          if (k < 8) {
            m = l === 0;
            m = m ? d[k][0] === "" : l === 0;
            if (m) {
              j.push;
              j.push([h, b]);
              l = 1;
              continue;
            }
            j.push(d[k]);
            continue;
          }
          b = __rf3(f, o, __rf2(j, n, a[0]), c)[1];
          a = a.slice(1);
          continue a;
        }
      }
      return b;
    }
    e = a[0] === "dot";
    e = e ? a[2] === "slice" : e;
    if (e) {
      a = __rf0(f, a[1], d, c);
      e = a.slice;
      c = __rf0(f, b[0], d, c);
      return e.call(a, c);
    }
    if (a[0] === "dot") {
      a = __rf1(__rf0(f, a[1], d, c)) + "." + a[2] + "(";
      e = 0;
      while (e < b.length) {
        if (e > 0) {
          a += ", ";
        }
        a += __rf1(__rf0(f, b[e], d, c));
        e += 1;
      }
      b = "v" + c.length;
      c.push("var " + b + " = " + a + ");\n");
      return b;
    }
    e = [];
    h = 0;
    while (h < b.length) {
      e.push;
      n = __rf0(f, b[h], d, c);
      e.push(n);
      h += 1;
    }
    a = a[1];
    b = 0;
    while (true) {
      b: {
        if (b < f.length) {
          if (f[b][1] === a) {
            a = f[b];
            b = [["", 0], ["", 0], ["", 0], ["", 0], ["", 0], ["", 0], ["", 0], ["", 0]];
            h = 0;
            break b;
          }
          b += 1;
          continue;
        }
        a = f[0];
        b = [["", 0], ["", 0], ["", 0], ["", 0], ["", 0], ["", 0], ["", 0], ["", 0]];
        h = 0;
      }
      while (h < (a[2]).length) {
        b = __rf2(b, a[2][h], e[h]);
        h += 1;
      }
      return __rf3(f, a[3], b, c)[1];
    }
  }
  return 0;
}

function __rf1(a) {
  if (a === null) {
    return "null";
  }
  if (typeof a === "number") {
    return "" + a;
  }
  return a;
}

function __rf2(d, e, f) {
  let b, c, a;
  a: {
    b = [];
    if (d[0][0] === "") {
      b.push;
      b.push([e, f]);
      c = 1;
      break a;
    }
    b.push(d[0]);
    c = 0;
  }
  b: {
    a = c === 0;
    a = a ? d[1][0] === "" : c === 0;
    if (a) {
      b.push;
      b.push([e, f]);
      c = 1;
      break b;
    }
    b.push(d[1]);
  }
  c: {
    a = c === 0;
    a = a ? d[2][0] === "" : c === 0;
    if (a) {
      b.push;
      b.push([e, f]);
      c = 1;
      break c;
    }
    b.push(d[2]);
  }
  d: {
    a = c === 0;
    a = a ? d[3][0] === "" : c === 0;
    if (a) {
      b.push;
      b.push([e, f]);
      c = 1;
      break d;
    }
    b.push(d[3]);
  }
  e: {
    a = c === 0;
    a = a ? d[4][0] === "" : c === 0;
    if (a) {
      b.push;
      b.push([e, f]);
      c = 1;
      break e;
    }
    b.push(d[4]);
  }
  f: {
    a = c === 0;
    a = a ? d[5][0] === "" : c === 0;
    if (a) {
      b.push;
      b.push([e, f]);
      c = 1;
      break f;
    }
    b.push(d[5]);
  }
  g: {
    a = c === 0;
    a = a ? d[6][0] === "" : c === 0;
    if (a) {
      b.push;
      b.push([e, f]);
      c = 1;
      break g;
    }
    b.push(d[6]);
  }
  h: {
    a = c === 0;
    a = a ? d[7][0] === "" : c === 0;
    if (a) {
      b.push;
      b.push([e, f]);
      break h;
    }
    b.push(d[7]);
  }
  return b;
}

function __rf3(d, g, i, e) {
  let a, f, c, b, h;
  a = i;
  f = 0;
  while (f < g.length) {
    c = g[f];
    b = c[0];
    if (b === "return") {
      return [true, __rf0(d, c[1], a, e), a];
    }
    a: {
      h = b === "var" ? b === "var" : b === "assign";
      if (h) {
        b = c[1];
        c = __rf0(d, c[2], a, e);
        a = __rf4(a, b, c);
        break a;
      }
      if (b === "expr") {
        __rf0(d, c[1], a, e);
        break a;
      }
      if (b === "if") {
        b = c[3];
        if (__rf0(d, c[1], a, e)) {
          b = c[2];
        }
        if (b) {
          a = __rf3(d, [b], a, e);
          if (a[0]) {
            return a;
          }
          a = a[2];
          break a;
        }
        break a;
      }
      if (b === "block") {
        a = __rf3(d, c[1], a, e);
        if (a[0]) {
          return a;
        }
        a = a[2];
        break a;
      }
      if (b === "while") {
        while (__rf0(d, c[1], a, e)) {
          a = __rf3(d, [c[2]], a, e);
          if (a[0]) {
            return a;
          }
          a = a[2];
        }
      }
    }
    f += 1;
  }
  return [false, null, a];
}

function __rf4(b, c, e) {
  let a, d;
  a: {
    a = [];
    if (b[0][0] === c) {
      a.push;
      a.push([c, e]);
      d = true;
      break a;
    }
    a.push(b[0]);
    d = false;
  }
  b: {
    if (b[1][0] === c) {
      a.push;
      a.push([c, e]);
      d = true;
      break b;
    }
    a.push(b[1]);
  }
  c: {
    if (b[2][0] === c) {
      a.push;
      a.push([c, e]);
      d = true;
      break c;
    }
    a.push(b[2]);
  }
  d: {
    if (b[3][0] === c) {
      a.push;
      a.push([c, e]);
      d = true;
      break d;
    }
    a.push(b[3]);
  }
  e: {
    if (b[4][0] === c) {
      a.push;
      a.push([c, e]);
      d = true;
      break e;
    }
    a.push(b[4]);
  }
  f: {
    if (b[5][0] === c) {
      a.push;
      a.push([c, e]);
      d = true;
      break f;
    }
    a.push(b[5]);
  }
  g: {
    if (b[6][0] === c) {
      a.push;
      a.push([c, e]);
      d = true;
      break g;
    }
    a.push(b[6]);
  }
  h: {
    if (b[7][0] === c) {
      a.push;
      a.push([c, e]);
      d = true;
      break h;
    }
    a.push(b[7]);
  }
  if (d) {
    return a;
  }
  return __rf2(b, c, e);
}

function __rf5(c, a, b) {
  let d, e;
  if (typeof a === "number" ? typeof b === "number" : typeof a === "number") {
    if (c === "+") {
      return a + b;
    }
    if (c === "-") {
      return a - b;
    }
    return a * b;
  }
  d = __rf1(a);
  e = __rf1(b);
  if (c === "+") {
    return "(" + d + " + " + e + ")";
  }
  if (c === "-") {
    return "(" + d + " - " + e + ")";
  }
  return "(" + d + " * " + e + ")";
}

function __rf6(b, c) {
  let a;
  a = 0;
  while (a < b.length) {
    if (b[a][1] === c) {
      return b[a];
    }
    a += 1;
  }
  return b[0];
}

function compile(q) {
  let g, d, e, a, b, c, f, j, n, m, k, h, i, o, p, r, l, s;
  a: {
    b: {
      c: {
        d: {
          e: {
            f: {
              g: {
                h: {
                  i: {
                    g = q.length;
                    if (g === 0) {
                      j: {
                        k: {
                          l: {
                            m: {
                              n: {
                                n = ["block", [["return", ["var", "value"]]]];
                                h = g === 0 ? n : null;
                                d = h[0];
                                if (d === "return") {
                                  o: {
                                    h = h[1];
                                    g = h[0];
                                    if (g === "lit") {
                                      g = h[1];
                                      if (g === null) {
                                        break o;
                                      }
                                      if (typeof g === "number") {
                                        return "" + g;
                                      }
                                      return g;
                                    }
                                    if (g === "var") {
                                      h = h[1];
                                      if ("program" === h) {
                                        if (q === null) {
                                          break o;
                                        }
                                        if (typeof q === "number") {
                                          return "" + q;
                                        }
                                        return q;
                                      }
                                      if ("value" === h) {
                                        return "null";
                                      }
                                      if ("io" === h) {
                                        return "x";
                                      }
                                      if ("" === h) {
                                        return "0";
                                      }
                                      return "0";
                                    }
                                    if (g === "arr") {
                                      h = h[1];
                                      i = [];
                                      o = 0;
                                      d = ["var", "program"];
                                      d = ["dot", d, "length"];
                                      e = ["lit", 0];
                                      d = ["bin", "===", d, e];
                                      d = ["if", d, n, null];
                                      e = ["var", "program"];
                                      a = ["lit", 0];
                                      e = ["idx", e, a];
                                      a = ["lit", "prompt"];
                                      e = ["bin", "===", e, a];
                                      a = ["var", "run"];
                                      b = ["var", "program"];
                                      b = ["dot", b, "slice"];
                                      c = ["lit", 1];
                                      c = [c];
                                      b = ["call", b, c];
                                      c = ["var", "io"];
                                      c = ["dot", c, "prompt"];
                                      f = [];
                                      c = ["call", c, f];
                                      f = ["var", "io"];
                                      b = [b, c, f];
                                      a = ["call", a, b];
                                      a = ["return", a];
                                      a = [a];
                                      a = ["block", a];
                                      e = ["if", e, a, null];
                                      a = ["var", "io"];
                                      a = ["dot", a, "print"];
                                      b = ["var", "value"];
                                      b = [b];
                                      a = ["call", a, b];
                                      a = ["expr", a];
                                      b = ["var", "run"];
                                      c = ["var", "program"];
                                      c = ["dot", c, "slice"];
                                      f = ["lit", 1];
                                      f = [f];
                                      c = ["call", c, f];
                                      f = ["var", "value"];
                                      j = ["var", "io"];
                                      c = [c, f, j];
                                      b = ["call", b, c];
                                      b = ["return", b];
                                      n = [d, e, a, b];
                                      m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                      k = [];
                                      g = ["program", q];
                                      d = ["value", null];
                                      e = ["io", "x"];
                                      a = ["", 0];
                                      b = ["", 0];
                                      c = ["", 0];
                                      f = ["", 0];
                                      j = ["", 0];
                                      g = [g, d, e, a, b, c, f, j];
                                      while (o < h.length) {
                                        i.push;
                                        d = __rf0(m, h[o], g, k);
                                        i.push(d);
                                        o += 1;
                                      }
                                      if (i === null) {
                                        break f;
                                      }
                                      if (typeof i === "number") {
                                        if (k.length === 0) {
                                          return "" + i;
                                        }
                                        return "(function(){\n" + k.join("") + "return " + ("" + i) + ";\n})()";
                                      }
                                      if (k.length === 0) {
                                        return i;
                                      }
                                      return "(function(){\n" + k.join("") + "return " + i + ";\n})()";
                                    }
                                    if (g === "idx") {
                                      d = ["var", "program"];
                                      d = ["dot", d, "length"];
                                      e = ["lit", 0];
                                      d = ["bin", "===", d, e];
                                      d = ["if", d, n, null];
                                      e = ["var", "program"];
                                      a = ["lit", 0];
                                      e = ["idx", e, a];
                                      a = ["lit", "prompt"];
                                      e = ["bin", "===", e, a];
                                      a = ["var", "run"];
                                      b = ["var", "program"];
                                      b = ["dot", b, "slice"];
                                      c = ["lit", 1];
                                      c = [c];
                                      b = ["call", b, c];
                                      c = ["var", "io"];
                                      c = ["dot", c, "prompt"];
                                      f = [];
                                      c = ["call", c, f];
                                      f = ["var", "io"];
                                      b = [b, c, f];
                                      a = ["call", a, b];
                                      a = ["return", a];
                                      a = [a];
                                      a = ["block", a];
                                      e = ["if", e, a, null];
                                      a = ["var", "io"];
                                      a = ["dot", a, "print"];
                                      b = ["var", "value"];
                                      b = [b];
                                      a = ["call", a, b];
                                      a = ["expr", a];
                                      b = ["var", "run"];
                                      c = ["var", "program"];
                                      c = ["dot", c, "slice"];
                                      f = ["lit", 1];
                                      f = [f];
                                      c = ["call", c, f];
                                      f = ["var", "value"];
                                      j = ["var", "io"];
                                      c = [c, f, j];
                                      b = ["call", b, c];
                                      b = ["return", b];
                                      n = [d, e, a, b];
                                      m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                      g = ["program", q];
                                      d = ["value", null];
                                      e = ["io", "x"];
                                      a = ["", 0];
                                      b = ["", 0];
                                      c = ["", 0];
                                      f = ["", 0];
                                      j = ["", 0];
                                      g = [g, d, e, a, b, c, f, j];
                                      k = [];
                                      g = __rf0(m, h[1], g, k)[__rf0(m, h[2], g, k)];
                                      if (g === null) {
                                        break f;
                                      }
                                      break e;
                                    }
                                    p: {
                                      if (g === "dot") {
                                        d = ["var", "program"];
                                        d = ["dot", d, "length"];
                                        e = ["lit", 0];
                                        d = ["bin", "===", d, e];
                                        d = ["if", d, n, null];
                                        e = ["var", "program"];
                                        a = ["lit", 0];
                                        e = ["idx", e, a];
                                        a = ["lit", "prompt"];
                                        e = ["bin", "===", e, a];
                                        a = ["var", "run"];
                                        b = ["var", "program"];
                                        b = ["dot", b, "slice"];
                                        c = ["lit", 1];
                                        c = [c];
                                        b = ["call", b, c];
                                        c = ["var", "io"];
                                        c = ["dot", c, "prompt"];
                                        f = [];
                                        c = ["call", c, f];
                                        f = ["var", "io"];
                                        b = [b, c, f];
                                        a = ["call", a, b];
                                        a = ["return", a];
                                        a = [a];
                                        a = ["block", a];
                                        e = ["if", e, a, null];
                                        a = ["var", "io"];
                                        a = ["dot", a, "print"];
                                        b = ["var", "value"];
                                        b = [b];
                                        a = ["call", a, b];
                                        a = ["expr", a];
                                        b = ["var", "run"];
                                        c = ["var", "program"];
                                        c = ["dot", c, "slice"];
                                        f = ["lit", 1];
                                        f = [f];
                                        c = ["call", c, f];
                                        f = ["var", "value"];
                                        j = ["var", "io"];
                                        c = [c, f, j];
                                        b = ["call", b, c];
                                        b = ["return", b];
                                        n = [d, e, a, b];
                                        m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                        g = ["program", q];
                                        d = ["value", null];
                                        e = ["io", "x"];
                                        a = ["", 0];
                                        b = ["", 0];
                                        c = ["", 0];
                                        f = ["", 0];
                                        j = ["", 0];
                                        g = [g, d, e, a, b, c, f, j];
                                        k = [];
                                        d = __rf0(m, h[1], g, k);
                                        if (h[2] === "length") {
                                          g = d.length;
                                          if (g === null) {
                                            break f;
                                          }
                                          break e;
                                        }
                                        if (k.length === 0) {
                                          break p;
                                        }
                                        return "(function(){\n" + k.join("") + "return 0;\n})()";
                                      }
                                      if (g === "bin") {
                                        i = h[1];
                                        g = i === "+" ? i === "+" : i === "-";
                                        o = g ? g : i === "*";
                                        d = ["var", "program"];
                                        d = ["dot", d, "length"];
                                        e = ["lit", 0];
                                        d = ["bin", "===", d, e];
                                        d = ["if", d, n, null];
                                        e = ["var", "program"];
                                        a = ["lit", 0];
                                        e = ["idx", e, a];
                                        a = ["lit", "prompt"];
                                        e = ["bin", "===", e, a];
                                        a = ["var", "run"];
                                        b = ["var", "program"];
                                        b = ["dot", b, "slice"];
                                        c = ["lit", 1];
                                        c = [c];
                                        b = ["call", b, c];
                                        c = ["var", "io"];
                                        c = ["dot", c, "prompt"];
                                        f = [];
                                        c = ["call", c, f];
                                        f = ["var", "io"];
                                        b = [b, c, f];
                                        a = ["call", a, b];
                                        a = ["return", a];
                                        a = [a];
                                        a = ["block", a];
                                        e = ["if", e, a, null];
                                        a = ["var", "io"];
                                        a = ["dot", a, "print"];
                                        b = ["var", "value"];
                                        b = [b];
                                        a = ["call", a, b];
                                        a = ["expr", a];
                                        b = ["var", "run"];
                                        c = ["var", "program"];
                                        c = ["dot", c, "slice"];
                                        f = ["lit", 1];
                                        f = [f];
                                        c = ["call", c, f];
                                        f = ["var", "value"];
                                        j = ["var", "io"];
                                        c = [c, f, j];
                                        b = ["call", b, c];
                                        b = ["return", b];
                                        n = [d, e, a, b];
                                        m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                        g = ["program", q];
                                        d = ["value", null];
                                        e = ["io", "x"];
                                        a = ["", 0];
                                        b = ["", 0];
                                        c = ["", 0];
                                        f = ["", 0];
                                        j = ["", 0];
                                        g = [g, d, e, a, b, c, f, j];
                                        k = [];
                                        if (o) {
                                          d = __rf5(i, __rf0(m, h[2], g, k), __rf0(m, h[3], g, k));
                                          if (d === null) {
                                            break f;
                                          }
                                          if (typeof d === "number") {
                                            if (k.length === 0) {
                                              return "" + d;
                                            }
                                            return "(function(){\n" + k.join("") + "return " + ("" + d) + ";\n})()";
                                          }
                                          if (k.length === 0) {
                                            return d;
                                          }
                                          return "(function(){\n" + k.join("") + "return " + d + ";\n})()";
                                        }
                                        d = __rf0(m, h[2], g, k);
                                        e = __rf0(m, h[3], g, k);
                                        if (i === "===" ? i === "===" : i === "==") {
                                          if (k.length === 0) {
                                            return d === e;
                                          }
                                          return "(function(){\n" + k.join("") + "return " + (d === e) + ";\n})()";
                                        }
                                        if (i === "!==" ? i === "!==" : i === "!=") {
                                          if (k.length === 0) {
                                            return d !== e;
                                          }
                                          return "(function(){\n" + k.join("") + "return " + (d !== e) + ";\n})()";
                                        }
                                        q: {
                                          r: {
                                            if (i === "<") {
                                              g = d < e;
                                              if (k.length === 0) {
                                                break r;
                                              }
                                              break q;
                                            }
                                            if (i === ">") {
                                              g = d > e;
                                              if (k.length === 0) {
                                                break r;
                                              }
                                              break q;
                                            }
                                            if (i === "<=") {
                                              g = d <= e;
                                              if (k.length === 0) {
                                                break r;
                                              }
                                              break q;
                                            }
                                            g = d >= e;
                                            if (k.length === 0) {
                                              break r;
                                            }
                                            break q;
                                          }
                                          return g;
                                        }
                                        return "(function(){\n" + k.join("") + "return " + g + ";\n})()";
                                      }
                                      if (g === "cond") {
                                        d = ["var", "program"];
                                        d = ["dot", d, "length"];
                                        e = ["lit", 0];
                                        d = ["bin", "===", d, e];
                                        d = ["if", d, n, null];
                                        e = ["var", "program"];
                                        a = ["lit", 0];
                                        e = ["idx", e, a];
                                        a = ["lit", "prompt"];
                                        e = ["bin", "===", e, a];
                                        a = ["var", "run"];
                                        b = ["var", "program"];
                                        b = ["dot", b, "slice"];
                                        c = ["lit", 1];
                                        c = [c];
                                        b = ["call", b, c];
                                        c = ["var", "io"];
                                        c = ["dot", c, "prompt"];
                                        f = [];
                                        c = ["call", c, f];
                                        f = ["var", "io"];
                                        b = [b, c, f];
                                        a = ["call", a, b];
                                        a = ["return", a];
                                        a = [a];
                                        a = ["block", a];
                                        e = ["if", e, a, null];
                                        a = ["var", "io"];
                                        a = ["dot", a, "print"];
                                        b = ["var", "value"];
                                        b = [b];
                                        a = ["call", a, b];
                                        a = ["expr", a];
                                        b = ["var", "run"];
                                        c = ["var", "program"];
                                        c = ["dot", c, "slice"];
                                        f = ["lit", 1];
                                        f = [f];
                                        c = ["call", c, f];
                                        f = ["var", "value"];
                                        j = ["var", "io"];
                                        c = [c, f, j];
                                        b = ["call", b, c];
                                        b = ["return", b];
                                        n = [d, e, a, b];
                                        m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                        g = ["program", q];
                                        d = ["value", null];
                                        e = ["io", "x"];
                                        a = ["", 0];
                                        b = ["", 0];
                                        c = ["", 0];
                                        f = ["", 0];
                                        j = ["", 0];
                                        g = [g, d, e, a, b, c, f, j];
                                        k = [];
                                        if (__rf0(m, h[1], g, k)) {
                                          d = __rf0(m, h[2], g, k);
                                          if (d === null) {
                                            break f;
                                          }
                                          if (typeof d === "number") {
                                            if (k.length === 0) {
                                              return "" + d;
                                            }
                                            return "(function(){\n" + k.join("") + "return " + ("" + d) + ";\n})()";
                                          }
                                          if (k.length === 0) {
                                            return d;
                                          }
                                          return "(function(){\n" + k.join("") + "return " + d + ";\n})()";
                                        }
                                        d = __rf0(m, h[3], g, k);
                                        if (d === null) {
                                          break f;
                                        }
                                        if (typeof d === "number") {
                                          if (k.length === 0) {
                                            return "" + d;
                                          }
                                          return "(function(){\n" + k.join("") + "return " + ("" + d) + ";\n})()";
                                        }
                                        if (k.length === 0) {
                                          return d;
                                        }
                                        return "(function(){\n" + k.join("") + "return " + d + ";\n})()";
                                      }
                                      k = [];
                                      if (g === "call") {
                                        i = h[1];
                                        h = h[2];
                                        g = i[0] === "dot";
                                        g = g ? i[2] === "reduce" : g;
                                        if (g) {
                                          d = ["var", "program"];
                                          d = ["dot", d, "length"];
                                          e = ["lit", 0];
                                          d = ["bin", "===", d, e];
                                          d = ["if", d, n, null];
                                          e = ["var", "program"];
                                          a = ["lit", 0];
                                          e = ["idx", e, a];
                                          a = ["lit", "prompt"];
                                          e = ["bin", "===", e, a];
                                          a = ["var", "run"];
                                          b = ["var", "program"];
                                          b = ["dot", b, "slice"];
                                          c = ["lit", 1];
                                          c = [c];
                                          b = ["call", b, c];
                                          c = ["var", "io"];
                                          c = ["dot", c, "prompt"];
                                          f = [];
                                          c = ["call", c, f];
                                          f = ["var", "io"];
                                          b = [b, c, f];
                                          a = ["call", a, b];
                                          a = ["return", a];
                                          a = [a];
                                          a = ["block", a];
                                          e = ["if", e, a, null];
                                          a = ["var", "io"];
                                          a = ["dot", a, "print"];
                                          b = ["var", "value"];
                                          b = [b];
                                          a = ["call", a, b];
                                          a = ["expr", a];
                                          b = ["var", "run"];
                                          c = ["var", "program"];
                                          c = ["dot", c, "slice"];
                                          f = ["lit", 1];
                                          f = [f];
                                          c = ["call", c, f];
                                          f = ["var", "value"];
                                          j = ["var", "io"];
                                          c = [c, f, j];
                                          b = ["call", b, c];
                                          b = ["return", b];
                                          n = [d, e, a, b];
                                          m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                          g = ["program", q];
                                          d = ["value", null];
                                          e = ["io", "x"];
                                          a = ["", 0];
                                          b = ["", 0];
                                          c = ["", 0];
                                          f = ["", 0];
                                          j = ["", 0];
                                          g = [g, d, e, a, b, c, f, j];
                                          d = __rf0(m, i[1], g, k);
                                          e = h[0];
                                          a = __rf1(__rf0(m, h[1], g, k));
                                          b = e[1][0];
                                          c = e[1][1];
                                          while (d.length > 0) {
                                            a = __rf3(m, e[2], __rf2(__rf2(g, b, a), c, d[0]), k)[1];
                                            d = d.slice(1);
                                          }
                                          if (a === null) {
                                            break k;
                                          }
                                          if (typeof a === "number") {
                                            if (k.length === 0) {
                                              return "" + a;
                                            }
                                            return "(function(){\n" + k.join("") + "return " + ("" + a) + ";\n})()";
                                          }
                                          if (k.length === 0) {
                                            return a;
                                          }
                                          return "(function(){\n" + k.join("") + "return " + a + ";\n})()";
                                        }
                                        g = i[0] === "dot";
                                        g = g ? i[2] === "slice" : g;
                                        if (g) {
                                          d = ["var", "program"];
                                          d = ["dot", d, "length"];
                                          e = ["lit", 0];
                                          d = ["bin", "===", d, e];
                                          d = ["if", d, n, null];
                                          e = ["var", "program"];
                                          a = ["lit", 0];
                                          e = ["idx", e, a];
                                          a = ["lit", "prompt"];
                                          e = ["bin", "===", e, a];
                                          a = ["var", "run"];
                                          b = ["var", "program"];
                                          b = ["dot", b, "slice"];
                                          c = ["lit", 1];
                                          c = [c];
                                          b = ["call", b, c];
                                          c = ["var", "io"];
                                          c = ["dot", c, "prompt"];
                                          f = [];
                                          c = ["call", c, f];
                                          f = ["var", "io"];
                                          b = [b, c, f];
                                          a = ["call", a, b];
                                          a = ["return", a];
                                          a = [a];
                                          a = ["block", a];
                                          e = ["if", e, a, null];
                                          a = ["var", "io"];
                                          a = ["dot", a, "print"];
                                          b = ["var", "value"];
                                          b = [b];
                                          a = ["call", a, b];
                                          a = ["expr", a];
                                          b = ["var", "run"];
                                          c = ["var", "program"];
                                          c = ["dot", c, "slice"];
                                          f = ["lit", 1];
                                          f = [f];
                                          c = ["call", c, f];
                                          f = ["var", "value"];
                                          j = ["var", "io"];
                                          c = [c, f, j];
                                          b = ["call", b, c];
                                          b = ["return", b];
                                          n = [d, e, a, b];
                                          m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                          g = ["program", q];
                                          d = ["value", null];
                                          e = ["io", "x"];
                                          a = ["", 0];
                                          b = ["", 0];
                                          c = ["", 0];
                                          f = ["", 0];
                                          j = ["", 0];
                                          g = [g, d, e, a, b, c, f, j];
                                          d = __rf0(m, i[1], g, k);
                                          e = d.slice;
                                          a = __rf0(m, h[0], g, k);
                                          d = e.call(d, a);
                                          if (d === null) {
                                            break k;
                                          }
                                          if (typeof d === "number") {
                                            if (k.length === 0) {
                                              return "" + d;
                                            }
                                            return "(function(){\n" + k.join("") + "return " + ("" + d) + ";\n})()";
                                          }
                                          if (k.length === 0) {
                                            return d;
                                          }
                                          return "(function(){\n" + k.join("") + "return " + d + ";\n})()";
                                        }
                                        o = k;
                                        if (i[0] === "dot") {
                                          d = ["var", "program"];
                                          d = ["dot", d, "length"];
                                          e = ["lit", 0];
                                          d = ["bin", "===", d, e];
                                          d = ["if", d, n, null];
                                          e = ["var", "program"];
                                          a = ["lit", 0];
                                          e = ["idx", e, a];
                                          a = ["lit", "prompt"];
                                          e = ["bin", "===", e, a];
                                          a = ["var", "run"];
                                          b = ["var", "program"];
                                          b = ["dot", b, "slice"];
                                          c = ["lit", 1];
                                          c = [c];
                                          b = ["call", b, c];
                                          c = ["var", "io"];
                                          c = ["dot", c, "prompt"];
                                          f = [];
                                          c = ["call", c, f];
                                          f = ["var", "io"];
                                          b = [b, c, f];
                                          a = ["call", a, b];
                                          a = ["return", a];
                                          a = [a];
                                          a = ["block", a];
                                          e = ["if", e, a, null];
                                          a = ["var", "io"];
                                          a = ["dot", a, "print"];
                                          b = ["var", "value"];
                                          b = [b];
                                          a = ["call", a, b];
                                          a = ["expr", a];
                                          b = ["var", "run"];
                                          c = ["var", "program"];
                                          c = ["dot", c, "slice"];
                                          f = ["lit", 1];
                                          f = [f];
                                          c = ["call", c, f];
                                          f = ["var", "value"];
                                          j = ["var", "io"];
                                          c = [c, f, j];
                                          b = ["call", b, c];
                                          b = ["return", b];
                                          n = [d, e, a, b];
                                          m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                          g = ["program", q];
                                          d = ["value", null];
                                          e = ["io", "x"];
                                          a = ["", 0];
                                          b = ["", 0];
                                          c = ["", 0];
                                          f = ["", 0];
                                          j = ["", 0];
                                          g = [g, d, e, a, b, c, f, j];
                                          d = __rf1(__rf0(m, i[1], g, k)) + "." + i[2] + "(";
                                          e = 0;
                                          while (e < h.length) {
                                            if (e > 0) {
                                              d += ", ";
                                            }
                                            d += __rf1(__rf0(m, h[e], g, k));
                                            e += 1;
                                          }
                                          e = "v" + k.length;
                                          k.push("var " + e + " = " + d + ");\n");
                                          if (o.length === 0) {
                                            return e;
                                          }
                                          return "(function(){\n" + o.join("") + "return " + e + ";\n})()";
                                        }
                                        p = [];
                                        r = 0;
                                        d = ["var", "program"];
                                        d = ["dot", d, "length"];
                                        e = ["lit", 0];
                                        d = ["bin", "===", d, e];
                                        d = ["if", d, n, null];
                                        e = ["var", "program"];
                                        a = ["lit", 0];
                                        e = ["idx", e, a];
                                        a = ["lit", "prompt"];
                                        e = ["bin", "===", e, a];
                                        a = ["var", "run"];
                                        b = ["var", "program"];
                                        b = ["dot", b, "slice"];
                                        c = ["lit", 1];
                                        c = [c];
                                        b = ["call", b, c];
                                        c = ["var", "io"];
                                        c = ["dot", c, "prompt"];
                                        f = [];
                                        c = ["call", c, f];
                                        f = ["var", "io"];
                                        b = [b, c, f];
                                        a = ["call", a, b];
                                        a = ["return", a];
                                        a = [a];
                                        a = ["block", a];
                                        e = ["if", e, a, null];
                                        a = ["var", "io"];
                                        a = ["dot", a, "print"];
                                        b = ["var", "value"];
                                        b = [b];
                                        a = ["call", a, b];
                                        a = ["expr", a];
                                        b = ["var", "run"];
                                        c = ["var", "program"];
                                        c = ["dot", c, "slice"];
                                        f = ["lit", 1];
                                        f = [f];
                                        c = ["call", c, f];
                                        f = ["var", "value"];
                                        j = ["var", "io"];
                                        c = [c, f, j];
                                        b = ["call", b, c];
                                        b = ["return", b];
                                        n = [d, e, a, b];
                                        m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                        g = ["program", q];
                                        d = ["value", null];
                                        e = ["io", "x"];
                                        a = ["", 0];
                                        b = ["", 0];
                                        c = ["", 0];
                                        f = ["", 0];
                                        j = ["", 0];
                                        g = [g, d, e, a, b, c, f, j];
                                        while (r < h.length) {
                                          p.push;
                                          d = __rf0(m, h[r], g, k);
                                          p.push(d);
                                          r += 1;
                                        }
                                        d = __rf6(m, i[1]);
                                        e = [["", 0], ["", 0], ["", 0], ["", 0], ["", 0], ["", 0], ["", 0], ["", 0]];
                                        a = 0;
                                        while (a < (d[2]).length) {
                                          e = __rf2(e, d[2][a], p[a]);
                                          a += 1;
                                        }
                                        g = __rf3(m, d[3], e, k)[1];
                                        if (g === null) {
                                          break n;
                                        }
                                        break m;
                                      }
                                      if (k.length === 0) {
                                        break p;
                                      }
                                      return "(function(){\n" + k.join("") + "return 0;\n})()";
                                    }
                                    return "0";
                                  }
                                  return "null";
                                }
                                s: {
                                  t: {
                                    if (d === "var" ? d === "var" : d === "assign") {
                                      u: {
                                        v: {
                                          w: {
                                            l = h[1];
                                            h = h[2];
                                            g = h[0];
                                            if (g === "lit") {
                                              x: {
                                                m = h[1];
                                                e = "program" === l ? true : false;
                                                d = [[l, m]];
                                                g = ["program", q];
                                                h = "program" === l ? d : [g];
                                                if ("value" === l) {
                                                  h.push;
                                                  h.push([l, m]);
                                                  i = true;
                                                  d = ["value", null];
                                                  break x;
                                                }
                                                d = ["value", null];
                                                h.push(d);
                                                i = e;
                                              }
                                              y: {
                                                if ("io" === l) {
                                                  h.push;
                                                  h.push([l, m]);
                                                  i = true;
                                                  e = ["io", "x"];
                                                  break y;
                                                }
                                                e = ["io", "x"];
                                                h.push(e);
                                              }
                                              z: {
                                                if ("" === l) {
                                                  h.push;
                                                  h.push([l, m]);
                                                  i = true;
                                                  a = ["", 0];
                                                  break z;
                                                }
                                                a = ["", 0];
                                                h.push(a);
                                              }
                                              A: {
                                                if ("" === l) {
                                                  h.push;
                                                  h.push([l, m]);
                                                  i = true;
                                                  b = ["", 0];
                                                  break A;
                                                }
                                                b = ["", 0];
                                                h.push(b);
                                              }
                                              B: {
                                                if ("" === l) {
                                                  h.push;
                                                  h.push([l, m]);
                                                  i = true;
                                                  c = ["", 0];
                                                  break B;
                                                }
                                                c = ["", 0];
                                                h.push(c);
                                              }
                                              C: {
                                                if ("" === l) {
                                                  h.push;
                                                  h.push([l, m]);
                                                  i = true;
                                                  f = ["", 0];
                                                  break C;
                                                }
                                                f = ["", 0];
                                                h.push(f);
                                              }
                                              D: {
                                                if ("" === l) {
                                                  h.push;
                                                  h.push([l, m]);
                                                  i = true;
                                                  j = ["", 0];
                                                  break D;
                                                }
                                                j = ["", 0];
                                                h.push(j);
                                              }
                                              if (i) {
                                                break w;
                                              }
                                              E: {
                                                F: {
                                                  p = g[0] === "";
                                                  h = !p;
                                                  if (h) {
                                                    i = p ? 1 : 0;
                                                    h = p;
                                                    p = d[0] === "";
                                                    h = h ? [[l, m]] : [g];
                                                    if (p) {
                                                      break F;
                                                    }
                                                    h.push(d);
                                                    o = i;
                                                    break E;
                                                  }
                                                  i = p ? 1 : 0;
                                                  o = p;
                                                  p = h;
                                                  h = o ? [[l, m]] : [g];
                                                  if (p) {
                                                    break F;
                                                  }
                                                  h.push(d);
                                                  o = i;
                                                  break E;
                                                }
                                                h.push;
                                                h.push([l, m]);
                                                o = 1;
                                              }
                                              i = 2;
                                              g = [g, d, e, a, b, c, f, j];
                                              while (i < 8) {
                                                G: {
                                                  d = o === 0;
                                                  p = d ? g[i][0] === "" : void 0;
                                                  if (d ? p : o === 0) {
                                                    h.push;
                                                    h.push([l, m]);
                                                    o = 1;
                                                    break G;
                                                  }
                                                  h.push(g[i]);
                                                }
                                                i += 1;
                                              }
                                              break v;
                                            }
                                            H: {
                                              if (g === "var") {
                                                h = h[1];
                                                if ("program" === h) {
                                                  I: {
                                                    e = "program" === l ? true : false;
                                                    d = [[l, q]];
                                                    g = ["program", q];
                                                    h = "program" === l ? d : [g];
                                                    if ("value" === l) {
                                                      h.push;
                                                      h.push([l, q]);
                                                      i = true;
                                                      d = ["value", null];
                                                      break I;
                                                    }
                                                    d = ["value", null];
                                                    h.push(d);
                                                    i = e;
                                                  }
                                                  J: {
                                                    if ("io" === l) {
                                                      h.push;
                                                      h.push([l, q]);
                                                      i = true;
                                                      e = ["io", "x"];
                                                      break J;
                                                    }
                                                    e = ["io", "x"];
                                                    h.push(e);
                                                  }
                                                  K: {
                                                    if ("" === l) {
                                                      h.push;
                                                      h.push([l, q]);
                                                      i = true;
                                                      a = ["", 0];
                                                      break K;
                                                    }
                                                    a = ["", 0];
                                                    h.push(a);
                                                  }
                                                  L: {
                                                    if ("" === l) {
                                                      h.push;
                                                      h.push([l, q]);
                                                      i = true;
                                                      b = ["", 0];
                                                      break L;
                                                    }
                                                    b = ["", 0];
                                                    h.push(b);
                                                  }
                                                  M: {
                                                    if ("" === l) {
                                                      h.push;
                                                      h.push([l, q]);
                                                      i = true;
                                                      c = ["", 0];
                                                      break M;
                                                    }
                                                    c = ["", 0];
                                                    h.push(c);
                                                  }
                                                  N: {
                                                    if ("" === l) {
                                                      h.push;
                                                      h.push([l, q]);
                                                      i = true;
                                                      f = ["", 0];
                                                      break N;
                                                    }
                                                    f = ["", 0];
                                                    h.push(f);
                                                  }
                                                  O: {
                                                    if ("" === l) {
                                                      h.push;
                                                      h.push([l, q]);
                                                      i = true;
                                                      j = ["", 0];
                                                      break O;
                                                    }
                                                    j = ["", 0];
                                                    h.push(j);
                                                  }
                                                  if (i) {
                                                    break w;
                                                  }
                                                  P: {
                                                    Q: {
                                                      p = g[0] === "";
                                                      h = !p;
                                                      if (h) {
                                                        i = p ? 1 : 0;
                                                        h = p;
                                                        p = d[0] === "";
                                                        h = h ? [[l, q]] : [g];
                                                        if (p) {
                                                          break Q;
                                                        }
                                                        h.push(d);
                                                        o = i;
                                                        break P;
                                                      }
                                                      i = p ? 1 : 0;
                                                      o = p;
                                                      p = h;
                                                      h = o ? [[l, q]] : [g];
                                                      if (p) {
                                                        break Q;
                                                      }
                                                      h.push(d);
                                                      o = i;
                                                      break P;
                                                    }
                                                    h.push;
                                                    h.push([l, q]);
                                                    o = 1;
                                                  }
                                                  i = 2;
                                                  g = [g, d, e, a, b, c, f, j];
                                                  while (i < 8) {
                                                    R: {
                                                      d = o === 0;
                                                      p = d ? g[i][0] === "" : void 0;
                                                      if (d ? p : o === 0) {
                                                        h.push;
                                                        h.push([l, q]);
                                                        o = 1;
                                                        break R;
                                                      }
                                                      h.push(g[i]);
                                                    }
                                                    i += 1;
                                                  }
                                                  break v;
                                                }
                                                if ("value" === h) {
                                                  S: {
                                                    e = "program" === l ? true : false;
                                                    d = [[l, null]];
                                                    g = ["program", q];
                                                    h = "program" === l ? d : [g];
                                                    if ("value" === l) {
                                                      h.push;
                                                      h.push([l, null]);
                                                      i = true;
                                                      d = ["value", null];
                                                      break S;
                                                    }
                                                    d = ["value", null];
                                                    h.push(d);
                                                    i = e;
                                                  }
                                                  T: {
                                                    if ("io" === l) {
                                                      h.push;
                                                      h.push([l, null]);
                                                      i = true;
                                                      e = ["io", "x"];
                                                      break T;
                                                    }
                                                    e = ["io", "x"];
                                                    h.push(e);
                                                  }
                                                  U: {
                                                    if ("" === l) {
                                                      h.push;
                                                      h.push([l, null]);
                                                      i = true;
                                                      a = ["", 0];
                                                      break U;
                                                    }
                                                    a = ["", 0];
                                                    h.push(a);
                                                  }
                                                  V: {
                                                    if ("" === l) {
                                                      h.push;
                                                      h.push([l, null]);
                                                      i = true;
                                                      b = ["", 0];
                                                      break V;
                                                    }
                                                    b = ["", 0];
                                                    h.push(b);
                                                  }
                                                  W: {
                                                    if ("" === l) {
                                                      h.push;
                                                      h.push([l, null]);
                                                      i = true;
                                                      c = ["", 0];
                                                      break W;
                                                    }
                                                    c = ["", 0];
                                                    h.push(c);
                                                  }
                                                  X: {
                                                    if ("" === l) {
                                                      h.push;
                                                      h.push([l, null]);
                                                      i = true;
                                                      f = ["", 0];
                                                      break X;
                                                    }
                                                    f = ["", 0];
                                                    h.push(f);
                                                  }
                                                  Y: {
                                                    if ("" === l) {
                                                      h.push;
                                                      h.push([l, null]);
                                                      i = true;
                                                      j = ["", 0];
                                                      break Y;
                                                    }
                                                    j = ["", 0];
                                                    h.push(j);
                                                  }
                                                  if (i) {
                                                    break w;
                                                  }
                                                  Z: {
                                                    aa: {
                                                      p = g[0] === "";
                                                      h = !p;
                                                      if (h) {
                                                        i = p ? 1 : 0;
                                                        h = p;
                                                        p = d[0] === "";
                                                        h = h ? [[l, null]] : [g];
                                                        if (p) {
                                                          break aa;
                                                        }
                                                        h.push(d);
                                                        o = i;
                                                        break Z;
                                                      }
                                                      i = p ? 1 : 0;
                                                      o = p;
                                                      p = h;
                                                      h = o ? [[l, null]] : [g];
                                                      if (p) {
                                                        break aa;
                                                      }
                                                      h.push(d);
                                                      o = i;
                                                      break Z;
                                                    }
                                                    h.push;
                                                    h.push([l, null]);
                                                    o = 1;
                                                  }
                                                  i = 2;
                                                  g = [g, d, e, a, b, c, f, j];
                                                  while (i < 8) {
                                                    ab: {
                                                      d = o === 0;
                                                      p = d ? g[i][0] === "" : void 0;
                                                      if (d ? p : o === 0) {
                                                        h.push;
                                                        h.push([l, null]);
                                                        o = 1;
                                                        break ab;
                                                      }
                                                      h.push(g[i]);
                                                    }
                                                    i += 1;
                                                  }
                                                  break v;
                                                }
                                                if ("io" === h) {
                                                  ac: {
                                                    e = "program" === l ? true : false;
                                                    d = [[l, "x"]];
                                                    g = ["program", q];
                                                    h = "program" === l ? d : [g];
                                                    if ("value" === l) {
                                                      h.push;
                                                      h.push([l, "x"]);
                                                      i = true;
                                                      d = ["value", null];
                                                      break ac;
                                                    }
                                                    d = ["value", null];
                                                    h.push(d);
                                                    i = e;
                                                  }
                                                  ad: {
                                                    if ("io" === l) {
                                                      h.push;
                                                      h.push([l, "x"]);
                                                      i = true;
                                                      e = ["io", "x"];
                                                      break ad;
                                                    }
                                                    e = ["io", "x"];
                                                    h.push(e);
                                                  }
                                                  ae: {
                                                    if ("" === l) {
                                                      h.push;
                                                      h.push([l, "x"]);
                                                      i = true;
                                                      a = ["", 0];
                                                      break ae;
                                                    }
                                                    a = ["", 0];
                                                    h.push(a);
                                                  }
                                                  af: {
                                                    if ("" === l) {
                                                      h.push;
                                                      h.push([l, "x"]);
                                                      i = true;
                                                      b = ["", 0];
                                                      break af;
                                                    }
                                                    b = ["", 0];
                                                    h.push(b);
                                                  }
                                                  ag: {
                                                    if ("" === l) {
                                                      h.push;
                                                      h.push([l, "x"]);
                                                      i = true;
                                                      c = ["", 0];
                                                      break ag;
                                                    }
                                                    c = ["", 0];
                                                    h.push(c);
                                                  }
                                                  ah: {
                                                    if ("" === l) {
                                                      h.push;
                                                      h.push([l, "x"]);
                                                      i = true;
                                                      f = ["", 0];
                                                      break ah;
                                                    }
                                                    f = ["", 0];
                                                    h.push(f);
                                                  }
                                                  ai: {
                                                    if ("" === l) {
                                                      h.push;
                                                      h.push([l, "x"]);
                                                      i = true;
                                                      j = ["", 0];
                                                      break ai;
                                                    }
                                                    j = ["", 0];
                                                    h.push(j);
                                                  }
                                                  if (i) {
                                                    break w;
                                                  }
                                                  aj: {
                                                    ak: {
                                                      p = g[0] === "";
                                                      h = !p;
                                                      if (h) {
                                                        i = p ? 1 : 0;
                                                        h = p;
                                                        p = d[0] === "";
                                                        h = h ? [[l, "x"]] : [g];
                                                        if (p) {
                                                          break ak;
                                                        }
                                                        h.push(d);
                                                        o = i;
                                                        break aj;
                                                      }
                                                      i = p ? 1 : 0;
                                                      o = p;
                                                      p = h;
                                                      h = o ? [[l, "x"]] : [g];
                                                      if (p) {
                                                        break ak;
                                                      }
                                                      h.push(d);
                                                      o = i;
                                                      break aj;
                                                    }
                                                    h.push;
                                                    h.push([l, "x"]);
                                                    o = 1;
                                                  }
                                                  i = 2;
                                                  g = [g, d, e, a, b, c, f, j];
                                                  while (i < 8) {
                                                    al: {
                                                      d = o === 0;
                                                      p = d ? g[i][0] === "" : void 0;
                                                      if (d ? p : o === 0) {
                                                        h.push;
                                                        h.push([l, "x"]);
                                                        o = 1;
                                                        break al;
                                                      }
                                                      h.push(g[i]);
                                                    }
                                                    i += 1;
                                                  }
                                                  break v;
                                                }
                                                d = ["var", "program"];
                                                d = ["dot", d, "length"];
                                                e = ["lit", 0];
                                                d = ["bin", "===", d, e];
                                                d = ["if", d, n, null];
                                                e = ["var", "program"];
                                                a = ["lit", 0];
                                                e = ["idx", e, a];
                                                a = ["lit", "prompt"];
                                                e = ["bin", "===", e, a];
                                                a = ["var", "run"];
                                                b = ["var", "program"];
                                                b = ["dot", b, "slice"];
                                                c = ["lit", 1];
                                                c = [c];
                                                b = ["call", b, c];
                                                c = ["var", "io"];
                                                c = ["dot", c, "prompt"];
                                                f = [];
                                                c = ["call", c, f];
                                                f = ["var", "io"];
                                                b = [b, c, f];
                                                a = ["call", a, b];
                                                a = ["return", a];
                                                a = [a];
                                                a = ["block", a];
                                                e = ["if", e, a, null];
                                                a = ["var", "io"];
                                                a = ["dot", a, "print"];
                                                b = ["var", "value"];
                                                b = [b];
                                                a = ["call", a, b];
                                                a = ["expr", a];
                                                b = ["var", "run"];
                                                c = ["var", "program"];
                                                c = ["dot", c, "slice"];
                                                f = ["lit", 1];
                                                f = [f];
                                                c = ["call", c, f];
                                                f = ["var", "value"];
                                                j = ["var", "io"];
                                                c = [c, f, j];
                                                b = ["call", b, c];
                                                b = ["return", b];
                                                n = [d, e, a, b];
                                                m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                                k = [];
                                                g = ["program", q];
                                                d = ["value", null];
                                                e = ["io", "x"];
                                                a = ["", 0];
                                                b = ["", 0];
                                                c = ["", 0];
                                                f = ["", 0];
                                                j = ["", 0];
                                                g = [g, d, e, a, b, c, f, j];
                                                break H;
                                              }
                                              if (g === "arr") {
                                                h = h[1];
                                                i = [];
                                                o = 0;
                                                d = ["var", "program"];
                                                d = ["dot", d, "length"];
                                                e = ["lit", 0];
                                                d = ["bin", "===", d, e];
                                                d = ["if", d, n, null];
                                                e = ["var", "program"];
                                                a = ["lit", 0];
                                                e = ["idx", e, a];
                                                a = ["lit", "prompt"];
                                                e = ["bin", "===", e, a];
                                                a = ["var", "run"];
                                                b = ["var", "program"];
                                                b = ["dot", b, "slice"];
                                                c = ["lit", 1];
                                                c = [c];
                                                b = ["call", b, c];
                                                c = ["var", "io"];
                                                c = ["dot", c, "prompt"];
                                                f = [];
                                                c = ["call", c, f];
                                                f = ["var", "io"];
                                                b = [b, c, f];
                                                a = ["call", a, b];
                                                a = ["return", a];
                                                a = [a];
                                                a = ["block", a];
                                                e = ["if", e, a, null];
                                                a = ["var", "io"];
                                                a = ["dot", a, "print"];
                                                b = ["var", "value"];
                                                b = [b];
                                                a = ["call", a, b];
                                                a = ["expr", a];
                                                b = ["var", "run"];
                                                c = ["var", "program"];
                                                c = ["dot", c, "slice"];
                                                f = ["lit", 1];
                                                f = [f];
                                                c = ["call", c, f];
                                                f = ["var", "value"];
                                                j = ["var", "io"];
                                                c = [c, f, j];
                                                b = ["call", b, c];
                                                b = ["return", b];
                                                n = [d, e, a, b];
                                                m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                                k = [];
                                                g = ["program", q];
                                                d = ["value", null];
                                                e = ["io", "x"];
                                                a = ["", 0];
                                                b = ["", 0];
                                                c = ["", 0];
                                                f = ["", 0];
                                                j = ["", 0];
                                                g = [g, d, e, a, b, c, f, j];
                                                while (o < h.length) {
                                                  i.push;
                                                  d = __rf0(m, h[o], g, k);
                                                  i.push(d);
                                                  o += 1;
                                                }
                                                g = __rf4(g, l, i);
                                                break i;
                                              }
                                              if (g === "idx") {
                                                d = ["var", "program"];
                                                d = ["dot", d, "length"];
                                                e = ["lit", 0];
                                                d = ["bin", "===", d, e];
                                                d = ["if", d, n, null];
                                                e = ["var", "program"];
                                                a = ["lit", 0];
                                                e = ["idx", e, a];
                                                a = ["lit", "prompt"];
                                                e = ["bin", "===", e, a];
                                                a = ["var", "run"];
                                                b = ["var", "program"];
                                                b = ["dot", b, "slice"];
                                                c = ["lit", 1];
                                                c = [c];
                                                b = ["call", b, c];
                                                c = ["var", "io"];
                                                c = ["dot", c, "prompt"];
                                                f = [];
                                                c = ["call", c, f];
                                                f = ["var", "io"];
                                                b = [b, c, f];
                                                a = ["call", a, b];
                                                a = ["return", a];
                                                a = [a];
                                                a = ["block", a];
                                                e = ["if", e, a, null];
                                                a = ["var", "io"];
                                                a = ["dot", a, "print"];
                                                b = ["var", "value"];
                                                b = [b];
                                                a = ["call", a, b];
                                                a = ["expr", a];
                                                b = ["var", "run"];
                                                c = ["var", "program"];
                                                c = ["dot", c, "slice"];
                                                f = ["lit", 1];
                                                f = [f];
                                                c = ["call", c, f];
                                                f = ["var", "value"];
                                                j = ["var", "io"];
                                                c = [c, f, j];
                                                b = ["call", b, c];
                                                b = ["return", b];
                                                n = [d, e, a, b];
                                                m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                                g = ["program", q];
                                                d = ["value", null];
                                                e = ["io", "x"];
                                                a = ["", 0];
                                                b = ["", 0];
                                                c = ["", 0];
                                                f = ["", 0];
                                                j = ["", 0];
                                                g = [g, d, e, a, b, c, f, j];
                                                k = [];
                                                g = __rf4(g, l, __rf0(m, h[1], g, k)[__rf0(m, h[2], g, k)]);
                                                break i;
                                              }
                                              if (g === "dot") {
                                                d = ["var", "program"];
                                                d = ["dot", d, "length"];
                                                e = ["lit", 0];
                                                d = ["bin", "===", d, e];
                                                d = ["if", d, n, null];
                                                e = ["var", "program"];
                                                a = ["lit", 0];
                                                e = ["idx", e, a];
                                                a = ["lit", "prompt"];
                                                e = ["bin", "===", e, a];
                                                a = ["var", "run"];
                                                b = ["var", "program"];
                                                b = ["dot", b, "slice"];
                                                c = ["lit", 1];
                                                c = [c];
                                                b = ["call", b, c];
                                                c = ["var", "io"];
                                                c = ["dot", c, "prompt"];
                                                f = [];
                                                c = ["call", c, f];
                                                f = ["var", "io"];
                                                b = [b, c, f];
                                                a = ["call", a, b];
                                                a = ["return", a];
                                                a = [a];
                                                a = ["block", a];
                                                e = ["if", e, a, null];
                                                a = ["var", "io"];
                                                a = ["dot", a, "print"];
                                                b = ["var", "value"];
                                                b = [b];
                                                a = ["call", a, b];
                                                a = ["expr", a];
                                                b = ["var", "run"];
                                                c = ["var", "program"];
                                                c = ["dot", c, "slice"];
                                                f = ["lit", 1];
                                                f = [f];
                                                c = ["call", c, f];
                                                f = ["var", "value"];
                                                j = ["var", "io"];
                                                c = [c, f, j];
                                                b = ["call", b, c];
                                                b = ["return", b];
                                                n = [d, e, a, b];
                                                m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                                g = ["program", q];
                                                d = ["value", null];
                                                e = ["io", "x"];
                                                a = ["", 0];
                                                b = ["", 0];
                                                c = ["", 0];
                                                f = ["", 0];
                                                j = ["", 0];
                                                g = [g, d, e, a, b, c, f, j];
                                                k = [];
                                                d = __rf0(m, h[1], g, k);
                                                if (h[2] === "length") {
                                                  g = __rf4(g, l, d.length);
                                                  break i;
                                                }
                                                break H;
                                              }
                                              if (g === "bin") {
                                                i = h[1];
                                                g = i === "+" ? i === "+" : i === "-";
                                                o = g ? g : i === "*";
                                                d = ["var", "program"];
                                                d = ["dot", d, "length"];
                                                e = ["lit", 0];
                                                d = ["bin", "===", d, e];
                                                d = ["if", d, n, null];
                                                e = ["var", "program"];
                                                a = ["lit", 0];
                                                e = ["idx", e, a];
                                                a = ["lit", "prompt"];
                                                e = ["bin", "===", e, a];
                                                a = ["var", "run"];
                                                b = ["var", "program"];
                                                b = ["dot", b, "slice"];
                                                c = ["lit", 1];
                                                c = [c];
                                                b = ["call", b, c];
                                                c = ["var", "io"];
                                                c = ["dot", c, "prompt"];
                                                f = [];
                                                c = ["call", c, f];
                                                f = ["var", "io"];
                                                b = [b, c, f];
                                                a = ["call", a, b];
                                                a = ["return", a];
                                                a = [a];
                                                a = ["block", a];
                                                e = ["if", e, a, null];
                                                a = ["var", "io"];
                                                a = ["dot", a, "print"];
                                                b = ["var", "value"];
                                                b = [b];
                                                a = ["call", a, b];
                                                a = ["expr", a];
                                                b = ["var", "run"];
                                                c = ["var", "program"];
                                                c = ["dot", c, "slice"];
                                                f = ["lit", 1];
                                                f = [f];
                                                c = ["call", c, f];
                                                f = ["var", "value"];
                                                j = ["var", "io"];
                                                c = [c, f, j];
                                                b = ["call", b, c];
                                                b = ["return", b];
                                                n = [d, e, a, b];
                                                m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                                g = ["program", q];
                                                d = ["value", null];
                                                e = ["io", "x"];
                                                a = ["", 0];
                                                b = ["", 0];
                                                c = ["", 0];
                                                f = ["", 0];
                                                j = ["", 0];
                                                g = [g, d, e, a, b, c, f, j];
                                                k = [];
                                                if (o) {
                                                  d = __rf5(i, __rf0(m, h[2], g, k), __rf0(m, h[3], g, k));
                                                  g = __rf4(g, l, d);
                                                  break i;
                                                }
                                                d = __rf0(m, h[2], g, k);
                                                e = __rf0(m, h[3], g, k);
                                                if (i === "===" ? i === "===" : i === "==") {
                                                  g = __rf4(g, l, d === e);
                                                  break i;
                                                }
                                                if (i === "!==" ? i === "!==" : i === "!=") {
                                                  g = __rf4(g, l, d !== e);
                                                  break i;
                                                }
                                                if (i === "<") {
                                                  g = __rf4(g, l, d < e);
                                                  break i;
                                                }
                                                if (i === ">") {
                                                  g = __rf4(g, l, d > e);
                                                  break i;
                                                }
                                                if (i === "<=") {
                                                  g = __rf4(g, l, d <= e);
                                                  break i;
                                                }
                                                g = __rf4(g, l, d >= e);
                                                break i;
                                              }
                                              if (g === "cond") {
                                                d = ["var", "program"];
                                                d = ["dot", d, "length"];
                                                e = ["lit", 0];
                                                d = ["bin", "===", d, e];
                                                d = ["if", d, n, null];
                                                e = ["var", "program"];
                                                a = ["lit", 0];
                                                e = ["idx", e, a];
                                                a = ["lit", "prompt"];
                                                e = ["bin", "===", e, a];
                                                a = ["var", "run"];
                                                b = ["var", "program"];
                                                b = ["dot", b, "slice"];
                                                c = ["lit", 1];
                                                c = [c];
                                                b = ["call", b, c];
                                                c = ["var", "io"];
                                                c = ["dot", c, "prompt"];
                                                f = [];
                                                c = ["call", c, f];
                                                f = ["var", "io"];
                                                b = [b, c, f];
                                                a = ["call", a, b];
                                                a = ["return", a];
                                                a = [a];
                                                a = ["block", a];
                                                e = ["if", e, a, null];
                                                a = ["var", "io"];
                                                a = ["dot", a, "print"];
                                                b = ["var", "value"];
                                                b = [b];
                                                a = ["call", a, b];
                                                a = ["expr", a];
                                                b = ["var", "run"];
                                                c = ["var", "program"];
                                                c = ["dot", c, "slice"];
                                                f = ["lit", 1];
                                                f = [f];
                                                c = ["call", c, f];
                                                f = ["var", "value"];
                                                j = ["var", "io"];
                                                c = [c, f, j];
                                                b = ["call", b, c];
                                                b = ["return", b];
                                                n = [d, e, a, b];
                                                m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                                g = ["program", q];
                                                d = ["value", null];
                                                e = ["io", "x"];
                                                a = ["", 0];
                                                b = ["", 0];
                                                c = ["", 0];
                                                f = ["", 0];
                                                j = ["", 0];
                                                g = [g, d, e, a, b, c, f, j];
                                                k = [];
                                                if (__rf0(m, h[1], g, k)) {
                                                  d = __rf0(m, h[2], g, k);
                                                  g = __rf4(g, l, d);
                                                  break i;
                                                }
                                                d = __rf0(m, h[3], g, k);
                                                g = __rf4(g, l, d);
                                                break i;
                                              }
                                              k = [];
                                              if (g === "call") {
                                                i = h[1];
                                                h = h[2];
                                                g = i[0] === "dot";
                                                g = g ? i[2] === "reduce" : g;
                                                if (g) {
                                                  d = ["var", "program"];
                                                  d = ["dot", d, "length"];
                                                  e = ["lit", 0];
                                                  d = ["bin", "===", d, e];
                                                  d = ["if", d, n, null];
                                                  e = ["var", "program"];
                                                  a = ["lit", 0];
                                                  e = ["idx", e, a];
                                                  a = ["lit", "prompt"];
                                                  e = ["bin", "===", e, a];
                                                  a = ["var", "run"];
                                                  b = ["var", "program"];
                                                  b = ["dot", b, "slice"];
                                                  c = ["lit", 1];
                                                  c = [c];
                                                  b = ["call", b, c];
                                                  c = ["var", "io"];
                                                  c = ["dot", c, "prompt"];
                                                  f = [];
                                                  c = ["call", c, f];
                                                  f = ["var", "io"];
                                                  b = [b, c, f];
                                                  a = ["call", a, b];
                                                  a = ["return", a];
                                                  a = [a];
                                                  a = ["block", a];
                                                  e = ["if", e, a, null];
                                                  a = ["var", "io"];
                                                  a = ["dot", a, "print"];
                                                  b = ["var", "value"];
                                                  b = [b];
                                                  a = ["call", a, b];
                                                  a = ["expr", a];
                                                  b = ["var", "run"];
                                                  c = ["var", "program"];
                                                  c = ["dot", c, "slice"];
                                                  f = ["lit", 1];
                                                  f = [f];
                                                  c = ["call", c, f];
                                                  f = ["var", "value"];
                                                  j = ["var", "io"];
                                                  c = [c, f, j];
                                                  b = ["call", b, c];
                                                  b = ["return", b];
                                                  n = [d, e, a, b];
                                                  m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                                  g = ["program", q];
                                                  d = ["value", null];
                                                  e = ["io", "x"];
                                                  a = ["", 0];
                                                  b = ["", 0];
                                                  c = ["", 0];
                                                  f = ["", 0];
                                                  j = ["", 0];
                                                  g = [g, d, e, a, b, c, f, j];
                                                  d = __rf0(m, i[1], g, k);
                                                  e = h[0];
                                                  a = __rf1(__rf0(m, h[1], g, k));
                                                  b = e[1][0];
                                                  c = e[1][1];
                                                  while (d.length > 0) {
                                                    a = __rf3(m, e[2], __rf2(__rf2(g, b, a), c, d[0]), k)[1];
                                                    d = d.slice(1);
                                                  }
                                                  g = __rf4(g, l, a);
                                                  break s;
                                                }
                                                g = i[0] === "dot";
                                                g = g ? i[2] === "slice" : g;
                                                if (g) {
                                                  d = ["var", "program"];
                                                  d = ["dot", d, "length"];
                                                  e = ["lit", 0];
                                                  d = ["bin", "===", d, e];
                                                  d = ["if", d, n, null];
                                                  e = ["var", "program"];
                                                  a = ["lit", 0];
                                                  e = ["idx", e, a];
                                                  a = ["lit", "prompt"];
                                                  e = ["bin", "===", e, a];
                                                  a = ["var", "run"];
                                                  b = ["var", "program"];
                                                  b = ["dot", b, "slice"];
                                                  c = ["lit", 1];
                                                  c = [c];
                                                  b = ["call", b, c];
                                                  c = ["var", "io"];
                                                  c = ["dot", c, "prompt"];
                                                  f = [];
                                                  c = ["call", c, f];
                                                  f = ["var", "io"];
                                                  b = [b, c, f];
                                                  a = ["call", a, b];
                                                  a = ["return", a];
                                                  a = [a];
                                                  a = ["block", a];
                                                  e = ["if", e, a, null];
                                                  a = ["var", "io"];
                                                  a = ["dot", a, "print"];
                                                  b = ["var", "value"];
                                                  b = [b];
                                                  a = ["call", a, b];
                                                  a = ["expr", a];
                                                  b = ["var", "run"];
                                                  c = ["var", "program"];
                                                  c = ["dot", c, "slice"];
                                                  f = ["lit", 1];
                                                  f = [f];
                                                  c = ["call", c, f];
                                                  f = ["var", "value"];
                                                  j = ["var", "io"];
                                                  c = [c, f, j];
                                                  b = ["call", b, c];
                                                  b = ["return", b];
                                                  n = [d, e, a, b];
                                                  m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                                  g = ["program", q];
                                                  d = ["value", null];
                                                  e = ["io", "x"];
                                                  a = ["", 0];
                                                  b = ["", 0];
                                                  c = ["", 0];
                                                  f = ["", 0];
                                                  j = ["", 0];
                                                  g = [g, d, e, a, b, c, f, j];
                                                  d = __rf0(m, i[1], g, k);
                                                  e = d.slice;
                                                  a = __rf0(m, h[0], g, k);
                                                  d = e.call(d, a);
                                                  g = __rf4(g, l, d);
                                                  break s;
                                                }
                                                o = k;
                                                s = k;
                                                if (i[0] === "dot") {
                                                  d = ["var", "program"];
                                                  d = ["dot", d, "length"];
                                                  e = ["lit", 0];
                                                  d = ["bin", "===", d, e];
                                                  d = ["if", d, n, null];
                                                  e = ["var", "program"];
                                                  a = ["lit", 0];
                                                  e = ["idx", e, a];
                                                  a = ["lit", "prompt"];
                                                  e = ["bin", "===", e, a];
                                                  a = ["var", "run"];
                                                  b = ["var", "program"];
                                                  b = ["dot", b, "slice"];
                                                  c = ["lit", 1];
                                                  c = [c];
                                                  b = ["call", b, c];
                                                  c = ["var", "io"];
                                                  c = ["dot", c, "prompt"];
                                                  f = [];
                                                  c = ["call", c, f];
                                                  f = ["var", "io"];
                                                  b = [b, c, f];
                                                  a = ["call", a, b];
                                                  a = ["return", a];
                                                  a = [a];
                                                  a = ["block", a];
                                                  e = ["if", e, a, null];
                                                  a = ["var", "io"];
                                                  a = ["dot", a, "print"];
                                                  b = ["var", "value"];
                                                  b = [b];
                                                  a = ["call", a, b];
                                                  a = ["expr", a];
                                                  b = ["var", "run"];
                                                  c = ["var", "program"];
                                                  c = ["dot", c, "slice"];
                                                  f = ["lit", 1];
                                                  f = [f];
                                                  c = ["call", c, f];
                                                  f = ["var", "value"];
                                                  j = ["var", "io"];
                                                  c = [c, f, j];
                                                  b = ["call", b, c];
                                                  b = ["return", b];
                                                  n = [d, e, a, b];
                                                  m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                                  g = ["program", q];
                                                  d = ["value", null];
                                                  e = ["io", "x"];
                                                  a = ["", 0];
                                                  b = ["", 0];
                                                  c = ["", 0];
                                                  f = ["", 0];
                                                  j = ["", 0];
                                                  g = [g, d, e, a, b, c, f, j];
                                                  d = __rf1(__rf0(m, i[1], g, k)) + "." + i[2] + "(";
                                                  e = 0;
                                                  while (e < h.length) {
                                                    if (e > 0) {
                                                      d += ", ";
                                                    }
                                                    d += __rf1(__rf0(m, h[e], g, k));
                                                    e += 1;
                                                  }
                                                  e = "v" + k.length;
                                                  k.push("var " + e + " = " + d + ");\n");
                                                  g = __rf4(g, l, e);
                                                  break t;
                                                }
                                                p = [];
                                                r = 0;
                                                d = ["var", "program"];
                                                d = ["dot", d, "length"];
                                                e = ["lit", 0];
                                                d = ["bin", "===", d, e];
                                                d = ["if", d, n, null];
                                                e = ["var", "program"];
                                                a = ["lit", 0];
                                                e = ["idx", e, a];
                                                a = ["lit", "prompt"];
                                                e = ["bin", "===", e, a];
                                                a = ["var", "run"];
                                                b = ["var", "program"];
                                                b = ["dot", b, "slice"];
                                                c = ["lit", 1];
                                                c = [c];
                                                b = ["call", b, c];
                                                c = ["var", "io"];
                                                c = ["dot", c, "prompt"];
                                                f = [];
                                                c = ["call", c, f];
                                                f = ["var", "io"];
                                                b = [b, c, f];
                                                a = ["call", a, b];
                                                a = ["return", a];
                                                a = [a];
                                                a = ["block", a];
                                                e = ["if", e, a, null];
                                                a = ["var", "io"];
                                                a = ["dot", a, "print"];
                                                b = ["var", "value"];
                                                b = [b];
                                                a = ["call", a, b];
                                                a = ["expr", a];
                                                b = ["var", "run"];
                                                c = ["var", "program"];
                                                c = ["dot", c, "slice"];
                                                f = ["lit", 1];
                                                f = [f];
                                                c = ["call", c, f];
                                                f = ["var", "value"];
                                                j = ["var", "io"];
                                                c = [c, f, j];
                                                b = ["call", b, c];
                                                b = ["return", b];
                                                n = [d, e, a, b];
                                                m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                                g = ["program", q];
                                                d = ["value", null];
                                                e = ["io", "x"];
                                                a = ["", 0];
                                                b = ["", 0];
                                                c = ["", 0];
                                                f = ["", 0];
                                                j = ["", 0];
                                                g = [g, d, e, a, b, c, f, j];
                                                while (r < h.length) {
                                                  p.push;
                                                  d = __rf0(m, h[r], g, k);
                                                  p.push(d);
                                                  r += 1;
                                                }
                                                d = __rf6(m, i[1]);
                                                e = [["", 0], ["", 0], ["", 0], ["", 0], ["", 0], ["", 0], ["", 0], ["", 0]];
                                                a = 0;
                                                while (a < (d[2]).length) {
                                                  e = __rf2(e, d[2][a], p[a]);
                                                  a += 1;
                                                }
                                                g = __rf4(g, l, __rf3(m, d[3], e, k)[1]);
                                                break t;
                                              }
                                              am: {
                                                e = "program" === l ? true : false;
                                                d = [[l, 0]];
                                                g = ["program", q];
                                                h = "program" === l ? d : [g];
                                                if ("value" === l) {
                                                  h.push;
                                                  h.push([l, 0]);
                                                  i = true;
                                                  d = ["value", null];
                                                  break am;
                                                }
                                                d = ["value", null];
                                                h.push(d);
                                                i = e;
                                              }
                                              an: {
                                                if ("io" === l) {
                                                  h.push;
                                                  h.push([l, 0]);
                                                  i = true;
                                                  e = ["io", "x"];
                                                  break an;
                                                }
                                                e = ["io", "x"];
                                                h.push(e);
                                              }
                                              ao: {
                                                if ("" === l) {
                                                  h.push;
                                                  h.push([l, 0]);
                                                  i = true;
                                                  a = ["", 0];
                                                  break ao;
                                                }
                                                a = ["", 0];
                                                h.push(a);
                                              }
                                              ap: {
                                                if ("" === l) {
                                                  h.push;
                                                  h.push([l, 0]);
                                                  i = true;
                                                  b = ["", 0];
                                                  break ap;
                                                }
                                                b = ["", 0];
                                                h.push(b);
                                              }
                                              aq: {
                                                if ("" === l) {
                                                  h.push;
                                                  h.push([l, 0]);
                                                  i = true;
                                                  c = ["", 0];
                                                  break aq;
                                                }
                                                c = ["", 0];
                                                h.push(c);
                                              }
                                              ar: {
                                                if ("" === l) {
                                                  h.push;
                                                  h.push([l, 0]);
                                                  i = true;
                                                  f = ["", 0];
                                                  break ar;
                                                }
                                                f = ["", 0];
                                                h.push(f);
                                              }
                                              as: {
                                                if ("" === l) {
                                                  h.push;
                                                  h.push([l, 0]);
                                                  i = true;
                                                  j = ["", 0];
                                                  break as;
                                                }
                                                j = ["", 0];
                                                h.push(j);
                                              }
                                              if (i) {
                                                g = h;
                                                d = ["var", "program"];
                                                d = ["dot", d, "length"];
                                                e = ["lit", 0];
                                                d = ["bin", "===", d, e];
                                                d = ["if", d, n, null];
                                                e = ["var", "program"];
                                                a = ["lit", 0];
                                                e = ["idx", e, a];
                                                a = ["lit", "prompt"];
                                                e = ["bin", "===", e, a];
                                                a = ["var", "run"];
                                                b = ["var", "program"];
                                                b = ["dot", b, "slice"];
                                                c = ["lit", 1];
                                                c = [c];
                                                b = ["call", b, c];
                                                c = ["var", "io"];
                                                c = ["dot", c, "prompt"];
                                                f = [];
                                                c = ["call", c, f];
                                                f = ["var", "io"];
                                                b = [b, c, f];
                                                a = ["call", a, b];
                                                a = ["return", a];
                                                a = [a];
                                                a = ["block", a];
                                                e = ["if", e, a, null];
                                                a = ["var", "io"];
                                                a = ["dot", a, "print"];
                                                b = ["var", "value"];
                                                b = [b];
                                                a = ["call", a, b];
                                                a = ["expr", a];
                                                b = ["var", "run"];
                                                c = ["var", "program"];
                                                c = ["dot", c, "slice"];
                                                f = ["lit", 1];
                                                f = [f];
                                                c = ["call", c, f];
                                                f = ["var", "value"];
                                                j = ["var", "io"];
                                                c = [c, f, j];
                                                b = ["call", b, c];
                                                b = ["return", b];
                                                n = [d, e, a, b];
                                                m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                                break s;
                                              }
                                              at: {
                                                au: {
                                                  p = g[0] === "";
                                                  h = !p;
                                                  if (h) {
                                                    i = p ? 1 : 0;
                                                    h = p;
                                                    p = d[0] === "";
                                                    h = h ? [[l, 0]] : [g];
                                                    if (p) {
                                                      break au;
                                                    }
                                                    h.push(d);
                                                    o = i;
                                                    break at;
                                                  }
                                                  i = p ? 1 : 0;
                                                  o = p;
                                                  p = h;
                                                  h = o ? [[l, 0]] : [g];
                                                  if (p) {
                                                    break au;
                                                  }
                                                  h.push(d);
                                                  o = i;
                                                  break at;
                                                }
                                                h.push;
                                                h.push([l, 0]);
                                                o = 1;
                                              }
                                              i = 2;
                                              g = [g, d, e, a, b, c, f, j];
                                              while (i < 8) {
                                                av: {
                                                  d = o === 0;
                                                  p = d ? g[i][0] === "" : void 0;
                                                  if (d ? p : o === 0) {
                                                    h.push;
                                                    h.push([l, 0]);
                                                    o = 1;
                                                    break av;
                                                  }
                                                  h.push(g[i]);
                                                }
                                                i += 1;
                                              }
                                              g = h;
                                              d = ["var", "program"];
                                              d = ["dot", d, "length"];
                                              e = ["lit", 0];
                                              d = ["bin", "===", d, e];
                                              d = ["if", d, n, null];
                                              e = ["var", "program"];
                                              a = ["lit", 0];
                                              e = ["idx", e, a];
                                              a = ["lit", "prompt"];
                                              e = ["bin", "===", e, a];
                                              a = ["var", "run"];
                                              b = ["var", "program"];
                                              b = ["dot", b, "slice"];
                                              c = ["lit", 1];
                                              c = [c];
                                              b = ["call", b, c];
                                              c = ["var", "io"];
                                              c = ["dot", c, "prompt"];
                                              f = [];
                                              c = ["call", c, f];
                                              f = ["var", "io"];
                                              b = [b, c, f];
                                              a = ["call", a, b];
                                              a = ["return", a];
                                              a = [a];
                                              a = ["block", a];
                                              e = ["if", e, a, null];
                                              a = ["var", "io"];
                                              a = ["dot", a, "print"];
                                              b = ["var", "value"];
                                              b = [b];
                                              a = ["call", a, b];
                                              a = ["expr", a];
                                              b = ["var", "run"];
                                              c = ["var", "program"];
                                              c = ["dot", c, "slice"];
                                              f = ["lit", 1];
                                              f = [f];
                                              c = ["call", c, f];
                                              f = ["var", "value"];
                                              j = ["var", "io"];
                                              c = [c, f, j];
                                              b = ["call", b, c];
                                              b = ["return", b];
                                              n = [d, e, a, b];
                                              m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                              break s;
                                            }
                                            aw: {
                                              h = [];
                                              if (g[0][0] === l) {
                                                h.push;
                                                h.push([l, 0]);
                                                i = true;
                                                break aw;
                                              }
                                              h.push(g[0]);
                                              i = false;
                                            }
                                            d = 0;
                                            while (true) {
                                              d += 1;
                                              if (d < 8) {
                                                if (g[d][0] === l) {
                                                  h.push;
                                                  h.push([l, 0]);
                                                  i = true;
                                                  continue;
                                                }
                                                h.push(g[d]);
                                                continue;
                                              }
                                              if (i) {
                                                g = h;
                                                break i;
                                              }
                                              ax: {
                                                p = g[0][0] === "";
                                                h = [];
                                                if (p) {
                                                  h.push;
                                                  h.push([l, 0]);
                                                  o = 1;
                                                  break ax;
                                                }
                                                h.push(g[0]);
                                                o = 0;
                                              }
                                              i = 0;
                                              while (true) {
                                                i += 1;
                                                if (i < 8) {
                                                  d = o === 0;
                                                  p = d ? g[i][0] === "" : void 0;
                                                  if (d ? p : o === 0) {
                                                    h.push;
                                                    h.push([l, 0]);
                                                    o = 1;
                                                    continue;
                                                  }
                                                  h.push(g[i]);
                                                  continue;
                                                }
                                                g = h;
                                                break i;
                                              }
                                            }
                                          }
                                          g = h;
                                          break u;
                                        }
                                        g = h;
                                      }
                                      d = ["var", "program"];
                                      d = ["dot", d, "length"];
                                      e = ["lit", 0];
                                      d = ["bin", "===", d, e];
                                      d = ["if", d, n, null];
                                      e = ["var", "program"];
                                      a = ["lit", 0];
                                      e = ["idx", e, a];
                                      a = ["lit", "prompt"];
                                      e = ["bin", "===", e, a];
                                      a = ["var", "run"];
                                      b = ["var", "program"];
                                      b = ["dot", b, "slice"];
                                      c = ["lit", 1];
                                      c = [c];
                                      b = ["call", b, c];
                                      c = ["var", "io"];
                                      c = ["dot", c, "prompt"];
                                      f = [];
                                      c = ["call", c, f];
                                      f = ["var", "io"];
                                      b = [b, c, f];
                                      a = ["call", a, b];
                                      a = ["return", a];
                                      a = [a];
                                      a = ["block", a];
                                      e = ["if", e, a, null];
                                      a = ["var", "io"];
                                      a = ["dot", a, "print"];
                                      b = ["var", "value"];
                                      b = [b];
                                      a = ["call", a, b];
                                      a = ["expr", a];
                                      b = ["var", "run"];
                                      c = ["var", "program"];
                                      c = ["dot", c, "slice"];
                                      f = ["lit", 1];
                                      f = [f];
                                      c = ["call", c, f];
                                      f = ["var", "value"];
                                      j = ["var", "io"];
                                      c = [c, f, j];
                                      b = ["call", b, c];
                                      b = ["return", b];
                                      n = [d, e, a, b];
                                      m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                      k = [];
                                      break i;
                                    }
                                    if (d === "expr") {
                                      h = h[1];
                                      g = h[0];
                                      if (g === "lit") {
                                        h[1];
                                        g = ["program", q];
                                        d = ["value", null];
                                        e = ["io", "x"];
                                        a = ["", 0];
                                        b = ["", 0];
                                        c = ["", 0];
                                        f = ["", 0];
                                        j = ["", 0];
                                        g = [g, d, e, a, b, c, f, j];
                                        d = ["var", "program"];
                                        d = ["dot", d, "length"];
                                        e = ["lit", 0];
                                        d = ["bin", "===", d, e];
                                        d = ["if", d, n, null];
                                        e = ["var", "program"];
                                        a = ["lit", 0];
                                        e = ["idx", e, a];
                                        a = ["lit", "prompt"];
                                        e = ["bin", "===", e, a];
                                        a = ["var", "run"];
                                        b = ["var", "program"];
                                        b = ["dot", b, "slice"];
                                        c = ["lit", 1];
                                        c = [c];
                                        b = ["call", b, c];
                                        c = ["var", "io"];
                                        c = ["dot", c, "prompt"];
                                        f = [];
                                        c = ["call", c, f];
                                        f = ["var", "io"];
                                        b = [b, c, f];
                                        a = ["call", a, b];
                                        a = ["return", a];
                                        a = [a];
                                        a = ["block", a];
                                        e = ["if", e, a, null];
                                        a = ["var", "io"];
                                        a = ["dot", a, "print"];
                                        b = ["var", "value"];
                                        b = [b];
                                        a = ["call", a, b];
                                        a = ["expr", a];
                                        b = ["var", "run"];
                                        c = ["var", "program"];
                                        c = ["dot", c, "slice"];
                                        f = ["lit", 1];
                                        f = [f];
                                        c = ["call", c, f];
                                        f = ["var", "value"];
                                        j = ["var", "io"];
                                        c = [c, f, j];
                                        b = ["call", b, c];
                                        b = ["return", b];
                                        n = [d, e, a, b];
                                        m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                        k = [];
                                        break i;
                                      }
                                      if (g === "var") {
                                        h = h[1];
                                        g = ["program", q];
                                        d = ["value", null];
                                        e = ["io", "x"];
                                        a = ["", 0];
                                        b = ["", 0];
                                        c = ["", 0];
                                        f = ["", 0];
                                        j = ["", 0];
                                        g = [g, d, e, a, b, c, f, j];
                                        d = ["var", "program"];
                                        d = ["dot", d, "length"];
                                        e = ["lit", 0];
                                        d = ["bin", "===", d, e];
                                        d = ["if", d, n, null];
                                        e = ["var", "program"];
                                        a = ["lit", 0];
                                        e = ["idx", e, a];
                                        a = ["lit", "prompt"];
                                        e = ["bin", "===", e, a];
                                        a = ["var", "run"];
                                        b = ["var", "program"];
                                        b = ["dot", b, "slice"];
                                        c = ["lit", 1];
                                        c = [c];
                                        b = ["call", b, c];
                                        c = ["var", "io"];
                                        c = ["dot", c, "prompt"];
                                        f = [];
                                        c = ["call", c, f];
                                        f = ["var", "io"];
                                        b = [b, c, f];
                                        a = ["call", a, b];
                                        a = ["return", a];
                                        a = [a];
                                        a = ["block", a];
                                        e = ["if", e, a, null];
                                        a = ["var", "io"];
                                        a = ["dot", a, "print"];
                                        b = ["var", "value"];
                                        b = [b];
                                        a = ["call", a, b];
                                        a = ["expr", a];
                                        b = ["var", "run"];
                                        c = ["var", "program"];
                                        c = ["dot", c, "slice"];
                                        f = ["lit", 1];
                                        f = [f];
                                        c = ["call", c, f];
                                        f = ["var", "value"];
                                        j = ["var", "io"];
                                        c = [c, f, j];
                                        b = ["call", b, c];
                                        b = ["return", b];
                                        n = [d, e, a, b];
                                        m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                        k = [];
                                        if ("program" === h) {
                                          break i;
                                        }
                                        if ("value" === h) {
                                          break i;
                                        }
                                        if ("io" === h) {
                                          break i;
                                        }
                                        if ("" === h) {
                                          break i;
                                        }
                                        break i;
                                      }
                                      if (g === "arr") {
                                        h = h[1];
                                        i = [];
                                        o = 0;
                                        d = ["var", "program"];
                                        d = ["dot", d, "length"];
                                        e = ["lit", 0];
                                        d = ["bin", "===", d, e];
                                        d = ["if", d, n, null];
                                        e = ["var", "program"];
                                        a = ["lit", 0];
                                        e = ["idx", e, a];
                                        a = ["lit", "prompt"];
                                        e = ["bin", "===", e, a];
                                        a = ["var", "run"];
                                        b = ["var", "program"];
                                        b = ["dot", b, "slice"];
                                        c = ["lit", 1];
                                        c = [c];
                                        b = ["call", b, c];
                                        c = ["var", "io"];
                                        c = ["dot", c, "prompt"];
                                        f = [];
                                        c = ["call", c, f];
                                        f = ["var", "io"];
                                        b = [b, c, f];
                                        a = ["call", a, b];
                                        a = ["return", a];
                                        a = [a];
                                        a = ["block", a];
                                        e = ["if", e, a, null];
                                        a = ["var", "io"];
                                        a = ["dot", a, "print"];
                                        b = ["var", "value"];
                                        b = [b];
                                        a = ["call", a, b];
                                        a = ["expr", a];
                                        b = ["var", "run"];
                                        c = ["var", "program"];
                                        c = ["dot", c, "slice"];
                                        f = ["lit", 1];
                                        f = [f];
                                        c = ["call", c, f];
                                        f = ["var", "value"];
                                        j = ["var", "io"];
                                        c = [c, f, j];
                                        b = ["call", b, c];
                                        b = ["return", b];
                                        n = [d, e, a, b];
                                        m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                        k = [];
                                        g = ["program", q];
                                        d = ["value", null];
                                        e = ["io", "x"];
                                        a = ["", 0];
                                        b = ["", 0];
                                        c = ["", 0];
                                        f = ["", 0];
                                        j = ["", 0];
                                        g = [g, d, e, a, b, c, f, j];
                                        while (o < h.length) {
                                          i.push;
                                          d = __rf0(m, h[o], g, k);
                                          i.push(d);
                                          o += 1;
                                        }
                                        break i;
                                      }
                                      if (g === "idx") {
                                        d = ["var", "program"];
                                        d = ["dot", d, "length"];
                                        e = ["lit", 0];
                                        d = ["bin", "===", d, e];
                                        d = ["if", d, n, null];
                                        e = ["var", "program"];
                                        a = ["lit", 0];
                                        e = ["idx", e, a];
                                        a = ["lit", "prompt"];
                                        e = ["bin", "===", e, a];
                                        a = ["var", "run"];
                                        b = ["var", "program"];
                                        b = ["dot", b, "slice"];
                                        c = ["lit", 1];
                                        c = [c];
                                        b = ["call", b, c];
                                        c = ["var", "io"];
                                        c = ["dot", c, "prompt"];
                                        f = [];
                                        c = ["call", c, f];
                                        f = ["var", "io"];
                                        b = [b, c, f];
                                        a = ["call", a, b];
                                        a = ["return", a];
                                        a = [a];
                                        a = ["block", a];
                                        e = ["if", e, a, null];
                                        a = ["var", "io"];
                                        a = ["dot", a, "print"];
                                        b = ["var", "value"];
                                        b = [b];
                                        a = ["call", a, b];
                                        a = ["expr", a];
                                        b = ["var", "run"];
                                        c = ["var", "program"];
                                        c = ["dot", c, "slice"];
                                        f = ["lit", 1];
                                        f = [f];
                                        c = ["call", c, f];
                                        f = ["var", "value"];
                                        j = ["var", "io"];
                                        c = [c, f, j];
                                        b = ["call", b, c];
                                        b = ["return", b];
                                        n = [d, e, a, b];
                                        m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                        g = ["program", q];
                                        d = ["value", null];
                                        e = ["io", "x"];
                                        a = ["", 0];
                                        b = ["", 0];
                                        c = ["", 0];
                                        f = ["", 0];
                                        j = ["", 0];
                                        g = [g, d, e, a, b, c, f, j];
                                        k = [];
                                        __rf0(m, h[1], g, k)[__rf0(m, h[2], g, k)];
                                        break i;
                                      }
                                      if (g === "dot") {
                                        d = ["var", "program"];
                                        d = ["dot", d, "length"];
                                        e = ["lit", 0];
                                        d = ["bin", "===", d, e];
                                        d = ["if", d, n, null];
                                        e = ["var", "program"];
                                        a = ["lit", 0];
                                        e = ["idx", e, a];
                                        a = ["lit", "prompt"];
                                        e = ["bin", "===", e, a];
                                        a = ["var", "run"];
                                        b = ["var", "program"];
                                        b = ["dot", b, "slice"];
                                        c = ["lit", 1];
                                        c = [c];
                                        b = ["call", b, c];
                                        c = ["var", "io"];
                                        c = ["dot", c, "prompt"];
                                        f = [];
                                        c = ["call", c, f];
                                        f = ["var", "io"];
                                        b = [b, c, f];
                                        a = ["call", a, b];
                                        a = ["return", a];
                                        a = [a];
                                        a = ["block", a];
                                        e = ["if", e, a, null];
                                        a = ["var", "io"];
                                        a = ["dot", a, "print"];
                                        b = ["var", "value"];
                                        b = [b];
                                        a = ["call", a, b];
                                        a = ["expr", a];
                                        b = ["var", "run"];
                                        c = ["var", "program"];
                                        c = ["dot", c, "slice"];
                                        f = ["lit", 1];
                                        f = [f];
                                        c = ["call", c, f];
                                        f = ["var", "value"];
                                        j = ["var", "io"];
                                        c = [c, f, j];
                                        b = ["call", b, c];
                                        b = ["return", b];
                                        n = [d, e, a, b];
                                        m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                        g = ["program", q];
                                        d = ["value", null];
                                        e = ["io", "x"];
                                        a = ["", 0];
                                        b = ["", 0];
                                        c = ["", 0];
                                        f = ["", 0];
                                        j = ["", 0];
                                        g = [g, d, e, a, b, c, f, j];
                                        k = [];
                                        d = __rf0(m, h[1], g, k);
                                        if (h[2] === "length") {
                                          d.length;
                                          break i;
                                        }
                                        break i;
                                      }
                                      if (g === "bin") {
                                        i = h[1];
                                        g = i === "+" ? i === "+" : i === "-";
                                        o = g ? g : i === "*";
                                        d = ["var", "program"];
                                        d = ["dot", d, "length"];
                                        e = ["lit", 0];
                                        d = ["bin", "===", d, e];
                                        d = ["if", d, n, null];
                                        e = ["var", "program"];
                                        a = ["lit", 0];
                                        e = ["idx", e, a];
                                        a = ["lit", "prompt"];
                                        e = ["bin", "===", e, a];
                                        a = ["var", "run"];
                                        b = ["var", "program"];
                                        b = ["dot", b, "slice"];
                                        c = ["lit", 1];
                                        c = [c];
                                        b = ["call", b, c];
                                        c = ["var", "io"];
                                        c = ["dot", c, "prompt"];
                                        f = [];
                                        c = ["call", c, f];
                                        f = ["var", "io"];
                                        b = [b, c, f];
                                        a = ["call", a, b];
                                        a = ["return", a];
                                        a = [a];
                                        a = ["block", a];
                                        e = ["if", e, a, null];
                                        a = ["var", "io"];
                                        a = ["dot", a, "print"];
                                        b = ["var", "value"];
                                        b = [b];
                                        a = ["call", a, b];
                                        a = ["expr", a];
                                        b = ["var", "run"];
                                        c = ["var", "program"];
                                        c = ["dot", c, "slice"];
                                        f = ["lit", 1];
                                        f = [f];
                                        c = ["call", c, f];
                                        f = ["var", "value"];
                                        j = ["var", "io"];
                                        c = [c, f, j];
                                        b = ["call", b, c];
                                        b = ["return", b];
                                        n = [d, e, a, b];
                                        m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                        g = ["program", q];
                                        d = ["value", null];
                                        e = ["io", "x"];
                                        a = ["", 0];
                                        b = ["", 0];
                                        c = ["", 0];
                                        f = ["", 0];
                                        j = ["", 0];
                                        g = [g, d, e, a, b, c, f, j];
                                        k = [];
                                        if (o) {
                                          __rf5(i, __rf0(m, h[2], g, k), __rf0(m, h[3], g, k));
                                          break i;
                                        }
                                        d = __rf0(m, h[2], g, k);
                                        e = __rf0(m, h[3], g, k);
                                        if (i === "===" ? i === "===" : i === "==") {
                                          break i;
                                        }
                                        if (i === "!==" ? i === "!==" : i === "!=") {
                                          break i;
                                        }
                                        if (i === "<") {
                                          d < e;
                                          break i;
                                        }
                                        if (i === ">") {
                                          d > e;
                                          break i;
                                        }
                                        if (i === "<=") {
                                          d <= e;
                                          break i;
                                        }
                                        d >= e;
                                        break i;
                                      }
                                      if (g === "cond") {
                                        d = ["var", "program"];
                                        d = ["dot", d, "length"];
                                        e = ["lit", 0];
                                        d = ["bin", "===", d, e];
                                        d = ["if", d, n, null];
                                        e = ["var", "program"];
                                        a = ["lit", 0];
                                        e = ["idx", e, a];
                                        a = ["lit", "prompt"];
                                        e = ["bin", "===", e, a];
                                        a = ["var", "run"];
                                        b = ["var", "program"];
                                        b = ["dot", b, "slice"];
                                        c = ["lit", 1];
                                        c = [c];
                                        b = ["call", b, c];
                                        c = ["var", "io"];
                                        c = ["dot", c, "prompt"];
                                        f = [];
                                        c = ["call", c, f];
                                        f = ["var", "io"];
                                        b = [b, c, f];
                                        a = ["call", a, b];
                                        a = ["return", a];
                                        a = [a];
                                        a = ["block", a];
                                        e = ["if", e, a, null];
                                        a = ["var", "io"];
                                        a = ["dot", a, "print"];
                                        b = ["var", "value"];
                                        b = [b];
                                        a = ["call", a, b];
                                        a = ["expr", a];
                                        b = ["var", "run"];
                                        c = ["var", "program"];
                                        c = ["dot", c, "slice"];
                                        f = ["lit", 1];
                                        f = [f];
                                        c = ["call", c, f];
                                        f = ["var", "value"];
                                        j = ["var", "io"];
                                        c = [c, f, j];
                                        b = ["call", b, c];
                                        b = ["return", b];
                                        n = [d, e, a, b];
                                        m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                        g = ["program", q];
                                        d = ["value", null];
                                        e = ["io", "x"];
                                        a = ["", 0];
                                        b = ["", 0];
                                        c = ["", 0];
                                        f = ["", 0];
                                        j = ["", 0];
                                        g = [g, d, e, a, b, c, f, j];
                                        k = [];
                                        if (__rf0(m, h[1], g, k)) {
                                          __rf0(m, h[2], g, k);
                                          break i;
                                        }
                                        __rf0(m, h[3], g, k);
                                        break i;
                                      }
                                      k = [];
                                      if (g === "call") {
                                        i = h[1];
                                        h = h[2];
                                        g = i[0] === "dot";
                                        g = g ? i[2] === "reduce" : g;
                                        if (g) {
                                          d = ["var", "program"];
                                          d = ["dot", d, "length"];
                                          e = ["lit", 0];
                                          d = ["bin", "===", d, e];
                                          d = ["if", d, n, null];
                                          e = ["var", "program"];
                                          a = ["lit", 0];
                                          e = ["idx", e, a];
                                          a = ["lit", "prompt"];
                                          e = ["bin", "===", e, a];
                                          a = ["var", "run"];
                                          b = ["var", "program"];
                                          b = ["dot", b, "slice"];
                                          c = ["lit", 1];
                                          c = [c];
                                          b = ["call", b, c];
                                          c = ["var", "io"];
                                          c = ["dot", c, "prompt"];
                                          f = [];
                                          c = ["call", c, f];
                                          f = ["var", "io"];
                                          b = [b, c, f];
                                          a = ["call", a, b];
                                          a = ["return", a];
                                          a = [a];
                                          a = ["block", a];
                                          e = ["if", e, a, null];
                                          a = ["var", "io"];
                                          a = ["dot", a, "print"];
                                          b = ["var", "value"];
                                          b = [b];
                                          a = ["call", a, b];
                                          a = ["expr", a];
                                          b = ["var", "run"];
                                          c = ["var", "program"];
                                          c = ["dot", c, "slice"];
                                          f = ["lit", 1];
                                          f = [f];
                                          c = ["call", c, f];
                                          f = ["var", "value"];
                                          j = ["var", "io"];
                                          c = [c, f, j];
                                          b = ["call", b, c];
                                          b = ["return", b];
                                          n = [d, e, a, b];
                                          m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                          g = ["program", q];
                                          d = ["value", null];
                                          e = ["io", "x"];
                                          a = ["", 0];
                                          b = ["", 0];
                                          c = ["", 0];
                                          f = ["", 0];
                                          j = ["", 0];
                                          g = [g, d, e, a, b, c, f, j];
                                          d = __rf0(m, i[1], g, k);
                                          e = h[0];
                                          a = __rf1(__rf0(m, h[1], g, k));
                                          b = e[1][0];
                                          c = e[1][1];
                                          while (d.length > 0) {
                                            a = __rf3(m, e[2], __rf2(__rf2(g, b, a), c, d[0]), k)[1];
                                            d = d.slice(1);
                                          }
                                          break s;
                                        }
                                        g = i[0] === "dot";
                                        g = g ? i[2] === "slice" : g;
                                        if (g) {
                                          d = ["var", "program"];
                                          d = ["dot", d, "length"];
                                          e = ["lit", 0];
                                          d = ["bin", "===", d, e];
                                          d = ["if", d, n, null];
                                          e = ["var", "program"];
                                          a = ["lit", 0];
                                          e = ["idx", e, a];
                                          a = ["lit", "prompt"];
                                          e = ["bin", "===", e, a];
                                          a = ["var", "run"];
                                          b = ["var", "program"];
                                          b = ["dot", b, "slice"];
                                          c = ["lit", 1];
                                          c = [c];
                                          b = ["call", b, c];
                                          c = ["var", "io"];
                                          c = ["dot", c, "prompt"];
                                          f = [];
                                          c = ["call", c, f];
                                          f = ["var", "io"];
                                          b = [b, c, f];
                                          a = ["call", a, b];
                                          a = ["return", a];
                                          a = [a];
                                          a = ["block", a];
                                          e = ["if", e, a, null];
                                          a = ["var", "io"];
                                          a = ["dot", a, "print"];
                                          b = ["var", "value"];
                                          b = [b];
                                          a = ["call", a, b];
                                          a = ["expr", a];
                                          b = ["var", "run"];
                                          c = ["var", "program"];
                                          c = ["dot", c, "slice"];
                                          f = ["lit", 1];
                                          f = [f];
                                          c = ["call", c, f];
                                          f = ["var", "value"];
                                          j = ["var", "io"];
                                          c = [c, f, j];
                                          b = ["call", b, c];
                                          b = ["return", b];
                                          n = [d, e, a, b];
                                          m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                          g = ["program", q];
                                          d = ["value", null];
                                          e = ["io", "x"];
                                          a = ["", 0];
                                          b = ["", 0];
                                          c = ["", 0];
                                          f = ["", 0];
                                          j = ["", 0];
                                          g = [g, d, e, a, b, c, f, j];
                                          d = __rf0(m, i[1], g, k);
                                          e = d.slice;
                                          a = __rf0(m, h[0], g, k);
                                          e.call(d, a);
                                          break s;
                                        }
                                        o = k;
                                        s = k;
                                        if (i[0] === "dot") {
                                          d = ["var", "program"];
                                          d = ["dot", d, "length"];
                                          e = ["lit", 0];
                                          d = ["bin", "===", d, e];
                                          d = ["if", d, n, null];
                                          e = ["var", "program"];
                                          a = ["lit", 0];
                                          e = ["idx", e, a];
                                          a = ["lit", "prompt"];
                                          e = ["bin", "===", e, a];
                                          a = ["var", "run"];
                                          b = ["var", "program"];
                                          b = ["dot", b, "slice"];
                                          c = ["lit", 1];
                                          c = [c];
                                          b = ["call", b, c];
                                          c = ["var", "io"];
                                          c = ["dot", c, "prompt"];
                                          f = [];
                                          c = ["call", c, f];
                                          f = ["var", "io"];
                                          b = [b, c, f];
                                          a = ["call", a, b];
                                          a = ["return", a];
                                          a = [a];
                                          a = ["block", a];
                                          e = ["if", e, a, null];
                                          a = ["var", "io"];
                                          a = ["dot", a, "print"];
                                          b = ["var", "value"];
                                          b = [b];
                                          a = ["call", a, b];
                                          a = ["expr", a];
                                          b = ["var", "run"];
                                          c = ["var", "program"];
                                          c = ["dot", c, "slice"];
                                          f = ["lit", 1];
                                          f = [f];
                                          c = ["call", c, f];
                                          f = ["var", "value"];
                                          j = ["var", "io"];
                                          c = [c, f, j];
                                          b = ["call", b, c];
                                          b = ["return", b];
                                          n = [d, e, a, b];
                                          m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                          g = ["program", q];
                                          d = ["value", null];
                                          e = ["io", "x"];
                                          a = ["", 0];
                                          b = ["", 0];
                                          c = ["", 0];
                                          f = ["", 0];
                                          j = ["", 0];
                                          g = [g, d, e, a, b, c, f, j];
                                          d = __rf1(__rf0(m, i[1], g, k)) + "." + i[2] + "(";
                                          e = 0;
                                          while (e < h.length) {
                                            if (e > 0) {
                                              d += ", ";
                                            }
                                            d += __rf1(__rf0(m, h[e], g, k));
                                            e += 1;
                                          }
                                          e = "v" + k.length;
                                          k.push("var " + e + " = " + d + ");\n");
                                          break t;
                                        }
                                        p = [];
                                        r = 0;
                                        d = ["var", "program"];
                                        d = ["dot", d, "length"];
                                        e = ["lit", 0];
                                        d = ["bin", "===", d, e];
                                        d = ["if", d, n, null];
                                        e = ["var", "program"];
                                        a = ["lit", 0];
                                        e = ["idx", e, a];
                                        a = ["lit", "prompt"];
                                        e = ["bin", "===", e, a];
                                        a = ["var", "run"];
                                        b = ["var", "program"];
                                        b = ["dot", b, "slice"];
                                        c = ["lit", 1];
                                        c = [c];
                                        b = ["call", b, c];
                                        c = ["var", "io"];
                                        c = ["dot", c, "prompt"];
                                        f = [];
                                        c = ["call", c, f];
                                        f = ["var", "io"];
                                        b = [b, c, f];
                                        a = ["call", a, b];
                                        a = ["return", a];
                                        a = [a];
                                        a = ["block", a];
                                        e = ["if", e, a, null];
                                        a = ["var", "io"];
                                        a = ["dot", a, "print"];
                                        b = ["var", "value"];
                                        b = [b];
                                        a = ["call", a, b];
                                        a = ["expr", a];
                                        b = ["var", "run"];
                                        c = ["var", "program"];
                                        c = ["dot", c, "slice"];
                                        f = ["lit", 1];
                                        f = [f];
                                        c = ["call", c, f];
                                        f = ["var", "value"];
                                        j = ["var", "io"];
                                        c = [c, f, j];
                                        b = ["call", b, c];
                                        b = ["return", b];
                                        n = [d, e, a, b];
                                        m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                        g = ["program", q];
                                        d = ["value", null];
                                        e = ["io", "x"];
                                        a = ["", 0];
                                        b = ["", 0];
                                        c = ["", 0];
                                        f = ["", 0];
                                        j = ["", 0];
                                        g = [g, d, e, a, b, c, f, j];
                                        while (r < h.length) {
                                          p.push;
                                          d = __rf0(m, h[r], g, k);
                                          p.push(d);
                                          r += 1;
                                        }
                                        d = __rf6(m, i[1]);
                                        e = [["", 0], ["", 0], ["", 0], ["", 0], ["", 0], ["", 0], ["", 0], ["", 0]];
                                        a = 0;
                                        while (a < (d[2]).length) {
                                          e = __rf2(e, d[2][a], p[a]);
                                          a += 1;
                                        }
                                        __rf3(m, d[3], e, k)[1];
                                        break t;
                                      }
                                      g = ["program", q];
                                      d = ["value", null];
                                      e = ["io", "x"];
                                      a = ["", 0];
                                      b = ["", 0];
                                      c = ["", 0];
                                      f = ["", 0];
                                      j = ["", 0];
                                      g = [g, d, e, a, b, c, f, j];
                                      d = ["var", "program"];
                                      d = ["dot", d, "length"];
                                      e = ["lit", 0];
                                      d = ["bin", "===", d, e];
                                      d = ["if", d, n, null];
                                      e = ["var", "program"];
                                      a = ["lit", 0];
                                      e = ["idx", e, a];
                                      a = ["lit", "prompt"];
                                      e = ["bin", "===", e, a];
                                      a = ["var", "run"];
                                      b = ["var", "program"];
                                      b = ["dot", b, "slice"];
                                      c = ["lit", 1];
                                      c = [c];
                                      b = ["call", b, c];
                                      c = ["var", "io"];
                                      c = ["dot", c, "prompt"];
                                      f = [];
                                      c = ["call", c, f];
                                      f = ["var", "io"];
                                      b = [b, c, f];
                                      a = ["call", a, b];
                                      a = ["return", a];
                                      a = [a];
                                      a = ["block", a];
                                      e = ["if", e, a, null];
                                      a = ["var", "io"];
                                      a = ["dot", a, "print"];
                                      b = ["var", "value"];
                                      b = [b];
                                      a = ["call", a, b];
                                      a = ["expr", a];
                                      b = ["var", "run"];
                                      c = ["var", "program"];
                                      c = ["dot", c, "slice"];
                                      f = ["lit", 1];
                                      f = [f];
                                      c = ["call", c, f];
                                      f = ["var", "value"];
                                      j = ["var", "io"];
                                      c = [c, f, j];
                                      b = ["call", b, c];
                                      b = ["return", b];
                                      n = [d, e, a, b];
                                      m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                      break s;
                                    }
                                    if (d === "if") {
                                      i = h[3];
                                      d = ["var", "program"];
                                      d = ["dot", d, "length"];
                                      e = ["lit", 0];
                                      d = ["bin", "===", d, e];
                                      d = ["if", d, n, null];
                                      e = ["var", "program"];
                                      a = ["lit", 0];
                                      e = ["idx", e, a];
                                      a = ["lit", "prompt"];
                                      e = ["bin", "===", e, a];
                                      a = ["var", "run"];
                                      b = ["var", "program"];
                                      b = ["dot", b, "slice"];
                                      c = ["lit", 1];
                                      c = [c];
                                      b = ["call", b, c];
                                      c = ["var", "io"];
                                      c = ["dot", c, "prompt"];
                                      f = [];
                                      c = ["call", c, f];
                                      f = ["var", "io"];
                                      b = [b, c, f];
                                      a = ["call", a, b];
                                      a = ["return", a];
                                      a = [a];
                                      a = ["block", a];
                                      e = ["if", e, a, null];
                                      a = ["var", "io"];
                                      a = ["dot", a, "print"];
                                      b = ["var", "value"];
                                      b = [b];
                                      a = ["call", a, b];
                                      a = ["expr", a];
                                      b = ["var", "run"];
                                      c = ["var", "program"];
                                      c = ["dot", c, "slice"];
                                      f = ["lit", 1];
                                      f = [f];
                                      c = ["call", c, f];
                                      f = ["var", "value"];
                                      j = ["var", "io"];
                                      c = [c, f, j];
                                      b = ["call", b, c];
                                      b = ["return", b];
                                      n = [d, e, a, b];
                                      m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                      g = ["program", q];
                                      d = ["value", null];
                                      e = ["io", "x"];
                                      a = ["", 0];
                                      b = ["", 0];
                                      c = ["", 0];
                                      f = ["", 0];
                                      j = ["", 0];
                                      g = [g, d, e, a, b, c, f, j];
                                      k = [];
                                      if (__rf0(m, h[1], g, k)) {
                                        i = h[2];
                                      }
                                      if (i) {
                                        g = __rf3(m, [i], g, k);
                                        if (g[0]) {
                                          if (g[0]) {
                                            g = g[1];
                                            if (g === null) {
                                              break f;
                                            }
                                            break e;
                                          }
                                          g = g[2];
                                          break i;
                                        }
                                        g = g[2];
                                        break i;
                                      }
                                      break i;
                                    }
                                    if (d === "block") {
                                      d = ["var", "program"];
                                      d = ["dot", d, "length"];
                                      e = ["lit", 0];
                                      d = ["bin", "===", d, e];
                                      d = ["if", d, n, null];
                                      e = ["var", "program"];
                                      a = ["lit", 0];
                                      e = ["idx", e, a];
                                      a = ["lit", "prompt"];
                                      e = ["bin", "===", e, a];
                                      a = ["var", "run"];
                                      b = ["var", "program"];
                                      b = ["dot", b, "slice"];
                                      c = ["lit", 1];
                                      c = [c];
                                      b = ["call", b, c];
                                      c = ["var", "io"];
                                      c = ["dot", c, "prompt"];
                                      f = [];
                                      c = ["call", c, f];
                                      f = ["var", "io"];
                                      b = [b, c, f];
                                      a = ["call", a, b];
                                      a = ["return", a];
                                      a = [a];
                                      a = ["block", a];
                                      e = ["if", e, a, null];
                                      a = ["var", "io"];
                                      a = ["dot", a, "print"];
                                      b = ["var", "value"];
                                      b = [b];
                                      a = ["call", a, b];
                                      a = ["expr", a];
                                      b = ["var", "run"];
                                      c = ["var", "program"];
                                      c = ["dot", c, "slice"];
                                      f = ["lit", 1];
                                      f = [f];
                                      c = ["call", c, f];
                                      f = ["var", "value"];
                                      j = ["var", "io"];
                                      c = [c, f, j];
                                      b = ["call", b, c];
                                      b = ["return", b];
                                      n = [d, e, a, b];
                                      m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                      g = ["program", q];
                                      d = ["value", null];
                                      e = ["io", "x"];
                                      a = ["", 0];
                                      b = ["", 0];
                                      c = ["", 0];
                                      f = ["", 0];
                                      j = ["", 0];
                                      g = [g, d, e, a, b, c, f, j];
                                      k = [];
                                      g = __rf3(m, h[1], g, k);
                                      if (g[0]) {
                                        if (g[0]) {
                                          g = g[1];
                                          if (g === null) {
                                            break f;
                                          }
                                          break e;
                                        }
                                        g = g[2];
                                        break i;
                                      }
                                      g = g[2];
                                      break i;
                                    }
                                    if (d === "while") {
                                      d = ["var", "program"];
                                      d = ["dot", d, "length"];
                                      e = ["lit", 0];
                                      d = ["bin", "===", d, e];
                                      d = ["if", d, n, null];
                                      e = ["var", "program"];
                                      a = ["lit", 0];
                                      e = ["idx", e, a];
                                      a = ["lit", "prompt"];
                                      e = ["bin", "===", e, a];
                                      a = ["var", "run"];
                                      b = ["var", "program"];
                                      b = ["dot", b, "slice"];
                                      c = ["lit", 1];
                                      c = [c];
                                      b = ["call", b, c];
                                      c = ["var", "io"];
                                      c = ["dot", c, "prompt"];
                                      f = [];
                                      c = ["call", c, f];
                                      f = ["var", "io"];
                                      b = [b, c, f];
                                      a = ["call", a, b];
                                      a = ["return", a];
                                      a = [a];
                                      a = ["block", a];
                                      e = ["if", e, a, null];
                                      a = ["var", "io"];
                                      a = ["dot", a, "print"];
                                      b = ["var", "value"];
                                      b = [b];
                                      a = ["call", a, b];
                                      a = ["expr", a];
                                      b = ["var", "run"];
                                      c = ["var", "program"];
                                      c = ["dot", c, "slice"];
                                      f = ["lit", 1];
                                      f = [f];
                                      c = ["call", c, f];
                                      f = ["var", "value"];
                                      j = ["var", "io"];
                                      c = [c, f, j];
                                      b = ["call", b, c];
                                      b = ["return", b];
                                      n = [d, e, a, b];
                                      m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                      g = ["program", q];
                                      d = ["value", null];
                                      e = ["io", "x"];
                                      a = ["", 0];
                                      b = ["", 0];
                                      c = ["", 0];
                                      f = ["", 0];
                                      j = ["", 0];
                                      g = [g, d, e, a, b, c, f, j];
                                      k = [];
                                      if (__rf0(m, h[1], g, k)) {
                                        g = __rf3(m, [h[2]], g, k);
                                        if (g[0]) {
                                          if (g[0]) {
                                            g = g[1];
                                            if (g === null) {
                                              break f;
                                            }
                                            break e;
                                          }
                                          g = g[2];
                                          break i;
                                        }
                                        g = g[2];
                                        c = m;
                                        f = k;
                                        while (__rf0(c, h[1], g, f)) {
                                          g = __rf3(c, [h[2]], g, f);
                                          if (g[0]) {
                                            if (g[0]) {
                                              g = g[1];
                                              if (g === null) {
                                                break f;
                                              }
                                              break e;
                                            }
                                            g = g[2];
                                            break i;
                                          }
                                          g = g[2];
                                        }
                                        break i;
                                      }
                                      break i;
                                    }
                                    g = ["program", q];
                                    d = ["value", null];
                                    e = ["io", "x"];
                                    a = ["", 0];
                                    b = ["", 0];
                                    c = ["", 0];
                                    f = ["", 0];
                                    j = ["", 0];
                                    g = [g, d, e, a, b, c, f, j];
                                    d = ["var", "program"];
                                    d = ["dot", d, "length"];
                                    e = ["lit", 0];
                                    d = ["bin", "===", d, e];
                                    d = ["if", d, n, null];
                                    e = ["var", "program"];
                                    a = ["lit", 0];
                                    e = ["idx", e, a];
                                    a = ["lit", "prompt"];
                                    e = ["bin", "===", e, a];
                                    a = ["var", "run"];
                                    b = ["var", "program"];
                                    b = ["dot", b, "slice"];
                                    c = ["lit", 1];
                                    c = [c];
                                    b = ["call", b, c];
                                    c = ["var", "io"];
                                    c = ["dot", c, "prompt"];
                                    f = [];
                                    c = ["call", c, f];
                                    f = ["var", "io"];
                                    b = [b, c, f];
                                    a = ["call", a, b];
                                    a = ["return", a];
                                    a = [a];
                                    a = ["block", a];
                                    e = ["if", e, a, null];
                                    a = ["var", "io"];
                                    a = ["dot", a, "print"];
                                    b = ["var", "value"];
                                    b = [b];
                                    a = ["call", a, b];
                                    a = ["expr", a];
                                    b = ["var", "run"];
                                    c = ["var", "program"];
                                    c = ["dot", c, "slice"];
                                    f = ["lit", 1];
                                    f = [f];
                                    c = ["call", c, f];
                                    f = ["var", "value"];
                                    j = ["var", "io"];
                                    c = [c, f, j];
                                    b = ["call", b, c];
                                    b = ["return", b];
                                    n = [d, e, a, b];
                                    m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                                    k = [];
                                    break i;
                                  }
                                  c = m;
                                  a = n;
                                  f = s;
                                  e = 0;
                                  ay: while (true) {
                                    e += 1;
                                    while (e < a.length) {
                                      b = a[e];
                                      d = b[0];
                                      if (d === "return") {
                                        g = __rf0(c, b[1], g, f);
                                        if (g === null) {
                                          break n;
                                        }
                                        if (typeof g === "number") {
                                          if (o.length === 0) {
                                            break h;
                                          }
                                          return "(function(){\n" + o.join("") + "return " + ("" + g) + ";\n})()";
                                        }
                                        if (o.length === 0) {
                                          break g;
                                        }
                                        return "(function(){\n" + o.join("") + "return " + g + ";\n})()";
                                      }
                                      if (d === "var" ? d === "var" : d === "assign") {
                                        l = b[1];
                                        g = __rf4(g, l, __rf0(c, b[2], g, f));
                                        continue ay;
                                      }
                                      if (d === "expr") {
                                        __rf0(c, b[1], g, f);
                                        continue ay;
                                      }
                                      if (d === "if") {
                                        i = b[3];
                                        if (__rf0(c, b[1], g, f)) {
                                          i = b[2];
                                        }
                                        if (i) {
                                          g = __rf3(c, [i], g, f);
                                          if (g[0]) {
                                            g = g[1];
                                            if (g === null) {
                                              break n;
                                            }
                                            break m;
                                          }
                                          g = g[2];
                                          continue ay;
                                        }
                                        continue ay;
                                      }
                                      if (d === "block") {
                                        g = __rf3(c, b[1], g, f);
                                        if (g[0]) {
                                          g = g[1];
                                          if (g === null) {
                                            break n;
                                          }
                                          break m;
                                        }
                                        g = g[2];
                                        continue ay;
                                      }
                                      if (d === "while") {
                                        while (__rf0(c, b[1], g, f)) {
                                          g = __rf3(c, [b[2]], g, f);
                                          if (g[0]) {
                                            g = g[1];
                                            if (g === null) {
                                              break n;
                                            }
                                            break m;
                                          }
                                          g = g[2];
                                        }
                                      }
                                      e += 1;
                                    }
                                    if (o.length === 0) {
                                      break b;
                                    }
                                    break l;
                                  }
                                }
                                e = 1;
                                c = m;
                                a = n;
                                f = k;
                                while (e < a.length) {
                                  b = a[e];
                                  d = b[0];
                                  if (d === "return") {
                                    g = __rf0(c, b[1], g, f);
                                    if (g === null) {
                                      break k;
                                    }
                                    if (typeof g === "number") {
                                      if (k.length === 0) {
                                        break h;
                                      }
                                      return "(function(){\n" + k.join("") + "return " + ("" + g) + ";\n})()";
                                    }
                                    if (k.length === 0) {
                                      break g;
                                    }
                                    return "(function(){\n" + k.join("") + "return " + g + ";\n})()";
                                  }
                                  az: {
                                    if (d === "var" ? d === "var" : d === "assign") {
                                      l = b[1];
                                      g = __rf4(g, l, __rf0(c, b[2], g, f));
                                      break az;
                                    }
                                    if (d === "expr") {
                                      __rf0(c, b[1], g, f);
                                      break az;
                                    }
                                    aA: {
                                      if (d === "if") {
                                        i = b[3];
                                        if (__rf0(c, b[1], g, f)) {
                                          i = b[2];
                                        }
                                        if (i) {
                                          g = __rf3(c, [i], g, f);
                                          if (g[0]) {
                                            g = g[1];
                                            if (g === null) {
                                              break k;
                                            }
                                            break aA;
                                          }
                                          g = g[2];
                                          break az;
                                        }
                                        break az;
                                      }
                                      if (d === "block") {
                                        g = __rf3(c, b[1], g, f);
                                        if (g[0]) {
                                          g = g[1];
                                          if (g === null) {
                                            break k;
                                          }
                                          break aA;
                                        }
                                        g = g[2];
                                        break az;
                                      }
                                      if (d === "while") {
                                        while (__rf0(c, b[1], g, f)) {
                                          g = __rf3(c, [b[2]], g, f);
                                          if (g[0]) {
                                            g = g[1];
                                            if (g === null) {
                                              break k;
                                            }
                                            break aA;
                                          }
                                          g = g[2];
                                        }
                                      }
                                      e += 1;
                                      continue;
                                    }
                                    if (typeof g === "number") {
                                      if (k.length === 0) {
                                        break d;
                                      }
                                      return "(function(){\n" + k.join("") + "return " + ("" + g) + ";\n})()";
                                    }
                                    if (k.length === 0) {
                                      break c;
                                    }
                                    return "(function(){\n" + k.join("") + "return " + g + ";\n})()";
                                  }
                                  e += 1;
                                }
                                if (k.length === 0) {
                                  break b;
                                }
                                break j;
                              }
                              if (o.length === 0) {
                                break b;
                              }
                              break l;
                            }
                            if (typeof g === "number") {
                              if (o.length === 0) {
                                break d;
                              }
                              return "(function(){\n" + o.join("") + "return " + ("" + g) + ";\n})()";
                            }
                            if (o.length === 0) {
                              break c;
                            }
                            return "(function(){\n" + o.join("") + "return " + g + ";\n})()";
                          }
                          return "(function(){\n" + o.join("") + "return null;\n})()";
                        }
                        if (k.length === 0) {
                          break b;
                        }
                      }
                      return "(function(){\n" + k.join("") + "return null;\n})()";
                    }
                    g = ["program", q];
                    d = ["value", null];
                    e = ["io", "x"];
                    a = ["", 0];
                    b = ["", 0];
                    c = ["", 0];
                    f = ["", 0];
                    j = ["", 0];
                    g = [g, d, e, a, b, c, f, j];
                    n = ["block", [["return", ["var", "value"]]]];
                    d = ["var", "program"];
                    d = ["dot", d, "length"];
                    e = ["lit", 0];
                    d = ["bin", "===", d, e];
                    d = ["if", d, n, null];
                    e = ["var", "program"];
                    a = ["lit", 0];
                    e = ["idx", e, a];
                    a = ["lit", "prompt"];
                    e = ["bin", "===", e, a];
                    a = ["var", "run"];
                    b = ["var", "program"];
                    b = ["dot", b, "slice"];
                    c = ["lit", 1];
                    c = [c];
                    b = ["call", b, c];
                    c = ["var", "io"];
                    c = ["dot", c, "prompt"];
                    f = [];
                    c = ["call", c, f];
                    f = ["var", "io"];
                    b = [b, c, f];
                    a = ["call", a, b];
                    a = ["return", a];
                    a = [a];
                    a = ["block", a];
                    e = ["if", e, a, null];
                    a = ["var", "io"];
                    a = ["dot", a, "print"];
                    b = ["var", "value"];
                    b = [b];
                    a = ["call", a, b];
                    a = ["expr", a];
                    b = ["var", "run"];
                    c = ["var", "program"];
                    c = ["dot", c, "slice"];
                    f = ["lit", 1];
                    f = [f];
                    c = ["call", c, f];
                    f = ["var", "value"];
                    j = ["var", "io"];
                    c = [c, f, j];
                    b = ["call", b, c];
                    b = ["return", b];
                    n = [d, e, a, b];
                    m = [["fundecl", "interp", ["program", "io"], [["return", ["call", ["var", "run"], [["var", "program"], ["lit", null], ["var", "io"]]]]]], ["fundecl", "run", ["program", "value", "io"], n]];
                    k = [];
                  }
                  e = 1;
                  c = m;
                  a = n;
                  f = k;
                  while (e < a.length) {
                    b = a[e];
                    d = b[0];
                    if (d === "return") {
                      g = __rf0(c, b[1], g, f);
                      if (g === null) {
                        break f;
                      }
                      if (typeof g === "number") {
                        if (k.length === 0) {
                          break h;
                        }
                        return "(function(){\n" + k.join("") + "return " + ("" + g) + ";\n})()";
                      }
                      if (k.length === 0) {
                        break g;
                      }
                      return "(function(){\n" + k.join("") + "return " + g + ";\n})()";
                    }
                    aB: {
                      if (d === "var" ? d === "var" : d === "assign") {
                        l = b[1];
                        g = __rf4(g, l, __rf0(c, b[2], g, f));
                        break aB;
                      }
                      if (d === "expr") {
                        __rf0(c, b[1], g, f);
                        break aB;
                      }
                      if (d === "if") {
                        i = b[3];
                        if (__rf0(c, b[1], g, f)) {
                          i = b[2];
                        }
                        if (i) {
                          g = __rf3(c, [i], g, f);
                          if (g[0]) {
                            g = g[1];
                            if (g === null) {
                              break f;
                            }
                            break e;
                          }
                          g = g[2];
                          break aB;
                        }
                        break aB;
                      }
                      if (d === "block") {
                        g = __rf3(c, b[1], g, f);
                        if (g[0]) {
                          g = g[1];
                          if (g === null) {
                            break f;
                          }
                          break e;
                        }
                        g = g[2];
                        break aB;
                      }
                      if (d === "while") {
                        while (__rf0(c, b[1], g, f)) {
                          g = __rf3(c, [b[2]], g, f);
                          if (g[0]) {
                            g = g[1];
                            if (g === null) {
                              break f;
                            }
                            break e;
                          }
                          g = g[2];
                        }
                      }
                      e += 1;
                      continue;
                    }
                    e += 1;
                  }
                  if (k.length === 0) {
                    break b;
                  }
                  break a;
                }
                return "" + g;
              }
              return g;
            }
            if (k.length === 0) {
              break b;
            }
            break a;
          }
          if (typeof g === "number") {
            if (k.length === 0) {
              break d;
            }
            return "(function(){\n" + k.join("") + "return " + ("" + g) + ";\n})()";
          }
          if (k.length === 0) {
            break c;
          }
          return "(function(){\n" + k.join("") + "return " + g + ";\n})()";
        }
        return "" + g;
      }
      return g;
    }
    return "null";
  }
  return "(function(){\n" + k.join("") + "return null;\n})()";
}

// compile(prog) returns a JS SOURCE STRING. To run it, make a native function.
module.exports = { compile: compile,
                   run: function(p,x){ return Function("x","return "+compile(p)+";")(x); } };
if (require.main === module) {
  var prog = JSON.parse(process.argv[2] || "[]");
  var src = compile(prog);
  console.log("compiled JS source:  function (x) { return " + src + "; }");
  if (process.argv[3] !== undefined)
    console.log("run(" + process.argv[3] + ") = " + Function("x","return "+src+";")(Number(process.argv[3])));
}
