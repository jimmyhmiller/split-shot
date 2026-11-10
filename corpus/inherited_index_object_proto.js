// inputs: [{"n": -3}, {"n": 0}, {"n": "proto"}]
// An index on Object.prototype, seen through an array hole, by in, indexOf and a read past the end.
Object.prototype[1] = "proto";
function main(input){ var a = [input.n, , 3]; var b = []; b.push(input.n); return [a[1], 1 in a, a.indexOf("proto"), b[1], b.length, [5].concat(a).length, JSON.stringify(a)]; }
