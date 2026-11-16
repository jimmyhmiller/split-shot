# Mechanical JavaScript readability pass

```sh
npm ci --ignore-scripts --prefix tools/readable-js
node tools/readable-js/index.cjs input.js [names.json] > readable.js
npm test --prefix tools/readable-js
```

Parses with Acorn, analyzes lexical bindings with eslint-scope, transforms the
AST, and prints with Astring. It does not know about interpreters, instruction
names, host methods, or generated-code strings. It never evaluates the input.
Dependencies are pinned in package-lock.json.

Rules and their semantic conditions:

1. `t ? x : t` → `t && x`, and `t ? t : x` → `t || x`, only when repeated `t`
   has no effects or allocations: local binding reads, primitive literals,
   `!`/`typeof`, strict equality, and compositions of these with `&&`/`||`.
   Unresolved/global identifiers, getters, coercive comparisons and calls are
   excluded. Thus repeated reads see the same value without intervening effects.
2. `L: { prefix; if (test) { then; break L; } suffix; }` →
   `{ prefix; if (test) { then; } else { suffix; } }`, only when all references to L are terminal breaks of direct if branches
   (multiple branches become an if/else-if chain) and the outer block owns no lexical,
   class, or function declarations. Prefix/test/selected-branch evaluation order
   is unchanged; unrelated loop breaks and continues keep their targets.
3. Flatten nested blocks only when they introduce no lexical/class/function
   bindings. Do not flatten into function bodies, preserving directive prologues.
4. Optional alpha-renaming uses actual bindings and references, not text
   substitution. Requested names must be globally fresh in the AST. Shorthand
   property keys are retained. Bindings that would change inferred function or
   class names are rejected. A stale/unknown rename mapping is an error.

Names are explicit editorial inputs, not inferred semantic facts. Example:
`{"compile":{"f":"program","c":"remaining"}}`. The rename operation and
capture avoidance are mechanical even though the reader chooses the words.

The tool rejects direct eval and with. Its semantic contract is ordinary
execution: values, effects, exceptions and control flow, excluding observation
of source text, source locations/debugger metadata and stack-trace formatting.
It is a conservative rewrite pass, not a complete optimizer or a proof of
arbitrary JavaScript equivalence. Tests supplement the rule preconditions;
differential testing alone is not the soundness argument.

Static string-key member access such as `object["length"]` is also printed as
`object.length` when the key is an ASCII IdentifierName. This changes no lookup,
receiver or key evaluation; numeric/non-identifier keys retain brackets.

The independent test suite now also covers computed-to-dot member formatting,
including reserved property names, method receiver binding and optional access.

## Separate binding cleanup

```sh
node tools/readable-js/bindings.cjs input.js > bindings.js
```

This pass independently builds a structured CFG, computes reaching definitions,
and unifies definitions that meet at a read. Distinct live ranges of a reused
register become distinct lexical bindings. A definition becomes `const` only
when it dominates its reads and the declaration's block contains those uses.
Loop-carried / joined definitions remain `let`. Every declaration is separate
and is initialized at its original assignment; evaluated expressions are not
moved, duplicated, or dropped. Names are cosmetic hints from RHS syntax.

The pass handles ordinary function-local simple let bindings, blocks, if/else,
while, break/continue, return and throw. It retains captured bindings, inferred
anonymous function/class names, embedded writes, initializer TDZ cases,
and unreachable references conservatively. Functions with unsupported control
flow are left unchanged. It rejects eval/with. Shorthand property keys and
existing directive-prologue behavior are preserved. Normal source-reflection
and debugger/stack-location exclusions from the earlier pass still apply.

Standalone compound assignments stay in the same mutable live-range component
as their incoming definitions; their read/write token is never split. A dominating
initial assignment can therefore become `let pointer = 0` while later `+=` and
`-=` updates keep their original order.
