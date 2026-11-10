import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// The examples and the second-projection sources (int.js, jsmix.js, parse.js)
// are imported straight from the partial-new tree so the playground never holds
// a drifting copy of them.
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  server: { fs: { allow: [repoRoot] } },
  worker: { format: "es" },
  build: { target: "es2022" },
});
