// Function.prototype's `caller` and `arguments` are accessors whose setter
// throws for a strict function; a function's own `name` and `length` are
// read-only, also for an object that inherits them.
var r = [];
(function () {
  "use strict";
  class A {}
  try { A.caller = 1; r.push("ok " + A.caller); } catch (e) { r.push(e.constructor.name); }
  var f = function () {};
  try { f.arguments = 1; r.push("ok"); } catch (e) { r.push(e.constructor.name); }
  var o = Object.create(f);
  try { o.name = "x"; r.push("ok " + o.name); } catch (e) { r.push(e.constructor.name); }
  try { o.length = 3; r.push("ok " + o.length); } catch (e) { r.push(e.constructor.name); }
})();
inspect = function() { return r.join(","); };
