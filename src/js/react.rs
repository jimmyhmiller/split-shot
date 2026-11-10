//! React, as a model the specializer may rely on (`--react`).
//!
//! Off unless asked for (`Js::set_react`): with it off, nothing here runs and
//! `require("react")` is any runtime call. With it on, the specializer takes
//! React's contract as given:
//!
//! - `require("react")` (or `"React"`) returns React's module;
//! - `React.createElement(type, config, ...children)` makes an immutable
//!   element (`{$$typeof, type, key, ref, props}`), its `props` the config's
//!   own properties but `key`/`ref`, its children, and the type's
//!   `defaultProps` where a prop is `undefined`;
//! - rendering an element of a function component with no ref (and no key,
//!   or a known one) renders what calling it with its props returns (React
//!   reconciles it by its key or place; React calls it with no
//!   `this`), and nothing changes a component's function object, its props,
//!   or an element after the module code has run;
//! - rendering an element of a simple class (a class extending `Component`
//!   or `PureComponent` with no state, no instance fields and no lifecycle
//!   method: see `simple_class`) renders what its `render` returns run on an
//!   instance of its props, an empty context and its methods;
//! - `Component` and `PureComponent` are ordinary functions, as `react`
//!   defines them, which the program does not redefine (a class's static
//!   properties are then written as the program writes them:
//!   `facts::Info::ordinary`).
//!
//! What it models:
//!
//! - React's module is a `Module` built-in (the engine's handle of a module
//!   value: see `HeapObj::Builtin`), `createElement` read from it a value the
//!   call of which makes an element when the call's inputs are known (a
//!   string, `React.Fragment` or a function component known not to have
//!   `defaultProps`, a config object the specializer models, a static key and
//!   ref), and is the runtime call otherwise;
//! - an element is a `ReactElement` built-in: its `type`, `key`, `ref` and
//!   `props` are read from it, any other use makes it escape, as
//!   `React.createElement(type, config, ...children)`, so the residual makes
//!   elements as the original does (never an object literal posing as one);
//! - a component tree root (`__optimizeReactComponentTree(Root)`) has a
//!   residual function made of `react_model.js`'s `__pe_react_render`: the
//!   root's code runs on the props React passes, and the elements it returns
//!   are rendered as far as the specializer can (`__pe_react_reconcile`).
//!   The model's decisions (`__pe_react_is_element`, ...) are made here and
//!   are always static: a value not known to be what the decision asks is
//!   left as it is, for React to render at runtime;
//! - a class the program makes a root or an element of, which may be simple
//!   (`lower`'s `react_root_names`), is modeled when its parent is React's
//!   `Component` as known here (`__pe_react_extends_component`, decided
//!   where the class is made), and made at runtime from its source
//!   otherwise; a modeled class the residual needs is made from its source
//!   as well, when it is as its definition left it but for static
//!   properties (`Js::class_from_source`).
//!
//! Nothing of React lives in the engine but the calls of this module, each
//! guarded by `Js::react` being on.

use super::*;

/// The kinds of the built-in values this module makes.
pub(super) const MODULE: &str = "Module";
pub(super) const ELEMENT: &str = "ReactElement";
pub(super) const CREATE_ELEMENT: &str = "ReactCreateElement";
pub(super) const CLONE_ELEMENT: &str = "ReactCloneElement";
/// `React.Children` (`[module]`), and its `map` (`[that]`).
pub(super) const REACT_CHILDREN: &str = "ReactChildren";
pub(super) const CHILDREN_MAP: &str = "ReactChildrenMap";
pub(super) const CREATE_CONTEXT: &str = "ReactCreateContext";
/// `React.forwardRef` as read from React's module, and what its call made:
/// a handle (`[render, runtime value]`, the function it was given a value
/// part: see `handle_value_parts`).
pub(super) const FORWARD_REF_FN: &str = "ReactForwardRefFn";
pub(super) const FORWARD_REF: &str = "ReactForwardRef";
/// `f.bind` of a function of known code (`[f]`), and what its call with a
/// `this` made: a handle (`[f as made, this, runtime value]`, both value
/// parts), whose call runs `f` with that `this`.
pub(super) const BIND_FN: &str = "ReactBindFn";
pub(super) const BOUND: &str = "ReactBound";
/// What `f.bind(this)` made of a function of known code and a `this` made
/// here (an object of this program's, a primitive): `[f, this]`, its call
/// `f`'s with that `this`; made at runtime, as `f.bind(this)`, only when it
/// escapes (nothing it is made of is read when it is: a function's `name`
/// and `length`, which runtime code may change once `f` escapes, `f`
/// escaping only after it, see `Js::escape`).
pub(super) const LAZY_BOUND: &str = "ReactBoundHere";
/// A context `React.createContext` made, its Provider, its Consumer: each a
/// handle (`[id, runtime value]`; the id tells the context apart).
pub(super) const CONTEXT: &str = "ReactContext";
pub(super) const PROVIDER: &str = "ReactProvider";
pub(super) const CONSUMER: &str = "ReactConsumer";

/// A built-in value that is a runtime value's handle: its data are static
/// parts, then that runtime value (see `Js::handle_parts`).
pub(super) fn is_handle(kind: &str) -> bool {
    matches!(kind, MODULE | CONTEXT | PROVIDER | CONSUMER | FORWARD_REF | BOUND)
}

/// A function of React's module as this module models it (its calls folded
/// when their inputs are known): `typeof` it is "function", and any other
/// member of it is read at runtime.
pub(super) fn is_callable_model(kind: &str) -> bool {
    matches!(kind, CREATE_ELEMENT | CLONE_ELEMENT | CREATE_CONTEXT | FORWARD_REF_FN | CHILDREN_MAP | BIND_FN | BOUND | LAZY_BOUND)
}

/// A built-in value this module makes that is an object of React's module
/// (its members read at runtime, but those modeled): `React.Children`.
pub(super) fn is_model_object(kind: &str) -> bool {
    kind == REACT_CHILDREN
}

/// The runtime value a handle (`data`, see `is_handle`) is.
pub(super) fn handle_value(data: &BData) -> RExpr {
    match &data[data.len() - 1] {
        Abs::Dyn(e) => e.clone(),
        v => unreachable!("a handle holds its runtime value last: {v:?}"),
    }
}

impl Js {
    /// The runtime values of the React modules the state holds handles of:
    /// what such a module exports never changes (React's contract), so a
    /// read of it needs no snapshot before code runs.
    pub(super) fn react_module_values(&self, s: &State) -> Vec<RExpr> {
        if self.react.is_none() {
            return Vec::new();
        }
        let mut vals: Vec<RExpr> = s
            .heap
            .iter()
            .filter_map(|(_, o)| match o {
                HeapObj::Builtin { kind, data, .. } if kind == MODULE => Some(module_value(data)),
                _ => None,
            })
            .collect();
        vals.dedup();
        vals
    }
}

/// The model functions of `react_model.js`, by name.
const RENDER: &str = "__pe_react_render";
const RENDER1: &str = "__pe_react_render1";
const RENDER_METHOD: &str = "__pe_react_render_method";
const ROOT_METHOD: &str = "__pe_react_root_method";
const ROOT: &str = "__pe_react_root";
const IS_ARRAY: &str = "__pe_react_is_array";
const IS_STATIC: &str = "__pe_react_is_static";
const INLINABLE: &str = "__pe_react_inlinable";
const HAS_CHILDREN: &str = "__pe_react_has_children";
const WITH_CHILDREN: &str = "__pe_react_with_children";
const RENDERABLE: &str = "__pe_react_renderable";
const KEYED: &str = "__pe_react_keyed";
const RENDER_NOW: &str = "__pe_react_render_now";
const IS_CHOICE: &str = "__pe_react_is_choice";
const PROVIDER_OF: &str = "__pe_react_provider_of";
const CONSUMER_OF: &str = "__pe_react_consumer_of";
const IS_KNOWN_FN: &str = "__pe_react_is_known_fn";
const CONSUMABLE: &str = "__pe_react_consumable";
const NEEDS_NO_CONTEXT: &str = "__pe_react_needs_no_context";
const EXTENDS_COMPONENT: &str = "__pe_react_extends_component";
const CHOICE_COND: &str = "__pe_react_choice_cond";
const CHOICE_SIDE: &str = "__pe_react_choice_side";
const MOUNT: &str = "__pe_react_mount";
const COMPONENT: &str = "__pe_react_component";
const SET_STATE: &str = "__pe_react_set_state";
const FORCE_UPDATE: &str = "__pe_react_force_update";
const NEW: &str = "__pe_react_new";
const INVOKE: &str = "__pe_react_invoke";
const TRACK: &str = "__pe_react_track";
const FIRST_RENDER: &str = "__pe_react_first_render";
const GUARD_NOW: &str = "__pe_react_guard_now";
const IS_NODE: &str = "__pe_react_is_node";
const CHILDREN: &str = "__pe_react_children";
const SAME_COMPONENT: &str = "__pe_react_same_component";
const RENDER_ITEM: &str = "__pe_react_render_item";
const IS_MAPPED: &str = "__pe_react_is_mapped";
const MAP_NOW: &str = "__pe_react_map_now";
const CHILDREN_MAP_MODEL: &str = "__pe_react_children_map";
const IS_ELEMENT: &str = "__pe_react_is_element";
const WITH_KEY: &str = "__pe_react_with_key";

/// The module names `require` gives React's module for.
const NAMES: &[&str] = &["react", "React"];

/// An element's data (`HeapObj::Builtin { kind: ELEMENT, data }`).
const E_MODULE: usize = 0;
const E_TYPE: usize = 1;
const E_KEY: usize = 2;
const E_REF: usize = 3;
const E_PROPS: usize = 4;
pub(super) const E_PROPS_INDEX: usize = E_PROPS;
/// `true`: its children were `createElement`'s arguments after the config
/// (rebuilt so), else none or the config's `children`.
const E_SPREAD: usize = 5;
/// `true`: its props are what React made (the type is known to have no
/// `defaultProps`); `false`: the config's, React adding the type's
/// `defaultProps` at runtime (its props are read from the element made).
const E_PROPS_KNOWN: usize = 6;
/// Its props a runtime config's (`E_PROPS` a runtime value) with the type's
/// known `defaultProps` (an object of them): props made on their first read
/// (see `element_props`); else `undefined`.
const E_DEFAULTS: usize = 7;
/// (Optional.) A host element's or fragment's children given with a runtime
/// config (`<div {...props}>children</div>`): its props are that config's
/// with them (React's), unknown here, but its children are these, which
/// React renders as they are (`E_SPREAD` as for known props).
const E_CHILDREN: usize = 8;

pub(super) struct React {
    /// The functions `__optimizeReactComponentTree` named, by source fid.
    roots: RefCell<std::collections::HashSet<usize>>,
    /// Roots whose model body needed the root function itself as a value
    /// (which the residual function cannot name): made as any closure.
    refused: RefCell<std::collections::HashSet<usize>>,
    /// The model's functions, by name.
    model: HashMap<&'static str, usize>,
    /// The components a root's body renders as elements, never in place
    /// (by root, component; see `inlinable`).
    never: RefCell<std::collections::HashSet<(usize, usize)>>,
    /// The root whose body is being made, and whether `never` grew while
    /// it was.
    root: std::cell::Cell<Option<usize>>,
    grew: std::cell::Cell<bool>,
    /// The `render` methods of the classes `__optimizeReactComponentTree`
    /// named (by source fid; across passes: one found after it was made has
    /// the program specialized again, `again`).
    methods: RefCell<std::collections::HashSet<usize>>,
    again: std::cell::Cell<bool>,
    /// The functions written as `render` of a runtime object (by the
    /// object's variable), this pass: a class's prototype made at runtime.
    render_writes: RefCell<HashMap<usize, usize>>,
    /// The runtime values written as `prototype` of a runtime object (by the
    /// objects' variables), this pass.
    proto_writes: RefCell<HashMap<usize, usize>>,
    /// The functions written as `C.prototype.render` of a runtime `C` (by
    /// its variable), this pass.
    class_renders: RefCell<HashMap<usize, usize>>,
    /// The functions (source fids) of the closures that escaped, by their
    /// runtime variables, this pass (a class made from its source too).
    escaped_fns: RefCell<HashMap<usize, usize>>,
    /// The static elements a root's residual function (by rfid) is given,
    /// made once where its closure is made (see `react_hoist`).
    hoists: RefCell<HashMap<usize, Vec<HoistElem>>>,
    /// How many values the root function being made takes before them.
    building_ntake: std::cell::Cell<usize>,
    /// Roots that are simple classes (constructors' fids): rendered as
    /// function components, their residual functions (`function_rfids`)
    /// plain functions standing for them (see `react_class_root_fn`).
    class_roots: RefCell<std::collections::HashSet<usize>>,
    function_rfids: RefCell<std::collections::HashSet<usize>>,
    /// The contexts `React.createContext` made this pass (ids).
    contexts: std::cell::Cell<usize>,
    /// The contexts whose Consumers a root's body renders as elements,
    /// never in place (by root, context id; as `never`).
    never_consumed: RefCell<std::collections::HashSet<(usize, usize)>>,
    /// The roots the program renders only once (`firstRenderOnly`), this
    /// pass: their trees render as a first render does (see `first_render`).
    first_render: RefCell<std::collections::HashSet<usize>>,
    /// The objects a mount made for its own use (its instance, updaters,
    /// update queue: by address, the class's fid; see `__pe_react_mount`):
    /// one reaching the residual has that class rendered as an element in
    /// that root (`react_note_escape`).
    tracked: RefCell<HashMap<usize, usize>>,
    /// The variables holding props React passes or makes (a root's
    /// parameter, a copy `element_props` made): read-only (React's
    /// contract), so a key read twice is the value read once (see
    /// `react_props_read`).
    props_vars: RefCell<std::collections::HashSet<usize>>,
    /// The types of the elements the root whose body is being made renders
    /// as elements (not in place, see `inlinable`): a class among them is
    /// a root of its own, its `render` a model body (see
    /// `react_note_branch_roots`).
    branch_types: RefCell<Vec<BranchType>>,
    /// The variables the elements the root whose body is being made
    /// materialized are made into, and those of the configs made for them
    /// (see `react_share_elements`).
    made_elements: RefCell<std::collections::HashSet<usize>>,
    element_configs: RefCell<std::collections::HashSet<usize>>,
    /// The lists `Array.prototype.map` made in a body of a callback with an
    /// item version, by the variable holding each (see `react_map_call`).
    mapped: RefCell<HashMap<usize, MappedList>>,
    /// Where React renders such a list as children: the body, the list's
    /// variable, and the one standing for it there (`MAP_NOW`).
    mapped_uses: RefCell<Vec<(usize, usize, usize)>>,
    /// The copy of a callback being materialized as its item version (see
    /// `react_map_call`): its address, in the state that makes it now, and
    /// that version's residual function.
    item_closure: std::cell::Cell<Option<(usize, usize)>>,
    /// The item versions made, by function, forms and what is known of
    /// the values they are given (`None`: refused).
    item_memo: RefCell<HashMap<(usize, Vec<CapForm>, Vec<(usize, Option<Info>)>), Option<usize>>>,
    /// The values an item version (by rfid) is given after those its
    /// closure passes: variables what is known of its captures names.
    item_imports: RefCell<HashMap<usize, Vec<RExpr>>>,
    /// The item versions' functions (rfids), made or being made.
    item_bodies: RefCell<std::collections::HashSet<usize>>,
    /// The `render` (address) of a class (address) being materialized as a
    /// root's, given its class (see `react_method_root_fn`).
    method_root: std::cell::Cell<Option<(usize, usize)>>,
    /// What a model body (by rfid) knew when it began (see
    /// `react_this_method`).
    body_facts: RefCell<HashMap<usize, crate::facts::Facts>>,
    /// The methods of classes (constructor fid, name) a body read from an
    /// instance as the prototype's, this pass; and the classes whose
    /// instances may hold them after all (see `react_check_methods`).
    method_assumed: RefCell<std::collections::BTreeSet<(usize, String)>>,
    method_off: RefCell<std::collections::HashSet<usize>>,
    /// Functions escaped only into React's API known as they were made, this
    /// pass; and whether a pass found that wrong (see `react_as_made`).
    statics_assumed: std::cell::Cell<bool>,
    statics_off: std::cell::Cell<bool>,
    /// Their runtime values' variables.
    statics_vars: RefCell<std::collections::HashSet<usize>>,
    /// The elements a body (rfid) is given known (`Shape::Element`), by
    /// address there: the runtime element each is (see
    /// `react_element_ident`).
    element_idents: RefCell<HashMap<(usize, usize), RExpr>>,
}

/// A list made of a callback's values (see `Js::react_map_call`): in the
/// body `body`, by `how`, with the callback's value `plain`; `item` the
/// value of its item version.
#[derive(Clone, Debug)]
pub(super) struct MappedList {
    body: usize,
    how: MappedBy,
    plain: RExpr,
    item: RExpr,
}

#[derive(Clone, Debug)]
enum MappedBy {
    /// `method` (the receiver's `map`, read) called on `recv`.
    Map { method: RExpr, recv: RExpr },
    /// The built-in `Array.from(items, callback)`.
    ArrayFrom { items: RExpr },
}

impl MappedList {
    /// The list made with the callback `f`.
    fn made_with(&self, f: &RExpr) -> RExpr {
        match &self.how {
            MappedBy::Map { method, recv } => RExpr::Call(Box::new(RExpr::Get(Box::new(method.clone()), "call".into())), vec![recv.clone(), f.clone()]),
            MappedBy::ArrayFrom { items } => RExpr::Call(Box::new(RExpr::Get(Box::new(RExpr::Global("Array".into())), "from".into())), vec![items.clone(), f.clone()]),
        }
    }

    /// The list made with the item version where the callee is the built-in
    /// that calls it as the item version is made for, else with the plain
    /// callback.
    fn made_with_item(&self) -> RExpr {
        match &self.how {
            MappedBy::Map { method, .. } => {
                let builtin = RExpr::Get(Box::new(RExpr::Get(Box::new(RExpr::Global("Array".into())), "prototype".into())), "map".into());
                RExpr::Opaque("?:".into(), vec![RExpr::Bin(Bop::Eq, Box::new(method.clone()), Box::new(builtin)), self.made_with(&self.item), self.made_with(&self.plain)])
            }
            MappedBy::ArrayFrom { .. } => self.made_with(&self.item),
        }
    }
}

/// An element type a root's body renders as an element (see
/// `React::branch_types`).
#[derive(Clone, Copy, Debug)]
enum BranchType {
    /// A function of known code (its fid).
    Known(usize),
    /// A runtime value of nothing known: the root function's value taken
    /// in this variable.
    Var(usize),
}

/// A static element a root's residual function is given (made once, where
/// its closure is made, and the same element in every render: React then
/// skips it): of a host type or a fragment all the way down, no ref, made of
/// constants and the values the function is given.
#[derive(Clone, PartialEq, Debug)]
pub(super) struct HoistElem {
    /// The index of React's module among the values given.
    module: usize,
    /// A host component's name, or `None`: `React.Fragment`.
    host: Option<String>,
    key: Option<String>,
    props: Vec<(String, HVal)>,
    /// The children, and whether they are `createElement`'s arguments.
    children: Vec<HVal>,
    spread: bool,
}

#[derive(Clone, PartialEq, Debug)]
enum HVal {
    Const(RExpr),
    /// The value given at this index.
    Given(usize),
    Elem(Box<HoistElem>),
    Array(Vec<HVal>),
}

/// The variable a root's model body has the root function's runtime value
/// in (see `Js::react_root_fn`); its use refuses the model body.
impl Js {
    fn root_self_var(&self, rfid: usize) -> usize {
        self.residual_var(3, rfid, 0)
    }

    /// The variable a class's `render` made as a root's has what is known
    /// of its class in (see `react_method_root_fn`).
    pub(super) fn root_class_var(&self, rfid: usize) -> usize {
        self.residual_var(4, rfid, 0)
    }

    /// Whether `fid` is the `render` of a class made a root's.
    pub(super) fn react_root_method(&self, fid: usize) -> bool {
        self.react.as_ref().is_some_and(|r| r.methods.borrow().contains(&fid))
    }
}

impl React {
    pub(super) fn new(names: &[String]) -> React {
        let mut model = HashMap::new();
        for n in [RENDER, RENDER1, RENDER_METHOD, ROOT, ROOT_METHOD, IS_ARRAY, IS_STATIC, INLINABLE, HAS_CHILDREN, WITH_CHILDREN, RENDERABLE, KEYED, RENDER_NOW, IS_CHOICE, CHOICE_COND, CHOICE_SIDE, EXTENDS_COMPONENT, PROVIDER_OF, CONSUMER_OF, IS_KNOWN_FN, CONSUMABLE, NEEDS_NO_CONTEXT, MOUNT, COMPONENT, SET_STATE, FORCE_UPDATE, NEW, INVOKE, TRACK, FIRST_RENDER, GUARD_NOW, SAME_COMPONENT, IS_NODE, CHILDREN, RENDER_ITEM, IS_MAPPED, MAP_NOW, CHILDREN_MAP_MODEL, IS_ELEMENT, WITH_KEY] {
            let fid = names.iter().position(|m| m == n).unwrap_or_else(|| panic!("--react: the model function `{n}` (react_model.js) is not in the program"));
            model.insert(n, fid);
        }
        React { roots: RefCell::new(Default::default()), refused: RefCell::new(Default::default()), model,
            never: RefCell::new(Default::default()),
            root: std::cell::Cell::new(None),
            grew: std::cell::Cell::new(false),
            hoists: RefCell::new(HashMap::new()),
            methods: RefCell::new(Default::default()),
            again: std::cell::Cell::new(false),
            render_writes: RefCell::new(HashMap::new()),
            proto_writes: RefCell::new(HashMap::new()),
            class_renders: RefCell::new(HashMap::new()),
            escaped_fns: RefCell::new(HashMap::new()),
            building_ntake: std::cell::Cell::new(0),
            class_roots: RefCell::new(Default::default()),
            function_rfids: RefCell::new(Default::default()),
            contexts: std::cell::Cell::new(0),
            never_consumed: RefCell::new(Default::default()),
            first_render: RefCell::new(Default::default()),
            tracked: RefCell::new(HashMap::new()),
            props_vars: RefCell::new(Default::default()),
            branch_types: RefCell::new(Vec::new()),
            made_elements: RefCell::new(Default::default()),
            element_configs: RefCell::new(Default::default()),
            mapped: RefCell::new(HashMap::new()),
            mapped_uses: RefCell::new(Vec::new()),
            item_closure: std::cell::Cell::new(None),
            item_memo: RefCell::new(HashMap::new()),
            item_imports: RefCell::new(HashMap::new()),
            item_bodies: RefCell::new(Default::default()),
            method_root: std::cell::Cell::new(None),
            body_facts: RefCell::new(HashMap::new()),
            method_assumed: RefCell::new(Default::default()),
            method_off: RefCell::new(Default::default()),
            statics_assumed: std::cell::Cell::new(false),
            statics_off: std::cell::Cell::new(false),
            statics_vars: RefCell::new(Default::default()),
            element_idents: RefCell::new(HashMap::new()),
        }
    }

    fn model_fn(&self, fid: usize) -> Option<&'static str> {
        self.model.iter().find(|(_, f)| **f == fid).map(|(n, _)| *n)
    }

    /// Forget what one specialization pass learned (see
    /// `Js::reset_for_respecialization`); refusals persist.
    pub(super) fn reset(&self) {
        self.roots.borrow_mut().clear();
        self.hoists.borrow_mut().clear();
        self.render_writes.borrow_mut().clear();
        self.proto_writes.borrow_mut().clear();
        self.class_renders.borrow_mut().clear();
        self.escaped_fns.borrow_mut().clear();
        self.contexts.set(0);
        self.first_render.borrow_mut().clear();
        self.again.set(false);
        self.mapped.borrow_mut().clear();
        self.mapped_uses.borrow_mut().clear();
        self.item_memo.borrow_mut().clear();
        self.item_imports.borrow_mut().clear();
        self.item_bodies.borrow_mut().clear();
        self.body_facts.borrow_mut().clear();
        self.method_assumed.borrow_mut().clear();
        self.statics_assumed.set(false);
        self.statics_vars.borrow_mut().clear();
    }
}

/// Whether a value of kind `kind` may be a side of a choice
/// (`HeapObj::Choice`, made where two paths meet): an element, which
/// nothing changes once made.
pub(super) fn is_choice_side(kind: &str) -> bool {
    kind == ELEMENT
}

/// Whether what is known of a handle of kind `kind` beyond its runtime
/// value is lost when runtime code may reach it (see `Js::escape`): a
/// forwardRef's (that it holds no `defaultProps`, which code may write).
pub(super) fn handle_forgets_on_escape(kind: &str) -> bool {
    kind == FORWARD_REF || kind == BOUND
}

/// The parts of a handle of kind `kind` that are values (passed into a
/// residual function as values are, with what is known of them: see
/// `Shape::Handle`), by index into its data. None of the kinds so far has
/// one but a forwardRef's (its render function); the others' parts are
/// constants.
pub(super) fn handle_value_parts(kind: &str) -> &'static [usize] {
    match kind {
        FORWARD_REF => &[0],
        BOUND => &[0, 1],
        _ => &[],
    }
}

/// The runtime value of a module handle.
pub(super) fn module_value(data: &BData) -> RExpr {
    match &data[1] {
        Abs::Dyn(e) => e.clone(),
        v => unreachable!("a module handle holds its runtime value: {v:?}"),
    }
}

/// A simple class (see `Js::simple_class`): its constructor's function, its
/// methods' values, its `defaultProps`.
struct SimpleClass {
    fid: usize,
    methods: Vec<(String, Abs)>,
    defaults: Vec<(String, Abs)>,
}

/// A class a first render mounts (see `Js::mount_of`): its constructor's
/// function, its `defaultProps`, its `getDerivedStateFromProps` (or
/// `undefined`), and its `prototype`.
struct Mount {
    fid: usize,
    defaults: Vec<(String, Abs)>,
    derive: Abs,
    prototype: Abs,
}

/// React's lifecycle methods: a class with one is never rendered in place.
const LIFECYCLE: &[&str] = &[
    "componentWillMount",
    "UNSAFE_componentWillMount",
    "componentDidMount",
    "componentWillReceiveProps",
    "UNSAFE_componentWillReceiveProps",
    "shouldComponentUpdate",
    "componentWillUpdate",
    "UNSAFE_componentWillUpdate",
    "getSnapshotBeforeUpdate",
    "componentDidUpdate",
    "componentWillUnmount",
    "componentDidCatch",
    "getChildContext",
];

/// The root whose model body is being made.
/// `e === undefined`.
fn undefined_test(e: &RExpr) -> RExpr {
    RExpr::Bin(Bop::Eq, Box::new(e.clone()), Box::new(RExpr::Undef))
}

