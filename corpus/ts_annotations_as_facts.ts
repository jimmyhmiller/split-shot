// inputs: [0, 1, -4, 7]
// forbid-main: unreachable
// TypeScript annotations are facts the specializer trusts (the program
// type-checks with strictNullChecks): a `number` parameter is never null and
// its typeof is "number"; an optional parameter may be undefined; a string
// variable is no number. Interfaces, type aliases, `as`, `!`, `satisfies`
// and overload signatures erase.
interface Shape { kind: "circle" | "square"; size: number }
type Mode = "fast" | "slow";
function area(s: Shape): number {
  return s.kind === "circle" ? 3 * s.size * s.size : s.size * s.size;
}
function describe(x: number): string;
function describe(x: number, mode?: Mode): string {
  if (x == null) return "unreachable";
  if (typeof x !== "number") return "unreachable";
  const label: string = mode === undefined ? "default" : mode;
  if (typeof label === "number") return "unreachable";
  return label + ":" + (typeof x);
}
function main(n: number) {
  const shape = { kind: n > 0 ? "circle" : "square", size: n } satisfies Shape;
  const parts: string[] = [describe(n), describe(n * 2, "fast" as Mode)];
  const first = parts[0]!;
  return first + "," + parts[1] + "," + area(shape as Shape);
}
