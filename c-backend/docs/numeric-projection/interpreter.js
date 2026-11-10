// Numeric JS interpreter. Runtime values are doubles or numeric offsets into
// flat buffers, never JS records, tagged values, or callable objects. The node
// and function tables are immutable numeric data supplied by the parser.
// allocF64, loadF64, storeF64, f64Sqrt and failCapacity form the typed-memory
// contract. Loads/stores are explicit sequencing points during specialization;
// the C emitter turns them back into direct array accesses, not helper calls.
function setStackTop(value) { storeF64(state, 1, value); }
function truth(value) { return value !== 0 && value === value; }
function frame(env, depth) {
  var i = 0;
  while (i < depth) { env = loadF64(stack, env); i = i + 1; }
  return env;
}
function read(env, depth, slot) { return loadF64(stack, frame(env, depth) + 2 + slot); }
function write(env, depth, slot, value) {
  storeF64(stack, frame(env, depth) + 2 + slot, value);
  return value;
}
function pushFrame(parent, slots, receiver) {
  var base = loadF64(state, 1);
  if (base + slots + 2 > 4096) failCapacity();
  storeF64(state, 1, base + slots + 2);
  storeF64(stack, base, parent);
  storeF64(stack, base + 1, receiver);
  var i = 0;
  while (i < slots) { storeF64(stack, base + 2 + i, 0); i = i + 1; }
  return base;
}
function allocate(count) {
  var base = loadF64(state, 0);
  if (base + count > 4096) failCapacity();
  storeF64(state, 0, base + count);
  return base;
}
function record() {
  var width = fieldCount;
  if (width === 0) width = 1;
  var base = allocate(width);
  var i = 0;
  while (i < width) { storeF64(heap, base + i, 0); i = i + 1; }
  return base;
}
function invoke(info, parent, args, receiver) {
  var mark = loadF64(state, 1);
  var env = pushFrame(parent, info[1], receiver);
  var i = 0;
  while (i < info[0]) { storeF64(stack, env + 2 + i, args[i]); i = i + 1; }
  var completion = execute(nodes[info[2]], env);
  var value = 0;
  if (completion === 1) value = loadF64(state, 2);
  setStackTop(mark);
  return value;
}
function binary(op, left, right) {
  if (op === 1) return left + right;
  if (op === 2) return left - right;
  if (op === 3) return left * right;
  if (op === 4) return left / right;
  if (op === 5) return left % right;
  if (op === 6) return left ** right;
  if (op === 7 || op === 9) return left === right ? 1 : 0;
  if (op === 8 || op === 10) return left !== right ? 1 : 0;
  if (op === 11) return left < right ? 1 : 0;
  if (op === 12) return left <= right ? 1 : 0;
  if (op === 13) return left > right ? 1 : 0;
  if (op === 14) return left >= right ? 1 : 0;
  if (op === 15) return left | right;
  if (op === 16) return left & right;
  if (op === 17) return left ^ right;
  if (op === 18) return left << right;
  if (op === 19) return left >> right;
  return left >>> right;
}
function expression(node, env) {
  var tag = node[0];
  if (tag === 1) return constants[node[1]];
  if (tag === 3) return read(env, node[1], node[2]);
  if (tag === 4) {
    var left = expression(nodes[node[2]], env);
    if (node[1] === 21) {
      if (truth(left)) return expression(nodes[node[3]], env);
      return left;
    }
    if (node[1] === 22) {
      if (truth(left)) return left;
      return expression(nodes[node[3]], env);
    }
    return binary(node[1], left, expression(nodes[node[3]], env));
  }
  if (tag === 5) {
    var operand = expression(nodes[node[2]], env);
    if (node[1] === 1) return -operand;
    if (node[1] === 2) return +operand;
    if (node[1] === 3) return truth(operand) ? 0 : 1;
    if (node[1] === 4) return ~operand;
    return 0;
  }
  if (tag === 6) {
    if (truth(expression(nodes[node[1]], env))) return expression(nodes[node[2]], env);
    return expression(nodes[node[3]], env);
  }
  if (tag === 7) {
    var array = allocate(node[2] + 1);
    storeF64(heap, array, node[2]);
    var i = 0;
    while (i < node[2]) {
      storeF64(heap, array + 1 + i, expression(nodes[lists[node[1] + i]], env));
      i = i + 1;
    }
    return array;
  }
  if (tag === 8) {
    var base = expression(nodes[node[2]], env);
    if (node[1] === 1) return loadF64(heap, base);
    if (node[1] === 2) return loadF64(heap, base + node[3]);
    return loadF64(heap, base + 1 + expression(nodes[node[3]], env));
  }
  if (tag === 9) {
    var target = nodes[node[2]];
    var address = 0;
    var inStack = 0;
    if (target[0] === 3) {
      address = frame(env, target[1]) + 2 + target[2];
      inStack = 1;
    } else {
      var object = expression(nodes[target[2]], env);
      if (target[1] === 2) address = object + target[3];
      else address = object + 1 + expression(nodes[target[3]], env);
    }
    var old = 0;
    if (node[1] !== 0) {
      if (inStack) old = loadF64(stack, address);
      else old = loadF64(heap, address);
    }
    var value = expression(nodes[node[3]], env);
    if (node[1] !== 0) value = binary(node[1], old, value);
    if (inStack) storeF64(stack, address, value);
    else storeF64(heap, address, value);
    return value;
  }
  if (tag === 10) {
    var before = read(env, node[2], node[3]);
    var after = before + node[1];
    write(env, node[2], node[3], after);
    if (node[4]) return after;
    return before;
  }
  if (tag === 11) {
    var parent = 0;
    if (node[2] >= 0) parent = frame(env, node[2]);
    var args = [];
    var j = 0;
    while (j < node[4]) {
      args[j] = expression(nodes[lists[node[3] + j]], env);
      j = j + 1;
    }
    if (node[5]) {
      var instance = record();
      invoke(functions[node[1]], parent, args, instance);
      return instance;
    }
    return invoke(functions[node[1]], parent, args, 0);
  }
  if (tag === 12) return loadF64(stack, env + 1);
  if (tag === 13) return f64Sqrt(expression(nodes[node[1]], env));
  var result = 0;
  var k = 0;
  while (k < node[2]) {
    result = expression(nodes[lists[node[1] + k]], env);
    k = k + 1;
  }
  return result;
}
function execute(node, env) {
  var tag = node[0];
  if (tag === 100) return 0;
  if (tag === 101) { expression(nodes[node[1]], env); return 0; }
  if (tag === 102) {
    var i = 0;
    while (i < node[2]) {
      var entry = node[1] + i * 3;
      if (lists[entry + 2] >= 0) write(env, lists[entry], lists[entry + 1], expression(nodes[lists[entry + 2]], env));
      i = i + 1;
    }
    return 0;
  }
  if (tag === 103) {
    var value = 0;
    if (node[1] >= 0) value = expression(nodes[node[1]], env);
    storeF64(state, 2, value);
    return 1;
  }
  if (tag === 104) return 2;
  if (tag === 105) return 3;
  if (tag === 106) {
    if (truth(expression(nodes[node[1]], env))) return execute(nodes[node[2]], env);
    return execute(nodes[node[3]], env);
  }
  if (tag === 107 || tag === 108) {
    // Keep code positions in explicit dispatch locals. The specializer must
    // distinguish different syntax positions while generalizing numeric data.
    var condition = node[1];
    var body = node[2];
    var update = node[4];
    var mark = loadF64(state, 1);
    if (tag === 108) {
      if (node[5] > 0) env = pushFrame(env, node[5], loadF64(stack, env + 1));
      execute(nodes[node[3]], env);
    }
    while (truth(expression(nodes[condition], env))) {
      var status = execute(nodes[body], env);
      if (status === 1) { setStackTop(mark); return 1; }
      if (status === 2) { setStackTop(mark); return 0; }
      if (tag === 108 && update >= 0) expression(nodes[update], env);
    }
    setStackTop(mark);
    return 0;
  }
  var saved = loadF64(state, 1);
  if (node[3] > 0) env = pushFrame(env, node[3], loadF64(stack, env + 1));
  var j = 0;
  while (j < node[2]) {
    var completion = execute(nodes[lists[node[1] + j]], env);
    if (completion !== 0) { setStackTop(saved); return completion; }
    j = j + 1;
  }
  setStackTop(saved);
  return 0;
}
