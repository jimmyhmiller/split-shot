// style: rule engine (json-logic: rules are JSON objects {op: args}, evaluated by apply() looking the operator up in a table)
// residue: \bvar"?\s*:\s*["']
// A hand-written json-logic in the shape of json-logic-js: apply(logic, data)
// recurses into arrays, treats a single-key object as an operation, handles
// the control operators (if, and, or, map, filter, reduce, all, some, none)
// itself and everything else through an operations table, called with the
// data as `this`. The fixed rules price a shopping cart and decide its
// shipping and eligibility; each call evaluates them against the input.
const RULES = {
  missing: { missing: ["customer.id", "customer.country", "items"] },
  adult: { ">=": [{ var: "customer.age" }, 18] },
  eligible: {
    and: [
      { ">=": [{ var: "customer.age" }, 18] },
      { in: [{ var: "customer.country" }, ["US", "CA", "GB", "DE"]] },
      { "!": { var: "customer.blocked" } },
      { some: [{ var: "items" }, { ">": [{ var: "qty" }, 0] }] },
    ],
  },
  subtotal: {
    reduce: [
      { var: "items" },
      { "+": [{ var: "accumulator" }, { "*": [{ var: "current.price" }, { var: "current.qty" }] }] },
      0,
    ],
  },
  discountRate: {
    if: [
      { "==": [{ var: "customer.tier" }, "gold"] }, 0.15,
      { and: [{ "==": [{ var: "customer.tier" }, "silver"] }, { ">": [{ var: "customer.orders" }, 10] }] }, 0.1,
      { ">=": [{ reduce: [{ var: "items" }, { "+": [{ var: "accumulator" }, { var: "current.qty" }] }, 0] }, 10] }, 0.05,
      0,
    ],
  },
  shipping: {
    if: [
      { "in": [{ var: "customer.country" }, ["US", "CA"]] },
      { if: [{ ">": [{ reduce: [{ var: "items" }, { "+": [{ var: "accumulator" }, { "*": [{ var: "current.price" }, { var: "current.qty" }] }] }, 0] }, 50] }, 0, 7.5] },
      { "<=": [0, { var: "customer.distanceKm", }, 500] }, 12,
      25,
    ],
  },
  fragile: { filter: [{ var: "items" }, { "in": ["fragile", { var: "tags" }] }] },
  labels: {
    map: [
      { var: "items" },
      { cat: [{ substr: [{ var: "sku" }, 0, 3] }, "-", { var: "qty" }, "x ", { var: "name" }] },
    ],
  },
  allInStock: { all: [{ var: "items" }, { "!!": { var: "inStock" } }] },
  noneRecalled: { none: [{ var: "items" }, { "===": [{ var: "recalled" }, true] }] },
  greeting: {
    cat: [
      "Hello, ",
      { var: ["customer.name", "friend"] },
      { "?:": [{ ">": [{ var: "customer.orders" }, 0] }, "! Welcome back.", "! Welcome."] },
    ],
  },
  cheapest: { min: [{ var: "items.0.price" }, { var: "items.1.price" }, { var: "items.2.price" }] },
  bulky: { merge: [{ filter: [{ var: "items" }, { ">=": [{ var: "weight" }, 5] }] }, { missing_some: [1, ["customer.phone", "customer.email"]] }] },
};

function isLogic(logic) {
  return typeof logic === "object" && logic !== null && !Array.isArray(logic) && Object.keys(logic).length === 1;
}

function getOperator(logic) {
  return Object.keys(logic)[0];
}

function truthy(value) {
  if (Array.isArray(value) && value.length === 0) return false;
  return !!value;
}

