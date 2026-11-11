import semver from "semver";
// KNOWN: the range an application accepts. RUNTIME: the version offered.
const range = new semver.Range("^1.2.3 || >=2.0.0-beta.1 <3");
export function main(input) { return semver.satisfies(input, range); }
export const inputs = ["1.2.3", "1.9.0", "2.0.0-beta.2", "3.0.0", "1.2", "", "v2.5.1", "not a version", null, "1.2.3-é"];
