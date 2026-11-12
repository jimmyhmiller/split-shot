// Rob Pike's small regex algorithm, expressed in JavaScript with offsets
// instead of C pointer arithmetic. Exposition by Brian Kernighan:
// https://www.cs.princeton.edu/courses/archive/spr09/cos333/beautiful.html
//
// Supports: literal characters, . (any character), * (repeat preceding
// character), ^ at the start, and $ at the end. No escaping or groups.
// Returns acceptance only. Star tries the shortest match first.
// JavaScript offsets count UTF-16 code units; string length replaces C's NUL.
function match(pattern, text) {
  if (pattern[0] === '^') {
    return matchHere(pattern, 1, text, 0);
  }

  // Include text.length: an empty pattern can match at end of input.
  let start = 0;
  do {
    if (matchHere(pattern, 0, text, start)) return true;
  } while (start++ < text.length);

  return false;
}

function matchHere(pattern, patternPos, text, textPos) {
  if (patternPos === pattern.length) return true;

  if (pattern[patternPos + 1] === '*') {
    return matchStar(pattern[patternPos], pattern, patternPos + 2, text, textPos);
  }

  if (pattern[patternPos] === '$' && patternPos + 1 === pattern.length) {
    return textPos === text.length;
  }

  if (textPos < text.length &&
      (pattern[patternPos] === '.' || pattern[patternPos] === text[textPos])) {
    return matchHere(pattern, patternPos + 1, text, textPos + 1);
  }

  return false;
}

function matchStar(character, pattern, patternPos, text, textPos) {
  do {
    if (matchHere(pattern, patternPos, text, textPos)) return true;
  } while (textPos < text.length &&
           (text[textPos++] === character || character === '.'));

  return false;
}

module.exports = { match, matchHere, matchStar };
