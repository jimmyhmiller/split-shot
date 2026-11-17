function __rf0(a, b) {
  let c, d;
  a: {
    b: {
      if (a.type === "BinaryExpression") {
        c = {type: a.type, operator: a.operator, left: __rf0(a.left, b), right: __rf0(a.right, b)};
        break b;
      }
      if (a.type === "UnaryExpression") {
        c = {type: a.type, operator: a.operator, prefix: true, argument: __rf0(a.argument, b)};
        break b;
      }
      if (a.type === "ConditionalExpression") {
        c = {type: a.type, test: __rf0(a.test, b), consequent: __rf0(a.consequent, b), alternate: __rf0(a.alternate, b)};
        break b;
      }
      c = a;
      d = 0;
      break a;
    }
    d = 0;
  }
  while (d < b.length) {
    c = (b[d]).exit(c);
    d += 1;
  }
  return c;
}

var __rf1 = function constantFold(b) {
  let a, c;
  a = b.type === "UnaryExpression";
  a = a ? b.argument.type === "Literal" : a;
  if (a) {
    a = b.argument.value;
    if (b.operator === "-") {
      return {type: "Literal", value: -a};
    }
    if (b.operator === "+") {
      return {type: "Literal", value: a - 0};
    }
  }
  a = b.type === "BinaryExpression";
  a = a ? b.left.type === "Literal" : a;
  if (a ? b.right.type === "Literal" : a) {
    a = b.left.value;
    c = b.right.value;
    if (b.operator === "+") {
      return {type: "Literal", value: a + c};
    }
    if (b.operator === "-") {
      return {type: "Literal", value: a - c};
    }
    if (b.operator === "*") {
      return {type: "Literal", value: a * c};
    }
    if (b.operator === "/") {
      return {type: "Literal", value: a / c};
    }
    if (b.operator === "**") {
      return {type: "Literal", value: a ** c};
    }
  }
  return b;
};

var __rf2 = function strengthReduce(b) {
  let a, c, d;
  a = b.type === "BinaryExpression";
  a = a ? b.operator === "**" : a;
  c = a ? b.right.type === "Literal" : void 0;
  d = a ? c : a;
  a = d ? b.right.value === 2 : a ? c : a;
  if (a ? b.left.type === "Identifier" : a) {
    return {type: "BinaryExpression", operator: "*", left: b.left, right: b.left};
  }
  return b;
};

var __rf3 = function removeIdentities(b) {
  let a, c, d;
  a = b.type === "BinaryExpression";
  a = a ? b.right.type === "Literal" : a;
  if (a ? b.right.value === 1 : a) {
    a = b.operator === "*";
    a = a ? a : b.operator === "/";
    if (a) {
      return b.left;
    }
  }
  a = b.type === "BinaryExpression";
  a = a ? b.operator === "*" : a;
  c = a ? b.left.type === "Literal" : void 0;
  d = a ? c : a;
  if (d ? b.left.value === 1 : a ? c : a) {
    return b.right;
  }
  a = b.type === "UnaryExpression";
  a = a ? b.operator === "+" : a;
  if (a) {
    return b.argument;
  }
  return b;
};

function main(d) {
  let b, a, c, e;
  a: {
    if (d.type === "BinaryExpression") {
      b = d.type;
      a = d.operator;
      c = [{name: "constant-fold", exit: __rf1}, {name: "strength-reduce", exit: __rf2}, {name: "remove-identities", exit: __rf3}];
      b = {type: b, operator: a, left: __rf0(d.left, c), right: __rf0(d.right, c)};
      break a;
    }
    if (d.type === "UnaryExpression") {
      b = d.type;
      a = d.operator;
      c = [{name: "constant-fold", exit: __rf1}, {name: "strength-reduce", exit: __rf2}, {name: "remove-identities", exit: __rf3}];
      b = {type: b, operator: a, prefix: true, argument: __rf0(d.argument, c)};
      break a;
    }
    if (d.type === "ConditionalExpression") {
      b = d.type;
      c = [{name: "constant-fold", exit: __rf1}, {name: "strength-reduce", exit: __rf2}, {name: "remove-identities", exit: __rf3}];
      b = {type: b, test: __rf0(d.test, c), consequent: __rf0(d.consequent, c), alternate: __rf0(d.alternate, c)};
      break a;
    }
    b = d;
    a = b.type === "UnaryExpression";
    a = a ? b.argument.type === "Literal" : a;
    if (a) {
      a = b.argument.value;
      if (b.operator === "-") {
        return {type: "Literal", value: -a};
      }
      if (b.operator === "+") {
        return {type: "Literal", value: a - 0};
      }
    }
    a = b.type === "BinaryExpression";
    a = a ? b.left.type === "Literal" : a;
    if (a ? b.right.type === "Literal" : a) {
      a = b.left.value;
      c = b.right.value;
      if (b.operator === "+") {
        return {type: "Literal", value: a + c};
      }
      if (b.operator === "-") {
        return {type: "Literal", value: a - c};
      }
      if (b.operator === "*") {
        return {type: "Literal", value: a * c};
      }
      if (b.operator === "/") {
        return {type: "Literal", value: a / c};
      }
      if (b.operator === "**") {
        return {type: "Literal", value: a ** c};
      }
    }
    b: {
      a = b.type === "BinaryExpression";
      a = a ? b.operator === "**" : a;
      c = a ? b.right.type === "Literal" : void 0;
      e = a ? c : a;
      a = e ? b.right.value === 2 : a ? c : a;
      if (a ? b.left.type === "Identifier" : a) {
        a = b.left;
        b = b.left;
        c = b.type === "Literal";
        if (c ? b.value === 1 : c) {
          return a;
        }
        c = a.type === "Literal";
        if (c ? a.value === 1 : c) {
          break b;
        }
        return {type: "BinaryExpression", operator: "*", left: a, right: b};
      }
      c = b.type === "BinaryExpression";
      c = c ? b.right.type === "Literal" : c;
      if (c ? b.right.value === 1 : c) {
        a = b.operator === "*";
        a = a ? a : b.operator === "/";
        if (a) {
          b = b.left;
          break b;
        }
      }
      a = b.type === "BinaryExpression";
      a = a ? b.operator === "*" : a;
      c = a ? b.left.type === "Literal" : void 0;
      e = a ? c : a;
      if (e ? b.left.value === 1 : a ? c : a) {
        b = b.right;
        break b;
      }
      a = b.type === "UnaryExpression";
      a = a ? b.operator === "+" : a;
      if (a) {
        b = b.argument;
      }
    }
    return b;
  }
  a = 0;
  while (a < c.length) {
    b = (c[a]).exit(b);
    a += 1;
  }
  return b;
}
