// @case {"description": "Const mutation is rejected explicitly.", "mode": "refusal"}
function main(x) { const y = x; y++; return y; }
