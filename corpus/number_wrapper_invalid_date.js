// inputs: [{"x":1}, {"x":"s"}]
// forbid-main: new (Date|Number|String)
// A Number object of a known value converts through its number (`valueOf`): arithmetic, its string, `==`; it is an object (`typeof`, `===`). A String object likewise through its string. An invalid Date's string is "Invalid Date", whatever the time zone.
function main(input) {
  var n = new Number(5), t = new String("ab");
  return [typeof n, n + 1, n * 2, String(n), n == 5, n == "5", n === 5, t + "c", t == "ab", String(new Date(NaN)), new Date(NaN) + "!", input.x];
}
