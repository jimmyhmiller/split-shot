// inputs: [{"flag":true,"n":3}, {"flag":false,"n":4}, {"flag":0,"n":5}, {"flag":"x","n":6}]
// forbid-main: =>|__mk|__rf
// A function chosen by a runtime condition among ones whose code is known (`c ? f : g`, or an `if` whose arms assign different functions) and called where the path has decided the condition (inside `if (c)`) is the one the path knows: the call is its code, and the functions need not be made. The join of the `if` keeps what each arm left, by the condition (`facts::Info::choice`), and testing the condition again picks it (`facts::learn`).
function main(input) {
  var out = [];
  var flag = input.flag;
  var pick = flag ? (x) => x + 1 : (x) => x * 2;
  if (flag) out.push(pick(input.n)); else out.push(pick(input.n) + 100);
  var log;
  var big = input.n > 4;
  if (big) {
    log = (m) => m.length + input.n;
  } else {
    log = (m) => -m.length;
  }
  if (big) out.push(log("abc")); else out.push(log("ab"));
  return out;
}
