// @case {"description": "instanceof with a right-hand side that is not callable, or whose prototype is not an object, and in applied to a primitive throw TypeError.", "errorNameOnly": true, "inputs": ["0", "1", "2"]}
function F() {}
function main(x) {
  if (x === 0) return {} instanceof {};
  if (x === 1) { F.prototype = 5; return {} instanceof F; }
  return "length" in "text";
}
