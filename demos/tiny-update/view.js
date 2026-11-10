// Tiny Update: a view interpreter, not a compiler or code generator.
// The view is static; previous/next state and the write callback are dynamic.
function evaluate(expr, state) {
  switch (expr.op) {
    case "literal": return expr.value;
    case "field": return state[expr.name];
    case "add": return evaluate(expr.left, state) + evaluate(expr.right, state);
    case "multiply": return evaluate(expr.left, state) * evaluate(expr.right, state);
    case "choose": return evaluate(expr.test, state)
      ? evaluate(expr.yes, state) : evaluate(expr.no, state);
  }
}

// Fixed topology: mount creates the DOM once. Updates visit text bindings only.
// Comparing rendered values also avoids writes when different states look alike.
function update(view, previous, next, write) {
  if (view.kind === "element") {
    let i = 0;
    while (i < view.children.length) {
      update(view.children[i], previous, next, write);
      i = i + 1;
    }
  } else {
    const before = evaluate(view.text, previous);
    const after = evaluate(view.text, next);
    if (before !== after) write(view.id, after);
  }
}

function main(input) {
  const count = { op: "field", name: "count" };
  const name = { op: "field", name: "name" };
  const view = {
    kind: "element", tag: "section", children: [
      { kind: "text", id: "heading", text: { op: "literal", value: "Tiny Update" } },
      { kind: "text", id: "greeting", text: {
        op: "add", left: { op: "literal", value: "Hello, " }, right: name
      } },
      { kind: "text", id: "count", text: count },
      { kind: "text", id: "double", text: {
        op: "multiply", left: count, right: { op: "literal", value: 2 }
      } },
      { kind: "text", id: "status", text: {
        op: "choose", test: { op: "field", name: "enabled" },
        yes: { op: "literal", value: "Running" },
        no: { op: "literal", value: "Paused" }
      } }
    ]
  };
  update(view, input.previous, input.next, input.write);
}
