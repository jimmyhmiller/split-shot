// inputs: ["ab", "", 5]
// A String object (`new String(s)`): an object equal to its string loosely and not strictly, with the string's length; at runtime it is `new String(s)`. A generator's, an async function's and an async generator's `Object.prototype.toString` tag is its kind's.
function main(input) {
  var w = new String("hello world");
  var t = Object.prototype.toString;
  function* g() {}
  async function a() {}
  async function* ag() {}
  var plain = function* () {};
  Object.setPrototypeOf(plain, Function.prototype);
  return [typeof w, w == "hello world", w === "hello world", w.length, w.charAt(1), w[0], w.toUpperCase(), new String(input).length, w instanceof String,
          t.call(g), t.call(a), t.call(ag), t.call(function () {}), t.call(async () => 1), t.call(plain), t.call(class {})];
}
