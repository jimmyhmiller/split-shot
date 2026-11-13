// inputs: [1, 2]
// `var P = class {...}` names the class `P` (NamedEvaluation) before its
// static blocks run, whether or not anything reads `P` afterwards: the
// class's own code may read its name.
function main(x) {
  let seen;
  var P = class { static { seen = this.name; } };
  const Q = (() => { let s; var R = class { static { s = this.name; } static f = this.name; }; return s; })();
  return seen + Q + x;
}