/// Where an element of component `f` with key `key` is, to React, at
/// `slot` among its siblings: its key when it has one, else its place;
/// apart, as React keeps an element's key apart from a place. A runtime
/// key (a string, or `undefined` for none: see `create_element`) or slot
/// makes it a runtime string.
fn key_here(f: &str, key: &Abs, slot: &Abs) -> Abs {
    let at = || match slot {
        Abs::Num(n) => Abs::Str(format!("pe{f}@{}", n.to_js_string())),
        Abs::Dyn(e) => Abs::Dyn(RExpr::Bin(Bop::Add, Box::new(RExpr::Str(format!("pe{f}@"))), Box::new(e.clone()))),
        _ => unreachable!("a slot is a number"),
    };
    match key {
        Abs::Str(k) => Abs::Str(format!("pe{f}#{k}")),
        Abs::Num(k) => Abs::Str(format!("pe{f}#{}", k.to_js_string())),
        Abs::Dyn(k) => {
            let keyed = RExpr::Bin(Bop::Add, Box::new(RExpr::Str(format!("pe{f}#"))), Box::new(k.clone()));
            Abs::Dyn(RExpr::Opaque("?:".into(), vec![undefined_test(k), at().to_rexpr(), keyed]))
        }
        _ => at(),
    }
}

/// The key of what stands for an element at `here` (`key_here`), what it
/// rendered having key `key` (`Null` for none): `here.key`, or `here`.
fn key_join(here: &Abs, key: &Abs) -> Abs {
    let dot = |h: &RExpr, k: RExpr| RExpr::Bin(Bop::Add, Box::new(RExpr::Bin(Bop::Add, Box::new(h.clone()), Box::new(RExpr::Str(".".into())))), Box::new(k));
    match (here, key) {
        (_, Abs::Null) => here.clone(),
        (Abs::Str(h), Abs::Str(k)) => Abs::Str(format!("{h}.{k}")),
        (Abs::Str(h), Abs::Num(k)) => Abs::Str(format!("{h}.{}", k.to_js_string())),
        (h, Abs::Dyn(k)) => Abs::Dyn(RExpr::Opaque("?:".into(), vec![undefined_test(k), h.to_rexpr(), dot(&h.to_rexpr(), k.clone())])),
        (h, k) => Abs::Dyn(dot(&h.to_rexpr(), k.to_rexpr())),
    }
}

fn react_root(js: &Js) -> usize {
    js.react.as_ref().and_then(|r| r.root.get()).expect("a component renders in place only in a root's body")
}

/// The React module handle a value is, if it is one.
fn react_module(heap: &Heap, v: &Abs) -> Option<usize> {
    let Abs::Ref(a) = v else { return None };
    match heap.get(a) {
        Some(HeapObj::Builtin { kind, data, .. }) if kind == MODULE && NAMES.iter().any(|n| data[0] == Abs::Str((*n).into())) => Some(*a),
        _ => None,
    }
}

impl Js {
    /// After the runtime call `callee(args)` assigned `dst`: what the result
    /// is (`require("react")`: React's module).
    pub(super) fn react_runtime_result(&self, callee: &RExpr, args: &[RExpr], dst: usize, s: &mut State) -> Option<Abs> {
        self.react.as_ref()?;
        let (RExpr::Global(g), [RExpr::Str(name)]) = (callee, args) else { return None };
        if g != "require" || !NAMES.contains(&name.as_str()) {
            return None;
        }
        let m = s.alloc(HeapObj::Builtin { kind: MODULE.into(), data: vec![Abs::Str(name.clone()), Abs::Dyn(RExpr::Var(dst))].into(), ext: None });
        Some(Abs::Ref(m))
    }

    /// `module.k` for a module handle: React's `createElement` as the value
    /// whose call makes elements; anything else read at runtime, what React's
    /// API says it is known (`Component` is a function, `Fragment` a
    /// symbol, ...).
    pub(super) fn module_member(&self, s: &mut State, addr: usize, k: &str, pc: usize, out: &mut Vec<Op>) -> Abs {
        let HeapObj::Builtin { data, .. } = &s.heap[&addr] else { unreachable!("a module handle") };
        let base = module_value(data);
        let read = RExpr::Get(Box::new(base), k.to_string());
        if self.react.is_none() || react_module(&s.heap, &Abs::Ref(addr)).is_none() {
            return Abs::Dyn(read);
        }
        if k == "createElement" {
            let c = s.alloc(HeapObj::Builtin { kind: CREATE_ELEMENT.into(), data: vec![Abs::Ref(addr)].into(), ext: None });
            return Abs::Ref(c);
        }
        if k == "createContext" {
            let c = s.alloc(HeapObj::Builtin { kind: CREATE_CONTEXT.into(), data: vec![Abs::Ref(addr)].into(), ext: None });
            return Abs::Ref(c);
        }
        if k == "cloneElement" {
            let c = s.alloc(HeapObj::Builtin { kind: CLONE_ELEMENT.into(), data: vec![Abs::Ref(addr)].into(), ext: None });
            return Abs::Ref(c);
        }
        if k == "Children" {
            let c = s.alloc(HeapObj::Builtin { kind: REACT_CHILDREN.into(), data: vec![Abs::Ref(addr)].into(), ext: None });
            return Abs::Ref(c);
        }
        if k == "forwardRef" {
            let c = s.alloc(HeapObj::Builtin { kind: FORWARD_REF_FN.into(), data: vec![Abs::Ref(addr)].into(), ext: None });
            return Abs::Ref(c);
        }
        let types = match k {
            "Component" | "PureComponent" | "cloneElement" | "createRef" | "forwardRef" | "isValidElement" | "createFactory" => crate::facts::T_FUNC,
            "Children" => crate::facts::T_OBJ,
            "version" => crate::facts::T_STR,
            _ => return Abs::Dyn(read),
        };
        // (Read once, into a variable known to be what it is: a class's
        // `prototype` an object.)
        let t = self.aux_var(54, pc, addr);
        // (Their `prototype`s too: ordinary objects, of data methods only.)
        let props = if matches!(k, "Component" | "PureComponent") {
            vec![("prototype".to_string(), Info { types: crate::facts::T_OBJ, truthy: Some(true), ordinary: self.pristine("Object"), ..Info::top() })]
        } else {
            Vec::new()
        };
        // (React's contract: its `Component` and `PureComponent` are
        // ordinary functions, as `react` defines them, and the program does
        // not redefine their properties: a class extending one gets its
        // static properties as written.)
        let ordinary = matches!(k, "Component" | "PureComponent") && self.pristine("Function");
        let info = Info { types, truthy: Some(true), props, ordinary, ..Info::top() };
        self.declared_types.borrow_mut().insert(t, (read.clone(), info));
        self.emit_temp(s, t, read, pc, out);
        Abs::Dyn(RExpr::Var(t))
    }

    /// `element.k` for an element: its type, key, ref or props; `None` for
    /// any other property (read at runtime from the element made).
    pub(super) fn element_member(heap: &Heap, addr: usize, k: &str) -> Option<Abs> {
        let HeapObj::Builtin { data, .. } = &heap[&addr] else { unreachable!("an element") };
        match k {
            "type" => Some(data[E_TYPE].clone()),
            // (A runtime key is a string, or `undefined` for none: React's
            // is `null` then.)
            "key" => Some(match &data[E_KEY] {
                Abs::Dyn(k) => Abs::Dyn(RExpr::Opaque("??".into(), vec![k.clone(), RExpr::Null])),
                k => k.clone(),
            }),
            "ref" => Some(data[E_REF].clone()),
            "props" if data[E_PROPS_KNOWN] == Abs::Bool(true) => Some(data[E_PROPS].clone()),
            _ => None,
        }
    }

    /// `element.props` of an element whose props are a runtime config's
    /// with known defaults (`E_DEFAULTS`): made now as React makes them, a
    /// copy of the config with each default where a prop is `undefined`, and
    /// the element's props from here on.
    pub(super) fn element_props(&self, s: &mut State, addr: usize, pc: usize, out: &mut Vec<Op>) -> Option<Abs> {
        let HeapObj::Builtin { data, .. } = &s.heap[&addr] else { return None };
        let (Abs::Dyn(config), Abs::Ref(d)) = (&data[E_PROPS], &data[E_DEFAULTS]) else { return None };
        let (config, d) = (config.clone(), *d);
        let HeapObj::Object { props: defaults, .. } = s.heap[&d].clone() else { unreachable!("defaults are an object") };
        let fresh = self.aux_var(56, pc, addr);
        let t = self.aux_var(57, pc, addr);
        out.push(Op::NewObject { dst: fresh, fields: vec![] });
        let assign = RExpr::Get(Box::new(RExpr::Global("Object".into())), "assign".into());
        let made = RExpr::Call(Box::new(assign), vec![RExpr::Var(fresh), config.clone()]);
        // (What is known of them: the config's, a default where it reads
        // `undefined`; known of the variable they are made in, see
        // `track_defs`.)
        if !self.facts_off {
            let base = match &config {
                RExpr::Var(c) => s.facts.get(c).map(|i| i.props.clone()).unwrap_or_default(),
                _ => Vec::new(),
            };
            let mut known = Vec::new();
            for (k, i) in base {
                let v = match defaults.iter().find(|p| p.key == k) {
                    Some(Prop { val: PVal::Data(d), .. }) if i.eq == Some(RExpr::Undef) => Info::of_const(&d.to_rexpr()),
                    Some(_) => continue,
                    None => Some(i),
                };
                if let Some(v) = v {
                    known.push((k, v));
                }
            }
            if !known.is_empty() {
                self.declared_types.borrow_mut().insert(t, (made.clone(), Info { types: crate::facts::T_OBJ, truthy: Some(true), props: known, ..Info::top() }));
            }
        }
        self.emit_temp(s, t, made, pc, out);
        self.react.as_ref().expect("--react").props_vars.borrow_mut().insert(t);
        for p in defaults.iter() {
            let PVal::Data(v) = &p.val else { unreachable!("defaults are data") };
            // (React copies a default by `for..in`: no symbol key.)
            let Some(key) = p.key.as_str() else { continue };
            let cur = RExpr::Get(Box::new(RExpr::Var(t)), key.to_string());
            let undef = RExpr::Bin(Bop::Eq, Box::new(cur.clone()), Box::new(RExpr::Undef));
            out.push(Op::SetProp { obj: RExpr::Var(t), key: key.to_string(), val: RExpr::Opaque("?:".into(), vec![undef, v.to_rexpr(), cur]) });
        }
        if let Some(HeapObj::Builtin { data, .. }) = s.heap.get_mut(&addr) {
            data[E_PROPS] = Abs::Dyn(RExpr::Var(t));
            data[E_PROPS_KNOWN] = Abs::Bool(true);
            data[E_DEFAULTS] = Abs::Undef;
        }
        Some(Abs::Dyn(RExpr::Var(t)))
    }

    /// The expression that makes, at runtime, the built-in value this module
    /// models (`data` of kind `kind`, at `addr`), its parts materialized by
    /// `mat`, after the ops it pushes on `pre`.
    pub(super) fn react_value_expr(
        &self,
        kind: &str,
        addr: usize,
        data: &BData,
        heap: &Heap,
        pre: &mut Vec<Op>,
        mat: &mut dyn FnMut(&Abs) -> RExpr,
    ) -> RExpr {
        match kind {
            MODULE | CONTEXT | PROVIDER | CONSUMER | FORWARD_REF | BOUND => handle_value(data),
            BIND_FN => {
                let f = mat(&data[0]);
                RExpr::Get(Box::new(f), "bind".into())
            }
            LAZY_BOUND => {
                let f = mat(&data[0]);
                let this = mat(&data[1]);
                RExpr::Call(Box::new(RExpr::Get(Box::new(f), "bind".into())), vec![this])
            }
            CREATE_CONTEXT => {
                let m = mat(&data[0]);
                RExpr::Get(Box::new(m), "createContext".into())
            }
            FORWARD_REF_FN => {
                let m = mat(&data[0]);
                RExpr::Get(Box::new(m), "forwardRef".into())
            }
            CREATE_ELEMENT => {
                let m = mat(&data[0]);
                RExpr::Get(Box::new(m), "createElement".into())
            }
            CLONE_ELEMENT => {
                let m = mat(&data[0]);
                RExpr::Get(Box::new(m), "cloneElement".into())
            }
            REACT_CHILDREN => {
                let m = mat(&data[0]);
                RExpr::Get(Box::new(m), "Children".into())
            }
            CHILDREN_MAP => {
                let c = mat(&data[0]);
                RExpr::Get(Box::new(c), "map".into())
            }
            ELEMENT => {
                // `React.createElement(type, config, ...children)`: the
                // config its props but `children`, with its key and ref.
                let module = mat(&data[E_MODULE]);
                let ty = mat(&data[E_TYPE]);
                let create = |module: RExpr, args: Vec<RExpr>| RExpr::Call(Box::new(RExpr::Get(Box::new(module), "createElement".into())), args);
                // Its props a runtime object (it escaped on its own): that
                // object as the config (its own properties are what React
                // copies), with the key and ref.
                if let Abs::Dyn(p) = &data[E_PROPS] {
                    // (Its children given apart: see `E_CHILDREN`.)
                    let mut kids = Vec::new();
                    if let Some(k) = data.get(E_CHILDREN) {
                        match (k, &data[E_SPREAD]) {
                            (Abs::Ref(c), Abs::Bool(true)) => {
                                let Some(HeapObj::Array(arr)) = heap.get(&c) else { unreachable!("spread children are an array") };
                                for e in arr.elems.iter() {
                                    kids.push(mat(e));
                                }
                            }
                            (k, _) => kids.push(mat(k)),
                        }
                    }
                    if data[E_KEY] == Abs::Null && data[E_REF] == Abs::Null {
                        let mut args = vec![ty, p.clone()];
                        args.extend(kids);
                        return create(module, args);
                    }
                    assert!(self.pristine("Object"), "--react: an element with a key or ref whose props escaped, in a program that replaces Object.assign, is not supported");
                    let mut kr = Vec::new();
                    if data[E_KEY] != Abs::Null {
                        kr.push(("key".to_string(), mat(&data[E_KEY])));
                    }
                    if data[E_REF] != Abs::Null {
                        kr.push(("ref".to_string(), mat(&data[E_REF])));
                    }
                    let (empty, keyref) = (self.aux_var(53, addr, 1), self.aux_var(53, addr, 2));
                    pre.push(Op::NewObject { dst: empty, fields: vec![] });
                    pre.push(Op::NewObject { dst: keyref, fields: kr });
                    let assign = RExpr::Get(Box::new(RExpr::Global("Object".into())), "assign".into());
                    let config = RExpr::Call(Box::new(assign), vec![RExpr::Var(empty), p.clone(), RExpr::Var(keyref)]);
                    let mut args = vec![ty, config];
                    args.extend(kids);
                    return create(module, args);
                }
                let Abs::Ref(p) = &data[E_PROPS] else { unreachable!("an element's props are an object it made or a runtime one") };
                let Some(HeapObj::Object { props, .. }) = heap.get(p) else { unreachable!("an element's props are an object it made") };
                let mut fields: Vec<(String, RExpr)> = Vec::new();
                if data[E_KEY] != Abs::Null {
                    fields.push(("key".into(), mat(&data[E_KEY])));
                }
                if data[E_REF] != Abs::Null {
                    fields.push(("ref".into(), mat(&data[E_REF])));
                }
                let mut children: Vec<RExpr> = Vec::new();
                for pr in props.iter() {
                    let PVal::Data(v) = &pr.val else { unreachable!("an element's props are data properties") };
                    if pr.key == "children" {
                        match (v, &data[E_SPREAD]) {
                            (Abs::Ref(c), Abs::Bool(true)) => {
                                let Some(HeapObj::Array(arr)) = heap.get(c) else { unreachable!("spread children are an array") };
                                for e in arr.elems.iter() {
                                    children.push(mat(e));
                                }
                            }
                            _ => children.push(mat(v)),
                        }
                    } else if let Some(key) = pr.key.as_str() {
                        // (`createElement` copies the config's properties
                        // by `for..in`: a symbol key is not one.)
                        fields.push((key.to_string(), mat(v)));
                    }
                }
                let config = if fields.is_empty() {
                    RExpr::Null
                } else {
                    let c = self.aux_var(53, addr, 0);
                    pre.push(Op::NewObject { dst: c, fields });
                    RExpr::Var(c)
                };
                let mut args = vec![ty, config];
                args.extend(children);
                create(module, args)
            }
            k => unreachable!("not a React model value: {k}"),
        }
    }

