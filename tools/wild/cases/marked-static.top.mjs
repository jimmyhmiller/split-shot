import { marked } from "marked";
// KNOWN: a page written in Markdown. RUNTIME: who reads it.
const page = marked.parse("# Welcome, NAME\n\nYou have **COUNT** new [messages](/inbox).\n\n- one\n- two\n", { async: false });
export function main(input) {
  return page.replace("NAME", String(input.name)).replace("COUNT", String(input.count));
}
export const inputs = [{ name: "Jim", count: 3 }, { name: "é", count: 0 }, {}, { name: "$&", count: -1 }, null];
