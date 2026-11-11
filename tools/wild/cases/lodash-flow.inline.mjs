import { flow, partialRight, map, filter, sum, uniq } from "lodash-es";
export function main(input) {
  return flow([uniq, partialRight(map, (x) => x * 2), partialRight(filter, (x) => x > 4), sum])(input);
}
export const inputs = [[1, 2, 3, 3, 4, 5], [], [10], [1, "3", 3, null, 7], null, "12345"];
