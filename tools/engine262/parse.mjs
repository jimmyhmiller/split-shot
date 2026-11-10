// engine262's parser alone on the fixed script, as ParseScript calls it
// (inside wrappedParse's try): a quicker check that parsing a static source
// folds than main.mjs.
import { wrappedParse } from './node_modules/@engine262/engine262/lib/engine262.mjs';

export function main(input) {
  const script = wrappedParse({ source: 'var s = 0; for (var i = 0; i < 10; i++) s += i * x; s + 1' }, (p) => p.parseScript());
  if (Array.isArray(script)) return 'error';
  return script.ScriptBody.StatementList.length + input;
}
