// jsdom has no layout engine. The Range shims below are used only by
// CodeMirror's measurement layer; application DOM APIs remain unmodified.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('node:fs'), path = require('node:path');
function createPage() {
  const errors = [], virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const page = new JSDOM(fs.readFileSync(path.join(__dirname,'index.html'),'utf8'), {
    runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole,
    beforeParse(window) {
      window.TextEncoder = TextEncoder;
      window.Range.prototype.getClientRects = function () { return []; };
      window.Range.prototype.getBoundingClientRect = function () {
        return { left:0, top:0, right:0, bottom:0, width:0, height:0 };
      };
    }
  });
  return { page, errors };
}
module.exports = { createPage };
