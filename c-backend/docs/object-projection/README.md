# Object-oriented JS through an interpreter into C

This follows the numeric N-body experiment with the actual Richards benchmark
from the existing C corpus. The original constructors, prototype methods,
mutable linked queues and scheduler algorithms remain JavaScript source. The
encoder serializes that source; it does not implement the scheduler.

The complete pipeline now produces native code that is **faster than ordinary warmed-up Node on Richards**, with a garbage collector, heap-allocated closure environments and shape-based objects. At runtime COUNT 1000 the three-round median is 0.0553 ms for interpreter-projected C against 0.0662 ms for module-once Node (about 1.20x), 16.14 ms for the ordinary interpreter and 2.46 ms for direct tagged C. At COUNT 10000 it is 0.511 ms against 0.651 ms (about 1.27x). Before the collector, with arena allocation and fixed-width objects, the same pipeline measured 0.0489 ms and 0.472 ms. The benchmark directory holds raw samples, fairness rules and the history of earlier, slower stages.

This is one benchmark on one machine. It is not a claim about JavaScript in general, and the supported language is the subset described under Scope.

## The boundary that worked

The first attempt specialized the entire interpreter and call graph into one
function. It exhausted a 150-million-expression specialization budget. Inlining
all possible methods is the wrong boundary for this experiment.

Instead, the projector specializes the same interpreter once for every static
guest function. Syntax is static; its environment, receiver, arguments and
object fields are dynamic. A call remains `callGuest(code, env, receiver, args)`.
The C implementation dispatches to the generated native function for that code
ID. It never evaluates guest syntax. Recursive calls therefore do not require
recursive unfolding by the partial evaluator.

For Richards this creates 42 residual functions, including module initialization.
The source's four task implementations remain distinct native call targets.
Function IDs are assigned from syntax, not from benchmark-specific names.

Where the analysis cannot prove a single target, call-site metadata still suggests a finite set of targets. The interpreter
checks the actual captured function's code identity before selecting a literal
target; otherwise it falls back to generic native dispatch. The C emitter turns
literal targets into direct native calls with the same environment, receiver,
arguments and call-frame lifetime. Prototype replacement and own-method
shadowing therefore do not silently call a stale method. Lookup still precedes
argument evaluation.

## The interpreter and its host primitives

- `interpreter.js` defines expression and statement evaluation, lexical frames,
  hoisted declarations, argument evaluation, receivers, calls, constructors,
  closures and completions.
- `intrinsics.js` is an executable JS reference for the host boundary.
- `src/object_c_runtime.h` implements that same boundary in C.
- `src/object_projection.rs` parses with SWC and produces numeric
  syntax tables, literal data, function metadata and static property atoms.
- `src/bin/object-project.rs` performs the first projection per
  function and combines the generated residuals.
- `src/object_c.rs` checks and translates the restricted residual
  language. Unsupported operations are errors, not an embedded JS interpreter.

Primitive groups:

- Values: explicit Number, Boolean, Null, Undefined, String and object reference;
  arithmetic, truth, strict/loose equality and JS integer operations.
- Objects: allocation, property load/store and prototype lookup. Static property
  atoms make slots direct indexed storage rather than runtime string hashing.
- Arrays: length, indexed storage and presence, preserving holes and inherited
  indexed properties. A hole is not an initialized zero or present undefined.
- Functions: code identity and environment, plus ordinary function properties.
- Calls: generated native function dispatch, explicit receiver and argument
  frame, and borrowed stack argument buffers.
- Memory: typed value/numeric buffers, explicit loads and stores, and context
  lifetime.
- Exceptions: explicit guest errors and throws at the entry boundary.

These are semantic operations, not snippets of arbitrary C embedded in source.
The emitter checks argument/result categories and sequences effectful operands
left to right. In particular, a method is looked up before its arguments run.
The partial evaluator treats these calls conservatively. Proven own-slot and numeric operations are selected by the interpreter from encoder facts, as described below.

## Builtins

Builtins are written in the guest language, in `prelude.js`, and go through the same specialization and C emission as the program. The encoder puts a prelude section in front of the program only if the program mentions one of that section's trigger names as an identifier, property name or string; a builtin whose name never appears cannot be looked up, so omitting it is unobservable. Richards includes none.

So far:

