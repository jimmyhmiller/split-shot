// inputs: [0, 1]
// A strict arguments object's `callee` read throws the TypeError its getter,
// `%ThrowTypeError%`, throws, worded as V8 does; its descriptor gives that
// getter (get-intrinsic finds the intrinsic so).
"use strict";
var $gOPD = Object.getOwnPropertyDescriptor;
var throwTypeError = function () { throw new TypeError("x"); };
var ThrowTypeError = $gOPD ? (function () {
  try { arguments.callee; return throwTypeError; }
  catch (calleeThrows) { try { return $gOPD(arguments, "callee").get; } catch (gOPDthrows) { return throwTypeError; } }
}()) : throwTypeError;
function main(i) { try { ThrowTypeError(); } catch (e) { return [e.name, e.message, ThrowTypeError === throwTypeError, i]; } }
