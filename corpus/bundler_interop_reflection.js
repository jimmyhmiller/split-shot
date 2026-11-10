// inputs: [0, 3]
// forbid-main: getPrototypeOf|getOwnPropertyNames|Object\.create|\? 
// What bundlers' module interop does with a module object folds (pad
// partial-new-bugs, gaps A-C): Object.getPrototypeOf of an object, array or
// function with a standard prototype is that prototype; a pristine built-in
// method is truthy (Turbopack's `Object.getPrototypeOf ? ... : ...`);
// Object.getOwnPropertyNames of an ordinary object lists every own string
// key (esbuild's __copyProps); Object.create(Object.prototype) is `{}`.
function main(input) {
  var y = Object.getPrototypeOf ? function (e) { return Object.getPrototypeOf(e); } : function (e) { return e.__proto__; };
  var protos = [null, y({}), y([]), y(y)];
  var mod = { default: function (x) { return x * 2; }, version: "1.0" };
  Object.defineProperty(mod, "__esModule", { value: true, enumerable: false });
  var target = Object.create(Object.getPrototypeOf(mod));
  for (var key of Object.getOwnPropertyNames(mod)) {
    if (key !== "default") target[key] = mod[key];
  }
  target.default = mod.default;
  var depth = 0;
  for (var p = Object.getPrototypeOf(mod); p !== null && !protos.includes(p); p = Object.getPrototypeOf(p)) depth++;
  return [protos.indexOf(Function.prototype), Object.keys(target).join(), target.__esModule, depth, target.default(input)].join("|");
}
