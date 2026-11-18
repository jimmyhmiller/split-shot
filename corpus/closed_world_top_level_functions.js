// inputs: [{"name": "ann", "age": 3, "tags": ["x", "y"]}, {"name": "", "age": 3, "tags": []}, {"name": "bo", "age": -1, "tags": []}, {"name": "cy", "age": 1, "tags": ["z", 4]}, {"age": 1}, null, [1]]
// forbid-main: validate\(
// A plain script's top-level functions and constants are the program's own
// (a closed world): no code outside reassigns them, so a call through a
// global function stays known after runtime code (`Object.hasOwn` of the
// input, which may be a proxy) and inside the callback runtime code calls.
// The whole recursive validator unrolls to the schema's checks.
function validate(schema, value) {
  switch (schema.type) {
    case "string":
      return typeof value === "string" && (schema.minLength === undefined || value.length >= schema.minLength);
    case "number":
      return typeof value === "number" && Number.isFinite(value) && (schema.min === undefined || value >= schema.min);
    case "array":
      return Array.isArray(value) && value.every((item) => validate(schema.items, item));
    case "object":
      return value !== null && typeof value === "object" && !Array.isArray(value) &&
        Object.keys(schema.properties).every((key) => Object.hasOwn(value, key) && validate(schema.properties[key], value[key]));
    default:
      throw new Error("Unknown schema type: " + schema.type);
  }
}
const userSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    age: { type: "number", min: 0 },
    tags: { type: "array", items: { type: "string" } },
  },
};
var LIMIT = 2;
function main(value) {
  return [validate(userSchema, value), value !== null && Object.hasOwn(value, "tags") && value.tags.filter((t) => t.length <= LIMIT).length];
}
