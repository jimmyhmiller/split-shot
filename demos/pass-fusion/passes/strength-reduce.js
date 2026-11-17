function strengthReduce(node) {
  // Identifier reads are pure in this numeric DSL. Do not duplicate arbitrary
  // expressions: extending the language with calls must not duplicate effects.
  if (node.type === 'BinaryExpression' && node.operator === '**' &&
      node.right.type === 'Literal' && node.right.value === 2 && node.left.type === 'Identifier') {
    return {type: 'BinaryExpression', operator: '*', left: node.left, right: node.left};
  }
  return node;
}
