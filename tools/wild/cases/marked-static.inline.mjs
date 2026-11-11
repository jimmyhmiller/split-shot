import { marked } from "marked";
export function main(input) {
  return marked.parse("# Welcome\n\nYou have **new** [messages](/inbox).\n", { async: false }) + "<p>" + input + "</p>";
}
export const inputs = ["Jim", "", "é", 5, null];
