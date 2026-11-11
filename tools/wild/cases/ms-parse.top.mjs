import ms from "ms";
// KNOWN: nothing but the library; RUNTIME: the duration string.
export function main(input) { return ms(input); }
export const inputs = ["2 days", "1h", "10", "-3 min", "", "é", 5000, null];
