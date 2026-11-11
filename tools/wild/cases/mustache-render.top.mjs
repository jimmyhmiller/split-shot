import Mustache from "mustache";
const TEMPLATE = "Hello {{name}}!{{#items}}\n- {{title}} ({{{raw}}}){{/items}}{{^items}}\nnothing{{/items}}\n{{! comment }}{{user.email}}";
Mustache.parse(TEMPLATE);
export function main(input) { return Mustache.render(TEMPLATE, input); }
export const inputs = [
  { name: "World", items: [{ title: "a<b", raw: "<i>x</i>" }, { title: "é", raw: "" }], user: { email: "a@b.c" } },
  { name: "<script>", items: [] },
  {},
  { name: 5, items: "truthy", user: null },
  null,
];
