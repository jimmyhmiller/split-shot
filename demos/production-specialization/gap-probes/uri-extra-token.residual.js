function main(c) {
  let a, b;
  a = String(c);
  b = {name: "slug", prefix: "/"};
  a = encodeURIComponent(a, b);
  return b.prefix + a;
}
