// Self-hosted built-ins.
//
// When a method of a modeled (static) array is called, the specializer runs
// the matching function below with the array as `this`, so a call over
// static data folds like user code: loops over a static length unroll and
// callbacks inline. Each follows the ECMAScript algorithm for an ordinary
// array, holes included: the methods the spec has skip a hole test `k in this`
// (HasProperty), the others read it as `undefined`. A method of a runtime
// array is not routed here: it stays the runtime's own method call.
//
// Names are `__pe_Array_<method>`; the specializer looks them up by name.
"use strict";

function __pe_callable(f, name) {
  if (typeof f !== "function") {
    throw new TypeError(String(f) + " is not a function");
  }
}

// A reference to a `let`, `const` or `class` binding before its declaration
// has run (its temporal dead zone): the ReferenceError it throws.
function __pe_tdz(name) {
  throw new ReferenceError("Cannot access '" + name + "' before initialization");
}

// The template object of the tagged template at `site` (GetTemplateObject,
// ECMA-262 13.2.8.4): its cooked strings, frozen, with the frozen raw
// strings as `raw`; made the first time the site is evaluated and the same
// object from then on.
function __pe_template(site, cooked, raw) {
  var sites = __pe_template.sites;
  if (sites === undefined) sites = __pe_template.sites = [];
  var made = sites[site];
  if (made === undefined) {
    Object.defineProperty(cooked, "raw", { value: Object.freeze(raw), writable: false, enumerable: false, configurable: false });
    made = sites[site] = Object.freeze(cooked);
  }
  return made;
}

function __pe_relative(rel, len, dflt) {
  if (rel === undefined) return dflt;
  var n = Math.trunc(+rel);
  if (n !== n) n = 0;
  if (n < 0) { n = len + n; return n < 0 ? 0 : n; }
  return n > len ? len : n;
}

function __pe_Array_map(callback, thisArg) {
  var len = this.length;
  __pe_callable(callback);
  var out = new Array(len);
  for (var k = 0; k < len; k++) if (k in this) out[k] = callback.call(thisArg, this[k], k, this);
  return out;
}

function __pe_Array_filter(callback, thisArg) {
  var len = this.length;
  __pe_callable(callback);
  var out = [];
  for (var k = 0; k < len; k++) {
    if (!(k in this)) continue;
    var v = this[k];
    if (callback.call(thisArg, v, k, this)) out.push(v);
  }
  return out;
}

function __pe_Array_forEach(callback, thisArg) {
  var len = this.length;
  __pe_callable(callback);
  for (var k = 0; k < len; k++) if (k in this) callback.call(thisArg, this[k], k, this);
  return undefined;
}

function __pe_Array_reduce(callback, initial) {
  var len = this.length;
  __pe_callable(callback);
  var k = 0;
  var acc;
  if (arguments.length >= 2) {
    acc = initial;
  } else {
    while (k < len && !(k in this)) k++;
    if (k >= len) throw new TypeError("Reduce of empty array with no initial value");
    acc = this[k];
    k++;
  }
  for (; k < len; k++) if (k in this) acc = callback(acc, this[k], k, this);
  return acc;
}

function __pe_Array_reduceRight(callback, initial) {
  var len = this.length;
  __pe_callable(callback);
  var k = len - 1;
  var acc;
  if (arguments.length >= 2) {
    acc = initial;
  } else {
    while (k >= 0 && !(k in this)) k--;
    if (k < 0) throw new TypeError("Reduce of empty array with no initial value");
    acc = this[k];
    k = k - 1;
  }
  for (; k >= 0; k--) if (k in this) acc = callback(acc, this[k], k, this);
  return acc;
}

function __pe_Array_some(callback, thisArg) {
  var len = this.length;
  __pe_callable(callback);
  for (var k = 0; k < len; k++) if (k in this && callback.call(thisArg, this[k], k, this)) return true;
  return false;
}

function __pe_Array_every(callback, thisArg) {
  var len = this.length;
  __pe_callable(callback);
  for (var k = 0; k < len; k++) if (k in this && !callback.call(thisArg, this[k], k, this)) return false;
  return true;
}

function __pe_Array_find(callback, thisArg) {
  var len = this.length;
  __pe_callable(callback);
  for (var k = 0; k < len; k++) {
    var v = this[k];
    if (callback.call(thisArg, v, k, this)) return v;
  }
  return undefined;
}

function __pe_Array_findIndex(callback, thisArg) {
  var len = this.length;
  __pe_callable(callback);
  for (var k = 0; k < len; k++) if (callback.call(thisArg, this[k], k, this)) return k;
  return -1;
}

function __pe_Array_findLast(callback, thisArg) {
  var len = this.length;
  __pe_callable(callback);
  for (var k = len - 1; k >= 0; k--) {
    var v = this[k];
    if (callback.call(thisArg, v, k, this)) return v;
  }
  return undefined;
}

function __pe_Array_findLastIndex(callback, thisArg) {
  var len = this.length;
  __pe_callable(callback);
  for (var k = len - 1; k >= 0; k--) if (callback.call(thisArg, this[k], k, this)) return k;
  return -1;
}

function __pe_Array_flatMap(callback, thisArg) {
  var len = this.length;
  __pe_callable(callback);
  var out = [];
  for (var k = 0; k < len; k++) {
    if (!(k in this)) continue;
    var r = callback.call(thisArg, this[k], k, this);
    if (Array.isArray(r)) {
      for (var j = 0; j < r.length; j++) out.push(r[j]);
    } else {
      out.push(r);
    }
  }
  return out;
}

function __pe_Array_join(separator) {
  var len = this.length;
  var sep = separator === undefined ? "," : String(separator);
  var r = "";
  for (var k = 0; k < len; k++) {
    if (k > 0) r = r + sep;
    var e = this[k];
    if (e !== undefined && e !== null) r = r + String(e);
  }
  return r;
}

function __pe_Array_toString() {
  return __pe_Array_join.call(this);
}

function __pe_Array_indexOf(search, fromIndex) {
  var len = this.length;
  var k = __pe_relative(fromIndex, len, 0);
  for (; k < len; k++) if (k in this && this[k] === search) return k;
  return -1;
}

function __pe_Array_lastIndexOf(search, fromIndex) {
  var len = this.length;
  var k = arguments.length > 1 ? Math.trunc(+fromIndex) : len - 1;
  if (k !== k) k = 0;
  if (k < 0) k = len + k;
  if (k >= len) k = len - 1;
  for (; k >= 0; k--) if (k in this && this[k] === search) return k;
  return -1;
}

function __pe_Array_includes(search, fromIndex) {
  var len = this.length;
  var k = __pe_relative(fromIndex, len, 0);
  for (; k < len; k++) {
    var e = this[k];
    // SameValueZero
    if (e === search || (e !== e && search !== search)) return true;
  }
  return false;
}

function __pe_Array_at(index) {
  var len = this.length;
  var k = Math.trunc(+index);
  if (k !== k) k = 0;
  if (k < 0) k = len + k;
  if (k < 0 || k >= len) return undefined;
  return this[k];
}

function __pe_Array_slice(start, end) {
  var len = this.length;
  var k = __pe_relative(start, len, 0);
  var fin = __pe_relative(end, len, len);
  var out = new Array(fin > k ? fin - k : 0);
  for (var n = 0; k < fin; k++, n++) if (k in this) out[n] = this[k];
  return out;
}

function __pe_Array_concat() {
  var total = this.length;
  for (var i = 0; i < arguments.length; i++) total += Array.isArray(arguments[i]) ? arguments[i].length : 1;
  var out = new Array(total);
  var n = 0;
  for (var j = 0; j < this.length; j++, n++) if (j in this) out[n] = this[j];
  for (var i = 0; i < arguments.length; i++) {
    var item = arguments[i];
    if (Array.isArray(item)) {
      for (var k = 0; k < item.length; k++, n++) if (k in item) out[n] = item[k];
    } else {
      out[n] = item;
      n++;
    }
  }
  return out;
}

function __pe_Array_reverse() {
  var len = this.length;
  var lower = 0;
  var upper = len - 1;
  while (lower < upper) {
    var lowerExists = lower in this;
    var upperExists = upper in this;
    var lowerValue = this[lower];
    var upperValue = this[upper];
    if (lowerExists && upperExists) {
      this[lower] = upperValue;
      this[upper] = lowerValue;
    } else if (upperExists) {
      this[lower] = upperValue;
      delete this[upper];
    } else if (lowerExists) {
      delete this[lower];
      this[upper] = lowerValue;
    }
    lower++;
    upper--;
  }
  return this;
}

function __pe_Array_fill(value, start, end) {
  var len = this.length;
  var k = __pe_relative(start, len, 0);
  var fin = __pe_relative(end, len, len);
  for (; k < fin; k++) this[k] = value;
  return this;
}

function __pe_Array_push() {
  for (var i = 0; i < arguments.length; i++) this[this.length] = arguments[i];
  return this.length;
}

function __pe_Array_unshift() {
  var n = arguments.length;
  var len = this.length;
  for (var k = len - 1; k >= 0; k--) {
    if (k in this) this[k + n] = this[k];
    else delete this[k + n];
  }
  for (var i = 0; i < n; i++) this[i] = arguments[i];
  return this.length;
}

function __pe_Array_flat(depth) {
  var d = depth === undefined ? 1 : Math.trunc(+depth);
  if (d !== d) d = 0;
  var out = [];
  __pe_flatten(out, this, d);
  return out;
}

