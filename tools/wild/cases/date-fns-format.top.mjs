import { format, parseISO, addBusinessDays, isValid } from "date-fns";
const PATTERN = "EEEE, do MMMM yyyy";
export function main(input) {
  // (Calendar dates without a time: the same day whatever the timezone.)
  const d = parseISO(input);
  if (!isValid(d)) return "invalid";
  return format(addBusinessDays(d, 3), PATTERN);
}
export const inputs = ["2024-02-28", "2023-12-29", "2024-13-01", "", "1999-01-01", "not a date", "2024-03-08"];
