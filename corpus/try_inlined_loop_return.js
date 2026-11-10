// inputs: [0, 1, 2, 3, 4, 7]
// forbid-main: __rf
// A return from a try inside a loop of an inlined function.
function find(arr, k){ for (var i = 0; i < arr.length; i++) { try { if (arr[i].key === k) return i; } catch (e) { return -2; } } return -1; }
function main(x){ var a = [{key: 1}, {key: x}, x > 5 ? null : {key: 3}]; return [find(a, 1), find(a, 3), find(a, 99), find([{key:1},{key:2}], 2)]; }
