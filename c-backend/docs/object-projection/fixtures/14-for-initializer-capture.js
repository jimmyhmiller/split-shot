// @case {"description": "The for initializer environment differs from iteration environments."}
function main(x) {
  var out;
  for (let i = 0, f = () => i; i < 1; i++) { i = 5; out = f(); }
  return out;
}