const operations = {
  "==": function (a, b) { return a == b; },
  "===": function (a, b) { return a === b; },
  "!=": function (a, b) { return a != b; },
  "!==": function (a, b) { return a !== b; },
  ">": function (a, b) { return a > b; },
  ">=": function (a, b) { return a >= b; },
  "<": function (a, b, c) { return c === undefined ? a < b : a < b && b < c; },
  "<=": function (a, b, c) { return c === undefined ? a <= b : a <= b && b <= c; },
  "!!": function (a) { return truthy(a); },
  "!": function (a) { return !truthy(a); },
  "%": function (a, b) { return a % b; },
  in: function (a, b) {
    if (!b || typeof b.indexOf === "undefined") return false;
    return b.indexOf(a) !== -1;
  },
  cat: function () { return Array.prototype.join.call(arguments, ""); },
  substr: function (source, start, end) {
    if (end < 0) {
      const temp = String(source).substr(start);
      return temp.substr(0, temp.length + end);
    }
    return String(source).substr(start, end);
  },
  "+": function () {
    return Array.prototype.reduce.call(arguments, function (a, b) { return parseFloat(a) + parseFloat(b); }, 0);
  },
  "*": function () {
    return Array.prototype.reduce.call(arguments, function (a, b) { return parseFloat(a) * parseFloat(b); });
  },
  "-": function (a, b) { return b === undefined ? -a : a - b; },
  "/": function (a, b) { return a / b; },
  min: function () { return Math.min.apply(this, arguments); },
  max: function () { return Math.max.apply(this, arguments); },
  merge: function () {
    return Array.prototype.reduce.call(arguments, function (a, b) { return a.concat(b); }, []);
  },
  var: function (a, b) {
    const notFound = b === undefined ? null : b;
    let data = this;
    if (typeof a === "undefined" || a === "" || a === null) return data;
    const sub = String(a).split(".");
    for (let i = 0; i < sub.length; i++) {
      if (data === null || data === undefined) return notFound;
      data = data[sub[i]];
      if (data === undefined) return notFound;
    }
    return data;
  },
  missing: function () {
    const missing = [];
    const keys = Array.isArray(arguments[0]) ? arguments[0] : arguments;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = apply({ var: key }, this);
      if (value === null || value === "") missing.push(key);
    }
    return missing;
  },
  missing_some: function (needCount, options) {
    const areMissing = apply({ missing: options }, this);
    if (options.length - areMissing.length >= needCount) return [];
    return areMissing;
  },
};

function apply(logic, data) {
  if (Array.isArray(logic)) return logic.map(function (l) { return apply(l, data); });
  if (!isLogic(logic)) return logic;

  const op = getOperator(logic);
  let values = logic[op];
  let i;
  let current;
  let scopedLogic;
  let scopedData;
  let initial;

  if (!Array.isArray(values)) values = [values];

  if (op === "if" || op === "?:") {
    for (i = 0; i < values.length - 1; i += 2) {
      if (truthy(apply(values[i], data))) return apply(values[i + 1], data);
    }
    if (values.length === i + 1) return apply(values[i], data);
    return null;
  } else if (op === "and") {
    for (i = 0; i < values.length; i += 1) {
      current = apply(values[i], data);
      if (!truthy(current)) return current;
    }
    return current;
  } else if (op === "or") {
    for (i = 0; i < values.length; i += 1) {
      current = apply(values[i], data);
      if (truthy(current)) return current;
    }
    return current;
  } else if (op === "filter") {
    scopedData = apply(values[0], data);
    scopedLogic = values[1];
    if (!Array.isArray(scopedData)) return [];
    return scopedData.filter(function (datum) { return truthy(apply(scopedLogic, datum)); });
  } else if (op === "map") {
    scopedData = apply(values[0], data);
    scopedLogic = values[1];
    if (!Array.isArray(scopedData)) return [];
    return scopedData.map(function (datum) { return apply(scopedLogic, datum); });
  } else if (op === "reduce") {
    scopedData = apply(values[0], data);
    scopedLogic = values[1];
    initial = typeof values[2] !== "undefined" ? apply(values[2], data) : null;
    if (!Array.isArray(scopedData)) return initial;
    return scopedData.reduce(function (accumulator, current) {
      return apply(scopedLogic, { current: current, accumulator: accumulator });
    }, initial);
  } else if (op === "all") {
    scopedData = apply(values[0], data);
    scopedLogic = values[1];
    if (!Array.isArray(scopedData) || !scopedData.length) return false;
    for (i = 0; i < scopedData.length; i += 1) {
      if (!truthy(apply(scopedLogic, scopedData[i]))) return false;
    }
    return true;
  } else if (op === "none") {
    scopedData = apply(values[0], data);
    scopedLogic = values[1];
    if (!Array.isArray(scopedData) || !scopedData.length) return true;
    for (i = 0; i < scopedData.length; i += 1) {
      if (truthy(apply(scopedLogic, scopedData[i]))) return false;
    }
    return true;
  } else if (op === "some") {
    scopedData = apply(values[0], data);
    scopedLogic = values[1];
    if (!Array.isArray(scopedData) || !scopedData.length) return false;
    for (i = 0; i < scopedData.length; i += 1) {
      if (truthy(apply(scopedLogic, scopedData[i]))) return true;
    }
    return false;
  }

  values = values.map(function (val) { return apply(val, data); });

  if (Object.prototype.hasOwnProperty.call(operations, op) && typeof operations[op] === "function") {
    return operations[op].apply(data, values);
  }
  throw new Error("Unrecognized operation " + op);
}

