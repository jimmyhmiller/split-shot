import dayjs from "dayjs";
const PATTERN = "ddd, MMM D YYYY [Q]Q?";
export function main(input) {
  const d = dayjs(input);
  return { ok: d.isValid(), end: d.add(1, "month").endOf("month").format(PATTERN), leap: d.isValid() ? d.daysInMonth() : null };
}
export const inputs = ["2024-01-31", "2023-02-10", "1999-12-31", "garbage", "", "2024-02-29"];
