import Handlebars from "handlebars";
export function main(input) {
  return Handlebars.compile("<h1>{{title}}</h1>{{#each items}}<li>{{@index}}: {{name}}</li>{{else}}<p>empty</p>{{/each}}")(input);
}
export const inputs = [
  { title: "Todo", items: [{ name: "a & b" }, { name: "é" }] },
  { title: "<x>", items: [] },
  {},
  null,
];
