import Mustache from "mustache";
export function main(input) {
  return Mustache.render("Hello {{name}}!{{#items}}\n- {{title}} ({{{raw}}}){{/items}}{{^items}}\nnothing{{/items}}", input);
}
export const inputs = [
  { name: "World", items: [{ title: "a<b", raw: "<i>x</i>" }, { title: "é", raw: "" }] },
  { name: "<script>", items: [] },
  {},
  { name: 5, items: "truthy" },
  null,
];
