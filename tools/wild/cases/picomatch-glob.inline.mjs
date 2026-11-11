import picomatch from "picomatch";
export function main(input) { return picomatch.isMatch(input, "src/**/*.{js,ts}", { dot: false }); }
export const inputs = ["src/a.js", "src/deep/er/b.ts", "lib/a.js", "src/.hidden/a.js", "src/é.ts", "src/a.jsx", "", 5];
