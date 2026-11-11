import { marked } from "marked";
const OPTIONS = { gfm: true, breaks: false, async: false };
export function main(input) { return marked.parse(input, OPTIONS); }
export const inputs = [
  "# Title\n\nSome *emphasis* and `code` and a [link](http://example.com \"t\").\n",
  "- a\n- b\n  1. nested\n\n| h | i |\n|---|--:|\n| 1 | 2 |\n",
  "",
  "```js\nconst é = '<b>';\n```\n> quote ~~gone~~\n",
  "<div>raw & html</div>\n\n***\n",
  null,
];
