import { z } from "zod";
const User = z.object({
  name: z.string().min(1).max(20),
  age: z.number().int().nonnegative().optional(),
  email: z.string().email(),
  roles: z.array(z.enum(["admin", "user"])).default(["user"]),
});
export function main(input) {
  const r = User.safeParse(input);
  return r.success ? { ok: r.data } : { issues: r.error.issues.map((i) => i.path.join(".") + ": " + i.code) };
}
export const inputs = [
  { name: "Jim", age: 3, email: "a@b.co" },
  { name: "", age: -1, email: "nope", roles: ["root"] },
  {},
  { name: "é", email: "é@b.co", roles: ["admin", "user"], extra: 1 },
  null,
  "string",
];
