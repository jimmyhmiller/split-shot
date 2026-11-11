import qs from "qs";
export function main(input) {
  return qs.parse(input, { depth: 3, allowDots: true, ignoreQueryPrefix: true, parameterLimit: 20 });
}
export const inputs = [
  "?q=split+shot&page=2&tags[]=a&tags[]=b",
  "a.b.c=1&a.b.d=2&e[0]=x&e[1]=y",
  "",
  "%C3%A9=%C3%BC&bad=%E0%A4%A",
  "a[b][c][d][e][f]=deep",
  null,
  "x=1&x=2&x=3",
];
