// An immutable bottom-up visitor for an ESTree numeric-expression subset.
// Plugins are normal JavaScript functions, ordered by the caller.
function transform(node, passes) {
  let result = node;
  if (node.type === 'BinaryExpression') {
    result = {type: node.type, operator: node.operator,
      left: transform(node.left, passes), right: transform(node.right, passes)};
  } else if (node.type === 'UnaryExpression') {
    result = {type: node.type, operator: node.operator, prefix: true,
      argument: transform(node.argument, passes)};
  } else if (node.type === 'ConditionalExpression') {
    result = {type: node.type, test: transform(node.test, passes),
      consequent: transform(node.consequent, passes), alternate: transform(node.alternate, passes)};
  }
  for (let i = 0; i < passes.length; i++) result = passes[i].exit(result);
  return result;
}

function constantFold(node) {
  if (node.type === 'UnaryExpression' && node.argument.type === 'Literal') {
    const value = node.argument.value;
    if (node.operator === '-') return {type: 'Literal', value: -value};
    if (node.operator === '+') return {type: 'Literal', value: +value};
  }
  if (node.type === 'BinaryExpression' && node.left.type === 'Literal' && node.right.type === 'Literal') {
    const a = node.left.value;
    const b = node.right.value;
    if (node.operator === '+') return {type: 'Literal', value: a + b};
    if (node.operator === '-') return {type: 'Literal', value: a - b};
    if (node.operator === '*') return {type: 'Literal', value: a * b};
    if (node.operator === '/') return {type: 'Literal', value: a / b};
    if (node.operator === '**') return {type: 'Literal', value: a ** b};
  }
  return node;
}

function strengthReduce(node) {
  // Identifier reads are pure in this numeric DSL. Do not duplicate arbitrary
  // expressions: extending the language with calls must not duplicate effects.
  if (node.type === 'BinaryExpression' && node.operator === '**' &&
      node.right.type === 'Literal' && node.right.value === 2 && node.left.type === 'Identifier') {
    return {type: 'BinaryExpression', operator: '*', left: node.left, right: node.left};
  }
  return node;
}

function removeIdentities(node) {
  // All values are IEEE-754 numbers. These preserve NaN and signed zero.
  // In particular, x + 0 and x * 0 are deliberately NOT identity rules.
  if (node.type === 'BinaryExpression' && node.right.type === 'Literal' && node.right.value === 1) {
    if (node.operator === '*' || node.operator === '/') return node.left;
  }
  if (node.type === 'BinaryExpression' && node.operator === '*' &&
      node.left.type === 'Literal' && node.left.value === 1) return node.right;
  if (node.type === 'UnaryExpression' && node.operator === '+') return node.argument;
  return node;
}

function main(ast) {
  return transform(ast, [
    {name: 'constant-fold', exit: constantFold},
    {name: 'strength-reduce', exit: strengthReduce},
    {name: 'remove-identities', exit: removeIdentities}
  ]);
}