    /// A call this module makes (`createElement`, a model decision); `None`
    /// for any other call.
    #[allow(clippy::too_many_arguments)]
    pub(super) fn react_call(&self, s: &mut State, callee: &Abs, args: &[Abs], pc: usize, out: &mut Vec<Op>, ret: RetMode) -> Option<Step<Js>> {
        let react = self.react.as_ref()?;
        let Abs::Ref(a) = callee else { return None };
        let v = match &s.heap[a] {
            HeapObj::Builtin { kind, data, .. } if kind == CREATE_ELEMENT => {
                let module = data[0].clone();
                let made = self.create_element(s, module, args, pc, out);
                if made.is_none() && env_flag!("REACT_DEBUG") {
                    eprintln!("[REACT] createElement not modeled: {:?}", args.iter().map(|a| match a { Abs::Ref(x) => format!("ref {:?}", s.heap.get(x).map(|o| format!("{o:?}").chars().take(60).collect::<String>())), o => format!("{o:?}") }).collect::<Vec<_>>());
                }
                made?
            }
            // (`f.bind(this)` of a `this` made here: made at runtime when it
            // escapes, see `LAZY_BOUND`.)
            HeapObj::Builtin { kind, data, .. }
                if kind == BIND_FN
                    && args.len() == 1
                    && !matches!(args[0], Abs::Dyn(_))
                    && self.pristine("Function")
                    && matches!(&data[0], Abs::Ref(f) if matches!(s.heap.get(f), Some(HeapObj::Closure { known: true, ident: None, .. }))) =>
            {
                let (f, this) = (data[0].clone(), args[0].clone());
                Abs::Ref(s.alloc(HeapObj::Builtin { kind: LAZY_BOUND.into(), data: vec![f, this].into(), ext: None }))
            }
            // (`f.bind(this)`: made at runtime as written, its value a handle
            // of `f` as made and that `this`.)
            HeapObj::Builtin { kind, data, .. } if kind == BIND_FN && args.len() == 1 && self.react_trusts_statics() && self.pristine("Function") => {
                let f = data[0].clone();
                let mut escaped = std::collections::HashSet::new();
                let fr = self.operand_rexpr(s, &f, &mut escaped, out);
                let tr = self.operand_rexpr(s, &args[0], &mut escaped, out);
                let v = self.runtime_call(s, RExpr::Get(Box::new(fr.clone()), "bind".into()), vec![tr.clone()], pc, out);
                let target = self.react_as_made(s, Abs::Dyn(fr), 0);
                if !matches!(&target, Abs::Ref(c) if matches!(s.heap.get(c), Some(HeapObj::Closure { known: true, .. }))) {
                    s.top_mut().pc += 1;
                    self.finish_call(s, v, Abs::Undef, ret, pc, out);
                    return Some(Step::Continue);
                }
                react.statics_assumed.set(true);
                if let Abs::Dyn(RExpr::Var(b)) = &v {
                    react.statics_vars.borrow_mut().insert(*b);
                }
                let this = match &args[0] {
                    Abs::Ref(_) => Abs::Dyn(tr),
                    t => t.clone(),
                };
                Abs::Ref(s.alloc(HeapObj::Builtin { kind: BOUND.into(), data: vec![target, this, v].into(), ext: None }))
            }
            // (A call of what `bind` made: its function with its `this`.)
            HeapObj::Builtin { kind, data, .. } if kind == BOUND || kind == LAZY_BOUND => {
                let (f, this) = (data[0].clone(), data[1].clone());
                let f = match f {
                    Abs::Dyn(_) => self.known_callee(s, f),
                    f => f,
                };
                s.top_mut().ostack.push(f);
                s.top_mut().ostack.extend(args.iter().cloned());
                let saved = self.probing_known_call.replace(true);
                let step = self.do_call(s, args.len(), pc, out, this, ret, Abs::Undef);
                self.probing_known_call.set(saved);
                return Some(step);
            }
            HeapObj::Builtin { kind, data, .. } if kind == CHILDREN_MAP => {
                let Abs::Ref(ch) = &data[0] else { unreachable!("React.Children.map of React.Children") };
                let HeapObj::Builtin { data: cd, .. } = &s.heap[ch] else { unreachable!("React.Children") };
                let module = cd[0].clone();
                return self.react_children_map(s, module, args, pc, out, ret);
            }
            HeapObj::Builtin { kind, .. } if kind == CLONE_ELEMENT => {
                let made = self.clone_element(s, args, pc, out);
                if made.is_none() && env_flag!("REACT_DEBUG") {
                    eprintln!("[REACT] cloneElement not modeled: {args:?}");
                }
                made?
            }
            HeapObj::Builtin { kind, data, .. } if kind == CREATE_CONTEXT => {
                // (Made at runtime, as written: its value a context handle,
                // told apart from others by an id.)
                let m = data[0].clone();
                let callee = RExpr::Get(Box::new(Js::handle_expr(&s.heap, match m { Abs::Ref(a) => a, _ => unreachable!("createContext of a module") }).expect("a module handle")), "createContext".into());
                let mut escaped = std::collections::HashSet::new();
                let rargs: Vec<RExpr> = args.iter().map(|a| self.operand_rexpr(s, a, &mut escaped, out)).collect();
                let v = self.runtime_call(s, callee, rargs, pc, out);
                let id = react.contexts.get();
                react.contexts.set(id + 1);
                let c = s.alloc(HeapObj::Builtin { kind: CONTEXT.into(), data: vec![Abs::Num(JsNum::int(id as i64)), v].into(), ext: None });
                Abs::Ref(c)
            }
            HeapObj::Builtin { kind, data, .. } if kind == FORWARD_REF_FN => {
                // (Made at runtime, as written: its value a handle holding
                // the function it was given, when that is one whose code is
                // known, which an element of it renders: see `forward_ref`.)
                let m = data[0].clone();
                let callee = RExpr::Get(Box::new(Js::handle_expr(&s.heap, match m { Abs::Ref(a) => a, _ => unreachable!("forwardRef of a module") }).expect("a module handle")), "forwardRef".into());
                let mut escaped = std::collections::HashSet::new();
                let given = args.first().cloned();
                let rargs: Vec<RExpr> = args.iter().map(|a| self.operand_rexpr(s, a, &mut escaped, out)).collect();
                let v = self.runtime_call(s, callee, rargs.clone(), pc, out);
                // (The function it was given, made at runtime now: a closure
                // of its code that is that runtime value, `ident`, its
                // captures as the escape left them.)
                let known = match (&given, rargs.first()) {
                    (Some(Abs::Ref(c)), Some(RExpr::Var(x))) => match s.heap.get(c) {
                        Some(HeapObj::Closure { fid, captured, once, .. }) => Some((*fid, captured.clone(), *once, *x)),
                        _ => None,
                    },
                    (Some(Abs::Dyn(RExpr::Var(x))), _) if !self.facts_off && s.facts.get(x).is_some_and(|i| i.callee.is_some()) => {
                        let f = self.known_callee(s, Abs::Dyn(RExpr::Var(*x)));
                        match s.heap.get(&match f { Abs::Ref(a) => a, _ => usize::MAX }) {
                            Some(HeapObj::Closure { fid, captured, once, .. }) => Some((*fid, captured.clone(), *once, *x)),
                            _ => None,
                        }
                    }
                    _ => None,
                };
                let render = match known {
                    // (What it holds as it was made, when React's contract is
                    // trusted that far: see `react_as_made`.)
                    Some((fid, captured, once, x)) if self.react_trusts_statics() => {
                        let captured = captured.into_iter().map(|c| self.react_as_made(s, c, 0)).collect();
                        react.statics_assumed.set(true);
                        Abs::Ref(s.alloc(HeapObj::Closure { fid, captured, props: Vec::new(), proto: INTRINSIC_PROTO, known: false, once, ident: Some(x) }))
                    }
                    Some((fid, captured, once, x)) => {
                        let captured = captured.into_iter().map(|c| self.escaped_known_fn(s, c, 0)).collect();
                        Abs::Ref(s.alloc(HeapObj::Closure { fid, captured, props: Vec::new(), proto: INTRINSIC_PROTO, known: false, once, ident: Some(x) }))
                    }
                    None => {
                        if env_flag!("REACT_DEBUG") {
                            eprintln!("[REACT] forwardRef of no known function: {:?}", rargs.first());
                        }
                        s.top_mut().pc += 1;
                        self.finish_call(s, v, Abs::Undef, ret, pc, out);
                        return Some(Step::Continue);
                    }
                };
                Abs::Ref(s.alloc(HeapObj::Builtin { kind: FORWARD_REF.into(), data: vec![render, v].into(), ext: None }))
            }
            HeapObj::Closure { fid, .. } => match react.model_fn(*fid)? {
                IS_ARRAY => Abs::Bool(matches!(args.first(), Some(Abs::Ref(x)) if matches!(s.heap.get(x), Some(HeapObj::Array(_))))),
                PROVIDER_OF => match args.first().and_then(|e| self.provider_context(s, e)) {
                    Some(id) => Abs::Num(JsNum::int(id as i64)),
                    None => Abs::Bool(false),
                },
                CONSUMER_OF => match args.first().and_then(|e| self.consumer_context(s, e)) {
                    Some(id) if !react.never_consumed.borrow().contains(&(react_root(self), id)) => Abs::Num(JsNum::int(id as i64)),
                    _ => Abs::Bool(false),
                },
                IS_KNOWN_FN => Abs::Bool(match args.first() {
                    Some(Abs::Ref(a)) => matches!(s.heap.get(a), Some(HeapObj::Closure { known: true, ident: None, .. })),
                    Some(Abs::Dyn(RExpr::Var(v))) => !self.facts_off && s.facts.get(v).is_some_and(|i| i.callee.is_some()),
                    _ => false,
                }),
                NEEDS_NO_CONTEXT => Abs::Bool(match args.first() {
                    Some(Abs::Str(_) | Abs::Num(_) | Abs::Bool(_) | Abs::Null) => true,
                    Some(v @ Abs::Ref(_)) if Js::is_element(&s.heap, Some(v)) => Js::reads_no_context(&s.heap, v, 0),
                    _ => false,
                }),
                CONSUMABLE => {
                    let r = Js::renderable(&s.heap, args.first().unwrap_or(&Abs::Undef));
                    // (Not rendered in place here: nowhere in this root.)
                    if let Some(id) = args.get(1).and_then(|e| self.consumer_context(s, e)).filter(|_| !r) {
                        if react.never_consumed.borrow_mut().insert((react_root(self), id)) {
                            react.grew.set(true);
                        }
                    }
                    Abs::Bool(r)
                }
                // (React's `Component` or `PureComponent`, read from its
                // module: see `module_member`.)
                EXTENDS_COMPONENT => Abs::Bool(matches!(args.first(), Some(Abs::Dyn(e)) if self.ordinary_value(e))),
                // (An element, array or choice of the specializer's: one to
                // render.)
                IS_STATIC => Abs::Bool(
                    Js::is_element(&s.heap, args.first())
                        || matches!(args.first(), Some(Abs::Ref(x)) if matches!(s.heap.get(x), Some(HeapObj::Array(_) | HeapObj::Choice { .. })))
                        || self.react_mapped_here(args.first()).is_some(),
                ),
                IS_MAPPED => Abs::Bool(self.react_mapped_here(args.first()).is_some()),
                // (Whether a value is an element: known of one the specializer
                // knows; else React's `isValidElement` asked at runtime.)
                IS_ELEMENT => match args.get(1) {
                    Some(v @ Abs::Ref(_)) if Js::is_element(&s.heap, Some(v)) => Abs::Bool(true),
                    Some(Abs::Ref(_) | Abs::Num(_) | Abs::Str(_) | Abs::Bool(_) | Abs::Undef | Abs::Null) => Abs::Bool(false),
                    Some(v @ Abs::Dyn(_)) => {
                        let Some(Abs::Ref(m)) = args.first() else { unreachable!("__pe_react_is_element(module, value)") };
                        let HeapObj::Builtin { data: md, .. } = &s.heap[m] else { unreachable!("a module handle") };
                        let callee = RExpr::Get(Box::new(module_value(md)), "isValidElement".into());
                        let x = v.to_rexpr();
                        self.runtime_call(s, callee, vec![x], pc, out)
                    }
                    _ => unreachable!("__pe_react_is_element(module, value)"),
                },
                // (React's `cloneAndReplaceKey`: the element with that key.)
                WITH_KEY => match (args.first(), args.get(1)) {
                    (Some(Abs::Ref(e)), Some(Abs::Str(k))) if Js::is_element(&s.heap, args.first()) => {
                        let HeapObj::Builtin { data, .. } = s.heap[e].clone() else { unreachable!("an element") };
                        let mut nd = data.to_vec();
                        nd[E_KEY] = Abs::Str(k.clone());
                        Abs::Ref(s.alloc(HeapObj::Builtin { kind: ELEMENT.into(), data: nd.into(), ext: None }))
                    }
                    other => unreachable!("__pe_react_with_key of an element and a key the specializer knows: {other:?}"),
                },
                // (The list rendered here: what stands for it, see
                // `react_settle_mapped`.)
                MAP_NOW => {
                    let m = self.react_mapped_here(args.first()).expect("__pe_react_map_now of a list map made here");
                    let m2 = self.aux_var(65, m, 0);
                    let body = self.react_building.get().expect("a list is rendered in a body");
                    react.mapped_uses.borrow_mut().push((body, m, m2));
                    Abs::Dyn(RExpr::Var(m2))
                }
                SAME_COMPONENT => Abs::Bool(match args.first() {
                    Some(Abs::Ref(x)) => match s.heap.get(x).cloned() {
                        Some(HeapObj::Choice { a, b, .. }) => {
                            let key = |v: &Abs| match v {
                                Abs::Ref(e) => match s.heap.get(e) {
                                    Some(HeapObj::Builtin { kind, data, .. }) if kind == ELEMENT => Some(data[E_KEY].clone()),
                                    _ => None,
                                },
                                _ => None,
                            };
                            let (ca, cb) = (self.element_component(s, &a), self.element_component(s, &b));
                            ca.is_some() && ca == cb && key(&a).is_some() && key(&a) == key(&b)
                        }
                        _ => false,
                    },
                    _ => false,
                }),
                // A choice (an `if`-converted `c ? x : y`): its condition, then
                // the side chosen, each rendered on its own path.
                IS_CHOICE => Abs::Bool(matches!(args.first(), Some(Abs::Ref(x)) if matches!(s.heap.get(x), Some(HeapObj::Choice { .. })))),
                CHOICE_COND => match args.first() {
                    Some(Abs::Ref(x)) => match &s.heap[x] {
                        HeapObj::Choice { cond, .. } => cond.clone(),
                        _ => unreachable!("__pe_react_choice_cond of a choice"),
                    },
                    _ => unreachable!("__pe_react_choice_cond of a choice"),
                },
                CHOICE_SIDE => match (args.first(), args.get(1)) {
                    (Some(Abs::Ref(x)), Some(Abs::Bool(t))) => match &s.heap[x] {
                        HeapObj::Choice { a, b, .. } => if *t { a.clone() } else { b.clone() },
                        _ => unreachable!("__pe_react_choice_side of a choice"),
                    },
                    _ => unreachable!("__pe_react_choice_side(choice, side)"),
                },
                INLINABLE => {
                    let r = self.inlinable(s, args.first());
                    if !r {
                        self.react_note_branch_type(s, args.first());
                    }
                    if env_flag!("REACT_DEBUG") {
                        let ty = match args.first() {
                            Some(Abs::Ref(e)) => match s.heap.get(e) {
                                Some(HeapObj::Builtin { data, .. }) if data.len() > E_TYPE => format!("{:?}", data[E_TYPE]),
                                _ => "?".into(),
                            },
                            other => format!("{other:?}"),
                        };
                        eprintln!("[REACT] inlinable={r} type={:?} ({ty})", args.first().and_then(|e| self.element_component(s, e)).map(|f| &self.names[f]));
                        if !r {
                            if let Some(Abs::Ref(e)) = args.first() {
                                if let Some(HeapObj::Builtin { data, .. }) = s.heap.get(e) {
                                    if let Abs::Dyn(RExpr::Var(v)) = &data[E_TYPE] {
                                        eprintln!("[REACT]   type facts: {:?}; key {:?} ref {:?} props_known {:?}", s.facts.get(v).map(|i| (i.types, i.callee.as_ref().map(|k| (k.fid, k.object.clone())))), data[E_KEY], data[E_REF], data[E_PROPS_KNOWN]);
                                    }
                                }
                            }
                        }
                    }
                    Abs::Bool(r)
                }
                RENDERABLE => {
                    let v = args.first().unwrap_or(&Abs::Undef);
                    let r = Js::renderable(&s.heap, v) || self.renders_as_text(s, v);
                    if env_flag!("REACT_DEBUG") {
                        eprintln!("[REACT] renderable={r} of {:?}: {:?}", args.get(1).and_then(|e| self.element_component(s, e)).map(|f| &self.names[f]), args.first());
                    }
                    // (A runtime value stands for the element where it may:
                    // see `GUARDED`.)
                    if let Some(f) = args.get(1).and_then(|e| self.element_component(s, e)).filter(|_| !r && !self.guardable(s, v)) {
                        {
                        // (Not rendered in place here: nowhere in this root,
                        // and its body is made again.)
                        let root = react.root.get().expect("a component renders in place only in a root's body");
                        if react.never.borrow_mut().insert((root, f)) {
                            react.grew.set(true);
                        }
                        }
                    }
                    Abs::Bool(r)
                }
                KEYED => {
                    let (Some(v), Some(node), Some(slot @ (Abs::Num(_) | Abs::Dyn(_)))) = (args.first(), args.get(1), args.get(2)) else {
                        unreachable!("__pe_react_keyed(rendered, element, slot)")
                    };
                    // (Only an element or an array is keyed: anything else, a
                    // runtime value among them, stands as it is.)
                    let array = matches!(v, Abs::Ref(a) if matches!(s.heap.get(a), Some(HeapObj::Array(_))));
                    if !Js::is_element(&s.heap, Some(v)) && !array {
                        let v = v.clone();
                        s.top_mut().pc += 1;
                        self.finish_call(s, v, Abs::Undef, ret, pc, out);
                        return Some(Step::Continue);
                    }
                    // (What it stands for: its component, or the context of
                    // the Consumer or Provider it is.)
                    let f = match (self.element_component(s, node), self.consumer_context(s, node), self.provider_context(s, node)) {
                        (Some(f), _, _) => f.to_string(),
                        (None, Some(c), _) => format!("c{c}"),
                        (None, None, Some(p)) => format!("p{p}"),
                        _ => unreachable!("__pe_react_keyed of an element rendered in place"),
                    };
                    // (Where the element is, to React: its key when it has
                    // one, else its place among its siblings; apart, as
                    // React keeps an element's key apart from a place.)
                    let Abs::Ref(n) = node else { unreachable!("__pe_react_keyed of an element") };
                    let HeapObj::Builtin { data: nd, .. } = &s.heap[n] else { unreachable!("__pe_react_keyed of an element") };
                    // (A tree rendered once is never reconciled with another
                    // render: what stands for an element needs no key of its
                    // own, only the element's, should it have one.)
                    if self.first_render_root() {
                        let outer = match &nd[E_KEY] {
                            Abs::Str(k) => Some(Abs::Str(k.clone())),
                            Abs::Num(k) => Some(Abs::Str(k.to_js_string())),
                            k @ Abs::Dyn(_) => Some(k.clone()),
                            _ => None,
                        };
                        let module = nd[E_MODULE].clone();
                        let v = match (outer, v) {
                            (Some(k), Abs::Ref(e)) if Js::is_element(&s.heap, Some(v)) => {
                                let HeapObj::Builtin { data, .. } = s.heap[e].clone() else { unreachable!() };
                                let mut nd = data.to_vec();
                                nd[E_KEY] = match k {
                                    // (A runtime key, when there is one: else its own.)
                                    Abs::Dyn(k) => {
                                        let own = match &data[E_KEY] {
                                            Abs::Null => RExpr::Undef,
                                            o => o.to_rexpr(),
                                        };
                                        Abs::Dyn(RExpr::Opaque("?:".into(), vec![undefined_test(&k), own, k]))
                                    }
                                    k => k,
                                };
                                Abs::Ref(s.alloc(HeapObj::Builtin { kind: ELEMENT.into(), data: nd.into(), ext: None }))
                            }
                            (Some(k), a) if array => self.keyed_fragment(s, module, k, a.clone()),
                            (_, v) => v.clone(),
                        };
                        s.top_mut().pc += 1;
                        self.finish_call(s, v, Abs::Undef, ret, pc, out);
                        return Some(Step::Continue);
                    }
                    let here = key_here(&f, &nd[E_KEY], slot);
                    let module = nd[E_MODULE].clone();
                    match v {
                        Abs::Ref(e) if Js::is_element(&s.heap, Some(v)) => {
                            let HeapObj::Builtin { data, .. } = s.heap[e].clone() else { unreachable!() };
                            let mut nd = data.to_vec();
                            nd[E_KEY] = key_join(&here, &data[E_KEY]);
                            Abs::Ref(s.alloc(HeapObj::Builtin { kind: ELEMENT.into(), data: nd.into(), ext: None }))
                        }
                        // (An array a component rendered: its elements keyed
                        // so, each `here.k`, when each has a key of its own,
                        // else a fragment of it keyed so: React reconciles
                        // either with what stood there as it does the
                        // component's.)
                        a if array => match self.rekeyed_items(s, a, &here) {
                            Some(items) => items,
                            None => self.keyed_fragment(s, module, here, a.clone()),
                        },
                        v => v.clone(),
                    }
                }
                // (Children React renders as they are: a host element's, a
                // fragment's. A component's are props of it, which it may
                // read, clone or drop.)
                HAS_CHILDREN => Abs::Bool(match args.first() {
                    Some(e) if Js::is_element(&s.heap, Some(e)) => {
                        let Abs::Ref(e) = e else { unreachable!() };
                        let HeapObj::Builtin { data, .. } = &s.heap[e] else { unreachable!() };
                        Js::renders_children(&s.heap, data) && (data.get(E_CHILDREN).is_some() || matches!(&data[E_PROPS], Abs::Ref(p) if s.heap[p].own("children").is_some()))
                    }
                    _ => false,
                }),
                WITH_CHILDREN => {
                    let (Some(Abs::Ref(e)), Some(c)) = (args.first(), args.get(1)) else { unreachable!("__pe_react_with_children(element, children)") };
                    let HeapObj::Builtin { data, .. } = s.heap[e].clone() else { unreachable!("__pe_react_with_children of an element") };
                    // (Children given apart: see `E_CHILDREN`.)
                    if data.get(E_CHILDREN).is_some() {
                        let mut nd = data.to_vec();
                        nd[E_CHILDREN] = c.clone();
                        nd[E_SPREAD] = Abs::Bool(matches!(c, Abs::Ref(x) if matches!(s.heap.get(x), Some(HeapObj::Array(_)))));
                        let el = Abs::Ref(s.alloc(HeapObj::Builtin { kind: ELEMENT.into(), data: nd.into(), ext: None }));
                        s.top_mut().pc += 1;
                        self.finish_call(s, el, Abs::Undef, ret, pc, out);
                        return Some(Step::Continue);
                    }
                    let Abs::Ref(p) = &data[E_PROPS] else { unreachable!() };
                    let mut props = s.heap[p].clone();
                    if let HeapObj::Object { props, .. } = &mut props {
                        for pr in props.iter_mut() {
                            if pr.key == "children" {
                                pr.val = PVal::Data(c.clone());
                            }
                        }
                    }
                    let np = s.alloc(props);
                    let mut nd = data.to_vec();
                    nd[E_PROPS] = Abs::Ref(np);
                    // (Children a model array: rebuilt as arguments when
                    // they were.)
                    if !matches!(c, Abs::Ref(x) if matches!(s.heap.get(x), Some(HeapObj::Array(_)))) {
                        nd[E_SPREAD] = Abs::Bool(false);
                    }
                    Abs::Ref(s.alloc(HeapObj::Builtin { kind: ELEMENT.into(), data: nd.into(), ext: None }))
                }
                // (A component is called with no `this`; a callback's item
                // version calls it with its own, which `map` gives it or a
                // `bind` of it bound: see `react_mapped_call`.)
                ROOT => {
                    let item = self.react_building.get().is_some_and(|r| react.item_bodies.borrow().contains(&r));
                    let this = if item { s.top().this.clone() } else { Abs::Undef };
                    return Some(self.call_root(s, args, this, pc, out, ret));
                }
                // (`r` when it is, at runtime, what React renders in place as
                // it renders a component's value; else the element.)
                // (An element `HAS_CHILDREN` holds: its children.)
                CHILDREN => {
                    let Some(Abs::Ref(e)) = args.first() else { unreachable!("__pe_react_children of an element") };
                    let HeapObj::Builtin { data, .. } = &s.heap[e] else { unreachable!("__pe_react_children of an element") };
                    match (data.get(E_CHILDREN), &data[E_PROPS]) {
                        (Some(k), _) => k.clone(),
                        (None, Abs::Ref(p)) => match s.heap[p].own("children").map(|p| p.val.clone()) {
                            Some(PVal::Data(v)) => v,
                            _ => unreachable!("an element HAS_CHILDREN holds has children"),
                        },
                        _ => unreachable!("an element HAS_CHILDREN holds has children"),
                    }
                }
                IS_NODE => Abs::Bool(matches!((args.first(), args.get(1)), (Some(Abs::Ref(a)), Some(Abs::Ref(b))) if a == b)),
                GUARD_NOW => match (args.first(), args.get(1)) {
                    // (An array: what React renders the component's as, a
                    // fragment of it, see `KEYED`.)
                    // (A choice of such: each rendered on its path.)
                    (Some(r), Some(_)) if self.renders_in_place(s, r, 0) => r.clone(),
                    (Some(r), Some(node)) if self.guardable(s, r) => self.react_guarded(s, r, node, pc, out),
                    // (A choice whose sides render so, or are runtime values
                    // that may be text: each side so on its path, the
                    // runtime one behind its own test.)
                    (Some(r @ Abs::Ref(c)), Some(node)) if self.guardable_sides(s, r) => {
                        let Some(HeapObj::Choice { cond, a, b }) = s.heap.get(c).cloned() else { unreachable!("a choice") };
                        let mut side = |js: &Self, s: &mut State, v: Abs| if js.renders_as_text(s, &v) || !v.is_dynamic() { v } else { js.react_guarded(s, &v, node, pc, out) };
                        let a = side(self, s, a);
                        let b = side(self, s, b);
                        Abs::Ref(s.alloc(HeapObj::Choice { cond, a, b }))
                    }
                    (_, Some(node)) => {
                        // (Not rendered in place here: nowhere in this root,
                        // and its body is made again.)
                        if let Some(f) = self.element_component(s, node) {
                            let root = react.root.get().expect("a component renders in place only in a root's body");
                            if react.never.borrow_mut().insert((root, f)) {
                                react.grew.set(true);
                            }
                        }
                        node.clone()
                    }
                    _ => unreachable!("__pe_react_guard_now(rendered, node)"),
                },
                // (A mount's `new type(props, context)`, its code run here.)
                NEW => {
                    let ty = match args.first().cloned().unwrap_or(Abs::Undef) {
                        t @ Abs::Dyn(_) => self.known_callee(s, t),
                        t => t,
                    };
                    let rest = args.get(1..).map(|a| a.to_vec()).unwrap_or_default();
                    let saved = self.probing_known_call.replace(true);
                    let step = self.try_construct(s, ty, rest, pc, out);
                    self.probing_known_call.set(saved);
                    return Some(step.unwrap_or_else(|_| unreachable!("__pe_react_new of a class mountable_class allows")));
                }
                // (`f.call(self, ...args)`, its code run here.)
                INVOKE => {
                    let f = args.first().cloned().unwrap_or(Abs::Undef);
                    let this = args.get(1).cloned().unwrap_or(Abs::Undef);
                    let rest: Vec<Abs> = args.get(2..).map(|a| a.to_vec()).unwrap_or_default();
                    let f = match f {
                        Abs::Dyn(_) => self.known_callee(s, f),
                        f => f,
                    };
                    s.top_mut().ostack.push(f);
                    s.top_mut().ostack.extend(rest.iter().cloned());
                    let saved = self.probing_known_call.replace(true);
                    let step = self.do_call(s, rest.len(), pc, out, this, ret, Abs::Undef);
                    self.probing_known_call.set(saved);
                    return Some(step);
                }
                TRACK => {
                    if let (Some(Abs::Ref(v)), Some(t)) = (args.first(), args.get(1)) {
                        let m = self.mount_of(s, t).expect("__pe_react_track of a mount's class");
                        react.tracked.borrow_mut().insert(*v, m.fid);
                    }
                    Abs::Undef
                }
                FIRST_RENDER => {
                    let node = args.first().cloned().unwrap_or(Abs::Undef);
                    if self.first_render_root() { self.first_render_element(s, node) } else { node }
                }
                RENDER_NOW => return Some(self.render_now(s, args.first().cloned().unwrap_or(Abs::Undef), pc, out, ret)),
                // (A class's `render`: called as React calls it, on the
                // instance the model body runs on.)
                ROOT_METHOD => {
                    let this = s.top().this.clone();
                    return Some(self.call_root(s, args, this, pc, out, ret));
                }
                _ => return None,
            },
            _ => return None,
        };
        s.top_mut().pc += 1;
        self.finish_call(s, v, Abs::Undef, ret, pc, out);
        Some(Step::Continue)
    }

    /// A value a function component may return, known to be one React
    /// renders as is and that rendering it in place keeps apart from what
    /// another component renders there (see `inlinable`): an element (keyed
    /// for the component), a string or number, a boolean or `null`
    /// (nothing). Not `undefined` (React throws), an object with a `render`
    /// method (a factory component's instance), an array (its children would
    /// be reconciled with another's), nor a runtime value.
    fn renderable(heap: &Heap, v: &Abs) -> bool {
        match v {
            Abs::Str(_) | Abs::Num(_) | Abs::Bool(_) | Abs::Null => true,
            Abs::Ref(a) => matches!(heap.get(a), Some(HeapObj::Builtin { kind, .. }) if kind == ELEMENT),
            _ => false,
        }
    }

    /// The source function of the component an element is of, when its
    /// code is known.
    fn element_component(&self, s: &State, e: &Abs) -> Option<usize> {
        let Abs::Ref(e) = e else { return None };
        let Some(HeapObj::Builtin { kind, data, .. }) = s.heap.get(e) else { return None };
        if kind != ELEMENT {
            return None;
        }
        self.plain_function(s, &data[E_TYPE])
            .map(|(f, _)| f)
            .or_else(|| self.simple_class(s, &data[E_TYPE]).map(|c| c.fid))
            .or_else(|| self.mountable_class(s, &data[E_TYPE]).map(|(f, _)| f))
            .or_else(|| self.forward_ref(s, &data[E_TYPE]).map(|(f, _)| f))
    }

    /// `context.k` for a context handle: its Provider and Consumer, handles
    /// too; anything else read at runtime.
    pub(super) fn context_member(&self, s: &mut State, addr: usize, k: &str) -> Abs {
        let HeapObj::Builtin { data, .. } = &s.heap[&addr] else { unreachable!("a context handle") };
        let (id, value) = (data[0].clone(), handle_value(data));
        let read = RExpr::Get(Box::new(value), k.to_string());
        let kind = match k {
            "Provider" => PROVIDER,
            "Consumer" => CONSUMER,
            _ => return Abs::Dyn(read),
        };
        Abs::Ref(s.alloc(HeapObj::Builtin { kind: kind.into(), data: vec![id, Abs::Dyn(read)].into(), ext: None }))
    }

    /// Whether nothing in element `v` reads a context at runtime: host
    /// elements and fragments (known props) all the way down, their children
    /// primitives, such elements, or arrays of them.
    fn reads_no_context(heap: &Heap, v: &Abs, depth: usize) -> bool {
        if depth > 64 {
            return false;
        }
        match v {
            Abs::Str(_) | Abs::Num(_) | Abs::Bool(_) | Abs::Null | Abs::Undef => true,
            Abs::Ref(a) => match heap.get(a) {
                Some(HeapObj::Array(xs)) => (0..xs.len()).all(|i| xs.get(i).is_none_or(|x| Js::reads_no_context(heap, x, depth + 1))),
                Some(HeapObj::Builtin { kind, data, .. }) if kind == ELEMENT => {
                    if !Js::renders_children(heap, data) || data[E_PROPS_KNOWN] != Abs::Bool(true) || matches!(&data[E_TYPE], Abs::Ref(_)) {
                        return false;
                    }
                    match &data[E_PROPS] {
                        Abs::Ref(p) => match heap.get(p) {
                            Some(o @ HeapObj::Object { .. }) => match o.own("children") {
                                None => true,
                                Some(pr) => matches!(&pr.val, PVal::Data(c) if Js::reads_no_context(heap, c, depth + 1)),
                            },
                            _ => false,
                        },
                        _ => false,
                    }
                }
                _ => false,
            },
            _ => false,
        }
    }

    /// The context (its id) whose handle of kind `kind` an element's type is.
    fn context_of(s: &State, e: &Abs, kind: &str) -> Option<usize> {
        let Abs::Ref(e) = e else { return None };
        let Some(HeapObj::Builtin { kind: ek, data, .. }) = s.heap.get(e) else { return None };
        if ek != ELEMENT {
            return None;
        }
        let Abs::Ref(t) = &data[E_TYPE] else { return None };
        match s.heap.get(t)? {
            HeapObj::Builtin { kind: tk, data: td, .. } if tk == kind => match &td[0] {
                Abs::Num(n) => Some(n.f() as usize),
                _ => None,
            },
            _ => None,
        }
    }

    /// The context whose Provider element `e` is (with no ref).
    fn provider_context(&self, s: &State, e: &Abs) -> Option<usize> {
        Js::context_of(s, e, PROVIDER)
    }

    /// The context whose Consumer element `e` is.
    fn consumer_context(&self, s: &State, e: &Abs) -> Option<usize> {
        Js::context_of(s, e, CONSUMER)
    }


    /// An element (`data`) whose children React renders as they are: of a
    /// host component (a string type) or `React.Fragment`.
    fn renders_children(heap: &Heap, data: &BData) -> bool {
        match &data[E_TYPE] {
            Abs::Str(_) => true,
            Abs::Ref(t) if matches!(heap.get(t), Some(HeapObj::Builtin { kind, .. }) if kind == PROVIDER) => true,
            Abs::Dyn(RExpr::Get(b, k)) if k == "Fragment" => {
                matches!(&data[E_MODULE], Abs::Ref(m) if matches!(heap.get(m), Some(HeapObj::Builtin { data: md, .. }) if **b == module_value(md)))
            }
            _ => false,
        }
    }

    pub(super) fn is_element(heap: &Heap, v: Option<&Abs>) -> bool {
        matches!(v, Some(Abs::Ref(e)) if matches!(heap.get(e), Some(HeapObj::Builtin { kind, .. }) if kind == ELEMENT))
    }

    /// The function component an element's type is, when its code is known
    /// and React's contract lets its rendering be its call: a plain function
    /// (not a class, generator or async function, not reading `arguments`,
    /// of one parameter at most: React's legacy context is not modeled)
    /// whose object holds only what it was made with, and the element has no
    /// ref and no key or a known one.
    fn inlinable(&self, s: &State, e: Option<&Abs>) -> bool {
        let Some(Abs::Ref(e)) = e else { return false };
        let Some(HeapObj::Builtin { kind, data, .. }) = s.heap.get(e) else { return false };
        // (A key known: what it renders is keyed by it, see `KEYED`. A first
        // render attaches no ref.)
        let first = self.first_render_root();
        // (A forwardRef's function is given the ref.)
        let forwards = self.forward_ref(s, &data[E_TYPE]).is_some();
        // (React attaches no ref to a function component's element.)
        let refless = data[E_REF] != Abs::Null && self.simple_class(s, &data[E_TYPE]).is_none() && self.plain_function(s, &data[E_TYPE]).is_some();
        if kind != ELEMENT || !matches!(data[E_KEY], Abs::Null | Abs::Str(_) | Abs::Num(_) | Abs::Dyn(_)) || (data[E_REF] != Abs::Null && !first && !forwards && !refless) {
            return false;
        }
        // (A forwardRef's element: its function called with its props and
        // its ref.)
        if let Some((fid, _)) = self.forward_ref(s, &data[E_TYPE]) {
            let root = react_root(self);
            return !self.react.as_ref().is_some_and(|r| r.never.borrow().contains(&(root, fid))) && data[E_PROPS_KNOWN] == Abs::Bool(true);
        }
        let class = self.simple_class(s, &data[E_TYPE]).map(|c| c.fid).or_else(|| if first { self.mountable_class(s, &data[E_TYPE]).map(|(f, _)| f) } else { None });
        let Some(fid) = class.or_else(|| self.plain_function(s, &data[E_TYPE]).map(|(f, _)| f)) else {
            return false;
        };
        // (A simple class, an ES5 one too, renders its render on an
        // instance: see `render_now`.)
        if class.is_some() {
            let root = react_root(self);
            return !self.react.as_ref().is_some_and(|r| r.never.borrow().contains(&(root, fid)))
                && (data[E_PROPS_KNOWN] == Abs::Bool(true) || matches!(data[E_DEFAULTS], Abs::Ref(_)));
        }
        // (Its props as React makes them: see `create_element`.)
        if data[E_PROPS_KNOWN] != Abs::Bool(true) && !matches!(data[E_DEFAULTS], Abs::Ref(_)) {
            return false;
        }
        // (A component is rendered in place everywhere in a root or nowhere:
        // where it renders, React then sees what stands for it in every
        // render, keyed for it, never its element on one path and what it
        // rendered on another.)
        let root = react_root(self);
        !self.react.as_ref().is_some_and(|r| r.never.borrow().contains(&(root, fid)))
            && matches!(self.fn_kinds[fid], FnKind::Normal | FnKind::Arrow)
            && !self.is_async[fid]
            && self.arguments_slot[fid].is_none()
    }

