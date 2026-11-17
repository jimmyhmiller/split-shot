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
