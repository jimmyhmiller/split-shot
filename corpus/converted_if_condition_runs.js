// inputs: [0, 1, 16]
// An if converted away (its arms change nothing that is read later) still
// evaluates its condition: here reading `.length` of undefined throws.
function main(n) {
  var t;
  if (n === 16) t = "sixteen";
  try {
    if (t.length) {
      var unused = function () { return 1; };
    }
    return "no throw";
  } catch (e) {
    return e.name;
  }
}
