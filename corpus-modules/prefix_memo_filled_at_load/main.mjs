// A cache `main` fills before anything depends on its input (a fixed
// template parsed once and kept) is filled at load: running that prefix of
// `main` again finds the cache filled and ends as the first run does, so
// every call, the first too, runs as the later ones do. The template's parse
// folds away. A counter `main` bumps on every call is not such a prefix: its
// second run differs from the first, and it stays runtime state.
const cache = {};
let calls = 0;
function parseTemplate(t) {
  if (cache[t]) return cache[t];
  const parts = t.split("{}");
  cache[t] = parts;
  return parts;
}
export function main(input) {
  const parts = parseTemplate("Hello {}! Bye {}.");
  const name = input && input.name;
  calls += 1;
  return parts[0] + name + parts[1] + name + parts[2] + " #" + calls;
}
