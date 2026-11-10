// inputs: [0, 1, 3]
// An object literal that reaches runtime (carried around a loop, put in a
// runtime array) has a runtime identity: comparing it with the runtime
// value holding it is true.
function main(n) {
  var o = { k: 1 };
  var cur = null;
  for (var i = 0; i < n + 1; i++) {
    cur = i === 0 ? o : cur;
  }
  var p = { k: 2 };
  var rt = Array.from([p]);
  var q = { k: 3 };
  var pick = n > 1 ? q : p;
  return [cur === o, rt[0] === p, pick === q, pick === p].join(",");
}
