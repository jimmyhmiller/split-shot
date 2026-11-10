# Generic property-getter inlining candidate

This saved candidate is only a portable force-inline declaration for `oc_get`. Its body
is unchanged: numeric atom validation, object type checks, array-length handling,
own-property presence checks, inherited-property lookup and the prototype-chain
limit remain. There is no benchmark-specific key, layout or algorithm rule.
GCC/Clang use `static inline __attribute__((always_inline))`; other C11 compilers
use `static inline`. No other runtime helper's declaration changes.

The independent temporary experiment is preserved without rewriting its raw
measurements:

- `get-inline-ablation.json`: all outputs, compiler flags, source hashes and five
  rotated process rounds for each of COUNT 1000 and 10000. Each process has five
  warmup calls and seven measured samples.
- `get-inline-ablation.py`: the exact measurement script whose SHA-256 appears
  in that report.
- `get-inline-ablation.patch`: the exact one-line generated-C change used in the
  independent experiment, before adding the portable header macro.

The packaged pre-inlining checkpoint is
`5f472baa1aeef07761932e02f73a37ab4598547a`. Its generated runtime-COUNT source
hash is recorded as `original_generated_source_sha256` in the raw report. The
temporary baseline and candidate each append the unmodified timing driver;
those complete translation-unit hashes are recorded separately.

## What the ablation establishes

For the independent temporary experiment, the medians of the five process
medians were:

- COUNT 1000: 1.1229 ms baseline, 0.7663 ms inline getter, 1.465x speedup.
- COUNT 10000: 11.0187 ms baseline, 7.4656 ms inline getter, 1.476x speedup.

All 18 valid/invalid input comparisons had identical stdout, stderr and exit
status. Context creation, allocation, output checks and destruction were timed.
These are temporary-copy ablation results, not the final integrated pipeline
measurements. The full regression suite and regenerated benchmark must still
validate the integrated change.

Inlining exposes static property atoms to the C compiler and enables additional
constant propagation and local optimization. The measured effect combines those
changes with removal of the getter call boundary. It does **not** establish how
much time was spent on one range check, a type test, property presence, prototype
traversal or call overhead in isolation. No check was deleted by hand.

The independent machine-code inspection reported 175 static calls to `oc_get`
before the change and zero afterward. The Mach-O `__TEXT` segment grew from
81,920 to 98,304 bytes. This is a code-size tradeoff, not eliminated property
accesses: the same guest lookups still execute with the full generic semantics.

## Reconstruct the temporary ablation

From the repository checkout, materialize the checkpoint's
`runtime-count.generated.c` and `object-timed-driver.c` using `git show`, append
them into `/tmp/richards-independent-profile/baseline.c`, and apply the saved
patch to create `get-inline.c`. Confirm both SHA-256 hashes against the report.
Build each with:

```
clang -std=c11 -O2 -ffp-contract=off baseline.c -lm -o baseline
clang -std=c11 -O2 -ffp-contract=off get-inline.c -lm -o get-inline
```

Run the preserved measurement script only after the executables exist in its
specified temporary directory. It compares valid and invalid inputs before
measuring, alternates process order each round, and saves every sample. Do not
run it concurrently with the official benchmark or combine its medians with a
different run's Node measurements.

## Current status

Work stopped when the user redirected the investigation to controlled small
interpreter experiments. The runtime header was restored byte-for-byte to
`5f472baa1aeef07761932e02f73a37ab4598547a`; no integrated candidate is enabled
in source. `get-inline-integration.patch` preserves the portable-header version.
The full guest regression suite and official benchmark were not started for
this candidate. A bounded ABI run was already underway when work stopped and completed with
49 fixtures, 478 exact comparisons, six expected rejections and three dispatch
routing assertions passing. Its raw output and scope are retained in
`get-inline-abi-output.txt` and `get-inline-candidate-status.json`. The release tools were subsequently rebuilt from the restored baseline source.
Their hashes and the rebuild command are recorded in the status JSON.