- **Object:** `Object`, `Object.prototype`, `Object.defineProperty` for data descriptors.
- **Function:** `call`.
- **Array:** `push`, `pop`, `shift`, `unshift`, `slice`, `splice`, `concat`, `join`, `reverse`, `fill`, `indexOf`, `lastIndexOf`, `includes`, `at`, `forEach`, `map`, `filter`, `some`, `every`, `find`, `findIndex`, `reduce`, `reduceRight`, `sort` (stable), and `Array.isArray`. `reverse`, `shift`, `unshift`, `splice` and `sort` refuse an array with holes.
- **String:** `length`, indexing, `charAt`, `charCodeAt`, `at`, `indexOf`, `lastIndexOf`, `includes`, `startsWith`, `endsWith`, `slice`, `substring`, `substr`, `concat`, `repeat`, `trim`, `trimStart`, `trimEnd`, `padStart`, `padEnd`, `split` with a string separator, `String(...)` and `String.fromCharCode`. No case conversion, regular expressions or locale methods.
- **Number and globals:** `Number(...)` with its constants and `isNaN`/`isFinite`/`isInteger`/`isSafeInteger`, `toString` with a radix (integers only for a radix other than 10), `valueOf`, `parseInt`, `parseFloat`, `isNaN`, `isFinite`, `Boolean`. No `toFixed` or `toPrecision`.
- **Math:** the constants and `floor`, `ceil`, `round`, `trunc`, `abs`, `sign`, `sqrt`, `cbrt`, `pow`, `exp`, `log`, `log2`, `log10`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `min`, `max`, `hypot`, `fround`, `imul`, `clz32`. No `random`. The transcendental functions use the C library, whose last digit can differ from V8's.
- **Errors:** `new Error(...)` and the other builtin error kinds (`TypeError`, `RangeError` and so on) produce error objects with that name; they are not constructors with prototypes.

Strings, numbers and booleans have properties: a load whose base may be one of them reads through that type's root prototype, and such a value is itself the receiver of a method found there. The analysis proves most bases to be objects, and those loads keep the path on which a non-object is a dead end; that distinction was worth about 30% on Richards when it was missing.

An operand that is an object is not yet converted to a primitive (`ToPrimitive`), so `"" + object`, comparing an object with `<`, or joining nested arrays is a runtime failure, not a call to `toString` or `valueOf`.

The prelude can use forms the program cannot: `$rootPrototype(k)`, `$argumentCount()`, `$argument(i)`, `$callWith(f, receiver, k)`, `$has(object, key)`, `$define(object, key, value, fields)`, `$isArray(value)`, the string primitives `$charCodeAt`, `$fromCharCode`, `$substring` and `$indexOf`, and `$math(name, ...)`. A section can list other sections it `needs`, and shared helpers are included when an included section calls them. The last three read or forward the activation's own argument vector, so a variadic builtin neither allocates an `arguments` array nor needs one native function per arity.

Because every caller of a builtin shares one function body, a context-insensitive analysis would merge them: every array would appear to hold everything pushed to any array. A prelude function therefore names a *summary* (`push`, `pop`, `call`) that the analysis applies at each method-call site with that site's receiver and arguments. A summary is a hand-written claim that it covers everything the body does, so nothing is proved about code inside a summarized function, and when such a function is reached any other way its body is analysed like any other.

## Exceptions

`try`, `catch` and `finally` are supported. The encoder turns the block of a `try`, and its handler, into closures over the scope the statement is in. They declare no `var`s of their own, and instead of returning they report how their body completed: normally, by `return`, by `break` or by `continue`. The interpreter runs the block closure under a *protected call*, runs the handler closure if a throw was intercepted, runs the finalizer in place, and then resumes whatever was pending. A `return` inside a protected part leaves its value in a hidden variable of the enclosing function.

In C a protected call is a runtime function that sets a jump target, calls the closure, and on a throw restores the root-frame chain and call depth it saved. The interception point is that runtime function's own activation, so a generated function sees a protected call as an ordinary call: its locals need no special treatment and nothing about exceptions is emitted per function.

Errors the guest program can observe are guest values: the error kinds a program constructs, and the `TypeError` and `RangeError` objects the runtime raises (a property access on a non-object, a call of a non-function, an invalid array length, an assignment to a read-only property and so on). Failures of the runtime's own contract, such as a capacity limit, an unsupported operation or a failed proof check, are not guest values and no handler intercepts them.

## Property names and attributes

