// From superstruct (object({...}) built inside main). Cut down from the
// bundle by tools/wild/reduce.cjs and by hand.
// `print` is held by the load code in a block-scoped local; the closure that
// `main` makes for `validator` is handed that local by name (`__mk8(a)`),
// which in `main` is another variable (undefined).
//   original: main(5) === true
//   residual: TypeError: Cannot read properties of undefined (reading 'value')
function print(value) {
  return typeof value === "string" ? JSON.stringify(value) : `${value}`;
}
function* toFailures(result, struct) {
  for (const r of [result]) {
    const { message = `${struct.type} ${print(r)}` } = r;
  }
}
function* run(value, struct, branch) {
  for (const failure of struct.validator(value)) {
  }
  for (let [k, v, s] of struct.entries(value)) {
    const ts = run(v, s, k === void 0 ? branch : [...branch, v]);
    for (const t of ts) {
    }
  }
  yield [void 0, value];
}
var Struct = class {
  constructor(props) {
    const { validator, entries = function* () {} } = props;
    this.entries = entries;
    this.validator = (value) => {
      const result = validator(value);
      return toFailures(result, this);
    };
  }
};
function object(schema) {
  const Never = new Struct({ validator: () => false });
  return new Struct({
    *entries(value) {
      if (schema && typeof value === "object" && value != null) {
        const unknowns = new Set(Object.keys(value));
        for (const key of unknowns) {
          yield [key, value[key], Never];
        }
      }
    },
    validator(value) {
      return typeof value === "object" || `Expected an object, but received: ${print(value)}`;
    },
  });
}
export function main(input) {
  const { done, value } = run(input, object({ id: 1 }), [input]).next();
  return !value[0];
}
