// How a call of `main` is observed, as source text: the same text runs in the
// Node oracle (tools/wild/oracle.mjs) and inside every `node:vm` context of
// tools/wild.js, so the original and the residual are shown by the same code
// in the realm their values live in.
//
//   __wildCall(main, json)   main(JSON.parse(json)) as a string: the result
//                            as JSON (with -0, NaN, the infinities, undefined
//                            and functions told apart), or `throw Name: message`
//   __wildTime(main, jsons, warm, iters, runs, now)
//                            the median over `runs` of the milliseconds
//                            `iters` passes over the inputs take, after
//                            `warm` passes; inputs are parsed before the clock
//                            starts
exports.OBSERVE_SRC = `
function __wildShow(v) {
  if (Object.is(v, -0)) return "-0";
  if (typeof v === "number" && !isFinite(v)) return String(v);
  if (v !== null && (typeof v === "object" || typeof v === "function") && typeof v.then === "function") return "<promise>";
  var s;
  try { s = JSON.stringify(v); } catch (e) { return "<unshowable: " + String(e && e.message) + ">"; }
  return s === undefined ? "<" + typeof v + ">" : s;
}
function __wildThrow(e) {
  if (e === null || (typeof e !== "object" && typeof e !== "function")) return "throw <" + typeof e + "> " + String(e);
  var name, message;
  try { name = String(e.name); message = String(e.message); } catch (x) { return "throw <unshowable>"; }
  return "throw " + name + ": " + message;
}
// (With WILD_TRACE: the input behind a proxy that records what is done to it
// and to every object read from it, in order; the record is part of what is
// compared. A residual that reads a property twice, late, or not at all,
// differs.)
var __wildTraceOn = (typeof __wildTraceEnv !== "undefined" && __wildTraceEnv === true) || (typeof process !== "undefined" && !!process.env && process.env.WILD_TRACE === "1");
function __wildTraced(v, log) {
  var seen = new WeakMap();
  var on = true;
  var show = function (k) { return typeof k === "symbol" ? k.toString() : JSON.stringify(k); };
  var wrap = function (x, path) {
    if (x === null || typeof x !== "object") return x;
    if (seen.has(x)) return seen.get(x);
    var p = new Proxy(x, {
      get: function (t, k) { if (on) log.push("get " + path + "." + show(k)); return wrap(Reflect.get(t, k), path + "." + show(k)); },
      set: function (t, k, y) { if (on) log.push("set " + path + "." + show(k)); return Reflect.set(t, k, y); },
      // (A test of a key is not recorded: the residual's for..in tests
      // each key it visits, where the engine's own asks for the key's
      // descriptor, which no ordinary object can tell apart.)
      deleteProperty: function (t, k) { if (on) log.push("delete " + path + "." + show(k)); return Reflect.deleteProperty(t, k); },
      ownKeys: function (t) { if (on) log.push("keys " + path); return Reflect.ownKeys(t); },
    });
    seen.set(x, p);
    return p;
  };
  return { value: wrap(v, "in"), stop: function () { on = false; } };
}
function __wildCall(main, json) {
  var input = JSON.parse(json);
  var out;
  if (__wildTraceOn) {
    var log = [];
    var t = __wildTraced(input, log);
    var shown;
    try { out = main(t.value); t.stop(); shown = __wildShow(out); } catch (e) { t.stop(); shown = __wildThrow(e); }
    return shown + " | trace(" + log.length + "): " + log.join("; ");
  }
  try { out = main(input); } catch (e) { return __wildThrow(e); }
  return __wildShow(out);
}
function __wildTime(main, jsons, warm, iters, runs, now) {
  function build(n) {
    var all = new Array(n * jsons.length);
    for (var i = 0; i < n; i++) for (var j = 0; j < jsons.length; j++) all[i * jsons.length + j] = JSON.parse(jsons[j]);
    return all;
  }
  function pass(all) {
    var sink = 0;
    for (var i = 0; i < all.length; i++) {
      try { var r = main(all[i]); if (r !== undefined) sink++; } catch (e) { sink--; }
    }
    return sink;
  }
  pass(build(warm));
  var times = [];
  for (var r = 0; r < runs; r++) {
    var all = build(iters);
    var t0 = now();
    pass(all);
    times.push(now() - t0);
  }
  times.sort(function (a, b) { return a - b; });
  return times[Math.floor(times.length / 2)];
}
`;
