import Handlebars from "handlebars";
const render = Handlebars.compile("<h1>{{title}}</h1>{{#each items}}<li class=\"{{#if done}}done{{/if}}\">{{@index}}: {{name}}</li>{{else}}<p>empty</p>{{/each}}");
export function main(input) { return render(input); }
export const inputs = [
  { title: "Todo", items: [{ name: "a & b", done: true }, { name: "é", done: false }] },
  { title: "<x>", items: [] },
  {},
  { title: null, items: "nope" },
  null,
];
