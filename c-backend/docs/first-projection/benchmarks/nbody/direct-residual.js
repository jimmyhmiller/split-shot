function main(q) {
  let c, e, b, d, a, i, j, k, m, l, f, g, h, n, o, p;
  c = Math.PI;
  e = (function Body(a, b, c, d, e, f, g) {
  this.x = a;
  this.y = b;
  this.z = c;
  this.vx = d;
  this.vy = e;
  this.vz = f;
  this.mass = g;
}).prototype;
  b = Object.create(e);
  b.x = 0;
  b.y = 0;
  b.z = 0;
  b.vx = 0;
  b.vy = 0;
  b.vz = 0;
  b.mass = 4 * c * c;
  d = Object.create(e);
  Object.defineProperties(d, {x: {value: 4.841431442464721, writable: true, enumerable: true, configurable: true}, y: {value: -1.1603200440274284, writable: true, enumerable: true, configurable: true}, z: {value: -0.10362204447112311, writable: true, enumerable: true, configurable: true}, vx: {value: 0.606326392995832, writable: true, enumerable: true, configurable: true}, vy: {value: 2.81198684491626, writable: true, enumerable: true, configurable: true}, vz: {value: -0.02521836165988763, writable: true, enumerable: true, configurable: true}, mass: {value: 0.0009547919384243266 * (4 * c * c), writable: true, enumerable: true, configurable: true}});
  a = Object.create(e);
  Object.defineProperties(a, {x: {value: 8.34336671824458, writable: true, enumerable: true, configurable: true}, y: {value: 4.124798564124305, writable: true, enumerable: true, configurable: true}, z: {value: -0.4035234171143214, writable: true, enumerable: true, configurable: true}, vx: {value: -1.0107743461787924, writable: true, enumerable: true, configurable: true}, vy: {value: 1.8256623712304119, writable: true, enumerable: true, configurable: true}, vz: {value: 0.008415761376584154, writable: true, enumerable: true, configurable: true}, mass: {value: 0.0002858859806661308 * (4 * c * c), writable: true, enumerable: true, configurable: true}});
  i = Object.create(e);
  Object.defineProperties(i, {x: {value: 12.894369562139131, writable: true, enumerable: true, configurable: true}, y: {value: -15.111151401698631, writable: true, enumerable: true, configurable: true}, z: {value: -0.22330757889265573, writable: true, enumerable: true, configurable: true}, vx: {value: 1.0827910064415354, writable: true, enumerable: true, configurable: true}, vy: {value: 0.8687130181696082, writable: true, enumerable: true, configurable: true}, vz: {value: -0.010832637401363636, writable: true, enumerable: true, configurable: true}, mass: {value: 0.00004366244043351563 * (4 * c * c), writable: true, enumerable: true, configurable: true}});
  e = Object.create(e);
  Object.defineProperties(e, {x: {value: 15.379697114850917, writable: true, enumerable: true, configurable: true}, y: {value: -25.919314609987964, writable: true, enumerable: true, configurable: true}, z: {value: 0.17925877295037118, writable: true, enumerable: true, configurable: true}, vx: {value: 0.979090732243898, writable: true, enumerable: true, configurable: true}, vy: {value: 0.5946989986476762, writable: true, enumerable: true, configurable: true}, vz: {value: -0.034755955504078104, writable: true, enumerable: true, configurable: true}, mass: {value: 0.000051513890204661145 * (4 * c * c), writable: true, enumerable: true, configurable: true}});
  e = Array(b, d, a, i, e);
  b = e.length;
  e = {value: e};
  d = 0;
  a = 0;
  i = 0;
  j = 0;
  while (j < b) {
    k = e.value[j];
    m = k.mass;
    d += k.vx * m;
    a += k.vy * m;
    i += k.vz * m;
    j += 1;
  }
  b = e.value[0];
  b.vx = -d / (4 * c * c);
  b.vy = -a / (4 * c * c);
  b.vz = -i / (4 * c * c);
  c = 0;
  while (c < q) {
    b = e.value.length;
    d = 0;
    while (d < b) {
      a = e.value[d];
      i = a.vx;
      j = a.vy;
      k = a.vz;
      m = d + 1;
      while (m < b) {
        l = e.value[m];
        f = a.x - l.x;
        g = a.y - l.y;
        h = a.z - l.z;
        n = Math.sqrt(f * f + g * g + h * h);
        o = l.mass;
        p = a.mass;
        l.vx += f * p * (0.01 / ((f * f + g * g + h * h) * n));
        l.vy += g * p * (0.01 / ((f * f + g * g + h * h) * n));
        l.vz += h * p * (0.01 / ((f * f + g * g + h * h) * n));
        i -= f * o * (0.01 / ((f * f + g * g + h * h) * n));
        j -= g * o * (0.01 / ((f * f + g * g + h * h) * n));
        k -= h * o * (0.01 / ((f * f + g * g + h * h) * n));
        m += 1;
      }
      a.vx = i;
      a.vy = j;
      a.vz = k;
      d += 1;
    }
    d = 0;
    while (d < b) {
      a = e.value[d];
      a.x += 0.01 * a.vx;
      a.y += 0.01 * a.vy;
      a.z += 0.01 * a.vz;
      d += 1;
    }
    c += 1;
  }
  c = e.value.length;
  b = 0;
  d = 0;
  while (d < c) {
    a = e.value[d];
    b += 0.5 * a.mass * (a.vx * a.vx + a.vy * a.vy + a.vz * a.vz);
    i = d + 1;
    while (i < c) {
      j = e.value[i];
      k = a.x - j.x;
      m = a.y - j.y;
      l = a.z - j.z;
      k = Math.sqrt(k * k + m * m + l * l);
      b -= a.mass * j.mass / k;
      i += 1;
    }
    d += 1;
  }
  return b;
}
