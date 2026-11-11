import chroma from "chroma-js";
export function main(input) {
  const c = chroma(input);
  return { dark: c.darken(1.5).hex(), lum: Math.round(c.luminance() * 1e6) / 1e6, contrast: Math.round(chroma.contrast(c, "white") * 1e4) / 1e4, hsl: c.css("hsl") };
}
export const inputs = ["#ff8800", "rebeccapurple", "rgb(10,20,30)", "hsl(120,50%,50%)", "nope", "", 16711680, "fff"];
