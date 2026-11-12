// style: JSONPath evaluator (path strings parsed at load into segment lists and filter-expression trees, evaluated node-set by node-set)
// residue: "Path(Child|Wildcard|Index|Slice|Filter|Descendant)"|"Filter(Or|And|Not|Compare|Exists|Field|Literal)"
// A JSONPath subset: $, .name, ['name'], .*, [*], ..selector, [n] (negative
// from the end), [start:end:step], [?(filter)] with && || ! == != < <= > >=,
// @.field.paths, numbers, 'strings', true/false/null, and bare @.field as an
// existence test. A fixed set of queries over a store's catalogue is parsed
// once; each call runs all of them over the input document.
const QUERIES = {
  cheapFiction: "$.store.book[?(@.price < 10 && @.category == 'fiction')].title",
  authors: "$..author",
  lastTwoIsbns: "$.store.book[-2:].isbn",
  everyOtherTitle: "$.store.book[::2]['title']",
  pricedWithIsbn: "$..book[?(@.isbn && !(@.price >= 20))].price",
  firstTags: "$.store.book[*].tags[0]",
  allPrices: "$.store..price",
  inStockOrRed: "$.store.*[?(@.inStock == true || @.color == 'red')].sku",
};

function parsePath(src) {
  let i = 0;
  const peek = () => src[i];
  const fail = (msg) => { throw new SyntaxError(msg + " at " + i + " in " + src); };
  const isNameChar = (c) => c !== undefined && /[A-Za-z0-9_$]/.test(c);
  const readName = () => {
    const start = i;
    while (isNameChar(src[i])) i++;
    if (i === start) fail("expected a name");
    return src.slice(start, i);
  };
  const skipWs = () => { while (src[i] === " ") i++; };
  const readNumber = () => {
    const start = i;
    if (src[i] === "-") i++;
    while (src[i] >= "0" && src[i] <= "9") i++;
    if (src[i] === ".") { i++; while (src[i] >= "0" && src[i] <= "9") i++; }
    if (i === start) fail("expected a number");
    return Number(src.slice(start, i));
  };
  const readString = () => {
    const quote = src[i++];
    let s = "";
    while (src[i] !== quote) {
      if (i >= src.length) fail("unterminated string");
      if (src[i] === "\\") i++;
      s += src[i++];
    }
    i++;
    return s;
  };

  // filter expressions: or <- and ('||' and)*; and <- unary ('&&' unary)*
  const parseOperand = () => {
    skipWs();
    const c = peek();
    if (c === "@") {
      i++;
      const fields = [];
      while (peek() === ".") { i++; fields.push(readName()); }
      return { type: "FilterField", fields };
    }
    if (c === "'" || c === "\"") return { type: "FilterLiteral", value: readString() };
    if (c === "-" || (c >= "0" && c <= "9")) return { type: "FilterLiteral", value: readNumber() };
    const word = readName();
    if (word === "true") return { type: "FilterLiteral", value: true };
    if (word === "false") return { type: "FilterLiteral", value: false };
    if (word === "null") return { type: "FilterLiteral", value: null };
    return fail("unexpected " + word);
  };
  const parseUnary = () => {
    skipWs();
    if (peek() === "!") { i++; return { type: "FilterNot", arg: parseUnary() }; }
    if (peek() === "(") {
      i++;
      const e = parseOr();
      skipWs();
      if (src[i++] !== ")") fail("expected )");
      return e;
    }
    const left = parseOperand();
    skipWs();
    const two = src.slice(i, i + 2);
    let op = null;
    if (two === "==" || two === "!=" || two === "<=" || two === ">=") op = two;
    else if (peek() === "<" || peek() === ">") op = peek();
    if (op === null) {
      if (left.type !== "FilterField") fail("a literal is not a test");
      return { type: "FilterExists", field: left };
    }
    i += op.length;
    return { type: "FilterCompare", op, left, right: parseOperand() };
  };
  const parseAnd = () => {
    let e = parseUnary();
    for (;;) {
      skipWs();
      if (src.slice(i, i + 2) !== "&&") return e;
      i += 2;
      e = { type: "FilterAnd", left: e, right: parseUnary() };
    }
  };
  const parseOr = () => {
    let e = parseAnd();
    for (;;) {
      skipWs();
      if (src.slice(i, i + 2) !== "||") return e;
      i += 2;
      e = { type: "FilterOr", left: e, right: parseAnd() };
    }
  };

  const parseBracket = () => {
    i++; // [
    skipWs();
    let seg;
    if (peek() === "?") {
      i++;
      if (src[i++] !== "(") fail("expected ( after ?");
      const expr = parseOr();
      skipWs();
      if (src[i++] !== ")") fail("expected ) to close filter");
      seg = { type: "PathFilter", expr };
    } else if (peek() === "*") {
      i++;
      seg = { type: "PathWildcard" };
    } else if (peek() === "'" || peek() === "\"") {
      seg = { type: "PathChild", name: readString() };
    } else {
      const parts = [null, null, null];
      let k = 0;
      for (;;) {
        skipWs();
        if (peek() !== ":" && peek() !== "]") parts[k] = readNumber();
        skipWs();
        if (peek() !== ":") break;
        i++;
        k++;
        if (k > 2) fail("too many colons");
      }
      if (k === 0) {
        if (parts[0] === null) fail("empty index");
        seg = { type: "PathIndex", index: parts[0] };
      } else {
        seg = { type: "PathSlice", start: parts[0], end: parts[1], step: parts[2] === null ? 1 : parts[2] };
      }
    }
    skipWs();
    if (src[i++] !== "]") fail("expected ]");
    return seg;
  };

  const parseSelector = () => {
    if (peek() === "[") return parseBracket();
    if (peek() === "*") { i++; return { type: "PathWildcard" }; }
    return { type: "PathChild", name: readName() };
  };

  if (src[i++] !== "$") fail("a path starts with $");
  const segments = [];
  while (i < src.length) {
    if (src.startsWith("..", i)) {
      i += 2;
      segments.push({ type: "PathDescendant", selector: parseSelector() });
    } else if (peek() === ".") {
      i++;
      segments.push(parseSelector());
    } else if (peek() === "[") {
      segments.push(parseBracket());
    } else {
      fail("unexpected " + peek());
    }
  }
  return segments;
}

