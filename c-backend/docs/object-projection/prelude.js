// Builtins written in the guest language. The encoder puts the sections a
// program can reach in front of it, so they are specialized and compiled
// like any other guest code.
//
// A section is included when the program mentions one of the names on its
// `//@ when` line as an identifier, a property name or a string, or when an
// included section lists one of them on a `//@ needs` line. A builtin
// reached by a property name that never appears in the program cannot be
// looked up, so leaving its section out is unobservable.
//
// Forms available only here:
//   $rootPrototype(k)      the root object (0), array (1) or function (2) prototype
//   $argumentCount()       how many values this activation was called with
//   $argument(i)           the i-th of them, or undefined
//   $callWith(f, r, k)     call f with receiver r and this activation's
//                          arguments from position k on
// A leading "summary <name>" string names the effect the whole-program
// analysis may assume at a method call that can only reach this function.
// The summary must cover everything the body can do.

//@ when push
$rootPrototype(1).push = function () {
  "summary push";
  var count = $argumentCount(), i = 0;
  while (i < count) { this[this.length] = $argument(i); i = i + 1; }
  return this.length;
};

//@ when pop
$rootPrototype(1).pop = function () {
  "summary pop";
  var length = this.length;
  if (length === 0) return undefined;
  var last = this[length - 1];
  this.length = length - 1;
  return last;
};

//@ when call
$rootPrototype(2).call = function (receiver) {
  "summary call";
  return $callWith(this, receiver, 1);
};

//@ when Object defineProperty
// Data descriptors only. Attributes are kept and enforced; accessor
// descriptors are refused.
function Object() { return {}; }
Object.prototype = $rootPrototype(0);
Object.defineProperty = function (target, key, descriptor) {
  "summary defineProperty";
  if ($has(descriptor, "get") || $has(descriptor, "set"))
    throw new TypeError("accessor properties are not supported");
  var fields = 0, value = undefined;
  if ($has(descriptor, "value")) { fields = fields + 1; value = descriptor.value; }
  if ($has(descriptor, "writable")) { fields = fields + 2; if (descriptor.writable) fields = fields + 4; }
  if ($has(descriptor, "enumerable")) { fields = fields + 8; if (descriptor.enumerable) fields = fields + 16; }
  if ($has(descriptor, "configurable")) { fields = fields + 32; if (descriptor.configurable) fields = fields + 64; }
  return $define(target, key, value, fields);
};

// ---------------------------------------------------------------------------
// Helpers. A `//@ helper name` section is included when an included section
// calls `name(`.

//@ helper $integer
// ToIntegerOrInfinity.
var $integer = function (value) {
  var n = +value;
  if (n !== n) return 0;
  return $math("trunc", n);
};

//@ helper $isSpace
// WhiteSpace or LineTerminator.
var $isSpace = function (c) {
  return c === 32 || (c >= 9 && c <= 13) || c === 160 || c === 5760 || (c >= 8192 && c <= 8202) ||
    c === 8232 || c === 8233 || c === 8239 || c === 8287 || c === 12288 || c === 65279;
};

//@ helper $relative
// A relative index clamped into 0..length, as slice and splice take it.
var $relative = function (value, length, missing) {
  if (value === undefined) return missing;
  var n = $integer(value);
  if (n < 0) { n = n + length; if (n < 0) n = 0; }
  if (n > length) n = length;
  return n;
};

// ---------------------------------------------------------------------------
// Globals.

//@ when isNaN
var isNaN = function (value) { var n = +value; return n !== n; };

//@ when isFinite
var isFinite = function (value) { var n = +value; return n === n && n !== 1 / 0 && n !== -1 / 0; };

//@ when Boolean
var Boolean = function (value) { return !!value; };