`base[key]` with a key the analysis proves numeric is an array index, as before. Otherwise the key is examined at run time: a number is still an inline array index, and a string is looked up among the program's static property names. A program that has such an access gets a static table of its atoms' spellings (every property name and string literal it mentions) and a hash index over it built on first use. A computed name that is not in the table reads as `undefined`, which is exact because no object can have such a property; storing to one is a hard error, because that needs dictionary objects, which do not exist yet.

Each property has writable, enumerable and configurable attributes, kept in the shape. A shape has a second table used only by assignment, which holds a slot only for a writable property, so neither loads nor stores test attributes on their fast path. Assigning to a non-writable property, or to a name that is non-writable somewhere up the prototype chain, throws `TypeError`; the chain is consulted only for names that have ever been made non-writable. `Object.defineProperty` follows the specification's validation for data descriptors. Enumerability is recorded but nothing enumerates yet.

A store the analysis proved "own" skips the writability test, so that proof is withheld for any object that may be passed to `Object.defineProperty`, and the checked build verifies writability at every proved store.

## Keeping specialization linear

The specializer continues the rest of a guest statement separately along every path that returns from the interpreter's expression evaluator. Three things in the interpreter are shaped around that:

- **Short-circuit operators and `?:`** assign their result in one place and return once. In test position (`if`, loops, `?:`) a separate evaluator decides `&&`, `||` and `!` on numbers, so a condition is branches on comparisons and no value is materialized.
- **Calls with narrowed targets** can compare the function's code against each candidate in the interpreter, which gives the C compiler a continuation specialized to each target. That multiplies the rest of the statement by the number of targets at every call, so the encoder allows it only while that product over the statement's own calls is at most 25. Otherwise the call passes up to four candidates as hints on one residual call, and the C emitter turns the hints into direct calls.
- **A flag that holds different constants on two paths** also splits the specializer, and a recursive helper is not unfolded by it. Both were tried for dispatch and both made DeltaBlue's residual explode (387 MB in one case).

A statement with twelve method calls used to exhaust the specialization budget; it now specializes in about a tenth of a second.

## Representation and lifetime

Guest references are real identity-bearing objects, not doubles used as
pointers. The initial runtime uses a tagged Value for heterogeneous guest
storage. Interpreter metadata/control arithmetic remains unboxed. This is a
correctness-first extension of the numeric subset, not a claim that all Richards
hot values have already become unboxed C fields.

Function/prototype identity matters. WorkerTask and HandlerTask happen to have
the same own property names but different methods and field types. The encoder's
generic points-to metadata distinguishes these cases, but native call dispatch
does not depend on assuming one target from a key list.

Functions without nested closures now use direct local storage. Their lexical
scopes get disjoint static slots in a homogeneous staging vector, which PE can
promote to residual scalars or a fixed automatic C Value array. This is generic
capture-guided frame promotion; it does not depend on Richards's variable names.
Richards has 41 such functions and one captured module wrapper. It promotes
121 of 173 variable-access syntax nodes. An instrumented comparison reduces
dynamic Value-buffer loads/stores from 476,490 to 127,524 at COUNT 1000.
The guarded native-call audit then reduces executed generic dispatches from
40,490 to zero, replacing them with the same number of direct generated calls.
The generic fallback remains available when an identity guard misses.

A function with nested closures keeps its bindings in collected environments: each has an enclosing environment, the receiver it was entered with, and its slots. A closure holds the environment it was created in, a captured `for (let ...)` loop copies its environment per iteration, and an environment is reclaimed once no closure or activation reaches it. Only guest call nesting is bounded, by the call depth limit.

Guest objects, strings and array element storage live in a collected heap owned by the native context. The collector is a precise, non-moving mark-sweep. Small cells come from blocks dedicated to one exact size, each with a free list and a bump region; larger cells are separate allocations. A collection runs when the heap would grow past a limit that starts at 8 MB and is then twice the surviving bytes.

Roots are exact. They are the context's root prototypes and pending exception, any host value buffers a residual program requested, and the root frames of the native activations in progress. A generated function that can be live across a collection links one frame holding a slot for each Value local that is live across some collection point. Every assignment to such a local also writes its slot, so no code runs at the collection point itself. The emitter decides this from the code it emits:

