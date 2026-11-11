import { formatDuration, intervalToDuration } from "date-fns";
const OPTIONS = { format: ["days", "hours", "minutes"], delimiter: ", ", zero: false };
export function main(input) {
  // (UTC timestamps in, a description of the span out.)
  const d = intervalToDuration({ start: new Date(input.start), end: new Date(input.end) });
  return formatDuration(d, OPTIONS);
}
export const inputs = [
  { start: 0, end: 90061000 },
  { start: 1700000000000, end: 1700000030000 },
  { start: 5000, end: 5000 },
  { start: 1e12, end: 0 },
  { start: "x", end: 5 },
  {},
];