//@ when parseInt
var parseInt = function (text, radix) {
  var s = "" + text, i = 0, n = s.length, sign = 1;
  while (i < n && $isSpace($charCodeAt(s, i))) i = i + 1;
  if (i < n && $charCodeAt(s, i) === 45) { sign = -1; i = i + 1; }
  else if (i < n && $charCodeAt(s, i) === 43) i = i + 1;
  var r = radix === undefined ? 0 : (+radix) | 0;
  if (r !== 0 && (r < 2 || r > 36)) return 0 / 0;
  var prefixed = i + 1 < n && $charCodeAt(s, i) === 48 &&
    ($charCodeAt(s, i + 1) === 120 || $charCodeAt(s, i + 1) === 88);
  if ((r === 0 || r === 16) && prefixed) { i = i + 2; r = 16; }
  if (r === 0) r = 10;
  var value = 0, digits = 0;
  while (i < n) {
    var c = $charCodeAt(s, i), d = 99;
    if (c >= 48 && c <= 57) d = c - 48;
    else if (c >= 97 && c <= 122) d = c - 87;
    else if (c >= 65 && c <= 90) d = c - 55;
    if (d >= r) break;
    value = value * r + d;
    digits = digits + 1;
    i = i + 1;
  }
  if (digits === 0) return 0 / 0;
  return sign * value;
};

//@ when parseFloat
var parseFloat = function (text) {
  var s = "" + text, i = 0, n = s.length;
  while (i < n && $isSpace($charCodeAt(s, i))) i = i + 1;
  var start = i;
  if (i < n && ($charCodeAt(s, i) === 45 || $charCodeAt(s, i) === 43)) i = i + 1;
  if ($indexOf(s, "Infinity", i) === i) return $charCodeAt(s, start) === 45 ? -1 / 0 : 1 / 0;
  var digits = 0;
  while (i < n && $charCodeAt(s, i) >= 48 && $charCodeAt(s, i) <= 57) { i = i + 1; digits = digits + 1; }
  if (i < n && $charCodeAt(s, i) === 46) {
    i = i + 1;
    while (i < n && $charCodeAt(s, i) >= 48 && $charCodeAt(s, i) <= 57) { i = i + 1; digits = digits + 1; }
  }
  if (digits === 0) return 0 / 0;
  if (i < n && ($charCodeAt(s, i) === 101 || $charCodeAt(s, i) === 69)) {
    var mark = i, exponent = 0;
    i = i + 1;
    if (i < n && ($charCodeAt(s, i) === 45 || $charCodeAt(s, i) === 43)) i = i + 1;
    while (i < n && $charCodeAt(s, i) >= 48 && $charCodeAt(s, i) <= 57) { i = i + 1; exponent = exponent + 1; }
    if (exponent === 0) i = mark;
  }
  return +$substring(s, start, i);
};

// ---------------------------------------------------------------------------
// Number.

//@ when Number
var Number = function (value) { return $argumentCount() === 0 ? 0 : +value; };
Number.prototype = $rootPrototype(4);
Number.MAX_SAFE_INTEGER = 9007199254740991;
Number.MIN_SAFE_INTEGER = -9007199254740991;
Number.EPSILON = 2.220446049250313e-16;
Number.MAX_VALUE = 1.7976931348623157e308;
Number.MIN_VALUE = 5e-324;
Number.POSITIVE_INFINITY = 1 / 0;
Number.NEGATIVE_INFINITY = -1 / 0;
Number.NaN = 0 / 0;
Number.isNaN = function (value) { return typeof value === "number" && value !== value; };
Number.isFinite = function (value) {
  return typeof value === "number" && value === value && value !== 1 / 0 && value !== -1 / 0;
};
Number.isInteger = function (value) {
  return typeof value === "number" && value === value && value !== 1 / 0 && value !== -1 / 0 &&
    $math("trunc", value) === value;
};
Number.isSafeInteger = function (value) {
  return typeof value === "number" && $math("trunc", value) === value &&
    value <= 9007199254740991 && value >= -9007199254740991;
};

