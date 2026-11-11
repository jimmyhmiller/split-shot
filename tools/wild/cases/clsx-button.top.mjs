import clsx from "clsx";
const BASE = ["btn", "btn-rounded"];
export function main(input) {
  return clsx(BASE, { active: input.active, disabled: input.disabled }, input.size && "btn-" + input.size, input.extra);
}
export const inputs = [
  { active: true, size: "lg" },
  { disabled: 1, extra: ["x", { y: true, z: 0 }, [["deep"]]] },
  {},
  { active: "é", size: "", extra: 5 },
  { extra: null },
];
