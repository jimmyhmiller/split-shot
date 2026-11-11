import semver from "semver";
const WANTED = "1.x || 2.0.x";
export function main(input) {
  return { best: semver.maxSatisfying(input, WANTED), sorted: semver.rsort(input.filter((v) => semver.valid(v))) };
}
export const inputs = [
  ["1.0.0", "1.4.2", "2.0.9", "2.1.0", "3.0.0"],
  [],
  ["garbage", "1.0.0-rc.1", "0.9.9"],
  ["2.0.1", "2.0.10", "2.0.2"],
  "1.2.3",
  null,
];
