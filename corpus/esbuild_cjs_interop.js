// inputs: ["a", "bc", "", 5]
// forbid-main: __require|getOwnPropertyNames|defineProperty|import_
// esbuild's CommonJS interop (`__commonJS`, `__copyProps`, `__toESM`) folds away, for a module that exports an object and for one that exports a function with properties: the own property names of a function of known code (`length`, `name`, `prototype`, then its own) and the descriptors of its `name` and `length` are known.
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var require_fn = __commonJS({
  "fn.js"(exports, module) {
    "use strict";
    module.exports = twice;
    function twice(s) { return s + s; }
    twice.tag = "T";
  }
});
var require_obj = __commonJS({
  "obj.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.suffix = function (s) { return s + "!"; };
    exports.version = "1.0";
  }
});
var import_fn = __toESM(require_fn(), 1);
var import_obj = __toESM(require_obj(), 1);
var names = Object.getOwnPropertyNames(function two(a, b) {}).join(",") + "|" + Object.getOwnPropertyNames((a) => a).join(",") + "|" + JSON.stringify(Object.getOwnPropertyDescriptor(function two(a, b) {}, "length"));
function main(input) {
  return (0, import_fn.default)(input) + import_fn.tag + (0, import_obj.suffix)(input) + import_obj.version + names;
}