//@ when toString
// Number.prototype.toString. A radix other than 10 is supported for integers.
$rootPrototype(4).toString = function (radix) {
  var value = +this;
  if (radix === undefined || radix === 10) return "" + value;
  var r = $integer(radix);
  if (r < 2 || r > 36) throw new RangeError("toString() radix must be between 2 and 36");
  if (value !== value || value === 1 / 0 || value === -1 / 0) return "" + value;
  if ($math("trunc", value) !== value)
    throw new RangeError("a non-integer in a radix other than 10 is not supported");
  var n = $math("abs", value), out = "";
  if (n === 0) return "0";
  while (n > 0) {
    var d = n % r;
    out = $fromCharCode(d < 10 ? 48 + d : 87 + d) + out;
    n = $math("trunc", n / r);
  }
  return value < 0 ? "-" + out : out;
};
$rootPrototype(3).toString = function () { return this; };
$rootPrototype(5).toString = function () { return this ? "true" : "false"; };

//@ when valueOf
$rootPrototype(3).valueOf = function () { return this; };
$rootPrototype(4).valueOf = function () { return this; };
$rootPrototype(5).valueOf = function () { return this; };

// ---------------------------------------------------------------------------
// Math. Properties are ordinary writable properties here.

//@ when Math
var Math = {};
Math.PI = 3.141592653589793;
Math.E = 2.718281828459045;
Math.LN2 = 0.6931471805599453;
Math.LN10 = 2.302585092994046;
Math.LOG2E = 1.4426950408889634;
Math.LOG10E = 0.4342944819032518;
Math.SQRT2 = 1.4142135623730951;
Math.SQRT1_2 = 0.7071067811865476;
Math.floor = function (x) { return $math("floor", +x); };
Math.ceil = function (x) { return $math("ceil", +x); };
Math.round = function (x) { return $math("round", +x); };
Math.trunc = function (x) { return $math("trunc", +x); };
Math.abs = function (x) { return $math("abs", +x); };
Math.sqrt = function (x) { return $math("sqrt", +x); };
Math.sin = function (x) { return $math("sin", +x); };
Math.cos = function (x) { return $math("cos", +x); };
Math.tan = function (x) { return $math("tan", +x); };
Math.asin = function (x) { return $math("asin", +x); };
Math.acos = function (x) { return $math("acos", +x); };
Math.atan = function (x) { return $math("atan", +x); };
Math.exp = function (x) { return $math("exp", +x); };
Math.log = function (x) { return $math("log", +x); };
Math.log2 = function (x) { return $math("log2", +x); };
Math.log10 = function (x) { return $math("log10", +x); };
Math.cbrt = function (x) { return $math("cbrt", +x); };
Math.sign = function (x) { return $math("sign", +x); };
Math.fround = function (x) { return $math("fround", +x); };
Math.clz32 = function (x) { return $math("clz32", +x); };
Math.atan2 = function (y, x) { return $math("atan2", +y, +x); };
Math.pow = function (x, y) { return $math("pow", +x, +y); };
Math.imul = function (x, y) { return $math("imul", +x, +y); };
Math.min = function () {
  var result = 1 / 0, i = 0, count = $argumentCount();
  while (i < count) { result = $math("min", result, +$argument(i)); i = i + 1; }
  return result;
};
Math.max = function () {
  var result = -1 / 0, i = 0, count = $argumentCount();
  while (i < count) { result = $math("max", result, +$argument(i)); i = i + 1; }
  return result;
};
Math.hypot = function () {
  var result = 0, i = 0, count = $argumentCount();
  while (i < count) { result = $math("hypot", result, +$argument(i)); i = i + 1; }
  return result;
};

// ---------------------------------------------------------------------------
// String.

//@ when String
var String = function (value) { return $argumentCount() === 0 ? "" : "" + value; };
String.prototype = $rootPrototype(3);
String.fromCharCode = function () {
  var out = "", i = 0, count = $argumentCount();
  while (i < count) { out = out + $fromCharCode(+$argument(i)); i = i + 1; }
  return out;
};

