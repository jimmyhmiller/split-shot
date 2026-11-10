// React's rendering, as code the specializer runs (`--react`: see the
// engine's `js/react.rs`). Appended to the program; nothing else calls these.
//
// A component tree root's residual function is `__pe_react_render`'s code:
// the root's code runs on the props (and legacy context) React passes it,
// then the elements it returns are rendered as far as the specializer can:
// an element of a function component with neither key nor ref is what that
// component returns for its props (React's contract), any other element
// keeps its type and has its children rendered so. The decisions
// (`__pe_react_is_element`, ...) are the specializer's, and static: a value
// not known to be what one asks is left as it is, for React to render.
//
// The decisions' own bodies are what they mean for a value the specializer
// knows nothing of, should one ever run.

function __pe_react_render(props, context) {
  "use strict";
  var tree = __pe_react_root(props, context);
  return __pe_react_is_static(tree) ? __pe_react_reconcile(tree, 0, null) : tree;
}

// (A root of at most one parameter: React's legacy context is not passed on.)
function __pe_react_render1(props) {
  "use strict";
  var tree = __pe_react_root(props);
  return __pe_react_is_static(tree) ? __pe_react_reconcile(tree, 0, null) : tree;
}

// A callback `Array.prototype.map` calls, of a list React renders as
// children (see the engine's `react_map_call`): the callback called as
// `map` calls it, what it returned rendered in place as the item at
// `index` (no Provider above it known).
function __pe_react_render_item(item, index, array) {
  "use strict";
  var node = __pe_react_root(item, index, array);
  return __pe_react_is_static(node) ? __pe_react_reconcile(node, index, null) : node;
}

function __pe_react_is_mapped(node) {
  "use strict";
  return false;
}

function __pe_react_map_now(node) {
  "use strict";
  throw new Error("__pe_react_map_now runs only as the specializer's");
}

// A class's `render` (`this` the instance React renders).
function __pe_react_render_method() {
  "use strict";
  var tree = __pe_react_root_method();
  return __pe_react_is_static(tree) ? __pe_react_reconcile(tree, 0, null) : tree;
}

// `node` an element or array of the specializer's (`__pe_react_is_static`),
// in slot `slot` of its parent's children (a lone child is slot 0, as React
// reconciles it with the first of an array). `env`: the values of the
// contexts the Providers rendered here above it give (`{context, value,
// next}`, innermost first), or `null`.
//
// `unkeyed`: `node` is a side of a choice whose other side is an element of
// the same component, with the same key: React renders either where the
// other was as an update of it, so what stands for it needs no key of its
// own (see `__pe_react_keyed`).
function __pe_react_reconcile(node, slot, env, unkeyed) {
  "use strict";
  // (A list `Array.prototype.map` made of a callback with an item version:
  // React renders it here, each item as the callback's item version renders
  // it, see the engine's `react_map_call`.)
  if (__pe_react_is_mapped(node)) return __pe_react_map_now(node);
  // (A choice of two: each side rendered on the path its condition takes.)
  if (__pe_react_is_choice(node)) {
    var same = __pe_react_same_component(node);
    if (__pe_react_choice_cond(node)) return __pe_react_reconcile_side(__pe_react_choice_side(node, true), slot, env, same);
    return __pe_react_reconcile_side(__pe_react_choice_side(node, false), slot, env, same);
  }
  if (__pe_react_is_array(node)) {
    return __pe_react_items(node, 0, [], env);
  }
  if (__pe_react_inlinable(node)) {
    // (As React renders it: its function called with its props, no `this`;
    // or a simple class's `render` on an instance. What it rendered goes on
    // as an argument, as it is: see `__pe_react_settle`.)
    return __pe_react_settle(__pe_react_guard_now(__pe_react_render_now(node), node), node, slot, env, unkeyed);
  }
  // A context's Provider: its children rendered with its value for that
  // context. (It stays: what is not rendered here below it reads it.)
  var provided = __pe_react_provider_of(node);
  if (provided !== false) {
    if (!__pe_react_has_children(node)) return node;
    var inner = { context: provided, value: node.props.value, next: env };
    var within = node.props.children;
    var done = __pe_react_is_static(within) ? __pe_react_reconcile(within, 0, inner) : within;
    // (Nothing left below it that reads a context at runtime: it goes, what
    // it rendered keyed for it and its slot, as a component's.)
    return __pe_react_needs_no_context(done) ? __pe_react_keyed(done, node, slot) : __pe_react_with_children(node, done);
  }
  // A context's Consumer under a Provider of it rendered here: what its
  // render prop returns for that Provider's value (React calls it with no
  // `this`), keyed for the context and its slot.
  var consumed = __pe_react_consumer_of(node);
  if (consumed !== false) {
    var found = __pe_react_find(env, consumed);
    var render = node.props.children;
    if (found === null || !__pe_react_is_known_fn(render)) return node;
    var out = render(found.value);
    if (!__pe_react_consumable(out, node)) return node;
    return __pe_react_keyed(__pe_react_is_static(out) ? __pe_react_reconcile(out, slot, env) : out, node, slot);
  }
  node = __pe_react_first_render(node);
  if (!__pe_react_has_children(node)) return node;
  var children = __pe_react_children(node);
  return __pe_react_with_children(node, __pe_react_is_static(children) ? __pe_react_reconcile(children, 0, env) : children);
}