    /// The source function `t` is, when its code is known and React's
    /// contract lets its rendering be its call: its object held, when known,
    /// its own `prototype` as made (no class's) and besides only
    /// `displayName`, `propTypes` (development checks) and `defaultProps` (a
    /// record of primitives); with those defaults. A modeled closure, or a
    /// runtime function of known code (`facts::KnownFn::object`).
    fn plain_function(&self, s: &State, t: &Abs) -> Option<(usize, Vec<(String, Abs)>)> {
        let (fid, object) = match t {
            // (A runtime function known as made too: see `react_as_made`.)
            Abs::Ref(a) => match s.heap.get(a)? {
                HeapObj::Closure { fid, known: true, .. } => (*fid, self.fn_object(*a, &s.heap)),
                // (What `bind` made: its function's code, called with its
                // `this`, as React calls it; an object of its own, holding
                // nothing React reads, see `BOUND` and `LAZY_BOUND`.)
                HeapObj::Builtin { kind, data, .. } if kind == BOUND || kind == LAZY_BOUND => {
                    // (Its function: a closure, or, in a body it is given to,
                    // the variable it arrives in, see `Shape::Handle`.)
                    let fid = match &data[0] {
                        Abs::Ref(f) => match s.heap.get(f)? {
                            HeapObj::Closure { fid, known: true, .. } => *fid,
                            _ => return None,
                        },
                        Abs::Dyn(RExpr::Var(v)) if !self.facts_off => s.facts.get(v)?.callee.as_ref()?.fid,
                        _ => return None,
                    };
                    return matches!(self.fn_kinds[fid], FnKind::Normal).then(|| (fid, Vec::new()));
                }
                _ => return None,
            },
            Abs::Dyn(RExpr::Var(v)) => {
                let kf = s.facts.get(v)?.callee.clone()?;
                (kf.fid, kf.object.clone())
            }
            _ => return None,
        };
        if !object.proto_as_made {
            return None;
        }
        Some((fid, Js::component_statics(&object)?))
    }

    /// The `defaultProps` of a component whose object holds nothing else
    /// React reads when it renders it: a `defaultProps` record of
    /// primitives, if any, and none of the statics of legacy context and of
    /// state (`contextTypes`, `childContextTypes`, `contextType`,
    /// `getDerivedStateFromProps`, `getDerivedStateFromError`); `None`
    /// otherwise. (Others, `displayName`, `propTypes` (development checks)
    /// and the program's own, React does not read.)
    fn component_statics(object: &crate::facts::FnObject) -> Option<Vec<(String, Abs)>> {
        Js::component_statics_with(object, false)
    }

    /// `component_statics`; `derived`: `getDerivedStateFromProps` allowed
    /// (a mount runs it: see `mountable_class`).
    fn component_statics_with(object: &crate::facts::FnObject, derived: bool) -> Option<Vec<(String, Abs)>> {
        let mut defaults = Vec::new();
        for (k, v) in &object.props {
            match (k.as_str(), v) {
                ("defaultProps", Some(crate::facts::FnObjectValue::Record(r))) => {
                    defaults = r.iter().map(|(k, e)| (k.clone(), Abs::from_const_rexpr(e).expect("a record of primitives"))).collect();
                }
                ("getDerivedStateFromProps", _) if derived => {}
                ("defaultProps" | "contextTypes" | "childContextTypes" | "contextType" | "getDerivedStateFromProps" | "getDerivedStateFromError", _) => return None,
                // (A function object of unknown contents: see `fn_object`.)
                ("?", None) => return None,
                _ => {}
            }
        }
        Some(defaults)
    }

    /// The class `t` is when React's rendering of it is its `render` run on
    /// an instance of nothing but its props, context and methods (Prepack's
    /// simple class): a class of known code extending React's `Component`
    /// or `PureComponent`, its constructor not using `this` (no state, no
    /// instance fields), its prototype's methods (as its definition gave
    /// them) a `render` and others, none a lifecycle method, each reading
    /// of `this` only `props`, `context` and those methods, and its object
    /// holding only what `component_statics` allows. Or an ES5 class of one
    /// (`facts::FnObject::es5_class`), its methods what its `prototype` holds.
    fn simple_class(&self, s: &State, t: &Abs) -> Option<SimpleClass> {
        let (fid, object, methods): (usize, crate::facts::FnObject, Vec<(String, Abs)>) = match t {
            Abs::Ref(a) => {
                let Some(HeapObj::Closure { fid, known: true, ident: None, props, .. }) = s.heap.get(a) else { return None };
                let proto = props.iter().find(|p| p.key == "prototype").and_then(|p| match &p.val {
                    PVal::Data(Abs::Ref(r)) => Some(*r),
                    _ => None,
                })?;
                // (An ES5 class's: what its `prototype` holds.)
                let methods = match self.es5_methods(*a, &s.heap) {
                    Some(ms) => ms,
                    None => self.proto_methods[*fid]
                        .iter()
                        .map(|(n, _)| match s.heap.get(&proto).and_then(|o| o.own(n)).map(|p| p.val.clone()) {
                            Some(PVal::Data(v @ Abs::Ref(_))) => Some((n.clone(), v)),
                            _ => None,
                        })
                        .collect::<Option<Vec<_>>>()?,
                };
                (*fid, self.fn_object(*a, &s.heap), methods)
            }
            Abs::Dyn(RExpr::Var(v)) => {
                let kf = s.facts.get(v)?.callee.clone()?;
                let methods = kf
                    .methods
                    .iter()
                    .map(|(n, k)| match k {
                        crate::facts::KnownVal::Expr(e) => (n.clone(), Abs::Dyn(e.clone())),
                        _ => unreachable!("a method is a function's value"),
                    })
                    .collect();
                (kf.fid, kf.object.clone(), methods)
            }
            _ => return None,
        };
        // (A class whose constructor does not use `this`, or an ES5 class,
        // whose constructor is its parent's.)
        let es5 = object.es5_class && matches!(self.fn_kinds[fid], FnKind::Normal);
        let class = matches!(self.fn_kinds[fid], FnKind::ClassCtor { derived: true }) && self.this_reads[fid].as_ref().is_some_and(|r| r.is_empty());
        if !(es5 || class) {
            return None;
        }
        // (Its parent React's: what `React.Component` was read as.)
        let Some(RExpr::Var(p)) = &object.parent else { return None };
        let react_base = matches!(self.declared_types.borrow().get(p), Some((RExpr::Get(_, k), _)) if k == "Component" || k == "PureComponent");
        if !react_base || (class && methods.len() != self.proto_methods[fid].len()) || !methods.iter().any(|(n, _)| n == "render") {
            return None;
        }
        let defaults = Js::component_statics(&object)?;
        let names: Vec<&str> = methods.iter().map(|(n, _)| n.as_str()).collect();
        for (n, m) in &methods {
            if LIFECYCLE.contains(&n.as_str()) {
                return None;
            }
            let mfid = match m {
                Abs::Ref(a) => match s.heap.get(a)? {
                    HeapObj::Closure { fid, .. } => *fid,
                    _ => return None,
                },
                Abs::Dyn(RExpr::Var(v)) => s.facts.get(v)?.callee.as_ref()?.fid,
                _ => return None,
            };
            let reads = self.this_reads[mfid].as_ref()?;
            if !reads.iter().all(|r| r == "props" || r == "context" || names.contains(&r.as_str())) {
                return None;
            }
        }
        Some(SimpleClass { fid, methods, defaults })
    }

    /// A host element as a first render renders it (`FIRST_RENDER`): no
    /// ref (React attaches it after the commit), and, its props known, none
    /// a server does not render: an event handler (`on` and more, as React
    /// DOM's `shouldIgnoreAttribute`) nor a function. (Not a custom
    /// element's, whose attributes are rendered as they are.)
    fn first_render_element(&self, s: &mut State, node: Abs) -> Abs {
        let Abs::Ref(e) = &node else { return node };
        let Some(HeapObj::Builtin { kind, data, .. }) = s.heap.get(e) else { return node };
        if kind != ELEMENT {
            return node;
        }
        let Abs::Str(tag) = &data[E_TYPE] else { return node };
        if tag.contains('-') {
            return node;
        }
        let mut nd = data.to_vec();
        let mut changed = nd[E_REF] != Abs::Null;
        nd[E_REF] = Abs::Null;
        if nd[E_PROPS_KNOWN] == Abs::Bool(true) {
            if let Abs::Ref(p) = &nd[E_PROPS] {
                if let Some(HeapObj::Object { props, proto, class, private, .. }) = s.heap.get(p).cloned() {
                    if props.iter().any(|p| p.key == "is") {
                        return node;
                    }
                    let event = |k: &str| {
                        let b = k.as_bytes();
                        b.len() > 2 && (b[0] == b'o' || b[0] == b'O') && (b[1] == b'n' || b[1] == b'N')
                    };
                    let function = |v: &PVal| match v {
                        PVal::Data(Abs::Ref(f)) => matches!(s.heap.get(f), Some(HeapObj::Closure { .. })),
                        PVal::Data(Abs::Dyn(RExpr::Var(x))) => !self.facts_off && s.facts.get(x).is_some_and(|i| i.types == crate::facts::T_FUNC),
                        _ => false,
                    };
                    let kept: Vec<Prop> = props.iter().filter(|p| p.key == "children" || !(p.key.as_str().is_some_and(event) || function(&p.val))).cloned().collect();
                    if kept.len() != props.len() {
                        changed = true;
                        nd[E_PROPS] = Abs::Ref(s.alloc(HeapObj::Object { props: kept, proto, class, private, extensible: true }));
                    }
                }
            }
        }
        if !changed {
            return node;
        }
        Abs::Ref(s.alloc(HeapObj::Builtin { kind: ELEMENT.into(), data: nd.into(), ext: None }))
    }

    /// Whether what `bind` made at `a`, not yet made at runtime
    /// (`LAZY_BOUND`), is given to a residual function as a handle of what
    /// `bind` makes (`BOUND`): what React reads of it, its statics, then
    /// assumed as made, its variable checked for writes of them (see
    /// `react_statics_written`).
    pub(super) fn react_lazy_bound_passed(&self, a: usize, heap: &Heap) -> bool {
        let Some(react) = &self.react else { return false };
        if !matches!(heap.get(&a), Some(HeapObj::Builtin { kind, .. }) if kind == LAZY_BOUND) || !self.react_trusts_statics() {
            return false;
        }
        react.statics_assumed.set(true);
        react.statics_vars.borrow_mut().insert(self.escape_var(a));
        true
    }

    /// Whether a function React renders (a component), escaped only into
    /// React's API, may be known to hold the statics React reads as it was
    /// made: trusted, unless a pass found the residual writing one (see
    /// `react_check_methods`).
    fn react_trusts_statics(&self) -> bool {
        self.react.as_ref().is_some_and(|r| !r.statics_off.get()) && !env_flag!("PE_NO_REACT_STATICS")
    }

    /// `v`, a capture of a function `React.forwardRef` was given, as what is
    /// known of it after the escape that made it a runtime value, its
    /// object as it was made (assumed: see `react_check_methods`): a
    /// function that escaped is a closure of its code that is that runtime
    /// value (`ident`), its properties as its abstract copy holds them, its
    /// captures so too; a final cell that escaped, one holding what it
    /// holds so, that is that runtime cell (`made`). Anything else as it is.
    fn react_as_made(&self, s: &mut State, v: Abs, depth: usize) -> Abs {
        if depth >= 16 {
            return v;
        }
        match &v {
            Abs::Dyn(RExpr::Var(x)) => {
                let x = *x;
                let Some(a) = self.escape_addr(x).filter(|a| s.escaped.contains(a)) else { return v };
                let Some(HeapObj::Closure { fid, captured, props, proto, once, ident: None, .. }) = s.heap.get(&a).cloned() else { return v };
                let captured = captured.into_iter().map(|c| self.react_as_made(s, c, depth + 1)).collect();
                if let Some(react) = &self.react {
                    react.statics_vars.borrow_mut().insert(x);
                }
                Abs::Ref(s.alloc(HeapObj::Closure { fid, captured, props, proto, known: true, once, ident: Some(x) }))
            }
            Abs::Ref(c) => {
                let c = *c;
                let Some(HeapObj::Object { props, proto, class: ObjClass::FinalCell { .. }, private, .. }) = s.heap.get(&c).cloned() else { return v };
                if !s.escaped.contains(&c) {
                    return v;
                }
                let props = props
                    .into_iter()
                    .map(|mut p| {
                        if let PVal::Data(x) = p.val {
                            p.val = PVal::Data(self.react_as_made(s, x, depth + 1));
                        }
                        p
                    })
                    .collect();
                Abs::Ref(s.alloc(HeapObj::Object { props, proto, class: ObjClass::FinalCell { made: Some(self.escape_var(c)) }, private, extensible: true }))
            }
            _ => v,
        }
    }

    /// `v` as what is known of it after the escape that made it a runtime
    /// value: a closure that escaped (its abstract copy still in the heap,
    /// until the next collection) is a closure of its code that is that
    /// runtime value (`ident`), its captures so too; anything else as it is.
    fn escaped_known_fn(&self, s: &mut State, v: Abs, depth: usize) -> Abs {
        let Abs::Dyn(RExpr::Var(x)) = &v else { return v };
        let x = *x;
        let Some(a) = self.escape_addr(x).filter(|a| depth < 16 && s.escaped.contains(a)) else { return v };
        let Some(HeapObj::Closure { fid, captured, once, ident: None, .. }) = s.heap.get(&a).cloned() else { return v };
        let captured = captured.into_iter().map(|c| self.escaped_known_fn(s, c, depth + 1)).collect();
        Abs::Ref(s.alloc(HeapObj::Closure { fid, captured, props: Vec::new(), proto: INTRINSIC_PROTO, known: false, once, ident: Some(x) }))
    }

    /// The function `React.forwardRef` was given, when `t` is what it made
    /// (`FORWARD_REF`) and that function's code is known and React's
    /// contract lets rendering an element of it be its call
    /// (`render(props, ref)`, no `this`): a plain function or arrow of two
    /// parameters at most, not async, not reading `arguments`. Its fid and
    /// value.
    fn forward_ref(&self, s: &State, t: &Abs) -> Option<(usize, Abs)> {
        let Abs::Ref(h) = t else { return None };
        let Some(HeapObj::Builtin { kind, data, .. }) = s.heap.get(h) else { return None };
        if kind != FORWARD_REF {
            return None;
        }
        let render = data[0].clone();
        let fid = match &render {
            Abs::Ref(c) => match s.heap.get(c)? {
                HeapObj::Closure { fid, .. } => *fid,
                _ => return None,
            },
            Abs::Dyn(RExpr::Var(v)) if !self.facts_off => s.facts.get(v)?.callee.as_ref()?.fid,
            _ => return None,
        };
        (matches!(self.fn_kinds[fid], FnKind::Normal | FnKind::Arrow) && !self.is_async[fid] && self.arguments_slot[fid].is_none() && self.nparams[fid] <= 2)
            .then_some((fid, render))
    }

