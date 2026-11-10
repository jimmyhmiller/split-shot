// inputs: [1, 2]
// after: JSON.stringify([main(5) === main(6), main(5).list === main(7).list])
// A module object `main` hands out is the same object on every call (the
// top-level code made it once), as the caller sees comparing two calls'
// results.
const shared = { name: "s", list: [1, 2, 3] };
function main(x) {
  return x > 100 ? null : shared;
}