function __pe_flatten(out, src, depth) {
  for (var k = 0; k < src.length; k++) {
    if (!(k in src)) continue;
    var e = src[k];
    if (depth > 0 && Array.isArray(e)) __pe_flatten(out, e, depth - 1);
    else out.push(e);
  }
}

// `sort` and `toSorted`: a stable merge sort. Without a comparator, elements
// compare as strings and `undefined` sorts last.
function __pe_sortCompare(comparefn, x, y) {
  if (x === undefined) return y === undefined ? 0 : 1;
  if (y === undefined) return -1;
  if (comparefn !== undefined) {
    var v = +comparefn(x, y);
    return v !== v ? 0 : v;
  }
  var xs = String(x);
  var ys = String(y);
  if (xs < ys) return -1;
  if (ys < xs) return 1;
  return 0;
}

// A stable merge sort, bottom up (no recursion: runs of 1, 2, 4, ...
// elements merged pairwise), so that it unfolds over a known array
// wherever it is called.
function __pe_mergeSort(items, comparefn) {
  var n = items.length;
  var a = items;
  for (var width = 1; width < n; width *= 2) {
    var b = [];
    for (var lo = 0; lo < n; lo += 2 * width) {
      var mid = lo + width < n ? lo + width : n;
      var hi = lo + 2 * width < n ? lo + 2 * width : n;
      var i = lo;
      var j = mid;
      while (i < mid && j < hi) {
        if (__pe_sortCompare(comparefn, a[j], a[i]) < 0) {
          b.push(a[j]);
          j++;
        } else {
          b.push(a[i]);
          i++;
        }
      }
      while (i < mid) { b.push(a[i]); i++; }
      while (j < hi) { b.push(a[j]); j++; }
    }
    a = b;
  }
  return a;
}

function __pe_Array_sort(comparefn) {
  if (comparefn !== undefined) __pe_callable(comparefn);
  var len = this.length;
  var items = [];
  for (var k = 0; k < len; k++) if (k in this) items.push(this[k]);
  var sorted = __pe_mergeSort(items, comparefn);
  for (var j = 0; j < sorted.length; j++) this[j] = sorted[j];
  // The holes end up at the end.
  for (var h = sorted.length; h < len; h++) delete this[h];
  return this;
}

function __pe_Array_toSorted(comparefn) {
  if (comparefn !== undefined) __pe_callable(comparefn);
  var items = [];
  for (var k = 0; k < this.length; k++) items.push(this[k]);
  return __pe_mergeSort(items, comparefn);
}

function __pe_Array_toReversed() {
  var out = [];
  for (var k = this.length - 1; k >= 0; k--) out.push(this[k]);
  return out;
}

function __pe_Map_forEach(callback, thisArg) {
  __pe_callable(callback);
  for (const [k, v] of this) callback.call(thisArg, v, k, this);
  return undefined;
}

function __pe_Set_forEach(callback, thisArg) {
  __pe_callable(callback);
  for (const v of this) callback.call(thisArg, v, v, this);
  return undefined;
}

// `str.replace(re, fn)` with a function replacement (RegExp.prototype
// [ @@replace ] for a modeled RegExp of standard behavior): the matches as
// `exec` finds them (all of them for a global pattern, an empty match
// advancing one position, or one code point under `u`/`v`), then each
// replaced by `fn`'s result for (match, ...captures, position, string,
// groups when named). On a string the specializer knows, each `exec` folds
// and each call of `fn` runs inline.
function __pe_regex_replace_fn(str, re, fn) {
  var global = re.global;
  var fullUnicode = re.unicode || re.unicodeSets;
  if (global) re.lastIndex = 0;
  var results = [];
  while (true) {
    var result = re.exec(str);
    if (result === null) break;
    results.push(result);
    if (!global) break;
    if (`${result[0]}` === "") re.lastIndex = __pe_advance_string_index(str, re.lastIndex, fullUnicode);
  }
  var acc = "";
  var next = 0;
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    var matched = `${r[0]}`;
    var position = r.index;
    if (position > str.length) position = str.length;
    if (position < 0) position = 0;
    var args = [matched];
    for (var n = 1; n < r.length; n++) args.push(r[n] === undefined ? undefined : `${r[n]}`);
    args.push(position, str);
    if (r.groups !== undefined) args.push(r.groups);
    var replacement = `${fn.apply(undefined, args)}`;
    if (position >= next) {
      acc = acc + str.slice(next, position) + replacement;
      next = position + matched.length;
    }
  }
  return next >= str.length ? acc : acc + str.slice(next);
}

// AdvanceStringIndex.
function __pe_advance_string_index(str, index, unicode) {
  if (!unicode || index + 1 >= str.length) return index + 1;
  var c = str.charCodeAt(index);
  if (c < 0xD800 || c > 0xDBFF) return index + 1;
  var d = str.charCodeAt(index + 1);
  return d < 0xDC00 || d > 0xDFFF ? index + 1 : index + 2;
}

// ---------------------------------------------------------------------------
// Self-hosted standard functions.
//
// `__pe_std_<Name>` (dots as underscores) is the specializer's model of the
// standard function `<Name>`: where a call of that function is not folded by
// a built-in model, this code runs in its place when doing so unfolds to
// straight-line code (on known arguments, typically to a constant), and the
// call stays the runtime's own otherwise. Each is written from the
// function's specification and is specialized like the program's code, so
// what it reads, calls and writes is exactly what its text says: a getter it
// reads runs, a `toJSON` it calls is inlined, an argument it only reads
// stays known.
//
// A case one does not cover gives up with `__pe_unmodeled()`, which leaves
// the call to the runtime (so an error's exact message is the runtime's).
// `__pe_slotKind(v)` tells what an object is without running code:
// "Array", "Object" (an ordinary object) or "Function"; for any other
// object (a wrapper, a collection, a proxy) it gives up too.
// ---------------------------------------------------------------------------

// JSON.stringify(value, replacer, space): ECMA-262 25.5.2.
function __pe_std_JSON_stringify(value, replacer, space) {
  var replacerFunction;
  var propertyList;
  if (typeof replacer === "function") {
    replacerFunction = replacer;
  } else if (typeof replacer === "object" && replacer !== null) {
    if (__pe_slotKind(replacer) === "Array") {
      propertyList = [];
      var count = replacer.length;
      for (var k = 0; k < count; k++) {
        var v = replacer[k];
        var item = undefined;
        if (typeof v === "string") item = v;
        else if (typeof v === "number") item = String(v);
        // (A String or Number object names a property too: those give up.)
        else if (typeof v === "object" && v !== null) __pe_slotKind(v);
        if (item !== undefined && propertyList.indexOf(item) < 0) propertyList.push(item);
      }
    }
  }
  var gap = "";
  // (A Number or String object is its value: those give up.)
  if (typeof space === "object" && space !== null) __pe_slotKind(space);
  if (typeof space === "number") {
    var width = Math.trunc(space);
    if (width !== width) width = 0;
    if (width > 10) width = 10;
    gap = width >= 1 ? " ".repeat(width) : "";
  } else if (typeof space === "string") {
    gap = space.length <= 10 ? space : space.slice(0, 10);
  }
  return __pe_json_property("", { "": value }, replacerFunction, propertyList, gap, "", []);
}

// SerializeJSONProperty, with SerializeJSONObject and SerializeJSONArray.
function __pe_json_property(key, holder, replacerFunction, propertyList, gap, indent, stack) {
  var value = holder[key];
  var t = typeof value;
  if ((t === "object" && value !== null) || t === "function" || t === "bigint") {
    var toJSON = value.toJSON;
    if (typeof toJSON === "function") value = toJSON.call(value, key);
  }
  if (replacerFunction !== undefined) value = replacerFunction.call(holder, key, value);
  if (value === null) return "null";
  if (value === true) return "true";
  if (value === false) return "false";
  t = typeof value;
  if (t === "string") return JSON.stringify(value);
  if (t === "number") return value - value === 0 ? String(value) : "null";
  // (A BigInt is a TypeError, as is a cycle: the runtime's, with its message.)
  if (t === "bigint") return __pe_unmodeled();
  if (t !== "object") return undefined;
  var kind = __pe_slotKind(value);
  if (stack.indexOf(value) >= 0) return __pe_unmodeled();
  stack.push(value);
  var stepback = indent;
  indent = indent + gap;
  var partial = [];
  var out;
  if (kind === "Array") {
    var len = value.length;
    for (var i = 0; i < len; i++) {
      var element = __pe_json_property(String(i), value, replacerFunction, propertyList, gap, indent, stack);
      partial.push(element === undefined ? "null" : element);
    }
    if (partial.length === 0) out = "[]";
    else if (gap === "") out = "[" + partial.join(",") + "]";
    else out = "[\n" + indent + partial.join(",\n" + indent) + "\n" + stepback + "]";
  } else {
    var keys = propertyList !== undefined ? propertyList : Object.keys(value);
    var separator = gap === "" ? ":" : ": ";
    for (var j = 0; j < keys.length; j++) {
      var p = keys[j];
      var member = __pe_json_property(p, value, replacerFunction, propertyList, gap, indent, stack);
      if (member !== undefined) partial.push(JSON.stringify(p) + separator + member);
    }
    if (partial.length === 0) out = "{}";
    else if (gap === "") out = "{" + partial.join(",") + "}";
    else out = "{\n" + indent + partial.join(",\n" + indent) + "\n" + stepback + "}";
  }
  stack.pop();
  return out;
}

