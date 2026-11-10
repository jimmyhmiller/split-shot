// inputs: [0, 1, 3]
// forbid: unreadMarker
// A variable nothing reads is dead: its writes and cell go, but what its
// initializer and assigned values do still happens, in order.
var log = [];
function note(s) { log.push(s); return s; }
function main(n) {
  log = [];
  var never = { tag: "unreadMarker" };
  let alsoNever = note("init" + n);
  var setter = function () { alsoNever = note("set"); never = { tag: "unreadMarker" }; };
  if (n > 0) setter();
  var x = (alsoNever = note("chain"), n * 2);
  return x + ":" + log.join(",");
}
