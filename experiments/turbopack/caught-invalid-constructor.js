function main(input) {
  var env = {};
  try { return new env.Error(); }
  catch (e) { return 7; }
}
