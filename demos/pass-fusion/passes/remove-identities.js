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
