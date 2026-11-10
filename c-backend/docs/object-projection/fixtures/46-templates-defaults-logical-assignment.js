// @case {"description": "Template literals convert each substitution to a string; a default parameter applies to a missing or undefined argument, in order, and can use earlier parameters; logical assignments evaluate and assign only when the old value calls for it."}
function greet(name = "world", punctuation = name.length > 3 ? "!" : "?") { return `Hello, ${name}${punctuation}`; }
function counted(log, value = (log.calls = log.calls + 1, 7)) { return value; }
function main(x) {
  var log = { calls: 0 };
  var templates = [`plain`, ``, `${x}`, `a${x}b${x + 1}c`, `${null}|${undefined}|${true}`, `line
break`, `nested ${`inner ${x}`} done`, `A\n${"q"}`.length];
  var defaults = [greet(), greet("Al"), greet(undefined, "."), greet("Robin", undefined), greet("null"),
    counted(log), counted(log, 1), counted(log, undefined), log.calls, ((a, b = a * 2) => a + b)(x)];
  var state = { a: 0, b: 5, c: null, d: "kept", hits: 0 };
  function bump() { state.hits = state.hits + 1; return 9; }
  state.a ||= bump();
  state.b ||= bump();
  state.a &&= bump();
  state.c &&= bump();
  state.c ??= bump();
  state.d ??= bump();
  var local = x;
  local ||= 100;
  var other = x;
  other &&= other + 1;
  var list = [0, undefined];
  list[0] ||= "zero";
  list[1] ??= "one";
  var frozen = {};
  Object.defineProperty(frozen, "ready", { value: 1 });
  frozen.ready ||= 2;
  var coalesce = [null ?? "n", undefined ?? "u", 0 ?? "zero", "" ?? "empty", x ?? bump(), (null ?? undefined) ?? x, state.hits];
  return [templates, defaults, coalesce, [state.a, state.b, state.c, state.d, state.hits, local, other, list, frozen.ready]];
}
