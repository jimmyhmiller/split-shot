// @case {"description": "A lexical declaration directly inside a switch clause is refused: the clauses share one scope, which is not modelled.", "mode": "refusal"}
function main(x) {
  switch (x) {
    case 0: let y = 1; return y;
  }
  return 0;
}
