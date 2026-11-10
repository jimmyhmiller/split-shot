// inputs: [0, 1, 2, 3, 4, 7]
// forbid-main: __rf
// An inlined function whose try stays at runtime (JSON.parse may throw) and returns from inside it: the return leaves through the dispatch after the try.
function parse(s){ var r = 0; try { r = JSON.parse(s); if (r > 10) return "big"; } catch (e) { r = -1; } return "v" + r; }
function main(x){ return [parse("5"), parse(String(x)), parse("{"), parse("" + (x * 3))]; }
