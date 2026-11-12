// inputs: ["a,b", "x", ""]
// forbid-main: OPTIONS|\.sep|\.upper|\.prefix
// A configuration object the load code leaves that runtime code only reads
// (here through the callbacks a standard method calls) is known to `main`,
// though the same code writes other objects by key at runtime (the result
// it builds): only what runtime code may write, or hand to code it does not
// see, is runtime state.
const lib = (() => {
  const OPTIONS = { sep: ",", upper: true, prefix: { text: "k:" } };
  function parse(input, opts) {
    const out = {};
    input.split(opts.sep).forEach((part) => {
      const key = opts.prefix.text + (opts.upper ? part.toUpperCase() : part);
      out[key] = part.length;
    });
    return out;
  }
  return { run: (input) => parse(input, OPTIONS) };
})();
function main(input) {
  return JSON.stringify(lib.run(input));
}
