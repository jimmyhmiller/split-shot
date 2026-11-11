// From semver (`versions.forEach(...)` in maxSatisfying, given a string).
// The call `x.forEach(f)` is emitted as `c = x.forEach; c.call(x, f)`: when
// the method is missing, the TypeError is another one.
//   original: main("1.2.3") throws TypeError: versions.forEach is not a function
//   residual: TypeError: Cannot read properties of undefined (reading 'call')
function main(versions) { let max = null; versions.forEach((v) => { if (!max || v > max) max = v; }); return max; }
