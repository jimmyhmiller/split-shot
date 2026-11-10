// inputs: [0, 3, 300]
// after: [globalThis.out.constructor.name, globalThis.out.length, Array.from(globalThis.out).join(","), globalThis.view.byteOffset, Array.from(globalThis.view).join(","), globalThis.out.buffer === globalThis.view.buffer].join("|")
// Typed arrays: element conversion on store (static and runtime values),
// out-of-range reads and writes, views sharing a buffer (subarray), slice,
// fill, set, reverse, sort, the self-hosted read-only methods, iteration,
// TextDecoder over a Uint8Array, and materialization keeping views on one
// buffer.
function main(n) {
  var i8 = new Int8Array([127, 128, -129, 3.7]);
  var u8 = new Uint8Array(4);
  u8[0] = 257; u8[1] = -1; u8[2] = n; u8[5] = 9;
  var c8 = new Uint8ClampedArray([300, -5, 1.5, 2.5]);
  var i32 = new Int32Array([2147483648, 1.9, -1.9]);
  var f32 = new Float32Array([0.1, n / 3]);
  var t = new Int16Array(8);
  for (var k = 0; k < 8; k++) t[k] = k * 4000;
  var sub = t.subarray(2, 5);
  sub[0] = -1;
  var sl = t.slice(1, 3);
  sl[0] = 99;
  t.fill(n, 6);
  var u16 = new Uint16Array(3);
  u16.set([70000, n], 1);
  var r = new Float64Array([3, 1, NaN, -0, 0, 2]).sort();
  var sum = t.reduce(function (a, b) { return a + b; }, 0);
  var it = [];
  for (var x of new Uint8Array([5, 6, 7])) it.push(x);
  var text = new TextDecoder().decode(new Uint8Array([104, 105]));
  globalThis.out = t;
  globalThis.view = sub;
  return [Array.from(i8), Array.from(u8), u8[9], Array.from(c8), Array.from(i32), Array.from(f32), Array.from(t), Array.from(sub), Array.from(sl),
    Array.from(u16), Array.from(r).map(function (v) { return Object.is(v, -0) ? "-0" : v; }), sum, it, text, t.indexOf(n), t.includes(-1), t.join("-"),
    t.length, t.byteLength, sub.byteOffset, sub.buffer === t.buffer].join(";");
}
