// inputs: [0, 1, 2, 3, 4, 7, "2", null]
// forbid-main: \.(filter|some|every|reduce|reduceRight)\(
// Array methods with callbacks whose results are runtime values, on arrays of a known length: each call of the callback is inlined.
function main(x){ var a = [1,2,3,4,5]; return [a.filter(function(v){ return v * x > 6; }), a.some(function(v){ return v === x; }), a.every(function(v){ return v < x; }), a.reduce(function(s, v){ return v % 2 ? s + v * x : s; }, 0), a.reduceRight(function(s, v){ return s + "" + (v > x ? v : "_"); }, "")]; }
