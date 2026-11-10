// inputs: [{"n": -3}, {"n": 0}, {"n": "proto"}]
// An index written on Array.prototype through a computed key.
var k = "2";
Array.prototype[k] = "inherited";
function main(input){ var a = [1, 2]; return [a[2], a.length, a.join("-"), a.slice(0, 3)]; }
