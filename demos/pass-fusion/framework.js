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
