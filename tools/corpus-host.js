// The host corpus programs run in (tools/corpus.js): the globals its context
// has besides the engine's. A corpus file with the header
// `// host-globals: declared` is specialized told so (`--host-globals`).
function sandbox() {
  return { console: { log() {} }, TextDecoder, TextEncoder };
}

const HOST_GLOBALS = Object.keys(sandbox());

// The specializer's arguments for a corpus file's source: the flags its
// header asks for. An `after:` expression is code outside the program
// reading its globals and calling its functions once `main` has run: the
// program lives in an open world (`--open-script`), not the closed one the
// specializer assumes by default.
function hostArgs(src) {
  const m = src.match(/^\/\/\s*host-globals:\s*(.*)$/m);
  const host = m && m[1].trim() === 'declared' ? ['--host-globals', HOST_GLOBALS.join(',')] : [];
  const open = /^\/\/\s*after:/m.test(src) ? ['--open-script'] : [];
  return [...host, ...open];
}

module.exports = { sandbox, HOST_GLOBALS, hostArgs };
