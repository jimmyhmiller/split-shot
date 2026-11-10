function entry(b) {
  let c, a;
  c = b.value;
  a = b["key"];
  if ("alpha" === a) {
    return 11;
  }
  if ("beta" === a) {
    return c;
  }
  if ("gamma" === a) {
    return 33;
  }
}
