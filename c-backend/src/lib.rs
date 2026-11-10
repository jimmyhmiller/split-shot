//! Compiling JavaScript by specializing an interpreter for it.
//!
//! Each stage here is a guest-language interpreter written in JavaScript,
//! an encoder that turns a guest program into the static data that
//! interpreter reads, and a translator from the residual program the partial
//! evaluator leaves to C. The partial evaluator itself is the `partial` and
//! `js-frontend` crates; nothing in them is specific to this crate.
//!
//! - `projection`: the first projection of a small expression interpreter.
//! - `numeric_projection`, `numeric_c`: a numeric subset, through to C.
//! - `object_projection`, `object_c`: objects, closures, classes and a
//!   collected heap, through to C. See `docs/object-projection/README.md`.
pub mod numeric_c;
pub mod numeric_projection;
pub mod object_c;
pub mod object_projection;
pub mod projection;
