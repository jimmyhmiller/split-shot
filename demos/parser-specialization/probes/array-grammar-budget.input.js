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
  if (node.kind === 'range') {
    if (pos >= text.length) return -1;
    const c = text.charCodeAt(pos);
    return c >= node.lo && c <= node.hi ? pos + 1 : -1;
  }
  if (node.kind === 'sequence') {
    let next = pos;
    for (let i = 0; i < node.items.length; i++) {
      next = parse(node.items[i], text, next);
      if (next < 0) return -1;
    }
    return next;
  }
  if (node.kind === 'choice') {
    for (let i = 0; i < node.items.length; i++) {
      const next = parse(node.items[i], text, pos);
      if (next >= 0) return next;
    }
    return -1;
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

const grammar={"kind":"sequence","items":[{"kind":"repeat","item":{"kind":"choice","items":[{"kind":"range","lo":97,"hi":122},{"kind":"range","lo":65,"hi":90},{"kind":"literal","text":"_"}]},"min":1},{"kind":"literal","text":"="},{"kind":"repeat","item":{"kind":"range","lo":48,"hi":57},"min":1},{"kind":"repeat","item":{"kind":"sequence","items":[{"kind":"literal","text":";"},{"kind":"repeat","item":{"kind":"choice","items":[{"kind":"range","lo":97,"hi":122},{"kind":"range","lo":65,"hi":90},{"kind":"literal","text":"_"}]},"min":1},{"kind":"literal","text":"="},{"kind":"repeat","item":{"kind":"range","lo":48,"hi":57},"min":1}]},"min":0}]};
return parse(grammar,input,0) === input.length;
}
