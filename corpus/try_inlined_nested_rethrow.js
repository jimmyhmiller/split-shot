// inputs: [0, 1, 2, 3, 4, 7]
// forbid-main: __rf
// Nested tries in inlined functions, a rethrow from a catch, and a finally (lowered to completion records, whose return jumps past the try).
function inner(o){ try { return o.a.b; } catch (e) { throw new TypeError("inner:" + (o ? "o" : "none")); } }
function outer(o){ try { return inner(o) + 1; } catch (e) { return e.message; } finally { } }
function main(x){ return [outer({a:{b:x}}), outer(x > 2 ? {a:null} : {a:{b:2}}), outer(null)]; }
