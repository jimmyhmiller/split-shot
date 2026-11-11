import { groupBy, mapValues, sumBy, orderBy, toPairs } from "lodash-es";
export function main(input) {
  const totals = mapValues(groupBy(input, "dept"), (g) => sumBy(g, "salary"));
  return orderBy(toPairs(totals), [1, 0], ["desc", "asc"]);
}
export const inputs = [
  [{ dept: "eng", salary: 10 }, { dept: "ops", salary: 7 }, { dept: "eng", salary: 5 }],
  [],
  [{ salary: 1 }, { dept: "é", salary: 2 }, { dept: "é" }],
  [{ dept: "a", salary: 1 }, { dept: "b", salary: 1 }],
  null,
];
