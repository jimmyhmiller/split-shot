import picomatch from "picomatch";
const isSource = picomatch(["src/**/*.{js,ts}", "!**/*.test.*"], { dot: false });
export function main(input) { return isSource(input); }
export const inputs = ["src/a.js", "src/deep/er/b.ts", "src/a.test.js", "lib/a.js", "src/.hidden/a.js", "", "src/é.ts", "src/a.jsx"];
