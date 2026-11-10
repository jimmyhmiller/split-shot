// @case {"description": "Negative numeric array access has named-property JS behavior and must be refused outside the numeric-index ABI contract.", "mode": "runtime-refusal", "diagnostic": "array index outside intrinsic contract", "inputs": ["1"]}
function main(x) { var a = [x]; a[-1] = 7; return a[-1]; }