// What stands for element `node` rendered in place: `value`, what
// `__pe_react_guard_now` made of what its component rendered (`node` itself
// when that renders no other way).
function __pe_react_settle(value, node, slot, env, unkeyed) {
  "use strict";
  if (__pe_react_is_node(value, node)) return node;
  // (Keyed for the component and its slot: what another component renders
  // there is another element to React, and siblings keep apart.)
  var done = __pe_react_is_static(value) ? __pe_react_reconcile(value, slot, env) : value;
  return unkeyed ? done : __pe_react_keyed(done, node, slot);
}

// What element `node` rendered in place is, its component having rendered
// `rendered` (seen as it is: an intrinsic's argument, not held in a
// variable): `rendered` when React renders it as it does the component's
// (see `__pe_react_renderable`); a runtime value that may be text, itself
// where at runtime it is (see `__pe_react_guarded`); else `node`, the
// component then rendered nowhere in place in this root.
// The children of element `node`, which `__pe_react_has_children` holds.
function __pe_react_children(node) {
  "use strict";
  return node.props.children;
}

// Whether `value` is element `node` itself (decided statically: a
// runtime value compared with it would make it).
function __pe_react_is_node(value, node) {
  "use strict";
  return false;
}

function __pe_react_guard_now(rendered, node) {
  "use strict";
  return node;
}

// The innermost entry of `env` for `context`, or `null`.
function __pe_react_find(env, context) {
  "use strict";
  if (env === null) return null;
  if (env.context === context) return env;
  return __pe_react_find(env.next, context);
}

// The children of array `node` from `i` on, rendered into `out`. (A
// recursion on a static index, not a loop: under dynamic control a loop is
// generalized, its array made the runtime's.)
function __pe_react_items(node, i, out, env) {
  "use strict";
  if (i >= node.length) return out;
  var child = node[i];
  out[i] = __pe_react_is_static(child) ? __pe_react_reconcile(child, i, env) : child;
  return __pe_react_items(node, i + 1, out, env);
}

// A choice's side `value` rendered when it is the specializer's.
function __pe_react_reconcile_side(value, slot, env, unkeyed) {
  "use strict";
  return __pe_react_is_static(value) ? __pe_react_reconcile(value, slot, env, unkeyed) : value;
}

// `value` rendered when it is the specializer's (`__pe_react_is_static`).
function __pe_react_reconcile_any(value, slot, env) {
  "use strict";
  return __pe_react_is_static(value) ? __pe_react_reconcile(value, slot, env) : value;
}

function __pe_react_root() {
  "use strict";
  throw new Error("__pe_react_root runs only as the specializer's");
}

