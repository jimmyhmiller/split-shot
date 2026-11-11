import { kebabCase, startCase, truncate, deburr, words } from "lodash-es";
const TRUNCATE = { length: 16, separator: " ", omission: "…" };
export function main(input) {
  return { kebab: kebabCase(input), title: startCase(input), short: truncate(input, TRUNCATE), plain: deburr(input), n: words(input).length };
}
export const inputs = ["Hello wonderful World", "fooBar_baz-QUX 42", "", "déjà vu à la crème brûlée", "😀 emoji text here ok", 12345, null];
