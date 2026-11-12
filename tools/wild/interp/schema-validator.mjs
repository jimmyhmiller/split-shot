// style: JSON-schema-like validator (schema object walked recursively per value, keyword checks, error list with JSON pointers)
// residue: minLength|maxItems|additionalProperties|uniqueItems|exclusiveMinimum
// A subset of JSON Schema: type (string or list), enum, const, minimum,
// maximum, exclusiveMinimum, minLength, maxLength, format (email, date),
// properties, required, additionalProperties (false or a schema), items,
// minItems, maxItems, uniqueItems, anyOf, $ref into definitions. The schema,
// for a user sign-up payload, is fixed; each call validates the input and
// returns every error, each with the path where it occurred.
const SCHEMA = {
  definitions: {
    address: {
      type: "object",
      required: ["street", "city", "country"],
      properties: {
        street: { type: "string", minLength: 1, maxLength: 80 },
        city: { type: "string", minLength: 1 },
        zip: { type: "string", minLength: 4, maxLength: 10 },
        country: { enum: ["US", "CA", "GB", "DE", "FR", "JP"] },
      },
      additionalProperties: false,
    },
  },
  type: "object",
  required: ["username", "email", "age", "roles"],
  properties: {
    username: { type: "string", minLength: 3, maxLength: 16 },
    email: { type: "string", format: "email" },
    age: { type: "integer", minimum: 13, maximum: 130 },
    score: { type: "number", exclusiveMinimum: 0 },
    birthday: { type: "string", format: "date" },
    roles: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      uniqueItems: true,
      items: { enum: ["admin", "editor", "viewer", "billing"] },
    },
    address: { $ref: "#/definitions/address" },
    contact: {
      anyOf: [
        { type: "string", format: "email" },
        { type: "object", required: ["phone"], properties: { phone: { type: "string", minLength: 7 } } },
      ],
    },
    tags: { type: "array", items: { type: "string", maxLength: 12 } },
    newsletter: { type: "boolean" },
    referrer: { type: ["string", "null"] },
    version: { const: 2 },
  },
  additionalProperties: { type: ["string", "number", "boolean"] },
};

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  return typeof value;
}

function typeMatches(expected, actual) {
  return expected === actual || (expected === "number" && actual === "integer");
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!deepEqual(a[k], b[k])) return false;
  return true;
}

const DAYS_IN_MONTH = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m === null) return false;
  const year = +m[1], month = +m[2], day = +m[3];
  if (month < 1 || month > 12 || day < 1 || day > DAYS_IN_MONTH[month]) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return month !== 2 || day <= 28 || leap;
}

