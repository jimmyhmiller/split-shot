// style: table-driven DFA lexer (rules compiled at load to a char-class map and a flat transition table, maximal munch)
// residue: Int16Array|Uint8Array
// A lexer generator's output, in the small: token rules written as state
// transitions over character classes are compiled once into CHAR_CLASS
// (ASCII code -> class id), TRANSITIONS (state * classes + class -> state)
// and ACCEPTING (state -> token kind). The driver runs the table over the
// input source text, longest match first, and returns the tokens.
const CLASSES = {
  letter: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$",
  digit: "0123456789",
  space: " \t\r",
  newline: "\n",
  dot: ".",
  quote: "\"",
  backslash: "\\",
  slash: "/",
  arith: "+-*%",
  eq: "=",
  cmp: "<>!",
  amp: "&",
  bar: "|",
  punct: "(){}[];,:?",
};

// [from, class or "*" for every class, to or null for no transition].
// Later rules override earlier ones.
const RULES = [
  ["start", "letter", "ident"],
  ["ident", "letter", "ident"],
  ["ident", "digit", "ident"],
  ["start", "digit", "int"],
  ["int", "digit", "int"],
  ["int", "dot", "fraction_dot"],
  ["fraction_dot", "digit", "fraction"],
  ["fraction", "digit", "fraction"],
  ["start", "dot", "dot"],
  ["start", "space", "ws"],
  ["start", "newline", "ws"],
  ["ws", "space", "ws"],
  ["ws", "newline", "ws"],
  ["start", "quote", "string"],
  ["string", "*", "string"],
  ["string", "newline", null],
  ["string", "backslash", "string_escape"],
  ["string_escape", "*", "string"],
  ["string_escape", "newline", null],
  ["string", "quote", "string_end"],
  ["start", "slash", "slash"],
  ["slash", "eq", "op_assign"],
  ["slash", "slash", "comment"],
  ["comment", "*", "comment"],
  ["comment", "newline", null],
  ["start", "arith", "arith"],
  ["arith", "eq", "op_assign"],
  ["start", "eq", "assign"],
  ["assign", "eq", "equal"],
  ["equal", "eq", "equal_strict"],
  ["start", "cmp", "cmp"],
  ["cmp", "eq", "cmp_eq"],
  ["cmp_eq", "eq", "equal_strict"],
  ["start", "amp", "amp"],
  ["amp", "amp", "logic"],
  ["start", "bar", "bar"],
  ["bar", "bar", "logic"],
  ["start", "punct", "punct"],
];

const ACCEPTS = {
  ident: "IDENT",
  int: "NUMBER",
  fraction: "NUMBER",
  dot: "PUNCT",
  ws: "WHITESPACE",
  string_end: "STRING",
  slash: "OP",
  comment: "COMMENT",
  arith: "OP",
  op_assign: "OP",
  assign: "OP",
  equal: "OP",
  equal_strict: "OP",
  cmp: "OP",
  cmp_eq: "OP",
  amp: "OP",
  bar: "OP",
  logic: "OP",
  punct: "PUNCT",
};

const KEYWORDS = new Set(["let", "const", "var", "if", "else", "while", "for", "return", "function", "true", "false", "null"]);

function compileLexer(classes, rules, accepts) {
  const classNames = Object.keys(classes);
  const classIds = {};
  classNames.forEach((name, i) => { classIds[name] = i + 1; });
  const nClasses = classNames.length + 1; // class 0: any other character
  const charClass = new Uint8Array(128);
  for (const name of classNames) {
    for (const ch of classes[name]) charClass[ch.charCodeAt(0)] = classIds[name];
  }
  const stateIds = { start: 0 };
  let nStates = 1;
  const idOf = (name) => {
    if (!(name in stateIds)) stateIds[name] = nStates++;
    return stateIds[name];
  };
  for (const [from, , to] of rules) {
    idOf(from);
    if (to !== null) idOf(to);
  }
  const transitions = new Int16Array(nStates * nClasses).fill(-1);
  for (const [from, cls, to] of rules) {
    const target = to === null ? -1 : stateIds[to];
    const base = stateIds[from] * nClasses;
    if (cls === "*") {
      for (let c = 0; c < nClasses; c++) transitions[base + c] = target;
    } else {
      transitions[base + classIds[cls]] = target;
    }
  }
  const accepting = new Array(nStates).fill(null);
  for (const name of Object.keys(accepts)) accepting[stateIds[name]] = accepts[name];
  return { charClass, transitions, accepting, nClasses };
}

