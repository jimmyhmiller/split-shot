// @case {"description": "Magic prototype access is outside plain data-property semantics.", "mode": "refusal"}
function main(x) { return x.__proto__; }
