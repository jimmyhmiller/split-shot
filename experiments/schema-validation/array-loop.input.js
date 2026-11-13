function main(value) {
function validate(schema, value) {
  switch (schema.type) {
    case "string":
      return typeof value === "string" &&
        (schema.minLength === undefined || value.length >= schema.minLength);
    case "number":
      return typeof value === "number" && Number.isFinite(value) &&
        (schema.min === undefined || value >= schema.min);
    case "boolean":
      return typeof value === "boolean";
    case "array":
      if (!Array.isArray(value)) return false;
      const length = value.length;
      for (let i = 0; i < length; i++) {
        if (i in value && !validate(schema.items, value[i])) return false;
      }
      return true;
    case "object":
      return value !== null && typeof value === "object" &&
        !Array.isArray(value) &&
        Object.keys(schema.properties).every(key =>
          Object.hasOwn(value, key) &&
          validate(schema.properties[key], value[key]));
    default:
      throw new Error("Unknown schema type: " + schema.type);
  }
}
const userSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    age: { type: "number", min: 0 },
    tags: { type: "array", items: { type: "string" } }
  }
};
function validateUser(value) {
  return validate(userSchema, value);
}
return validateUser(value);
}
