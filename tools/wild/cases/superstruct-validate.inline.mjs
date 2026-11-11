import { object, string, number, is } from "superstruct";
export function main(input) { return is(input, object({ id: number(), tag: string() })); }
export const inputs = [{ id: 1, tag: "a" }, { id: "1", tag: "a" }, {}, null, { id: 1, tag: "é", more: true }];
