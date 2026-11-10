// inputs: [0, 2, 5]
// Properties of a built-in method value other than call/apply (bind, name,
// length) are read from the intrinsic (a bogus bound method was built).
function main(n) {
  const has = Object.prototype.hasOwnProperty.bind({ k: n });
  const m = new Map([[1, n]]);
  const get = m.get;
  return [has("k"), has("z"), [].slice.name, Array.prototype.map.length, get.name, get.call(m, 1), typeof Object.prototype.toString.bind].join("|");
}
