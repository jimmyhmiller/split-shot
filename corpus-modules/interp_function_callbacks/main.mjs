// A rule interpreter written with ES5 functions, as json-logic-js is: its
// callbacks given to runtime arrays are function expressions capturing the
// rule in a `var` of the interpreter's (a cell `main` made, holding the
// load code's data: see `closure_data_fns`, `ArgShape::Made`); an operand
// that is a literal is given where a rule may be (a walk from a structure
// to a static primitive is progress, see `skel_progress`); an operand
// wrapped as `[values]` is a list of the program's values
// (`program_values`); a helper that reads no `this` is called without the
// interpreter's object (`reads_this`); and an operation called through
// `apply` with a runtime list changes nothing of the load code's state
// (`entry_pts`'s `f.apply`). The rule compiles to code over the input.
var jl = {};
var ops = {
  "+": function (a, b) { return a + b; },
  "*": function (a, b) { return a * b; },
  ">": function (a, b) { return a > b; },
  "var": function (name) { return this === null || this === undefined ? null : this[name]; },
  "sum": function () {
    var t = 0;
    for (var i = 0; i < arguments.length; i++) t += arguments[i];
    return t;
  }
};
jl.is_logic = function (l) {
  return typeof l === "object" && l !== null && !Array.isArray(l) && Object.keys(l).length === 1;
};
jl.truthy = function (v) {
  if (Array.isArray(v) && v.length === 0) return false;
  return !!v;
};
jl.apply = function (logic, data) {
  if (Array.isArray(logic)) {
    return logic.map(function (l) { return jl.apply(l, data); });
  }
  if (!jl.is_logic(logic)) return logic;
  var op = Object.keys(logic)[0];
  var values = logic[op];
  var scopedLogic, scopedData, i;
  if (!Array.isArray(values)) values = [values];
  if (op === "filter") {
    scopedData = jl.apply(values[0], data);
    scopedLogic = values[1];
    if (!Array.isArray(scopedData)) return [];
    return scopedData.filter(function (d) { return jl.truthy(jl.apply(scopedLogic, d)); });
  } else if (op === "map") {
    scopedData = jl.apply(values[0], data);
    scopedLogic = values[1];
    if (!Array.isArray(scopedData)) return [];
    return scopedData.map(function (d) { return jl.apply(scopedLogic, d); });
  } else if (op === "some") {
    scopedData = jl.apply(values[0], data);
    scopedLogic = values[1];
    if (!Array.isArray(scopedData) || !scopedData.length) return false;
    for (i = 0; i < scopedData.length; i += 1) {
      if (jl.truthy(jl.apply(scopedLogic, scopedData[i]))) return true;
    }
    return false;
  }
  values = values.map(function (v) { return jl.apply(v, data); });
  if (ops.hasOwnProperty(op) && typeof ops[op] === "function") return ops[op].apply(data, values);
  throw new Error("Unrecognized operation " + op);
};
var BIG = { filter: [{ var: "lines" }, { ">": [{ var: "qty" }, 2] }] };
var RULE = {
  sum: [
    [{ some: [{ var: "lines" }, { ">": [{ var: "price" }, 100] }] }],
    { map: [BIG, { "*": [{ var: "qty" }, { var: "price" }] }] }
  ]
};
export function main(input) {
  return jl.apply(RULE, input);
}