export function main(input) {
  const out = {};
  for (const name of Object.keys(RULES)) out[name] = apply(RULES[name], input);
  return out;
}

export const inputs = [{},{"customer":{"id":1,"country":"US","age":17},"items":[]},{"customer":{"id":2,"country":"GB","age":30,"tier":"gold","blocked":true,"name":"Gil","phone":"1"},"items":[{"sku":"AB","name":"x","price":10,"qty":1,"tags":[],"weight":5,"inStock":0}]},{"customer":{"id":777,"name":"Ann","country":"FR","age":63,"tier":"gold","orders":5,"distanceKm":305,"email":"a@b.c"},"items":[{"sku":"SKU312","name":"mug","price":46.5,"qty":3,"tags":["bulk"],"weight":0,"inStock":true,"recalled":false},{"sku":"SKU697","name":"book","price":27.5,"qty":3,"tags":["fragile"],"weight":2,"inStock":true,"recalled":false},{"sku":"SKU767","name":"vase","price":61.5,"qty":0,"tags":["fragile","glass"],"weight":1,"inStock":true,"recalled":false}]},{"customer":{"id":654,"name":"Ann","country":"FR","age":63,"tier":"gold","orders":20,"distanceKm":646,"email":"a@b.c"},"items":[{"sku":"SKU978","name":"vase","price":70.5,"qty":3,"tags":[],"weight":6,"inStock":true,"recalled":false},{"sku":"SKU324","name":"vase","price":13.5,"qty":2,"tags":[],"weight":4,"inStock":true,"recalled":false},{"sku":"SKU419","name":"vase","price":73.5,"qty":1,"tags":["fragile","glass"],"weight":1,"inStock":true,"recalled":false},{"sku":"SKU723","name":"book","price":40.5,"qty":3,"tags":["fragile","glass"],"weight":1,"inStock":true,"recalled":false},{"sku":"SKU402","name":"mug","price":79.5,"qty":3,"tags":[],"weight":5,"inStock":true,"recalled":false},{"sku":"SKU773","name":"lamp","price":62.5,"qty":1,"tags":["fragile"],"weight":1,"inStock":true,"recalled":false},{"sku":"SKU165","name":"mug","price":44.5,"qty":1,"tags":["bulk"],"weight":5,"inStock":false,"recalled":false},{"sku":"SKU246","name":"vase","price":21.5,"qty":0,"tags":["fragile"],"weight":0,"inStock":true,"recalled":false},{"sku":"SKU391","name":"vase","price":29.5,"qty":2,"tags":[],"weight":8,"inStock":true,"recalled":false},{"sku":"SKU427","name":"mug","price":53.5,"qty":3,"tags":["fragile"],"weight":1,"inStock":false,"recalled":false},{"sku":"SKU528","name":"book","price":17.5,"qty":2,"tags":["fragile"],"weight":0,"inStock":true,"recalled":false},{"sku":"SKU363","name":"book","price":52.5,"qty":3,"tags":[],"weight":6,"inStock":true,"recalled":false}]},{"customer":{"id":313,"name":"Bob","country":"CA","age":29,"tier":"silver","orders":0,"distanceKm":67,"email":"a@b.c"},"items":[{"sku":"SKU185","name":"lamp","price":33.5,"qty":0,"tags":["fragile"],"weight":7,"inStock":true,"recalled":false},{"sku":"SKU398","name":"lamp","price":21.5,"qty":2,"tags":[],"weight":1,"inStock":true,"recalled":false},{"sku":"SKU912","name":"vase","price":34.5,"qty":2,"tags":[],"weight":3,"inStock":true,"recalled":false},{"sku":"SKU655","name":"lamp","price":38.5,"qty":3,"tags":[],"weight":9,"inStock":true,"recalled":false},{"sku":"SKU869","name":"vase","price":61.5,"qty":1,"tags":[],"weight":2,"inStock":false,"recalled":false},{"sku":"SKU760","name":"vase","price":18.5,"qty":1,"tags":[],"weight":2,"inStock":true,"recalled":false},{"sku":"SKU412","name":"book","price":53.5,"qty":4,"tags":["bulk"],"weight":8,"inStock":true,"recalled":false},{"sku":"SKU708","name":"vase","price":8.5,"qty":2,"tags":["fragile"],"weight":6,"inStock":true,"recalled":false},{"sku":"SKU592","name":"vase","price":38.5,"qty":0,"tags":["fragile"],"weight":0,"inStock":true,"recalled":false},{"sku":"SKU150","name":"vase","price":14.5,"qty":4,"tags":["fragile","glass"],"weight":8,"inStock":true,"recalled":false},{"sku":"SKU539","name":"vase","price":68.5,"qty":0,"tags":["fragile"],"weight":8,"inStock":true,"recalled":false},{"sku":"SKU772","name":"book","price":46.5,"qty":2,"tags":[],"weight":2,"inStock":true,"recalled":true},{"sku":"SKU292","name":"mug","price":44.5,"qty":3,"tags":["bulk"],"weight":3,"inStock":true,"recalled":false},{"sku":"SKU106","name":"lamp","price":34.5,"qty":4,"tags":["fragile"],"weight":0,"inStock":true,"recalled":false},{"sku":"SKU299","name":"mug","price":31.5,"qty":1,"tags":["fragile"],"weight":4,"inStock":true,"recalled":false},{"sku":"SKU527","name":"mug","price":54.5,"qty":2,"tags":["fragile","glass"],"weight":0,"inStock":true,"recalled":false},{"sku":"SKU638","name":"mug","price":12.5,"qty":3,"tags":["fragile","glass"],"weight":1,"inStock":true,"recalled":false},{"sku":"SKU670","name":"vase","price":16.5,"qty":0,"tags":["bulk"],"weight":9,"inStock":false,"recalled":false},{"sku":"SKU163","name":"mug","price":1.5,"qty":0,"tags":["fragile"],"weight":5,"inStock":true,"recalled":false},{"sku":"SKU734","name":"book","price":69.5,"qty":4,"tags":["bulk"],"weight":1,"inStock":false,"recalled":false},{"sku":"SKU676","name":"book","price":15.5,"qty":0,"tags":["fragile","glass"],"weight":0,"inStock":true,"recalled":false},{"sku":"SKU125","name":"vase","price":60.5,"qty":1,"tags":["bulk"],"weight":9,"inStock":true,"recalled":false},{"sku":"SKU556","name":"lamp","price":66.5,"qty":1,"tags":[],"weight":5,"inStock":true,"recalled":false},{"sku":"SKU989","name":"book","price":40.5,"qty":3,"tags":["fragile","glass"],"weight":2,"inStock":true,"recalled":false},{"sku":"SKU255","name":"lamp","price":40.5,"qty":4,"tags":[],"weight":2,"inStock":true,"recalled":false},{"sku":"SKU567","name":"lamp","price":41.5,"qty":1,"tags":[],"weight":0,"inStock":true,"recalled":false},{"sku":"SKU749","name":"lamp","price":22.5,"qty":2,"tags":[],"weight":2,"inStock":true,"recalled":false},{"sku":"SKU454","name":"vase","price":43.5,"qty":3,"tags":["bulk"],"weight":4,"inStock":true,"recalled":false},{"sku":"SKU135","name":"mug","price":8.5,"qty":4,"tags":[],"weight":7,"inStock":true,"recalled":false},{"sku":"SKU410","name":"book","price":38.5,"qty":0,"tags":[],"weight":2,"inStock":true,"recalled":false},{"sku":"SKU693","name":"lamp","price":18.5,"qty":3,"tags":["fragile"],"weight":1,"inStock":true,"recalled":false},{"sku":"SKU311","name":"vase","price":79.5,"qty":0,"tags":["fragile","glass"],"weight":1,"inStock":true,"recalled":false},{"sku":"SKU356","name":"book","price":7.5,"qty":1,"tags":["bulk"],"weight":5,"inStock":true,"recalled":false},{"sku":"SKU281","name":"vase","price":21.5,"qty":2,"tags":["bulk"],"weight":3,"inStock":true,"recalled":false},{"sku":"SKU181","name":"lamp","price":16.5,"qty":2,"tags":["fragile"],"weight":7,"inStock":true,"recalled":false},{"sku":"SKU403","name":"mug","price":2.5,"qty":0,"tags":["bulk"],"weight":6,"inStock":true,"recalled":false},{"sku":"SKU589","name":"lamp","price":16.5,"qty":4,"tags":["fragile"],"weight":2,"inStock":true,"recalled":false},{"sku":"SKU350","name":"book","price":70.5,"qty":3,"tags":["fragile"],"weight":8,"inStock":false,"recalled":false},{"sku":"SKU328","name":"book","price":1.5,"qty":0,"tags":["fragile"],"weight":4,"inStock":true,"recalled":false},{"sku":"SKU404","name":"book","price":70.5,"qty":3,"tags":[],"weight":1,"inStock":true,"recalled":false}]}];
