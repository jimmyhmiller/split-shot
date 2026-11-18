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

## Build and run

From the repository checkout, build the CLI with Cargo:

```sh
cargo build --release -p js-frontend --bin js-frontend
```

Save the interpreter above as `example.js` and run:

```sh
./target/release/js-frontend --js example.js
```

To specialize a function other than `main`, name it with `--entry`:

```sh
./target/release/js-frontend --js --entry validateUser validate.js
```

split-shot assumes a closed world: the program's top-level functions and variables change only as the program itself changes them, so nothing outside can monkey-patch them while the residual runs. For a script that other code reads or patches, pass `--open-script`.
