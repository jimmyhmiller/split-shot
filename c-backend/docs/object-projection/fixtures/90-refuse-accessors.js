// @case {"description": "Accessor objects are outside the data-property contract.", "mode": "refusal"}
function main(x) { return { get x() { return x; } }; }
