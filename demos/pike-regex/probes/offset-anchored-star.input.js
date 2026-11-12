function main(input) {
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
const pattern = "^ab*c$";
return match(pattern, input);
}
