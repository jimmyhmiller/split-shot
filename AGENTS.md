# Project instructions

## Partial evaluation requests

When the user supplies code and asks whether it partially evaluates, asks to
specialize it, or asks to print the residual, use the split-shot library in this
repository to perform the partial evaluation. These are requests to exercise the
project, not to manually derive an equivalent specialized program.

Run the supplied program through split-shot with the requested static inputs and
dynamic inputs, and report the actual generated residual and any diagnostics.
Do not substitute handwritten residual code or claim that specialization succeeds
without running it. If split-shot cannot handle the program, report the observed
failure and record the issue in the project pad, following any reporting
instructions in `split-shot-bugs`.

For the recursive `matches(pattern, text)` example in this conversation, specialize
with `pattern = "a*b*c"` static and `text` dynamic.
