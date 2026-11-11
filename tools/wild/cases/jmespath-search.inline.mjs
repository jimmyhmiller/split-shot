import jmespath from "jmespath";
export function main(input) {
  return jmespath.search(input, "people[?age > `20`].{name: name, tags: length(tags)} | sort_by(@, &name)");
}
export const inputs = [
  { people: [{ name: "b", age: 30, tags: ["x"] }, { name: "a", age: 25, tags: [] }, { name: "c", age: 5, tags: [] }] },
  { people: [] },
  {},
  { people: [{ name: "é", age: 99, tags: "str" }] },
  { people: [{ name: "n", age: 99 }] },
  null,
];
