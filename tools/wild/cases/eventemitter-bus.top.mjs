import EventEmitter from "eventemitter3";
// KNOWN: who listens to what. RUNTIME: the event.
const bus = new EventEmitter();
bus.on("order", (o, acc) => { acc.total += o.qty * o.price; });
bus.on("order", (o, acc) => { acc.names.push(o.name); });
bus.once("refund", (o, acc) => { acc.total -= o.amount; acc.names.push("first refund"); });
bus.on("refund", (o, acc) => { acc.total -= o.amount; });
export function main(input) {
  const acc = { total: 0, names: [] };
  const heard = bus.emit(input.type, input, acc);
  return { heard, acc, listeners: bus.listenerCount("refund") };
}
export const inputs = [
  { type: "order", qty: 2, price: 5, name: "é" },
  { type: "refund", amount: 3 },
  { type: "refund", amount: 4 },
  { type: "unknown" },
  { type: "order" },
  {},
];
