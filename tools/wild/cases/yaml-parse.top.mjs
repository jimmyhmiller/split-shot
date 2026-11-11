import { parse } from "yaml";
export function main(input) { return parse(input); }
export const inputs = ["a: 1\nb:\n  - x\n  - {y: 2}\n", "", "k: \"é\"\n", "a: [unclosed", "- 1\n- yes\n- ~\n"];
