// A CommonJS module's state: `module.exports` made once, as `require` caches it.
let n = 0;
module.exports = { next() { return (n += 1); }, scale: (v) => v * 2 };
