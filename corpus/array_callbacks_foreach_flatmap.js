// inputs: [0, 1, 2, 3, 4, 7, "2", null]
// forbid-main: \.(forEach|flatMap|map)\(
// forEach, flatMap and map with callbacks deciding at runtime.
function main(x){ var out = []; [3, 1, 2].forEach(function(v, i, arr){ if (v > x) out.push(v + i + arr.length); }); return [out, [1,2].flatMap(function(v){ return v > x ? [v, v] : []; }), [1,2,3].map(function(v){ return v > x ? "big" : v; })]; }
