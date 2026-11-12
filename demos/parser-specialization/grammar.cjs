// These constructors build grammar data. They do not generate parser code.
function literal(text) {
  return { kind: 'literal', text };
}

function range(first, last) {
  return {
    kind: 'range',
    lo: first.charCodeAt(0),
    hi: last.charCodeAt(0),
  };
}

function characterSet(chars) {
  return { kind: 'set', chars };
}

function sequence(...items) {
  return items.reduceRight((right, left) => ({
    kind: 'sequence',
    left,
    right,
  }));
}

function choice(...items) {
  return items.reduceRight((right, left) => ({
    kind: 'choice',
    left,
    right,
  }));
}

function zeroOrMore(item) {
  return { kind: 'repeat', item, min: 0 };
}

function oneOrMore(item) {
  return { kind: 'repeat', item, min: 1 };
}

module.exports = {
  literal,
  range,
  characterSet,
  sequence,
  choice,
  zeroOrMore,
  oneOrMore,
};
