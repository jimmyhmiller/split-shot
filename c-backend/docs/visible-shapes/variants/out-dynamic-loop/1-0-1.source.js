function entry(carrier) {
var prog = {"functions":[{"name":"main","params":1,"locals":3,"body":[["setlocal",1,["new",1,[["new",0,[["num",1],["num",2]]],["new",0,[["local",0],["num",3]]]]]],["setlocal",2,["num",0]],["while",["bin","<",["local",2],["local",0]],[["expr",["call",["local",1],"step",[]]],["setlocal",2,["bin","+",["local",2],["num",1]]]]],["return",["bin","+",["get",["get",["local",1],"pos"],"x"],["get",["get",["local",1],"pos"],"y"]]]]},{"name":"Vec","params":2,"locals":2,"body":[["setprop",["this"],"x",["local",0]],["setprop",["this"],"y",["local",1]]]},{"name":"Vec.add","params":1,"locals":1,"body":[["return",["new",0,[["bin","+",["get",["this"],"x"],["get",["local",0],"x"]],["bin","+",["get",["this"],"y"],["get",["local",0],"y"]]]]]]},{"name":"Ent","params":2,"locals":2,"body":[["setprop",["this"],"pos",["local",0]],["setprop",["this"],"vel",["local",1]]]},{"name":"Ent.step","params":0,"locals":0,"body":[["setprop",["this"],"pos",["call",["get",["this"],"pos"],"add",[["get",["this"],"vel"]]]]]}],"classes":[{"ctor":1,"methods":{"add":2},"empty":0},{"ctor":3,"methods":{"step":4},"empty":1}]};
var shapes = [{"cls":0,"keys":[]},{"cls":1,"keys":[]},{"cls":0,"keys":["x"]},{"cls":1,"keys":["pos"]},{"cls":0,"keys":["x","y"]},{"cls":1,"keys":["pos","vel"]}];
var transitions = {"0:x":2,"1:pos":3,"2:y":4,"3:vel":5};
var exits = {"1:0":4,"3:1":5};
// A small object interpreter in which an object's shape is something the
// partial evaluator can see. Guest syntax, the class table, the shape table
// and the transition table are static.
//
// Next to every guest value the interpreter keeps a shape id: a shape the
// object is known to have at least, or -1 for a number. The id is a literal
// where it is known and a run-time number where it is not; the same code
// handles both, and the specializer folds it when it is a literal.
//
// Variables live in three parallel arrays indexed by slot: `values`,
// `known` (the shape id) and `exact` (1 when the id is the object's exact
// shape and nothing else refers to it yet). `this` is the slot after the
// last local. An expression's value is returned and its shape id is left in
// `shapeOut`, written immediately before the return and read immediately
// after the call.
//
// Static tables, supplied by the driver around this text:
//   prog.functions[code] = { params, locals, body }
//   prog.classes[cls]    = { ctor: code, methods: { name: code }, empty: shape }
//   shapes[id]           = { cls, keys: [...] }
//   transitions["id:key"] = id of the shape with that key added
//   exits["code:shape"]  = the receiver's shape when that constructor returns
var shapeOut = -1;
function slotOf(shape, key) {
  var keys = shapes[shape].keys, i = 0;
  while (i < keys.length) { if (keys[i] === key) return i; i = i + 1; }
  return -1;
}
// The slot of `key` in the shape `id` names, or -1. With a literal id this
// is a literal; with a run-time id it is a chain of comparisons selecting one.
function findSlot(id, key) {
  var slot = -1, k = 0;
  while (k < shapes.length) {
    if (slotOf(k, key) >= 0) { if (id === k) slot = slotOf(k, key); }
    k = k + 1;
  }
  return slot;
}
function get(id, ref, key) {
  var slot = findSlot(id, key);
  // The known shape is a lower bound: a key it lacks may still be there.
  if (slot < 0) slot = findSlot(hostShapeOf(ref), key);
  var out = hostLoad(ref, slot, key);
  shapeOut = hostShapeOf(out);
  return out;
}
// Store to a property of the variable in `slot`.
function set(target, key, value, values, known, exact) {
  var at = findSlot(known[target], key);
  if (at >= 0) hostStore(values[target], at, value);
  else {
    var next = undefined;
    if (exact[target]) next = transitions[known[target] + ":" + key];
    if (next !== undefined) {
      // An object nothing else refers to, whose exact shape is known: the
      // new shape and the new slot are decided now.
      hostAdd(values[target], next, slotOf(next, key), value);
      known[target] = next;
    } else {
      if (exact[target]) hostNeedShape(known[target], key);
      hostSetGeneric(values[target], key, value);
      exact[target] = 0;
    }
  }
}
// The method `name` of the class of shape `id`, or that shape, as a number
// selected by comparisons; -1 when `id` is none of the candidates.
function findMethod(id, name, wantVariant) {
  var found = -1, k = 0;
  while (k < shapes.length) {
    var code = prog.classes[shapes[k].cls].methods[name];
    if (code !== undefined) { if (id === k) found = wantVariant ? k : code; }
    k = k + 1;
  }
  return found;
}
// The variable an expression in base position names, or -1.
function variable(e, self) {
  if (e[0] === "this") return self;
  if (e[0] === "local") return e[1];
  return -1;
}
function evaluate(e, self, values, known, exact) {
  var tag = e[0];
  if (tag === "num") { shapeOut = -1; return e[1]; }
  if (tag === "local" || tag === "this") {
    // Used as a value, the object may now be referred to from elsewhere.
    var named = variable(e, self);
    exact[named] = 0;
    shapeOut = known[named];
    return values[named];
  }
  if (tag === "bin") {
    var a = evaluate(e[2], self, values, known, exact), aShape = shapeOut;
    var b = evaluate(e[3], self, values, known, exact), bShape = shapeOut;
    var numbers = (aShape === -1) & (bShape === -1);
    var out = 0;
    if (numbers) { if (e[1] === "+") out = a + b; else out = a < b ? 1 : 0; }
    else out = hostArith(e[1], a, b);
    shapeOut = numbers ? -1 : hostShapeOf(out);
    return out;
  }
  if (tag === "get") {
    var holder = variable(e[1], self), ref = 0, id = -1;
    if (holder >= 0) { ref = values[holder]; id = known[holder]; }
    else { ref = evaluate(e[1], self, values, known, exact); id = shapeOut; }
    return get(id, ref, e[2]);
  }
  if (tag === "new") {
    var cls = prog.classes[e[1]];
    var exit = exits[cls.ctor + ":" + cls.empty];
    var made = hostNew(cls.empty, exit === undefined ? 0 : shapes[exit].keys.length);
    hostCall(cls.ctor, cls.empty, 1, "", made, argumentsOf(e[2], self, values, known, exact));
    if (exit === undefined) { hostNeedExit(cls.ctor, cls.empty); shapeOut = cls.empty; }
    else shapeOut = exit;
    return made;
  }
  // A method call. The callee is specialized for the receiver's shape.
  var target = variable(e[1], self), receiver = 0, shape = -1;
  if (target >= 0) { receiver = values[target]; shape = known[target]; exact[target] = 0; }
  else { receiver = evaluate(e[1], self, values, known, exact); shape = shapeOut; }
  var code = findMethod(shape, e[2], 0), variant = findMethod(shape, e[2], 1);
  if (code < 0) {
    var actual = hostShapeOf(receiver);
    code = findMethod(actual, e[2], 0);
    variant = findMethod(actual, e[2], 1);
  }
  var result = hostCall(code, variant, 0, e[2], receiver, argumentsOf(e[3], self, values, known, exact));
  shapeOut = hostShapeOf(result);
  return result;
}
function argumentsOf(list, self, values, known, exact) {
  var out = [], i = 0;
  while (i < list.length) { out[i] = evaluate(list[i], self, values, known, exact); i = i + 1; }
  return out;
}
function execute(list, self, values, known, exact, frame) {
  var i = 0;
  while (i < list.length) {
    var s = list[i], tag = s[0];
    if (tag === "setprop") {
      var stored = evaluate(s[3], self, values, known, exact);
      set(variable(s[1], self), s[2], stored, values, known, exact);
    } else if (tag === "setlocal") {
      var value = evaluate(s[2], self, values, known, exact);
      values[s[1]] = value;
      known[s[1]] = shapeOut;
      exact[s[1]] = 0;
    } else if (tag === "while") {
      while (evaluate(s[1], self, values, known, exact)) execute(s[2], self, values, known, exact, frame);
    } else if (tag === "return") frame.result = evaluate(s[1], self, values, known, exact);
    else evaluate(s[1], self, values, known, exact);
    i = i + 1;
  }
}

var f = prog.functions[1], values = [], known = [], exact = [], i = 0;
while (i < f.locals) { values[i] = 0; known[i] = -1; exact[i] = 0; i = i + 1; }
i = 0;
while (i < f.params) { var a = hostArg(carrier, i); values[i] = a; known[i] = hostShapeOf(a); i = i + 1; }
var me = hostThis(carrier), self = f.locals;
values[self] = me;
known[self] = 0;
exact[self] = 1;
var frame = { result: 0 };
execute(f.body, self, values, known, exact, frame);
hostExit(known[self]);
return frame.result;
}
