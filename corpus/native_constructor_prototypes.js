// inputs: [{"prototype": null, "x": 0, "setter": false}, {"prototype": null, "x": 0, "setter": true}, {"prototype": null, "x": 3, "setter": false}, {"prototype": null, "x": 3, "setter": true}, {"prototype": null, "x": 17, "setter": false}, {"prototype": null, "x": 17, "setter": true}, {"prototype": null, "x": 19, "setter": false}, {"prototype": null, "x": 19, "setter": true}, {"prototype": 0, "x": 0, "setter": false}, {"prototype": 0, "x": 0, "setter": true}, {"prototype": 0, "x": 3, "setter": false}, {"prototype": 0, "x": 3, "setter": true}, {"prototype": 0, "x": 17, "setter": false}, {"prototype": 0, "x": 17, "setter": true}, {"prototype": 0, "x": 19, "setter": false}, {"prototype": 0, "x": 19, "setter": true}, {"prototype": "text", "x": 0, "setter": false}, {"prototype": "text", "x": 0, "setter": true}, {"prototype": "text", "x": 3, "setter": false}, {"prototype": "text", "x": 3, "setter": true}, {"prototype": "text", "x": 17, "setter": false}, {"prototype": "text", "x": 17, "setter": true}, {"prototype": "text", "x": 19, "setter": false}, {"prototype": "text", "x": 19, "setter": true}, {"prototype": false, "x": 0, "setter": false}, {"prototype": false, "x": 0, "setter": true}, {"prototype": false, "x": 3, "setter": false}, {"prototype": false, "x": 3, "setter": true}, {"prototype": false, "x": 17, "setter": false}, {"prototype": false, "x": 17, "setter": true}, {"prototype": false, "x": 19, "setter": false}, {"prototype": false, "x": 19, "setter": true}, {"prototype": {}, "x": 0, "setter": false}, {"prototype": {}, "x": 0, "setter": true}, {"prototype": {}, "x": 3, "setter": false}, {"prototype": {}, "x": 3, "setter": true}, {"prototype": {}, "x": 17, "setter": false}, {"prototype": {}, "x": 17, "setter": true}, {"prototype": {}, "x": 19, "setter": false}, {"prototype": {}, "x": 19, "setter": true}, {"prototype": [], "x": 0, "setter": false}, {"prototype": [], "x": 0, "setter": true}, {"prototype": [], "x": 3, "setter": false}, {"prototype": [], "x": 3, "setter": true}, {"prototype": [], "x": 17, "setter": false}, {"prototype": [], "x": 17, "setter": true}, {"prototype": [], "x": 19, "setter": false}, {"prototype": [], "x": 19, "setter": true}, {"prototype": {"kind": "custom"}, "x": 0, "setter": false}, {"prototype": {"kind": "custom"}, "x": 0, "setter": true}, {"prototype": {"kind": "custom"}, "x": 3, "setter": false}, {"prototype": {"kind": "custom"}, "x": 3, "setter": true}, {"prototype": {"kind": "custom"}, "x": 17, "setter": false}, {"prototype": {"kind": "custom"}, "x": 17, "setter": true}, {"prototype": {"kind": "custom"}, "x": 19, "setter": false}, {"prototype": {"kind": "custom"}, "x": 19, "setter": true}]
// From the residual-language branch's C corpus (corpus-c/cases/native-constructor-prototypes.js),
// where master's specializer got it wrong or did not finish.
// Dynamic constructor prototypes use GetPrototypeFromConstructor, not Object.create semantics.
function Dynamic(x) {
  this.x = x;
  this.target = new.target === Dynamic;
  if (x === 17) return {replacement: 'record'};
  if (x === 19) return function () { return 'callable'; };
}
function make(seed) {
  return function Captured(x) { this.x = x + seed; seed++; };
}
function main(input) {
  var prototype = input.prototype;
  var effects = 0;
  if (input.setter && prototype !== null && typeof prototype === 'object') {
    Object.defineProperty(prototype, 'x', {
      get: function () { effects++; return 91; },
      set: function (x) { effects += x; }
    });
  }
  Dynamic.prototype = prototype;
  var instance = new Dynamic(input.x);
  var first = [typeof instance, instance.x, instance.target,
    Object.getPrototypeOf(instance) === Dynamic.prototype,
    Object.getPrototypeOf(instance) === Object.prototype, effects];
  var A = make(10), B = make(20);
  A.prototype.kind = 'a'; B.prototype.kind = 'b';
  var sum = 0;
  for (var i = 0; i < (input.x & 7); i++) {
    var a = new A(i), b = new B(i);
    sum += a.x + b.x;
  }
  var a = new A(2), b = new B(3);
  return [first, sum, a.x, b.x, a.kind, b.kind,
    Object.getPrototypeOf(a) === A.prototype,
    Object.getPrototypeOf(b) === B.prototype];
}