//@ when charAt
$rootPrototype(3).charAt = function (index) {
  var s = "" + this, i = $integer(index);
  return $substring(s, i, i + 1);
};

//@ when charCodeAt
$rootPrototype(3).charCodeAt = function (index) { return $charCodeAt("" + this, $integer(index)); };

//@ when at
$rootPrototype(3).at = function (index) {
  var s = "" + this, i = $integer(index);
  if (i < 0) i = i + s.length;
  if (i < 0 || i >= s.length) return undefined;
  return $substring(s, i, i + 1);
};
$rootPrototype(1).at = function (index) {
  var i = $integer(index);
  if (i < 0) i = i + this.length;
  if (i < 0 || i >= this.length) return undefined;
  return this[i];
};

//@ when indexOf
$rootPrototype(3).indexOf = function (search, from) {
  return $indexOf("" + this, "" + search, $integer(from));
};
$rootPrototype(1).indexOf = function (search, from) {
  var length = this.length, i = $integer(from);
  if (i < 0) { i = i + length; if (i < 0) i = 0; }
  while (i < length) { if (i in this && this[i] === search) return i; i = i + 1; }
  return -1;
};

//@ when lastIndexOf
$rootPrototype(3).lastIndexOf = function (search, from) {
  var s = "" + this, t = "" + search;
  var start = from === undefined || +from !== +from ? s.length : $integer(from);
  if (start > s.length - t.length) start = s.length - t.length;
  while (start >= 0) { if ($indexOf(s, t, start) === start) return start; start = start - 1; }
  return -1;
};
$rootPrototype(1).lastIndexOf = function (search, from) {
  var length = this.length;
  var i = $argumentCount() > 1 ? $integer(from) : length - 1;
  if (i < 0) i = i + length;
  if (i >= length) i = length - 1;
  while (i >= 0) { if (i in this && this[i] === search) return i; i = i - 1; }
  return -1;
};

//@ when includes
$rootPrototype(3).includes = function (search, from) {
  return $indexOf("" + this, "" + search, $integer(from)) !== -1;
};
$rootPrototype(1).includes = function (search, from) {
  var length = this.length, i = $integer(from);
  if (i < 0) { i = i + length; if (i < 0) i = 0; }
  while (i < length) {
    var item = this[i];
    if (item === search || (item !== item && search !== search)) return true;
    i = i + 1;
  }
  return false;
};

//@ when startsWith
$rootPrototype(3).startsWith = function (search, position) {
  var s = "" + this, t = "" + search, at = $integer(position);
  if (at < 0) at = 0;
  if (at > s.length) at = s.length;
  return $indexOf(s, t, at) === at && at + t.length <= s.length;
};

//@ when endsWith
$rootPrototype(3).endsWith = function (search, end) {
  var s = "" + this, t = "" + search;
  var stop = end === undefined ? s.length : $integer(end);
  if (stop < 0) stop = 0;
  if (stop > s.length) stop = s.length;
  var at = stop - t.length;
  return at >= 0 && $indexOf(s, t, at) === at;
};

//@ when slice
$rootPrototype(3).slice = function (start, end) {
  var s = "" + this, length = s.length;
  return $substring(s, $relative(start, length, 0), $relative(end, length, length));
};
$rootPrototype(1).slice = function (start, end) {
  var length = this.length, from = $relative(start, length, 0), to = $relative(end, length, length);
  var out = [], i = from;
  if (to > from) out.length = to - from;
  while (i < to) { if (i in this) out[i - from] = this[i]; i = i + 1; }
  return out;
};

//@ when substring
$rootPrototype(3).substring = function (start, end) {
  var s = "" + this, length = s.length;
  var a = $integer(start), b = end === undefined ? length : $integer(end);
  if (a < 0) a = 0;
  if (b < 0) b = 0;
  if (a > length) a = length;
  if (b > length) b = length;
  return a < b ? $substring(s, a, b) : $substring(s, b, a);
};

