function main(g) {
  let e, d, a, b, c, f;
  e = [{node: g, leave: false}];
  d = [];
  while (e.length > 0) {
    a = e.pop();
    b = a.node;
    if (!a.leave) {
      e.push;
      e.push({node: b, leave: true});
      if (b.type === "BinaryExpression") {
        e.push;
        a = {node: b.right, leave: false};
        e.push(a);
        e.push;
        a = {node: b.left, leave: false};
        e.push(a);
        continue;
      }
      if (b.type === "UnaryExpression") {
        e.push;
        a = {node: b.argument, leave: false};
        e.push(a);
        continue;
      }
      if (b.type === "ConditionalExpression") {
        e.push;
        a = {node: b.alternate, leave: false};
        e.push(a);
        e.push;
        a = {node: b.consequent, leave: false};
        e.push(a);
        e.push;
        a = {node: b.test, leave: false};
        e.push(a);
        continue;
      }
      continue;
    }
    a: {
      if (b.type === "BinaryExpression") {
        a = d.pop();
        c = d.pop();
        a = {type: b.type, operator: b.operator, left: c, right: a};
        break a;
      }
      if (b.type === "UnaryExpression") {
        a = {type: b.type, operator: b.operator, prefix: true, argument: d.pop()};
        break a;
      }
      if (b.type === "ConditionalExpression") {
        a = d.pop();
        c = d.pop();
        f = d.pop();
        a = {type: b.type, test: f, consequent: c, alternate: a};
        break a;
      }
      a = b;
    }
    b = a.type === "UnaryExpression";
    b = b ? a.argument.type === "Literal" : b;
    if (b) {
      b = a.argument.value;
      if (a.operator === "-") {
        a = {type: "Literal", value: -b};
        d.push(a);
        continue;
      }
      if (a.operator === "+") {
        a = {type: "Literal", value: b - 0};
        d.push(a);
        continue;
      }
    }
    b = a.type === "BinaryExpression";
    b = b ? a.left.type === "Literal" : b;
    if (b ? a.right.type === "Literal" : b) {
      b = a.left.value;
      c = a.right.value;
      if (a.operator === "+") {
        a = {type: "Literal", value: b + c};
        d.push(a);
        continue;
      }
      if (a.operator === "-") {
        a = {type: "Literal", value: b - c};
        d.push(a);
        continue;
      }
      if (a.operator === "*") {
        a = {type: "Literal", value: b * c};
        d.push(a);
        continue;
      }
      if (a.operator === "/") {
        a = {type: "Literal", value: b / c};
        d.push(a);
        continue;
      }
      if (a.operator === "**") {
        a = {type: "Literal", value: b ** c};
        d.push(a);
        continue;
      }
    }
    b: {
      b = a.type === "BinaryExpression";
      b = b ? a.operator === "**" : b;
      c = b ? a.right.type === "Literal" : void 0;
      f = b ? c : b;
      b = f ? a.right.value === 2 : b ? c : b;
      if (b ? a.left.type === "Identifier" : b) {
        b = a.left;
        a = a.left;
        c = a.type === "Literal";
        if (c ? a.value === 1 : c) {
          d.push(b);
          continue;
        }
        c = b.type === "Literal";
        if (c ? b.value === 1 : c) {
          break b;
        }
        d.push({type: "BinaryExpression", operator: "*", left: b, right: a});
        continue;
      }
      c = a.type === "BinaryExpression";
      c = c ? a.right.type === "Literal" : c;
      if (c ? a.right.value === 1 : c) {
        b = a.operator === "*";
        b = b ? b : a.operator === "/";
        if (b) {
          a = a.left;
          break b;
        }
      }
      b = a.type === "BinaryExpression";
      b = b ? a.operator === "*" : b;
      c = b ? a.left.type === "Literal" : void 0;
      f = b ? c : b;
      if (f ? a.left.value === 1 : b ? c : b) {
        a = a.right;
        break b;
      }
      b = a.type === "UnaryExpression";
      b = b ? a.operator === "+" : b;
      if (b) {
        a = a.argument;
      }
    }
    d.push(a);
  }
  return d[0];
}
