import { camelCase, snakeCase, constantCase, kebabCase, capitalCase } from "change-case";
const OPTIONS = { mergeAmbiguousCharacters: true };
export function main(input) {
  return { camel: camelCase(input, OPTIONS), snake: snakeCase(input), constant: constantCase(input), kebab: kebabCase(input), title: capitalCase(input) };
}
export const inputs = ["hello world", "XMLHttpRequest2 fooBar", "", "__private_field__", "version 1.2.10", "éCole Normale", "a", 5];
