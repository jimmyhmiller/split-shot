function entry(a) {
  let b, c;
  b = a.value;
  c = a["key"];
  return (new Map([["alpha", 11], ["beta", b], ["gamma", 33]])).get(c);
}