//@ when substr
$rootPrototype(3).substr = function (start, count) {
  var s = "" + this, length = s.length, a = $integer(start);
  if (a < 0) { a = a + length; if (a < 0) a = 0; }
  if (a > length) a = length;
  var n = count === undefined ? length - a : $integer(count);
  if (n < 0) n = 0;
  return $substring(s, a, a + n);
};

//@ when concat
$rootPrototype(3).concat = function () {
  var out = "" + this, i = 0, count = $argumentCount();
  while (i < count) { out = out + $argument(i); i = i + 1; }
  return out;
};
$rootPrototype(1).concat = function () {
  var out = [], n = 0, part = -1, count = $argumentCount();
  while (part < count) {
    var item = part < 0 ? this : $argument(part);
    if ($isArray(item)) {
      var j = 0, length = item.length;
      while (j < length) { if (j in item) out[n + j] = item[j]; j = j + 1; }
      n = n + length;
      out.length = n;
    } else { out[n] = item; n = n + 1; }
    part = part + 1;
  }
  return out;
};

//@ when repeat
$rootPrototype(3).repeat = function (count) {
  var s = "" + this, n = $integer(count), out = "";
  if (n < 0 || n === 1 / 0) throw new RangeError("Invalid count value");
  while (n > 0) { if (n % 2 === 1) out = out + s; n = $math("floor", n / 2); if (n > 0) s = s + s; }
  return out;
};

//@ when trim
$rootPrototype(3).trim = function () {
  var s = "" + this, a = 0, b = s.length;
  while (a < b && $isSpace($charCodeAt(s, a))) a = a + 1;
  while (b > a && $isSpace($charCodeAt(s, b - 1))) b = b - 1;
  return $substring(s, a, b);
};

//@ when trimStart
$rootPrototype(3).trimStart = function () {
  var s = "" + this, a = 0;
  while (a < s.length && $isSpace($charCodeAt(s, a))) a = a + 1;
  return $substring(s, a, s.length);
};

//@ when trimEnd
$rootPrototype(3).trimEnd = function () {
  var s = "" + this, b = s.length;
  while (b > 0 && $isSpace($charCodeAt(s, b - 1))) b = b - 1;
  return $substring(s, 0, b);
};

//@ when padStart
$rootPrototype(3).padStart = function (target, fill) {
  var s = "" + this, want = $integer(target), pad = fill === undefined ? " " : "" + fill;
  if (want <= s.length || pad.length === 0) return s;
  var prefix = "";
  while (prefix.length < want - s.length) prefix = prefix + pad;
  return $substring(prefix, 0, want - s.length) + s;
};

//@ when padEnd
$rootPrototype(3).padEnd = function (target, fill) {
  var s = "" + this, want = $integer(target), pad = fill === undefined ? " " : "" + fill;
  if (want <= s.length || pad.length === 0) return s;
  var suffix = "";
  while (suffix.length < want - s.length) suffix = suffix + pad;
  return s + $substring(suffix, 0, want - s.length);
};

//@ when split
// A string separator only.
$rootPrototype(3).split = function (separator, limit) {
  var s = "" + this, out = [], n = 0;
  var most = limit === undefined ? 4294967295 : (+limit) >>> 0;
  if (most === 0) return out;
  if (separator === undefined) { out[0] = s; return out; }
  var sep = "" + separator, length = s.length;
  if (sep.length === 0) {
    while (n < length && n < most) { out[n] = $substring(s, n, n + 1); n = n + 1; }
    return out;
  }
  var from = 0;
  while (true) {
    var at = $indexOf(s, sep, from);
    if (at < 0) break;
    out[n] = $substring(s, from, at);
    n = n + 1;
    if (n >= most) return out;
    from = at + sep.length;
  }
  out[n] = $substring(s, from, length);
  return out;
};

