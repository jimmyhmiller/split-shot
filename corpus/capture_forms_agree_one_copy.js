// inputs: ["1.2.3", "10.0.1", "x", 5, null]
// forbid: function Tagged[\s\S]*function Tagged
// A closure made once is asked for in several contexts (made with an
// object, called directly, constructed through a subclass), and each may
// know a different amount of a capture (here `sep`, the class's `Version`).
// Where the forms differ, that capture is known less (see `cap_ceilings`)
// so they agree: one copy of the function's code, not one per form.
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
    var t = new lib.Tagged(input, "t");
    out.push(v.major, v.bump().parts.join("/"), v.made, t.made, t.tag, t instanceof lib.Version);
  } catch (e) { out.push(e.name + ": " + e.message); }
  return out;
}