// %TypedArray%.from(source, mapFn, thisArg) called as a method of a
// standard typed array constructor C: ECMA-262 23.2.2.1. An iterable's
// values are listed first (IteratorToList), an array-like's are read as they
// are stored; each is mapped, then stored (and so converted) in turn.
function __pe_typed_from(C, source, mapFn, thisArg) {
  var mapping = mapFn !== undefined;
  if (mapping && typeof mapFn !== "function") return __pe_unmodeled();
  if (source === undefined || source === null) return __pe_unmodeled();
  var usingIterator = source[Symbol.iterator];
  var values = source;
  if (usingIterator !== undefined && usingIterator !== null) {
    if (typeof usingIterator !== "function") return __pe_unmodeled();
    values = __pe_std_Array_from(source);
  }
  var len = Math.trunc(Number(values.length));
  if (len !== len || len < 0) len = 0;
  var target = new C(len);
  for (var k = 0; k < len; k++) {
    var kValue = values[k];
    target[k] = mapping ? mapFn.call(thisArg, kValue, k) : kValue;
  }
  return target;
}
function __pe_std_Int8Array_from(source, mapFn, thisArg) {
  return __pe_typed_from(Int8Array, source, mapFn, thisArg);
}
function __pe_std_Uint8Array_from(source, mapFn, thisArg) {
  return __pe_typed_from(Uint8Array, source, mapFn, thisArg);
}
function __pe_std_Uint8ClampedArray_from(source, mapFn, thisArg) {
  return __pe_typed_from(Uint8ClampedArray, source, mapFn, thisArg);
}
function __pe_std_Int16Array_from(source, mapFn, thisArg) {
  return __pe_typed_from(Int16Array, source, mapFn, thisArg);
}
function __pe_std_Uint16Array_from(source, mapFn, thisArg) {
  return __pe_typed_from(Uint16Array, source, mapFn, thisArg);
}
function __pe_std_Int32Array_from(source, mapFn, thisArg) {
  return __pe_typed_from(Int32Array, source, mapFn, thisArg);
}
function __pe_std_Uint32Array_from(source, mapFn, thisArg) {
  return __pe_typed_from(Uint32Array, source, mapFn, thisArg);
}
function __pe_std_Float32Array_from(source, mapFn, thisArg) {
  return __pe_typed_from(Float32Array, source, mapFn, thisArg);
}
function __pe_std_Float64Array_from(source, mapFn, thisArg) {
  return __pe_typed_from(Float64Array, source, mapFn, thisArg);
}

