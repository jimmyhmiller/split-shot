function main(a) {
  if (a === 401) {
    return "unauthorized";
  }
  if (a === 403) {
    return "forbidden";
  }
  if (a === 404) {
    return "not-found";
  }
}
