# Specializing Pike's regex matcher

Start with [`matcher.cjs`](matcher.cjs): the complete, readable JavaScript matcher. [`patterns.cjs`](patterns.cjs) contains the four fixed regex strings and example inputs. [`generated/`](generated/) holds complete specialization inputs and the unedited generated matchers.

The algorithm is Rob Pike's, described by Brian Kernighan in [A Regular Expression Matcher](https://www.cs.princeton.edu/courses/archive/spr09/cos333/beautiful.html). The JavaScript port preserves its three functions, branch order, unanchored search, and shortest-first star backtracking. A pattern suffix replaces the C pattern pointer, while an integer offset replaces the text pointer. JavaScript strings use UTF-16 code units and length-based termination, including embedded NUL; the original C implementation operates on NUL-terminated bytes.

Supported syntax: literal characters, `.` for any character (including newline), `*` for repetition of the preceding character, `^` at the beginning, and `$` at the end. There are no escapes, groups, alternation, character classes, or capture results. A non-leading `^` or non-final `$` is literal. This is the small historical algorithm, not Pike's later NFA regex engine.

For example, the unspecialized version is usable directly:

```js
const { match } = require('./matcher.cjs');

match('^ab*c$', 'abbbbbc'); // true
match('^ab*c$', 'abbbbbd'); // false
```

Run the complete experiment from the repository root:

```sh
node demos/pike-regex/run.cjs
```

Or select one case with `REGEX_CASE=anchored-star`. Use `--no-build` only to reuse an already-built release compiler. The runner builds split-shot locally, puts the unchanged matcher functions and a fixed pattern inside `main(input)`, and specializes it. It uses the existing `PE_NO_SHARED_CONTEXTS=1` and `PE_CONTEXT_POINTS=1` options and a 2M residual-expression budget. The pattern is static; the input text is dynamic. There is no regex-specific code generator or manual editing of residuals.

## Validation and measurement

Both generic and specialized functions must agree with an independent native JavaScript `RegExp` oracle on 16,348 calls per pattern per process. The oracle adapts dot to match newline and dollar to require the absolute end of input. Inputs include all strings of lengths 1–5 over a five-character alphabet, explicit examples and edge cases, deterministic random text and mutations, long inputs, and a repeated pass in reverse order. Additional checks exercise the generic matcher's empty patterns, anchors, literal metacharacters, Unicode and NUL behavior.

Three fresh Node processes measure the same 256 varied strings per pattern. Each variant receives at least 250 ms of warmup, shares a batch calibrated for at least about 40 ms on the faster variant, and runs 15 samples in alternating order. Timings include a checksum consuming every result. Pattern setup, compilation, specialization and loading are excluded. The baseline reuses its pattern and functions; it does not compile a pattern on every call. The same timing loop calls both variants. This compares specialization against the JavaScript port, not against C, grep or the native regex engine.

`results.json` records the compiler binary hash, source hashes, machine, flags, specialization costs, and all samples. Speedup is the median of per-process ratios; latency columns are independently aggregated medians.

## Specialization obstacle

The original recursion guard did not count a strictly shorter static string suffix as progress. It stopped unfolding the matcher after the first character and emitted generic recursive helpers. The experiment adds a general proper-suffix progress rule in `src/js.rs`, with a unit test and a frontend regression for a static string consumed under dynamic control. Equal strings, growing strings, unrelated strings, and numeric counter changes still do not count as progress. The normal depth and residual-growth limits remain in place.

An earlier offset-only port is retained in `probes/`. Its pattern string never shrinks; advancing only the numeric pattern offset does not establish static structural progress. It remains a useful example of how representation affects specialization.

Compiler validation: `cargo test --release -p partial -p js-frontend` passed (20 core tests and 143 frontend tests, including both new regressions). Existing unrelated working-tree edits were preserved.

## Recorded measurements

Apple M2 Max, macOS arm64, Node v26.5.0.

| Pattern | Generic ns/call | Specialized ns/call | Median speedup | Process range |
|---|---:|---:|---:|---:|
| `^ab*c$` | 381 | 138 | 2.90× | 1.98–2.92× |
| `needle` | 163 | 89 | 1.78× | 1.52–2.05× |
| `^a.*z$` | 424 | 139 | 3.05× | 2.74–3.67× |
| `ab*bc` | 504 | 158 | 3.37× | 2.81–3.47× |

Process variance is substantial; the full ranges are included rather than reporting only the best process. All processes showed a gain for every pattern. Specialization subprocess times were 25.1 ms for `^ab*c$`, 27.3 ms for `needle`, 25.1 ms for `^a.*z$`, 31.6 ms for `ab*bc`. The substring operations in the generic JavaScript port are part of its runtime cost and disappear during specialization.
