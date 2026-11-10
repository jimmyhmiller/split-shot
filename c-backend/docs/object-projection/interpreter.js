// A staged interpreter for the object subset. Syntax and function metadata are
// static. Guest values are opaque Values, not encoded numeric heap offsets.
// All effects on guest objects pass through the semantic intrinsic boundary.
// The value of the most recent `return`. It is written immediately before the
// completion unwinds to its `invoke` and read there, so one binding suffices.
var returned = vUndef();
// A lexical frame that closures can capture is a collected environment: its
// parent, the receiver it was entered with, and its slots.
function frame(env, depth) {
  var i = 0;
  while (i < depth) { env = envParent(env); i = i + 1; }
  return env;
}
function read(env, depth, slot) { return envGet(frame(env, depth), slot); }
function write(env, depth, slot, value) {
  envSet(frame(env, depth), slot, value);
  return value;
}
// `actuals` gives access to every value the function was called with, for
// `arguments`; `args` holds only as many as it declares parameters.
function invoke(info, parent, args, receiver, actuals) {
  if (info[5]) receiver = envReceiver(parent);
  // A function without nested closures cannot expose its own lexical slots.
  // Its disjoint lexical scopes use a homogeneous staging vector. PE promotes
  // that vector to C locals (or a fixed automatic Value array), not host frames.
  // Captured scopes keep the persistent environment representation below.
  // Nesting depth is bounded by callGuest at the host boundary.
  var locals = [];
  var env = parent;
  var framed = info[7] < 0;
  if (framed) env = envNew(parent, info[1], receiver);
  else {
    var x = 0;
    while (x < info[7]) { locals[x] = vUndef(); x = x + 1; }
  }
  var i = 0;
  while (i < info[0]) {
    var argument = vUndef();
    if (i < args.length) argument = args[i];
    if (info[7] < 0) envSet(env, i, argument);
    else locals[i] = argument;
    i = i + 1;
  }
  if (info[10] >= 0) {
    var count = frameArgCount(actuals);
    var all = arrayNewLength(count);
    var a = 0;
    while (a < count) { arrSet(all, a, frameArg(actuals, a)); a = a + 1; }
    if (info[7] < 0) envSet(env, info[10], all);
    else locals[info[10]] = all;
  }
  var j = 0;
  while (j < info[3]) {
    var declaration = info[2] + j * 2;
    envSet(env, lists[declaration], fnNew(lists[declaration + 1], env, functions[lists[declaration + 1]][8], functions[lists[declaration + 1]][9]));
    j = j + 1;
  }
  // The receiver travels with what is known of its shape: self[1] is the id
  // of a shape it is known to have at least (0 when nothing is known) and
  // self[2] is 1 while that is exactly its shape. Both start from the
  // variant this activation is specialized for (see `entryShape`). An
  // arrow's receiver is its scope's, of which nothing is known here.
  var self = [receiver, 0, 0];
  if (!info[5]) { self[1] = entryShape; self[2] = entryShape > 0 ? 1 : 0; }
  var status = execute(nodes[info[4]], env, locals, self, actuals);
  // The shape the receiver is left with, for the driver: it is a shape
  // receivers of other calls will have (see object-project).
  if (self[1] > 0) shapeNote(2, self[1], 0);
  // info[11]: a protected part of a `try`. It reports how its body completed
  // and leaves a returned value in the scope it ran in.
  // Status 5 is a `return` that passed through a `try`: its value is in this
  // function's own result slot, info[14], not in `returned`.
  if (info[11]) {
    var code = status;
    if (status === 1) write(parent, info[12], info[13], returned);
    if (status === 5) { write(parent, info[12], info[13], envGet(env, info[14])); code = 1; }
    return vNum(code);
  }
  var value = vUndef();
  if (status === 1) value = returned;
  if (status === 5) value = envGet(env, info[14]);
  return value;
}
function constant(index) {
  var value = constants[index];
  if (value[0] === "number") return vNum(value[1]);
  if (value[0] === "bool" || value[0] === "boolean") return vBool(value[1]);
  if (value[0] === "null") return vNull();
  return vStr(value[1]);
}
// Shapes the specializer can see. A static shape is the sequence of keys an
// object was given, in order, each with the default attributes; the run time
// gives the same shapes the same ids (`shapeDeclare`), and 0 to every other.
//   shapeKeys[id]  the atoms of the shape's keys in slot order
//   shapeSteps     [from id, atom, to id] for each known addition of a key
// A lookup compares the id against every shape that has the key. With the id
// a literal that is a literal; with an id that became a run-time number where
// two paths met, it is a chain of comparisons that selects the slot, and -1
// (or 0, for a shape) when the id is none of them.
function shapeSlot(id, key) {
  var slot = -1, k = 1;
  while (k < shapeKeys.length) {
    var keys = shapeKeys[k], i = 0;
    while (i < keys.length) {
      if (keys[i] === key) { if (id === k) slot = i; }
      i = i + 1;
    }
    k = k + 1;
  }
  return slot;
}
function shapeAfter(id, key) {
  var next = 0, t = 0;
  while (t < shapeSteps.length) {
    var step = shapeSteps[t];
    if (step[1] === key) { if (id === step[0]) next = step[2]; }
    t = t + 1;
  }
  return next;
}
// A named store to the receiver. Its shape is a lower bound once anything
// else may have run: keys are only ever added and never move, so a key the
// shape has is at its slot, but one it lacks may be there by now.
function storeToSelf(node, self, address, value) {
  var at = shapeSlot(self[1], address);
  if (at >= 0) {
    // Exactly this shape: the property is writable, as every property of a
    // static shape is. Otherwise its attributes may have changed since.
    if (self[2]) objSetAt(self[0], address, at, value);
    else objSetOwn(self[0], address, value);
    return value;
  }
  if (self[2]) {
    var next = shapeAfter(self[1], address);
    if (next > 0) {
      objAddKnown(self[0], address, shapeSlot(next, address), value);
      self[1] = next;
      return value;
    }
    // No shape is known to follow: ask for one, and stop following.
    shapeNote(1, self[1], address);
    self[1] = 0;
    self[2] = 0;
  }
  if (node[6]) objSetOwn(self[0], address, value);
  else objSet(self[0], address, value);
  return value;
}
// Store to the target an assignment or update resolved. kind: 3 a local,
// 0 an environment slot, 1 a named property, 2 an array index, 4 a key
// examined at run time.
function storeTo(kind, node, locals, address, object, name, value, self, own) {
  // A store through anything but the receiver itself may be a store to the
  // receiver under another name.
  if (kind === 1 && own) return storeToSelf(node, self, address, value);
  if (kind === 1 || kind === 4) self[2] = 0;
  if (kind === 3) locals[address] = value;
  else if (kind === 0) envSet(object, address, value);
  // node[6]: the base is proved to own the property already, so the store
  // cannot add one. node[7]: it is proved to be inline slot node[7] - 1.
  else if (kind === 1) {
    if (node[6] && node[7]) objSetSlot(object, address, node[7] - 1, value);
    else if (node[6]) objSetOwn(object, address, value);
    else objSet(object, address, value);
  }
  else if (kind === 2) arrSet(object, address, value);
  else keyedSet(object, name, value);
  return value;
}
// The same choice made here, for a statement with few enough calls that
// continuing it once per target stays small. node[10] of a call selects it.
function dispatchSplit(code, parent, receiver, args, start, count) {
  var i = 0;
  while (i < count) {
    var candidate = lists[start + i];
    if (code === candidate) return callGuest(candidate, parent, receiver, args);
    i = i + 1;
  }
  return callGuest(code, parent, receiver, args);
}
function dispatchCall(code, parent, receiver, args, start, count) {
  // Metadata proposes up to four targets. They go to the host as hints on
  // one call, which checks the function's real code identity against each
  // and otherwise dispatches generically. Mutation or an imprecise analysis
  // therefore only costs the direct call. Keeping the choice out of this
  // interpreter keeps it out of the residual program's control flow.
  if (count < 1) return callGuest(code, parent, receiver, args);
  if (count > 4) return callGuest(code, parent, receiver, args);
  var second = -1;
  var third = -1;
  var fourth = -1;
  if (count > 1) second = lists[start + 1];
  if (count > 2) third = lists[start + 2];
  if (count > 3) fourth = lists[start + 3];
  return callGuestOneOf(code, parent, receiver, args, lists[start], second, third, fourth);
}
// Whether an expression in test position is truthy, as a number. The
// short-circuit operators and `!` are decided here on numbers, so a condition
// built from them is branches on comparisons and never a materialized value.
function test(node, env, locals, self, actuals) {
  var truth = 0;
  if (node[0] === 4 && node[1] === 21) {
    truth = test(nodes[node[2]], env, locals, self, actuals);
    if (truth) truth = test(nodes[node[3]], env, locals, self, actuals);
    return truth;
  }
  if (node[0] === 4 && node[1] === 22) {
    truth = test(nodes[node[2]], env, locals, self, actuals);
    if (!truth) truth = test(nodes[node[3]], env, locals, self, actuals);
    return truth;
  }
  if (node[0] === 5 && node[1] === 3) {
    truth = test(nodes[node[2]], env, locals, self, actuals);
    if (truth) return 0;
    return 1;
  }
  return vTruth(expression(node, env, locals, self, actuals));
}
function expression(node, env, locals, self, actuals) {
  var tag = node[0];
  if (tag === 1) return constant(node[1]);
  if (tag === 2) return vUndef();
  if (tag === 3) { if (node[3] >= 0) return locals[node[3]]; return read(env, node[1], node[2]); }
  if (tag === 4) {
    var left = expression(nodes[node[2]], env, locals, self, actuals);
    // The short-circuit operators have one exit each, for the same reason
    // as dispatchCall.
    if (node[1] === 21) {
      var conjunction = left;
      if (vTruth(left)) conjunction = expression(nodes[node[3]], env, locals, self, actuals);
      return conjunction;
    }
    if (node[1] === 22) {
      var disjunction = left;
      if (!vTruth(left)) disjunction = expression(nodes[node[3]], env, locals, self, actuals);
      return disjunction;
    }
    if (node[1] === 23) {
      var coalesced = left;
      if (vIsNullish(left)) coalesced = expression(nodes[node[3]], env, locals, self, actuals);
      return coalesced;
    }
    // node[4]: whole-program analysis proved both operands are numbers.
    if (node[4]) return vBinaryNumber(node[1], left, expression(nodes[node[3]], env, locals, self, actuals));
    return vBinary(node[1], left, expression(nodes[node[3]], env, locals, self, actuals));
  }
  if (tag === 5) {
    if (node[3]) return vUnaryNumber(node[1], expression(nodes[node[2]], env, locals, self, actuals));
    return vUnary(node[1], expression(nodes[node[2]], env, locals, self, actuals));
  }
  if (tag === 6) {
    var chosen = vUndef();
    if (test(nodes[node[1]], env, locals, self, actuals)) chosen = expression(nodes[node[2]], env, locals, self, actuals);
    else chosen = expression(nodes[node[3]], env, locals, self, actuals);
    return chosen;
  }
  if (tag === 7) {
    var array = arrayNewLiteral(node[2]);
    var i = 0;
    while (i < node[2]) {
      if (lists[node[1] + i] >= 0) arrSet(array, i, expression(nodes[lists[node[1] + i]], env, locals, self, actuals));
      i = i + 1;
    }
    return array;
  }
  if (tag === 8) {
    var base = expression(nodes[node[2]], env, locals, self, actuals);
    // node[4]: the property is proved to be an own property of any object
    // base. node[5]: it is also proved to be inline slot node[5] - 1.
    if (node[1] >= 0) {
      // A property of the receiver that its known shape has is at its slot.
      if (node[1] > 0 && nodes[node[2]][0] === 12) {
        var at = shapeSlot(self[1], node[1]);
        if (at >= 0) return objGetAt(base, node[1], at);
      }
      // node[6]: the base is proved to be an object, null or undefined.
      // Otherwise it may be a string, number or boolean, which read through
      // their root prototypes.
      if (!node[6]) return objGetAny(base, node[1]);
      if (node[5]) return objGetSlot(base, node[1], node[5] - 1);
      if (node[4]) return objGetOwn(base, node[1]);
      return objGet(base, node[1]);
    }
    // node[5]: the base is proved to be an object, null or undefined.
    // Otherwise it may be a string, number or boolean.
    if (!node[5]) return anyGet(base, expression(nodes[node[3]], env, locals, self, actuals));
    // node[4]: the key is proved to be a number, so this is an array index.
    if (node[4]) return arrGet(base, vNumber(expression(nodes[node[3]], env, locals, self, actuals)));
    return keyedGet(base, expression(nodes[node[3]], env, locals, self, actuals));
  }
  if (tag === 9 || tag === 10) {
    var target = nodes[node[2]];
    var kind = 0;
    var address = 0;
    var object = vUndef();
    var name = vUndef();
    // The target is a named property of the receiver itself.
    // (Atom 0 is `length`, which an array keeps outside its shape.)
    var own = target[0] === 8 && target[1] > 0 && nodes[target[2]][0] === 12;
    if (target[0] === 3) {
      if (target[3] >= 0) { kind = 3; address = target[3]; }
      else { object = frame(env, target[1]); address = target[2]; }
    } else {
      object = expression(nodes[target[2]], env, locals, self, actuals);
      if (target[1] >= 0) { kind = 1; address = target[1]; }
      else if (target[4] && target[5]) { kind = 2; address = vNumber(expression(nodes[target[3]], env, locals, self, actuals)); }
      else { kind = 4; name = expression(nodes[target[3]], env, locals, self, actuals); }
    }
    var old = vUndef();
    if (tag === 10 || node[1] !== 0) {
      if (kind === 3) old = locals[address];
      else if (kind === 0) old = envGet(object, address);
      else if (kind === 1) {
        var oldAt = -1;
        if (own) oldAt = shapeSlot(self[1], address);
        if (oldAt >= 0) old = objGetAt(object, address, oldAt);
        else if (!node[8]) old = objGetAny(object, address);
        else if (node[4] && node[7]) old = objGetSlot(object, address, node[7] - 1);
        else if (node[4]) old = objGetOwn(object, address);
        else old = objGet(object, address);
      }
      else if (kind === 2) old = arrGet(object, address);
      else if (target[5]) old = keyedGet(object, name);
      else old = anyGet(object, name);
    }
    // A logical assignment evaluates its right-hand side, and assigns, only
    // when the old value calls for it.
    if (tag === 9 && node[1] >= 21) {
      var wanted = vTruth(old);
      if (node[1] === 23) wanted = vIsNullish(old);
      var settled = old;
      if (node[1] === 22) {
        if (!wanted) { settled = expression(nodes[node[3]], env, locals, self, actuals); storeTo(kind, node, locals, address, object, name, settled, self, own); }
      } else if (wanted) { settled = expression(nodes[node[3]], env, locals, self, actuals); storeTo(kind, node, locals, address, object, name, settled, self, own); }
      return settled;
    }
    var value = vUndef();
    // node[5]: the old value (and a compound right-hand side) is proved numeric.
    if (tag === 10) {
      if (node[5]) value = vBinaryNumber(1, old, vNum(node[1]));
      else { old = vUnary(2, old); value = vBinary(1, old, vNum(node[1])); }
    } else {
      value = expression(nodes[node[3]], env, locals, self, actuals);
      if (node[1] !== 0) { if (node[5]) value = vBinaryNumber(node[1], old, value); else value = vBinary(node[1], old, value); }
    }
    storeTo(kind, node, locals, address, object, name, value, self, own);
    if (tag === 10 && !node[3]) return old;
    return value;
  }
  if (tag === 11 || tag === 16 || tag === 17) {
    var receiver = vUndef();
    var callee = vUndef();
    var argsStart = node[2];
    var argsCount = node[3];
    var constructor = 0;
    var direct = -1;
    var candidates = node[5];
    var candidateCount = node[6];
    var staticEnv = vUndef();
    if (tag === 16) {
      receiver = expression(nodes[node[1]], env, locals, self, actuals);
      // Lookup precedes argument evaluation, even when arguments mutate it.
      // node[7]: the one function this lookup can find, when proved. Only the
      // lookup's failure on a non-object receiver (node[8]) is left to do.
      if (node[7] >= 0) {
        direct = node[7];
        if (node[8]) objRequire(receiver);
        staticEnv = frame(env, node[9]);
      } else if (node[11]) callee = objGet(receiver, node[2]);
      else callee = objGetAny(receiver, node[2]);
      argsStart = node[3]; argsCount = node[4];
    } else if (tag === 17) {
      direct = node[1];
      callee = read(env, node[2], node[6]);
      argsStart = node[3]; argsCount = node[4]; constructor = node[5];
    } else {
      callee = expression(nodes[node[1]], env, locals, self, actuals);
      constructor = node[4];
    }
    var args = allocArgs(argsCount);
    var j = 0;
    while (j < argsCount) {
      storeValue(args, j, expression(nodes[lists[argsStart + j]], env, locals, self, actuals));
      j = j + 1;
    }
    if (constructor) receiver = constructReceiver(callee);
    // Whatever runs may add to the receiver: its shape is a lower bound now.
    self[2] = 0;
    var value = vUndef();
    if (direct >= 0) {
      if (tag === 16) value = callGuest(direct, staticEnv, receiver, args);
      else value = callGuest(direct, fnEnv(callee), receiver, args);
    }
    else if (node[10]) value = dispatchSplit(fnCode(callee), fnEnv(callee), receiver, args, candidates, candidateCount);
    else value = dispatchCall(fnCode(callee), fnEnv(callee), receiver, args, candidates, candidateCount);
    if (constructor) return constructResult(receiver, value);
    return value;
  }
  if (tag === 12) return self[0];
  if (tag === 13) return vNum(f64Sqrt(vNumber(expression(nodes[node[1]], env, locals, self, actuals))));
  if (tag === 14) {
    var value = vUndef();
    var k = 0;
    while (k < node[2]) { value = expression(nodes[lists[node[1] + k]], env, locals, self, actuals); k = k + 1; }
    return value;
  }
  if (tag === 15) { if (node[2]) return fnNewArrow(node[1], env); return fnNew(node[1], env, functions[node[1]][8], functions[node[1]][9]); }
  if (tag === 18) return read(env, node[2], node[3]);
  if (tag === 19) return arrayNewLength(vNumber(expression(nodes[node[1]], env, locals, self, actuals)));
  // Forms only the builtin prelude can write.
  if (tag === 22) return vNum(frameArgCount(actuals));
  if (tag === 23) return frameArg(actuals, vNumber(expression(nodes[node[1]], env, locals, self, actuals)));
  if (tag === 24) {
    // Call a function with a given receiver and this activation's own
    // arguments from position node[3] on.
    var forwarded = expression(nodes[node[1]], env, locals, self, actuals);
    var forwardedReceiver = expression(nodes[node[2]], env, locals, self, actuals);
    self[2] = 0;
    return callRest(fnCode(forwarded), fnEnv(forwarded), forwardedReceiver, actuals, node[3]);
  }
  if (tag === 25) return objRootProto(node[1]);
  if (tag === 38) return objCreate(expression(nodes[node[1]], env, locals, self, actuals));
  if (tag === 39) {
    var reparented = expression(nodes[node[1]], env, locals, self, actuals);
    return objSetProto(reparented, expression(nodes[node[2]], env, locals, self, actuals));
  }
  if (tag === 34) {
    // A rest parameter: the actual arguments from position node[1] on.
    var total = frameArgCount(actuals);
    var tail = arrayNewLength(0);
    var position = node[1];
    while (position < total) { arrPush(tail, frameArg(actuals, position)); position = position + 1; }
    return tail;
  }
  if (tag === 35) {
    // An array built from elements, spreads and holes, in order.
    var built = arrayNewLength(0);
    var piece = 0;
    while (piece < node[2]) {
      var pieceKind = lists[node[1] + piece * 2];
      if (pieceKind === 2) objSet(built, 0, vBinaryNumber(1, objGet(built, 0), vNum(1)));
      else if (pieceKind === 1) arrAppendAll(built, expression(nodes[lists[node[1] + piece * 2 + 1]], env, locals, self, actuals));
      else arrPush(built, expression(nodes[lists[node[1] + piece * 2 + 1]], env, locals, self, actuals));
      piece = piece + 1;
    }
    return built;
  }
  if (tag === 37) {
    // A call whose arguments include a spread. node[1]: 0 a plain call,
    // 1 a construction, 2 a method call on node[2] with key node[3].
    var spreadTarget = expression(nodes[node[2]], env, locals, self, actuals);
    var spreadReceiver = vUndef();
    var spreadCallee = spreadTarget;
    if (node[1] === 2) { spreadReceiver = spreadTarget; spreadCallee = objGetAny(spreadTarget, node[3]); }
    if (node[1] === 3) spreadReceiver = expression(nodes[node[3]], env, locals, self, actuals);
    var spreadList = expression(nodes[node[4]], env, locals, self, actuals);
    if (node[1] === 1) spreadReceiver = constructReceiver(spreadCallee);
    self[2] = 0;
    var spreadResult = callSpread(fnCode(spreadCallee), fnEnv(spreadCallee), spreadReceiver, spreadList);
    if (node[1] === 1) return constructResult(spreadReceiver, spreadResult);
    return spreadResult;
  }
  if (tag === 36) {
    // Call a function value with an explicit receiver.
    var called = expression(nodes[node[1]], env, locals, self, actuals);
    var calledReceiver = expression(nodes[node[2]], env, locals, self, actuals);
    var calledArgs = allocArgs(node[4]);
    var c = 0;
    while (c < node[4]) {
      storeValue(calledArgs, c, expression(nodes[lists[node[3] + c]], env, locals, self, actuals));
      c = c + 1;
    }
    self[2] = 0;
    return callGuest(fnCode(called), fnEnv(called), calledReceiver, calledArgs);
  }
  if (tag === 31) {
    // A string primitive for the prelude; node[1] selects it.
    var text = expression(nodes[node[2]], env, locals, self, actuals);
    if (node[1] === 1) return vNum(strCharCodeAt(text, vNumber(expression(nodes[node[3]], env, locals, self, actuals))));
    if (node[1] === 2) return strFromCharCode(vNumber(text));
    if (node[1] === 3) {
      var sliceFrom = vNumber(expression(nodes[node[3]], env, locals, self, actuals));
      return strSlice(text, sliceFrom, vNumber(expression(nodes[node[4]], env, locals, self, actuals)));
    }
    var needle = expression(nodes[node[3]], env, locals, self, actuals);
    return vNum(strIndexOf(text, needle, vNumber(expression(nodes[node[4]], env, locals, self, actuals))));
  }
  if (tag === 32) {
    // A Math function for the prelude; node[1] selects it, node[3] < 0 if unary.
    var mathLeft = vNumber(expression(nodes[node[2]], env, locals, self, actuals));
    if (node[3] < 0) return vNum(f64Math(node[1], mathLeft, 0));
    return vNum(f64Math(node[1], mathLeft, vNumber(expression(nodes[node[3]], env, locals, self, actuals))));
  }
  if (tag === 33) return vBool(arrIs(expression(nodes[node[1]], env, locals, self, actuals)));
  if (tag === 28) return vTypeof(expression(nodes[node[1]], env, locals, self, actuals));
  if (tag === 29) {
    var instance = expression(nodes[node[1]], env, locals, self, actuals);
    return vBool(objInstanceOf(instance, expression(nodes[node[2]], env, locals, self, actuals)));
  }
  if (tag === 30) {
    var sought = expression(nodes[node[1]], env, locals, self, actuals);
    return vBool(keyedHas(expression(nodes[node[2]], env, locals, self, actuals), sought));
  }
  if (tag === 26) {
    var owner = expression(nodes[node[1]], env, locals, self, actuals);
    return vBool(keyedHas(owner, expression(nodes[node[2]], env, locals, self, actuals)));
  }
  if (tag === 27) {
    var defined = expression(nodes[node[1]], env, locals, self, actuals);
    var definedKey = expression(nodes[node[2]], env, locals, self, actuals);
    var definedValue = expression(nodes[node[3]], env, locals, self, actuals);
    self[2] = 0;
    return objDefine(defined, definedKey, definedValue, vNumber(expression(nodes[node[4]], env, locals, self, actuals)));
  }
  if (tag === 20) {
    var record = objNew(objRootProto(0), node[2]);
    var p = 0;
    while (p < node[2]) {
      var pair = node[1] + p * 2;
      objSet(record, lists[pair], expression(nodes[lists[pair + 1]], env, locals, self, actuals));
      p = p + 1;
    }
    return record;
  }
  // An error object of the builtin kind named by node[2].
  var failure = objError(expression(nodes[node[1]], env, locals, self, actuals));
  objSet(failure, 3, expression(nodes[node[2]], env, locals, self, actuals));
  return failure;
}
function execute(node, env, locals, self, actuals) {
  var tag = node[0];
  if (tag === 100) return 0;
  if (tag === 101) { expression(nodes[node[1]], env, locals, self, actuals); return 0; }
  if (tag === 102) {
    var i = 0;
    while (i < node[2]) {
      var entry = node[1] + i * 3;
      if (lists[entry + 2] >= 0) {
        var initialized = expression(nodes[lists[entry + 2]], env, locals, self, actuals);
        if (lists[entry] < 0) locals[lists[entry + 1]] = initialized;
        else write(env, lists[entry], lists[entry + 1], initialized);
      }
      i = i + 1;
    }
    return 0;
  }
  if (tag === 103) {
    var value103 = vUndef();
    if (node[1] >= 0) value103 = expression(nodes[node[1]], env, locals, self, actuals);
    returned = value103; return 1;
  }
  if (tag === 104) return 2;
  if (tag === 105) return 3;
  if (tag === 106) {
    if (test(nodes[node[1]], env, locals, self, actuals)) return execute(nodes[node[2]], env, locals, self, actuals);
    return execute(nodes[node[3]], env, locals, self, actuals);
  }
  if (tag === 107 || tag === 108) {
    var condition = node[1];
    var body = node[2];
    var update = node[4];
    // Closures created in one iteration keep that iteration's bindings. The
    // decision is read from the syntax once, outside the residual loop.
    var perIteration = tag === 108 && node[6] && node[5] > 0;
    var hasUpdate = tag === 108 && update >= 0;
    if (tag === 108) {
      if (node[5] > 0) env = envNew(env, node[5], self[0]);
      execute(nodes[node[3]], env, locals, self, actuals);
      if (perIteration) env = envCopy(env);
    }
    while (test(nodes[condition], env, locals, self, actuals)) {
      var status = execute(nodes[body], env, locals, self, actuals);
      if (status === 1) return 1;
      if (status === 5) return 5;
      if (status === 2) return 0;
      if (perIteration) env = envCopy(env);
      if (hasUpdate) expression(nodes[update], env, locals, self, actuals);
    }
    return 0;
  }
  // A throw does not come back. The completion written after it only gives
  // the residual program a well-formed, unreachable exit.
  if (tag === 110) {
    var raised = expression(nodes[node[1]], env, locals, self, actuals);
    returned = vUndef();
    throwValue(raised);
    return 1;
  }
  if (tag === 113) {
    // try. node[1] and node[2] are the block and the handler as closures
    // over this scope; node[3] is the finalizer; node[4], node[5] locate
    // the value of a `return` executed inside a protected part.
    var noArguments = allocArgs(0);
    self[2] = 0;
    var outcome = callProtected(node[1], env, self[0], noArguments);
    var throwing = tookThrow();
    var thrown = vUndef();
    var tryStatus = 0;
    if (throwing) thrown = outcome;
    else tryStatus = vNumber(outcome);
    if (node[2] >= 0) {
      if (throwing) {
        var handlerArguments = allocArgs(1);
        storeValue(handlerArguments, 0, thrown);
        throwing = 0;
        // Only a finalizer makes a throw from the handler something to intercept.
        if (node[3] >= 0) {
          outcome = callProtected(node[2], env, self[0], handlerArguments);
          throwing = tookThrow();
          if (throwing) thrown = outcome;
          else tryStatus = vNumber(outcome);
        } else tryStatus = vNumber(callGuest(node[2], env, self[0], handlerArguments));
      }
    }
    if (node[3] >= 0) {
      // An abrupt finalizer replaces whatever was pending.
      var finalStatus = execute(nodes[node[3]], env, locals, self, actuals);
      if (finalStatus !== 0) return finalStatus;
    }
    if (throwing) { throwValue(thrown); return 1; }
    // A protected part that returned left the value in the result slot.
    if (tryStatus === 1) return 5;
    return tryStatus;
  }
  if (tag === 111) {
    // do-while: the body runs before each test.
    var doCondition = node[1];
    var doBody = node[2];
    var again = 1;
    while (again) {
      var doStatus = execute(nodes[doBody], env, locals, self, actuals);
      if (doStatus === 1) return 1;
      if (doStatus === 5) return 5;
      if (doStatus === 2) return 0;
      again = test(nodes[doCondition], env, locals, self, actuals);
    }
    return 0;
  }
  if (tag === 112) {
    // switch. Clause tests run in order until one is strictly equal to the
    // discriminant; execution then falls through the following clause
    // bodies. `entered` is the only runtime state: which clause is being
    // considered is always static.
    var selector = expression(nodes[node[1]], env, locals, self, actuals);
    var entered = 0;
    var clause = 0;
    while (clause < node[3]) {
      var clauseTest = lists[node[2] + clause * 2];
      if (!entered && clauseTest >= 0) entered = vStrictEq(selector, expression(nodes[clauseTest], env, locals, self, actuals));
      if (entered) {
        var clauseStatus = execute(nodes[lists[node[2] + clause * 2 + 1]], env, locals, self, actuals);
        if (clauseStatus === 2) return 0;
        if (clauseStatus !== 0) return clauseStatus;
      }
      clause = clause + 1;
    }
    // Nothing matched: enter at the default clause, if there is one.
    if (!entered && node[4] >= 0) {
      clause = node[4];
      while (clause < node[3]) {
        var defaultStatus = execute(nodes[lists[node[2] + clause * 2 + 1]], env, locals, self, actuals);
        if (defaultStatus === 2) return 0;
        if (defaultStatus !== 0) return defaultStatus;
        clause = clause + 1;
      }
    }
    return 0;
  }
  if (node[3] > 0) env = envNew(env, node[3], self[0]);
  var j = 0;
  while (j < node[2]) {
    var completion = execute(nodes[lists[node[1] + j]], env, locals, self, actuals);
    if (completion !== 0) return completion;
    j = j + 1;
  }
  return 0;
}
