import { sortBy, filter, map, pick } from "lodash-es";
const FIELDS = ["name", "age"];
export function main(input) {
  return map(filter(sortBy(input, ["age", "name"]), "active"), (u) => pick(u, FIELDS));
}
export const inputs = [
  [{ name: "b", age: 30, active: true, x: 1 }, { name: "a", age: 30, active: true }, { name: "c", age: 5, active: false }],
  [],
  [{ name: "é", active: 1 }, { age: 2, active: "yes" }, null],
  { k1: { name: "obj", age: 1, active: true } },
  null,
  "str",
];
