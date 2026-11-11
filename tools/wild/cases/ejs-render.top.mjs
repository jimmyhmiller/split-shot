import ejs from "ejs";
const render = ejs.compile("<ul><% for (const u of users) { %><li><%= u.name %> (<%- u.raw %>)</li><% } %></ul>", { strict: false });
export function main(input) { return render(input); }
export const inputs = [{ users: [{ name: "a<b", raw: "<i>" }] }, { users: [] }, {}, { users: [{ name: "é" }] }];
