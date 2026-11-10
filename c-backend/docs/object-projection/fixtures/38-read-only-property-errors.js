// @case {"description": "Assigning to a non-writable property, shadowing an inherited one by assignment, and redefining a non-configurable property each throw TypeError.", "errorNameOnly": true, "inputs": ["0", "1", "2", "3"]}
function Holder() { this.kept = 1; }
function main(x) {
  var target = {};
  Object.defineProperty(target, "constant", { value: 5 });
  var proto = new Holder();
  Object.defineProperty(Holder.prototype, "inherited", { value: 9 });
  if (x === 0) target.constant = 6;
  if (x === 1) proto.inherited = 7;
  if (x === 2) Object.defineProperty(target, "constant", { value: 6 });
  Object.defineProperty(target, "constant", { writable: true });
  return 0;
}
