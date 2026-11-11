import { z } from "zod";
export function main(input) {
  const r = z.object({ id: z.number().int(), tag: z.string().regex(/^[a-z]+$/) }).safeParse(input);
  return r.success ? { ok: r.data } : { issues: r.error.issues.map((i) => i.path.join(".") + ": " + i.code) };
}
export const inputs = [{ id: 1, tag: "abc" }, { id: 1.5, tag: "ABC" }, {}, null, { id: 2, tag: "é" }];
