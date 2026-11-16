# Retained diagnostics

`node experiments/general-jsmix/investigation/probe.cjs original` reproduces
the historical 138-block AST jsmix result with RESID_DEBUG traces. `direct` and
`cells` select intermediate generic evaluator representations. The diagnostic
fixture predates explicit invalid-instruction errors; it is not a semantic
baseline for that added validation behavior. Archived `baseline-*` files and
intermediate evaluator sources record the earlier investigation; the supported
reproduction and validation are in the parent directory.
