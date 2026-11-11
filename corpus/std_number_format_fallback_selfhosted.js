// inputs: [0, 1.5, 1234.5678, -0.000123, 1e21, 255.75]
// Number formatting where the self-hosted versions (prelude.js `__pe_std_Number_prototype_toFixed` and the rest) do not fold and the call stays the runtime's, with the same answer: a runtime number and a runtime digit count or radix.
function main(input) {
  var out = [];
  out.push(input.toFixed(2), input.toExponential(3), input.toPrecision(4), input.toString(16), input.toString(3), input.toFixed(), input.toExponential(), input.toPrecision());
  var n = typeof input === "number" && input >= 0 && input < 50 ? Math.floor(input) : 1;
  out.push((1234.5678).toFixed(n), (1234.5678).toExponential(n), (1234.5678).toPrecision(n + 1), (1234.5678).toString(n + 2));
  return out;
}
