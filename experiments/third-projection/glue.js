// mix's builtins as the functions it calls, and the static variables' values
// at entry (the given ones, the rest undefined).
function str(v) { return BUILTINS.str(v); }
function setAt(a, i, v) { return BUILTINS.setAt(a, i, v); }
function blockOf(program, label) { return BUILTINS.blockOf(program, label); }
function pointsOf(program, names) { return BUILTINS.pointsOf(program, names); }
function intern(state, seen) { return BUILTINS.intern(state, seen); }
function isStatic(e, names) { return BUILTINS.isStatic(e, names); }
function evalStatic(e, names, values) { return BUILTINS.evalStatic(e, names, values); }
function reduce(e, names, values) { return BUILTINS.reduce(e, names, values); }
function dynamicParams(program, names) { return BUILTINS.dynamicParams(program, names); }
function initial(names, given) { return names.map(function (x) { return Object.hasOwn(given, x) ? given[x] : undefined; }); }
