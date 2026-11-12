// Rob Pike's small regex algorithm, expressed in JavaScript with a pattern suffix
// instead of a C pattern pointer, and a text offset instead of a text pointer. Exposition by Brian Kernighan:
// https://www.cs.princeton.edu/courses/archive/spr09/cos333/beautiful.html
//
// Supports: literal characters, . (any character), * (repeat preceding
// character), ^ at the start, and $ at the end. No escaping or groups.
// Returns acceptance only. Star tries the shortest match first.
// JavaScript offsets count UTF-16 code units; string length replaces C's NUL.
function match(pattern, text) {
  if (pattern[0] === '^') {
    return matchHere(pattern.slice(1), text, 0);
  }

  // Include text.length: an empty pattern can match at end of input.
  let start = 0;
  do {
    if (matchHere(pattern, text, start)) return true;
  } while (start++ < text.length);

  return false;
}

function matchHere(pattern, text, textPos) {
  if (pattern.length === 0) return true;

  if (pattern[1] === '*') {
    return matchStar(pattern[0], pattern.slice(2), text, textPos);
  }

  if (pattern[0] === '$' && pattern.length === 1) {
    return textPos === text.length;
  }

  if (textPos < text.length &&
      (pattern[0] === '.' || pattern[0] === text[textPos])) {
    return matchHere(pattern.slice(1), text, textPos + 1);
  }

  return false;
}

function matchStar(character, pattern, text, textPos) {
  do {
    if (matchHere(pattern, text, textPos)) return true;
  } while (textPos < text.length &&
           (text[textPos++] === character || character === '.'));

  return false;
}

module.exports = { match, matchHere, matchStar };
