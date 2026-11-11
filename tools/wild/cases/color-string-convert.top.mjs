import colorString from "color-string";
export function main(input) {
  const c = colorString.get.rgb(input);
  if (!c) return null;
  return { hex: colorString.to.hex(c[0], c[1], c[2], c[3]), rgb: colorString.to.rgb(c[0], c[1], c[2], c[3]) };
}
export const inputs = ["#ff8800", "rgb(10, 20, 30)", "rebeccapurple", "rgba(0,0,0,0.5)", "hsl(120, 50%, 50%)", "", "nope", "#FFF8", "rgb(300, -5, 1e2)"];
