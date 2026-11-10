// @case {"description": "Property names computed at run time reach the same properties as static ones; Object.defineProperty creates data properties with attributes, and a non-writable one is inherited and cannot be shadowed by assignment."}
function Box(v) { this.value = v; this.label = "box"; }
Object.defineProperty(Object.prototype, "describe", {
  value: function (prefix) { return prefix + ":" + this.label; }
});
function names(flag) { return flag ? "value" : "label"; }
function main(x) {
  var box = new Box(x);
  var record = { value: 1, label: "record" };
  var first = box[names(true)], second = box[names(false)];
  box[names(true)] = x + 10;
  record["la" + "bel"] = "renamed";
  record["extra"] = x;
  var list = [10, 20, 30];
  var index = x > 0 && x < 3 ? x : 0;
  var picked = list[index], count = list["length"];
  var fixed = {};
  Object.defineProperty(fixed, "constant", { value: 5 });
  Object.defineProperty(fixed, "open", { value: 6, writable: true, configurable: true });
  fixed.open = fixed.open + x;
  var same = Object.defineProperty(fixed, "constant", { value: 5 }) === fixed;
  return [first, second, box.value, record.label, record.extra, record["missing"] === undefined,
    record[names(false) + "!"] === undefined, picked, count,
    box.describe("b"), record.describe("r"), fixed.constant, fixed.open, same,
    new Object().describe === box.describe];
}
