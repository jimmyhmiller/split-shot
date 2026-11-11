import { object, string, number, array, optional, enums, size, defaulted, validate } from "superstruct";
const User = object({
  name: size(string(), 1, 20),
  age: optional(number()),
  roles: defaulted(array(enums(["admin", "user"])), ["user"]),
});
export function main(input) {
  const [err, value] = validate(input, User, { coerce: true });
  return err ? { error: err.message, path: err.path, failures: err.failures().length } : { value };
}
export const inputs = [
  { name: "Jim", age: 3 },
  { name: "", age: "x", roles: ["root"] },
  {},
  { name: "é", roles: ["admin", "user"], extra: 1 },
  null,
  "string",
];