function __pe_react_root_method() {
  "use strict";
  throw new Error("__pe_react_root_method runs only as the specializer's");
}

function __pe_react_is_array(node) {
  "use strict";
  return false;
}

function __pe_react_is_static(node) {
  "use strict";
  return false;
}

function __pe_react_inlinable(node) {
  "use strict";
  return false;
}

function __pe_react_renderable(value) {
  "use strict";
  return false;
}

function __pe_react_keyed(rendered, node, slot) {
  "use strict";
  return rendered;
}

// Whether `parent` is React's `Component` (or `PureComponent`) as the
// specializer knows it: a class extending it is then modeled (see
// `lower_class`).
function __pe_react_extends_component(parent) {
  "use strict";
  throw new Error("__pe_react_extends_component runs only as the specializer's");
}

function __pe_react_render_now(node) {
  "use strict";
  throw new Error("__pe_react_render_now runs only as the specializer's");
}

// Whether choice `node`'s two sides are elements of one component, with
// one key.
function __pe_react_same_component(node) {
  "use strict";
  return false;
}

function __pe_react_is_choice(node) {
  "use strict";
  return false;
}

function __pe_react_choice_cond(node) {
  "use strict";
  throw new Error("__pe_react_choice_cond runs only as the specializer's");
}

function __pe_react_choice_side(node, side) {
  "use strict";
  throw new Error("__pe_react_choice_side runs only as the specializer's");
}

// The context (its id) whose Provider `node` is an element of, else false.
function __pe_react_provider_of(node) {
  "use strict";
  return false;
}

// The context (its id) whose Consumer `node` is an element of and that may
// be rendered in place in this root, else false.
function __pe_react_consumer_of(node) {
  "use strict";
  return false;
}

// Whether `value` is one element, or a primitive, that nothing below reads
// a context at runtime from: host elements and fragments all the way down.
function __pe_react_needs_no_context(value) {
  "use strict";
  return false;
}

// Whether `value` is a function whose code the specializer knows.
function __pe_react_is_known_fn(value) {
  "use strict";
  return false;
}

// Whether what a Consumer's render prop returned (`value`) renders in place
// of the Consumer (`node`); see `__pe_react_renderable`.
function __pe_react_consumable(value, node) {
  "use strict";
  return false;
}

function __pe_react_has_children(node) {
  "use strict";
  return false;
}

function __pe_react_with_children(node, children) {
  "use strict";
  return node;
}

// A first-render-only tree (`__optimizeReactComponentTree(root,
// {firstRenderOnly: true})`: the program renders it once, as a server does)
// renders a class component in place as React mounts it (its fiber's
// `constructClassInstance` and `mountClassInstance`): its instance made
// (`super` React's `Component`, `__pe_react_component`), its state derived
// from its props (`getDerivedStateFromProps`) or else merged from the updates
// `componentWillMount` enqueued, then what its `render` returns. `undefined`
// (not rendered in place: see `__pe_react_renderable`) when it does what this
// does not model: an update outside `componentWillMount` or with a callback
// (React calls it after the commit).
function __pe_react_mount(type, props, context, derive) {
  "use strict";
  var instance = __pe_react_new(type, props, context);
  var made = instance.updater;
  var updater = __pe_react_updater();
  __pe_react_track(instance, type);
  __pe_react_track(updater, type);
  __pe_react_track(updater.queue, type);
  __pe_react_track(made, type);
  // (`adoptClassInstance`, then `mountClassInstance`.)
  instance.updater = updater;
  var state = instance.state !== null && instance.state !== undefined ? instance.state : null;
  instance.props = props;
  instance.state = state;
  instance.context = context;
  // (`derive`: its `getDerivedStateFromProps`, or `undefined`.)
  if (typeof derive === "function") {
    var partial = __pe_react_invoke(derive, undefined, props, state);
    state = partial === null || partial === undefined ? state : Object.assign({}, state, partial);
    instance.state = state;
  }
  if (typeof derive !== "function" && typeof instance.getSnapshotBeforeUpdate !== "function"
      && (typeof instance.UNSAFE_componentWillMount === "function" || typeof instance.componentWillMount === "function")) {
    updater.open = true;
    if (typeof instance.componentWillMount === "function") __pe_react_invoke(instance.componentWillMount, instance);
    if (typeof instance.UNSAFE_componentWillMount === "function") __pe_react_invoke(instance.UNSAFE_componentWillMount, instance);
    updater.open = false;
    // (`this.state` assigned in it: React replaces the state with it.)
    if (instance.state !== state) updater.queue.push({ payload: instance.state, replace: true });
    state = __pe_react_updated(instance, updater.queue, 0, state, props);
    instance.state = state;
  }
  if (updater.spoiled || (made !== null && typeof made === "object" && made.spoiled === true)) return undefined;
  return __pe_react_invoke(instance.render, instance);
}

