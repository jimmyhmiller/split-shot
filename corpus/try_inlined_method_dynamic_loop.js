// inputs: [0, 1, 2, 3, 4, 7]
// A method with a try, called with a callback in a loop of a runtime count, counting calls in a global.
var count = 0;
var obj = { safe(f, v) { try { count++; return f(v); } catch (e) { return "err"; } } };
function main(x){ var out = []; for (var i = 0; i < x; i++) out.push(obj.safe(function (v) { if (v % 2) throw 1; return v * 2; }, i)); return out.join(",") + ":" + count; }
