// inputs: [{"flag":true,"k":"x"}, {"flag":false,"k":"y"}]
// forbid: \.value
// A closure made on one path out of a runtime branch is still made at most once per call: only a runtime loop (or a residual function's body) makes one any number of times. So a variable it captures that is assigned once, after the closure is made, is given by its final value, not as a cell read at every call.
function main(input) {
  var log = [];
  if (input.flag) { log.push(input.k); } else { return ["none"]; }
  var look = function (k) { return table[k] * scale; };
  var table = { x: 1, y: 2 };
  var scale = 10;
  return [log, look(input.k), look];
}