// React's `Component` constructor (`react`'s ReactBaseClasses.js), as
// `super(...)` runs it in a class `__pe_react_mount` makes. (`refs` is
// React's one empty object; an empty object of its own here.)
function __pe_react_component(props, context, updater) {
  "use strict";
  this.props = props;
  this.context = context;
  this.refs = {};
  this.updater = updater || __pe_react_updater();
}

// An instance's updater (React's `classComponentUpdater`, the update queue
// its fiber's): updates enqueued while it is `open` (`componentWillMount`
// runs) are queued; any other is not modeled (`spoiled`).
function __pe_react_updater() {
  "use strict";
  return {
    queue: [],
    open: false,
    spoiled: false,
    isMounted: __pe_react_is_mounted,
    enqueueSetState: __pe_react_enqueue_set_state,
    enqueueReplaceState: __pe_react_enqueue_replace_state,
    enqueueForceUpdate: __pe_react_enqueue_force_update,
  };
}

function __pe_react_is_mounted(instance) {
  "use strict";
  return false;
}

function __pe_react_enqueue_set_state(instance, payload, callback) {
  "use strict";
  if (!this.open || (callback !== undefined && callback !== null)) this.spoiled = true;
  else this.queue.push({ payload: payload, replace: false });
}

function __pe_react_enqueue_replace_state(instance, payload, callback) {
  "use strict";
  if (!this.open || (callback !== undefined && callback !== null)) this.spoiled = true;
  else this.queue.push({ payload: payload, replace: true });
}

// (In `componentWillMount` it changes no state.)
function __pe_react_enqueue_force_update(instance, callback) {
  "use strict";
  if (!this.open || (callback !== undefined && callback !== null)) this.spoiled = true;
}

// React's `Component.prototype.setState` and `forceUpdate` (read so from an
// instance of a class extending it: see `react_proto_member`).
function __pe_react_set_state(partialState, callback) {
  "use strict";
  if (typeof partialState !== "object" && typeof partialState !== "function" && partialState != null) {
    throw new Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
  }
  this.updater.enqueueSetState(this, partialState, callback, "setState");
}

function __pe_react_force_update(callback) {
  "use strict";
  this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
}

// The state the updates of `queue` from `i` on make of `state` (React's
// `getStateFromUpdate`, in order).
function __pe_react_updated(instance, queue, i, state, props) {
  "use strict";
  if (i >= queue.length) return state;
  var update = queue[i];
  var payload = update.payload;
  var next = typeof payload === "function" ? payload.call(instance, state, props) : payload;
  if (!update.replace) next = next === null || next === undefined ? state : Object.assign({}, state, next);
  return __pe_react_updated(instance, queue, i + 1, next, props);
}

// `new type(props, context)`, its code run here (see `__pe_react_render_now`).
function __pe_react_new(type, props, context) {
  "use strict";
  throw new Error("__pe_react_new runs only as the specializer's");
}

// `f.call(self, ...args)`, its code run here.
function __pe_react_invoke(f, self) {
  "use strict";
  throw new Error("__pe_react_invoke runs only as the specializer's");
}

// `value` is a mount's own (of a class of `type`): should it reach the
// residual, that class is not rendered in place.
function __pe_react_track(value, type) {
  "use strict";
  throw new Error("__pe_react_track runs only as the specializer's");
}

