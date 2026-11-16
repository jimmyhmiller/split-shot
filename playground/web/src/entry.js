// The first projection's entry point. split-shot specializes a function of one
// parameter, the dynamic input. The playground lets you pick any top-level
// function and say which of its parameters are static (known now) and which
// are dynamic, and writes the one-parameter entry function that calls it.
import * as acorn from "acorn";

// The top-level function declarations of `src`, with their parameters, and
// every name declared at the top level. Throws acorn's SyntaxError.
export function topLevel(src) {
  const ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "script" });
  const functions = [];
  const names = new Set();
  for (const node of ast.body) {
    if (node.type === "FunctionDeclaration") {
      names.add(node.id.name);
      if (node.async || node.generator) continue;
      functions.push({
        name: node.id.name,
        params: node.params.map((p, i) => {
          const id = p.type === "Identifier" ? p : p.type === "AssignmentPattern" && p.left.type === "Identifier" ? p.left : null;
          return { key: id ? id.name : `arg${i}`, label: id ? id.name : src.slice(p.start, p.end), rest: p.type === "RestElement" };
        }),
      });
    } else if (node.type === "VariableDeclaration") {
      for (const d of node.declarations) for (const n of patternNames(d.id)) names.add(n);
    } else if (node.type === "ClassDeclaration") {
      names.add(node.id.name);
    }
  }
  return { functions, names };
}

function patternNames(p) {
  switch (p.type) {
    case "Identifier": return [p.name];
    case "ObjectPattern": return p.properties.flatMap((q) => patternNames(q.type === "RestElement" ? q.argument : q.value));
    case "ArrayPattern": return p.elements.filter(Boolean).flatMap(patternNames);
    case "AssignmentPattern": return patternNames(p.left);
    case "RestElement": return patternNames(p.argument);
    default: return [];
  }
}

function freshName(names, base) {
  if (!names.has(base)) return base;
  for (let i = 2; ; i++) if (!names.has(base + i)) return base + i;
}

// What to hand split-shot, and how to call the original and the residual.
// `choices`: { [key]: { dynamic, value } } with values as JS expressions.
export function buildEntry(src, info, fnName, choices) {
  const fn = info.functions.find((f) => f.name === fnName);
  if (!fn) throw new Error(`there is no top-level function ${fnName}`);
  const rest = fn.params.find((p) => p.rest);
  if (rest) throw new Error(`${fnName} has a rest parameter (${rest.label}); give it fixed parameters to specialize`);
  const value = (p) => {
    const v = (choices[p.key]?.value ?? "").trim();
    return v === "" ? "undefined" : v;
  };
  const dyn = fn.params.filter((p) => choices[p.key]?.dynamic);
  const originalCall = `${fnName}(${fn.params.map(value).join(", ")})`;

  // A function named `main` whose one parameter is dynamic is already an entry.
  if (fnName === "main" && fn.params.length === 1 && dyn.length === 1) {
    return { program: src, entry: "main", wrapper: "", originalCall, residualCall: `main(${value(fn.params[0])})` };
  }
  const entry = freshName(info.names, "main");
  let param, args, sample;
  if (dyn.length === 1) {
    param = dyn[0].key;
    args = fn.params.map((p) => (p === dyn[0] ? p.key : `(${value(p)})`));
    sample = value(dyn[0]);
  } else {
    // No dynamic parameter, or several: they arrive as fields of one object.
    param = freshName(new Set([...info.names, ...fn.params.map((p) => p.key)]), "input");
    args = fn.params.map((p) => (choices[p.key]?.dynamic ? `${param}.${p.key}` : `(${value(p)})`));
    sample = dyn.length === 0 ? "" : `{ ${dyn.map((p) => `${p.key}: ${value(p)}`).join(", ")} }`;
  }
  const wrapper = `\n// Written by the playground: the entry point, with the static arguments filled in.\nfunction ${entry}(${param}) {\n  return ${fnName}(${args.join(", ")});\n}\n`;
  return { program: src.replace(/\s*$/, "\n") + wrapper, entry, wrapper, originalCall, residualCall: `${entry}(${sample})` };
}
