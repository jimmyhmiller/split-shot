// `x.push(v)` of an object whose `push` is the program's method (a stack
// class, a machine): that method is called. (The call was taken for an
// array's push: the object was made a runtime value and its state lost.)
class Stack {
  constructor() { this.items = []; this.pushed = 0; }
  push(v) { this.items[this.items.length] = v * 2; this.pushed++; }
}
const own = { log: [], push(v) { this.log.push("got " + v); } };
export function main(input) {
  const s = new Stack();
  s.push(input.a);
  s.push(input.b);
  own.push(input.a);
  return { items: s.items, pushed: s.pushed, log: own.log.length };
}
