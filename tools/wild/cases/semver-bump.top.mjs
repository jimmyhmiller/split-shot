import semver from "semver";
export function main(input) {
  const v = semver.parse(input.version);
  if (!v) throw new Error("bad version: " + input.version);
  return { next: semver.inc(v.version, input.release, "beta"), major: v.major, pre: v.prerelease, gt2: semver.gt(v, "2.0.0") };
}
export const inputs = [
  { version: "1.2.3", release: "minor" },
  { version: "2.0.0-beta.4", release: "prerelease" },
  { version: "0.0.1", release: "premajor" },
  { version: "nope", release: "patch" },
  { version: "9.9.9", release: "bogus" },
  {},
];