function isObject(v) {
  return v !== null && typeof v === "object";
}

function fieldOf(node, fields) {
  let v = node;
  for (const f of fields) {
    if (!isObject(v) || !Object.prototype.hasOwnProperty.call(v, f)) return undefined;
    v = v[f];
  }
  return v;
}

function evalFilter(e, node) {
  switch (e.type) {
    case "FilterOr": return evalFilter(e.left, node) || evalFilter(e.right, node);
    case "FilterAnd": return evalFilter(e.left, node) && evalFilter(e.right, node);
    case "FilterNot": return !evalFilter(e.arg, node);
    case "FilterExists": return fieldOf(node, e.field.fields) !== undefined;
    case "FilterCompare": {
      const a = operand(e.left, node);
      const b = operand(e.right, node);
      if (a === undefined || b === undefined) return false;
      switch (e.op) {
        case "==": return a === b;
        case "!=": return a !== b;
        case "<": return typeof a === typeof b && a < b;
        case "<=": return typeof a === typeof b && a <= b;
        case ">": return typeof a === typeof b && a > b;
        case ">=": return typeof a === typeof b && a >= b;
      }
      throw new Error("bad operator " + e.op);
    }
  }
  throw new Error("bad filter node " + e.type);
}

function operand(e, node) {
  if (e.type === "FilterLiteral") return e.value;
  if (e.type === "FilterField") return fieldOf(node, e.fields);
  throw new Error("bad operand " + e.type);
}

function children(node) {
  if (Array.isArray(node)) return node;
  if (isObject(node)) return Object.values(node);
  return [];
}

function collectDescendants(node, out) {
  out.push(node);
  for (const c of children(node)) collectDescendants(c, out);
}

