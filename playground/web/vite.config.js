import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// The examples are imported from ../examples, outside this package.
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  // Relative asset URLs: GitHub Pages serves the site under /split-shot/.
  base: "./",
  server: { fs: { allow: [repoRoot] } },
  worker: { format: "es" },
  build: { target: "es2022" },
});
