import queryString from "query-string";
const OPTIONS = { arrayFormat: "comma", parseNumbers: true, parseBooleans: true, sort: false };
export function main(input) { return queryString.parse(input, OPTIONS); }
export const inputs = ["?a=1&b=true&c=x,y,z", "name=J%C3%BCrgen&n=1.5e3", "", "?&&=&a", "a=%ZZ", 42, "list=1,2,3&list=4"];
