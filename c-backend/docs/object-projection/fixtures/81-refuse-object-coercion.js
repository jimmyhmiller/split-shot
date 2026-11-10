// @case {"description": "Custom valueOf coercion requires guest execution and is deliberately outside primitive arithmetic semantics.", "mode": "runtime-refusal", "diagnostic": "object coercion requires guest lowering", "inputs": ["3"]}
function main(x) { var a = { valueOf: function() { return x; } }; return a + 1; }
