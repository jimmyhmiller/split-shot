import Big from "big.js";
const TAX = new Big("1.0825");
export function main(input) {
  const total = new Big(input.price).times(input.qty).times(TAX);
  return { total: total.toFixed(2), cents: total.times(100).round(0, Big.roundHalfEven).toString(), big: total.gt(1000) };
}
export const inputs = [{ price: "19.99", qty: 3 }, { price: 0.1, qty: 0.2 }, { price: "1e21", qty: 1 }, { price: "-5.005", qty: 1 }, { price: "abc", qty: 1 }, { price: "1", qty: null }, {}];
