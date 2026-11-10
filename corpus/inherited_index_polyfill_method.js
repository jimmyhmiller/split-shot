// inputs: [{"n": -3}, {"n": 0}, {"n": "proto"}]
// A method added to Array.prototype (a polyfill) is no index: arrays stay modeled.
Array.prototype.last = function(){ return this[this.length - 1]; };
function main(input){ var a = [1, 2, input.n]; return [a.last(), a[5], 0 in a]; }
