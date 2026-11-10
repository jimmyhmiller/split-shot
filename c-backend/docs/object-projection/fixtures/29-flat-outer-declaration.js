// @case {"description":"Removing local lexical frames adjusts outer function declaration addresses for both direct calls and aliased callees."}
function shared(y) { return y; }
function main(x) {
  {
    let y = x;
    var f = shared;
    return shared(f(y));
  }
}