    /// The static methods a shape of function `fid` carries (`Shape::Fn`):
    /// with React's model, a class component's `getDerivedStateFromProps`
    /// (a mount runs it: see `mountable_class`).
    pub(super) fn carried_statics(&self, fid: usize) -> &'static [&'static str] {
        if self.react.is_some() && matches!(self.fn_kinds[fid], FnKind::ClassCtor { .. }) {
            &["getDerivedStateFromProps"]
        } else {
            &[]
        }
    }

    /// Whether the root whose body is being made renders its tree once
    /// (`firstRenderOnly`): its class components are then mounted in place
    /// (`mountable_class`), and its host elements lose what a first render
    /// does not use (`FIRST_RENDER`).
    fn first_render_root(&self) -> bool {
        self.react.as_ref().is_some_and(|r| r.root.get().is_some_and(|f| r.first_render.borrow().contains(&f)))
    }

    /// The class `t` is (its constructor's fid) when a first render may
    /// mount it in place (`__pe_react_mount`): a class of known code
    /// extending React's `Component` or `PureComponent` (its `super` then
    /// that constructor's model, see `react_super_parent`), with a `render`,
    /// neither a legacy context provider (`getChildContext`) nor an error
    /// boundary (`componentDidCatch`), its object holding only what
    /// `component_statics` allows and `getDerivedStateFromProps`.
    fn mountable_class(&self, s: &State, t: &Abs) -> Option<(usize, Vec<(String, Abs)>)> {
        self.mount_of(s, t).map(|m| (m.fid, m.defaults))
    }

    /// What a mount of class `t` needs (see `mountable_class`): a class
    /// made here (a closure of known code), or a runtime value whose code
    /// is known (`facts::KnownFn`), its methods and the static methods React
    /// reads then known too.
    fn mount_of(&self, s: &State, t: &Abs) -> Option<Mount> {
        let (fid, object, methods, derive, prototype) = match t {
            Abs::Ref(a) => {
                let Some(HeapObj::Closure { fid, known: true, ident: None, props, .. }) = s.heap.get(a) else { return None };
                let prototype = match &props.iter().find(|p| p.key == "prototype")?.val {
                    PVal::Data(p @ Abs::Ref(_)) => p.clone(),
                    _ => return None,
                };
                let names: Vec<String> = self.proto_methods[*fid].iter().map(|(n, _)| n.clone()).collect();
                let derive = match props.iter().find(|p| p.key == "getDerivedStateFromProps").map(|p| &p.val) {
                    None => Abs::Undef,
                    Some(PVal::Data(v @ Abs::Ref(r))) if matches!(s.heap.get(r), Some(HeapObj::Closure { .. })) => v.clone(),
                    Some(_) => return None,
                };
                (*fid, self.fn_object(*a, &s.heap), names, derive, prototype)
            }
            Abs::Dyn(RExpr::Var(v)) => {
                if self.facts_off {
                    return None;
                }
                let kf = s.facts.get(v)?.callee.clone()?;
                // (All its methods known: as its definition gave them.)
                if kf.methods.len() != self.proto_methods[kf.fid].len() {
                    return None;
                }
                let names = kf.methods.iter().map(|(n, _)| n.clone()).collect();
                let derive = match kf.statics.iter().find(|(n, _)| n == "getDerivedStateFromProps") {
                    Some((_, crate::facts::KnownVal::Expr(e))) => Abs::Dyn(e.clone()),
                    Some(_) => return None,
                    // (Not one of its own data properties, or one holding
                    // other than a function: see `carried_statics`.)
                    None if kf.object.props.iter().any(|(k, _)| k == "getDerivedStateFromProps") => return None,
                    None => Abs::Undef,
                };
                (kf.fid, kf.object.clone(), names, derive, Abs::Dyn(RExpr::Get(Box::new(RExpr::Var(*v)), "prototype".into())))
            }
            _ => return None,
        };
        if self.fn_kinds[fid] != (FnKind::ClassCtor { derived: true }) {
            return None;
        }
        let Some(RExpr::Var(p)) = &object.parent else { return None };
        if !self.react_component_var(*p) {
            return None;
        }
        if !methods.iter().any(|n| n == "render") || methods.iter().any(|n| n == "getChildContext" || n == "componentDidCatch") {
            return None;
        }
        let defaults = Js::component_statics_with(&object, true)?;
        Some(Mount { fid, defaults, derive, prototype })
    }

    /// Whether reading a property of `o` runs nothing (React's contract:
    /// its module's members are data properties): `o` a variable defined
    /// as `require("react")` (`defs`: the residual's definitions).
    pub(super) fn react_pure_read(&self, o: &RExpr, defs: &HashMap<usize, RExpr>) -> bool {
        let RExpr::Var(m) = o else { return false };
        matches!(defs.get(m), Some(RExpr::Call(c, args)) if matches!(&**c, RExpr::Global(g) if g == "require")
            && matches!(args.as_slice(), [RExpr::Str(n)] if NAMES.contains(&n.as_str())))
    }

    /// Whether `callee` is a function of React's model (`react_model.js`):
    /// one that meets a choice knowing it is one (`__pe_react_is_choice`).
    pub(super) fn react_model_callee(&self, s: &State, callee: &Abs) -> bool {
        let Some(react) = &self.react else { return false };
        matches!(callee, Abs::Ref(c) if matches!(s.heap.get(c), Some(HeapObj::Closure { fid, .. }) if react.model_fn(*fid).is_some() || self.names[*fid].starts_with("__pe_react_")))
    }

    /// `c ? t : f` of two runtime functions whose code is known (component
    /// types, `Type = c ? A : B`), with React's model: closures of their
    /// code that are those values (`known_callee`), the sides of a choice an
    /// element of it renders each of (`create_element`); anything else that
    /// meets the choice makes it escape, as `c ? t : f`.
    pub(super) fn react_fn_choice(&self, s: &mut State, t: &Abs, f: &Abs) -> Option<(Abs, Abs)> {
        self.react.as_ref()?;
        // (Or a closure of its code that is that value, already.)
        let known = |v: &Abs| match v {
            Abs::Dyn(RExpr::Var(x)) => !self.facts_off && s.facts.get(x).is_some_and(|i| i.callee.is_some()),
            Abs::Ref(c) => matches!(s.heap.get(c), Some(HeapObj::Closure { ident: Some(_), .. })),
            _ => false,
        };
        if !(known(t) && known(f)) || t == f {
            return None;
        }
        Some((self.known_callee(s, t.clone()), self.known_callee(s, f.clone())))
    }

    /// Whether `callee` is `React.createElement`, whose children may be
    /// choices (an element holds one; rendering it renders each side).
    pub(super) fn react_choice_child_callee(&self, s: &State, callee: &Abs) -> bool {
        self.pure_model_callee(s, callee)
    }

    /// Whether calling `callee` only makes a value of this module's (no
    /// code of the program runs, nothing is written, no runtime operation):
    /// `React.createElement` (see `Js::try_if_convert`).
    ///
    /// (Only in a root's model body, whose reconciler renders the choices
    /// the arms meet in: elsewhere a choice of elements is made of both,
    /// each made whichever is chosen.)
    pub(super) fn pure_model_callee(&self, s: &State, callee: &Abs) -> bool {
        self.react.is_some()
            && self.react_building.get().is_some()
            && matches!(callee, Abs::Ref(c) if matches!(s.heap.get(c), Some(HeapObj::Builtin { kind, .. }) if kind == CREATE_ELEMENT || kind == CLONE_ELEMENT))
    }

    /// What React's contract says a runtime call of `callee` returns: an
    /// element (an object) for `React.createElement` (made at runtime when
    /// its inputs are not known).
    pub(super) fn react_call_result_info(&self, s: &State, callee: &Abs) -> Option<Info> {
        self.react.as_ref()?;
        let Abs::Ref(c) = callee else { return None };
        match s.heap.get(c)? {
            HeapObj::Builtin { kind, .. } if kind == CREATE_ELEMENT || kind == CLONE_ELEMENT => Some(Info { types: crate::facts::T_OBJ, truthy: Some(true), ..Info::top() }),
            _ => None,
        }
    }

    /// Whether a component's value `v` may stand for its element behind a
    /// runtime test (`GUARDED`): a runtime value not known to be an object
    /// (one React renders as it would not the component's, so the test
    /// would always fail).
    ///
    /// (Only one that may be text: its facts include a string, number or
    /// boolean and are not unknown, or its expression has a constant of
    /// those as an outcome, `x || "none"`. A value of no known kind, a
    /// runtime call's, is no bet worth the component's running twice.)
    fn guardable(&self, s: &State, v: &Abs) -> bool {
        use crate::facts::{T_ALL, T_BOOL, T_NUM, T_STR};
        let Abs::Dyn(e) = v else { return false };
        fn text_outcome(e: &RExpr) -> bool {
            match e {
                RExpr::Str(_) | RExpr::Num(_) | RExpr::Bool(_) => true,
                RExpr::Opaque(op, xs) if op == "||" || op == "&&" || op == "??" => xs.iter().any(text_outcome),
                RExpr::Opaque(op, xs) if op == "?:" && xs.len() == 3 => text_outcome(&xs[1]) || text_outcome(&xs[2]),
                _ => false,
            }
        }
        let by_facts = self.info_abs(s, v).is_some_and(|i| i.types != T_ALL && i.types & (T_STR | T_NUM | T_BOOL) != 0);
        // (A variable an if-converted choice is held in: that choice.)
        let def = match e {
            RExpr::Var(x) => self.declared_types.borrow().get(x).map(|(d, _)| d.clone()),
            _ => None,
        };
        by_facts || text_outcome(e) || def.as_ref().is_some_and(text_outcome)
    }

    /// Whether `v` is a choice whose sides each render in place as text
    /// (no element in what stands there) or are a runtime value that may
    /// be text (its facts do not rule text out; see `react_guarded`).
    ///
    /// (Not an element in place on one side: where the other side's value
    /// is not text, its element stands there, which renders that value;
    /// were it an element of the same type as the first side's, React
    /// would update it from one to the other where the original renders
    /// the component, but here remount it, its key apart.)
    fn guardable_sides(&self, s: &State, v: &Abs) -> bool {
        use crate::facts::{T_BOOL, T_NUM, T_STR};
        let Abs::Ref(c) = v else { return false };
        let Some(HeapObj::Choice { a, b, .. }) = s.heap.get(c) else { return false };
        let text = |x: &Abs| matches!(x, Abs::Str(_) | Abs::Num(_) | Abs::Bool(_) | Abs::Null) || self.renders_as_text(s, x);
        let ok = |x: &Abs| text(x) || (matches!(x, Abs::Dyn(_)) && self.info_abs(s, x).is_some_and(|i| i.types & (T_STR | T_NUM | T_BOOL) != 0));
        ok(a) && ok(b)
    }

    /// What stands for element `node`, its component having rendered the
    /// runtime value `r`: `r` where at runtime it is text, a number, a
    /// boolean or null (what React renders as the component's), else the
    /// element, made only then.
    fn react_guarded(&self, s: &mut State, r: &Abs, node: &Abs, pc: usize, out: &mut Vec<Op>) -> Abs {
        let mut escaped = std::collections::HashSet::new();
        let rv = match self.operand_rexpr(s, r, &mut escaped, out) {
            e @ RExpr::Var(_) => e,
            e => {
                let t = self.aux_var(59, pc, out.len());
                self.emit_temp(s, t, e, pc, out);
                RExpr::Var(t)
            }
        };
        // (The element made only where it is used: its `createElement` call
        // inside the choice.)
        let el = match node {
            Abs::Ref(e) => match s.heap.get(e).cloned() {
                Some(HeapObj::Builtin { kind, data, .. }) if kind == ELEMENT => {
                    let heap = s.heap.clone();
                    let mut pre = Vec::new();
                    let mut parts = Vec::new();
                    let _ = self.react_value_expr(&kind, *e, &data, &heap, &mut pre, &mut |v| {
                        parts.push(v.clone());
                        RExpr::Undef
                    });
                    let mats: Vec<RExpr> = parts.iter().map(|v| self.operand_rexpr(s, v, &mut escaped, out)).collect();
                    let mut it = mats.into_iter();
                    let mut pre = Vec::new();
                    let x = self.react_value_expr(&kind, *e, &data, &heap, &mut pre, &mut |_| it.next().expect("the same parts, in order"));
                    out.extend(pre);
                    x
                }
                _ => self.operand_rexpr(s, node, &mut escaped, out),
            },
            _ => self.operand_rexpr(s, node, &mut escaped, out),
        };
        let is = |t: &str| RExpr::Bin(Bop::Eq, Box::new(RExpr::Opaque("typeof".into(), vec![rv.clone()])), Box::new(RExpr::Str(t.into())));
        let or = |x: RExpr, y: RExpr| RExpr::Opaque("||".into(), vec![x, y]);
        let test = or(or(or(is("string"), is("number")), is("boolean")), RExpr::Bin(Bop::Eq, Box::new(rv.clone()), Box::new(RExpr::Null)));
        Abs::Dyn(RExpr::Opaque("?:".into(), vec![test, rv, el]))
    }

    /// The array `items` with each element's key prefixed with `here`
    /// (`here.k`), when each is an element with a static key of its own.
    fn rekeyed_items(&self, s: &mut State, items: &Abs, here: &Abs) -> Option<Abs> {
        let Abs::Ref(a) = items else { return None };
        let Some(HeapObj::Array(arr)) = s.heap.get(a).cloned() else { return None };
        let mut out = Vec::with_capacity(arr.elems.len());
        for e in arr.elems.iter() {
            let Abs::Ref(x) = e else { return None };
            // (A nested array, as React renders it, a fragment within: its
            // elements so too.)
            if matches!(s.heap.get(x), Some(HeapObj::Array(_))) {
                out.push(self.rekeyed_items(s, e, here)?);
                continue;
            }
            let Some(HeapObj::Builtin { kind, data, .. }) = s.heap.get(x).cloned() else { return None };
            if kind != ELEMENT {
                return None;
            }
            // (A key of its own, known: a runtime one may be none, which
            // would leave it keyed as its siblings are.)
            if !matches!(&data[E_KEY], Abs::Str(_) | Abs::Num(_)) {
                return None;
            }
            let mut nd = data.to_vec();
            nd[E_KEY] = key_join(here, &data[E_KEY]);
            out.push(Abs::Ref(s.alloc(HeapObj::Builtin { kind: ELEMENT.into(), data: nd.into(), ext: None })));
        }
        if !arr.props.is_empty() || !arr.holes.is_empty() {
            return None;
        }
        Some(Abs::Ref(s.alloc(HeapObj::Array(ArrayObj::from(out.into_iter().collect::<Vec<_>>())))))
    }

    /// Whether a component's value `v` renders in place as React renders
    /// the component's: an element, text, a number, a boolean or null
    /// (`renderable`, or a runtime value known to be one), an array (see
    /// `KEYED`), or a choice of such.
    fn renders_in_place(&self, s: &State, v: &Abs, depth: usize) -> bool {
        if Js::renderable(&s.heap, v) || self.renders_as_text(s, v) {
            return true;
        }
        let Abs::Ref(a) = v else { return false };
        match s.heap.get(a) {
            Some(HeapObj::Array(_)) => true,
            Some(HeapObj::Choice { a, b, .. }) if depth < 16 => self.renders_in_place(s, a, depth + 1) && self.renders_in_place(s, b, depth + 1),
            _ => false,
        }
    }

    /// `<React.Fragment key={key}>{...items}</React.Fragment>` of React's
    /// module `module` (its handle), the array `items` its children.
    fn keyed_fragment(&self, s: &mut State, module: Abs, key: Abs, items: Abs) -> Abs {
        let Abs::Ref(m) = &module else { unreachable!("an element's module is a handle") };
        let HeapObj::Builtin { data: md, .. } = &s.heap[m] else { unreachable!("an element's module is a handle") };
        let ty = Abs::Dyn(RExpr::Get(Box::new(module_value(md)), "Fragment".into()));
        let props = s.alloc(HeapObj::Object { props: vec![Prop::data("children", items)], proto: INTRINSIC_PROTO, class: ObjClass::Ordinary, private: Vec::new(), extensible: true });
        let data = vec![module, ty, key, Abs::Null, Abs::Ref(props), Abs::Bool(true), Abs::Bool(true), Abs::Undef];
        Abs::Ref(s.alloc(HeapObj::Builtin { kind: ELEMENT.into(), data: data.into(), ext: None }))
    }

    /// Whether `v` is a runtime value known to be one React renders in place
    /// as it renders a component's (a string, a number, a boolean, null).
    fn renders_as_text(&self, s: &State, v: &Abs) -> bool {
        use crate::facts::{T_BOOL, T_NULL, T_NUM, T_STR};
        v.is_dynamic() && self.info_abs(s, v).is_some_and(|i| i.types != 0 && i.types & !(T_STR | T_NUM | T_BOOL | T_NULL) == 0)
    }

    /// `p.k` of a variable holding React's props (`props_vars`): the value
    /// read once, into a variable, that the path knows `p.k` is from then
    /// on (`facts::Info::fixed`: props are read-only).
    ///
    /// (`known`: what the path knows of `p.k`, the variable's then.)
    pub(super) fn react_props_read(&self, s: &mut State, p: usize, k: &str, known: Option<Info>, pc: usize, out: &mut Vec<Op>) -> Option<Abs> {
        let react = self.react.as_ref()?;
        if self.facts_off || !react.props_vars.borrow().contains(&p) {
            return None;
        }
        let t = self.aux_var(62, pc, p);
        let read = RExpr::Get(Box::new(RExpr::Var(p)), k.to_string());
        if let Some(pi) = known {
            self.declared_types.borrow_mut().insert(t, (read.clone(), pi));
        }
        self.emit_temp(s, t, read, pc, out);
        let mut info = s.facts.get(&p).cloned().unwrap_or_else(Info::top);
        info.fixed.push((k.to_string(), RExpr::Var(t)));
        s.facts.insert(p, info);
        Some(Abs::Dyn(RExpr::Var(t)))
    }

    /// What is known of props React passes: an object on which `key` and
    /// `ref` read `undefined` (React's element props never hold them), for
    /// good (props are read-only, so no code changes what they hold, see
    /// `react_props_read`).
    fn react_props_info() -> Info {
        let undef = Info::of_const(&RExpr::Undef).expect("undefined is a constant");
        Info {
            types: crate::facts::T_OBJ,
            truthy: Some(true),
            props: vec![("key".to_string(), undef.clone()), ("ref".to_string(), undef)],
            fixed: vec![("key".to_string(), RExpr::Undef), ("ref".to_string(), RExpr::Undef)],
            ..Info::top()
        }
    }

    /// `this.props` in the body of a class root's `render` (`this` the
    /// instance React renders, and its methods' it calls on it): the props
    /// React set on the instance before rendering it (React's contract:
    /// no code assigns `this.props`), read here, known as a root's props
    /// are (`react_props_info`, read once: `props_vars`).
    pub(super) fn react_this_props(&self, s: &mut State, pc: usize, out: &mut Vec<Op>) -> Option<Abs> {
        let react = self.react.as_ref()?;
        self.react_building.get()?;
        if self.facts_off || !react.methods.borrow().contains(&react_root(self)) {
            return None;
        }
        let t = self.aux_var(63, pc, 0);
        self.emit_temp(s, t, RExpr::Get(Box::new(RExpr::This), "props".into()), pc, out);
        // (What the assignment is tracked as: see `track_defs_inner`.)
        self.pending_info.borrow_mut().insert(t, Js::react_props_info());
        s.facts.insert(t, Js::react_props_info());
        react.props_vars.borrow_mut().insert(t);
        Some(Abs::Dyn(RExpr::Var(t)))
    }

    /// Whether runtime variable `p` holds React's `Component` or
    /// `PureComponent` (read from its module: see `module_member`).
    fn react_component_var(&self, p: usize) -> bool {
        !self.facts_off && matches!(self.declared_types.borrow().get(&p), Some((RExpr::Get(_, k), i)) if (k == "Component" || k == "PureComponent") && i.ordinary)
    }

    /// `super(...)` in the constructor of a class `__pe_react_mount` makes
    /// (its activation, the mount's `new`), its parent React's `Component`:
    /// `this` made with the class's `prototype`, and that constructor's
    /// model (`__pe_react_component`), React's code, run on it.
    pub(super) fn react_super(&self, s: &mut State, parent: &Abs, args: &[Abs], pc: usize, out: &mut Vec<Op>) -> Option<Step<Js>> {
        let react = self.react.as_ref()?;
        let n = s.frames.len();
        if n < 2 || !matches!(s.top().ret, RetMode::Construct) || s.frames[n - 2].func != react.model[MOUNT] {
            return None;
        }
        let nt = (*s.top().new_target).clone();
        let ty = match &nt {
            Abs::Ref(c) => match s.heap.get(c) {
                Some(HeapObj::Closure { ident: Some(v), .. }) => Abs::Dyn(RExpr::Var(*v)),
                _ => nt.clone(),
            },
            _ => return None,
        };
        let m = self.mount_of(s, &ty);
        if env_flag!("REACT_DEBUG") {
            eprintln!("[REACT] super of a mount: {:?} mountable={}", ty, m.is_some());
        }
        let m = m?;
        // (Its parent, as its definition gave it: React's `Component`.)
        let _ = parent;
        let obj = s.alloc(HeapObj::Object { props: Vec::new(), proto: m.prototype, class: ObjClass::Ordinary, private: Vec::new(), extensible: true });
        self.creation_pc.borrow_mut().insert(obj, pc);
        let component = Abs::Ref(s.alloc(HeapObj::Closure {
            fid: react.model[COMPONENT],
            captured: vec![],
            props: vec![],
            proto: INTRINSIC_PROTO,
            known: true,
            once: false,
            ident: None,
        }));
        s.top_mut().ostack.push(component);
        s.top_mut().ostack.extend(args.iter().cloned());
        let saved = self.probing_known_call.replace(true);
        let step = self.do_call(s, args.len(), pc, out, Abs::Ref(obj), RetMode::SuperConstruct, nt);
        self.probing_known_call.set(saved);
        Some(step)
    }

    /// Whether runtime object `e` is one whose properties React's contract
    /// tells, all data properties: React's `Component.prototype` (or
    /// `PureComponent`'s), or the `prototype` of a class of known code
    /// extending one, as its definition left it (see `react_proto_member`).
    /// An assignment to an object inheriting from it then makes or updates
    /// its own data property.
    pub(super) fn react_data_proto(&self, s: &State, e: &RExpr) -> bool {
        if self.react.is_none() || !self.pristine("Object") {
            return false;
        }
        let mut e = e.clone();
        for _ in 0..64 {
            let next = match &e {
                RExpr::Get(c, p) if p == "prototype" => match &**c {
                    RExpr::Var(c) if self.react_component_var(*c) => return true,
                    RExpr::Var(v) => match (!self.facts_off).then(|| s.facts.get(v).and_then(|i| i.callee.clone())).flatten() {
                        Some(kf) if matches!(self.fn_kinds[kf.fid], FnKind::ClassCtor { .. }) && kf.object.class_proto => match &kf.object.parent {
                            Some(p) => RExpr::Get(Box::new(p.clone()), "prototype".into()),
                            None => return false,
                        },
                        _ => return false,
                    },
                    _ => return false,
                },
                RExpr::Var(t) => match self.declared_types.borrow().get(t) {
                    Some((g @ RExpr::Get(_, p), _)) if p == "prototype" => g.clone(),
                    _ => return false,
                },
                _ => return false,
            };
            e = next;
        }
        false
    }

    /// `o.k` read through `o`'s prototype chain (none of it holding `k`)
    /// from a runtime object known here: React's `Component.prototype` (or
    /// `PureComponent`'s) as `react` defines it (React's contract: its
    /// `setState` and `forceUpdate` their models, `__pe_react_set_state`,
    /// `isReactComponent` read at runtime, nothing else but what
    /// `Object.prototype` has); the `prototype` of a class whose code is
    /// known (`facts::KnownFn`), extending one, as its definition left it
    /// (its methods, its `constructor`); or, `o` a class, React's `Component`
    /// itself (nothing but what `Function.prototype` has). `None` for any
    /// other chain.
    pub(super) fn react_proto_member(&self, s: &mut State, addr: usize, k: &str) -> Option<Abs> {
        let react = self.react.as_ref()?;
        let mut cur = addr;
        let (end, is_fn) = loop {
            let o = s.heap.get(&cur)?;
            if o.own(k).is_some() {
                return None;
            }
            match o {
                HeapObj::Object { proto: Abs::Ref(p), .. } | HeapObj::Closure { proto: Abs::Ref(p), known: true, .. } => cur = *p,
                HeapObj::Object { proto: Abs::Dyn(e), .. } => break (e.clone(), false),
                HeapObj::Closure { proto: Abs::Dyn(e), known: true, .. } => break (e.clone(), true),
                _ => return None,
            }
        };
        if is_fn {
            let RExpr::Var(c) = &end else { return None };
            if !self.react_component_var(*c) || !self.pristine("Function") || is_function_own_or_proto_member(k) || is_object_proto_member(k) {
                return None;
            }
            return Some(Abs::Undef);
        }
        // (A class's `prototype`: its methods, then its parent's.)
        let mut end = end;
        if let RExpr::Get(c, p) = &end {
            if let (RExpr::Var(v), "prototype") = (&**c, p.as_str()) {
                if let Some(kf) = (!self.facts_off).then(|| s.facts.get(v).and_then(|i| i.callee.clone())).flatten() {
                    if matches!(self.fn_kinds[kf.fid], FnKind::ClassCtor { .. }) && kf.object.class_proto && kf.methods.len() == self.proto_methods[kf.fid].len() {
                        if k == "constructor" {
                            return Some(Abs::Dyn(RExpr::Var(*v)));
                        }
                        if let Some((_, crate::facts::KnownVal::Expr(m))) = kf.methods.iter().find(|(n, _)| n == k) {
                            return Some(Abs::Dyn(m.clone()));
                        }
                        let parent = kf.object.parent.clone()?;
                        end = RExpr::Get(Box::new(parent), "prototype".into());
                    }
                }
            }
        }
        let component = match &end {
            RExpr::Get(c, p) if p == "prototype" => matches!(&**c, RExpr::Var(c) if self.react_component_var(*c)),
            RExpr::Var(t) => matches!(self.declared_types.borrow().get(t), Some((RExpr::Get(c, p), _)) if p == "prototype" && matches!(&**c, RExpr::Var(c) if self.react_component_var(*c))),
            _ => false,
        };
        if !component || !self.pristine("Object") || is_object_proto_member(k) {
            return None;
        }
        let model = |name: &str| HeapObj::Closure { fid: react.model[name], captured: vec![], props: vec![], proto: INTRINSIC_PROTO, known: true, once: false, ident: None };
        Some(match k {
            "setState" => Abs::Ref(s.alloc(model(SET_STATE))),
            "forceUpdate" => Abs::Ref(s.alloc(model(FORCE_UPDATE))),
            "isReactComponent" => return None,
            _ => Abs::Undef,
        })
    }

    /// `__pe_react_render_now(element)`: what React renders for an element
    /// rendered in place (`inlinable`): its function component called with
    /// its props, no `this`; or its simple class's `render` run on an
    /// instance of its props, an empty context and its methods.
    fn render_now(&self, s: &mut State, node: Abs, pc: usize, out: &mut Vec<Op>, ret: RetMode) -> Step<Js> {
        let Abs::Ref(e) = &node else { unreachable!("__pe_react_render_now of an element") };
        let HeapObj::Builtin { data, .. } = s.heap[e].clone() else { unreachable!("__pe_react_render_now of an element") };
        let props = if data[E_PROPS_KNOWN] == Abs::Bool(true) {
            data[E_PROPS].clone()
        } else {
            let p = self.element_props(s, *e, pc, out).expect("an element rendered in place has props React makes");
            // (What is known of them, now: the call runs in this step, before
            // `track_defs` would learn it.)
            if let Abs::Dyn(RExpr::Var(v)) = &p {
                if let Some((_, info)) = self.declared_types.borrow().get(v).filter(|_| !self.facts_off) {
                    s.facts.insert(*v, info.clone());
                }
            }
            p
        };
        let ty = data[E_TYPE].clone();
        // (A class a first render mounts: `__pe_react_mount(type, props,
        // context, getDerivedStateFromProps)`, React's legacy context an
        // empty object.)
        // (A forwardRef's: `render(props, ref)`, React's own call.)
        if let Some((_, render)) = self.forward_ref(s, &ty) {
            let callee = match render {
                Abs::Dyn(_) => self.known_callee(s, render),
                r => r,
            };
            s.top_mut().ostack.push(callee);
            s.top_mut().ostack.extend([props, data[E_REF].clone()]);
            let saved = self.probing_known_call.replace(true);
            let step = self.do_call(s, 2, pc, out, Abs::Undef, ret, Abs::Undef);
            self.probing_known_call.set(saved);
            return step;
        }
        let mount = if self.simple_class(s, &ty).is_none() && self.first_render_root() { self.mount_of(s, &ty) } else { None };
        if let Some(m) = mount {
            let react = self.react.as_ref().expect("--react");
            let context = Abs::Ref(s.alloc(HeapObj::Object { props: vec![], proto: INTRINSIC_PROTO, class: ObjClass::Ordinary, private: Vec::new(), extensible: true }));
            let mount = Abs::Ref(s.alloc(HeapObj::Closure { fid: react.model[MOUNT], captured: vec![], props: vec![], proto: INTRINSIC_PROTO, known: true, once: false, ident: None }));
            s.top_mut().ostack.push(mount);
            s.top_mut().ostack.extend([ty, props, context, m.derive]);
            let saved = self.probing_known_call.replace(true);
            let step = self.do_call(s, 4, pc, out, Abs::Undef, ret, Abs::Undef);
            self.probing_known_call.set(saved);
            return step;
        }
        let (callee, this, args) = match self.simple_class(s, &ty) {
            Some(c) => {
                let context = Abs::Ref(s.alloc(HeapObj::Object { props: vec![], proto: INTRINSIC_PROTO, class: ObjClass::Ordinary, private: Vec::new(), extensible: true }));
                let mut iprops = vec![Prop::data("props", props), Prop::data("context", context)];
                let mut render = None;
                for (n, m) in &c.methods {
                    if n == "render" {
                        render = Some(m.clone());
                    }
                    iprops.push(Prop::data(n.clone(), m.clone()));
                }
                let instance = Abs::Ref(s.alloc(HeapObj::Object { props: iprops, proto: INTRINSIC_PROTO, class: ObjClass::Ordinary, private: Vec::new(), extensible: true }));
                let render = render.expect("a simple class has a render");
                let callee = match render {
                    Abs::Dyn(_) => self.known_callee(s, render),
                    r => r,
                };
                (callee, instance, vec![])
            }
            None => {
                let fid = self.plain_function(s, &ty).map(|(f, _)| f);
                let callee = match ty {
                    Abs::Dyn(_) => self.known_callee(s, ty),
                    t => t,
                };
                // (A function component of no `contextTypes` (see
                // `plain_function`) is given React's empty legacy context.)
                if fid.is_some_and(|f| self.nparams[f] >= 2) {
                    let context = Abs::Ref(s.alloc(HeapObj::Object { props: vec![], proto: INTRINSIC_PROTO, class: ObjClass::Ordinary, private: Vec::new(), extensible: true }));
                    (callee, Abs::Undef, vec![props, context])
                } else {
                    (callee, Abs::Undef, vec![props])
                }
            }
        };
        s.top_mut().ostack.push(callee);
        s.top_mut().ostack.extend(args.iter().cloned());
        // (Its code runs here even when it branches, as a root's does: see
        // `call_root`.)
        let saved = self.probing_known_call.replace(true);
        let step = self.do_call(s, args.len(), pc, out, this, ret, Abs::Undef);
        self.probing_known_call.set(saved);
        step
    }

    /// `React.createElement(type, config, ...children)` as an element, when
    /// what it does is known (see the module comment); `None` otherwise.
    fn create_element(&self, s: &mut State, module: Abs, args: &[Abs], pc: usize, out: &mut Vec<Op>) -> Option<Abs> {
        if let Some(made) = self.react_runtime_config(s, &module, args, pc, out) {
            return Some(made);
        }
        // (A config's runtime key, as React takes it, once, when the element
        // is made: a string, or `undefined` for none.)
        let key = match args.get(1) {
            Some(Abs::Ref(c)) => match s.heap.get(c).and_then(|o| o.own("key")).map(|p| (p.attrs & ENUMERABLE != 0, p.val.clone())) {
                Some((true, PVal::Data(Abs::Dyn(e)))) => Some((self.aux_var(64, pc, 0), e)),
                _ => None,
            },
            _ => None,
        };
        let made = self.create_element_keyed(s, module, args, key.as_ref().map(|(k, _)| Abs::Dyn(RExpr::Var(*k))))?;
        if let Some((k, e)) = key {
            let coerced = RExpr::Bin(Bop::Add, Box::new(RExpr::Str(String::new())), Box::new(e.clone()));
            self.emit_temp(s, k, RExpr::Opaque("?:".into(), vec![undefined_test(&e), RExpr::Undef, coerced]), pc, out);
        }
        Some(made)
    }

    /// `React.createElement(type, config, ...children)` of a function
    /// component whose code is known (`plain_function`, or what
    /// `React.forwardRef` made of one, given the ref) and a runtime
    /// config not known to give no key or ref: made as React makes it, its
    /// ref, then its key, read then (a runtime one, see `create_element`),
    /// its props made then as React makes them (`__pe_reactProps`, the
    /// children given materialized into them). A function component is
    /// rendered without its ref (React attaches none to one), so it renders
    /// in place; made at runtime, it is made of those props, key and ref.
    fn react_runtime_config(&self, s: &mut State, module: &Abs, args: &[Abs], pc: usize, out: &mut Vec<Op>) -> Option<Abs> {
        if args.len() < 2 || self.facts_off || !self.pristine("Object") {
            return None;
        }
        let Abs::Dyn(c) = &args[1] else { return None };
        let ty = args[0].clone();
        // (Or what `React.forwardRef` made: its function given the ref.)
        let (_, defaults) = self.plain_function(s, &ty).or_else(|| self.forward_ref(s, &ty).map(|(f, _)| (f, Vec::new())))?;
        // (One known to give no key or ref, with no children: React's props
        // spread, the config standing for its props, see
        // `create_element_keyed`.)
        if let RExpr::Var(v) = c {
            let undef = |k: &str| {
                s.facts.get(v).is_some_and(|i| i.props.iter().any(|(pk, pi)| pk == k && pi.eq == Some(RExpr::Undef)) || i.fixed.iter().any(|(pk, e)| pk == k && *e == RExpr::Undef))
            };
            if args.len() == 2 && undef("key") && undef("ref") {
                return None;
            }
        }
        if env_flag!("PE_NO_REACT_RUNTIME_CONFIG") {
            return None;
        }
        let c = match c {
            RExpr::Var(_) => c.clone(),
            e => {
                let t = self.aux_var(68, pc, 0);
                self.emit_temp(s, t, e.clone(), pc, out);
                RExpr::Var(t)
            }
        };
        // (Read as React reads it, when it is not null: `ref`, then `key`.)
        let read = |k: &str| RExpr::Opaque("?:".into(), vec![RExpr::Opaque("==".into(), vec![c.clone(), RExpr::Null]), RExpr::Undef, RExpr::Get(Box::new(c.clone()), k.into())]);
        let r = self.aux_var(68, pc, 1);
        self.emit_temp(s, r, read("ref"), pc, out);
        let raw = self.aux_var(68, pc, 2);
        self.emit_temp(s, raw, read("key"), pc, out);
        let k = self.aux_var(68, pc, 3);
        let coerced = RExpr::Bin(Bop::Add, Box::new(RExpr::Str(String::new())), Box::new(RExpr::Var(raw)));
        self.emit_temp(s, k, RExpr::Opaque("?:".into(), vec![undefined_test(&RExpr::Var(raw)), RExpr::Undef, coerced]), pc, out);
        let mut escaped = std::collections::HashSet::new();
        let children = &args[2..];
        let kids = match children.len() {
            0 => RExpr::Undef,
            1 => self.operand_rexpr(s, &children[0], &mut escaped, out),
            _ => RExpr::ArrayLit(children.iter().map(|x| self.operand_rexpr(s, x, &mut escaped, out)).collect()),
        };
        let defaults = if defaults.is_empty() { RExpr::Undef } else { RExpr::ObjectLit(defaults.iter().map(|(k, v)| (k.clone(), v.to_rexpr())).collect()) };
        let p = self.aux_var(68, pc, 4);
        let made = RExpr::Call(Box::new(RExpr::Global("__pe_reactProps".into())), vec![c, kids, RExpr::Num(JsNum::int(children.len() as i64)), defaults]);
        self.emit_temp(s, p, made, pc, out);
        // (React's props: no key nor ref, read-only.)
        self.pending_info.borrow_mut().insert(p, Js::react_props_info());
        s.facts.insert(p, Js::react_props_info());
        if let Some(react) = &self.react {
            react.props_vars.borrow_mut().insert(p);
        }
        let data = vec![module.clone(), ty, Abs::Dyn(RExpr::Var(k)), Abs::Dyn(RExpr::Var(r)), Abs::Dyn(RExpr::Var(p)), Abs::Bool(false), Abs::Bool(true), Abs::Undef];
        Some(Abs::Ref(s.alloc(HeapObj::Builtin { kind: ELEMENT.into(), data: data.into(), ext: None })))
    }

    fn create_element_keyed(&self, s: &mut State, module: Abs, args: &[Abs], runtime_key: Option<Abs>) -> Option<Abs> {
        let ty = args.first().cloned().unwrap_or(Abs::Undef);
        // (A type chosen at runtime, `c ? A : B`: the element of each, chosen
        // by the condition; each made of the same config and children.)
        if let Abs::Ref(t) = &ty {
            if let Some(HeapObj::Choice { cond, a, b }) = s.heap.get(t).cloned() {
                // (A side a closure that is a runtime value, `react_fn_choice`:
                // that value, as which its facts know it.)
                let side = |js: &Self, s: &mut State, t: Abs| {
                    let t = match &t {
                        Abs::Ref(c) => match s.heap.get(c) {
                            Some(HeapObj::Closure { ident: Some(v), .. }) => Abs::Dyn(RExpr::Var(*v)),
                            _ => t,
                        },
                        _ => t,
                    };
                    let mut xs = args.to_vec();
                    xs[0] = t;
                    js.create_element_keyed(s, module.clone(), &xs, runtime_key.clone())
                };
                let a = side(self, s, a)?;
                let b = side(self, s, b)?;
                return Some(Abs::Ref(s.alloc(HeapObj::Choice { cond, a, b })));
            }
        }
        // A type known to have no `defaultProps`: a host component's name,
        // `React.Fragment`, or a function component as made.
        let Abs::Ref(m) = &module else { return None };
        let fragment = match (&ty, &s.heap[m]) {
            (Abs::Dyn(RExpr::Get(b, k)), HeapObj::Builtin { data, .. }) => **b == module_value(data) && matches!(k.as_str(), "Fragment" | "StrictMode"),
            _ => false,
        };
        // (Any other type: its element is made as written, React adding
        // the type's `defaultProps` when it makes it; what it holds is not
        // read from the model.)
        // (A class a first render mounts, in such a tree: see
        // `mountable_class`.)
        let plain = self
            .plain_function(s, &ty)
            .or_else(|| self.simple_class(s, &ty).map(|c| (c.fid, c.defaults)))
            .or_else(|| if self.first_render_root() { self.mountable_class(s, &ty) } else { None })
            // (What `React.forwardRef` made holds no `defaultProps`: a
            // write to it makes it escape, see `forward_ref`.)
            .or_else(|| self.forward_ref(s, &ty).map(|(f, _)| (f, Vec::new())));
        let defaults = plain.as_ref().map(|(_, d)| d.clone()).unwrap_or_default();
        // (A context's Provider and Consumer have no `defaultProps`.)
        let context_type = matches!(&ty, Abs::Ref(t) if matches!(s.heap.get(t), Some(HeapObj::Builtin { kind, .. }) if kind == PROVIDER || kind == CONSUMER));
        let props_known = matches!(ty, Abs::Str(_)) || fragment || context_type || plain.is_some();
        let mut key = Abs::Null;
        let mut r = Abs::Null;
        let mut props: Vec<Prop> = Vec::new();
        // A runtime config known to give no key or ref (a spread of React's
        // props: `Object.assign({}, props, {...})`), with no children after
        // it: its element's props are its own properties (React's copy of
        // them, with the type's `defaultProps` when there are some).
        // (The same, with children, of a host component or a fragment: its
        // children are known, its props are the config's with them.)
        if let (Some(Abs::Dyn(RExpr::Var(c))), true) = (args.get(1), args.len() > 2 && (matches!(ty, Abs::Str(_)) || fragment)) {
            let undef = |k: &str| {
                s.facts.get(c).is_some_and(|i| i.props.iter().any(|(pk, pi)| pk == k && pi.eq == Some(RExpr::Undef)) || i.fixed.iter().any(|(pk, e)| pk == k && *e == RExpr::Undef))
            };
            if !(undef("key") && undef("ref")) {
                return None;
            }
            let children = &args[2..];
            let (kids, spread) = if children.len() == 1 {
                (children[0].clone(), false)
            } else {
                let arr = s.alloc(HeapObj::Array(ArrayObj::from(children.iter().cloned().collect::<Vec<_>>())));
                (Abs::Ref(arr), true)
            };
            let data = vec![module, ty, Abs::Null, Abs::Null, Abs::Dyn(RExpr::Var(*c)), Abs::Bool(spread), Abs::Bool(false), Abs::Undef, kids];
            return Some(Abs::Ref(s.alloc(HeapObj::Builtin { kind: ELEMENT.into(), data: data.into(), ext: None })));
        }
        if let (Some(Abs::Dyn(RExpr::Var(c))), 2) = (args.get(1), args.len()) {
            let undef = |k: &str| {
                s.facts.get(c).is_some_and(|i| i.props.iter().any(|(pk, pi)| pk == k && pi.eq == Some(RExpr::Undef)) || i.fixed.iter().any(|(pk, e)| pk == k && *e == RExpr::Undef))
            };
            if !(undef("key") && undef("ref")) {
                return None;
            }
            // (Defaults: the props are the config's with them, made when
            // read.)
            let defaults_obj = if plain.is_some() && !defaults.is_empty() && self.pristine("Object") {
                let props = defaults.iter().map(|(k, v)| Prop::data(k.clone(), v.clone())).collect();
                Abs::Ref(s.alloc(HeapObj::Object { props, proto: INTRINSIC_PROTO, class: ObjClass::Ordinary, private: Vec::new(), extensible: true }))
            } else {
                Abs::Undef
            };
            let data =
                vec![module, ty, Abs::Null, Abs::Null, Abs::Dyn(RExpr::Var(*c)), Abs::Bool(false), Abs::Bool(props_known && defaults.is_empty()), defaults_obj];
            return Some(Abs::Ref(s.alloc(HeapObj::Builtin { kind: ELEMENT.into(), data: data.into(), ext: None })));
        }
        match args.get(1).cloned().unwrap_or(Abs::Undef) {
            Abs::Null | Abs::Undef => {}
            Abs::Ref(c) => {
                let HeapObj::Object { props: cp, proto, class: ObjClass::Ordinary, .. } = s.heap.get(&c)? else { return None };
                if *proto != INTRINSIC_PROTO {
                    return None;
                }
                for p in cp.iter() {
                    let PVal::Data(v) = &p.val else { return None };
                    // (The config is copied by `for..in`: no symbol key.)
                    let Some(pk) = p.key.as_str() else { continue };
                    if p.attrs & ENUMERABLE == 0 {
                        continue;
                    }
                    match pk {
                        // (`'' + key`: a static key, or a runtime one, taken
                        // already.)
                        "key" => match v {
                            Abs::Undef => {}
                            Abs::Str(_) => key = v.clone(),
                            Abs::Num(n) => key = Abs::Str(n.to_js_string()),
                            Abs::Dyn(_) => key = runtime_key.clone().expect("a runtime key is taken first"),
                            _ => return None,
                        },
                        "ref" => {
                            if *v != Abs::Undef {
                                r = v.clone();
                            }
                        }
                        "__self" | "__source" => {}
                        _ => props.push(Prop::data(pk, v.clone())),
                    }
                }
            }
            _ => return None,
        }
        let children = &args[args.len().min(2)..];
        let spread = children.len() > 1;
        match children.len() {
            0 => {}
            1 => {
                props.retain(|p| p.key != "children");
                props.push(Prop::data("children", children[0].clone()));
            }
            _ => {
                let arr = s.alloc(HeapObj::Array(ArrayObj::from(children.iter().cloned().collect::<Vec<_>>())));
                props.retain(|p| p.key != "children");
                props.push(Prop::data("children", Abs::Ref(arr)));
            }
        }
        // The type's `defaultProps`, where a prop is `undefined`.
        for (k, v) in defaults {
            match props.iter_mut().find(|p| p.key == k) {
                Some(p) if p.val == PVal::Data(Abs::Undef) => p.val = PVal::Data(v),
                Some(_) => {}
                None => props.push(Prop::data(k, v)),
            }
        }
        let p = s.alloc(HeapObj::Object { props, proto: INTRINSIC_PROTO, class: ObjClass::Ordinary, private: Vec::new(), extensible: true });
        let data = vec![module, ty, key, r, Abs::Ref(p), Abs::Bool(spread), Abs::Bool(props_known), Abs::Undef];
        Some(Abs::Ref(s.alloc(HeapObj::Builtin { kind: ELEMENT.into(), data: data.into(), ext: None })))
    }

    /// `React.Children.map(children, func, context)` of children all
    /// known (arrays, elements whose keys are known, primitives: see
    /// `known_children`) and a function of known code: React's own
    /// `mapChildren` run (`__pe_react_children_map`), when doing so here
    /// unfolds to straight-line code (a probe of it, see `call_unfolds`);
    /// else `None`, the call made at runtime.
    fn react_children_map(&self, s: &mut State, module: Abs, args: &[Abs], pc: usize, out: &mut Vec<Op>, ret: RetMode) -> Option<Step<Js>> {
        let react = self.react.as_ref()?;
        let children = args.first().cloned().unwrap_or(Abs::Undef);
        let func = args.get(1).cloned().unwrap_or(Abs::Undef);
        let context = args.get(2).cloned().unwrap_or(Abs::Undef);
        if self.facts_off || !self.pristine("String") || !self.pristine("Number") || !self.pristine("Array") || !self.known_children(s, &children, 0) {
            return None;
        }
        let known_fn = match &func {
            Abs::Ref(f) => matches!(s.heap.get(f), Some(HeapObj::Closure { .. })),
            Abs::Dyn(RExpr::Var(v)) => s.facts.get(v).is_some_and(|i| i.callee.is_some()),
            _ => false,
        };
        if !known_fn {
            return None;
        }
        let model = Abs::Ref(s.alloc(HeapObj::Closure { fid: react.model[CHILDREN_MAP_MODEL], captured: vec![], props: vec![], proto: INTRINSIC_PROTO, known: true, once: false, ident: None }));
        let margs = vec![module, children, func, context];
        if !self.call_unfolds(s.clone(), model.clone(), &margs, &Abs::Undef, pc) {
            if env_flag!("REACT_DEBUG") {
                eprintln!("[REACT] React.Children.map does not unfold");
            }
            return None;
        }
        s.top_mut().ostack.push(model);
        s.top_mut().ostack.extend(margs);
        let saved = self.probing_known_call.replace(true);
        let step = self.do_call(s, 4, pc, out, Abs::Undef, ret, Abs::Undef);
        self.probing_known_call.set(saved);
        Some(step)
    }

    /// Children the specializer knows all of: a primitive, an element whose
    /// key is known, or an array of such (`React.Children` walks no other).
    fn known_children(&self, s: &State, v: &Abs, depth: usize) -> bool {
        match v {
            Abs::Num(_) | Abs::Str(_) | Abs::Bool(_) | Abs::Undef | Abs::Null => true,
            Abs::Ref(a) if depth < 16 => match s.heap.get(a) {
                Some(HeapObj::Builtin { kind, data, .. }) if kind == ELEMENT => matches!(data[E_KEY], Abs::Null | Abs::Str(_) | Abs::Num(_)),
                Some(HeapObj::Array(arr)) => arr.props.is_empty() && arr.holes.is_empty() && arr.elems.iter().all(|e| self.known_children(s, e, depth + 1)),
                _ => false,
            },
            _ => false,
        }
    }

    /// `React.cloneElement(element, config, ...children)` of an element
    /// whose props are known, as React makes it: those props, then each of
    /// the config's own (its type's default where one is `undefined`), its
    /// key and ref where the config's are defined, the children given;
    /// `None` when what it makes is not known.
    fn clone_element(&self, s: &mut State, args: &[Abs], pc: usize, out: &mut Vec<Op>) -> Option<Abs> {
        // (A config's runtime key, taken as `create_element` takes one.)
        let runtime_key = match args.get(1) {
            Some(Abs::Ref(c)) => match s.heap.get(c).and_then(|o| o.own("key")).map(|p| (p.attrs & ENUMERABLE != 0, p.val.clone())) {
                Some((true, PVal::Data(Abs::Dyn(e)))) => Some((self.aux_var(64, pc, 1), e)),
                _ => None,
            },
            _ => None,
        };
        let made = self.clone_element_keyed(s, args, runtime_key.as_ref().map(|(k, _)| Abs::Dyn(RExpr::Var(*k))))?;
        if let Some((k, e)) = runtime_key {
            let coerced = RExpr::Bin(Bop::Add, Box::new(RExpr::Str(String::new())), Box::new(e.clone()));
            self.emit_temp(s, k, RExpr::Opaque("?:".into(), vec![undefined_test(&e), RExpr::Undef, coerced]), pc, out);
        }
        Some(made)
    }

    fn clone_element_keyed(&self, s: &mut State, args: &[Abs], runtime_key: Option<Abs>) -> Option<Abs> {
        let Some(Abs::Ref(e)) = args.first() else { return None };
        let HeapObj::Builtin { kind, data, .. } = s.heap.get(e).cloned()? else { return None };
        if kind != ELEMENT || data.len() > E_CHILDREN || data[E_PROPS_KNOWN] != Abs::Bool(true) {
            return None;
        }
        let Abs::Ref(p) = &data[E_PROPS] else { return None };
        let HeapObj::Object { props: given, proto, class: ObjClass::Ordinary, .. } = s.heap.get(p).cloned()? else { return None };
        if proto != INTRINSIC_PROTO || given.iter().any(|q| !matches!(q.val, PVal::Data(_))) {
            return None;
        }
        let mut props: Vec<Prop> = given.to_vec();
        let (mut key, mut r) = (data[E_KEY].clone(), data[E_REF].clone());
        // (Its type's `defaultProps`: a host component's none.)
        let defaults: Option<Vec<(String, Abs)>> = match &data[E_TYPE] {
            Abs::Str(_) => Some(Vec::new()),
            t => self.plain_function(s, t).map(|(_, d)| d).or_else(|| self.simple_class(s, t).map(|c| c.defaults)),
        };
        let mut spread = data[E_SPREAD].clone();
        match args.get(1).cloned().unwrap_or(Abs::Undef) {
            Abs::Null | Abs::Undef => {}
            Abs::Ref(c) => {
                let HeapObj::Object { props: cp, proto, class: ObjClass::Ordinary, .. } = s.heap.get(&c).cloned()? else { return None };
                if proto != INTRINSIC_PROTO {
                    return None;
                }
                for q in cp.iter() {
                    let PVal::Data(v) = &q.val else { return None };
                    // (The config is copied by `for..in`: no symbol key.)
                    let Some(qk) = q.key.as_str() else { continue };
                    if q.attrs & ENUMERABLE == 0 {
                        continue;
                    }
                    let v = match qk {
                        "key" => {
                            match v {
                                Abs::Undef => {}
                                Abs::Str(_) => key = v.clone(),
                                Abs::Num(n) => key = Abs::Str(n.to_js_string()),
                                // (`undefined` for none: the element's then.)
                                Abs::Dyn(_) => {
                                    let k = runtime_key.clone().expect("a runtime key is taken first").to_rexpr();
                                    key = Abs::Dyn(RExpr::Opaque("?:".into(), vec![undefined_test(&k), match &key {
                                        Abs::Null => RExpr::Undef,
                                        o => o.to_rexpr(),
                                    }, k]));
                                }
                                _ => return None,
                            }
                            continue;
                        }
                        "ref" => {
                            if *v != Abs::Undef {
                                r = v.clone();
                            }
                            continue;
                        }
                        "__self" | "__source" => continue,
                        k if *v == Abs::Undef => match &defaults {
                            Some(d) => d.iter().find(|(n, _)| n == k).map(|(_, dv)| dv.clone()).unwrap_or(Abs::Undef),
                            None => return None,
                        },
                        _ => v.clone(),
                    };
                    if q.key == "children" {
                        spread = Abs::Bool(false);
                    }
                    match props.iter_mut().find(|x| x.key == q.key) {
                        Some(x) => x.val = PVal::Data(v),
                        None => props.push(Prop::data(q.key.clone(), v)),
                    }
                }
            }
            _ => return None,
        }
        let children = &args[args.len().min(2)..];
        if !children.is_empty() {
            let kids = if children.len() == 1 {
                children[0].clone()
            } else {
                Abs::Ref(s.alloc(HeapObj::Array(ArrayObj::from(children.iter().cloned().collect::<Vec<_>>()))))
            };
            spread = Abs::Bool(children.len() > 1);
            match props.iter_mut().find(|x| x.key == "children") {
                Some(x) => x.val = PVal::Data(kids),
                None => props.push(Prop::data("children", kids)),
            }
        }
        let p = s.alloc(HeapObj::Object { props, proto: INTRINSIC_PROTO, class: ObjClass::Ordinary, private: Vec::new(), extensible: true });
        let nd = vec![data[E_MODULE].clone(), data[E_TYPE].clone(), key, r, Abs::Ref(p), spread, Abs::Bool(true), Abs::Undef];
        Some(Abs::Ref(s.alloc(HeapObj::Builtin { kind: ELEMENT.into(), data: nd.into(), ext: None })))
    }

    /// `__pe_react_root(props, context)` in a root's model body: the root
    /// function called with them, its code run here whatever it does (see
    /// `Js::react_root_fn`).
    fn call_root(&self, s: &mut State, args: &[Abs], this: Abs, pc: usize, out: &mut Vec<Op>, ret: RetMode) -> Step<Js> {
        let rfid = self.react_building.get().expect("__pe_react_root runs only in a root's model body");
        let me = Abs::Dyn(RExpr::Var(self.root_self_var(rfid)));
        // (A simple class: its `render` on an instance of the props and
        // context React passes, and its methods, which its body knows.)
        let react = self.react.as_ref().expect("--react");
        if react.class_roots.borrow().contains(&react_root(self)) {
            let c = self.simple_class(s, &me).expect("a simple class root is one in its body: its methods are known there");
            let props = args.first().cloned().unwrap_or(Abs::Undef);
            let context = args.get(1).cloned().unwrap_or(Abs::Undef);
            let mut iprops = vec![Prop::data("props", props), Prop::data("context", context)];
            let mut render = None;
            for (n, m) in &c.methods {
                if n == "render" {
                    render = Some(m.clone());
                }
                iprops.push(Prop::data(n.clone(), m.clone()));
            }
            let instance = Abs::Ref(s.alloc(HeapObj::Object { props: iprops, proto: INTRINSIC_PROTO, class: ObjClass::Ordinary, private: Vec::new(), extensible: true }));
            let render = render.expect("a simple class has a render");
            let callee = match render {
                Abs::Dyn(_) => self.known_callee(s, render),
                r => r,
            };
            s.top_mut().ostack.push(callee);
            let saved = self.probing_known_call.replace(true);
            let step = self.do_call(s, 0, pc, out, instance, ret, Abs::Undef);
            self.probing_known_call.set(saved);
            return step;
        }
        let callee = self.known_callee(s, me);
        s.top_mut().ostack.push(callee);
        s.top_mut().ostack.extend(args.iter().cloned());
        let saved = self.probing_known_call.replace(true);
        let step = self.do_call(s, args.len(), pc, out, this, ret, Abs::Undef);
        self.probing_known_call.set(saved);
        step
    }

    /// In a root's model body: the element at `addr`, when static (see
    /// `HoistElem`), as the value the root's residual function is given for
    /// it.
    pub(super) fn react_hoist(&self, heap: &Heap, addr: usize) -> Option<RExpr> {
        let react = self.react.as_ref()?;
        let rfid = self.react_building.get()?;
        if self.current_body.get() != Some(rfid) || !Js::is_element(heap, Some(&Abs::Ref(addr))) {
            return None;
        }
        let ntake = react.building_ntake.get();
        let h = self.hoist_elem(heap, addr, rfid, ntake, 0)?;
        let mut all = react.hoists.borrow_mut();
        let list = all.entry(rfid).or_default();
        let k = match list.iter().position(|x| *x == h) {
            Some(k) => k,
            None => {
                // (Room for it: see `Js::cap_forms`'s budget.)
                if ntake + list.len() >= MAX_TAKEN {
                    return None;
                }
                list.push(h);
                list.len() - 1
            }
        };
        Some(RExpr::Var(self.residual_cap_var(rfid, ntake + k)))
    }

    fn hoist_elem(&self, heap: &Heap, addr: usize, rfid: usize, ntake: usize, depth: usize) -> Option<HoistElem> {
        let HeapObj::Builtin { data, .. } = heap.get(&addr)? else { return None };
        if depth > 32 || data[E_REF] != Abs::Null || data[E_PROPS_KNOWN] != Abs::Bool(true) {
            return None;
        }
        let given = |v: &Abs| -> Option<usize> {
            let Abs::Dyn(RExpr::Var(x)) = v else { return None };
            (0..ntake).find(|i| self.residual_cap_var(rfid, *i) == *x)
        };
        let Abs::Ref(m) = &data[E_MODULE] else { return None };
        let Some(HeapObj::Builtin { data: md, .. }) = heap.get(m) else { return None };
        let module = given(&md[1])?;
        let host = match &data[E_TYPE] {
            Abs::Str(t) => Some(t.clone()),
            Abs::Dyn(RExpr::Get(b, k)) if k == "Fragment" && **b == module_value(md) => None,
            _ => return None,
        };
        let key = match &data[E_KEY] {
            Abs::Null => None,
            Abs::Str(k) => Some(k.clone()),
            _ => return None,
        };
        let hval = |v: &Abs| -> Option<HVal> { self.hoist_val(heap, v, rfid, ntake, depth + 1) };
        let Abs::Ref(p) = &data[E_PROPS] else { return None };
        let Some(HeapObj::Object { props: pr, .. }) = heap.get(p) else { return None };
        let spread = data[E_SPREAD] == Abs::Bool(true);
        let mut props = Vec::new();
        let mut children = Vec::new();
        for x in pr.iter() {
            let PVal::Data(v) = &x.val else { return None };
            if x.key == "children" {
                match (v, spread) {
                    (Abs::Ref(c), true) => {
                        let Some(HeapObj::Array(arr)) = heap.get(c) else { return None };
                        for e in arr.elems.iter() {
                            children.push(hval(e)?);
                        }
                    }
                    _ => children.push(hval(v)?),
                }
            } else {
                props.push((x.key.as_str()?.to_string(), hval(v)?));
            }
        }
        Some(HoistElem { module, host, key, props, children, spread })
    }

    fn hoist_val(&self, heap: &Heap, v: &Abs, rfid: usize, ntake: usize, depth: usize) -> Option<HVal> {
        match v {
            Abs::Num(_) | Abs::Str(_) | Abs::Bool(_) | Abs::Null | Abs::Undef => Some(HVal::Const(v.to_rexpr())),
            Abs::Dyn(RExpr::Var(x)) => (0..ntake).find(|i| self.residual_cap_var(rfid, *i) == *x).map(HVal::Given),
            Abs::Ref(a) => match heap.get(a)? {
                HeapObj::Builtin { kind, .. } if kind == ELEMENT => Some(HVal::Elem(Box::new(self.hoist_elem(heap, *a, rfid, ntake, depth)?))),
                HeapObj::Array(arr) if arr.holes.is_empty() && arr.props.is_empty() && depth <= 32 => {
                    Some(HVal::Array(arr.elems.iter().map(|e| self.hoist_val(heap, e, rfid, ntake, depth + 1)).collect::<Option<Vec<_>>>()?))
                }
                _ => None,
            },
            _ => None,
        }
    }

    /// The values given that hoisted element `h` is made of (their indices).
    pub(super) fn hoist_given(h: &HoistElem, out: &mut Vec<usize>) {
        fn val(v: &HVal, out: &mut Vec<usize>) {
            match v {
                HVal::Const(_) => {}
                HVal::Given(i) => out.push(*i),
                HVal::Elem(e) => Js::hoist_given(e, out),
                HVal::Array(xs) => xs.iter().for_each(|x| val(x, out)),
            }
        }
        out.push(h.module);
        h.props.iter().for_each(|(_, v)| val(v, out));
        h.children.iter().for_each(|v| val(v, out));
    }

    /// The static elements root residual function `rfid` is given (see
    /// `HoistElem`).
    pub(super) fn react_hoists(&self, rfid: usize) -> Vec<HoistElem> {
        self.react.as_ref().and_then(|r| r.hoists.borrow().get(&rfid).cloned()).unwrap_or_default()
    }

    /// The runtime making of hoisted element `h` where its root's closure is
    /// made, `given` the values it is given there (the ops it needs pushed
    /// on `pre`, temporaries from `tmp`).
    pub(super) fn hoist_expr(h: &HoistElem, given: &dyn Fn(usize) -> RExpr, pre: &mut Vec<Op>, tmp: &mut dyn FnMut() -> usize) -> RExpr {
        let module = given(h.module);
        let ty = match &h.host {
            Some(t) => RExpr::Str(t.clone()),
            None => RExpr::Get(Box::new(module.clone()), "Fragment".into()),
        };
        fn val(v: &HVal, given: &dyn Fn(usize) -> RExpr, pre: &mut Vec<Op>, tmp: &mut dyn FnMut() -> usize) -> RExpr {
            match v {
                HVal::Const(e) => e.clone(),
                HVal::Given(i) => given(*i),
                HVal::Elem(e) => Js::hoist_expr(e, given, pre, tmp),
                HVal::Array(xs) => {
                    let elems = xs.iter().map(|x| val(x, given, pre, tmp)).collect();
                    let a = tmp();
                    pre.push(Op::NewArray { dst: a, elems });
                    RExpr::Var(a)
                }
            }
        }
        let mut fields: Vec<(String, RExpr)> = Vec::new();
        if let Some(k) = &h.key {
            fields.push(("key".into(), RExpr::Str(k.clone())));
        }
        for (k, v) in &h.props {
            fields.push((k.clone(), val(v, given, pre, tmp)));
        }
        let config = if fields.is_empty() {
            RExpr::Null
        } else {
            let c = tmp();
            pre.push(Op::NewObject { dst: c, fields });
            RExpr::Var(c)
        };
        let mut args = vec![ty, config];
        if h.spread {
            for c in &h.children {
                args.push(val(c, given, pre, tmp));
            }
        } else if let Some(c) = h.children.first() {
            args.push(val(c, given, pre, tmp));
        }
        RExpr::Call(Box::new(RExpr::Get(Box::new(module), "createElement".into())), args)
    }

    /// `__optimizeReactComponentTree(root)`: `root` is a component tree's
    /// root.
    ///
    /// A class (its prototype holding `render`): its `render` is the root,
    /// its model body run on the instance (see `react_class_made`).
    pub(super) fn react_mark_root(&self, s: &State, args: &[Abs]) {
        let Some(react) = &self.react else { return };
        // (`{firstRenderOnly: true}`: the program renders the tree once.)
        let first = matches!(args.get(1), Some(Abs::Ref(o)) if matches!(s.heap.get(o).and_then(|o| o.own("firstRenderOnly")).map(|p| &p.val), Some(PVal::Data(Abs::Bool(true)))));
        let mark = |fid: usize| {
            if first {
                react.first_render.borrow_mut().insert(fid);
            }
        };
        // (A class made at runtime: its prototype and `render` as written.)
        if let Some(Abs::Dyn(RExpr::Var(c))) = args.first() {
            // (A class: the `render` its definition gives its prototype.)
            let render = react
                .escaped_fns
                .borrow()
                .get(c)
                .and_then(|f| self.proto_methods[*f].iter().find(|(n, _)| n == "render").map(|(_, m)| *m))
                .or_else(|| react.class_renders.borrow().get(c).copied())
                .or_else(|| react.proto_writes.borrow().get(c).and_then(|p| react.render_writes.borrow().get(p).copied()));
            match render {
                Some(r) => {
                    mark(r);
                    if react.methods.borrow_mut().insert(r) {
                        react.again.set(true);
                    }
                }
                None if env_flag!("REACT_DEBUG") => eprintln!("[REACT] root a runtime value with no render known: {:?}", args.first()),
                None => {}
            }
            return;
        }
        let Some(Abs::Ref(a)) = args.first() else {
            if env_flag!("REACT_DEBUG") {
                eprintln!("[REACT] root not known: {:?}", args.first());
            }
            return;
        };
        // (A simple class: rendered as a function component, its `render`
        // run on an instance of the props and context React passes and its
        // methods, as React renders it: see `react_class_root_fn`.)
        if let Some(c) = self.simple_class(s, &Abs::Ref(*a)) {
            mark(c.fid);
            react.roots.borrow_mut().insert(c.fid);
            react.class_roots.borrow_mut().insert(c.fid);
            return;
        }
        let Some(HeapObj::Closure { fid, ident: None, props, .. }) = s.heap.get(a) else {
            if env_flag!("REACT_DEBUG") {
                eprintln!("[REACT] root not a known closure: {:?}", s.heap.get(a).map(|o| format!("{o:?}").chars().take(120).collect::<String>()));
            }
            return;
        };
        let render = props.iter().find(|p| p.key == "prototype").and_then(|p| match &p.val {
            // (A class's prototype it was made with, or one written since.)
            PVal::Data(Abs::Ref(proto)) => match s.heap.get(proto)?.own("render")?.val {
                PVal::Data(Abs::Ref(r)) => match s.heap.get(&r)? {
                    HeapObj::Closure { fid, .. } => Some(*fid),
                    _ => None,
                },
                _ => None,
            },
            // (One made at runtime: the function written as its `render`.)
            PVal::Data(Abs::Dyn(RExpr::Var(x))) => react.render_writes.borrow().get(x).copied(),
            _ => None,
        });
        let render = render.or_else(|| self.proto_methods[*fid].iter().find(|(n, _)| n == "render").map(|(_, m)| *m));
        match render {
            Some(r) => {
                mark(r);
                if react.methods.borrow_mut().insert(r) {
                    react.again.set(true);
                }
            }
            None => {
                mark(*fid);
                react.roots.borrow_mut().insert(*fid);
            }
        }
    }

    /// The program is to be specialized again: a root's `render` was found
    /// after it was made (see `react_mark_root`).
    pub(super) fn react_again(&self) -> bool {
        self.react.as_ref().is_some_and(|r| r.again.replace(false))
    }

    /// The objects an escape made (`made`: by address, their variables):
    /// the closures among them, by variable (see `react_mark_root`).
    pub(super) fn react_note_escape(&self, heap: &Heap, made: &HashMap<usize, usize>) {
        let Some(react) = &self.react else { return };
        for (a, v) in made {
            if let Some(HeapObj::Closure { fid, .. }) = heap.get(a) {
                react.escaped_fns.borrow_mut().insert(*v, *fid);
            }
            // (A mount's own object: its class is rendered as an element in
            // this root, and its body made again.)
            if let (Some(class), Some(root)) = (react.tracked.borrow().get(a).copied(), react.root.get()) {
                if react.never.borrow_mut().insert((root, class)) {
                    react.grew.set(true);
                }
            }
        }
    }

    /// Runtime code writes closure `v` as `obj.key` (`obj` a runtime value).
    pub(super) fn react_note_write(&self, s: &State, obj: &RExpr, key: &str, v: &Abs) {
        let Some(react) = &self.react else { return };
        match (obj, key, v) {
            (RExpr::Var(x), "render", Abs::Ref(c)) => {
                if let Some(HeapObj::Closure { fid, .. }) = s.heap.get(c) {
                    react.render_writes.borrow_mut().insert(*x, *fid);
                }
            }
            (RExpr::Var(x), "prototype", Abs::Dyn(RExpr::Var(p))) => {
                react.proto_writes.borrow_mut().insert(*x, *p);
            }
            // (`C.prototype.render = f`, C a runtime value: f is C's.)
            (RExpr::Get(b, p), "render", Abs::Ref(c)) if p == "prototype" => {
                if let (RExpr::Var(x), Some(HeapObj::Closure { fid, .. })) = (&**b, s.heap.get(c)) {
                    react.class_renders.borrow_mut().insert(*x, *fid);
                }
            }
            _ => {}
        }
    }

    /// The residual function of the closure at `addr` (of `fid`) when it is
    /// a simple class root rendered as a function component: its forms
    /// (with what is known of the class itself, its methods: see
    /// `Js::cap_forms_with`) and that function.
    pub(super) fn react_class_root_fn(&self, fid: usize, addr: usize, captured: &[Abs], once: bool, heap: &Heap) -> Option<(Vec<CapForm>, usize)> {
        let react = self.react.as_ref()?;
        if !react.class_roots.borrow().contains(&fid) {
            return None;
        }
        let forms = self.cap_forms_with(fid, addr, captured, once, heap, true);
        if forms.len() != captured.len() + 1 {
            return None;
        }
        let rfid = self.react_root_fn(fid, &forms, captured, heap)?;
        Some((forms, rfid))
    }

    /// The heap seen materializing the closure at `addr` whose residual
    /// function is `rfid`: when that is a class root's function component,
    /// one where the closure is a plain function (no `prototype` of its
    /// own, `Function.prototype` its parent: React then renders it as a
    /// function, not a class), its static properties kept.
    pub(super) fn react_function_view(&self, rfid: usize, addr: usize, heap: &Heap) -> Option<Heap> {
        let react = self.react.as_ref()?;
        if !react.function_rfids.borrow().contains(&rfid) {
            return None;
        }
        let mut view = heap.clone();
        let Some(HeapObj::Closure { fid, captured, props, known, once, ident, .. }) = heap.get(&addr).cloned() else { return None };
        let props = props.into_iter().filter(|p| p.key != "prototype").collect();
        view.insert(addr, HeapObj::Closure { fid, captured, props, proto: INTRINSIC_PROTO, known, once, ident });
        Some(view)
    }

    /// After a class (the constructor at `addr`) was made from its source
    /// as `dst`: when its `render` is a root's, the residual's `render` is its
    /// model body, defined in place of the source's (as a class method:
    /// writable, configurable, not enumerable), and every reference to that
    /// function names it.
    #[allow(clippy::too_many_arguments)]
    pub(super) fn react_class_made(&self, dst: usize, addr: usize, heap: &Heap, shells: &mut Vec<Op>, fills: &mut Vec<Op>, seen: &mut HashMap<usize, usize>) {
        let Some(react) = &self.react else { return };
        // (The class is that variable's value: see `escaped_fns`.)
        if let Some(HeapObj::Closure { fid, .. }) = heap.get(&addr) {
            react.escaped_fns.borrow_mut().insert(dst, *fid);
        }
        let Some((proto, r)) = self.react_replaced_render(addr, heap) else { return };
        let f = self.aux_var(58, addr, 0);
        let saved = react.method_root.replace(Some((r, addr)));
        self.mat_obj(f, r, heap, shells, fills, seen);
        react.method_root.set(saved);
        seen.insert(r, f);
        let pv = seen.get(&proto).copied().map(RExpr::Var).unwrap_or_else(|| RExpr::Get(Box::new(RExpr::Var(dst)), "prototype".into()));
        let desc = self.aux_var(58, addr, 1);
        shells.push(Op::NewObject {
            dst: desc,
            fields: vec![("value".into(), RExpr::Var(f)), ("writable".into(), RExpr::Bool(true)), ("configurable".into(), RExpr::Bool(true))],
        });
        let define = RExpr::Get(Box::new(RExpr::Global("Object".into())), "defineProperty".into());
        shells.push(Op::Eval { dst: self.aux_var(58, addr, 2), expr: RExpr::Call(Box::new(define), vec![pv, RExpr::Str("render".into()), RExpr::Var(desc)]) });
    }

    /// When the class whose constructor is at `addr` has a root's `render`
    /// whose model body replaces it (see `react_class_made`): its prototype
    /// and that method (the class's source is made without it).
    pub(super) fn react_replaced_render(&self, addr: usize, heap: &Heap) -> Option<(usize, usize)> {
        let react = self.react.as_ref()?;
        let Some(HeapObj::Closure { props, .. }) = heap.get(&addr) else { return None };
        let Some(PVal::Data(Abs::Ref(proto))) = props.iter().find(|p| p.key == "prototype").map(|p| p.val.clone()) else { return None };
        let Some(PVal::Data(Abs::Ref(r))) = heap.get(&proto).and_then(|o| o.own("render")).map(|p| p.val.clone()) else { return None };
        let Some(HeapObj::Closure { fid, captured, once, .. }) = heap.get(&r) else { return None };
        if !react.methods.borrow().contains(fid) {
            return None;
        }
        // (Only a root's model body: a root refused renders as the class's
        // own `render`.)
        let forms = self.react_render_forms(*fid, r, captured, *once, heap, addr);
        self.react_root_fn(*fid, &forms, captured, heap)?;
        Some((proto, r))
    }

    /// The forms a class's `render` (`fid`, at `r`) is made with as a root:
    /// its captures', then the class's (at `class`), when its methods may
    /// be read from its instances (`react_known_methods`).
    fn react_render_forms(&self, fid: usize, r: usize, captured: &[Abs], once: bool, heap: &Heap, class: usize) -> Vec<CapForm> {
        let known = match (heap.get(&class), self.react_class_methods(class, heap)) {
            (Some(HeapObj::Closure { fid: c, .. }), Some(methods)) => self.react_known_methods(*c, &methods).is_some_and(|m| !m.is_empty()),
            _ => false,
        };
        self.cap_forms_and(fid, r, captured, once, heap, known.then_some(class))
    }

    /// The residual function of a class's `render` being made as a root's,
    /// given its class (`react_class_made`): its forms, that function and
    /// the class's address.
    pub(super) fn react_method_root_fn(&self, fid: usize, addr: usize, captured: &[Abs], once: bool, heap: &Heap) -> Option<(Vec<CapForm>, usize, usize)> {
        let react = self.react.as_ref()?;
        let (r, class) = react.method_root.get().filter(|(r, _)| *r == addr)?;
        let forms = self.react_render_forms(fid, r, captured, once, heap, class);
        if forms.len() != self.ncaptured[fid] + 1 {
            return None;
        }
        let rfid = self.react_root_fn(fid, &forms, captured, heap)?;
        Some((forms, rfid, class))
    }

    /// The methods of a class (its constructor's fid) its instances hold
    /// as its prototype has them, by what its own code does with `this`
    /// (`FuncDef::instance_uses`): those its definition gives its prototype
    /// that its code never writes on an instance (nor React: `props`,
    /// `state`, ...); `None` when `this` may reach other code, or a method
    /// it calls on `this` may be none of these (nor React's `setState`,
    /// `forceUpdate`).
    fn react_known_methods(&self, class: usize, methods: &[(String, usize)]) -> Option<std::collections::BTreeSet<String>> {
        let react = self.react.as_ref()?;
        if react.method_off.borrow().contains(&class) || env_flag!("PE_NO_REACT_METHODS") {
            return None;
        }
        // (A class's own code: its definition's; an ES5 class's, its
        // constructor's, which first calls its parent's, and its methods'.)
        let uses = match self.fn_kinds[class] {
            FnKind::ClassCtor { .. } => self.instance_uses.get(class)?.clone()?,
            FnKind::Normal => {
                let mut u = self.instance_uses.get(class)?.clone()?;
                u.parent_capture?;
                for (_, m) in methods {
                    let mu = self.instance_uses.get(*m)?.clone()?;
                    if mu.parent.is_some() {
                        return None;
                    }
                    u.written.extend(mu.written);
                    u.called.extend(mu.called);
                    u.bound.extend(mu.bound);
                    u.written_otherwise.extend(mu.written_otherwise);
                }
                u
            }
            _ => return None,
        };
        const REACTS: &[&str] = &["props", "state", "context", "refs", "updater", "render", "constructor", "setState", "forceUpdate", "isReactComponent"];
        let known: std::collections::BTreeSet<String> = methods
            .iter()
            .map(|(n, _)| n.clone())
            .filter(|n| !uses.written.contains(n) && !REACTS.contains(&n.as_str()))
            .collect();
        let callable = |n: &String| known.contains(n) || n == "setState" || n == "forceUpdate" || n == "render";
        // (A method bound to `this` is one of its prototype's, its own
        // property, if any, only that bound copy.)
        let names: std::collections::BTreeSet<&String> = methods.iter().map(|(n, _)| n).collect();
        let bindable = |n: &String| names.contains(n) && !uses.written_otherwise.contains(n);
        (uses.called.iter().all(callable) && uses.bound.iter().all(bindable)).then_some(known)
    }

    /// The methods its prototype has of the class at `class` (its
    /// definition's, or an ES5 class's own), by name, and their functions.
    fn react_class_methods(&self, class: usize, heap: &Heap) -> Option<Vec<(String, usize)>> {
        let Some(HeapObj::Closure { fid, .. }) = heap.get(&class) else { return None };
        match self.fn_kinds[*fid] {
            FnKind::ClassCtor { .. } => Some(self.proto_methods[*fid].clone()),
            FnKind::Normal => Some(
                self.es5_class_methods(class, heap)?
                    .into_iter()
                    .filter_map(|(n, v)| match v {
                        Abs::Ref(m) => match heap.get(&m) {
                            Some(HeapObj::Closure { fid, .. }) => Some((n, *fid)),
                            _ => None,
                        },
                        _ => None,
                    })
                    .collect(),
            ),
            _ => None,
        }
    }

    /// When the closure at `addr` is an ES5 class whose prototype's
    /// `render` is a root's: that render given the class while it is made
    /// (see `react_method_root_fn`); what was set before, to restore.
    pub(super) fn react_es5_render_root(&self, addr: usize, heap: &Heap) -> Option<Option<(usize, usize)>> {
        let react = self.react.as_ref()?;
        let Some(HeapObj::Closure { fid, .. }) = heap.get(&addr) else { return None };
        if !matches!(self.fn_kinds[*fid], FnKind::Normal) {
            return None;
        }
        let methods = self.es5_class_methods(addr, heap)?;
        let (_, Abs::Ref(r)) = methods.iter().find(|(n, _)| n == "render")? else { return None };
        let Some(HeapObj::Closure { fid: rf, .. }) = heap.get(r) else { return None };
        if !react.methods.borrow().contains(rf) {
            return None;
        }
        Some(react.method_root.replace(Some((*r, addr))))
    }

    pub(super) fn react_restore_method_root(&self, saved: Option<(usize, usize)>) {
        if let Some(react) = &self.react {
            react.method_root.set(saved);
        }
    }

    /// `this.k` in the body of a class's `render` made as a root's: the
    /// method of the class `k` is (the prototype's, as its definition gave
    /// it), when its instances hold it so (`react_known_methods`), what the
    /// body is given of the class knowing it. Assumed of what the residual
    /// does: see `react_check_methods`.
    pub(super) fn react_this_method(&self, s: &mut State, k: &str) -> Option<Abs> {
        let react = self.react.as_ref()?;
        let rfid = self.react_building.get()?;
        if self.facts_off || !react.methods.borrow().contains(&react_root(self)) {
            return None;
        }
        let begun = react.body_facts.borrow().get(&rfid).cloned()?;
        let kf = begun.get(&self.root_class_var(rfid))?.callee.clone()?;
        // (The class's methods, as it is known here: each a variable whose
        // facts say its code.)
        let methods: Vec<(String, usize)> = kf
            .methods
            .iter()
            .filter_map(|(n, v)| match v {
                crate::facts::KnownVal::Expr(RExpr::Var(x)) => begun.get(x).and_then(|i| i.callee.as_ref()).map(|m| (n.clone(), m.fid)),
                _ => None,
            })
            .collect();
        let methods = match self.fn_kinds[kf.fid] {
            FnKind::ClassCtor { .. } => self.proto_methods[kf.fid].clone(),
            _ => methods,
        };
        if !self.react_known_methods(kf.fid, &methods)?.contains(k) {
            return None;
        }
        let (_, crate::facts::KnownVal::Expr(e)) = kf.methods.iter().find(|(n, _)| n == k)? else { return None };
        // (What is known of it, as the body began: of each variable it
        // names, so too.)
        let mut todo = Vec::new();
        crate::coalesce::rexpr_vars(e, &mut todo);
        let mut seen = std::collections::HashSet::new();
        while let Some(v) = todo.pop() {
            if !seen.insert(v) {
                continue;
            }
            if let Some(i) = begun.get(&v) {
                if !s.facts.contains_key(&v) {
                    s.facts.insert(v, i.clone());
                }
                i.vars(&mut todo);
            }
        }
        react.method_assumed.borrow_mut().insert((kf.fid, k.to_string()));
        if env_flag!("REACT_DEBUG") {
            eprintln!("[REACT] this.{k}: {}'s method", self.names[kf.fid]);
        }
        Some(Abs::Dyn(e.clone()))
    }

    /// After a pass: each method a body read from an instance as its
    /// class's (`react_this_method`) holds only when nothing in the residual
    /// writes that key on an object not made fresh, nor writes a computed
    /// key on one (`pristine::Writes`). A class whose method may be written
    /// so has its methods read at runtime from then on; `true` when that is
    /// new (the program is then specialized again).
    pub(super) fn react_check_methods(&self, w: &crate::pristine::Writes, progs: &[&crate::residual::Program<Op, Cond>]) -> bool {
        let Some(react) = &self.react else { return false };
        let mut again = false;
        // (A component known as made, escaped only into React's API: the
        // statics React reads of one not written by the residual on an
        // object not made fresh, nor any computed key. See `react_as_made`.)
        let _ = w;
        again |= self.react_statics_written(progs);
        for (class, m) in react.method_assumed.borrow().iter() {
            if (w.wild || w.keys.contains(m)) && react.method_off.borrow_mut().insert(*class) {
                if env_flag!("REACT_DEBUG") {
                    eprintln!("[REACT] {}'s {m} may be written: its methods read at runtime", self.names[*class]);
                }
                again = true;
            }
        }
        again
    }

    /// Whether a function known as made, escaped only into React's API
    /// (`react_as_made`, `BOUND`), may have a static React reads written by
    /// the residual (`progs`): one of `defaultProps`, ..., or a computed key,
    /// on its runtime value or an object that may be it (`pristine::writes_to`).
    /// Then the functions are runtime values of unknown contents from then
    /// on; `true` when that is new.
    fn react_statics_written(&self, progs: &[&crate::residual::Program<Op, Cond>]) -> bool {
        let Some(react) = &self.react else { return false };
        const READ: &[&str] = &["defaultProps", "contextTypes", "contextType", "childContextTypes", "getDerivedStateFromProps", "getDerivedStateFromError", "prototype", "isReactComponent"];
        if !react.statics_assumed.get() || react.statics_off.get() {
            return false;
        }
        let vars = react.statics_vars.borrow().clone();
        if !crate::pristine::writes_to(progs, &vars, READ) {
            return false;
        }
        react.statics_off.set(true);
        if env_flag!("REACT_DEBUG") {
            eprintln!("[REACT] a static React reads may be written: functions escaped into React's API known as runtime values");
        }
        true
    }

    /// What a residual function's body may know of the element at `addr`
    /// (`Shape::Element`, React's contract keeping an element and its props
    /// as made): each datum as `shape_of` says, its props object's own data
    /// properties so (`Shape::Record`), React's array of its children
    /// (`Shape::List`: one `createElement` made, not one of the program's,
    /// which may change). Each value it passes in counted against `budget`;
    /// `None` (it is passed as a runtime value) when they are too many, or
    /// what it holds is no such object.
    pub(super) fn react_element_shape(&self, addr: usize, heap: &Heap, budget: &mut usize, path: &mut Vec<usize>, taker: &mut Taker) -> Option<Shape> {
        self.react.as_ref()?;
        if self.facts_off || env_flag!("PE_NO_REACT_ELEMENT_SHAPES") || path.len() > 16 {
            return None;
        }
        let Some(HeapObj::Builtin { kind, data, .. }) = heap.get(&addr) else { return None };
        if kind != ELEMENT || data.len() > E_CHILDREN {
            return None;
        }
        let spread = data[E_SPREAD] == Abs::Bool(true);
        let mut part = |js: &Self, v: &Abs, budget: &mut usize, taker: &mut Taker, path: &mut Vec<usize>| -> Option<Shape> {
            match v {
                Abs::Num(_) | Abs::Str(_) | Abs::Bool(_) | Abs::Undef | Abs::Null => Some(Shape::Static(v.clone())),
                Abs::Ref(a) if Js::is_element(heap, Some(v)) => js.react_element_shape(*a, heap, budget, path, taker),
                _ => {
                    if let Some(al) = taker.alias(v) {
                        return Some(al);
                    }
                    if *budget == 0 {
                        return None;
                    }
                    *budget -= 1;
                    taker.take(v, heap);
                    Some(js.shape_of(v, heap, budget, path, taker))
                }
            }
        };
        let mut parts = Vec::with_capacity(data.len());
        for (j, d) in data.iter().enumerate() {
            let sh = match (j, d) {
                (E_PROPS, Abs::Ref(p)) => {
                    let Some(HeapObj::Object { props, proto, class: ObjClass::Ordinary, private, .. }) = heap.get(p) else { return None };
                    // (A record is its properties: an object with private
                    // entries is more than that.)
                    if *proto != INTRINSIC_PROTO || !private.is_empty() {
                        return None;
                    }
                    let mut fields = Vec::with_capacity(props.len());
                    for pr in props.iter() {
                        let PVal::Data(v) = &pr.val else { return None };
                        if pr.attrs != DEFAULT_ATTRS {
                            return None;
                        }
                        let fsh = match v {
                            // (React's array of its children: made by its
                            // `createElement`, read-only.)
                            Abs::Ref(c) if pr.key == "children" && spread => {
                                let Some(HeapObj::Array(arr)) = heap.get(c) else { return None };
                                if !arr.props.is_empty() || !arr.holes.is_empty() {
                                    return None;
                                }
                                let mut items = Vec::with_capacity(arr.elems.len());
                                for e in arr.elems.iter() {
                                    items.push(part(self, e, budget, taker, path)?);
                                }
                                Shape::List(items)
                            }
                            v => part(self, v, budget, taker, path)?,
                        };
                        fields.push((pr.key.as_str()?.to_string(), fsh));
                    }
                    Shape::Record(fields)
                }
                (E_PROPS, _) => return None,
                (_, v) => part(self, v, budget, taker, path)?,
            };
            parts.push(sh);
        }
        Some(Shape::Element(parts))
    }

    /// The runtime element the element at `addr` is, when the body being
    /// made was given it known (`Shape::Element`) and it is that element
    /// still: made so, it is that runtime value (React then sees the same
    /// element it was given, as the original renders it).
    pub(super) fn react_element_ident(&self, addr: usize) -> Option<RExpr> {
        let react = self.react.as_ref()?;
        let body = self.current_body.get()?;
        react.element_idents.borrow().get(&(body, addr)).cloned()
    }

    /// An element given known (see `react_element_ident`) at `addr` in the
    /// body being made, the runtime element `ident` is.
    pub(super) fn react_note_element_ident(&self, addr: usize, ident: RExpr) {
        if let (Some(react), Some(body)) = (&self.react, self.current_body.get()) {
            react.element_idents.borrow_mut().insert((body, addr), ident);
        }
    }

    /// A model body (`rfid`) begins knowing `facts` (see `body_facts`).
    pub(super) fn react_note_body_facts(&self, rfid: usize, facts: &crate::facts::Facts) {
        if let Some(react) = &self.react {
            react.body_facts.borrow_mut().insert(rfid, facts.clone());
        }
    }

    /// The list `v` is, when `Array.prototype.map` made it in the body being
    /// made, of a callback with an item version (`react_map_call`): its
    /// variable.
    fn react_mapped_here(&self, v: Option<&Abs>) -> Option<usize> {
        let react = self.react.as_ref()?;
        let Some(Abs::Dyn(RExpr::Var(m))) = v else { return None };
        let body = self.react_building.get()?;
        react.mapped.borrow().get(m).is_some_and(|l| l.body == body).then_some(*m)
    }

    /// `recv.map(cb)` in a model body (a root's, or an item version's),
    /// `cb` a closure of known code, `Array.prototype` the built-in's: the
    /// call made at runtime as written, where it is written, and besides,
    /// the callback's item version (`react_item_fn`: the callback's code,
    /// what it returns rendered in place as React renders an item of a
    /// list) made beside it, of the same captures. When React renders the
    /// list as children and nothing else reads it, the call is made with
    /// that version when the method is the built-in `map` (see
    /// `react_settle_mapped`); else as written.
    pub(super) fn react_map_call(&self, s: &mut State, callee: &Abs, this: &Abs, args: &[Abs], pc: usize, out: &mut Vec<Op>) -> Option<Step<Js>> {
        self.react.as_ref()?;
        self.react_building.get()?;
        if self.facts_off || !self.pristine("Array") || !s.handlers.is_empty() || self.probing.get() || env_flag!("PE_NO_REACT_ITEMS") {
            return None;
        }
        // (`Array.from(items, callback)`, the built-in.)
        let from = matches!(callee, Abs::Dyn(RExpr::Get(o, m)) if m == "from" && matches!(&**o, RExpr::Global(g) if g == "Array"));
        if from {
            return self.react_mapped_call(s, None, &args[1..], args.first().cloned(), pc, out);
        }
        if args.len() != 1 {
            return None;
        }
        // (The method `recv.map`: read as written, pending, or read already
        // into a variable this block defines last as that read.)
        let (recv, read) = match (callee, this) {
            (Abs::Dyn(RExpr::Get(o, m)), Abs::Dyn(t)) if m == "map" && **o == *t => (t.clone(), None),
            (Abs::Dyn(RExpr::Var(v)), Abs::Dyn(t)) => {
                let def = out.iter().rev().find_map(|op| match op {
                    Op::Eval { dst, expr } | Op::Assign { var: dst, expr } if dst == v => Some(expr.clone()),
                    _ => None,
                });
                match def {
                    Some(RExpr::Get(o, m)) if m == "map" && *o == *t => (t.clone(), Some(RExpr::Var(*v))),
                    _ => return None,
                }
            }
            _ => return None,
        };
        self.react_mapped_call(s, Some((recv, read)), args, None, pc, out)
    }

    /// `react_map_call` of a callback `args[0]` (the only argument left):
    /// `recv.map`'s (the receiver, and its `map` when read already), or,
    /// with `items`, `Array.from`'s.
    fn react_mapped_call(&self, s: &mut State, map: Option<(RExpr, Option<RExpr>)>, args: &[Abs], items: Option<Abs>, pc: usize, out: &mut Vec<Op>) -> Option<Step<Js>> {
        let react = self.react.as_ref()?;
        let body = self.react_building.get()?;
        if args.len() != 1 {
            return None;
        }
        // (The callback: a closure, or `f.bind(t)` of one that escaped as
        // `f`, made in this block: its item version bound to `t` too.)
        let (cb, bound) = match &args[0] {
            // (What `bind` made of a function of known code: a closure of
            // that code for its item version, bound to its `this` too.)
            Abs::Ref(b) if matches!(s.heap.get(b), Some(HeapObj::Builtin { kind, .. }) if kind == BOUND) => {
                let Some(HeapObj::Builtin { data, .. }) = s.heap.get(b).cloned() else { unreachable!("a bound handle") };
                let Abs::Ref(t) = &data[0] else { return None };
                let Some(HeapObj::Closure { fid, captured, props, proto, once, .. }) = s.heap.get(t).cloned() else { return None };
                let code = s.alloc(HeapObj::Closure { fid, captured, props, proto, known: true, once, ident: None });
                (code, Some((handle_value(&data), data[1].to_rexpr())))
            }
            Abs::Ref(cb) => (*cb, None),
            Abs::Dyn(RExpr::Var(b)) if self.pristine("Function") => {
                let def = out.iter().rev().find_map(|op| match op {
                    Op::Eval { dst, expr } | Op::Assign { var: dst, expr } if dst == b => Some(expr.clone()),
                    _ => None,
                });
                let Some(RExpr::Call(c, xs)) = def else { return None };
                let RExpr::Get(f, m) = &*c else { return None };
                let RExpr::Var(e) = &**f else { return None };
                let addr = self.escape_addr(*e).filter(|a| m == "bind" && xs.len() == 1 && s.escaped.contains(a))?;
                (addr, Some((RExpr::Var(*b), xs[0].clone())))
            }
            _ => return None,
        };
        let o = s.heap.get(&cb).cloned()?;
        let HeapObj::Closure { fid, captured, once, known: true, ident: None, .. } = o.clone() else { return None };
        // (Its item version, of a copy of the closure: the same captures.)
        let copy = s.alloc(o);
        // (Made where it is made only: what it is given is what is known
        // there, as of a closure made once.)
        let _ = once;
        let forms = self.cap_forms(fid, copy, &captured, true, &s.heap);
        let heap = s.heap.clone();
        // (A copy nothing names: collected with the state's garbage.)
        let item = self.react_item_fn(fid, &forms, &captured, &heap, &s.facts, &s.value_vars())?;
        if env_flag!("REACT_DEBUG") {
            eprintln!("[REACT] map of {} with an item version", self.names[fid]);
        }
        self.forbid_residual_in_try(s, "an unmodeled call");
        self.freeze_before_opaque_call(s, pc, out);
        let mut escaped = std::collections::HashSet::new();
        let how = match (map, items) {
            (Some((recv, read)), None) => {
                // (The receiver once, and its `map`, read as written.)
                let recv = if matches!(recv, RExpr::Var(_) | RExpr::This) {
                    recv
                } else {
                    let r = self.aux_var(66, pc, 0);
                    self.emit_temp(s, r, recv, pc, out);
                    RExpr::Var(r)
                };
                let method = match read {
                    Some(f) => f,
                    None => {
                        let f = self.aux_var(66, pc, 1);
                        self.emit_temp(s, f, RExpr::Get(Box::new(recv.clone()), "map".into()), pc, out);
                        RExpr::Var(f)
                    }
                };
                MappedBy::Map { method, recv }
            }
            (None, Some(items)) => MappedBy::ArrayFrom { items: self.operand_rexpr(s, &items, &mut escaped, out) },
            _ => unreachable!("a list is mapped by `map` or `Array.from`"),
        };
        let plain = match &bound {
            Some((b, _)) => b.clone(),
            None => self.operand_rexpr(s, &Abs::Ref(cb), &mut escaped, out),
        };
        let saved = react.item_closure.replace(Some((copy, item)));
        let item_value = self.operand_rexpr(s, &Abs::Ref(copy), &mut escaped, out);
        react.item_closure.set(saved);
        let item_value = match &bound {
            Some((_, t)) => RExpr::Call(Box::new(RExpr::Get(Box::new(item_value), "bind".into())), vec![t.clone()]),
            None => item_value,
        };
        let list = MappedList { body, how, plain: plain.clone(), item: item_value };
        let RExpr::Call(callee, call_args) = list.made_with(&plain) else { unreachable!("a list is made by a call") };
        let v = self.runtime_call(s, *callee, call_args, pc, out);
        let Abs::Dyn(RExpr::Var(m)) = v else { unreachable!("a runtime call's value is its variable") };
        react.mapped.borrow_mut().insert(m, list);
        s.top_mut().pc += 1;
        s.top_mut().ostack.push(v);
        Some(Step::Continue)
    }

    /// The residual function of the copy of a callback at `addr` made for
    /// its item version (see `react_map_call`).
    pub(super) fn react_item_closure_fn(&self, addr: usize) -> Option<usize> {
        self.react.as_ref()?.item_closure.get().filter(|(a, _)| *a == addr).map(|(_, r)| r)
    }

    /// The values an item version (`rfid`) is given after those its closure
    /// passes (see `react_item_fn`): none for any other function.
    pub(super) fn react_item_imports(&self, rfid: usize) -> Vec<RExpr> {
        self.react.as_ref().and_then(|r| r.item_imports.borrow().get(&rfid).cloned()).unwrap_or_default()
    }

    /// The item version of a callback (`fid`, its captures `captured` as
    /// `forms`): `__pe_react_render_item`'s code, the callback called as
    /// `map` calls it and what it returns rendered in place as React
    /// renders the item of a list at that index (a model body of its own,
    /// made aside the one being made). `None` for a callback the model
    /// cannot run so, or whose body was not made.
    ///
    /// It is made where the callback is made, and only used there: what is
    /// known there of a runtime value its closure passes is known in it,
    /// and the variables that names are given to it besides (in order,
    /// `item_imports`), when each is one the state holds there (`held`: in
    /// scope; what is known of a value may name others, which it cannot be
    /// given).
    #[allow(clippy::too_many_arguments)]
    fn react_item_fn(&self, fid: usize, forms: &[CapForm], captured: &[Abs], heap: &Heap, outer: &crate::facts::Facts, held: &std::collections::HashSet<usize>) -> Option<usize> {
        let react = self.react.as_ref()?;
        if !matches!(self.fn_kinds[fid], FnKind::Normal | FnKind::Arrow) || self.is_async[fid] || self.arguments_slot[fid].is_some() {
            return None;
        }
        // (The runtime values its closure passes, by capture, and the
        // variables what is known of them names, all of them.)
        let ncap = self.ncaptured[fid];
        let mut given: Vec<(usize, usize)> = Vec::new();
        for (i, form) in forms.iter().enumerate().take(ncap) {
            let value = match form {
                CapForm::FinalCell(Shape::Runtime) => Js::final_cell_value(heap, &captured[i]),
                CapForm::Value(Shape::Runtime) if !self.fn_cell_captures[fid].get(i).copied().unwrap_or(false) => Some(captured[i].clone()),
                _ => None,
            };
            if let Some(Abs::Dyn(RExpr::Var(x))) = value {
                if outer.contains_key(&x) {
                    given.push((i, x));
                }
            }
        }
        let mut named: Vec<usize> = given.iter().map(|(_, x)| *x).collect();
        let mut todo = named.clone();
        while let Some(v) = todo.pop() {
            let mut vs = Vec::new();
            if let Some(i) = outer.get(&v) {
                i.vars(&mut vs);
            }
            for w in vs {
                if held.contains(&w) && !named.contains(&w) {
                    named.push(w);
                    todo.push(w);
                }
            }
        }
        let mut imports: Vec<usize> = named.iter().copied().filter(|v| !given.iter().any(|(_, x)| x == v)).collect();
        imports.sort_unstable();
        // (What is known of each, when all it names is given.)
        let mut known: Vec<(usize, Option<Info>)> = given
            .iter()
            .map(|(_, x)| *x)
            .chain(imports.iter().copied())
            .map(|v| {
                let info = outer.get(&v).filter(|i| {
                    let mut vs = Vec::new();
                    i.vars(&mut vs);
                    vs.iter().all(|w| named.contains(w))
                });
                (v, info.cloned())
            })
            .collect();
        known.sort_by_key(|(v, _)| *v);
        known.dedup_by_key(|(v, _)| *v);
        let key = (fid, forms.to_vec(), known.clone());
        if let Some(r) = react.item_memo.borrow().get(&key) {
            return *r;
        }
        // (The body being made goes on after: what it was making is kept.)
        let saved_building = self.react_building.get();
        let saved_root = react.root.get();
        let saved_grew = react.grew.get();
        let saved_ntake = react.building_ntake.get();
        let saved_types = std::mem::take(&mut *react.branch_types.borrow_mut());
        let saved_made = std::mem::take(&mut *react.made_elements.borrow_mut());
        let saved_configs = std::mem::take(&mut *react.element_configs.borrow_mut());
        let saved_tracked = std::mem::take(&mut *react.tracked.borrow_mut());
        let made = loop {
            let rfid = self.residual_fns.borrow().len();
            let ntake = self.ncaptured[fid] + Js::import_paths(forms).len();
            // (Its variables for what it is given: a capture's, or one
            // after the values it takes.)
            let inner: HashMap<usize, usize> = given
                .iter()
                .map(|(i, x)| (*x, self.residual_cap_var(rfid, *i)))
                .chain(imports.iter().enumerate().map(|(k, y)| (*y, self.residual_cap_var(rfid, ntake + k))))
                .collect();
            let extra: Vec<(usize, Info)> = known
                .iter()
                .filter_map(|(v, i)| i.as_ref().map(|i| (inner[v], i.renamed(&|w| inner.get(&w).copied().unwrap_or(w)))))
                .collect();
            self.react_building.set(Some(rfid));
            react.item_bodies.borrow_mut().insert(rfid);
            react.building_ntake.set(ntake + imports.len());
            react.root.set(Some(fid));
            react.grew.set(false);
            react.branch_types.borrow_mut().clear();
            react.made_elements.borrow_mut().clear();
            react.element_configs.borrow_mut().clear();
            let made = self.make_model_body_fn(fid, rfid, forms, react.model[RENDER_ITEM], self.root_self_var(rfid), &[], &extra, imports.len());
            if made {
                react.item_imports.borrow_mut().insert(rfid, imports.iter().map(|y| RExpr::Var(*y)).collect());
            }
            if made && react.grew.get() {
                continue;
            }
            if made {
                self.react_note_branch_roots(rfid, forms, captured, heap);
                let mut rfs = self.residual_fns.borrow_mut();
                self.react_share_elements(&mut rfs[rfid].body);
                self.react_settle_mapped(rfid, &mut rfs[rfid].body);
            } else if env_flag!("REACT_DEBUG") {
                eprintln!("[REACT] item version of {}: refused (its model body was not made)", self.names[fid]);
            }
            break made.then_some(rfid);
        };
        self.react_building.set(saved_building);
        react.root.set(saved_root);
        react.grew.set(saved_grew);
        react.building_ntake.set(saved_ntake);
        *react.branch_types.borrow_mut() = saved_types;
        *react.made_elements.borrow_mut() = saved_made;
        *react.element_configs.borrow_mut() = saved_configs;
        *react.tracked.borrow_mut() = saved_tracked;
        react.item_memo.borrow_mut().insert(key, made);
        made
    }

    /// After a body (`rfid`) was made: each list made in it that React
    /// renders as children there (`MAP_NOW`) is made with its callback's
    /// item version, `method === Array.prototype.map ? method.call(recv,
    /// item) : method.call(recv, plain)`, when nothing else reads the list;
    /// else the list stands where it was rendered, as made.
    fn react_settle_mapped(&self, rfid: usize, body: &mut crate::residual::Program<Op, Cond>) {
        let Some(react) = &self.react else { return };
        // (Each list once: React may render one where two paths meet.)
        let uses: Vec<(usize, usize)> = {
            let mut all = react.mapped_uses.borrow_mut();
            let mut mine: Vec<(usize, usize)> = all.iter().filter(|(b, _, _)| *b == rfid).map(|(_, m, m2)| (*m, *m2)).collect();
            all.retain(|(b, _, _)| *b != rfid);
            mine.sort_unstable();
            mine.dedup();
            mine
        };
        if uses.is_empty() {
            return;
        }
        let counts = crate::inline::use_counts(body);
        let mut back: HashMap<usize, usize> = HashMap::new();
        for (m, m2) in uses {
            if counts.get(&m2).copied().unwrap_or(0) == 0 || back.contains_key(&m2) {
                continue;
            }
            let list = react.mapped.borrow()[&m].clone();
            let mut rewritten = false;
            if counts.get(&m).copied().unwrap_or(0) == 0 {
                let made = list.made_with_item();
                for b in &mut body.blocks {
                    for op in &mut b.ops {
                        if matches!(op, Op::Eval { dst, .. } if *dst == m) {
                            *op = Op::Eval { dst: m2, expr: made.clone() };
                            rewritten = true;
                        }
                    }
                }
            }
            if !rewritten {
                back.insert(m2, m);
            }
        }
        if !back.is_empty() {
            crate::inline::rename_vars_in(body, &|v| back.get(&v).copied().unwrap_or(v));
        }
        // (A plain callback made in a variable by making a closure, or
        // binding one made for it alone, both without effect: made where it
        // is read, when that is once (the arm for another `map` than the
        // built-in's), else not at all when nothing reads it now.)
        let function = self.pristine("Function");
        fn atom(e: &RExpr) -> bool {
            matches!(e, RExpr::Var(_) | RExpr::This | RExpr::Num(_) | RExpr::Str(_) | RExpr::Bool(_) | RExpr::Undef | RExpr::Null)
        }
        fn closure(e: &RExpr) -> bool {
            matches!(e, RExpr::FnRef { caps, .. } if caps.iter().all(atom))
        }
        let counts = crate::inline::use_counts(body);
        let defs: HashMap<usize, RExpr> = body
            .blocks
            .iter()
            .flat_map(|b| b.ops.iter())
            .filter_map(|op| match op {
                Op::Eval { dst, expr } | Op::Assign { var: dst, expr } => Some((*dst, expr.clone())),
                _ => None,
            })
            .collect();
        // (Its expression, and the variables made for it alone.)
        let made_of = |b: usize| -> Option<(RExpr, Vec<usize>)> {
            let e = defs.get(&b)?;
            if closure(e) {
                return Some((e.clone(), vec![b]));
            }
            let RExpr::Call(c, xs) = e else { return None };
            let RExpr::Get(f, m) = &**c else { return None };
            if !function || m != "bind" || !xs.iter().all(atom) {
                return None;
            }
            match &**f {
                f if closure(f) => Some((e.clone(), vec![b])),
                RExpr::Var(t) if counts.get(t).copied() == Some(1) && defs.get(t).is_some_and(closure) => {
                    Some((RExpr::Call(Box::new(RExpr::Get(Box::new(defs[t].clone()), "bind".into())), xs.clone()), vec![b, *t]))
                }
                _ => None,
            }
        };
        let plains: Vec<usize> = react
            .mapped
            .borrow()
            .values()
            .filter(|l| l.body == rfid)
            .filter_map(|l| match &l.plain {
                RExpr::Var(b) if counts.get(b).copied().unwrap_or(0) <= 1 => Some(*b),
                _ => None,
            })
            .collect();
        let mut gone: Vec<usize> = Vec::new();
        let mut inline: HashMap<usize, RExpr> = HashMap::new();
        for b in plains {
            // (Each made once, by one op.)
            let once = body.blocks.iter().flat_map(|bl| bl.ops.iter()).filter(|op| matches!(op, Op::Eval { dst, .. } | Op::Assign { var: dst, .. } if *dst == b)).count() == 1;
            let Some((e, made)) = made_of(b).filter(|_| once) else { continue };
            if counts.get(&b).copied().unwrap_or(0) == 1 {
                inline.insert(b, e);
            }
            gone.extend(made);
        }
        if gone.is_empty() {
            return;
        }
        for bl in &mut body.blocks {
            bl.ops.retain(|op| !matches!(op, Op::Eval { dst, .. } | Op::Assign { var: dst, .. } if gone.contains(dst)));
            for op in &mut bl.ops {
                for (b, e) in &inline {
                    if let Op::Eval { expr, .. } | Op::Assign { expr, .. } = op {
                        if rexpr_contains(expr, &|x| matches!(x, RExpr::Var(v) if v == b)) {
                            *expr = crate::inline::substitute_all(expr, *b, e);
                        }
                    }
                }
            }
        }
    }

    /// The element (`kind`) of a root's body just materialized into `dst`,
    /// after the ops `pre` (its config made among them): noted for
    /// `react_share_elements`.
    pub(super) fn react_note_element(&self, kind: &str, dst: usize, pre: &[Op]) {
        let Some(react) = &self.react else { return };
        if kind != ELEMENT || self.react_building.get().is_none() {
            return;
        }
        react.made_elements.borrow_mut().insert(dst);
        for op in pre {
            if let Op::NewObject { dst: c, .. } = op {
                react.element_configs.borrow_mut().insert(*c);
            }
        }
    }

    /// In each straight-line run of a root's body (`body`), an element made
    /// (`React.createElement(type, config, ...children)`, see
    /// `react_note_element`) equal to one made before it is that one: of
    /// the same arguments, each config an object made for it alone with the
    /// same properties, nothing but such elements, objects and arrays made
    /// and variables assigned between them. React's contract: an element is
    /// an immutable description, which React renders the same wherever it
    /// stands and however many times it does, and `createElement` reads only
    /// its arguments and its type's `defaultProps`, which nothing between
    /// the two changes.
    fn react_share_elements(&self, body: &mut crate::residual::Program<Op, Cond>) {
        let Some(react) = &self.react else { return };
        let (made, configs) = (react.made_elements.borrow(), react.element_configs.borrow());
        if made.len() < 2 {
            return;
        }
        let uses = crate::inline::use_counts(body);
        let mentions = |e: &RExpr, x: usize| {
            let mut vs = Vec::new();
            crate::coalesce::rexpr_vars(e, &mut vs);
            vs.contains(&x)
        };
        for b in &mut body.blocks {
            // (The elements made so far, by what made them; the variables
            // holding one made before; the configs made, by variable: where
            // and with what properties.)
            let mut table: Vec<(RExpr, usize)> = Vec::new();
            let mut alias: HashMap<usize, usize> = HashMap::new();
            let mut cfgs: HashMap<usize, (usize, Vec<(String, RExpr)>)> = HashMap::new();
            let mut dropped: Vec<usize> = Vec::new();
            for i in 0..b.ops.len() {
                let def = match &b.ops[i] {
                    Op::Assign { var, .. } => Some(*var),
                    Op::Eval { dst, .. } | Op::NewObject { dst, .. } | Op::NewArray { dst, .. } => Some(*dst),
                    _ => None,
                };
                let pure = match &b.ops[i] {
                    Op::Assign { .. } | Op::NewObject { .. } | Op::NewArray { .. } => true,
                    Op::Eval { dst, expr: RExpr::Call(..) } => made.contains(dst),
                    _ => false,
                };
                if !pure {
                    table.clear();
                    alias.clear();
                    cfgs.clear();
                    continue;
                }
                // (What held the variable assigned here no longer does.)
                if let Some(x) = def {
                    table.retain(|(k, v)| *v != x && !mentions(k, x));
                    alias.retain(|k, v| *k != x && *v != x);
                    cfgs.retain(|c, (_, fs)| *c != x && !fs.iter().any(|(_, e)| mentions(e, x)));
                }
                let canon = |e: &RExpr, alias: &HashMap<usize, usize>| crate::inline::rename_vars(e, &|v| alias.get(&v).copied().unwrap_or(v));
                match &b.ops[i] {
                    Op::NewObject { dst, fields } if configs.contains(dst) && uses.get(dst).copied() == Some(1) => {
                        let fs = fields.iter().map(|(k, e)| (k.clone(), canon(e, &alias))).collect();
                        cfgs.insert(*dst, (i, fs));
                    }
                    Op::Eval { dst, expr: RExpr::Call(callee, args) } if made.contains(dst) => {
                        let key = RExpr::Call(
                            Box::new(canon(callee, &alias)),
                            args.iter()
                                .map(|a| match a {
                                    RExpr::Var(c) if cfgs.contains_key(c) => RExpr::ObjectLit(cfgs[c].1.clone()),
                                    a => canon(a, &alias),
                                })
                                .collect(),
                        );
                        let dst = *dst;
                        match table.iter().find(|(k, _)| *k == key).map(|(_, v)| *v) {
                            Some(v) => {
                                for a in args {
                                    if let RExpr::Var(c) = a {
                                        if let Some((at, _)) = cfgs.get(c) {
                                            dropped.push(*at);
                                        }
                                    }
                                }
                                b.ops[i] = Op::Assign { var: dst, expr: RExpr::Var(v) };
                                alias.insert(dst, v);
                            }
                            None => table.push((key, dst)),
                        }
                    }
                    _ => {}
                }
            }
            dropped.sort_unstable();
            for at in dropped.into_iter().rev() {
                b.ops.remove(at);
            }
        }
    }

    /// Note the type of element `e`, which the root whose body is being
    /// made renders as an element (see `branch_types`).
    fn react_note_branch_type(&self, s: &State, e: Option<&Abs>) {
        let Some(react) = &self.react else { return };
        if react.root.get().is_none() {
            return;
        }
        let Some(Abs::Ref(e)) = e else { return };
        let Some(HeapObj::Builtin { kind, data, .. }) = s.heap.get(e) else { return };
        if kind != ELEMENT {
            return;
        }
        let t = match &data[E_TYPE] {
            Abs::Ref(a) => match s.heap.get(a) {
                Some(HeapObj::Closure { fid, .. }) => BranchType::Known(*fid),
                _ => return,
            },
            Abs::Dyn(RExpr::Var(v)) => match s.facts.get(v).and_then(|i| i.callee.as_ref()) {
                Some(kf) => BranchType::Known(kf.fid),
                None => BranchType::Var(*v),
            },
            _ => return,
        };
        react.branch_types.borrow_mut().push(t);
    }

    /// After the body of a root (`rfid`, its closure's captures `captured`
    /// passed as `forms`) was made: each class among the types of the
    /// elements it renders as elements is a root of its own, its `render`
    /// a model body as a root class's (Prepack's branch roots): the program
    /// is specialized again when one is new (see `react_mark_root`). A type
    /// the body knew nothing of is located among what the root took: a
    /// capture that escaped as a class, whose code is then known here.
    fn react_note_branch_roots(&self, rfid: usize, forms: &[CapForm], captured: &[Abs], heap: &Heap) {
        let Some(react) = &self.react else { return };
        let types: Vec<BranchType> = react.branch_types.borrow_mut().drain(..).collect();
        for t in types {
            let fid = match t {
                BranchType::Known(f) => Some(f),
                BranchType::Var(v) => (0..captured.len().min(forms.len())).find(|&i| self.residual_cap_var(rfid, i) == v).and_then(|i| {
                    let value = match &forms[i] {
                        CapForm::FinalCell(_) => Js::final_cell_value(heap, &captured[i])?,
                        CapForm::Value(_) => captured[i].clone(),
                    };
                    match value {
                        Abs::Ref(a) => match heap.get(&a) {
                            Some(HeapObj::Closure { fid, .. }) => Some(*fid),
                            _ => None,
                        },
                        Abs::Dyn(RExpr::Var(x)) => react.escaped_fns.borrow().get(&x).copied(),
                        _ => None,
                    }
                }),
            };
            let Some(fid) = fid else { continue };
            if !matches!(self.fn_kinds[fid], FnKind::ClassCtor { .. }) {
                continue;
            }
            let Some(render) = self.proto_methods[fid].iter().find(|(n, _)| n == "render").map(|(_, m)| *m) else { continue };
            if react.methods.borrow_mut().insert(render) {
                if env_flag!("REACT_DEBUG") {
                    eprintln!("[REACT] branch root: {}'s render", self.names[fid]);
                }
                react.again.set(true);
            }
        }
    }

    /// The residual function of a root's closure (`fid`, captures as
    /// `forms`): `__pe_react_render`'s code, the root's code run on the
    /// props React passes (see the module comment); `None` for a function
    /// that is no root, or whose model body needed the root function as a
    /// value.
    pub(super) fn react_root_fn(&self, fid: usize, forms: &[CapForm], captured: &[Abs], heap: &Heap) -> Option<usize> {
        let react = self.react.as_ref()?;
        let method = react.methods.borrow().contains(&fid);
        if !(method || react.roots.borrow().contains(&fid)) || react.refused.borrow().contains(&fid) || self.react_building.get().is_some() {
            return None;
        }
        // (Not a function whose code the model body cannot run as the root:
        // see `inlinable`.)
        // (A simple class root's constructor does not run, only its `render`
        // does: see `react_class_root_fn`.)
        let class_root = react.class_roots.borrow().contains(&fid) && forms.len() == self.ncaptured[fid] + 1;
        let kinds_ok = if method {
            matches!(self.fn_kinds[fid], FnKind::Normal | FnKind::Method)
        } else {
            class_root || matches!(self.fn_kinds[fid], FnKind::Normal | FnKind::Arrow)
        };
        if !kinds_ok || (!class_root && (self.is_async[fid] || self.arguments_slot[fid].is_some())) || (method && !self.pristine("Object")) {
            if env_flag!("REACT_DEBUG") {
                eprintln!("[REACT] root {}: not a function the model runs", self.names[fid]);
            }
            return None;
        }
        let key = (fid, forms.to_vec());
        if let Some(&r) = self.react_root_memo.borrow().get(&key) {
            return Some(r);
        }
        let render = if method {
            react.model[RENDER_METHOD]
        } else if class_root {
            react.model[RENDER]
        } else if self.nparams[fid] <= 1 {
            react.model[RENDER1]
        } else {
            react.model[RENDER]
        };
        // (Made again while a component it had rendered in place turns out
        // not to render so everywhere: see `inlinable`.)
        loop {
            let rfid = self.residual_fns.borrow().len();
            self.react_building.set(Some(rfid));
            react.building_ntake.set(self.ncaptured[fid] + Js::import_paths(forms).len());
            react.root.set(Some(fid));
            react.grew.set(false);
            let param_facts: Vec<(usize, Info)> = if method { Vec::new() } else { vec![(0, Js::react_props_info())] };
            if !method {
                react.props_vars.borrow_mut().insert(self.residual_param_var(rfid, 0));
            }
            react.branch_types.borrow_mut().clear();
            react.made_elements.borrow_mut().clear();
            react.element_configs.borrow_mut().clear();
            let made = self.make_model_body_fn(fid, rfid, forms, render, self.root_self_var(rfid), &param_facts, &[], 0);
            self.react_building.set(None);
            react.root.set(None);
            if made && react.grew.get() {
                continue;
            }
            // (A body is kept whenever it was made: what it renders in place
            // is computed here, whatever the output's size.)
            if !made {
                if env_flag!("REACT_DEBUG") {
                    eprintln!("[REACT] root {}: refused (its model body was not made)", self.names[fid]);
                }
                react.refused.borrow_mut().insert(fid);
                return None;
            }
            self.react_root_memo.borrow_mut().insert(key, rfid);
            self.react_note_branch_roots(rfid, forms, captured, heap);
            {
                let mut rfs = self.residual_fns.borrow_mut();
                self.react_share_elements(&mut rfs[rfid].body);
                self.react_settle_mapped(rfid, &mut rfs[rfid].body);
            }
            // (A class's: a function component standing for it.)
            if class_root {
                self.residual_fns.borrow_mut()[rfid].kind = FnKind::Normal;
                react.function_rfids.borrow_mut().insert(rfid);
            }
            return Some(rfid);
        }
    }

}
