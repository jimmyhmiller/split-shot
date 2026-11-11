import validator from "validator";
// KNOWN: which checks a sign-up form applies. RUNTIME: the submitted form.
const checks = {
  username: (v) => validator.isAlphanumeric(v) && validator.isLength(v, { min: 3, max: 16 }),
  age: (v) => validator.isInt(v, { min: 13, max: 120 }),
  card: (v) => validator.isCreditCard(v),
  site: (v) => validator.isFQDN(v),
  id: (v) => validator.isUUID(v, 4),
};
export function main(input) {
  const errors = [];
  for (const field of Object.keys(checks)) {
    if (!checks[field](String(input[field] ?? ""))) errors.push(field);
  }
  return errors;
}
export const inputs = [
  { username: "jimmy1", age: "30", card: "4111111111111111", site: "example.com", id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" },
  { username: "x", age: "12", card: "1234", site: "nope", id: "123" },
  {},
  { username: "名前", age: "1e2", card: "4111 1111 1111 1111", site: "exämple.de", id: "" },
  { username: 42, age: 42, card: null },
];
