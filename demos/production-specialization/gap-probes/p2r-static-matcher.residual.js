function main(e) {
  let a, c, b, d;
  if ("/legacy/:slug" instanceof RegExp) {
    a = ("/legacy/:slug").source.match.call(("/legacy/:slug").source, /\((?!\?)/g);
    c = [];
    if (a) {
      b = 0;
      while (b < a.length) {
        c.push;
        d = {name: b, prefix: null, delimiter: null, optional: false, repeat: false, pattern: null};
        c.push(d);
        b += 1;
      }
    }
    a = ("/legacy/:slug").exec(e);
    d = {match: a, keys: c};
    return d;
  }
  a = (/^\/legacy\/([^\/]+?)(?:\/)?$/i).exec(e);
  return {match: a, keys: [{name: "slug", prefix: "/", delimiter: "/", optional: false, repeat: false, pattern: "[^\\/]+?"}]};
}