const FORMATS = {
  email: (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
  date: isDate,
};

function resolveRef(root, ref) {
  if (!ref.startsWith("#/")) throw new Error("unsupported $ref " + ref);
  let node = root;
  for (const part of ref.slice(2).split("/")) {
    node = node[part];
    if (node === undefined) throw new Error("unresolved $ref " + ref);
  }
  return node;
}

function validate(root, schema, value, path, errors) {
  if (schema.$ref !== undefined) {
    validate(root, resolveRef(root, schema.$ref), value, path, errors);
    return;
  }
  const actual = typeOf(value);
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => typeMatches(t, actual))) {
      errors.push({ path, message: "must be " + types.join(" or ") + ", got " + actual });
      return;
    }
  }
  if (schema.const !== undefined && !deepEqual(schema.const, value)) {
    errors.push({ path, message: "must equal " + JSON.stringify(schema.const) });
  }
  if (schema.enum !== undefined && !schema.enum.some((e) => deepEqual(e, value))) {
    errors.push({ path, message: "must be one of " + schema.enum.map((e) => JSON.stringify(e)).join(", ") });
  }
  if (schema.anyOf !== undefined) {
    let ok = false;
    for (const sub of schema.anyOf) {
      const subErrors = [];
      validate(root, sub, value, path, subErrors);
      if (subErrors.length === 0) { ok = true; break; }
    }
    if (!ok) errors.push({ path, message: "must match one of " + schema.anyOf.length + " alternatives" });
  }
  if (actual === "integer" || actual === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push({ path, message: "must be >= " + schema.minimum });
    if (schema.maximum !== undefined && value > schema.maximum) errors.push({ path, message: "must be <= " + schema.maximum });
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) errors.push({ path, message: "must be > " + schema.exclusiveMinimum });
  }
  if (actual === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push({ path, message: "must have at least " + schema.minLength + " characters" });
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push({ path, message: "must have at most " + schema.maxLength + " characters" });
    if (schema.format !== undefined) {
      const check = FORMATS[schema.format];
      if (check === undefined) throw new Error("unknown format " + schema.format);
      if (!check(value)) errors.push({ path, message: "must be a valid " + schema.format });
    }
  }
  if (actual === "array") {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push({ path, message: "must have at least " + schema.minItems + " items" });
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push({ path, message: "must have at most " + schema.maxItems + " items" });
    if (schema.uniqueItems === true) {
      for (let i = 1; i < value.length; i++) {
        for (let j = 0; j < i; j++) {
          if (deepEqual(value[i], value[j])) errors.push({ path, message: "items " + j + " and " + i + " are equal" });
        }
      }
    }
    if (schema.items !== undefined) {
      for (let i = 0; i < value.length; i++) validate(root, schema.items, value[i], path + "/" + i, errors);
    }
  }
  if (actual === "object") {
    if (schema.required !== undefined) {
      for (const key of schema.required) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) errors.push({ path, message: "missing required property " + key });
      }
    }
    const props = schema.properties || {};
    for (const key of Object.keys(value)) {
      if (Object.prototype.hasOwnProperty.call(props, key)) {
        validate(root, props[key], value[key], path + "/" + key, errors);
      } else if (schema.additionalProperties === false) {
        errors.push({ path: path + "/" + key, message: "is not allowed" });
      } else if (typeof schema.additionalProperties === "object") {
        validate(root, schema.additionalProperties, value[key], path + "/" + key, errors);
      }
    }
  }
}

export function main(input) {
  const errors = [];
  validate(SCHEMA, SCHEMA, input, "", errors);
  return { valid: errors.length === 0, errors };
}

export const inputs = [{},null,[1,2,3],{"username":"jim","email":"jim@example.com","age":40,"roles":["admin"]},{"username":"x","email":"bad","age":"old","roles":[],"score":-1,"address":{"street":"","zip":"1","extra":1},"contact":5,"referrer":3,"version":"2","tags":"none"},{"username":"user226","email":"u13@example.com","age":82,"roles":["viewer","editor"],"score":70.20101547241211,"birthday":"2000-02-29","address":{"street":"1 Main St","city":"Springfield","country":"US","zip":"12345"},"contact":{"phone":"555-0100"},"tags":[7,7,7,"a","a-very-long-tag-name","beta"],"newsletter":true,"referrer":null,"version":2,"extra":"ok"},{"username":"ab","email":"u26@example.com","age":28,"roles":["viewer"],"score":34.49350595474243,"birthday":"2000-02-29","address":{"street":"1 Main St","city":"Springfield","country":"US","zip":"12345"},"contact":{"phone":"555-0100"},"tags":[7,"a",7,"a",7],"newsletter":true,"referrer":null,"version":1,"extra":{"nested":true}},{"users":"not top-level","username":"user520","email":"not-an-email","age":87,"roles":["admin","admin","root"],"score":7.330977916717529,"birthday":"2000-02-29","address":{"street":"1 Main St","city":"Springfield","country":"US","zip":"12345","floor":3},"contact":{"phone":"555-0100"},"tags":["beta","a"],"newsletter":true,"referrer":null,"version":2,"extra":{"nested":true}},{"username":"user582","email":"u7@example.com","age":16,"roles":["admin","editor","viewer","billing","admin","editor"],"score":64.27158117294312,"birthday":"2000-02-29","address":{"street":"1 Main St","city":"Springfield","country":"XX","zip":"12345","floor":3},"contact":{"phone":"555-0100"},"tags":["t0-overflowing","t1","t2","t3","t4-overflowing","t5","t6","t7","t8-overflowing","t9","t10","t11","t12-overflowing","t13","t14","t15","t16-overflowing","t17","t18","t19","t20-overflowing","t21","t22","t23","t24-overflowing","t25","t26","t27","t28-overflowing","t29"],"newsletter":true,"referrer":null,"version":1,"extra":{"nested":true}}];
