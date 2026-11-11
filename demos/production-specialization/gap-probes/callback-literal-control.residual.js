function main(a) {
  return a.map(((a) => {
  let b;
  a: {
    if (typeof a === "string") {
      b = a.replace(/^_NEXTSEP_/, "");
      break a;
    }
    b = a;
  }
  return b;
}));
}
