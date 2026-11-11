import { encode, decode } from "he";
const OPTIONS = { useNamedReferences: true, allowUnsafeSymbols: false };
export function main(input) { return { enc: encode(input, OPTIONS), dec: decode(input) }; }
export const inputs = ["<a href=\"x\">é & ü</a>", "&amp;&lt;&copy;&#x1F600;&bogus;", "", "plain", "😀 \u0000  ", "&#xD800; &amp"];
