// inputs: ["1.2.3", "10.0.1", "x", 5, null]
// A class whose constructor reads variables of the function around it is made, when it is a runtime value, as a function holding those variables (not one that constructs through `Reflect.construct` at every `new`): it constructs as the class does (an early `return` of another object, `new.target`, a subclass's `super(...)`), and throws when called without `new`.
function make(limit, sep) {
  class Version {
    constructor(text) {
      if (text instanceof Version) return text;
      if (typeof text !== "string") throw new TypeError("not a string: " + typeof text);
      var parts = text.split(sep);
      if (parts.length > limit) throw new RangeError("too long");
      this.parts = parts;
      this.made = new.target === Version ? "Version" : "sub";
    }
    get major() { return +this.parts[0]; }
    bump() { return new Version(String(this.major + 1) + sep + "0"); }
  }
  class Tagged extends Version {
    constructor(text, tag) { super(text); this.tag = tag + sep; }
  }
  return { Version: Version, Tagged: Tagged };
}
var lib = make(3, ".");
function main(input) {
  var out = [];
  try {
    var v = new lib.Version(input);
    var again = new lib.Version(v);
    var t = new lib.Tagged(input, "t");
    out.push(v.major, v.bump().parts.join("/"), again === v, v.made, t.made, t.tag, t instanceof lib.Version, Object.keys(v).join());
  } catch (e) { out.push(e.name + ": " + e.message); }
  try { lib.Version(input); out.push("called"); } catch (e) { out.push(e.name + ": " + e.message); }
  return out;
}
