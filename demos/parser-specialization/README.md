# Specializing a grammar interpreter into a parser

Start with these source files:

- [`parser.js`](parser.js): the complete generic grammar interpreter, including matching, choice, sequencing, and repetition.
- [`grammar.cjs`](grammar.cjs): the small constructors that build grammar nodes.
- [`grammars/arithmetic.cjs`](grammars/arithmetic.cjs): the arithmetic grammar with named rules and examples.
- [`grammars/assignments.cjs`](grammars/assignments.cjs): the assignment grammar with named rules and examples.
- [`generated/arithmetic.input.js`](generated/arithmetic.input.js): the complete standalone input passed to split-shot, with the grammar expanded and formatted.
- [`generated/arithmetic.residual.js`](generated/arithmetic.residual.js): the resulting specialized parser.

There is no separate handwritten code generator: `parser.js` interprets grammar data, and split-shot specializes that interpreter into parser code. `run.cjs` assembles the specialization inputs and runs validation and benchmarks; `grammars.cjs` contains only the benchmark fixtures.

Run from the repository root on macOS:

```sh
node demos/parser-specialization/run.cjs
```

This builds the existing release specializer, specializes both grammars, checks the residuals, then benchmarks in three fresh Node processes. No npm dependencies or compiler changes are needed. `PARSER_CASE=arithmetic` selects one grammar. Generated inputs and unedited residuals are in `generated/`; `results.json` contains provenance, specialization times, correctness counts, and every timing sample.

The experiment follows the grammar-as-static-input idea associated with Futamura's work. It is a small new PEG recognizer, not a transcription of a historical parser. The [original English paper](https://fi.ftmr.info/PE-Museum/PE-Original-English1971.pdf) depicts syntax feeding a parser generation algorithm in Figure 1; this experiment uses the partial evaluator itself to turn a grammar interpreter into a specialized recognizer.

## What's static and dynamic

`parser.js` is a generic recursive interpreter for literal, character range, character set, binary sequence, ordered choice, and greedy repetition nodes. `grammars.cjs` constructs ordinary grammar trees; the constructors only build data. There is no custom parser code generator. The build places this unchanged interpreter and one fixed grammar inside `main(input)`, then gives that program to split-shot. Only `input` is dynamic.

The grammars recognize:

```text
arithmetic  <- number (('+' / '-' / '*' / '/') number)*
assignments <- name '=' number (';' name '=' number)*
number      <- [0-9]+
name        <- [a-zA-Z_]+
```

Both require full input consumption. They return booleans, do not construct syntax trees or evaluate expressions, accept no whitespace, and have no recursive nonterminal references. Arithmetic recognizes operator sequences without assigning precedence. Grammar traversal recurses over finite grammar trees; repetition consumes arbitrarily long runtime text.

The baseline has the same interpreter and the same grammar, allocated once outside timing. The residual is exactly what split-shot emitted. Both are loaded in the same Node realm with isolated lexical scopes. Generated residuals contain direct character tests and loops: grammar nodes, kind dispatch, and recursive parser calls have disappeared. This costs code size: arithmetic grows from 1,831 to 8,623 bytes; assignments from 2,066 to 6,566 bytes.

## Validation and timing

Each grammar checks 8,538 calls per process against an independent regular-expression oracle, checking the entire matched length to avoid JavaScript `$` accepting a final newline. Both generic and specialized functions must agree with the oracle. Inputs include explicit valid/invalid edge cases, 256 workload strings, 2,000 deterministic random strings, 2,000 mutations, long strings, and a second pass in reverse order. The RNG is fixed for reproducibility.

Timing excludes compilation, specialization, loading, and grammar construction. It includes a checksum consuming every result, uses equal warmup, a calibrated common batch, 15 samples per variant with alternating order, and reports medians across three fresh processes. The same timing loop calls both functions, so its call overhead is included in both. Workloads contain varied successful inputs and about 20% failing inputs, with different lengths. These are small in-memory recognizers, not full language parsers or end-to-end application measurements.

## Specialization settings and limits

The runner explicitly sets the existing `PE_NO_SHARED_CONTEXTS=1` and `PE_CONTEXT_POINTS=1` options, also used by the C-backend experiments. They preserve static grammar contexts instead of sharing through generic residual helpers. The budget remains 2M residual-expression nodes. They are compiler options, not changes to either timed parser.

The first exploratory arithmetic run using defaults retained recursive grammar interpretation and ran slower than the generic baseline. The context-preserving configuration eliminated it and produced the speedup. These flags are therefore material to the result.

Two earlier representations remain as complete reproductions in `probes/`: an array-based sequence/choice grammar, and a binary grammar expressing the name character class as nested choices. The assignment grammar exceeds the 2M-node budget in both, including with the context-preserving flags. For example:

```sh
PE_NO_SHARED_CONTEXTS=1 PE_CONTEXT_POINTS=1 target/release/js-frontend --js --budget 2M demos/parser-specialization/probes/binary-grammar-budget.input.js
```

The working interpreter uses the standard character-set primitive for name characters. This preserves the recognized language and avoids expanding character alternatives inside repetition. The residual-growth issue remains open in `split-shot-bugs`; the successful character-set case does not establish that arbitrary PEG grammars specialize well.

## Recorded result

On Apple M2 Max, macOS arm64, Node v26.5.0:

| Grammar | Generic ns/call | Specialized ns/call | Speedup | Process range |
|---|---:|---:|---:|---:|
| arithmetic | 610 | 132 | 4.53× | 4.49–4.63× |
| assignments | 1321 | 284 | 4.66× | 4.57–4.98× |

Speedups are medians of per-process ratios; latency columns are independently aggregated medians. Specialization took 209 ms for arithmetic and 39 ms for assignments. This amortizes after roughly 437,721 calls for arithmetic and 37,301 calls for assignments, excluding Rust build, module loading and JIT warmup. The compiler binary was built from the existing working tree, including the pre-existing `src/js.rs` edit. The experiment changes no compiler sources.
