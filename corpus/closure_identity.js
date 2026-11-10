// inputs: [0, 2, 5]
// after: [globalThis.ident.make() === globalThis.ident.make(), globalThis.ident.list.length, globalThis.ident.list.length > 1 ? globalThis.ident.list[0] === globalThis.ident.list[1] : "one", globalThis.ident.twice[0] === globalThis.ident.twice[1], globalThis.ident.once === globalThis.ident.once2].join("|")
// Each evaluation of a function expression or nested declaration makes a new
// function object, even with nothing captured: in a residual function, in a
// runtime loop, or twice in a row (a capture-free closure was one shared
// residual function).
function main(n) {
  function make() {
    return function inner() { return 1; };
  }
  try { make.extra = 1; } catch (e) {}
  const list = [];
  for (let i = 0; i < n; i++) list.push(() => 7);
  const twice = [make(), make()];
  twice[0].tag = "first";
  function once() { return 2; }
  globalThis.ident = { make, list, twice, once, once2: once };
  return [twice[0] === twice[1], twice[1].tag, list.length > 1 ? list[0] === list[1] : "one", once() + 1].join("|");
}
