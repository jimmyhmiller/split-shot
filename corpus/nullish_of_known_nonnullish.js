// inputs: [0, 1, null]
// forbid-main: (Error|Math) \?\?|\?\? (Object|null)
// `a ?? b` whose left side the path knows is not null or undefined (a
// standard built-in such as `Error`, read by name) is that side, and one
// known nullish is the right side, as `a == null` would decide. (zod's
// `params?.Parent ?? Object` with `Parent: Error` made `Error ?? Object`.)
function make(params) {
  const Parent = params?.Parent ?? Object;
  return { Parent, kind: typeof Parent, none: Parent === null };
}
const withError = make({ Parent: Error });
const plain = make(undefined);
const fallback = Math ?? null;
function main(x) {
  return [withError.kind, withError.Parent === Error, withError.none, plain.Parent === Object, typeof fallback, (x ?? "dflt")];
}
