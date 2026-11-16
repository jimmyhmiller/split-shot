// Compiler derived from interpreter-reduce.js by specializing jsmix (RustPE, 82 blocks).
// Use:  node experiments/readable-second-projection/compiler-reduce.cjs '<program-json>' [input]
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
      if (c === null) {
        b = __rf1(b);
        if (a === "+") {
          return "(null + " + b + ")";
        }
        if (a === "-") {
          return "(null - " + b + ")";
        }
        return "(null * " + b + ")";
      }
      if (typeof c === "number") {
        b = __rf1(b);
        if (a === "+") {
          return "(" + ("" + c) + " + " + b + ")";
        }
        if (a === "-") {
          return "(" + ("" + c) + " - " + b + ")";
        }
        return "(" + ("" + c) + " * " + b + ")";
      }
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

function compile(k) {
  let g, d, j, i, e, c, a, h, b, l, f;
  g = k;
  d = "null";
  j = ["fundecl", "step", ["instruction", "value", "io"], [["if", ["bin", "===", ["var", "instruction"], ["lit", "prompt"]], ["block", [["return", ["call", ["dot", ["var", "io"], "prompt"], []]]]], null], ["expr", ["call", ["dot", ["var", "io"], "print"], [["var", "value"]]]], ["return", ["var", "value"]]]];
  i = ["value", "instruction"];
  e = ["var", "step"];
  c = ["var", "instruction"];
  a = ["var", "value"];
  h = ["var", "io"];
  c = [c, a, h];
  e = ["call", e, c];
  e = ["return", e];
  e = [e];
  i = ["fun", i, e];
  j = [j, ["fundecl", "interp", ["program", "io"], [["return", ["call", ["dot", ["var", "program"], "reduce"], [i, ["lit", null]]]]]]];
  e = [];
  c = [["program", k], ["io", "x"], ["", 0], ["", 0], ["", 0], ["", 0], ["", 0], ["", 0]];
  while (g.length > 0) {
    a = [];
    if (c[0][0] === "") {
      a: {
        a.push;
        h = ["value", d];
        l = i[2];
        a.push(h);
        b = 1;
        if (b === 0 ? c[1][0] === "" : b === 0) {
          a.push;
          a.push(["value", d]);
          b = 1;
          break a;
        }
        a.push(c[1]);
      }
      b: {
        if (b === 0 ? c[2][0] === "" : b === 0) {
          a.push;
          a.push(["value", d]);
          b = 1;
          break b;
        }
        a.push(c[2]);
      }
      c: {
        if (b === 0 ? c[3][0] === "" : b === 0) {
          a.push;
          a.push(["value", d]);
          b = 1;
          break c;
        }
        a.push(c[3]);
      }
      d: {
        if (b === 0 ? c[4][0] === "" : b === 0) {
          a.push;
          a.push(["value", d]);
          b = 1;
          break d;
        }
        a.push(c[4]);
      }
      e: {
        if (b === 0 ? c[5][0] === "" : b === 0) {
          a.push;
          a.push(["value", d]);
          b = 1;
          break e;
        }
        a.push(c[5]);
      }
      f: {
        if (b === 0 ? c[6][0] === "" : b === 0) {
          a.push;
          a.push(["value", d]);
          b = 1;
          break f;
        }
        a.push(c[6]);
      }
      g: {
        if (b === 0 ? c[7][0] === "" : b === 0) {
          a.push;
          a.push(["value", d]);
          break g;
        }
        a.push(c[7]);
      }
      h: {
        d = g[0];
        h = a[0][0] === "";
        f = a;
        a = [];
        if (h) {
          a.push;
          a.push(["instruction", d]);
          b = 1;
          break h;
        }
        a.push(f[0]);
        b = 0;
      }
      i: {
        if (b === 0 ? f[1][0] === "" : b === 0) {
          a.push;
          a.push(["instruction", d]);
          b = 1;
          break i;
        }
        a.push(f[1]);
      }
      j: {
        if (b === 0 ? f[2][0] === "" : b === 0) {
          a.push;
          a.push(["instruction", d]);
          b = 1;
          break j;
        }
        a.push(f[2]);
      }
      k: {
        if (b === 0 ? f[3][0] === "" : b === 0) {
          a.push;
          a.push(["instruction", d]);
          b = 1;
          break k;
        }
        a.push(f[3]);
      }
      l: {
        if (b === 0 ? f[4][0] === "" : b === 0) {
          a.push;
          a.push(["instruction", d]);
          b = 1;
          break l;
        }
        a.push(f[4]);
      }
      m: {
        if (b === 0 ? f[5][0] === "" : b === 0) {
          a.push;
          a.push(["instruction", d]);
          b = 1;
          break m;
        }
        a.push(f[5]);
      }
      n: {
        if (b === 0 ? f[6][0] === "" : b === 0) {
          a.push;
          a.push(["instruction", d]);
          b = 1;
          break n;
        }
        a.push(f[6]);
      }
      o: {
        if (b === 0 ? f[7][0] === "" : b === 0) {
          a.push;
          a.push(["instruction", d]);
          break o;
        }
        a.push(f[7]);
      }
      d = __rf3(j, l, a, e)[1];
      g = g.slice(1);
      continue;
    }
    p: {
      h = i[2];
      a.push(c[0]);
      b = 0;
      if (b === 0 ? c[1][0] === "" : b === 0) {
        a.push;
        a.push(["value", d]);
        b = 1;
        break p;
      }
      a.push(c[1]);
    }
    q: {
      if (b === 0 ? c[2][0] === "" : b === 0) {
        a.push;
        a.push(["value", d]);
        b = 1;
        break q;
      }
      a.push(c[2]);
    }
    r: {
      if (b === 0 ? c[3][0] === "" : b === 0) {
        a.push;
        a.push(["value", d]);
        b = 1;
        break r;
      }
      a.push(c[3]);
    }
    s: {
      if (b === 0 ? c[4][0] === "" : b === 0) {
        a.push;
        a.push(["value", d]);
        b = 1;
        break s;
      }
      a.push(c[4]);
    }
    t: {
      if (b === 0 ? c[5][0] === "" : b === 0) {
        a.push;
        a.push(["value", d]);
        b = 1;
        break t;
      }
      a.push(c[5]);
    }
    u: {
      if (b === 0 ? c[6][0] === "" : b === 0) {
        a.push;
        a.push(["value", d]);
        b = 1;
        break u;
      }
      a.push(c[6]);
    }
    v: {
      if (b === 0 ? c[7][0] === "" : b === 0) {
        a.push;
        a.push(["value", d]);
        break v;
      }
      a.push(c[7]);
    }
    d = __rf3(j, h, __rf2(a, "instruction", g[0]), e)[1];
    g = g.slice(1);
  }
  if (d === null) {
    if (e.length === 0) {
      return "null";
    }
    return "(function(){\n" + e.join("") + "return null;\n})()";
  }
  if (typeof d === "number") {
    if (e.length === 0) {
      return "" + d;
    }
    return "(function(){\n" + e.join("") + "return " + ("" + d) + ";\n})()";
  }
  if (e.length === 0) {
    return d;
  }
  return "(function(){\n" + e.join("") + "return " + d + ";\n})()";
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
