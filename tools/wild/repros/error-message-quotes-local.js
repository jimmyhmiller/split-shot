// From change-case (`input.slice(...)` given a number).
// V8 words this TypeError with the source text of the callee; the residual's
// locals have other names (also with --long-names: `v0.slice`).
//   original: main(5) throws TypeError: input.slice is not a function
//   residual: TypeError: a.slice is not a function
function main(input) { return input.slice(1); }
