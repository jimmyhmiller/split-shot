// style: npm xstate v5 (statechart config interpreted by pure transition(): state-node lookup, guard and assign action tables)
// residue: \b(macrostep|microstep|resolveActionsAndContext|transitionNode)\b
// xstate v5 with a fixed checkout machine created at load (nested states,
// guards, assign actions); main folds the input's events through the pure
// `transition` function from the initial snapshot and reports the final
// state, the context and how many events were ignored.
import { setup, assign, initialTransition, transition } from "xstate";
const machine = setup({
  guards: {
    hasItems: ({ context }) => context.items.length > 0,
    canPay: ({ context, event }) => event.amount >= context.total,
    underLimit: ({ context }) => context.items.length < 5,
  },
  actions: {
    addItem: assign({
      items: ({ context, event }) => [...context.items, event.sku],
      total: ({ context, event }) => context.total + event.price,
    }),
    clear: assign({ items: () => [], total: () => 0 }),
    recordPayment: assign({ paid: ({ event }) => event.amount }),
    countRetry: assign({ retries: ({ context }) => context.retries + 1 }),
  },
}).createMachine({
  id: "checkout",
  initial: "shopping",
  context: { items: [], total: 0, paid: 0, retries: 0 },
  states: {
    shopping: {
      initial: "browsing",
      states: {
        browsing: { on: { VIEW_CART: "cart" } },
        cart: { on: { BACK: "browsing" } },
      },
      on: {
        ADD: { guard: "underLimit", actions: "addItem" },
        CLEAR: { actions: "clear" },
        CHECKOUT: { guard: "hasItems", target: "payment" },
      },
    },
    payment: {
      on: {
        PAY: [
          { guard: "canPay", target: "done", actions: "recordPayment" },
          { target: "payment", reenter: true, actions: "countRetry" },
        ],
        CANCEL: "shopping",
      },
    },
    done: { type: "final" },
  },
});
export function main(input) {
  let [snapshot] = initialTransition(machine);
  let ignored = 0;
  for (const event of input.events) {
    const [next] = transition(machine, snapshot, event);
    if (next === snapshot) ignored++;
    snapshot = next;
  }
  return { state: snapshot.value, status: snapshot.status, context: snapshot.context, ignored };
}
export const inputs = [
  { events: [] },
  { events: [{ type: "CHECKOUT" }, { type: "PAY", amount: 10 }] },
  { events: [{ type: "ADD", sku: "a", price: 5 }, { type: "VIEW_CART" }, { type: "CHECKOUT" }, { type: "PAY", amount: 5 }] },
  { events: [
    { type: "ADD", sku: "a", price: 5 }, { type: "ADD", sku: "b", price: 7.5 }, { type: "VIEW_CART" }, { type: "BACK" },
    { type: "CHECKOUT" }, { type: "PAY", amount: 3 }, { type: "PAY", amount: 12 }, { type: "CANCEL" },
    { type: "ADD", sku: "c", price: 1 }, { type: "CHECKOUT" }, { type: "PAY", amount: 20 }, { type: "ADD", sku: "z", price: 1 },
  ] },
  { events: [
    { type: "ADD", sku: "1", price: 1 }, { type: "ADD", sku: "2", price: 2 }, { type: "ADD", sku: "3", price: 3 },
    { type: "ADD", sku: "4", price: 4 }, { type: "ADD", sku: "5", price: 5 }, { type: "ADD", sku: "6", price: 6 },
    { type: "CLEAR" }, { type: "CHECKOUT" }, { type: "ADD", sku: "7", price: 7 }, { type: "UNKNOWN" },
  ] },
  { events: [
    { type: "ADD", sku: "x", price: 100 }, { type: "CHECKOUT" }, { type: "PAY", amount: 1 }, { type: "PAY", amount: 2 },
    { type: "PAY", amount: 3 }, { type: "PAY", amount: 4 }, { type: "CANCEL" }, { type: "VIEW_CART" }, { type: "CLEAR" },
  ] },
];