// `node` as a first-render-only tree renders it: a host element without the
// props a server does not render (event handlers, functions) nor its ref.
function __pe_react_first_render(node) {
  "use strict";
  return node;
}

// `React.Children.map(children, func, context)` of children the
// specializer knows all of (see the engine's `react_children_map`), as
// React 16.3.1 makes it: React's own `mapChildren` (MIT License, Copyright
// (c) Facebook, Inc. and its affiliates), its key escaping and traversal
// kept, its pooling dropped. `module` is React's module (for
// `isValidElement` should a value not be known).
function __pe_react_children_map(module, children, func, context) {
  "use strict";
  if (children == null) return children;
  var result = [];
  __pe_react_map_into(module, children, result, null, func, context);
  return result;
}

function __pe_react_map_into(module, children, array, prefix, func, context) {
  "use strict";
  var escapedPrefix = "";
  if (prefix != null) escapedPrefix = __pe_react_escape_user_key(prefix) + "/";
  var book = { result: array, keyPrefix: escapedPrefix, func: func, context: context, count: 0 };
  if (children == null) return;
  __pe_react_traverse(module, children, "", book);
}

function __pe_react_traverse(module, children, nameSoFar, book) {
  "use strict";
  var type = typeof children;
  if (type === "undefined" || type === "boolean") children = null;
  var invoke = false;
  if (children === null) invoke = true;
  else if (type === "string" || type === "number") invoke = true;
  else if (type === "object" && __pe_react_is_element(module, children)) invoke = true;
  if (invoke) {
    __pe_react_map_single(module, book, children, nameSoFar === "" ? "." + __pe_react_component_key(children, 0) : nameSoFar);
    return 1;
  }
  var subtreeCount = 0;
  var nextNamePrefix = nameSoFar === "" ? "." : nameSoFar + ":";
  if (!Array.isArray(children)) throw new Error("__pe_react_children_map of children not known");
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    subtreeCount += __pe_react_traverse(module, child, nextNamePrefix + __pe_react_component_key(child, i), book);
  }
  return subtreeCount;
}

function __pe_react_component_key(component, index) {
  "use strict";
  if (typeof component === "object" && component !== null && component.key != null) return __pe_react_escape_key(component.key);
  return index.toString(36);
}

// (React's `escape`: `"$" + key` with each "=" written "=0" and each ":"
// "=2", spelled as a loop.)
function __pe_react_escape_key(key) {
  "use strict";
  var text = "" + key;
  var escaped = "";
  for (var i = 0; i < text.length; i++) {
    var c = text.charAt(i);
    escaped += c === "=" ? "=0" : c === ":" ? "=2" : c;
  }
  return "$" + escaped;
}

// (React's `escapeUserProvidedKey`: each run of "/" one "/" longer, spelled
// as a loop.)
function __pe_react_escape_user_key(text) {
  "use strict";
  var t = "" + text;
  var out = "";
  for (var i = 0; i < t.length; i++) {
    var c = t.charAt(i);
    out += c;
    if (c === "/" && t.charAt(i + 1) !== "/") out += "/";
  }
  return out;
}

function __pe_react_map_single(module, book, child, childKey) {
  "use strict";
  var mapped = book.func.call(book.context, child, book.count++);
  if (Array.isArray(mapped)) {
    __pe_react_map_into(module, mapped, book.result, childKey, function(c) {
      return c;
    }, undefined);
  } else if (mapped != null) {
    if (__pe_react_is_element(module, mapped)) {
      mapped = __pe_react_with_key(mapped, book.keyPrefix + (mapped.key && (!child || child.key !== mapped.key) ? __pe_react_escape_user_key(mapped.key) + "/" : "") + childKey);
    }
    book.result.push(mapped);
  }
}

function __pe_react_is_element(module, value) {
  "use strict";
  return module.isValidElement(value);
}

function __pe_react_with_key(element, key) {
  "use strict";
  throw new Error("__pe_react_with_key runs only as the specializer's");
}