- It records each function's assignments, reads, calls and control flow in execution order and runs a backward liveness analysis over that record.
- A runtime call is a collection point only if it can allocate a collected cell. A call to a generated function is one only if that function can reach a collection point, which is a fixpoint over the call graph.
- An outgoing argument vector is kept in the frame only if a vector local that may denote it is live across a collection point. Callees copy their arguments out before they can collect; the emitter verifies that for every function and roots every vector if one does not.
- Where C leaves operand order unspecified around a collection point, every Value local involved is rooted without consulting liveness.

Functions that cannot collect have no frame. String literals are static cells that are never allocated or collected.

The classification is checked, like the type proofs. A checked build (`OC_VERIFY_PROOFS` with `OC_GC_STRESS`) collects at every allocation, brackets every call classified as unable to collect and fails if one allocates, and poisons freed cells under AddressSanitizer. Both suites and the Richards sanitizer run use it. Deleting the root-slot stores from generated Richards C makes that build fail, so it does detect a missing root.

Host buffers that a residual program requests explicitly live as long as the context; the interpreter itself no longer requests any.

## Scope

This is an explicit JS subset, not a full JS implementation. Richards uses its
supported constructor/prototype/value operations, with `if`, `while`, `do-while`, `for`, `for...of`, `switch`, `break`, `continue`, `try`/`catch`/`finally`, the `typeof`, `instanceof` and `in` operators, template literals, default parameters, destructuring in declarations, assignments and parameters, logical assignment, `??`, optional chaining, rest parameters, and spread in array literals and in the arguments of calls, method calls and `new`. Classes have constructors, methods, static methods, instance and static fields, `extends`, `super(...)` and `super.method(...)`. A derived constructor runs as an ordinary function on the object `new` created, so `this` is usable before `super(...)`, an object returned by the parent constructor is ignored, and builtins cannot be extended; accessors, private members and static blocks are refused. `for...of` and array patterns read arrays and strings by index (a string by code unit) and do not use the iterator protocol; object rest patterns are refused. A function's `arguments` is an ordinary array of the values it was called with, created on entry when the function mentions it; it is not linked to the parameters. Restrictions include no labelled statements, no declarations directly inside a `switch` clause, no
accessors, eval, imports, async/generators or implicit object-to-primitive guest
callbacks. Ordinary sloppy bare-call `this`, function name/length reflection,
callback-triggered TDZ errors and general lexical binding errors are not claimed
as complete. The encoder rejects unsupported syntax and several directly
detectable binding violations. Numeric indexed operations have a declared valid
index contract; do not infer arbitrary string property semantics from them.

No benchmark-specific scheduler, queue, packet or task primitive exists.

## What made it fast

The first native version removed AST dispatch and was still 17x slower than Node. A profile showed the time spread over what the residual program still asked the runtime to do, so each step below removes one such cost. None of them mentions Richards.

**Residual shape (interpreter).** A `return` value travels through a binding the partial evaluator can see instead of a shared buffer. A block, loop or call saves and restores the stack top only when it pushes a frame. Nesting depth is bounded where guest calls cross the host boundary, not by per-call bookkeeping in every specialized function.

**Module constants (encoder).** A module variable whose only write is one top-level initializer built from primitive literals and operators is replaced by that expression wherever it is read by code that cannot run before initialization finishes. The encoder establishes "cannot run before" structurally: if every call made during source initialization names a module-level function declaration directly, the functions reachable that way are known exactly and are left alone, as is top-level code. One call with an unknown target during initialization disables the rewrite.

**Whole-program type proofs (encoder).** The existing flow-insensitive points-to analysis now also tracks primitive kinds, distinguishes arrays by allocation site, dispatches each receiver object only to the functions its own lookup can find, and treats a local as possibly undefined unless definite assignment shows a write on every path to each read. From its fixpoint the encoder marks three kinds of site:

- an *own load*, where every object the base can be is an instance of a constructor that assigns the property in its leading run of `this.key = e` statements, before `this` can escape;
- an *own store*, a store to a property the base is proved to own already, so it cannot add one. The assignments in the leading run itself create the properties and never qualify;
- a *slot*, for an own load or store where every constructor involved assigns the property at the same position in its leading run. A branch continues the run only if both arms assign the same properties in the same order;
- a *numeric operator*, where every operand can only be a number;
- a *static method call*, where every receiver is an instance of a module-level constructor, no instance can own the method name, the constructor's `prototype` is never assigned, and that prototype's method is written by exactly one statement in the program, a top-level assignment that runs during initialization.

