import tinycolor from "tinycolor2";
const PALETTE = ["#ffffff", "#000000", "#1e90ff", "#ff4500"];
export function main(input) {
  const c = tinycolor(input);
  if (!c.isValid()) return null;
  return { text: tinycolor.mostReadable(c, PALETTE).toHexString(), light: c.lighten(10).toHexString(), hsv: c.toHsvString(), name: c.toName() };
}
export const inputs = ["#ff8800", "red", "rgb(10, 20, 30)", "hsl(120, 50%, 50%)", "nope", "", { r: 255, g: 255, b: 255 }, "rgba(0,0,0,.5)"];
