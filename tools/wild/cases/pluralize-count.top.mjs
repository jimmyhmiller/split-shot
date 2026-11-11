import pluralize from "pluralize";
pluralize.addIrregularRule("regex", "regexii");
export function main(input) { return pluralize(input.word, input.count, true) + " / " + pluralize.singular(input.word); }
export const inputs = [
  { word: "person", count: 2 }, { word: "mice", count: 1 }, { word: "regex", count: 5 }, { word: "sheep", count: 0 },
  { word: "", count: 3 }, { word: "Analysis", count: 2 }, { word: "é", count: 2 }, { count: 2 },
];
