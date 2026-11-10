// inputs: [{"name": "Ada", "n": 3}, {"name": "Bob", "n": 0}]
// forbid-main: exec|slice|lastIndex
// A loop driven by a modeled RegExp's exec over a known string unrolls and
// folds (the dry run of its condition could not read `exec` and called the
// loop dynamic, so every variable went runtime).
var parts = (function () {
function compile(tpl) {
  var parts = [], re = /\{\{\s*(\w+)\s*\}\}/g, last = 0, m;
  while ((m = re.exec(tpl)) !== null) {
    if (m.index > last) parts.push({ text: tpl.slice(last, m.index) });
    parts.push({ key: m[1] });
    last = re.lastIndex;
  }
  if (last < tpl.length) parts.push({ text: tpl.slice(last) });
  return parts;
}
return compile("Hi {{ name }}, {{n}} new.");
})();
function main(data) {
  var out = "";
  for (var i = 0; i < parts.length; i++) out += parts[i].text !== undefined ? parts[i].text : String(data[parts[i].key]);
  return out;
}
