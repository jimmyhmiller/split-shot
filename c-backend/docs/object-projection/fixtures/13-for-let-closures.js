// @case {"description": "Each captured for-let iteration gets its own copied lexical environment."}
function main(x) {
  var f, g, h;
  for (let i = 0; i < 3; i++) {
    if (i === 0) f = () => i + x;
    else if (i === 1) g = () => i + x;
    else h = () => i + x;
  }
  return [f(), g(), h()];
}