// ---------------------------------------------------------------------------
// Array.

//@ when isArray
var Array = function () {
  throw new TypeError("Array used as a value is supported only for Array.isArray and Array.prototype");
};
Array.prototype = $rootPrototype(1);
Array.isArray = function (value) { return $isArray(value); };

//@ when join
$rootPrototype(1).join = function (separator) {
  var sep = separator === undefined ? "," : "" + separator;
  var out = "", i = 0, length = this.length;
  while (i < length) {
    var item = this[i];
    if (i > 0) out = out + sep;
    if (item !== undefined && item !== null) out = out + item;
    i = i + 1;
  }
  return out;
};

//@ when reverse
$rootPrototype(1).reverse = function () {
  var a = 0, b = this.length - 1;
  while (a < b) {
    var first = this[a], hasFirst = a in this, hasLast = b in this;
    if (hasLast) this[a] = this[b];
    if (hasFirst) this[b] = first;
    if (hasFirst !== hasLast) throw new TypeError("reversing an array with holes is not supported");
    a = a + 1;
    b = b - 1;
  }
  return this;
};

//@ when shift
$rootPrototype(1).shift = function () {
  var length = this.length;
  if (length === 0) return undefined;
  var first = this[0], i = 1;
  while (i < length) {
    if (!(i in this)) throw new TypeError("shifting an array with holes is not supported");
    this[i - 1] = this[i];
    i = i + 1;
  }
  this.length = length - 1;
  return first;
};

//@ when unshift
$rootPrototype(1).unshift = function () {
  var count = $argumentCount(), length = this.length, i = length - 1;
  while (i >= 0) {
    if (!(i in this)) throw new TypeError("unshifting an array with holes is not supported");
    this[i + count] = this[i];
    i = i - 1;
  }
  i = 0;
  while (i < count) { this[i] = $argument(i); i = i + 1; }
  return length + count;
};

//@ when fill
$rootPrototype(1).fill = function (value, start, end) {
  var length = this.length, i = $relative(start, length, 0), to = $relative(end, length, length);
  while (i < to) { this[i] = value; i = i + 1; }
  return this;
};

//@ when forEach
//@ needs call
$rootPrototype(1).forEach = function (callback, receiver) {
  var i = 0, length = this.length;
  while (i < length) { if (i in this) callback.call(receiver, this[i], i, this); i = i + 1; }
};

//@ when map
//@ needs call
$rootPrototype(1).map = function (callback, receiver) {
  var i = 0, length = this.length, out = [];
  out.length = length;
  while (i < length) { if (i in this) out[i] = callback.call(receiver, this[i], i, this); i = i + 1; }
  return out;
};

//@ when filter
//@ needs call
$rootPrototype(1).filter = function (callback, receiver) {
  var i = 0, length = this.length, out = [], n = 0;
  while (i < length) {
    if (i in this) {
      var item = this[i];
      if (callback.call(receiver, item, i, this)) { out[n] = item; n = n + 1; }
    }
    i = i + 1;
  }
  return out;
};

//@ when some
//@ needs call
$rootPrototype(1).some = function (callback, receiver) {
  var i = 0, length = this.length;
  while (i < length) { if (i in this && callback.call(receiver, this[i], i, this)) return true; i = i + 1; }
  return false;
};

//@ when every
//@ needs call
$rootPrototype(1).every = function (callback, receiver) {
  var i = 0, length = this.length;
  while (i < length) { if (i in this && !callback.call(receiver, this[i], i, this)) return false; i = i + 1; }
  return true;
};

//@ when find
//@ needs call
$rootPrototype(1).find = function (callback, receiver) {
  var i = 0, length = this.length;
  while (i < length) {
    var item = this[i];
    if (callback.call(receiver, item, i, this)) return item;
    i = i + 1;
  }
  return undefined;
};

