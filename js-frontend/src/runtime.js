// Runtime helpers a residual program may use. Codegen prepends each helper
// the residual calls (and only those): a helper runs from its
// `// helper: <name>` line to the next one.

// helper: __pe_forInKeys
// The keys a `for..in` over `o` visits, snapshotted when the loop starts.
function __pe_forInKeys(o) {
  const keys = [];
  for (const k in o) keys.push(k);
  return keys;
}

// helper: __pe_privateMap
// The store of a class's private field: its values by instance.
function __pe_privateMap() {
  return new WeakMap();
}

// helper: __pe_privateSet
// The brand of a class's private methods: the objects that have them.
function __pe_privateSet() {
  return new WeakSet();
}

// helper: __pe_superGet
// `super[k]` in a method whose home object is `home`: `k` read from its
// prototype with `recv` (the method's `this`) as the receiver.
function __pe_superGet(home, k, recv) {
  return Reflect.get(Object.getPrototypeOf(home), k, recv);
}

// helper: __pe_args
// A fresh (sloppy) arguments object of the arguments given.
function __pe_args() {
  return arguments;
}

// helper: __pe_strictArgs
// A fresh strict arguments object of the arguments given.
function __pe_strictArgs() {
  "use strict";
  return arguments;
}

// helper: __pe_strictSet
// `o[k] = v` as strict code does it (inlined into a sloppy residual
// function): a write that fails throws.
function __pe_strictSet(o, k, v) {
  "use strict";
  o[k] = v;
}

// helper: __pe_sloppySet
// `o[k] = v` as sloppy code does it (inlined into a strict residual
// function): a write that fails is ignored. (A function made by `Function`
// is sloppy code wherever it is made.)
var __pe_sloppySet = Function("o", "k", "v", "o[k] = v;");

// helper: __pe_strictDelete
// `delete o[k]` as strict code does it: deleting a non-configurable
// property throws.
function __pe_strictDelete(o, k) {
  "use strict";
  return delete o[k];
}

// helper: __pe_sloppyDelete
// `delete o[k]` as sloppy code does it.
var __pe_sloppyDelete = Function("o", "k", "return delete o[k];");

// helper: __pe_strictSetGlobal
// `name = v` as strict code does it: assigning an undeclared global throws.
// (The name is resolved from the global scope: a direct eval in a function
// of these parameters only.)
function __pe_strictSetGlobal(__pe_n, __pe_v) {
  "use strict";
  eval(__pe_n + " = __pe_v");
}

// helper: __pe_sloppySetGlobal
// `name = v` as sloppy code does it: an undeclared global is created.
var __pe_sloppySetGlobal = Function("__pe_n", "__pe_v", "eval(__pe_n + ' = __pe_v');");

// helper: __pe_inc
// `++` of a value that may be a BigInt.
function __pe_inc(v) {
  return ++v;
}

// helper: __pe_dec
// `--` of a value that may be a BigInt.
function __pe_dec(v) {
  return --v;
}

// helper: __pe_asyncIter
// GetIterator(o, async): `o`'s async iterator, or its sync iterator wrapped
// as one (CreateAsyncFromSyncIterator: each step's value awaited, a
// rejection or an abrupt step a rejected promise).
function __pe_asyncIter(o) {
  const method = o[Symbol.asyncIterator];
  if (method != null) return method.call(o);
  const it = o[Symbol.iterator]();
  const next = it.next;
  const settle = (step) => {
    try {
      const r = step();
      if (Object(r) !== r) throw new TypeError("Iterator result " + String(r) + " is not an object");
      const done = !!r.done;
      return Promise.resolve(r.value).then((value) => ({ value, done }));
    } catch (e) {
      return Promise.reject(e);
    }
  };
  return {
    next(v) {
      return settle(() => next.call(it, v));
    },
    return(v) {
      const f = it.return;
      return f == null ? Promise.resolve({ value: v, done: true }) : settle(() => f.call(it, v));
    },
    throw(v) {
      const f = it.throw;
      return f == null ? Promise.reject(v) : settle(() => f.call(it, v));
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}

// helper: __pe_reactProps
// The props `React.createElement(type, config, ...children)` makes, as
// React makes them: `config`'s own enumerable properties (it is walked as
// React walks it, `for..in` with the built-in `hasOwnProperty`) but `key`,
// `ref`, `__self` and `__source`; then the `n` children given (`children`
// itself for one, an array of them for more); then each of the type's
// `defaultProps` where the prop is `undefined`.
function __pe_reactProps(config, children, n, defaults) {
  var props = {};
  var hasOwn = Object.prototype.hasOwnProperty;
  if (config != null) {
    for (var k in config) {
      if (hasOwn.call(config, k) && k !== "key" && k !== "ref" && k !== "__self" && k !== "__source") {
        props[k] = config[k];
      }
    }
  }
  if (n > 0) {
    props.children = children;
  }
  if (defaults != null) {
    for (var d in defaults) {
      if (props[d] === undefined) {
        props[d] = defaults[d];
      }
    }
  }
  return props;
}

// helper: __pe_constructorPrototype
// The [[Prototype]] `new` gives an object from its constructor's
// `prototype` value (GetPrototypeFromConstructor): that value if it is an
// object, else the realm's Object.prototype (reached without the `Object`
// binding, which the program may have replaced).
var __pe_constructorPrototype = (function(objectPrototype) {
  return function(value) {
    return value !== null && (typeof value === "object" || typeof value === "function") ? value : objectPrototype;
  };
})(({}).constructor.prototype);

// helper: __pe_objectCreate
// The realm's Object.create, captured before the program can replace the
// `Object` binding.
var __pe_objectCreate = (function(create) {
  return function(prototype) { return create(prototype); };
})(({}).constructor.create);
