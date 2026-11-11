function main(b) {
  let a;
  a = (/^\/teams\/([^/]+?)\/projects\/([^/]+?)\/files\/(.+?)(?:\/)?$/).exec(b);
  if (!a) {
    return false;
  }
  return [a.length, typeof a[1], typeof a[2], typeof a[3]];
}
