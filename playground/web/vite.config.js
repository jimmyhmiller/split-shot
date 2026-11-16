import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// The projection sources (docs/p3, experiments/general-jsmix, tools/readable-js)
// are imported straight from the repository so the playground never holds a
// drifting copy of them.
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  // Relative asset URLs: GitHub Pages serves the site under /split-shot/.
  base: "./",
  server: { fs: { allow: [repoRoot] } },
  worker: { format: "es" },
  build: { target: "es2022" },
});
