# split-shot

split-shot is a partial evaluator for JavaScript. Give it a program with some inputs already known, and it generates JavaScript for the work that remains.

For example, here is a small expression interpreter:

```js
function evaluate(node, env) {
  switch (node.op) {
    case "lit": return node.val;
    case "var": return env[node.name];
    case "add": return evaluate(node.l, env) + evaluate(node.r, env);
    case "mul": return evaluate(node.l, env) * evaluate(node.r, env);
    default: throw new Error("unknown op " + node.op);
  }
}

function main(env) {
  // (x + 3) * (x + y)
  const tree = {
    op: "mul",
    l: { op: "add", l: { op: "var", name: "x" }, r: { op: "lit", val: 3 } },
    r: { op: "add", l: { op: "var", name: "x" }, r: { op: "var", name: "y" } },
  };
  return evaluate(tree, env);
}
```

The expression tree is known; `env` is supplied at runtime. Specializing `main` with split-shot produces:

```js
function main(env) {
  return (env["x"] + 3) * (env["x"] + env["y"]);
}
```

The tree traversal, recursive calls, and instruction dispatch compile away. Only the expression's arithmetic remains. Specializing an interpreter to a program this way is the **first Futamura projection**.

[Try this example in the playground →](https://jimmyhmiller.github.io/split-shot/#/interp)

## Build from source

split-shot isn't published to crates.io. To run it locally, you'll need Git,
Rust and Cargo (install them with [rustup](https://rustup.rs/)), and a C/C++
toolchain for native dependencies. On macOS, install the Xcode Command Line
Tools with `xcode-select --install`. Use a recent stable Rust toolchain.

```sh
git clone https://github.com/jimmyhmiller/split-shot.git
cd split-shot
cargo build --locked --release -p js-frontend --bin js-frontend
```

The executable is `target/release/js-frontend`. You can run it directly from
the checkout; no separate installation step is required.

## Run it

Save the expression interpreter above (both `evaluate` and `main`) as
`example.js`, then run this from the repository root:

```sh
./target/release/js-frontend --js example.js
```

This prints a banner followed by the specialized JavaScript. By default,
split-shot specializes `main`, treating its input as dynamic. Put known
inputs in the source, as `main` does with the expression tree above. The CLI
doesn't take static input values as command-line arguments.

To save just the generated JavaScript, remove the first-line banner:

```sh
./target/release/js-frontend --js example.js | sed '1d' > residual.js
```

The output defines `main`; it doesn't call it. For example, append
`console.log(main({ x: 2, y: 4 }));` to `residual.js` and run
`node residual.js` to print `30`. Node.js is only needed to execute this
example's output, not to build or run the specializer.

For another entry function, use `--js --entry NAME`. Omit `--js` to inspect
the residual intermediate representation instead. Run the executable with
no arguments to see the available options (it exits with a nonzero status).
