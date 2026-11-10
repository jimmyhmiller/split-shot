// @case {"description": "Dynamic eval is not part of the static guest program.", "mode": "refusal"}
function main(x) { return eval(x); }