const { charClass: CHAR_CLASS, transitions: TRANSITIONS, accepting: ACCEPTING, nClasses: N_CLASSES } =
  compileLexer(CLASSES, RULES, ACCEPTS);

function lex(src) {
  const tokens = [];
  let pos = 0;
  while (pos < src.length) {
    let state = 0;
    let i = pos;
    let lastKind = null;
    let lastEnd = pos;
    while (i < src.length) {
      const code = src.charCodeAt(i);
      const cls = code < 128 ? CHAR_CLASS[code] : 0;
      const next = TRANSITIONS[state * N_CLASSES + cls];
      if (next < 0) break;
      state = next;
      i++;
      if (ACCEPTING[state] !== null) {
        lastKind = ACCEPTING[state];
        lastEnd = i;
      }
    }
    if (lastKind === null) {
      tokens.push(["ERROR", src[pos]]);
      pos++;
      continue;
    }
    const text = src.slice(pos, lastEnd);
    if (lastKind === "IDENT" && KEYWORDS.has(text)) tokens.push(["KEYWORD", text]);
    else if (lastKind !== "WHITESPACE" && lastKind !== "COMMENT") tokens.push([lastKind, text]);
    pos = lastEnd;
  }
  return tokens;
}

export function main(input) {
  return lex(input.source);
}

export const inputs = [{"source":""},{"source":"   \n\t "},{"source":"x"},{"source":"1. 2.5 .5 \"unterminated\nnext # @ 1e3 é"},{"source":"while (true) x /= 2; y == z ? a : b;\n// a comment about stuff = 1 + 2\nif (a6 >= 62 && !done || b !== null) { return \"str\\\"ing 6\"; }\nfor (i = 0; i < n; i += 1) { s %= i; f(i, [1, 2.5, x.y]); }\nwhile (true) x /= 2; y == z ? a : b;\n// a comment about things = 1 + 2"},{"source":"for (i = 0; i < n; i += 1) { s %= i; f(i, [1, 2.5, x.y]); }\nfor (i = 0; i < n; i += 1) { s %= i; f(i, [1, 2.5, x.y]); }\n// a comment about things = 1 + 2\nlet count_2 = 400.89 * (y + 4);\n// a comment about stuff = 1 + 2\nfor (i = 0; i < n; i += 1) { s %= i; f(i, [1, 2.5, x.y]); }\n// a comment about things = 1 + 2\nlet total = 169.57 * (y + 8);\nfor (i = 0; i < n; i += 1) { s %= i; f(i, [1, 2.5, x.y]); }\n// a comment about stuff = 1 + 2\nlet x = 979.17 * (y + 4);\n// a comment about things = 1 + 2\nlet x = 424.27 * (y + 4);\nwhile (true) x /= 2; y == z ? a : b;\nlet count_2 = 419.94 * (y + 3);\nwhile (true) x /= 2; y == z ? a : b;\nlet total = 251.44 * (y + 6);\nlet x = 734.0 * (y + 6);\nfor (i = 0; i < n; i += 1) { s %= i; f(i, [1, 2.5, x.y]); }\nif (a5 >= 16 && !done || b !== null) { return \"str\\\"ing 5\"; }\nif (a4 >= 9 && !done || b !== null) { return \"str\\\"ing 7\"; }\nlet count_2 = 266.41 * (y + 6);\nlet count_2 = 534.47 * (y + 8);\nlet count_2 = 380.10 * (y + 9);\nif (a5 >= 97 && !done || b !== null) { return \"str\\\"ing 1\"; }\nif (a0 >= 41 && !done || b !== null) { return \"str\\\"ing 6\"; }\nwhile (true) x /= 2; y == z ? a : b;\nlet count_2 = 812.87 * (y + 6);\n// a comment about stuff = 1 + 2\nwhile (true) x /= 2; y == z ? a : b;\nif (a3 >= 94 && !done || b !== null) { return \"str\\\"ing 7\"; }\nwhile (true) x /= 2; y == z ? a : b;\nwhile (true) x /= 2; y == z ? a : b;\nif (a3 >= 50 && !done || b !== null) { return \"str\\\"ing 4\"; }\nif (a8 >= 38 && !done || b !== null) { return \"str\\\"ing 4\"; }\nlet $el = 518.68 * (y + 5);\nfor (i = 0; i < n; i += 1) { s %= i; f(i, [1, 2.5, x.y]); }\nlet count_2 = 180.65 * (y + 7);\n// a comment about stuff = 1 + 2\nfor (i = 0; i < n; i += 1) { s %= i; f(i, [1, 2.5, x.y]); }"}];
