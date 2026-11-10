#!/bin/sh
# Build the wasm + site locally and deploy the static output to Vercel.
# (Vercel's own `vercel build` rejects local Node versions it doesn't support,
# so this writes the Build Output API layout directly.)
set -e
cd "$(dirname "$0")"
npm run wasm
npx vite build
rm -rf .vercel/output
mkdir -p .vercel/output
cp -R dist .vercel/output/static
printf '{"version":3}\n' > .vercel/output/config.json
vercel deploy --prebuilt --prod --yes
