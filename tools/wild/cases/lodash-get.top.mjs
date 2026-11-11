import { get, set, cloneDeep } from "lodash-es";
const TEMPLATE = { meta: { version: 2 }, items: [] };
export function main(input) {
  const out = cloneDeep(TEMPLATE);
  set(out, "items[0].title", get(input, "data.posts[0].title", "untitled"));
  set(out, ["meta", "author"], get(input, "data.author.name"));
  return out;
}
export const inputs = [
  { data: { posts: [{ title: "é" }], author: { name: "Jim" } } },
  { data: { posts: [] } },
  {},
  null,
  { data: { posts: [{ title: null }], author: "str" } },
];
