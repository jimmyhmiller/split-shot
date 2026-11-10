// inputs: [0, 1, 2, 3, 4, 7]
// forbid-main: try|__rf|Error
// A function with a try is inlined; with known arguments its try folds, and an unused standard error made with a constant message is dropped.
function safeDiv(a,b){ try { if (b === 0) throw new Error("z"); return a / b; } catch (e) { return 0; } }
function main(x){ return safeDiv(12, 4) + safeDiv(1, 0) + x; }
