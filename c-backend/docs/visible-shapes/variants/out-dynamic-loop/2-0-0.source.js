function entry(carrier) {
var prog = {"functions":[{"name":"main","params":1,"locals":3,"body":30},{"name":"Vec","params":2,"locals":2,"body":37},{"name":"Vec.add","params":1,"locals":1,"body":50},{"name":"Ent","params":2,"locals":2,"body":57},{"name":"Ent.step","params":0,"locals":0,"body":65}],"classes":[{"ctor":1,"methods":{"add":2},"empty":0},{"ctor":3,"methods":{"step":4},"empty":1}]};
var nodes = [["num",1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["num",2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["new",0,[0,1],0,0,0,0,0,0,0,0,0,0,0,0,0,0],["local",0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["num",3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["new",0,[3,4],0,0,0,0,0,0,0,0,0,0,0,0,0,0],["new",1,[2,5],0,0,0,0,0,0,0,0,0,0,0,0,0,0],["setlocal",1,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["num",0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["setlocal",2,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["local",2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["local",0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["bin","<",10,11,0,0,0,0,0,0,0,0,0,0,0,0,0],["local",1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["call",13,"step",[],0,0,0,0,0,0,0,0,0,0,0,0,0],["expr",14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["local",2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["num",1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["bin","+",16,17,0,0,0,0,0,0,0,0,0,0,0,0,0],["setlocal",2,18,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["block",[15,19],0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["while",12,20,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["local",1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["get",22,"pos",0,0,0,0,0,0,0,0,0,0,0,0,0,0],["get",23,"x",0,0,0,0,0,0,0,0,0,0,0,0,0,0],["local",1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["get",25,"pos",0,0,0,0,0,0,0,0,0,0,0,0,0,0],["get",26,"y",0,0,0,0,0,0,0,0,0,0,0,0,0,0],["bin","+",24,27,0,0,0,0,0,0,0,0,0,0,0,0,0],["return",28,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["block",[7,9,21,29],0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["this",0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["local",0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["setprop",31,"x",32,0,0,0,0,0,0,0,0,0,0,0,0,0],["this",0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["local",1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["setprop",34,"y",35,0,0,0,0,0,0,0,0,0,0,0,0,0],["block",[33,36],0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["this",0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["get",38,"x",0,0,0,0,0,0,0,0,0,0,0,0,0,0],["local",0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["get",40,"x",0,0,0,0,0,0,0,0,0,0,0,0,0,0],["bin","+",39,41,0,0,0,0,0,0,0,0,0,0,0,0,0],["this",0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["get",43,"y",0,0,0,0,0,0,0,0,0,0,0,0,0,0],["local",0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["get",45,"y",0,0,0,0,0,0,0,0,0,0,0,0,0,0],["bin","+",44,46,0,0,0,0,0,0,0,0,0,0,0,0,0],["new",0,[42,47],0,0,0,0,0,0,0,0,0,0,0,0,0,0],["return",48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["block",[49],0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["this",0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["local",0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["setprop",51,"pos",52,0,0,0,0,0,0,0,0,0,0,0,0,0],["this",0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["local",1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["setprop",54,"vel",55,0,0,0,0,0,0,0,0,0,0,0,0,0],["block",[53,56],0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["this",0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["this",0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["get",59,"pos",0,0,0,0,0,0,0,0,0,0,0,0,0,0],["this",0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],["get",61,"vel",0,0,0,0,0,0,0,0,0,0,0,0,0,0],["call",60,"add",[62],0,0,0,0,0,0,0,0,0,0,0,0,0],["setprop",58,"pos",63,0,0,0,0,0,0,0,0,0,0,0,0,0],["block",[64],0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]];
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
// Guest syntax is one flat table: `nodes[id]` is the row of an expression,
// a statement or a block, and a row names its children by id. The evaluator's
// recursive calls pass the ROW, not the id. That is what lets the
// specializer unfold them under a residual loop: it unfolds a recursive call
// made under dynamic control only when an argument moved to a different
// static structure than every active activation has, and it counts all
// static numbers as the same value (so a counter cannot drive unbounded
// unfolding). Rows are NODE_WIDTH wide, which is past the width up to which
// the specializer compares arrays by content, so a row is told apart by
// which row it is.
//
// Static tables, supplied by the driver around this text:
//   prog.functions[code] = { params, locals, body: block node id }
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
    var a = evaluate(nodes[e[2]], self, values, known, exact), aShape = shapeOut;
    var b = evaluate(nodes[e[3]], self, values, known, exact), bShape = shapeOut;
    var numbers = (aShape === -1) & (bShape === -1);
    var out = 0;
    if (numbers) { if (e[1] === "+") out = a + b; else out = a < b ? 1 : 0; }
    else out = hostArith(e[1], a, b);
    shapeOut = numbers ? -1 : hostShapeOf(out);
    return out;
  }
  if (tag === "get") {
    var holder = variable(nodes[e[1]], self), ref = 0, id = -1;
    if (holder >= 0) { ref = values[holder]; id = known[holder]; }
    else { ref = evaluate(nodes[e[1]], self, values, known, exact); id = shapeOut; }
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
  var target = variable(nodes[e[1]], self), receiver = 0, shape = -1;
  if (target >= 0) { receiver = values[target]; shape = known[target]; exact[target] = 0; }
  else { receiver = evaluate(nodes[e[1]], self, values, known, exact); shape = shapeOut; }
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
  while (i < list.length) { out[i] = evaluate(nodes[list[i]], self, values, known, exact); i = i + 1; }
  return out;
}
function execute(block, self, values, known, exact, frame) {
  var list = block[1], i = 0;
  while (i < list.length) {
    var s = nodes[list[i]], tag = s[0];
    if (tag === "setprop") {
      var stored = evaluate(nodes[s[3]], self, values, known, exact);
      set(variable(nodes[s[1]], self), s[2], stored, values, known, exact);
    } else if (tag === "setlocal") {
      var value = evaluate(nodes[s[2]], self, values, known, exact);
      values[s[1]] = value;
      known[s[1]] = shapeOut;
      exact[s[1]] = 0;
    } else if (tag === "while") {
      while (evaluate(nodes[s[1]], self, values, known, exact)) execute(nodes[s[2]], self, values, known, exact, frame);
    } else if (tag === "return") frame.result = evaluate(nodes[s[1]], self, values, known, exact);
    else evaluate(nodes[s[1]], self, values, known, exact);
    i = i + 1;
  }
}

var f = prog.functions[2], values = [], known = [], exact = [], i = 0;
while (i < f.locals) { values[i] = 0; known[i] = -1; exact[i] = 0; i = i + 1; }
i = 0;
while (i < f.params) { var a = hostArg(carrier, i); values[i] = a; known[i] = hostShapeOf(a); i = i + 1; }
var me = hostThis(carrier), self = f.locals;
values[self] = me;
known[self] = 0;
exact[self] = 0;
var frame = { result: 0 };
execute(nodes[f.body], self, values, known, exact, frame);
hostExit(known[self]);
return frame.result;
}
