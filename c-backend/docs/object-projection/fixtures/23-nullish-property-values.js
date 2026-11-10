// @case {"description": "Absent and present-undefined data properties, falsy fields and static-key mutation."}
function main(x) {
  var a = { n: null, u: undefined, b: false, z: 0, value: x };
  var first = [a.n, a.u, a.missing, a.b, a.z];
  a.n = a;
  a.value++;
  return [first, a.n === a, a.value, a.u === a.missing];
}