//@ when findIndex
//@ needs call
$rootPrototype(1).findIndex = function (callback, receiver) {
  var i = 0, length = this.length;
  while (i < length) { if (callback.call(receiver, this[i], i, this)) return i; i = i + 1; }
  return -1;
};

//@ when reduce
$rootPrototype(1).reduce = function (callback, initial) {
  var i = 0, length = this.length, value = initial;
  if ($argumentCount() < 2) {
    while (i < length && !(i in this)) i = i + 1;
    if (i >= length) throw new TypeError("Reduce of empty array with no initial value");
    value = this[i];
    i = i + 1;
  }
  while (i < length) { if (i in this) value = callback(value, this[i], i, this); i = i + 1; }
  return value;
};

//@ when reduceRight
$rootPrototype(1).reduceRight = function (callback, initial) {
  var i = this.length - 1, value = initial;
  if ($argumentCount() < 2) {
    while (i >= 0 && !(i in this)) i = i - 1;
    if (i < 0) throw new TypeError("Reduce of empty array with no initial value");
    value = this[i];
    i = i - 1;
  }
  while (i >= 0) { if (i in this) value = callback(value, this[i], i, this); i = i - 1; }
  return value;
};

//@ when splice
$rootPrototype(1).splice = function (start, deleteCount) {
  var length = this.length, from = $relative(start, length, 0), count = $argumentCount();
  var inserted = count > 2 ? count - 2 : 0;
  var removing = count === 0 ? 0 : count === 1 ? length - from : $integer(deleteCount);
  if (removing < 0) removing = 0;
  if (removing > length - from) removing = length - from;
  var removed = [], i = 0;
  while (i < length) {
    if (!(i in this)) throw new TypeError("splicing an array with holes is not supported");
    i = i + 1;
  }
  i = 0;
  while (i < removing) { removed[i] = this[from + i]; i = i + 1; }
  var shift = inserted - removing;
  if (shift < 0) {
    i = from + removing;
    while (i < length) { this[i + shift] = this[i]; i = i + 1; }
    this.length = length + shift;
  } else if (shift > 0) {
    i = length - 1;
    while (i >= from + removing) { this[i + shift] = this[i]; i = i - 1; }
  }
  i = 0;
  while (i < inserted) { this[from + i] = $argument(i + 2); i = i + 1; }
  return removed;
};

//@ when sort
// A stable merge sort. Without a comparator elements compare as strings;
// undefined sorts last either way. Holes are not supported.
$rootPrototype(1).sort = function (comparator) {
  var length = this.length, items = [], n = 0, undefinedCount = 0, i = 0;
  while (i < length) {
    if (!(i in this)) throw new TypeError("sorting an array with holes is not supported");
    var item = this[i];
    if (item === undefined) undefinedCount = undefinedCount + 1;
    else { items[n] = item; n = n + 1; }
    i = i + 1;
  }
  var before = function (a, b) {
    if (comparator !== undefined) return comparator(a, b) <= 0;
    return !(("" + b) < ("" + a));
  };
  var scratch = [], width = 1;
  scratch.length = n;
  while (width < n) {
    var low = 0;
    while (low < n) {
      var mid = low + width < n ? low + width : n, high = low + 2 * width < n ? low + 2 * width : n;
      var left = low, right = mid, at = low;
      while (left < mid && right < high) {
        if (before(items[left], items[right])) { scratch[at] = items[left]; left = left + 1; }
        else { scratch[at] = items[right]; right = right + 1; }
        at = at + 1;
      }
      while (left < mid) { scratch[at] = items[left]; left = left + 1; at = at + 1; }
      while (right < high) { scratch[at] = items[right]; right = right + 1; at = at + 1; }
      low = low + 2 * width;
    }
    var swap = items;
    items = scratch;
    scratch = swap;
    width = width * 2;
  }
  i = 0;
  while (i < n) { this[i] = items[i]; i = i + 1; }
  while (i < length) { this[i] = undefined; i = i + 1; }
  return this;
};
