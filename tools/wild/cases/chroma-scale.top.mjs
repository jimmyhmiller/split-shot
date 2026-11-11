import chroma from "chroma-js";
const scale = chroma.scale(["#fafa6e", "#2a4858"]).mode("lch").domain([0, 100]);
export function main(input) { return scale(input).hex(); }
export const inputs = [0, 50, 100, 33.3, -10, 1000, "25", null];
