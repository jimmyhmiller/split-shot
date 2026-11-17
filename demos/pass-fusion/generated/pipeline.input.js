// Immutable postorder traversal. An explicit work stack also handles deep ASTs
// without consuming the JavaScript call stack. Plugins are ordinary objects.
function transform(root, passes) {
  const work = [{node: root, leave: false}];
  const results = [];
  while (work.length > 0) {
    const frame = work.pop();
    const node = frame.node;
    if (!frame.leave) {
      work.push({node: node, leave: true});
      if (node.type === 'BinaryExpression') {
        work.push({node: node.right, leave: false});
        work.push({node: node.left, leave: false});
      } else if (node.type === 'UnaryExpression') {
        work.push({node: node.argument, leave: false});
      } else if (node.type === 'ConditionalExpression') {
        work.push({node: node.alternate, leave: false});
        work.push({node: node.consequent, leave: false});
        work.push({node: node.test, leave: false});
      }
    } else {
      let result = node;
      if (node.type === 'BinaryExpression') {
        const right = results.pop();
        const left = results.pop();
        result = {type: node.type, operator: node.operator, left: left, right: right};
      } else if (node.type === 'UnaryExpression') {
        result = {type: node.type, operator: node.operator, prefix: true, argument: results.pop()};
      } else if (node.type === 'ConditionalExpression') {
        const alternate = results.pop();
        const consequent = results.pop();
        const test = results.pop();
        result = {type: node.type, test: test, consequent: consequent, alternate: alternate};
      }
      for (let i = 0; i < passes.length; i++) result = passes[i].exit(result);
      results.push(result);
    }
  }
  return results[0];
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