function select(seg, node, out) {
  switch (seg.type) {
    case "PathChild":
      if (isObject(node) && !Array.isArray(node) && Object.prototype.hasOwnProperty.call(node, seg.name)) out.push(node[seg.name]);
      break;
    case "PathWildcard":
      for (const c of children(node)) out.push(c);
      break;
    case "PathIndex":
      if (Array.isArray(node)) {
        const k = seg.index < 0 ? node.length + seg.index : seg.index;
        if (k >= 0 && k < node.length) out.push(node[k]);
      }
      break;
    case "PathSlice": {
      if (!Array.isArray(node)) break;
      const n = node.length;
      const norm = (v, dflt) => (v === null ? dflt : v < 0 ? Math.max(n + v, 0) : Math.min(v, n));
      const step = seg.step;
      if (step <= 0) throw new Error("slice step must be positive");
      for (let k = norm(seg.start, 0); k < norm(seg.end, n); k += step) out.push(node[k]);
      break;
    }
    case "PathFilter":
      for (const c of children(node)) if (evalFilter(seg.expr, c)) out.push(c);
      break;
    case "PathDescendant": {
      const all = [];
      collectDescendants(node, all);
      for (const d of all) select(seg.selector, d, out);
      break;
    }
    default:
      throw new Error("bad segment " + seg.type);
  }
}

function query(segments, doc) {
  let nodes = [doc];
  for (const seg of segments) {
    const next = [];
    for (const n of nodes) select(seg, n, next);
    nodes = next;
  }
  return nodes;
}

const COMPILED = Object.keys(QUERIES).map((name) => [name, parsePath(QUERIES[name])]);

export function main(input) {
  const result = {};
  for (const [name, segments] of COMPILED) result[name] = query(segments, input);
  return result;
}

