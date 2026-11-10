# Relay: an operations workbench specialized by Partial

Open `index.html`. The two independent applications have searchable/sortable consignment queues, status filters, keyed rows, pagination, an editable inspector, priority controls, bulk selection/dispatch, network simulation, and dataset sizes of 240, 960, or 3,840 records. Each page displays 24 records; the benchmark scales the backing dataset, not the number of simultaneously mounted rows.

`app.js` describes the entire interface and its data/reducers. The demo host provides empty containers and generic mutation instrumentation. The UI library owns DOM creation, listener registration, keyed reconciliation, state, and disposal. No React or partial-evaluator changes are used.

## Build and inspect

From the repository root:

```sh
node demos/tiny-update/build.cjs
open demos/tiny-update/index.html
```

The CodeMirror 6 workbench has a file explorer, tabs, line numbers, syntax colors, search, two independent scrolling panes, and per-file scroll restoration. Choose a pane, then a file. Source and output are read-only, selectable, and copyable. The generated HTML embeds the editor and files and works offline without a CDN.

The generated standalone bundle also works outside the demo:

```html
<script src="compiled.js"></script>
<div id="root"></div>
<script>
  const instance = RelayDesk.start(document, document.getElementById("root"), null, { size: 960 });
  // instance.getState();
  // instance.dispose();
</script>
```

To rebuild the vendored CodeMirror bundle after editing `editor/workbench.js`:

```sh
npm ci --prefix demos/tiny-update/editor
npm run --prefix demos/tiny-update/editor build
node demos/tiny-update/build.cjs
```

Versions are pinned in the editor's package lock; runtime package licenses are in `vendor/CODEMIRROR-LICENSES.txt`.

## What is compiled

The first projection specializes the existing UI interpreter with the app. The build invokes the existing partial evaluator for dashboard mount/update, row mount/update, initial data, and data preparation. Residuals are packaged unchanged with shared state/lifecycle and keyed-collection code.

The dashboard and row schemas specialize separately. A generic keyed adapter creates, updates, moves, and removes row instances. Existing keys preserve nodes and listeners through sorting and edits. This avoids expanding the row schema 24 times into one giant residual and supports actual list insertion/removal.

Data preparation remains data dependent: it scans records, applies search/status filters, sorts, calculates metrics, and constructs the visible row states. The runtime prepares once per state transition, then renders old/new prepared snapshots. The specialized updater emits guards and direct DOM writes plus a call into keyed reconciliation. Some helper definitions remain in the emitted output because of current evaluator/code-emission limits; the full residual is available in the editor.

This does not derive a second-projection compiler. The build composes sources, invokes Partial, and packages output; it does not generate optimized application-specific code itself. A cache under `target/tiny-update-cache` is keyed by the complete input and compiler binary. Validation and page generation run on every build.

## Benchmarks and interpretation

The browser's **Run in this browser** button measures 15 workloads: unchanged renders, operator edits, search, sorting, and simulation, at 240/960/3,840 records. Edits/search/sort dispatch real events through reducers. A simulation operation is 12 actual simulation clicks plus a reset, keeping successive samples active.

Both implementations use the same data, UI library, keyed adapter, and DOM operations. Timings include reducers, data preparation, reconciliation, and DOM calls on detached roots. They exclude source parsing, compilation, demo observers/logging, layout, and paint. Equal warmup, a common calibrated even batch size, nine samples with alternating timing order, and median µs/op are used. A ratio below 1× is a slowdown.

Recorded Node/jsdom runs:

```sh
npm install --prefix /tmp/partial-new-tiny-ui-dom --no-save --package-lock=false jsdom
NODE_PATH=/tmp/partial-new-tiny-ui-dom/node_modules node demos/tiny-update/benchmark.cjs
NODE_PATH=/tmp/partial-new-tiny-ui-dom/node_modules node demos/tiny-update/phase-benchmark.cjs
node demos/tiny-update/build.cjs
```

The JSON reports contain environment, timestamp, raw samples, batch sizes, medians, and source hashes. The page displays recorded results only if the hashes match the current bundle/workload. Browser runs replace the main table with that browser's measurements. jsdom timings do not establish browser layout/paint performance.

The phase benchmark isolates data preparation from patching pre-prepared states. It explains why a 2× rendering improvement can produce only a few percent end-to-end improvement: at 3,840 records, preparation costs around 940 µs and the original inspector patch around 73 µs. Partial reduces that patch to roughly 34 µs; preparation stays around 934 µs. Search patching is dominated by real node insertion/removal. These measured costs are shown in the page's phase breakdown.

This example recomputes the data model on every change. Partial removes interpreter overhead; it does not introduce dependency tracking, cached queries, incremental aggregates, or cross-update memoization. A larger end-to-end speedup needs an incremental update policy in the source runtime as well as specialization.

## Validation

`build.cjs` runs an observable DOM/state oracle across five dataset sizes (1–3,840 records) and 330 sequential transitions. It checks exact original/generated effects and trees, search/empty results, filters/sorts, keyed identity, pagination, operator edits, checkboxes, bulk actions, simulation/pause/reset, unrelated host content, disposal, and DOM exceptions.

The optional DOM integration check exercises the actual generated page and both applications:

```sh
NODE_PATH=/tmp/partial-new-tiny-ui-dom/node_modules node demos/tiny-update/verify-dom.cjs
```

It also tests the standalone bundle, CodeMirror's file contents/tab routing/independent scrolling, and the real benchmark button. `dom-env.cjs` supplies no-layout Range shims for CodeMirror under jsdom; application DOM APIs are unmodified. Browser layout has not been visually verified in this session.

## Constraints and known issues

Each component has a fixed local DOM schema. Collections have unique stable keys and can dynamically insert/remove/reorder component instances. Attribute/property names and event meanings remain stable within a component. Components render purely; reducers return immutable state; events read current state rather than captured render snapshots.

The adapter supports multiple root nodes per component. Properties compare against the live DOM for controlled-input repair. Duplicate keys are rejected before collection writes. This small library does not provide hydration, concurrent rendering, animation, or error boundaries.

Two evaluator issues were found and recorded in [[partial-new-bugs]] (the project pad):

- `probes/static-loop.js`: a richer four-option static builder loses specialization in a loop; recursive structural repetition preserves it. Large whole-page expansion is also costly.
- `probes/row-conditional-alias.js`: optional-job conditionals can alias old/new class values, suppressing a needed class update. The current keyed row always has a job and uses the required-job schema; its output passes the full checks. The underlying evaluator bug remains open. No library fix was made.

## Files

- `app.js`: complete dashboard, model preparation, records, and reducers.
- `runtime.js`: immediate-mode interpreter, structural repetition, mount/update.
- `controller.js`: keyed collections and lifecycle/state dispatch.
- `compiled.js`: standalone application; `compiled-*.js`: raw residuals.
- `*-program.js` / `program.js`: actual specialization inputs.
- `template.html`, `host.js`: demo shell and generic instrumentation.
- `editor/`: CodeMirror source, pinned dependencies, and reproducible bundler.
- `benchmark*.js`, `benchmark.cjs`, `phase-benchmark.cjs`: shared/browser/local workloads.
- `*-results.json`: recorded measurements and all samples.
- `verify.cjs`, `verify-dom.cjs`, `dom-env.cjs`: correctness and integration checks.
- `probes/`: retained evaluator repros; `view.js`: original AST experiment.
