// inputs: [0, 1, 2, 3, 4, 7, "2", null]
// forbid-main: \.(filter|map)\(
// A filter callback that pushes to the array it iterates and reads holes, and map with a thisArg.
function main(x){ var log = []; var a = [1, , 3]; var r = a.filter(function(v, i){ log.push(i); if (i === 0 && x > 2) a.push(9); return v > x; }); var self = {k: x}; var m = [1,2].map(function(v){ return this.k + v; }, self); return [r, log, a.length, m]; }
