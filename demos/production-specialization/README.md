# Production specialization POCs

Real upstream routing code, specialized with split-shot. The build does not hand-generate optimized routers or edit the libraries. The benchmark first checks both the source assembly and the emitted residual against the installed upstream implementation, then measures only correct residuals.

## Run

From this directory:

```sh
npm ci --ignore-scripts
npm run build
npm run bench
```

Build compiles the existing Rust frontend locally on macOS. Dependencies are pinned in `package-lock.json`. No compiler changes are required by these POCs. A full build also retains the unsuccessful css-select and LiquidJS attempts. Expected build/semantic blockers appear in the reports rather than receiving timings.

`node build.cjs --case=serve-canonical` rebuilds one case. `node benchmark.cjs --case=next-route` verifies and measures one case. The full benchmark runs three fresh Node processes and writes all raw samples to `results.json`; individual runs write `results-single.json`.

## Experiments

| Case | Fixed input | Runtime input | Baseline |
|---|---|---|---|
| `next-route` | `/teams/[team]/projects/[project]/files/[...path]`, its generated regex and parameter metadata | Pathname | Installed Next.js 16.4.6 `getRouteMatcher`, configured once before timing |
| `serve-rewrites` | Five serve-handler rewrite rules, including a two-step legacy → article → content chain | Decoded pathname | Installed serve-handler 6.1.8 `applyRewrites`, with rules prepared once |
| `serve-canonical` | Clean URLs enabled, trailing slashes disabled, no explicit redirects | Decoded pathname | Installed serve-handler `shouldRedirect`, with configuration prepared once |
| `css-select` | Compound selector for published article links, with attribute tests and `:not`; result caching disabled | DOM element with actual domhandler parent/child links | Installed css-select 7.0.0 predicate, compiled once |
| `css-select-tokens` | Same selector parsed into token arrays before specialization | DOM element | Same precompiled installed predicate |
| `liquidjs` | Article template with escaped fields, conditional content and a default label | Rendering data | Installed LiquidJS 10.30.1 template, parsed once |

For routing, `build.cjs` uses Acorn to select complete declarations from the installed packages by AST span. Function bodies are copied verbatim. For serve-handler, the oracle loads the complete installed module and appends access to the otherwise private functions. Next.js's oracle uses its existing exports. This checks the source selection and lexical dependencies against the actual packages.

The specialization entry puts the unchanged declarations and fixed configuration inside `main(input)`, where the evaluator can see them. That assembly includes setup work; it is measured as a third diagnostic variant. **Reported speedups use the stronger, already-configured installed baseline**, so they do not claim template parsing or router construction as a per-request saving.

For css-select and LiquidJS, esbuild bundles the real packages as ESM, then the build links the sole `run` export into the specialization entry. It does not replace their algorithms. Generated programs, residuals, failures, hashes, and specialization times are under `generated/`. Third-party licenses are in `THIRD-PARTY-NOTICES.txt`.

## Measurements

See `results.json` for the recorded machine, Node version, source/compiler hashes, per-process medians and every timing sample. Across three local Node processes, Next.js matching runs at **1.15×** the baseline speed (1.14–1.16×), canonical URL handling at **1.07×** (1.07–1.09×), and rewrites are effectively unchanged. These measure the routing cores, including output consumption, rather than complete HTTP requests or the full Next.js server.

Each process verifies 523 Next.js calls, 524 rewrite calls and 523 canonicalization calls against the original, including repeated inputs in reverse order. Checks cover matches, misses, Unicode, percent escapes, catch-all arrays, trailing slashes, normalization and exception name/message. Each timed workload cycles through 256 varied paths. Exceptions are checked outside timing.

Timing uses separate monomorphic loops for each variant, equal warmup, a common calibrated batch, 15 samples with rotating order, and median nanoseconds per call. Three fresh processes help expose process-to-process variance. Setup, bundling, specialization and module loading are excluded. No HTTP, filesystem serving, network latency, browser layout or rendering is measured. The rewrite dependencies (`path`, `url`, path-to-regexp, minimatch, slasher) remain actual runtime calls in both versions; their cost explains the lack of a useful rewrite gain.

## Blockers found

