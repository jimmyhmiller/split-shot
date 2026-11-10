// @case {"description": "Thrown null, undefined, boolean, number and string retain their distinct tags."}
function main(x) {
  if (x < 0) throw null;
  if (x === 0) throw undefined;
  if (x === 1) throw false;
  if (x === 3) throw x;
  throw "done";
}