The interpreter reads these marks from the static syntax and chooses `objGetOwn`, `objGetSlot`, `objSetOwn`, `objSetSlot`, `vBinaryNumber`, `vUnaryNumber`, or a direct call with no lookup and no guard. Anything unproved keeps the checked operation, including the guarded candidate dispatch for genuinely polymorphic calls such as `this.task.run(packet)`.

The proofs are checked, not only trusted. The JavaScript reference implementations of the proof-dependent intrinsics throw `analysis violation` if their precondition is false, so the ordinary interpreter and the residual JavaScript verify every proof on every test input. The native sanitizer build is compiled with `OC_VERIFY_PROOFS`, which does the same in C. Unit tests in `object_projection.rs` cover refusals: a conditional constructor field, `this` escaping before an assignment, a shadowed or replaced method, a replaced prototype, a string reaching a numeric field, a missing argument, and a constant read during initialization.

**Runtime representation (C).** An object has a shape: the ordered list of property names it has acquired. Objects that acquired the same names in the same order share a shape, so a property's slot number is a fact about the shape, and each shape carries a table from property atom to slot. A plain object stores as many slots inline as its constructor's body assigns on `this` (or its literal lists), and any further ones in side storage it owns. An unproved named access is a shape-table lookup; an access with a slot proof is one fixed-offset load or store. Arrays keep their elements, and functions their code and scope, after the inline slots. Side storage and array elements are released when the collector frees their object, so adding a property or growing an array is not a collection point. Operators with a literal opcode inline their number case and send everything else to the complete out-of-line implementation. ToInt32 uses the architecture's exact conversion where one exists.

**Native calls (emitter).** A guest function receives its environment, receiver and arguments as C parameters. Shared interpreter buffers whose every request agrees are created once at entry and read without checks. Known callees that cannot reach themselves and fit a size budget are forced inline; dispatch enters them through an outlined copy.

One experiment was rejected: packing values into 8-byte NaN-boxed words was 9% slower than the 16-byte tag-plus-payload struct, because the C optimizer tracks a separate tag through joins better than range facts about one word.

## Limits that remain

- Every shape carries a table with one entry per property atom of the program, so memory for shapes grows with atoms times shapes. Shapes are never freed before the context is.
- Property names are still static atoms. A name computed at run time must spell one of them to be stored to; `delete` and objects used as dictionaries need a dictionary representation alongside shapes. Accessor properties are refused.
- Slot proofs come only from constructor bodies. Object literals and properties added after construction use the shape lookup. Proven numeric fields are still boxed values.
- The analysis is flow-insensitive apart from definite assignment of locals. It cannot use a guard such as `if (x != null)` to narrow `x`.
- A module with a call of unknown target during initialization loses constant propagation, module-variable initialization facts and static method calls together.
- Call nesting is bounded at 256 guest calls in the JavaScript reference and at 256 native activations in C. A callee inlined into its caller shares the caller's activation, so the native bound is reached no earlier than the reference bound and can be reached later. Both fail with the same capacity error.
- Every scope of a function that has nested closures is a heap environment, including scopes no closure captures. Escape analysis could keep those in locals.
- The collector stops the program and marks the whole heap each time. It is not generational or incremental.

## Run and inspect

From `c-backend/` in the repository:

```
cargo build --release -p c-backend --bin object-project --bin object-to-c
node docs/object-projection/test.js
OBJECT_TO_C=../target/release/object-to-c node docs/object-projection/test-runtime.js
python3 docs/object-projection/benchmarks/richards/run.py
```

See `benchmarks/richards/README.md` for the exact source provenance, the original
repeat-count adapter and the separately labeled runtime scheduling-count
adapter, generated JS/C, correctness evidence and raw timing methodology.
The previous N-body implementation and measurements remain unchanged under
`docs/numeric-projection/` and commit `cc2a59c7661`.

The generic suite has 49 semantic fixtures, each run through five paths (the fifth is the checked native build described under Representation and lifetime), one capacity fixture, and nine fixtures that must be refused. The separate host ABI suite passes 58 fixtures with 568 exact comparisons, six expected rejections and three native-dispatch routing assertions. Benchmark correctness includes 90 six-path comparisons, 15 native sanitizer cases with proof checking and collection at every allocation, and 42 invalid-input checks. These are finite tests, not a conformance proof. LeakSanitizer is unavailable on this Mac; ASan/UBSan used `ASAN_OPTIONS=detect_leaks=0`.
