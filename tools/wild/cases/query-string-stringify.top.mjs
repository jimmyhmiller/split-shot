import queryString from "query-string";
const OPTIONS = { arrayFormat: "bracket-separator", arrayFormatSeparator: "|", skipNull: true, skipEmptyString: true };
export function main(input) { return queryString.stringify(input, OPTIONS); }
export const inputs = [{ b: [1, 2, 3], a: "x y" }, { empty: "", nil: null, u: undefined, ok: 0 }, {}, { "ключ": "значение" }, null, { nested: { a: 1 } }];
