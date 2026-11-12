// style: npm nearley (Earley parser runtime interpreting a nearleyc-compiled grammar table, scannerless)
// residue: \$ebnf\$|\.predict\(
// nearley running a fixed grammar compiled by nearleyc 2.20.1 (output pasted
// below; the source grammar is in the comment): a scannerless s-expression
// reader with numbers, symbols, strings and quote. main parses the input text
// (character by character through the Earley chart) and returns the forms and
// how many parses there were, or the error.
//
//   program -> _ {% () => [] %} | _ form (__ form):* _ {% d => [d[1], ...d[2].map(x => x[1])] %}
//   form    -> atom {% id %} | "(" _ ")" {% () => [] %}
//            | "(" _ form (__ form):* _ ")" {% d => [d[2], ...d[3].map(x => x[1])] %}
//            | "'" form {% d => ["quote", d[1]] %}
//   atom    -> number {% id %} | symbol {% id %} | string {% id %}
//   number  -> "-":? [0-9]:+ {% d => ({ num: parseInt((d[0] || "") + d[1].join(""), 10) }) %}
//   symbol  -> [a-zA-Z+*/<>=!?_] [a-zA-Z0-9+*/<>=!?_-]:* {% d => d[0] + d[1].join("") %}
//            | "-" [a-zA-Z+*/<>=!?_-]:* {% d => d[0] + d[1].join("") %}
//   string  -> "\"" [^"]:* "\"" {% d => ({ str: d[1].join("") }) %}
//   _       -> [\s]:* {% () => null %}
//   __      -> [\s]:+ {% () => null %}
import nearley from "nearley";
function id(x) { return x[0]; }
let Lexer = undefined;
let ParserRules = [
    {"name": "program", "symbols": ["_"], "postprocess": () => []},
    {"name": "program$ebnf$1", "symbols": []},
    {"name": "program$ebnf$1$subexpression$1", "symbols": ["__", "form"]},
    {"name": "program$ebnf$1", "symbols": ["program$ebnf$1", "program$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "program", "symbols": ["_", "form", "program$ebnf$1", "_"], "postprocess": d => [d[1], ...d[2].map(x => x[1])]},
    {"name": "form", "symbols": ["atom"], "postprocess": id},
    {"name": "form", "symbols": [{"literal":"("}, "_", {"literal":")"}], "postprocess": () => []},
    {"name": "form$ebnf$1", "symbols": []},
    {"name": "form$ebnf$1$subexpression$1", "symbols": ["__", "form"]},
    {"name": "form$ebnf$1", "symbols": ["form$ebnf$1", "form$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "form", "symbols": [{"literal":"("}, "_", "form", "form$ebnf$1", "_", {"literal":")"}], "postprocess": d => [d[2], ...d[3].map(x => x[1])]},
    {"name": "form", "symbols": [{"literal":"'"}, "form"], "postprocess": d => ["quote", d[1]]},
    {"name": "atom", "symbols": ["number"], "postprocess": id},
    {"name": "atom", "symbols": ["symbol"], "postprocess": id},
    {"name": "atom", "symbols": ["string"], "postprocess": id},
    {"name": "number$ebnf$1", "symbols": [{"literal":"-"}], "postprocess": id},
    {"name": "number$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "number$ebnf$2", "symbols": [/[0-9]/]},
    {"name": "number$ebnf$2", "symbols": ["number$ebnf$2", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "number", "symbols": ["number$ebnf$1", "number$ebnf$2"], "postprocess": d => ({ num: parseInt((d[0] || "") + d[1].join(""), 10) })},
    {"name": "symbol$ebnf$1", "symbols": []},
    {"name": "symbol$ebnf$1", "symbols": ["symbol$ebnf$1", /[a-zA-Z0-9+*/<>=!?_-]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "symbol", "symbols": [/[a-zA-Z+*/<>=!?_]/, "symbol$ebnf$1"], "postprocess": d => d[0] + d[1].join("")},
    {"name": "symbol$ebnf$2", "symbols": []},
    {"name": "symbol$ebnf$2", "symbols": ["symbol$ebnf$2", /[a-zA-Z+*/<>=!?_-]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "symbol", "symbols": [{"literal":"-"}, "symbol$ebnf$2"], "postprocess": d => d[0] + d[1].join("")},
    {"name": "string$ebnf$1", "symbols": []},
    {"name": "string$ebnf$1", "symbols": ["string$ebnf$1", /[^"]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "string", "symbols": [{"literal":"\""}, "string$ebnf$1", {"literal":"\""}], "postprocess": d => ({ str: d[1].join("") })},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", /[\s]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": () => null},
    {"name": "__$ebnf$1", "symbols": [/[\s]/]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", /[\s]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": () => null}
];
let ParserStart = "program";
const GRAMMAR = nearley.Grammar.fromCompiled({ Lexer, ParserRules, ParserStart });
export function main(input) {
  const parser = new nearley.Parser(GRAMMAR);
  try {
    parser.feed(input.src);
  } catch (e) {
    return { error: "syntax error at offset " + e.offset };
  }
  if (parser.results.length === 0) return { error: "unexpected end of input" };
  return { parses: parser.results.length, forms: parser.results[0] };
}
export const inputs = [
  { src: "" },
  { src: "42" },
  { src: "(define (square x) (* x x))" },
  { src: "(let ((a 1) (b -22)) (if (< a b) \"less\" 'more))  (print \"done\")" },
  { src: "(define (fib n) (if (< n 2) n (+ (fib (- n 1)) (fib (- n 2)))))\n(map fib '(0 1 2 3 4 5 6 7 8 9 10))" },
  { src: "(unclosed (list 1 2" },
  { src: "(bad # char)" },
];
