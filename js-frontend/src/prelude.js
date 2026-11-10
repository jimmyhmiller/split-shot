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

function __pe_mergeSort(items, comparefn) {
  if (items.length <= 1) return items;
  var mid = Math.floor(items.length / 2);
  var left = __pe_mergeSort(items.slice(0, mid), comparefn);
  var right = __pe_mergeSort(items.slice(mid), comparefn);
  var out = [];
  var i = 0;
  var j = 0;
  while (i < left.length && j < right.length) {
    if (__pe_sortCompare(comparefn, right[j], left[i]) < 0) {
      out.push(right[j]);
      j++;
    } else {
      out.push(left[i]);
      i++;
    }
  }
  while (i < left.length) { out.push(left[i]); i++; }
  while (j < right.length) { out.push(right[j]); j++; }
  return out;
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
