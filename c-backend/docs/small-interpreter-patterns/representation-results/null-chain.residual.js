function entry(b) {
  let a;
  a = {name: "x", value: b, parent: null};
  if (a !== null) {
    if (a.name === "x") {
      return a.value * 2 + 3;
    }
    a = a.parent;
    while (a !== null) {
      if (a.name === "x") {
        return a.value * 2 + 3;
      }
      a = a.parent;
    }
    return NaN;
  }
  return NaN;
}