// Array.from(items, mapFn, thisArg) called as a method of %Array%:
// ECMA-262 23.1.2.1.
function __pe_std_Array_from(items, mapFn, thisArg) {
  var mapping = mapFn !== undefined;
  // (Not callable, or nothing to convert: TypeErrors, the runtime's.)
  if (mapping && typeof mapFn !== "function") return __pe_unmodeled();
  if (items === undefined || items === null) return __pe_unmodeled();
  var usingIterator = items[Symbol.iterator];
  var out = [];
  var k = 0;
  if (usingIterator !== undefined && usingIterator !== null) {
    if (typeof usingIterator !== "function") return __pe_unmodeled();
    var iterator = usingIterator.call(items);
    if ((typeof iterator !== "object" && typeof iterator !== "function") || iterator === null) return __pe_unmodeled();
    var next = iterator.next;
    while (true) {
      var result = next.call(iterator);
      if ((typeof result !== "object" && typeof result !== "function") || result === null) return __pe_unmodeled();
      if (result.done) return out;
      var value = result.value;
      if (mapping) {
        try {
          value = mapFn.call(thisArg, value, k);
        } catch (e) {
          // IteratorClose for a throw completion: `return` is called and
          // whatever it does or throws is dropped.
          try {
            var close = iterator.return;
            if (close !== undefined && close !== null) close.call(iterator);
          } catch (ignored) {}
          throw e;
        }
      }
      out[k] = value;
      k++;
    }
  }
  // An array-like: its `length` elements.
  var len = Math.trunc(Number(items.length));
  if (len !== len || len < 0) len = 0;
  if (len > 9007199254740991) len = 9007199254740991;
  for (; k < len; k++) {
    var element = items[k];
    out[k] = mapping ? mapFn.call(thisArg, element, k) : element;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Shared steps of the models below.
// ---------------------------------------------------------------------------

// ToNumber. (A Symbol or a BigInt is a TypeError: the runtime's.)
function __pe_toNumber(v) {
  var t = typeof v;
  if (t === "symbol" || t === "bigint") return __pe_unmodeled();
  return +v;
}

// ToIntegerOrInfinity.
function __pe_toInteger(v) {
  var n = __pe_toNumber(v);
  if (n !== n) return 0;
  return Math.trunc(n) + 0;
}

function __pe_isObject(v) {
  return (typeof v === "object" && v !== null) || typeof v === "function";
}

// ---------------------------------------------------------------------------
// Array.prototype methods of a modeled array (continued).
// ---------------------------------------------------------------------------

// Array.prototype.splice(start, deleteCount, ...items): ECMA-262 23.1.3.31.
// What it makes is an Array (the species of a modeled array is taken to be
// %Array%, as by the methods above). The specializer has no model of a write
// to an array's `length`, so the length is set by other steps that leave
// the same array: `pop` where it shrinks (of an index just deleted, and not
// inherited, so there is nothing for it to read), and a write and delete of
// the last index where it grows over a hole.
function __pe_Array_splice(start, deleteCount) {
  // (A frozen array: a TypeError, the runtime's.)
  if (Object.isFrozen(this)) return __pe_unmodeled();
  var len = this.length;
  var relativeStart = __pe_toInteger(start);
  var actualStart = relativeStart < 0 ? (len + relativeStart < 0 ? 0 : len + relativeStart) : (relativeStart > len ? len : relativeStart);
  var itemCount = arguments.length > 2 ? arguments.length - 2 : 0;
  var actualDeleteCount;
  if (arguments.length === 0) {
    actualDeleteCount = 0;
  } else if (arguments.length === 1) {
    actualDeleteCount = len - actualStart;
  } else {
    var dc = __pe_toInteger(deleteCount);
    actualDeleteCount = dc < 0 ? 0 : (dc > len - actualStart ? len - actualStart : dc);
  }
  var A = new Array(actualDeleteCount);
  var k;
  for (k = 0; k < actualDeleteCount; k++) {
    var from = actualStart + k;
    if (from in this) A[k] = this[from];
  }
  var to;
  if (itemCount < actualDeleteCount) {
    for (k = actualStart; k < len - actualDeleteCount; k++) {
      from = k + actualDeleteCount;
      to = k + itemCount;
      if (from in this) this[to] = this[from];
      else delete this[to];
    }
    for (k = len; k > len - actualDeleteCount + itemCount; k--) {
      delete this[k - 1];
      if ((k - 1) in this) return __pe_unmodeled();
      this.pop();
    }
  } else if (itemCount > actualDeleteCount) {
    for (k = len - actualDeleteCount; k > actualStart; k--) {
      from = k + actualDeleteCount - 1;
      to = k + itemCount - 1;
      if (from in this) this[to] = this[from];
      else delete this[to];
    }
  }
  for (k = 0; k < itemCount; k++) this[actualStart + k] = arguments[k + 2];
  var newLen = len - actualDeleteCount + itemCount;
  if (this.length < newLen) {
    if ((newLen - 1) in this) return __pe_unmodeled();
    this[newLen - 1] = undefined;
    delete this[newLen - 1];
  }
  if (this.length !== newLen) return __pe_unmodeled();
  return A;
}

// Array.prototype.toSpliced(start, skipCount, ...items): ECMA-262 23.1.3.35.
function __pe_Array_toSpliced(start, skipCount) {
  var len = this.length;
  var relativeStart = __pe_toInteger(start);
  var actualStart = relativeStart < 0 ? (len + relativeStart < 0 ? 0 : len + relativeStart) : (relativeStart > len ? len : relativeStart);
  var insertCount = arguments.length > 2 ? arguments.length - 2 : 0;
  var actualSkipCount;
  if (arguments.length === 0) {
    actualSkipCount = 0;
  } else if (arguments.length === 1) {
    actualSkipCount = len - actualStart;
  } else {
    var sc = __pe_toInteger(skipCount);
    actualSkipCount = sc < 0 ? 0 : (sc > len - actualStart ? len - actualStart : sc);
  }
  var newLen = len + insertCount - actualSkipCount;
  var A = new Array(newLen);
  var i = 0;
  var r = actualStart + actualSkipCount;
  for (; i < actualStart; i++) A[i] = this[i];
  for (var j = 0; j < insertCount; j++, i++) A[i] = arguments[j + 2];
  for (; i < newLen; i++, r++) A[i] = this[r];
  return A;
}

// Array.prototype.copyWithin(target, start, end): ECMA-262 23.1.3.4.
function __pe_Array_copyWithin(target, start, end) {
  var len = this.length;
  var relativeTarget = __pe_toInteger(target);
  var to = relativeTarget < 0 ? (len + relativeTarget < 0 ? 0 : len + relativeTarget) : (relativeTarget > len ? len : relativeTarget);
  var relativeStart = __pe_toInteger(start);
  var from = relativeStart < 0 ? (len + relativeStart < 0 ? 0 : len + relativeStart) : (relativeStart > len ? len : relativeStart);
  var relativeEnd = end === undefined ? len : __pe_toInteger(end);
  var fin = relativeEnd < 0 ? (len + relativeEnd < 0 ? 0 : len + relativeEnd) : (relativeEnd > len ? len : relativeEnd);
  var count = fin - from < len - to ? fin - from : len - to;
  if (count > 0) {
    var direction = 1;
    if (from < to && to < from + count) {
      direction = -1;
      from = from + count - 1;
      to = to + count - 1;
    }
    for (; count > 0; count--) {
      if (from in this) this[to] = this[from];
      else delete this[to];
      from = from + direction;
      to = to + direction;
    }
  }
  return this;
}

// Array.prototype.with(index, value): ECMA-262 23.1.3.39.
function __pe_Array_with(index, value) {
  var len = this.length;
  var relativeIndex = __pe_toInteger(index);
  var actualIndex = relativeIndex >= 0 ? relativeIndex : len + relativeIndex;
  // (Out of range: a RangeError, the runtime's.)
  if (actualIndex >= len || actualIndex < 0) return __pe_unmodeled();
  var A = new Array(len);
  for (var k = 0; k < len; k++) A[k] = k === actualIndex ? value : this[k];
  return A;
}

// ---------------------------------------------------------------------------
// Set.prototype methods over a set-like (ECMA-262 24.2.4): `this` is a
// modeled Set.
// ---------------------------------------------------------------------------

// GetSetRecord. (Each of its errors is the runtime's.)
function __pe_set_record(other) {
  if (!__pe_isObject(other)) return __pe_unmodeled();
  var rawSize = other.size;
  var numSize = __pe_toNumber(rawSize);
  if (numSize !== numSize) return __pe_unmodeled();
  var intSize = Math.trunc(numSize) + 0;
  if (intSize < 0) return __pe_unmodeled();
  var has = other.has;
  if (typeof has !== "function") return __pe_unmodeled();
  var keys = other.keys;
  if (typeof keys !== "function") return __pe_unmodeled();
  return { set: other, size: intSize, has: has, keys: keys };
}

// GetIteratorFromMethod(otherRec.[[SetObject]], otherRec.[[Keys]]).
function __pe_set_keys(rec) {
  var iterator = rec.keys.call(rec.set);
  if (!__pe_isObject(iterator)) return __pe_unmodeled();
  // (The specializer does not read `return` off a built-in iterator. The
  // ones the built-in `keys` of a Set or a Map make have none. Nor does it
  // compare a built-in function with a closure, hence the `instanceof`.)
  var builtin = false;
  if (rec.set instanceof Set) builtin = rec.keys === Set.prototype.keys;
  else if (rec.set instanceof Map) builtin = rec.keys === Map.prototype.keys;
  return { iterator: iterator, next: iterator.next, builtin: builtin };
}

// IteratorStep: the result object of one `next` call.
function __pe_set_step(iter) {
  var next = iter.next;
  if (typeof next !== "function") return __pe_unmodeled();
  var result = next.call(iter.iterator);
  if (!__pe_isObject(result)) return __pe_unmodeled();
  return result;
}

// IteratorClose with a normal completion.
function __pe_set_close(iter) {
  if (iter.builtin) return undefined;
  var close = iter.iterator.return;
  if (close === undefined || close === null) return undefined;
  if (typeof close !== "function") return __pe_unmodeled();
  var result = close.call(iter.iterator);
  if (!__pe_isObject(result)) return __pe_unmodeled();
  return undefined;
}

function __pe_Set_union(other) {
  var rec = __pe_set_record(other);
  var iter = __pe_set_keys(rec);
  var result = new Set();
  for (const e of this) result.add(e);
  while (true) {
    var step = __pe_set_step(iter);
    if (step.done) break;
    result.add(step.value);
  }
  return result;
}

function __pe_Set_intersection(other) {
  var rec = __pe_set_record(other);
  var result = new Set();
  if (this.size <= rec.size) {
    for (const e of this) {
      if (rec.has.call(rec.set, e)) result.add(e);
    }
  } else {
    var iter = __pe_set_keys(rec);
    while (true) {
      var step = __pe_set_step(iter);
      if (step.done) break;
      var next = step.value;
      if (this.has(next)) result.add(next);
    }
  }
  return result;
}

function __pe_Set_difference(other) {
  var rec = __pe_set_record(other);
  var result = new Set();
  if (this.size <= rec.size) {
    // The elements as they are now: what `has` does to this set afterwards
    // does not change which ones are asked about.
    var elements = [];
    for (const e of this) elements.push(e);
    for (var i = 0; i < elements.length; i++) {
      if (!rec.has.call(rec.set, elements[i])) result.add(elements[i]);
    }
  } else {
    for (const e of this) result.add(e);
    var iter = __pe_set_keys(rec);
    while (true) {
      var step = __pe_set_step(iter);
      if (step.done) break;
      result.delete(step.value);
    }
  }
  return result;
}

function __pe_Set_symmetricDifference(other) {
  var rec = __pe_set_record(other);
  var iter = __pe_set_keys(rec);
  var result = new Set();
  for (const e of this) result.add(e);
  while (true) {
    var step = __pe_set_step(iter);
    if (step.done) break;
    var next = step.value;
    if (this.has(next)) result.delete(next);
    else result.add(next);
  }
  return result;
}

function __pe_Set_isSubsetOf(other) {
  var rec = __pe_set_record(other);
  if (this.size > rec.size) return false;
  for (const e of this) {
    if (!rec.has.call(rec.set, e)) return false;
  }
  return true;
}

function __pe_Set_isSupersetOf(other) {
  var rec = __pe_set_record(other);
  if (this.size < rec.size) return false;
  var iter = __pe_set_keys(rec);
  while (true) {
    var step = __pe_set_step(iter);
    if (step.done) return true;
    if (!this.has(step.value)) {
      __pe_set_close(iter);
      return false;
    }
  }
}

function __pe_Set_isDisjointFrom(other) {
  var rec = __pe_set_record(other);
  if (this.size <= rec.size) {
    for (const e of this) {
      if (rec.has.call(rec.set, e)) return false;
    }
  } else {
    var iter = __pe_set_keys(rec);
    while (true) {
      var step = __pe_set_step(iter);
      if (step.done) break;
      if (this.has(step.value)) {
        __pe_set_close(iter);
        return false;
      }
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// URI handling functions: ECMA-262 19.2.6, and `escape` / `unescape` (B.2.1).
// Malformed input is a URIError: the runtime's.
// ---------------------------------------------------------------------------

function __pe_uri_hex2(n) {
  var digits = "0123456789ABCDEF";
  var low = n % 16;
  return digits.charAt((n - low) / 16) + digits.charAt(low);
}

// Encode(string, extraUnescaped): `unescaped` is the whole unescaped set.
function __pe_uri_encode(string, unescaped) {
  var len = string.length;
  var R = "";
  var k = 0;
  while (k < len) {
    var C = string.charCodeAt(k);
    if (C < 128 && unescaped.indexOf(String.fromCharCode(C)) >= 0) {
      R = R + String.fromCharCode(C);
      k = k + 1;
      continue;
    }
    var cp = C;
    if (C >= 0xDC00 && C <= 0xDFFF) return __pe_unmodeled();
    if (C >= 0xD800 && C <= 0xDBFF) {
      if (k + 1 >= len) return __pe_unmodeled();
      var D = string.charCodeAt(k + 1);
      if (D < 0xDC00 || D > 0xDFFF) return __pe_unmodeled();
      cp = (C - 0xD800) * 0x400 + (D - 0xDC00) + 0x10000;
      k = k + 1;
    }
    k = k + 1;
    if (cp < 0x80) {
      R = R + "%" + __pe_uri_hex2(cp);
    } else if (cp < 0x800) {
      var c2 = cp % 0x40;
      R = R + "%" + __pe_uri_hex2(0xC0 + (cp - c2) / 0x40) + "%" + __pe_uri_hex2(0x80 + c2);
    } else if (cp < 0x10000) {
      var d3 = cp % 0x40;
      var r3 = (cp - d3) / 0x40;
      var d2 = r3 % 0x40;
      R = R + "%" + __pe_uri_hex2(0xE0 + (r3 - d2) / 0x40) + "%" + __pe_uri_hex2(0x80 + d2) + "%" + __pe_uri_hex2(0x80 + d3);
    } else {
      var e4 = cp % 0x40;
      var q4 = (cp - e4) / 0x40;
      var e3 = q4 % 0x40;
      var q3 = (q4 - e3) / 0x40;
      var e2 = q3 % 0x40;
      R = R + "%" + __pe_uri_hex2(0xF0 + (q3 - e2) / 0x40) + "%" + __pe_uri_hex2(0x80 + e2) + "%" + __pe_uri_hex2(0x80 + e3) + "%" + __pe_uri_hex2(0x80 + e4);
    }
  }
  return R;
}

// The value of the hexadecimal digit with code unit `c`, or NaN for any
// other code unit (and for the NaN `charCodeAt` gives past the end).
function __pe_hex_value(c) {
  if (c >= 48 && c <= 57) return c - 48;
  if (c >= 65 && c <= 70) return c - 55;
  if (c >= 97 && c <= 102) return c - 87;
  return NaN;
}

// Decode(string, preserveEscapeSet).
function __pe_uri_decode(string, preserved) {
  var len = string.length;
  var R = "";
  var k = 0;
  // Code units other than `%` are copied in runs, so that a surrogate pair
  // is never taken apart.
  var runStart = 0;
  while (k < len) {
    if (string.charCodeAt(k) !== 37) {
      k = k + 1;
      continue;
    }
    R = R + string.slice(runStart, k);
    if (k + 3 > len) return __pe_unmodeled();
    var B = __pe_hex_value(string.charCodeAt(k + 1)) * 16 + __pe_hex_value(string.charCodeAt(k + 2));
    if (B !== B) return __pe_unmodeled();
    if (B < 0x80) {
      var asciiChar = String.fromCharCode(B);
      R = R + (preserved.indexOf(asciiChar) >= 0 ? string.slice(k, k + 3) : asciiChar);
      k = k + 3;
    } else {
      var n = B < 0xC0 ? 1 : B < 0xE0 ? 2 : B < 0xF0 ? 3 : B < 0xF8 ? 4 : 5;
      if (n === 1 || n > 4) return __pe_unmodeled();
      var V = n === 2 ? B - 0xC0 : n === 3 ? B - 0xE0 : B - 0xF0;
      k = k + 3;
      for (var j = 1; j < n; j++) {
        if (k + 3 > len) return __pe_unmodeled();
        if (string.charCodeAt(k) !== 37) return __pe_unmodeled();
        var cont = __pe_hex_value(string.charCodeAt(k + 1)) * 16 + __pe_hex_value(string.charCodeAt(k + 2));
        if (cont !== cont) return __pe_unmodeled();
        if (cont < 0x80 || cont > 0xBF) return __pe_unmodeled();
        V = V * 0x40 + (cont - 0x80);
        k = k + 3;
      }
      // A valid UTF-8 encoding: the shortest one, of a code point that is
      // not a surrogate.
      if (V < (n === 2 ? 0x80 : n === 3 ? 0x800 : 0x10000)) return __pe_unmodeled();
      if (V > 0x10FFFF) return __pe_unmodeled();
      if (V >= 0xD800 && V <= 0xDFFF) return __pe_unmodeled();
      R = R + (V < 0x10000 ? String.fromCharCode(V) : String.fromCodePoint(V));
    }
    runStart = k;
  }
  return R + string.slice(runStart, len);
}

function __pe_std_encodeURIComponent(uriComponent) {
  return __pe_uri_encode(`${uriComponent}`, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.!~*'()_");
}

function __pe_std_encodeURI(uri) {
  return __pe_uri_encode(`${uri}`, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.!~*'()_;/?:@&=+$,#");
}

function __pe_std_decodeURIComponent(encodedURIComponent) {
  return __pe_uri_decode(`${encodedURIComponent}`, "");
}

function __pe_std_decodeURI(encodedURI) {
  return __pe_uri_decode(`${encodedURI}`, ";/?:@&=+$,#");
}

function __pe_std_escape(string) {
  string = `${string}`;
  var len = string.length;
  var R = "";
  var unescaped = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@*_+-./";
  for (var k = 0; k < len; k++) {
    var C = string.charCodeAt(k);
    if (C < 128 && unescaped.indexOf(String.fromCharCode(C)) >= 0) {
      R = R + String.fromCharCode(C);
    } else if (C < 256) {
      R = R + "%" + __pe_uri_hex2(C);
    } else {
      var low = C % 256;
      R = R + "%u" + __pe_uri_hex2((C - low) / 256) + __pe_uri_hex2(low);
    }
  }
  return R;
}

function __pe_std_unescape(string) {
  string = `${string}`;
  var len = string.length;
  // The result's code units; an escape can make half of a surrogate pair.
  var units = [];
  var k = 0;
  while (k < len) {
    var C = string.charCodeAt(k);
    if (C === 37) {
      var n = NaN;
      var optionalAdvance = 0;
      if (k + 5 < len && string.charCodeAt(k + 1) === 117) {
        n = ((__pe_hex_value(string.charCodeAt(k + 2)) * 16 + __pe_hex_value(string.charCodeAt(k + 3))) * 16 + __pe_hex_value(string.charCodeAt(k + 4))) * 16 + __pe_hex_value(string.charCodeAt(k + 5));
        optionalAdvance = 5;
      } else if (k + 3 <= len) {
        n = __pe_hex_value(string.charCodeAt(k + 1)) * 16 + __pe_hex_value(string.charCodeAt(k + 2));
        optionalAdvance = 2;
      }
      if (n === n) {
        C = n;
        k = k + optionalAdvance;
      }
    }
    units[units.length] = C;
    k = k + 1;
  }
  var R = "";
  for (var i = 0; i < units.length; i++) {
    var u = units[i];
    if (u >= 0xD800 && u <= 0xDBFF) {
      // (A string with a surrogate that has no partner is not one the
      // specializer holds.)
      if (i + 1 >= units.length) return __pe_unmodeled();
      var w = units[i + 1];
      if (w < 0xDC00 || w > 0xDFFF) return __pe_unmodeled();
      R = R + String.fromCodePoint((u - 0xD800) * 0x400 + (w - 0xDC00) + 0x10000);
      i = i + 1;
    } else if (u >= 0xDC00 && u <= 0xDFFF) {
      return __pe_unmodeled();
    } else {
      R = R + String.fromCharCode(u);
    }
  }
  return R;
}

// ---------------------------------------------------------------------------
// Date.UTC(year, month, date, hours, minutes, seconds, ms): ECMA-262 21.4.3.4,
// with MakeDay, MakeTime, MakeDate and TimeClip (21.4.1). Covered: a year
// (after the months are carried into it) within the years a time value can
// name, and sums that are exact integers; beyond that the day number is each
// engine's own arithmetic, so the call is left alone.
// ---------------------------------------------------------------------------
function __pe_std_Date_UTC(year, month, date, hours, minutes, seconds, ms) {
  var argc = arguments.length;
  var y = __pe_toNumber(year);
  var m = argc > 1 ? __pe_toNumber(month) : 0;
  var dt = argc > 2 ? __pe_toNumber(date) : 1;
  var h = argc > 3 ? __pe_toNumber(hours) : 0;
  var min = argc > 4 ? __pe_toNumber(minutes) : 0;
  var s = argc > 5 ? __pe_toNumber(seconds) : 0;
  var milli = argc > 6 ? __pe_toNumber(ms) : 0;
  // (x - x is 0 exactly for a finite x.)
  if (y - y !== 0 || m - m !== 0 || dt - dt !== 0) return NaN;
  if (h - h !== 0 || min - min !== 0 || s - s !== 0 || milli - milli !== 0) return NaN;
  // MakeFullYear.
  var yi = Math.trunc(y);
  if (yi >= 0 && yi <= 99) yi = 1900 + yi;
  var mi = Math.trunc(m);
  if (yi < -1000000 || yi > 1000000 || mi < -10000000 || mi > 10000000) return __pe_unmodeled();
  // MakeDay.
  var carry = Math.floor(mi / 12);
  var ym = yi + carry;
  var mn = mi - carry * 12;
  if (ym < -271821 || ym > 275760) return __pe_unmodeled();
  var dayFromYear = 365 * (ym - 1970) + Math.floor((ym - 1969) / 4) - Math.floor((ym - 1901) / 100) + Math.floor((ym - 1601) / 400);
  var leap = ym % 4 === 0 && (ym % 100 !== 0 || ym % 400 === 0);
  var monthStart = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  var dayFromMonth = monthStart[mn] + (leap && mn >= 2 ? 1 : 0);
  var day = (dayFromYear + dayFromMonth - 1) + Math.trunc(dt);
  // MakeTime, MakeDate: only where every product and sum is an exact integer.
  var limit = 9007199254740992;
  var th = Math.trunc(h) * 3600000;
  var tm = Math.trunc(min) * 60000;
  var ts = Math.trunc(s) * 1000;
  var tms = Math.trunc(milli);
  if (Math.abs(th) >= limit || Math.abs(tm) >= limit || Math.abs(ts) >= limit || Math.abs(tms) >= limit) return __pe_unmodeled();
  var time = th + tm;
  if (Math.abs(time) >= limit) return __pe_unmodeled();
  time = time + ts;
  if (Math.abs(time) >= limit) return __pe_unmodeled();
  time = time + tms;
  if (Math.abs(time) >= limit) return __pe_unmodeled();
  if (Math.abs(day) >= limit) return __pe_unmodeled();
  var dayMs = day * 86400000;
  if (Math.abs(dayMs) >= limit) return __pe_unmodeled();
  var tv = dayMs + time;
  if (Math.abs(tv) >= limit) return __pe_unmodeled();
  // TimeClip.
  if (Math.abs(tv) > 8.64e15) return NaN;
  return tv + 0;
}

// ---------------------------------------------------------------------------
// Number.prototype.toFixed / toExponential / toPrecision / toString(radix),
// of a known primitive number as `this`: ECMA-262 21.1.3. The decimal digits
// come from the number's exact value (every double is a whole number over a
// power of two), held as a whole number in a string of decimal digits.
// ---------------------------------------------------------------------------

// A whole number as its decimal digits, times a factor of at most 2^28:
// seven digits at a time, from the low end.
function __pe_decimal_mul(digits, factor) {
  var out = "";
  var carry = 0;
  var end = digits.length;
  while (end > 0) {
    var start = end > 7 ? end - 7 : 0;
    var v = +digits.slice(start, end) * factor + carry;
    var low = v % 10000000;
    carry = (v - low) / 10000000;
    out = (start > 0 || carry > 0 ? `${low}`.padStart(7, "0") : `${low}`) + out;
    end = start;
  }
  return carry > 0 ? `${carry}` + out : out;
}

// The exact decimal expansion of a finite x > 0: { digits, point } with
// x = 0.DIGITS * 10^point, the first digit not a zero.
function __pe_exact_decimal(x) {
  // x = mantissa * 2^e, the mantissa a whole number below 2^53.
  var e = 0;
  while (x < 1048576 && x !== Math.floor(x)) { x = x * 4294967296; e = e - 32; }
  if (x !== Math.floor(x)) {
    // At least 2^20 now and not whole: whole within 32 doublings. (A
    // product here that reaches 2^53 is whole, and is still exact.)
    var y = x * 65536;
    if (y !== Math.floor(y)) { x = y; e = e - 16; }
    y = x * 256;
    if (y !== Math.floor(y)) { x = y; e = e - 8; }
    y = x * 16;
    if (y !== Math.floor(y)) { x = y; e = e - 4; }
    y = x * 4;
    if (y !== Math.floor(y)) { x = y; e = e - 2; }
    y = x * 2;
    if (y !== Math.floor(y)) { x = y; e = e - 1; }
    x = x * 2;
    e = e - 1;
  }
  while (x >= 38685626227668133590597632) { x = x / 4294967296; e = e + 32; }
  while (x >= 9007199254740992) { x = x / 2; e = e + 1; }
  // (A whole number below 2^53 prints as its digits.)
  var digits = `${x}`;
  var scale = 0;
  if (e > 0) {
    // Times 2^e.
    while (e >= 28) { digits = __pe_decimal_mul(digits, 268435456); e = e - 28; }
    var f2 = 1;
    for (; e > 0; e--) f2 = f2 * 2;
    digits = __pe_decimal_mul(digits, f2);
  } else if (e < 0) {
    // Over 2^-e: times 5^-e, over 10^-e.
    scale = -e;
    var n = scale;
    while (n >= 12) { digits = __pe_decimal_mul(digits, 244140625); n = n - 12; }
    var f5 = 1;
    for (; n > 0; n--) f5 = f5 * 5;
    digits = __pe_decimal_mul(digits, f5);
  }
  return { digits: digits, point: digits.length - scale };
}

// `digits` (an exact expansion) rounded to its first `n` digits, a half
// rounding up: { digits, carry }, where carry 1 means the rounding carried
// out of the first digit and the result is a 1 before `n` zeros' worth of
// places ("1" followed by n - 1 zeros, one place higher).
function __pe_round_digits(digits, n) {
  if (digits.length <= n) return { digits: digits + "0".repeat(n - digits.length), carry: 0 };
  var kept = digits.slice(0, n);
  if (digits.charCodeAt(n) < 53) return { digits: kept, carry: 0 };
  var i = n - 1;
  while (i >= 0 && kept.charCodeAt(i) === 57) i = i - 1;
  if (i < 0) return { digits: n > 0 ? "1" + "0".repeat(n - 1) : "", carry: 1 };
  return { digits: kept.slice(0, i) + String.fromCharCode(kept.charCodeAt(i) + 1) + "0".repeat(n - 1 - i), carry: 0 };
}

function __pe_std_Number_prototype_toFixed(fractionDigits) {
  if (typeof this !== "number") return __pe_unmodeled();
  var x = this;
  var f = __pe_toInteger(fractionDigits);
  // (Out of range: a RangeError, the runtime's.)
  if (f < 0 || f > 100) return __pe_unmodeled();
  if (x - x !== 0) return `${x}`;
  var s = "";
  if (x < 0) { s = "-"; x = -x; }
  var m;
  if (x >= 1e21) {
    m = `${x}`;
  } else {
    m = "0";
    // (Below 1e-110 it is zero to any hundred places.)
    if (x >= 1e-110) {
      var exact = __pe_exact_decimal(x);
      var keep = exact.point + f;
      if (keep >= 0) {
        var rounded = __pe_round_digits(exact.digits, keep);
        if (rounded.carry === 1) m = "1" + "0".repeat(keep);
        else if (keep > 0) m = rounded.digits;
      }
    }
    if (f !== 0) {
      var k = m.length;
      if (k <= f) {
        m = "0".repeat(f + 1 - k) + m;
        k = f + 1;
      }
      m = m.slice(0, k - f) + "." + m.slice(k - f);
    }
  }
  return s + m;
}

// The digits and exponent of ToString(x), x finite and above zero: the
// fewest digits that name x. { digits, point } as __pe_exact_decimal gives.
function __pe_shortest_decimal(x) {
  var text = `${x}`;
  var exponent = 0;
  var at = text.indexOf("e");
  if (at >= 0) {
    exponent = +text.slice(at + 1);
    text = text.slice(0, at);
  }
  var dot = text.indexOf(".");
  var whole = dot >= 0 ? text.slice(0, dot) : text;
  var digits = dot >= 0 ? whole + text.slice(dot + 1) : whole;
  var point = whole.length + exponent;
  var lead = 0;
  while (digits.charCodeAt(lead) === 48) lead = lead + 1;
  digits = digits.slice(lead);
  point = point - lead;
  var end = digits.length;
  while (end > 1 && digits.charCodeAt(end - 1) === 48) end = end - 1;
  return { digits: digits.slice(0, end), point: point };
}

function __pe_std_Number_prototype_toExponential(fractionDigits) {
  if (typeof this !== "number") return __pe_unmodeled();
  var x = this;
  var f = __pe_toInteger(fractionDigits);
  if (x - x !== 0) return `${x}`;
  if (f < 0 || f > 100) return __pe_unmodeled();
  var s = "";
  if (x < 0) { s = "-"; x = -x; }
  var m;
  var e;
  if (x === 0) {
    m = "0".repeat(f + 1);
    e = 0;
  } else if (fractionDigits !== undefined) {
    var exact = __pe_exact_decimal(x);
    var rounded = __pe_round_digits(exact.digits, f + 1);
    m = rounded.digits;
    e = exact.point - 1 + rounded.carry;
  } else {
    var shortest = __pe_shortest_decimal(x);
    m = shortest.digits;
    e = shortest.point - 1;
    f = m.length - 1;
  }
  if (f !== 0) m = m.slice(0, 1) + "." + m.slice(1);
  var c = "+";
  var d = "0";
  if (e !== 0) {
    if (e < 0) { c = "-"; e = -e; }
    d = `${e}`;
  }
  return s + m + "e" + c + d;
}

function __pe_std_Number_prototype_toPrecision(precision) {
  if (typeof this !== "number") return __pe_unmodeled();
  var x = this;
  if (precision === undefined) return `${x}`;
  var p = __pe_toInteger(precision);
  if (x - x !== 0) return `${x}`;
  if (p < 1 || p > 100) return __pe_unmodeled();
  var s = "";
  if (x < 0) { s = "-"; x = -x; }
  var m;
  var e;
  if (x === 0) {
    m = "0".repeat(p);
    e = 0;
  } else {
    var exact = __pe_exact_decimal(x);
    var rounded = __pe_round_digits(exact.digits, p);
    m = rounded.digits;
    e = exact.point - 1 + rounded.carry;
    if (e < -6 || e >= p) {
      if (p !== 1) m = m.slice(0, 1) + "." + m.slice(1);
      var c = "+";
      if (e < 0) { c = "-"; e = -e; }
      return s + m + "e" + c + `${e}`;
    }
  }
  if (e === p - 1) return s + m;
  if (e >= 0) return s + m.slice(0, e + 1) + "." + m.slice(e + 1);
  return s + "0." + "0".repeat(-(e + 1)) + m;
}

// Number.prototype.toString(radix). The digits of a radix other than ten
// are "implementation-approximated" in the specification; these are V8's
// (DoubleToRadixCString), which for a radix that is a power of two are the
// number's exact digits.
function __pe_std_Number_prototype_toString(radix) {
  if (typeof this !== "number") return __pe_unmodeled();
  var value = this;
  var r = radix === undefined ? 10 : __pe_toInteger(radix);
  if (r < 2 || r > 36) return __pe_unmodeled();
  if (r === 10 || value - value !== 0) return `${value}`;
  if (value === 0) return "0";
  var chars = "0123456789abcdefghijklmnopqrstuvwxyz";
  var negative = value < 0;
  if (negative) value = -value;
  var integer = Math.floor(value);
  var fraction = value - integer;
  // The digits after the point.
  var digits = "";
  if (fraction !== 0) {
    // Half the distance to the next double up (value is below 2^52 here).
    var p = 1;
    while (p / 4294967296 > value) p = p / 4294967296;
    while (p > value) p = p / 2;
    while (p * 4294967296 <= value) p = p * 4294967296;
    while (p * 2 <= value) p = p * 2;
    var ulp = p * 2.220446049250313e-16;
    if (ulp < 5e-324) ulp = 5e-324;
    var delta = 0.5 * ulp;
    if (delta < 5e-324) delta = 5e-324;
    if (fraction >= delta) {
      do {
        fraction = fraction * r;
        delta = delta * r;
        var digit = Math.trunc(fraction);
        digits = digits + chars.charAt(digit);
        fraction = fraction - digit;
        if (fraction > 0.5 || (fraction === 0.5 && digit % 2 === 1)) {
          if (fraction + delta > 1) {
            // Round up, carrying through the digits written.
            while (true) {
              if (digits.length === 0) {
                integer = integer + 1;
                break;
              }
              var last = chars.indexOf(digits.charAt(digits.length - 1));
              digits = digits.slice(0, digits.length - 1);
              if (last + 1 < r) {
                digits = digits + chars.charAt(last + 1);
                break;
              }
            }
            break;
          }
        }
      } while (fraction >= delta);
    }
  }
  var text = "";
  while (integer / r >= 9007199254740992) {
    integer = integer / r;
    text = "0" + text;
  }
  do {
    var remainder = integer % r;
    text = chars.charAt(Math.trunc(remainder)) + text;
    integer = (integer - remainder) / r;
  } while (integer > 0);
  if (digits.length > 0) text = text + "." + digits;
  return negative ? "-" + text : text;
}

// ---------------------------------------------------------------------------
// Object, Map and Array constructors' functions.
// ---------------------------------------------------------------------------

// ToPropertyKey of a primitive. (An object's is its ToPrimitive, which may
// be a Symbol: not covered.)
function __pe_property_key(key) {
  if (typeof key === "symbol") return key;
  if (__pe_isObject(key)) return __pe_unmodeled();
  return `${key}`;
}

// Object.fromEntries(iterable): ECMA-262 20.1.2.7.
function __pe_std_Object_fromEntries(iterable) {
  if (iterable === undefined || iterable === null) return __pe_unmodeled();
  var obj = {};
  for (const entry of iterable) {
    if (!__pe_isObject(entry)) return __pe_unmodeled();
    var k = entry[0];
    var v = entry[1];
    var key = __pe_property_key(k);
    // (An own property named "__proto__" is not what an assignment makes.)
    if (key === "__proto__") return __pe_unmodeled();
    obj[key] = v;
  }
  return obj;
}

// Object.groupBy(items, callback): ECMA-262 20.1.2.13.
function __pe_std_Object_groupBy(items, callback) {
  if (items === undefined || items === null) return __pe_unmodeled();
  if (typeof callback !== "function") return __pe_unmodeled();
  var keys = [];
  var groups = [];
  var k = 0;
  for (const value of items) {
    var key = __pe_property_key(callback(value, k));
    var at = keys.indexOf(key);
    if (at < 0) {
      keys[keys.length] = key;
      groups[groups.length] = [value];
    } else {
      var group = groups[at];
      group[group.length] = value;
    }
    k = k + 1;
  }
  var obj = Object.create(null);
  for (var i = 0; i < keys.length; i++) obj[keys[i]] = groups[i];
  return obj;
}

// Map.groupBy(items, callback): ECMA-262 24.1.2.1.
function __pe_std_Map_groupBy(items, callback) {
  if (items === undefined || items === null) return __pe_unmodeled();
  if (typeof callback !== "function") return __pe_unmodeled();
  var map = new Map();
  var k = 0;
  for (const value of items) {
    var key = callback(value, k);
    var group = map.get(key);
    if (group === undefined) map.set(key, [value]);
    else group[group.length] = value;
    k = k + 1;
  }
  return map;
}

// Array.of(...items) called as a method of %Array%: ECMA-262 23.1.2.3.
function __pe_std_Array_of() {
  var len = arguments.length;
  var A = new Array(len);
  for (var k = 0; k < len; k++) A[k] = arguments[k];
  return A;
}

// Object.hasOwn(O, P) of an array, an ordinary object or a function:
// ECMA-262 20.1.2.14.
function __pe_std_Object_hasOwn(O, P) {
  if (!__pe_isObject(O)) return __pe_unmodeled();
  __pe_slotKind(O);
  return Object.prototype.hasOwnProperty.call(O, P);
}

// ---------------------------------------------------------------------------
// Property descriptors: Object.defineProperties, Object.create with
// properties, and Reflect's functions of an object's properties.
// ---------------------------------------------------------------------------

// ToPropertyDescriptor (ECMA-262 6.2.6.5), as a descriptor object of its own:
// the fields read once, in the specification's order.
function __pe_to_property_descriptor(Obj) {
  if (!__pe_isObject(Obj)) return __pe_unmodeled();
  var desc = {};
  if ("enumerable" in Obj) desc.enumerable = !!Obj.enumerable;
  if ("configurable" in Obj) desc.configurable = !!Obj.configurable;
  if ("value" in Obj) desc.value = Obj.value;
  if ("writable" in Obj) desc.writable = !!Obj.writable;
  if ("get" in Obj) desc.get = Obj.get;
  if ("set" in Obj) desc.set = Obj.set;
  return desc;
}

// ObjectDefineProperties (ECMA-262 20.1.2.3.1): every descriptor is read
// before any property is defined.
function __pe_define_properties(O, Properties) {
  if (!__pe_isObject(Properties)) return __pe_unmodeled();
  var keys = Reflect.ownKeys(Properties);
  var names = [];
  var descs = [];
  for (var i = 0; i < keys.length; i++) {
    var own = Object.getOwnPropertyDescriptor(Properties, keys[i]);
    if (own !== undefined && own.enumerable) {
      names.push(keys[i]);
      descs.push(__pe_to_property_descriptor(Properties[keys[i]]));
    }
  }
  for (var j = 0; j < names.length; j++) Object.defineProperty(O, names[j], descs[j]);
  return O;
}

// Object.defineProperties(O, Properties): ECMA-262 20.1.2.3.
function __pe_std_Object_defineProperties(O, Properties) {
  if (!__pe_isObject(O)) return __pe_unmodeled();
  return __pe_define_properties(O, Properties);
}

// Object.create(O, Properties): ECMA-262 20.1.2.2.
function __pe_std_Object_create(O, Properties) {
  if (O !== null && !__pe_isObject(O)) return __pe_unmodeled();
  var obj = Object.create(O);
  if (Properties === undefined) return obj;
  return __pe_define_properties(obj, Properties);
}

// Reflect.get(target, propertyKey [, receiver]): ECMA-262 28.1.5. (With a
// receiver that is not the target, a getter's `this` is another object.)
function __pe_std_Reflect_get(target, propertyKey, receiver) {
  if (!__pe_isObject(target)) return __pe_unmodeled();
  if (arguments.length > 2 && receiver !== target) return __pe_unmodeled();
  return target[propertyKey];
}

// Reflect.has(target, propertyKey): ECMA-262 28.1.8.
function __pe_std_Reflect_has(target, propertyKey) {
  if (!__pe_isObject(target)) return __pe_unmodeled();
  return propertyKey in target;
}

// Reflect.getPrototypeOf(target): ECMA-262 28.1.7.
function __pe_std_Reflect_getPrototypeOf(target) {
  if (!__pe_isObject(target)) return __pe_unmodeled();
  return Object.getPrototypeOf(target);
}

// Reflect.isExtensible(target): ECMA-262 28.1.9.
function __pe_std_Reflect_isExtensible(target) {
  if (!__pe_isObject(target)) return __pe_unmodeled();
  return Object.isExtensible(target);
}

// Reflect.getOwnPropertyDescriptor(target, propertyKey): ECMA-262 28.1.6.
function __pe_std_Reflect_getOwnPropertyDescriptor(target, propertyKey) {
  if (!__pe_isObject(target)) return __pe_unmodeled();
  return Object.getOwnPropertyDescriptor(target, propertyKey);
}

// Reflect.deleteProperty(target, propertyKey): ECMA-262 28.1.4. Whether the
// property is gone, where a `delete` in this (strict) code would throw.
function __pe_std_Reflect_deleteProperty(target, propertyKey) {
  if (!__pe_isObject(target) || Array.isArray(target)) return __pe_unmodeled();
  var key = __pe_property_key(propertyKey);
  var own = Object.getOwnPropertyDescriptor(target, key);
  if (own === undefined) return true;
  if (!own.configurable) return false;
  return delete target[key];
}

// Reflect.set(target, propertyKey, V [, receiver]): ECMA-262 28.1.12, an
// ordinary object's [[Set]] (10.1.9) with the target as the receiver:
// whether the value was set, where an assignment in this (strict) code
// would throw.
function __pe_std_Reflect_set(target, propertyKey, V, receiver) {
  if (!__pe_isObject(target) || Array.isArray(target)) return __pe_unmodeled();
  if (arguments.length > 3 && receiver !== target) return __pe_unmodeled();
  var key = __pe_property_key(propertyKey);
  // (No such property, its own or inherited: the target gets one.)
  if (!(key in target)) {
    if (!Object.isExtensible(target)) return false;
    target[key] = V;
    return true;
  }
  var holder = target;
  while (holder !== null) {
    var own = Object.getOwnPropertyDescriptor(holder, key);
    if (own !== undefined) {
      if ("value" in own) {
        if (!own.writable) return false;
        if (holder === target) {
          target[key] = V;
          return true;
        }
        // (An inherited writable data property: the target gets its own.)
        break;
      }
      if (own.set === undefined) return false;
      own.set.call(target, V);
      return true;
    }
    holder = Object.getPrototypeOf(holder);
  }
  if (!Object.isExtensible(target)) return false;
  target[key] = V;
  return true;
}

// Reflect.defineProperty(target, propertyKey, attributes): ECMA-262 28.1.3.
// Whether the property was defined: a new one of an extensible object, or
// any change of a configurable one. (A change of a non-configurable one
// succeeds only when it changes nothing it may not: not decided here.)
function __pe_std_Reflect_defineProperty(target, propertyKey, attributes) {
  if (!__pe_isObject(target) || Array.isArray(target)) return __pe_unmodeled();
  var key = __pe_property_key(propertyKey);
  var desc = __pe_to_property_descriptor(attributes);
  var own = Object.getOwnPropertyDescriptor(target, key);
  if (own === undefined) {
    if (!Object.isExtensible(target)) return false;
  } else if (!own.configurable) {
    return __pe_unmodeled();
  }
  Object.defineProperty(target, key, desc);
  return true;
}

// String.raw(template, ...substitutions): ECMA-262 22.1.2.4.
function __pe_std_String_raw(template) {
  if (template === undefined || template === null) return __pe_unmodeled();
  var raw = template.raw;
  if (raw === undefined || raw === null) return __pe_unmodeled();
  var len = raw.length;
  if (typeof len !== "number" || !(len >= 0) || len !== Math.floor(len)) return __pe_unmodeled();
  var result = "";
  for (var i = 0; i < len; i++) {
    result += `${raw[i]}`;
    if (i + 1 < len && i + 1 < arguments.length) result += `${arguments[i + 1]}`;
  }
  return result;
}

// String.prototype.isWellFormed() and toWellFormed(), of a known primitive
// string as `this`: ECMA-262 22.1.3.10 and 22.1.3.31.
function __pe_std_String_prototype_isWellFormed() {
  if (typeof this !== "string") return __pe_unmodeled();
  var len = this.length;
  for (var k = 0; k < len; k++) {
    var c = this.charCodeAt(k);
    if (c >= 0xDC00 && c <= 0xDFFF) return false;
    if (c >= 0xD800 && c <= 0xDBFF) {
      if (k + 1 >= len) return false;
      var d = this.charCodeAt(k + 1);
      if (d < 0xDC00 || d > 0xDFFF) return false;
      k = k + 1;
    }
  }
  return true;
}

function __pe_std_String_prototype_toWellFormed() {
  if (typeof this !== "string") return __pe_unmodeled();
  var len = this.length;
  var R = "";
  var runStart = 0;
  for (var k = 0; k < len; k++) {
    var c = this.charCodeAt(k);
    var lone = c >= 0xDC00 && c <= 0xDFFF;
    if (c >= 0xD800 && c <= 0xDBFF) {
      var d = k + 1 < len ? this.charCodeAt(k + 1) : 0;
      if (d >= 0xDC00 && d <= 0xDFFF) k = k + 1;
      else lone = true;
    }
    if (lone) {
      R = R + this.slice(runStart, k) + "\uFFFD";
      runStart = k + 1;
    }
  }
  return R + this.slice(runStart, len);
}

// Array(...values) called as a function: ECMA-262 23.1.1.1.
function __pe_std_Array() {
  var count = arguments.length;
  if (count === 0) return [];
  if (count === 1) {
    var len = arguments[0];
    if (typeof len !== "number") return [len];
    // (Not a whole number below 2^32: a RangeError, the runtime's.)
    if (len < 0 || len > 4294967295 || len !== Math.floor(len)) return __pe_unmodeled();
    return new Array(len);
  }
  var A = new Array(count);
  for (var k = 0; k < count; k++) A[k] = arguments[k];
  return A;
}

// String.prototype.toUpperCase() and toLowerCase() of a known primitive
// string as `this` (ECMA-262 22.1.3.28, 22.1.3.30), for a string of code
// units up to U+00FF: there the Unicode case mappings are these few rules,
// none depending on context. Any other character leaves the call alone.
function __pe_std_String_prototype_toUpperCase() {
  if (typeof this !== "string") return __pe_unmodeled();
  var len = this.length;
  var R = "";
  for (var k = 0; k < len; k++) {
    var c = this.charCodeAt(k);
    if (c > 0xFF) return __pe_unmodeled();
    if (c === 0xDF) {
      // (Sharp s.)
      R = R + "SS";
      continue;
    }
    if (c >= 0x61 && c <= 0x7A) c = c - 0x20;
    else if (c === 0xB5) c = 0x39C;
    else if (c >= 0xE0 && c <= 0xFE && c !== 0xF7) c = c - 0x20;
    else if (c === 0xFF) c = 0x178;
    R = R + String.fromCharCode(c);
  }
  return R;
}

function __pe_std_String_prototype_toLowerCase() {
  if (typeof this !== "string") return __pe_unmodeled();
  var len = this.length;
  var R = "";
  for (var k = 0; k < len; k++) {
    var c = this.charCodeAt(k);
    if (c > 0xFF) return __pe_unmodeled();
    if (c >= 0x41 && c <= 0x5A) c = c + 0x20;
    else if (c >= 0xC0 && c <= 0xDE && c !== 0xD7) c = c + 0x20;
    R = R + String.fromCharCode(c);
  }
  return R;
}

// ---------------------------------------------------------------------------
// Operators over a known object whose conversion runs the program's code.
// ---------------------------------------------------------------------------

// ToPrimitive(v, hint) (ECMA-262 7.1.1): `@@toPrimitive`, else `valueOf` and
// `toString` in the hint's order. A conversion that throws (no primitive
// comes of it) is the runtime's.
function __pe_to_primitive(v, hint) {
  var t = typeof v;
  if ((t !== "object" && t !== "function") || v === null) return v;
  var exotic = v[Symbol.toPrimitive];
  if (exotic !== undefined && exotic !== null) {
    if (typeof exotic !== "function") return __pe_unmodeled();
    var r = exotic.call(v, hint);
    var rt = typeof r;
    if ((rt !== "object" && rt !== "function") || r === null) return r;
    return __pe_unmodeled();
  }
  var first = hint === "string" ? "toString" : "valueOf";
  var second = hint === "string" ? "valueOf" : "toString";
  var m = v[first];
  if (typeof m === "function") {
    var r1 = m.call(v);
    var t1 = typeof r1;
    if ((t1 !== "object" && t1 !== "function") || r1 === null) return r1;
  }
  m = v[second];
  if (typeof m === "function") {
    var r2 = m.call(v);
    var t2 = typeof r2;
    if ((t2 !== "object" && t2 !== "function") || r2 === null) return r2;
  }
  return __pe_unmodeled();
}

// The operator `op` (its token; `u`-prefixed when unary) over operands of
// which one is such an object: each converted as the operator converts it,
// left to right, then the operator on the primitives.
function __pe_convert_op(op, a, b) {
  switch (op) {
    case "+": {
      var pa = __pe_to_primitive(a, "default");
      var pb = __pe_to_primitive(b, "default");
      return pa + pb;
    }
    case "==":
    case "!=": {
      var ao = (typeof a === "object" && a !== null) || typeof a === "function";
      var bo = (typeof b === "object" && b !== null) || typeof b === "function";
      var eq;
      if (ao && bo) eq = a === b;
      else if (ao) eq = b === null || b === undefined ? false : __pe_to_primitive(a, "default") == b;
      else if (bo) eq = a === null || a === undefined ? false : a == __pe_to_primitive(b, "default");
      else eq = a == b;
      return op === "==" ? eq : !eq;
    }
    case "in":
      return __pe_to_primitive(a, "string") in b;
    case "u`${}`":
      return `${__pe_to_primitive(a, "string")}`;
    case "u-":
      return -__pe_to_primitive(a, "number");
    case "u~":
      return ~__pe_to_primitive(a, "number");
    case "utonumeric": {
      var n = __pe_to_primitive(a, "number");
      return typeof n === "bigint" ? n : +n;
    }
  }
  // An arithmetic, bitwise or relational operator: each operand's number
  // (the left one's, wholly, before the right one is converted).
  var x = __pe_to_primitive(a, "number");
  if (typeof x === "symbol") return __pe_unmodeled();
  var y = __pe_to_primitive(b, "number");
  switch (op) {
    case "-": return x - y;
    case "*": return x * y;
    case "/": return x / y;
    case "%": return x % y;
    case "**": return x ** y;
    case "<": return x < y;
    case "<=": return x <= y;
    case ">": return x > y;
    case ">=": return x >= y;
    case "&": return x & y;
    case "|": return x | y;
    case "^": return x ^ y;
    case "<<": return x << y;
    case ">>": return x >> y;
    case ">>>": return x >>> y;
  }
  return __pe_unmodeled();
}

// String(value) called as a function (ECMA-262 22.1.1.1), where the
// built-in model does not answer: of an object, its string by ToPrimitive.
function __pe_std_String(value) {
  if (arguments.length === 0) return "";
  // (A symbol's descriptive string is the runtime's.)
  if (typeof value === "symbol") return __pe_unmodeled();
  return `${value}`;
}

// Number(value) called as a function (ECMA-262 21.1.1.1), likewise.
function __pe_std_Number(value) {
  if (arguments.length === 0) return 0;
  var t = typeof value;
  if (t === "bigint" || t === "symbol") return __pe_unmodeled();
  if ((t === "object" && value !== null) || t === "function") {
    var prim = __pe_to_primitive(value, "number");
    if (typeof prim === "bigint" || typeof prim === "symbol") return __pe_unmodeled();
    return +prim;
  }
  return +value;
}