- **css-select string path:** the assembly agrees with the installed package, but the residual throws `ReferenceError: aw is not defined` on the first fixture. It is never timed. The full input and residual are retained.
- **css-select preparsed-token path:** specialization exceeds the 2,000,000 residual-expression-node budget. This is retained as a scalability repro, not bypassed by hand-compiling a selector.
- **LiquidJS:** frontend lowering rejects `super.update()` inside a derived constructor. The 11-line `probes/constructor-super-method.js` reproduces the error independently of LiquidJS. Its original returns `input + 1` in Node.

The blockers are recorded in the `split-shot-bugs` pad. They are evaluator issues, not demonstrated defects in the upstream packages. NFT is intentionally excluded: specializing a single fixed AST does not fit its normal many-file tracing workload.

## What stops further specialization

Run `npm run gaps` to reproduce the diagnostic investigation. It compiles 17 reduced probes and checks 68 outputs/exceptions against Node; the path-to-regexp and Next.js cleanup probes also check the installed upstream functions. `gap-probes/report.json` records source/compiler hashes, checks and dependency-call traces. These are structural diagnostics, not new performance measurements; the compiler snapshot is recorded independently of the earlier benchmark snapshot.

| Target | Confirmed obstacle | Evidence / next step |
|---|---|---|
| serve-handler rewrites | Opaque POC dependency boundary hides fixed-pattern work | A miss still calls path-to-regexp five times. A chained legacy rewrite calls it eight times and the destination compiler twice. Exposing the complete, unchanged path-to-regexp implementation in isolation folds its static parser completely and leaves literal regex matching plus fixed metadata. Expose the helper graph and give actual Node module imports appropriate models, rather than treating arbitrary `host` methods as pure. |
| Next.js matching | Conditional field insertion loses the object shape needed for cleanup specialization | `entries-fixed-shape` eliminates enumeration; `entries-conditional-shape` retains Object.entries and iterator traversal. The control after dynamic URI decoding still specializes enumeration, so opaque calls alone do not explain this gap. Preserve finite conditional property presence/order through joins, or consume the shape choice without generalizing it away. Filling absent fields with undefined would change semantics. |
| Next.js matching | A runtime regex match has no capture-shape facts | For this literal pattern, a successful match has length four and three required string captures. `regex-dynamic-result` still reads all of these at runtime. Existing regex folding requires static text. Add success-path result facts for supported pristine builtin regex operations; optional captures/custom exec require different treatment. |
| Next.js cleanup | Closures allocated in dynamic loops lose capture specialization | Simple constant captures, including through an intermediate helper, specialize correctly. `callback-inside-loop` retains `new RegExp('^' + c)` in a generic factory called with the literal prefix. Exact upstream `next-cleanup-loop` also retains a boxed prefix. `cap_forms_and` currently returns all-runtime forms whenever `once` is false. Preserve safe static captures while still creating fresh function objects on each iteration. |
| Canonical URLs | Missing effect/result information prevents removing unused parsing-related work | The residual keeps path.parse, reads of ext/name and a discarded name.startsWith('.'). Even `dead-string-call-typed` retains an unused startsWith on a trusted string. Add conditional effect/type summaries for pristine string methods and the actual Node path implementation; preserve type errors/getters/overridden methods when those guarantees do not hold. |
| Shared URI operations | Unmodeled builtin signature makes ignored extra arguments escape | `uri-extra-token` materializes a token object and rereads its prefix after encodeURIComponent; without the ignored extra argument the prefix folds. A signature/effect model could preserve argument-evaluation effects without assuming encodeURIComponent can mutate the extra token. |
| Exposed path-to-regexp | Primitive instanceof against RegExp does not fold | Both the small `primitive-instanceof` probe and the linked matcher retain the false branch. `static_instanceof` handles global Object/Array/Function, not RegExp. Extend only under the relevant pristine/hasInstance guarantees. |

Recommended order: fix the rewrite dependency boundary first (the largest directly demonstrated repeated preprocessing), then preserve Next.js conditional shapes and regex capture facts, then improve loop-created closure variants and builtin effect/signature models. Canonicalization has fewer large static computations left. These probes establish concrete missed optimizations, not achievable speedup percentages. No evaluator implementation was changed for this investigation.
