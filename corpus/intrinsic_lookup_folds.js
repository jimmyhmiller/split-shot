// inputs: [{"k":"a"}, {"k":"b"}]
// forbid: null\.error
// forbid-main: getOwnPropertyDescriptor|indexOf|Reflect|hasOwn
// A get-intrinsic style lookup of standard members by name, run as the program loads, folds: `"prototype" in String` and `"indexOf" in String.prototype` are true, an own standard member is `hasOwnProperty` of its object (read with `String["prototype"]`), `Object.getOwnPropertyDescriptor` of a standard method is its data descriptor and of `Map.prototype.size` its accessor's (whose getter is a standard function, without an `originalValue`), and `Reflect.apply(bind, call, [f])` binds `call` to `f` as `bind.call(call, f)` does. The methods found stay what they are when runtime code gets them (`Function.prototype.bind`). A property of `null` read in a `try` throws the TypeError the engine throws, caught as the program loads.
var $call = Function.prototype.call, bind = Function.prototype.bind;
var callBind = function (f) { return Reflect.apply(bind, $call, [f]); };
var hasOwn = bind.call($call, Object.prototype.hasOwnProperty);
var INTR = { __proto__: null, "%String%": String, "%Map%": Map, "%Function%": Function };
function get(name) {
  var parts = name.split(".");
  var value = INTR["%" + parts[0] + "%"];
  for (var i = 1; i < parts.length; i++) {
    var part = parts[i];
    if (!(part in value)) return undefined;
    if (i + 1 >= parts.length) {
      var desc = Object.getOwnPropertyDescriptor(value, part);
      value = desc && "get" in desc && !("originalValue" in desc.get) ? desc.get : value[part];
    } else {
      if (!hasOwn(value, part)) return undefined;
      value = value[part];
    }
  }
  return value;
}
var indexOf = callBind(get("String.prototype.indexOf"));
var mapGet = callBind(get("Map.prototype.get"));
var mapSize = callBind(get("Map.prototype.size"));
var found = [indexOf("x.prototype.y", ".prototype."), typeof get("Map.prototype.size"), get("Function.prototype.bind") === bind];
var errName;
try { null.error; } catch (e) { errName = e instanceof TypeError && e.name + ": " + e.message; }
function main(input) {
  var m = new Map([[input.k, 1]]);
  return [found, mapGet(m, "a"), mapSize(m), errName, typeof bind, bind === Function.prototype.bind];
}
