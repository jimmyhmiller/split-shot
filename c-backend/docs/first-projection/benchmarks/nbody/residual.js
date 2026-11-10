function main(q) {
  let n, c, a, b, d, f, e, l, k, i, r, m, j, p, h, o, g;
  n = [null, [q, void 0, void 0, void 0, void 0, void 0, void 0, void 0, void 0, void 0, void 0, 3.141592653589793, 39.47841760435743, 365.24, [{x: 0, y: 0, z: 0, vx: -0.00038766340719874267, vy: -0.0032753590371765707, vz: 0.000023935734080003, mass: 39.47841760435743}, {x: 4.841431442464721, y: -1.1603200440274284, z: -0.10362204447112311, vx: 0.606326392995832, vy: 2.81198684491626, vz: -0.02521836165988763, mass: 0.03769367487038949}, {x: 8.34336671824458, y: 4.124798564124305, z: -0.4035234171143214, vx: -1.0107743461787924, vy: 1.8256623712304119, vz: 0.008415761376584154, mass: 0.011286326131968767}, {x: 12.894369562139131, y: -15.111151401698631, z: -0.22330757889265573, vx: 1.0827910064415354, vy: 0.8687130181696082, vz: -0.010832637401363636, mass: 0.0017237240570597112}, {x: 15.379697114850917, y: -25.919314609987964, z: 0.17925877295037118, vx: 0.979090732243898, vy: 0.5946989986476762, vz: -0.034755955504078104, mass: 0.0020336868699246304}]], void 0];
  c = [n, [0], void 0];
  a: while (true) {
    a = c[1][0];
    b = c[0];
    d = b[1][0];
    if (a < d) {
      c[1] = c[1];
      b = c[0];
      f = b[1][14];
      e = f.length;
      l = c;
      k = [b, [0.01, e], void 0];
      c = [k, [0], void 0];
      b: while (true) {
        a = c[1][0];
        b = c[0];
        d = b[1][1];
        if (a < d) {
          c[1] = c[1];
          i = c[2];
          b = c[0];
          b = b[0];
          f = b[1][14];
          c: {
            a = c[1][0];
            if (a === "length") {
              e = f.length;
              break c;
            }
            e = f[a];
          }
          b = e;
          e = e["vx"];
          d = e;
          e = b["vy"];
          f = e;
          e = b["vz"];
          a = c[1][0];
          a + 1;
          r = c;
          m = [c, [b, d, f, e], i];
          c = [m, [a + 1], i];
          while (true) {
            a = c[1][0];
            b = c[0];
            b = b[0];
            b = b[0];
            d = b[1][1];
            if (a < d) {
              c[1] = c[1];
              c[2];
              b = c[0];
              b = b[0];
              b = b[0];
              b = b[0];
              f = b[1][14];
              d: {
                a = c[1][0];
                if (a === "length") {
                  e = f.length;
                  break d;
                }
                e = f[a];
              }
              b = c[0];
              f = b[1][0];
              a = f["x"];
              d = e["x"];
              a - d;
              b = c[0];
              f = b[1][0];
              i = a - d;
              a = f["y"];
              d = e["y"];
              a - d;
              b = c[0];
              f = b[1][0];
              j = a - d;
              a = f["z"];
              d = e["z"];
              a - d;
              i * i + j * j + (a - d) * (a - d);
              b = c[0];
              b = b[0];
              b = b[0];
              p = a - d;
              d = i * i + j * j + (a - d) * (a - d);
              a = b[1][0];
              h = Math.sqrt(d);
              a / (d * h);
              o = e;
              e = e["mass"];
              b = c[0];
              g = b[1][1];
              b = c[0];
              (b[1])[1] = g - i * e * (a / (d * h));
              g - i * e * (a / (d * h));
              g - i * e * (a / (d * h));
              b = c[0];
              g = b[1][2];
              b = c[0];
              (b[1])[2] = g - j * e * (a / (d * h));
              g - j * e * (a / (d * h));
              g - j * e * (a / (d * h));
              b = c[0];
              g = b[1][3];
              b = c[0];
              (b[1])[3] = g - p * e * (a / (d * h));
              g - p * e * (a / (d * h));
              g - p * e * (a / (d * h));
              b = c[0];
              f = b[1][0];
              e = f["mass"];
              g = o["vx"];
              o["vx"] = g + i * e * (a / (d * h));
              g + i * e * (a / (d * h));
              g = o["vy"];
              o["vy"] = g + j * e * (a / (d * h));
              g + j * e * (a / (d * h));
              g = o["vz"];
              o["vz"] = g + p * e * (a / (d * h));
              g + p * e * (a / (d * h));
              b = [];
              a = 0;
              while (a < (c[1]).length) {
                b[a] = c[1][a];
                a += 1;
              }
              a = c[0];
              c = c[2];
              d = b[0] - 0;
              b[0] = d + 1;
              c = [a, b, c];
              continue;
            }
            c = m[1][0];
            a = m[1][1];
            c["vx"] = a;
            c = m[1][0];
            a = m[1][2];
            c["vy"] = a;
            c = m[1][0];
            a = m[1][3];
            c["vz"] = a;
            b = [];
            a = 0;
            c = r;
            while (a < (c[1]).length) {
              b[a] = c[1][a];
              a += 1;
            }
            a = c[0];
            c = c[2];
            d = b[0] - 0;
            b[0] = d + 1;
            c = [a, b, c];
            continue b;
          }
        }
        i = k[2];
        c = [k, [0], i];
        while (true) {
          a = c[1][0];
          b = c[0];
          d = b[1][1];
          if (a < d) {
            c[1] = c[1];
            c[2];
            b = c[0];
            b = b[0];
            f = b[1][14];
            e: {
              a = c[1][0];
              if (a === "length") {
                e = f.length;
                break e;
              }
              e = f[a];
            }
            g = e["x"];
            b = c[0];
            a = b[1][0];
            d = e["vx"];
            e["x"] = g + a * d;
            g + a * d;
            g = e["y"];
            b = c[0];
            a = b[1][0];
            d = e["vy"];
            e["y"] = g + a * d;
            g + a * d;
            g = e["z"];
            b = c[0];
            a = b[1][0];
            d = e["vz"];
            e["z"] = g + a * d;
            g + a * d;
            b = [];
            a = 0;
            while (a < (c[1]).length) {
              b[a] = c[1][a];
              a += 1;
            }
            a = c[0];
            c = c[2];
            d = b[0] - 0;
            b[0] = d + 1;
            c = [a, b, c];
            continue;
          }
          b = [];
          a = 0;
          c = l;
          while (a < (c[1]).length) {
            b[a] = c[1][a];
            a += 1;
          }
          a = c[0];
          c = c[2];
          d = b[0] - 0;
          b[0] = d + 1;
          c = [a, b, c];
          continue a;
        }
      }
    }
    f = n[1][14];
    e = f.length;
    k = [0, e];
    n = [n, k, void 0];
    c = [n, [0], void 0];
    f: while (true) {
      a = c[1][0];
      b = c[0];
      d = b[1][1];
      if (a < d) {
        c[1] = c[1];
        i = c[2];
        b = c[0];
        b = b[0];
        f = b[1][14];
        g: {
          a = c[1][0];
          if (a === "length") {
            e = f.length;
            break g;
          }
          e = f[a];
        }
        b = c[0];
        g = b[1][0];
        d = e["mass"];
        a = e["vx"];
        f = 0.5 * d;
        d = e["vx"];
        b = a * d;
        a = e["vy"];
        d = e["vy"];
        l = b + a * d;
        a = e["vz"];
        d = e["vz"];
        b = c[0];
        (b[1])[0] = g + f * (l + a * d);
        g + f * (l + a * d);
        g + f * (l + a * d);
        a = c[1][0];
        a + 1;
        l = c;
        c = [[c, [e], i], [a + 1], i];
        while (true) {
          a = c[1][0];
          b = c[0];
          b = b[0];
          b = b[0];
          d = b[1][1];
          if (a < d) {
            c[1] = c[1];
            c[2];
            b = c[0];
            b = b[0];
            b = b[0];
            b = b[0];
            f = b[1][14];
            h: {
              a = c[1][0];
              if (a === "length") {
                e = f.length;
                break h;
              }
              e = f[a];
            }
            b = c[0];
            f = b[1][0];
            a = f["x"];
            d = e["x"];
            a - d;
            b = c[0];
            f = b[1][0];
            k = a - d;
            a = f["y"];
            d = e["y"];
            a - d;
            b = c[0];
            f = b[1][0];
            b = a - d;
            a = f["z"];
            d = e["z"];
            a - d;
            h = Math.sqrt(k * k + b * b + (a - d) * (a - d));
            b = c[0];
            b = b[0];
            b = b[0];
            g = b[1][0];
            b = c[0];
            f = b[1][0];
            a - d;
            a = f["mass"];
            d = e["mass"];
            b = c[0];
            b = b[0];
            b = b[0];
            (b[1])[0] = g - a * d / h;
            g - a * d / h;
            g - a * d / h;
            b = [];
            a = 0;
            while (a < (c[1]).length) {
              b[a] = c[1][a];
              a += 1;
            }
            a = c[0];
            c = c[2];
            d = b[0] - 0;
            b[0] = d + 1;
            c = [a, b, c];
            continue;
          }
          b = [];
          a = 0;
          c = l;
          while (a < (c[1]).length) {
            b[a] = c[1][a];
            a += 1;
          }
          a = c[0];
          c = c[2];
          d = b[0] - 0;
          b[0] = d + 1;
          c = [a, b, c];
          continue f;
        }
      }
      return n[1][0];
    }
  }
}
