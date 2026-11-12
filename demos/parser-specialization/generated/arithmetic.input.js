function main(input) {
// A small PEG recognizer. Failure is -1; success is the next UTF-16 offset.
// Ordered choice backtracks; repetition is greedy and never backtracks.
function parse(node, text, pos) {
  if (node.kind === 'literal') {
    for (let i = 0; i < node.text.length; i++) {
      if (text[pos + i] !== node.text[i]) return -1;
    }
    return pos + node.text.length;
  }
  if (node.kind === 'set') {
    return pos < text.length && node.chars.indexOf(text[pos]) >= 0 ? pos + 1 : -1;
  }
  if (node.kind === 'range') {
    if (pos >= text.length) return -1;
    const c = text.charCodeAt(pos);
    return c >= node.lo && c <= node.hi ? pos + 1 : -1;
  }
  if (node.kind === 'sequence') {
    const next = parse(node.left, text, pos);
    return next < 0 ? -1 : parse(node.right, text, next);
  }
  if (node.kind === 'choice') {
    const next = parse(node.left, text, pos);
    return next >= 0 ? next : parse(node.right, text, pos);
  }
  if (node.kind === 'repeat') {
    let next = pos;
    let count = 0;
    while (true) {
      const end = parse(node.item, text, next);
      if (end < 0) break;
      if (end === next) throw new Error('Nullable repetition');
      next = end;
      count++;
    }
    return count >= node.min ? next : -1;
  }
  throw new Error('Unknown grammar node');
}

const grammar={
  "kind": "sequence",
  "left": {
    "kind": "repeat",
    "item": {
      "kind": "range",
      "lo": 48,
      "hi": 57
    },
    "min": 1
  },
  "right": {
    "kind": "repeat",
    "item": {
      "kind": "sequence",
      "left": {
        "kind": "choice",
        "left": {
          "kind": "literal",
          "text": "+"
        },
        "right": {
          "kind": "choice",
          "left": {
            "kind": "literal",
            "text": "-"
          },
          "right": {
            "kind": "choice",
            "left": {
              "kind": "literal",
              "text": "*"
            },
            "right": {
              "kind": "literal",
              "text": "/"
            }
          }
        }
      },
      "right": {
        "kind": "repeat",
        "item": {
          "kind": "range",
          "lo": 48,
          "hi": 57
        },
        "min": 1
      }
    },
    "min": 0
  }
};
return parse(grammar,input,0) === input.length;
}
