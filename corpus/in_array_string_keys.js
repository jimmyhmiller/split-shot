// inputs: [1, 0]
// forbid-main: "type" in|"map" in|"nope" in
// `in` with a string key that is no index on a modeled array: its own key, a member of the standard prototypes, a subclass's getter, or missing.
class Sub extends Array { get type() { return 1; } }
function main(x) {
  const a = [1, 2]; const s = new Sub();
  return ['type' in a, 'extra' in a, 'map' in a, 'toString' in a, 'hasOwnProperty' in a, '1.5' in a, 'type' in s, 'nope' in s, x];
}
