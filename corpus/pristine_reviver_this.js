// inputs: [0, 1]
// A JSON.parse reviver's `this` is the object holding the value: its
// `constructor.prototype` is Object.prototype.
function main(n) {
  JSON.parse('{"a":1}', function (k, v) {
    if (k === "a") this.constructor.prototype.rv = n + 9;
    return v;
  });
  const r = [({}).rv];
  delete Object.prototype.rv;
  return r;
}
