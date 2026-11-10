// @case {"description": "A direct read before lexical initialization must not silently become undefined.", "mode": "refusal"}
function main(x) { return y; let y = x; }
