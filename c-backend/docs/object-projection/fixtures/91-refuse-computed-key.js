// @case {"description": "Dynamic property names are outside the interned static-key contract.", "mode": "refusal"}
function main(x) { return { [x]: 1 }; }
