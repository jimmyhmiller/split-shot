// inputs: [0, 1, 2, 3, 4, 7, "2", null]
// forbid-main: \.every\(
// An every callback that throws on some elements, inside a try.
function main(x){ try { return [1,2,3].every(function(v){ if (v === x) throw new Error("hit " + v); return true; }); } catch (e) { return e.message; } }
