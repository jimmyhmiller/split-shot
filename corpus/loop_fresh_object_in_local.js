// inputs: [0, 1, 2, 5, 9]
// A loop of a runtime count replaces the object in a local with a new one of the same shape on every iteration.
function main(n) { var p = { x: 0, y: 1 }; var i = 0; while (i < n) { p = { x: p.x + i, y: p.y * 2 }; i = i + 1; } return p.x + p.y; }
