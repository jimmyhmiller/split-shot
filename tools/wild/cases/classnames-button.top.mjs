import classNames from "classnames";
export function main(input) {
  return classNames("btn", { "btn-active": input.active, "btn-disabled": input.disabled }, input.size && "btn-" + input.size, input.extra);
}
export const inputs = [
  { active: true, size: "lg" },
  { disabled: 1, extra: ["x", { y: true, z: 0 }, [["deep"]]] },
  {},
  { active: "é", size: "", extra: 5 },
  { extra: null },
];
