// inputs: [{"n":0}, {"n":3}, {"n":-40000}]
// forbid-main: getUTCFullYear|getUTCDate|setUTCDate|setUTCFullYear|getTime|JSON|instanceof|toString
// A Date of a known time value is modeled: its time value, its UTC fields read and set (with month and day overflow, an invalid date staying so), its ISO text and JSON, `instanceof` and its tag. Its local time is the runtime's time zone's and stays a runtime call; an invalid date's `toISOString` throws there.
function main(input) {
  var d = new Date(Date.UTC(2020, 1, 28, 23, 59, 59, 999));
  var e = new Date(d);
  e.setUTCDate(e.getUTCDate() + 1);
  var f = new Date(0);
  f.setUTCFullYear(-271821, 3, 20);
  var g = new Date(8.64e15 + 1);
  var h = new Date(NaN);
  h.setUTCHours(3);
  var y10k = new Date(Date.UTC(10000, 0, 1));
  var out = [
    d.getTime(), d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCDay(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds(),
    e.toISOString(), e - d, d < e, +e > +d, f.getTime(), isNaN(g.getTime()), isNaN(h.valueOf()),
    JSON.stringify({ d: d, g: g }), y10k.toISOString(), new Date(-1).toISOString(), d instanceof Date, Object.prototype.toString.call(d),
    new Date(true).getTime(), new Date(null).getTime(), typeof d, d.foo,
    new Date(Date.UTC(2020, 0, 31)).setUTCMonth(1), new Date(Date.UTC(2021, 0, 1)).setUTCSeconds(61, 1500)
  ];
  var z = new Date(input.n * 86400000);
  z.setUTCMinutes(90);
  out.push(z.toISOString(), z.getUTCDay());
  return out;
}