export const inputs = [{},{"store":{}},{"store":{"book":[]}},{"store":{"book":{"not":"an array"},"bicycle":{"color":"red","sku":"X"}}},{"store":{"book":[{"category":"reference","author":"Herman Melville","title":"Book 0","price":4.99,"tags":["myth","myth","sea"],"sku":"B0","inStock":true},{"category":"reference","author":"Herman Melville","title":"Book 1","price":10.99,"tags":[],"sku":"B1","inStock":true,"isbn":"0-140-45759-3"},{"category":"fiction","author":"J. R. R. Tolkien","title":"Book 2","price":21.99,"tags":[],"sku":"B2","inStock":false},{"category":"poetry","author":"Herman Melville","title":"Book 3","price":10.99,"tags":[],"sku":"B3","inStock":true}],"bicycle":{"color":"blue","price":19.95,"sku":"BIKE","inStock":false},"music":[{"author":"Bach","price":9.99,"sku":"M1","inStock":true}]},"expensive":10},{"store":{"book":[{"category":"fiction","author":"Nigel Rees","title":"Book 0","price":17.99,"tags":[],"sku":"B0","inStock":false},{"category":"fiction","author":"Herman Melville","title":"Book 1","price":12.99,"tags":["sea"],"sku":"B1","inStock":true},{"category":"poetry","author":"Evelyn Waugh","title":"Book 2","price":13.99,"tags":["classic","war"],"sku":"B2","inStock":false,"isbn":"0-582-64049-3"},{"category":"fiction","author":"Nigel Rees","title":"Book 3","price":9.99,"tags":["sea","classic"],"sku":"B3","inStock":true,"isbn":"0-404-10076-4"},{"category":"poetry","author":"J. R. R. Tolkien","title":"Book 4","price":26.99,"tags":["sea"],"sku":"B4","inStock":true,"isbn":"0-739-54018-0"},{"category":"reference","author":"J. R. R. Tolkien","title":"Book 5","price":6.99,"tags":["classic","war"],"sku":"B5","inStock":true},{"category":"poetry","author":"Nigel Rees","title":"Book 6","price":13.99,"tags":["war","sea","sea"],"sku":"B6","inStock":false},{"category":"reference","author":"Herman Melville","title":"Book 7","price":14.99,"tags":["myth","myth"],"sku":"B7","inStock":true,"isbn":"0-102-52053-4"},{"category":"fiction","author":"J. R. R. Tolkien","title":"Book 8","price":10.99,"tags":["myth"],"sku":"B8","inStock":true},{"category":"fiction","author":"J. R. R. Tolkien","title":"Book 9","price":24.99,"tags":["classic","war"],"sku":"B9","inStock":false},{"category":"fiction","author":"Evelyn Waugh","title":"Book 10","price":27.99,"tags":[],"sku":"B10","inStock":false,"isbn":"0-506-64763-0"},{"category":"fiction","author":"Nigel Rees","title":"Book 11","price":19.99,"tags":["sea","classic"],"sku":"B11","inStock":false},{"category":"poetry","author":"Herman Melville","title":"Book 12","price":5.99,"tags":["classic"],"sku":"B12","inStock":false,"isbn":"0-536-49560-4"},{"category":"fiction","author":"Herman Melville","title":"Book 13","price":8.99,"tags":["sea","myth","sea"],"sku":"B13","inStock":true,"isbn":"0-359-66923-4"},{"category":"fiction","author":"Evelyn Waugh","title":"Book 14","price":22.99,"tags":["war"],"sku":"B14","inStock":false},{"category":"fiction","author":"Herman Melville","title":"Book 15","price":28.99,"tags":[],"sku":"B15","inStock":true,"isbn":"0-478-85065-6"},{"category":"fiction","author":"J. R. R. Tolkien","title":"Book 16","price":23.99,"tags":["classic","myth"],"sku":"B16","inStock":true,"isbn":"0-538-59895-2"},{"category":"poetry","author":"J. R. R. Tolkien","title":"Book 17","price":5.99,"tags":["classic"],"sku":"B17","inStock":false},{"category":"poetry","author":"J. R. R. Tolkien","title":"Book 18","price":11.99,"tags":["sea","classic"],"sku":"B18","inStock":false,"isbn":"0-411-90660-2"},{"category":"poetry","author":"Evelyn Waugh","title":"Book 19","price":20.99,"tags":[],"sku":"B19","inStock":true,"isbn":"0-220-68377-1"},{"category":"poetry","author":"Herman Melville","title":"Book 20","price":12.99,"tags":["myth","war","classic"],"sku":"B20","inStock":true},{"category":"reference","author":"Nigel Rees","title":"Book 21","price":13.99,"tags":["sea","sea","sea"],"sku":"B21","inStock":true},{"category":"fiction","author":"Evelyn Waugh","title":"Book 22","price":29.99,"tags":["sea","classic"],"sku":"B22","inStock":false},{"category":"poetry","author":"Nigel Rees","title":"Book 23","price":23.99,"tags":[],"sku":"B23","inStock":true,"isbn":"0-493-59238-8"},{"category":"reference","author":"Evelyn Waugh","title":"Book 24","price":24.99,"tags":["myth"],"sku":"B24","inStock":false},{"category":"fiction","author":"Herman Melville","title":"Book 25","price":21.99,"tags":["myth","war"],"sku":"B25","inStock":true,"isbn":"0-426-91185-3"},{"category":"reference","author":"J. R. R. Tolkien","title":"Book 26","price":26.99,"tags":["myth"],"sku":"B26","inStock":false},{"category":"poetry","author":"Evelyn Waugh","title":"Book 27","price":3.99,"tags":[],"sku":"B27","inStock":true},{"category":"fiction","author":"Evelyn Waugh","title":"Book 28","price":17.99,"tags":["war"],"sku":"B28","inStock":false},{"category":"fiction","author":"Nigel Rees","title":"Book 29","price":24.99,"tags":["myth"],"sku":"B29","inStock":false}],"bicycle":{"color":"red","price":19.95,"sku":"BIKE","inStock":false},"music":[{"author":"Bach","price":9.99,"sku":"M1","inStock":true}]},"expensive":10}];
