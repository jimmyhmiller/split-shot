import { produce } from "immer";
// KNOWN: a curried reducer. RUNTIME: the state and the action.
const reducer = produce((draft, action) => {
  switch (action.type) {
    case "add": draft.todos.push({ text: action.text, done: false }); break;
    case "toggle": draft.todos[action.index].done = !draft.todos[action.index].done; break;
    case "clear": draft.todos = draft.todos.filter((t) => !t.done); break;
    default: throw new Error("unknown action " + action.type);
  }
});
export function main(input) { return reducer(input.state, input.action); }
export const inputs = [
  { state: { todos: [] }, action: { type: "add", text: "é" } },
  { state: { todos: [{ text: "a", done: false }, { text: "b", done: true }] }, action: { type: "toggle", index: 0 } },
  { state: { todos: [{ text: "a", done: false }, { text: "b", done: true }] }, action: { type: "clear" } },
  { state: { todos: [] }, action: { type: "toggle", index: 3 } },
  { state: { todos: [] }, action: { type: "nope" } },
  { state: 5, action: { type: "add" } },
];
