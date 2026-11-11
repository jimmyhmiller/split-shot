import { template } from "lodash-es";
const render = template("<h1><%- title %></h1><% items.forEach(function (i) { %><li><%= i %></li><% }); %>");
export function main(input) { return render(input); }
export const inputs = [{ title: "a<b", items: ["x", "é"] }, { title: "", items: [] }, {}, { title: 5, items: "str" }];
