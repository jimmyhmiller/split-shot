// A printf-style formatter. The format string is static and the arguments are
// dynamic, so specialization parses the format string away and leaves only the
// concatenation.
//
// Binding-time improvement: literal text collects in `lit`, which stays static,
// and is flushed into `out` only at a hole. Appending each character to `out`
// directly would also be correct, but `out` turns dynamic at the first hole, so
// every later character would be appended one at a time in the residual.
function format(fmt, args) {
  let out = "";
  let lit = "";
  let k = 0;
  let i = 0;
  while (i < fmt.length) {
    const c = fmt[i];
    if (c === "%" && fmt[i + 1] === "%") { lit = lit + "%"; i = i + 2; }
    else if (c === "%" && fmt[i + 1] === "s") { out = out + lit + args[k]; lit = ""; k = k + 1; i = i + 2; }
    else if (c === "%" && fmt[i + 1] === "d") { out = out + lit + (args[k] | 0); lit = ""; k = k + 1; i = i + 2; }
    else { lit = lit + c; i = i + 1; }
  }
  return out + lit;
}

function main(x) {
  return format("x = %d, x squared = %d (100%% computed)", [x, x * x]);
}
