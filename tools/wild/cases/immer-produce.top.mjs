import { produce } from "immer";
const base = { user: { name: "anon", visits: 0 }, tags: ["new"], settings: { theme: "light" } };
export function main(input) {
  const next = produce(base, (draft) => {
    draft.user.name = input.name;
    draft.user.visits += 1;
    if (input.tag) draft.tags.push(input.tag);
    if (input.reset) delete draft.settings.theme;
  });
  return { next, sameSettings: next.settings === base.settings, baseVisits: base.user.visits, frozen: Object.isFrozen(next) };
}
export const inputs = [{ name: "Jim", tag: "vip" }, { name: "é", reset: true }, {}, { name: null, tag: 0 }, null];
