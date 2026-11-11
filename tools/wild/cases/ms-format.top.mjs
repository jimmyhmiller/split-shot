import ms from "ms";
const OPTIONS = { long: true };
export function main(input) { return ms(input, OPTIONS); }
export const inputs = [60000, 172800000, 1, -3600000, 0, "1d", 1e12, null];
