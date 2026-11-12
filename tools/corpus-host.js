// The host corpus programs run in (tools/corpus.js): the globals its context
// has besides the engine's. A corpus file with the header
// `// host-globals: declared` is specialized told so (`--host-globals`).
function sandbox() {
  return { console: { log() {} }, TextDecoder, TextEncoder };
}

const HOST_GLOBALS = Object.keys(sandbox());

// The specializer's arguments for a corpus file's source.
function hostArgs(src) {
  const m = src.match(/^\/\/\s*host-globals:\s*(.*)$/m);
  return m && m[1].trim() === 'declared' ? ['--host-globals', HOST_GLOBALS.join(',')] : [];
}

module.exports = { sandbox, HOST_GLOBALS, hostArgs };
