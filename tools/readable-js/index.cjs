const acorn = require('acorn');
const astring = require('astring');
const eslintScope = require('eslint-scope');

function children(node) {
  return Object.entries(node).flatMap(([key, value]) => {
    if (key === 'parent') return [];
    if (Array.isArray(value)) return value.filter(x => x && typeof x.type === 'string');
    return value && typeof value.type === 'string' ? [value] : [];
  });
}
function walk(node, fn) { fn(node); for (const child of children(node)) walk(child, fn); }
function analyze(ast) {
  return eslintScope.analyze(ast, {ecmaVersion: 2022, sourceType: 'script', optimistic: false, ignoreEval: false});
}
function unsupportedDynamicScope(ast) {
  walk(ast, node => {
    if (node.type === 'WithStatement' || (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'eval')) {
      throw new Error('Readability transforms do not support with or direct eval');
    }
  });
}
function ownLexicalBindings(body) {
  return body.some(node => node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration' ||
    (node.type === 'VariableDeclaration' && node.kind !== 'var'));
}
function simplify(source, {names = {}} = {}) {
  const ast = acorn.parse(source, {ecmaVersion: 2022, sourceType: 'script', ranges: true});
  unsupportedDynamicScope(ast);
  const scopes = analyze(ast);
  const localReads = new WeakSet();
  for (const scope of scopes.scopes) for (const ref of scope.references) {
    if (ref.resolved && ref.resolved.scope.type !== 'global') localReads.add(ref.identifier);
  }
  // These expressions cannot call user code or allocate identity-bearing values.
  // All identifier reads resolve to local lexical bindings, excluding global
  // getters. Repeating a test has the same value with no intervening evaluation.
  function pure(node) {
    if (node.type === 'Identifier') return localReads.has(node);
    if (node.type === 'Literal') return !node.regex && (node.value === null || typeof node.value !== 'object');
    if (node.type === 'UnaryExpression' && ['!', 'typeof'].includes(node.operator)) return pure(node.argument);
    if (node.type === 'BinaryExpression' && ['===', '!=='].includes(node.operator)) return pure(node.left) && pure(node.right);
    if (node.type === 'LogicalExpression' && ['&&', '||'].includes(node.operator)) return pure(node.left) && pure(node.right);
    return false;
  }
  const same = (a, b) => astring.generate(a) === astring.generate(b);
  const counts = {conditionalTests: 0, labels: 0, blocks: 0, renamedBindings: 0, memberAccesses: 0};
  function rewrite(node) {
    for (const [key, value] of Object.entries(node)) {
      if (Array.isArray(value)) node[key] = value.map(x => x && typeof x.type === 'string' ? rewrite(x) : x);
      else if (value && typeof value.type === 'string') node[key] = rewrite(value);
    }
    if (node.type === 'MemberExpression' && node.computed && node.property.type === 'Literal' &&
        typeof node.property.value === 'string' && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(node.property.value)) {
      counts.memberAccesses++;
      node.computed = false;
      node.property = {type: 'Identifier', name: node.property.value};
    }
    if (node.type === 'ConditionalExpression' && pure(node.test)) {
      if (same(node.test, node.alternate)) {
        counts.conditionalTests++;
        return {type: 'LogicalExpression', operator: '&&', left: node.test, right: node.consequent};
      }
      if (same(node.test, node.consequent)) {
        counts.conditionalTests++;
        return {type: 'LogicalExpression', operator: '||', left: node.test, right: node.alternate};
      }
    }
    // L: { prefix; if (test) { then; break L; } suffix; }
    // becomes { prefix; if (test) { then; } else { suffix; } }.
    // All references to L must be terminal breaks of direct if branches.
    // No outer lexical bindings may move into a narrower else scope.
    if (node.type === 'LabeledStatement' && node.body.type === 'BlockStatement') {
      const body = node.body.body;
      let references = 0;
      walk(node.body, n => { if ((n.type === 'BreakStatement' || n.type === 'ContinueStatement') && n.label?.name === node.label.name) references++; });
      const candidate = n => n.type === 'IfStatement' && !n.alternate && n.consequent.type === 'BlockStatement' &&
        n.consequent.body.at(-1)?.type === 'BreakStatement' && n.consequent.body.at(-1).label?.name === node.label.name;
      if (references > 0 && body.filter(candidate).length === references && !ownLexicalBindings(body)) {
        function structure(items) {
          const index = items.findIndex(candidate);
          if (index < 0) return items;
          const branch = items[index];
          branch.consequent.body.pop();
          const suffix = structure(items.slice(index + 1));
          if (suffix.length === 1 && suffix[0].type === 'IfStatement') branch.alternate = suffix[0];
          else if (suffix.length > 0) branch.alternate = {type: 'BlockStatement', body: suffix};
          return [...items.slice(0, index), branch];
        }
        counts.labels++;
        return {...node.body, body: structure(body)};
      }
    }
    return node;
  }
  rewrite(ast);
  // Flatten only blocks nested inside other blocks, retaining any block that
  // owns lexical declarations. Never flatten into a function/directive body.
  function flatten(node, functionBody = false) {
    if (node.type === 'BlockStatement' && !functionBody) {
      const next = [];
      for (const stmt of node.body) {
        if (stmt.type === 'BlockStatement' && !ownLexicalBindings(stmt.body)) {
          next.push(...stmt.body); counts.blocks++;
        } else next.push(stmt);
      }
      node.body = next;
    }
    for (const child of children(node)) flatten(child, /Function/.test(node.type) && node.body === child);
  }
  flatten(ast);
  // Normalize shorthand keys before alpha-renaming: {a} must remain {a: value}.
  walk(ast, node => {
    if (node.type === 'Property' && node.shorthand) {
      node.key = {...node.key};
      node.shorthand = false;
    }
  });
  const fresh = new Set();
  walk(ast, node => { if (node.type === 'Identifier') fresh.add(node.name); });
  const inferredNames = new Set();
  walk(ast, node => {
    let target, value;
    if (node.type === 'VariableDeclarator') {target = node.id; value = node.init;}
    if (node.type === 'AssignmentExpression' || node.type === 'AssignmentPattern') {target = node.left; value = node.right;}
    if (target?.type === 'Identifier' && value && (value.type === 'ArrowFunctionExpression' ||
        (['FunctionExpression', 'ClassExpression'].includes(value.type) && !value.id))) inferredNames.add(target.name);
  });
  const usedNames = new Set();
  for (const scope of analyze(ast).scopes) {
    const scopeName = scope.type === 'function' ? scope.block.id?.name : null;
    const requested = names[scopeName];
    if (!requested) continue;
    for (const variable of scope.variables) {
      const name = requested[variable.name];
      if (!name) continue;
      usedNames.add(scopeName + "." + variable.name);
      if (name === variable.name) continue;
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) || fresh.has(name)) throw new Error('Rename requires a globally fresh identifier: ' + name);
      if (inferredNames.has(variable.name) || variable.defs.some(def => !['Variable', 'Parameter'].includes(def.type))) {
        throw new Error('Rename could affect inferred function/class names: ' + variable.name);
      }
      for (const identifier of variable.identifiers) identifier.name = name;
      for (const reference of variable.references) reference.identifier.name = name;
      fresh.add(name);
      counts.renamedBindings++;
    }
  }
  for (const [scope, bindings] of Object.entries(names)) for (const binding of Object.keys(bindings)) {
    if (!usedNames.has(scope + "." + binding)) throw new Error("Unknown rename binding: " + scope + "." + binding);
  }
  const code = astring.generate(ast);
  // Reparse to catch reserved words in requested names and generator problems.
  acorn.parse(code, {ecmaVersion: 2022, sourceType: 'script'});
  return {code, counts};
}
module.exports = {simplify};
if (require.main === module) {
  const fs = require('node:fs');
  const [file, mapping] = process.argv.slice(2);
  const result = simplify(fs.readFileSync(file, 'utf8'), {names: mapping ? JSON.parse(fs.readFileSync(mapping, 'utf8')) : {}});
  process.stdout.write(result.code);
  process.stderr.write(JSON.stringify(result.counts) + '\n');
}
