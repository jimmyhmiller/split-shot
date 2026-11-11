import { flow, partialRight, map, filter, sum, uniq, chunk } from "lodash-es";
const pipeline = flow([
  (xs) => uniq(xs),
  partialRight(map, (x) => x * 2),
  partialRight(filter, (x) => x > 4),
  (xs) => chunk(xs, 2),
  partialRight(map, sum),
]);
export function main(input) { return pipeline(input); }
export const inputs = [[1, 2, 3, 3, 4, 5], [], [10], [1, "3", 3, null, 7], null, "12345"];
