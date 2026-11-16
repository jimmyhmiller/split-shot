// A backtracking regular-expression matcher: literals, "." and "*".
// Specialize it to one pattern and the pattern is compiled away: each residual
// function is one state of the matcher, and it only looks at the text.
function matches(pattern, text) {
  if (pattern.length === 0) return text.length === 0;
  if (pattern.length > 1 && pattern[1] === "*") {
    if (matches(pattern.slice(2), text)) return true;
    return text.length > 0 && (pattern[0] === "." || pattern[0] === text[0]) && matches(pattern, text.slice(1));
  }
  return text.length > 0 && (pattern[0] === "." || pattern[0] === text[0]) && matches(pattern.slice(1), text.slice(1));
}
