# Mogensen’s tiny specializer — interactive demo

Open `index.html` directly in a browser. It is a standalone, dependency-free page; no server or network is needed. The worker keeps editable programs off the UI thread and stops a computation after four seconds.

Choose a projection, interpreter, source program, and Church-numeral input. Expand the intermediate stages to inspect the actual generated lambda compiler or compiler generator. The second interpreter applies the source program’s function twice (so Add 2 produces input + 4).

## Implementation

`engine.js` implements Mogensen’s five-case offline specialization rules using Scott-style function encodings and higher-order abstract syntax. `PA` is the manually annotated specializer term; `EA` is the annotated self-interpreter. They follow the terms in Mitchell Wand’s *Specifying the correctness of binding-time analysis* (JFP 1993), sections 4 and 7:

https://www.cambridge.org/core/services/aop-cambridge-core/content/view/0B598D301F7742EE5F3159340ADD58EE/S0956796800000782a.pdf/specifying_the_correctness_of_bindingtime_analysis.pdf

The demo substitutes the ordinary call-by-value fixed-point combinator Z for Y so static evaluation works with JavaScript’s evaluation order. This is an explicit adaptation, not a reproduction of the paper’s exact term sizes. Binding-time annotations are supplied manually, without an automatic binding-time analyzer. The second interpreter is a small additional example built with the same rules.

The projections run as:

1. `P(quote5(EA))(quote3(program))` yields target code.
2. `P(quote5(PA))(quote5(EA))` yields compiler code; the generic lambda runtime executes that generated compiler on `quote3(program)`.
3. `P(quote5(PA))(quote5(PA))` yields generator code; the generic lambda runtime executes it on `quote5(EA)`, then executes its generated compiler on `quote3(program)`.

The generated compiler and generator are pure lambda ASTs, not host callbacks to P. Quotation supplies the function-encoded inputs; readback turns function-encoded output into inspectable ASTs. A generic lexical-scope lambda evaluator runs generated code. Each page computation checks target alpha-equivalence against direct specialization, compiler equivalence against projection two when applicable, and the output against direct interpretation. These are structural checks, not general beta-equivalence proofs. The UI timing covers generation and structural checks, not a runtime speedup benchmark.

## Rebuild and check

From the repository root:

```sh
node demos/mogensen/build.cjs
node demos/mogensen/test.cjs
node demos/mogensen/check-page.cjs
```

Edit `index.template.html` and `engine.js`, then rebuild the standalone HTML. The tests cover 42 projection/structural cases, 504 numerical checks, parser failures, alpha-equivalence and static reduction. They also execute the pure-lambda P term and compare it to its host embedding on three annotated inputs, including itself. Page checks compile both embedded scripts and exercise success/error messages through the exact embedded worker code. Browser layout QA was unavailable because the browser access host was unavailable in the authoring session.
