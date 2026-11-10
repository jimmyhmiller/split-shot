// inputs: [0, 1, -7]
// forbid-main: \.reduce\(|\.map\(|\.filter\(
// forbid-return: Token|KeywordLookup
// engine262's lexer token tables (from @engine262/engine262, MIT license):
// a 104-entry table built by reduce, map and filter over a static array
// folds completely, however much data the loops build.
const MaybeAssignTokens = [
// Logical
['NULLISH', '??'], ['OR', '||'], ['AND', '&&'],
// Binop
['BIT_OR', '|'], ['BIT_XOR', '^'], ['BIT_AND', '&'], ['SHL', '<<'], ['SAR', '>>'], ['SHR', '>>>'], ['MUL', '*'], ['DIV', '/'], ['MOD', '%'], ['EXP', '**'],
// Unop
['ADD', '+'], ['SUB', '-']];
const RawTokens = [
// BEGIN PropertyOrCall
// BEGIN Member
// BEGIN Template
['TEMPLATE', '`'],
// END Template

// BEGIN Property
['PERIOD', '.'], ['LBRACK', '['],
// END Property
// END Member
['OPTIONAL', '?.'], ['LPAREN', '('],
// END PropertyOrCall
['RPAREN', ')'], ['RBRACK', ']'], ['LBRACE', '{'], ['COLON', ':'], ['ELLIPSIS', '...'], ['CONDITIONAL', '?'],
// BEGIN AutoSemicolon
['SEMICOLON', ';'], ['RBRACE', '}'], ['EOS', 'EOS'],
// END AutoSemicolon

// BEGIN ArrowOrAssign
['ARROW', '=>'],
// BEGIN Assign
['ASSIGN', '='], ...MaybeAssignTokens.map(([name, value]) => [`ASSIGN_${name}`, `${value}=`]),
// END Assign
// END ArrowOrAssign

['COMMA', ','], ...MaybeAssignTokens, ['NOT', '!'], ['BIT_NOT', '~'], ['DELETE', 'delete'], ['TYPEOF', 'typeof'], ['VOID', 'void'],
// BEGIN IsCountOp
['INC', '++'], ['DEC', '--'],
// END IsCountOp
// END IsUnaryOrCountOp

['EQ', '=='], ['EQ_STRICT', '==='], ['NE', '!='], ['NE_STRICT', '!=='], ['LT', '<'], ['GT', '>'], ['LTE', '<='], ['GTE', '>='], ['INSTANCEOF', 'instanceof'], ['IN', 'in'], ['BREAK', 'break'], ['CASE', 'case'], ['CATCH', 'catch'], ['CONTINUE', 'continue'], ['DEBUGGER', 'debugger'], ['DEFAULT', 'default'],
// DELETE
['DO', 'do'], ['ELSE', 'else'], ['FINALLY', 'finally'], ['FOR', 'for'], ['FUNCTION', 'function'], ['IF', 'if'],
// IN
// INSTANCEOF
['NEW', 'new'], ['RETURN', 'return'], ['SWITCH', 'switch'], ['THROW', 'throw'], ['TRY', 'try'],
// TYPEOF
['VAR', 'var'],
// VOID
['WHILE', 'while'], ['WITH', 'with'], ['THIS', 'this'], ['NULL', 'null'], ['TRUE', 'true'], ['FALSE', 'false'], ['NUMBER', null], ['STRING', null], ['BIGINT', null],
// BEGIN Callable
['SUPER', 'super'],
// BEGIN AnyIdentifier
['IDENTIFIER', null], ['AWAIT', 'await'], ['YIELD', 'yield'],
// END AnyIdentifier
// END Callable
['CLASS', 'class'], ['CONST', 'const'], ['EXPORT', 'export'], ['EXTENDS', 'extends'], ['IMPORT', 'import'], ['PRIVATE_IDENTIFIER', null], ['AT', '@'], ['ENUM', 'enum'], ['ESCAPED_KEYWORD', null]];
const Token = RawTokens.reduce((obj, [name], i) => {
  obj[name] = i;
  return obj;
}, Object.create(null));
const TokenNames = RawTokens.map(r => r[0]);
const TokenValues = RawTokens.map(r => r[1]);
const Keywords = RawTokens.filter(([name, raw]) => name.toLowerCase() === raw).map(([, raw]) => raw);
const KeywordLookup = Keywords.reduce((obj, kw) => {
  obj[kw] = Token[kw.toUpperCase()];
  return obj;
}, Object.create(null));
const KeywordRaw = new Set(Object.keys(KeywordLookup));
const KeywordTokens = new Set(Object.values(KeywordLookup));
function main(x) { return Token.NUMBER + KeywordLookup.while + x; }
