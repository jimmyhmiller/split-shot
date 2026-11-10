// @case {"description": "Postfix and compound updates evaluate computed receiver/index effects exactly once."}
function main(x) {
  var calls = 0, a = [x];
  function index() { calls++; return 0; }
  function array() { calls++; return a; }
  var old = array()[index()]++;
  a[index()] += 2;
  return [old, a[0], calls];
}
