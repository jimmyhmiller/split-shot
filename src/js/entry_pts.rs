//! What the runtime may change of the objects the load code leaves (see
//! `Js::entry_conflicts`): a points-to analysis of the residual code.
//!
//! The load code's objects (the boundary's, `B`) are what `main` may take
//! as known from one call to the next, as long as no runtime code writes
//! them. Before this, any runtime write by key anywhere made every object
//! runtime code can reach a runtime one: a library's options object, read
//! by callbacks and never written, went with the `argv` the same code
//! builds. Here each value of the residual code is the set of objects it
//! may be (`Pts`): a boundary object, one the runtime makes at an
//! allocation site, a residual function's closures, a standard built-in,
//! or anything else (`Unknown`). Flow-insensitive, field-insensitive, to a
//! fixpoint over the load code, `main` and the residual functions.
//!
//! It is conservative where it does not follow the flow:
//! - an object given to code it does not see (a call it does not resolve,
//!   a built-in it does not know, a `throw`, a `yield`, a global, `main`'s
//!   result) *escapes*: that code may write it and everything in it;
//! - a function made as a value may be called with anything (`Unknown` its
//!   parameters, `this` and `arguments`), and what it returns escapes;
//! - an object with a function among its properties (on its prototype
//!   chain) escapes: a method, getter, `toString` or `valueOf` of it may
//!   run with it as `this` where no call is written;
//! - code it does not see at all (a class made from its source, verbatim
//!   source) gives up: `None`, and every object runtime code reaches is
//!   runtime state as before.
//!
//! A boundary object written, or escaped, may change: the result.

use super::*;
use std::collections::BTreeSet;

#[derive(Clone, PartialEq, Eq, Hash, Debug)]
enum Loc {
    /// A boundary object (an address of the snapshot).
    B(usize),
    /// An object the runtime makes: (program, where in it: the blocks
    /// and ops down to the op, then which allocation of the op's).
    Site(usize, Vec<u32>),
    /// The closures of a residual function.
    Fn(usize),
    /// A standard built-in, by its dotted path.
    Builtin(String),
    /// Anything the analysis does not follow.
    Unknown,
}

type Pts = BTreeSet<u32>;

/// A property of an object, as the analysis tells them apart.
#[derive(Clone, PartialEq, Eq, Hash, Debug)]
enum Field {
    /// One by a name known (a static key).
    Name(String),
    /// An element (an array index).
    Index,
    /// Any other: a key computed, a symbol's.
    Any,
    /// No property: what a built-in object holds inside (a collection's
    /// entries, an iterator's or a RegExp's state).
    Internal,
    /// An accessor's getter, its setter, by the property's name (`""`: a
    /// symbol's).
    Getter(String),
    Setter(String),
    /// What a definition stored (`Object.defineProperty` and its kind):
    /// a value, or an accessor, of a key not known.
    Defined,
}

impl Field {
    /// The property named `k`: an element when `k` is an array index's
    /// canonical string (`"0"`), as `o[0]` and `o["0"]` are one property.
    fn named(k: &str) -> Field {
        if JsNum::parse(k).as_index().is_some_and(|i| JsNum::int(i as i64).to_js_string() == k) {
            Field::Index
        } else {
            Field::Name(k.to_string())
        }
    }
}

/// A program's own variables at a point of it.
type Env = im::OrdMap<usize, Pts>;

fn join_env(a: &Env, b: &Env) -> Env {
    join_env_changed(a, b).0
}

/// `a` joined with `b`, and whether that is more than `a`: only the
/// entries the two do not share are looked at.
fn join_env_changed(a: &Env, b: &Env) -> (Env, bool) {
    if a.ptr_eq(b) {
        return (a.clone(), false);
    }
    let mut out = a.clone();
    let mut changed = false;
    for d in a.diff(b) {
        match d {
            im::ordmap::DiffItem::Add(k, v) => {
                out.insert(*k, v.clone());
                changed = true;
            }
            im::ordmap::DiffItem::Update { old: (k, have), new: (_, v) } => {
                if !v.is_subset(have) {
                    let mut u = have.clone();
                    u.extend(v.iter().copied());
                    out.insert(*k, u);
                    changed = true;
                }
            }
            im::ordmap::DiffItem::Remove(..) => {}
        }
    }
    (out, changed)
}

/// The scope of a variable more than one program names.
const SHARED: usize = usize::MAX;

/// Methods of the standard prototypes that change only their receiver.
const MUTATING_METHODS: &[&str] = &[
    "push", "pop", "shift", "unshift", "splice", "sort", "reverse", "fill", "copyWithin", "set", "add", "delete", "clear", "exec",
    "test", "next", "return", "throw",
];

/// Methods of the standard prototypes that change nothing (they may call a
/// function they are given: see `builtin_call`).
const READING_METHODS: &[&str] = &[
    "concat", "slice", "indexOf", "lastIndexOf", "includes", "join", "toString", "toLocaleString", "at", "keys", "values",
    "entries", "flat", "find", "findIndex", "findLast", "findLastIndex", "every", "some", "forEach", "map", "filter", "reduce",
    "reduceRight", "flatMap", "toSorted", "toReversed", "with", "charAt", "charCodeAt", "codePointAt", "startsWith", "endsWith",
    "trim", "trimStart", "trimEnd", "trimLeft", "trimRight", "padStart", "padEnd", "repeat", "split", "substring", "substr",
    "toLowerCase", "toUpperCase", "toLocaleLowerCase", "toLocaleUpperCase", "normalize", "localeCompare", "match", "matchAll",
    "replace", "replaceAll", "search", "get", "has", "toFixed", "toPrecision", "toExponential", "valueOf", "hasOwnProperty",
    "isPrototypeOf", "propertyIsEnumerable", "getTime", "toISOString", "toJSON", "getFullYear", "getMonth", "getDate", "getDay",
    "getHours", "getMinutes", "getSeconds", "getMilliseconds", "getUTCFullYear", "getUTCMonth", "getUTCDate", "getUTCDay",
    "getUTCHours", "getUTCMinutes", "getUTCSeconds", "getUTCMilliseconds", "getTimezoneOffset", "toDateString",
    "toTimeString", "toUTCString", "toLocaleDateString", "toLocaleTimeString", "description", "bind_never",
];

/// The standard methods that call a function they are given.
const CALLBACK_METHODS: &[&str] = &[
    "forEach", "map", "filter", "some", "every", "find", "findIndex", "findLast", "findLastIndex", "reduce", "reduceRight",
    "flatMap", "sort", "toSorted", "replace", "replaceAll",
];

/// The standard functions that call a function they are given.
const CALLBACK_STATICS: &[&str] = &["Array.from", "JSON.parse", "JSON.stringify", "Promise"];

/// The standard methods whose result may be one of the receiver's
/// elements (or an argument: `reduce`'s initial value).
const ELEMENT_RESULT_METHODS: &[&str] = &["find", "findLast", "at", "pop", "shift", "get", "reduce", "reduceRight", "valueOf"];

/// Of those, the ones whose result is a fresh object (holding what it is
/// made from), never the receiver or one of its elements.
const FRESH_RESULT_METHODS: &[&str] = &[
    "concat", "slice", "map", "filter", "flat", "flatMap", "keys", "values", "entries", "split", "toSorted", "toReversed",
    "with", "match", "matchAll",
];

/// Standard functions that change nothing (they may call a function they
/// are given: see `builtin_call`).
const READING_STATICS: &[&str] = &[
    "Object.keys", "Object.values", "Object.entries", "Object.getOwnPropertyNames", "Object.getOwnPropertySymbols",
    "Object.getOwnPropertyDescriptor", "Object.getOwnPropertyDescriptors", "Object.getPrototypeOf", "Object.isFrozen",
    "Object.isSealed", "Object.isExtensible", "Object.is", "Object.hasOwn", "Object.fromEntries", "Object.create",
    "Array.isArray", "Array.of", "Array.from", "JSON.stringify", "JSON.parse", "String", "Number", "Boolean", "Symbol",
    "Symbol.for", "Symbol.keyFor", "parseInt", "parseFloat", "isNaN", "isFinite", "encodeURIComponent", "decodeURIComponent",
    "encodeURI", "decodeURI", "String.fromCharCode", "String.fromCodePoint", "String.raw", "Date.now", "Date.UTC",
    "Date.parse", "BigInt", "Reflect.ownKeys", "Reflect.has", "Reflect.getPrototypeOf", "Reflect.getOwnPropertyDescriptor",
    "Number.isInteger", "Number.isSafeInteger", "Number.isFinite", "Number.isNaN", "Number.parseFloat", "Number.parseInt",
    "Map", "Set", "WeakMap", "WeakSet", "Date", "RegExp", "Error", "TypeError", "RangeError", "SyntaxError", "ReferenceError",
    "Array", "Object", "Uint8Array", "Int8Array", "Uint16Array", "Int16Array", "Uint32Array", "Int32Array", "Float32Array",
    "Float64Array", "Uint8ClampedArray", "ArrayBuffer", "TextEncoder", "TextDecoder",
];

/// Standard functions that change their first argument (and store what
/// the others hold in it).
const MUTATING_STATICS: &[&str] = &[
    "Object.assign", "Object.defineProperty", "Object.defineProperties", "Object.freeze", "Object.seal",
    "Object.preventExtensions", "Object.setPrototypeOf", "Reflect.set", "Reflect.defineProperty", "Reflect.deleteProperty",
    "Reflect.setPrototypeOf", "Reflect.preventExtensions",
];

struct Pta<'a> {
    js: &'a Js,
    fns: &'a [ResidualFn],
    snapshot: &'a Heap,
    locs: Vec<Loc>,
    ids: HashMap<Loc, u32>,
    /// Per variable, by the program it is one of (`SHARED` for one more
    /// than one program names: see `Pta::scope`).
    vars: HashMap<(usize, usize), Pts>,
    /// The variables more than one program names: residual functions'
    /// parameters (given by their callers), the boundary's objects', the
    /// load code's that `main` reads. (Any other is a program's own: the
    /// same purpose at the same place in two programs is two variables.)
    shared: std::collections::HashSet<usize>,
    /// What each object may hold, by property: a name known (`Some`), or
    /// any other (`None`: a key computed, an element).
    contents: HashMap<u32, HashMap<Field, Pts>>,
    this_of: HashMap<usize, Pts>,
    ret: HashMap<usize, Pts>,
    globals: HashMap<String, Pts>,
    global_roots: HashMap<String, usize>,
    /// Variables the load code put a boundary object in.
    seeds: HashMap<usize, Pts>,
    /// Residual functions made where the analysis does not see: called
    /// with anything.
    unreferred: BTreeSet<usize>,
    /// What a runtime-made object inherits (an instance, its
    /// constructor's holdings: see `Pta::call`).
    protos: HashMap<u32, Pts>,
    /// What a built-in's result is made of: any property of it may hold
    /// anything those objects hold (read when it is read, not copied).
    wraps: HashMap<u32, Pts>,
    /// `held`'s results, while no object's holdings change.
    held_memo: RefCell<HashMap<u32, Pts>>,
    /// `held_field`'s, and `may_have_accessors`', likewise.
    field_memo: RefCell<HashMap<(u32, Field), Pts>>,
    acc_memo: RefCell<HashMap<u32, bool>>,
    /// The objects with an accessor (or a definition's value) of their own
    /// (as of the last `settle`): see `Pta::accessors`.
    acc_locs: Pts,
    esc: Pts,
    written: Pts,
    /// What the code run at runtime has in hand.
    in_hand: Pts,
    /// The variables the current residual function's body defines: its
    /// own, from a heap of its own (an `Escape` variable there names its
    /// object, no boundary object), shadowing the load code's of the same
    /// name. (Its parameters are shared: its callers give them.)
    own: std::collections::HashSet<usize>,
    /// Per program, the variables it defines (see `own`).
    defined: Vec<std::collections::HashSet<usize>>,
    /// Whether runtime code calls code that may read the program's globals
    /// (a function not known, `eval` and the standard functions that run
    /// source text): their objects then escape. The code outside only
    /// reads them, and calls `main` (see `EntrySplit`); a standard
    /// function reads none.
    unfollowed: bool,
    /// The residual functions a boundary function was made as (by the
    /// load code, into its variable).
    fn_of_b: HashMap<usize, BTreeSet<usize>>,
    /// Per residual function, whether its code reads `this`.
    uses_this: HashMap<usize, bool>,
    /// The globals the programs assign.
    assigned_globals: std::collections::HashSet<String>,
    /// The arguments of the call being dispatched, as written.
    arg_exprs: Vec<RExpr>,
    unseen: bool,
    changed: bool,
    /// (`ENTRY_DEBUG`: why each object first escaped or was written.)
    debug: bool,
    cur_op: String,
    reasons: HashMap<u32, String>,
    // The program being walked.
    prog: usize,
    /// Where the walk is: (block, op) per nested program, and how many
    /// objects the op made so far (see `Loc::Site`).
    at: Vec<u32>,
    site: u32,
    /// The current program's own variables at this point of it (see
    /// `Pta::shared`): flow-sensitive, an assignment replacing what one held.
    env: Env,
    runtime: bool,
    rfid: Option<usize>,
}

impl<'a> Pta<'a> {
    fn id(&mut self, l: Loc) -> u32 {
        if let Some(&i) = self.ids.get(&l) {
            return i;
        }
        let i = self.locs.len() as u32;
        self.locs.push(l.clone());
        self.ids.insert(l.clone(), i);
        // (A boundary object holds what the snapshot says: its properties
        // and elements, its prototype; a function's properties, not its
        // captures, which its residual function is given.)
        if let Loc::B(a) = l {
            let mut fields: Vec<(Field, usize)> = Vec::new();
            if let Some(o) = self.snapshot.get(&a) {
                let named = |props: &[Prop], out: &mut Vec<(Field, usize)>| {
                    for p in props {
                        let k = match p.key.as_str() {
                            Some(k) => Field::named(k),
                            None => Field::Any,
                        };
                        match &p.val {
                            PVal::Data(v) => out.extend(as_ref_addr(v).map(|c| (k.clone(), c))),
                            PVal::Accessor { get, set } => {
                                let name = p.key.as_str().unwrap_or("").to_string();
                                out.extend(as_ref_addr(get).map(|c| (Field::Getter(name.clone()), c)));
                                out.extend(as_ref_addr(set).map(|c| (Field::Setter(name.clone()), c)));
                            }
                        }
                    }
                };
                match o {
                    HeapObj::Object { props, private, .. } => {
                        named(props, &mut fields);
                        fields.extend(private.iter().filter_map(|e| e.val.as_ref()).filter_map(as_ref_addr).map(|c| (Field::Any, c)));
                    }
                    HeapObj::Closure { props, .. } => named(props, &mut fields),
                    HeapObj::Array(xs) => {
                        named(&xs.props, &mut fields);
                        fields.extend(xs.elems.iter().filter_map(as_ref_addr).map(|c| (Field::Index, c)));
                    }
                    o => {
                        let protos: Vec<usize> = match o {
                            HeapObj::Object { proto, .. } | HeapObj::Closure { proto, .. } => as_ref_addr(proto).into_iter().collect(),
                            _ => Vec::new(),
                        };
                        let inner = if matches!(o, HeapObj::Builtin { .. }) { Field::Internal } else { Field::Any };
                        fields.extend(o.child_refs().into_iter().filter(|c| !protos.contains(c)).map(|c| (inner.clone(), c)));
                    }
                }
            }
            let mut held: HashMap<Field, Pts> = HashMap::new();
            for (k, c) in fields {
                if self.snapshot.contains_key(&c) {
                    let b = self.id(Loc::B(c));
                    held.entry(k).or_default().insert(b);
                }
            }
            self.contents.insert(i, held);
        }
        i
    }

    fn one(&mut self, l: Loc) -> Pts {
        let mut p = Pts::new();
        p.insert(self.id(l));
        p
    }

    fn unknown(&mut self) -> Pts {
        self.one(Loc::Unknown)
    }

    fn grow(set: &mut Pts, more: &Pts, changed: &mut bool) {
        for x in more {
            if set.insert(*x) {
                *changed = true;
            }
        }
    }

    /// `p` with every escaped object as `Unknown`: what code not followed
    /// may have done to one, it may have done to any, and each counts as
    /// written already (see `Pta::read`).
    /// (A function escaped stays itself: its code is known, and a call of
    /// it still runs that code, given anything: see `settle`.)
    fn norm(&mut self, p: &Pts) -> Pts {
        if !p.iter().any(|l| self.esc.contains(l) && !self.is_function(*l)) {
            return p.clone();
        }
        let u = self.id(Loc::Unknown);
        p.iter().map(|&l| if self.esc.contains(&l) && !self.is_function(l) { u } else { l }).collect()
    }

    /// `v` assigned `p`: a program's own variable now holds just that, a
    /// shared one that too.
    fn add_var(&mut self, v: usize, p: &Pts) {
        let p = self.norm(p);
        if !self.is_shared(v) {
            self.env.insert(v, p);
            return;
        }
        let mut ch = false;
        let k = self.scope(v);
        Self::grow(self.vars.entry(k).or_default(), &p, &mut ch);
        if ch && self.debug && std::env::var("ENTRY_PTS_DEF").is_ok_and(|d| d == v.to_string()) {
            let shown: Vec<String> = p.iter().map(|&l| format!("{:?}", self.locs[l as usize])).collect();
            eprintln!("[ENTRY]       v{v} += {} in program {} at {}", shown.join(" "), self.prog, self.cur_op);
        }
        self.changed |= ch;
    }

    fn add_contents(&mut self, l: u32, p: &Pts) {
        self.add_field(l, Field::Any, p);
    }

    /// `p` stored in `l`'s property `f`.
    fn add_field(&mut self, l: u32, f: Field, p: &Pts) {
        // (What is stored in an escaped object escapes: see `settle`.)
        if self.esc.contains(&l) {
            self.escape(p);
            return;
        }
        let p = self.norm(p);
        let mut ch = false;
        Self::grow(self.contents.entry(l).or_default().entry(f).or_default(), &p, &mut ch);
        if ch {
            self.holdings_changed();
        }
        self.changed |= ch;
    }

    fn note(&mut self, p: &Pts, what: &str) {
        if self.debug {
            for &l in p {
                if !self.reasons.contains_key(&l) {
                    let r = format!("{what} in program {}: {}", self.prog, self.cur_op);
                    self.reasons.insert(l, r);
                }
            }
        }
    }

    fn escape(&mut self, p: &Pts) {
        let fresh: Pts = p.iter().copied().filter(|l| !self.esc.contains(l)).collect();
        self.note(&fresh, "escaped");
        let mut ch = false;
        Self::grow(&mut self.esc, p, &mut ch);
        self.changed |= ch;
    }

    fn write(&mut self, p: &Pts) {
        if !self.runtime {
            return;
        }
        let fresh: Pts = p.iter().copied().filter(|l| !self.written.contains(l)).collect();
        self.note(&fresh, "written");
        let mut ch = false;
        Self::grow(&mut self.written, p, &mut ch);
        self.changed |= ch;
    }

    /// What an object may hold, its prototypes' included.
    fn held(&self, l: u32) -> Pts {
        if let Some(h) = self.held_memo.borrow().get(&l) {
            return h.clone();
        }
        let out = self.held_uncached(l);
        self.held_memo.borrow_mut().insert(l, out.clone());
        out
    }

    /// Forget every object's holdings `held` remembered: one changed.
    fn holdings_changed(&mut self) {
        self.held_memo.get_mut().clear();
        self.field_memo.get_mut().clear();
        self.acc_memo.get_mut().clear();
    }

    fn held_uncached(&self, l: u32) -> Pts {
        let mut out = Pts::new();
        let mut seen = BTreeSet::new();
        let mut work = vec![l];
        while let Some(x) = work.pop() {
            if !seen.insert(x) {
                continue;
            }
            if let Some(c) = self.contents.get(&x) {
                for s in c.values() {
                    out.extend(s.iter().copied());
                }
            }
            if let Some(w) = self.wraps.get(&x) {
                work.extend(w.iter().copied());
            }
            work.extend(self.protos_of(x));
        }
        out
    }

    /// What the objects a built-in's result wraps hold (see `wraps`): all
    /// of it, any property of the result read.
    fn wrapped(&self, l: u32) -> Pts {
        match self.wraps.get(&l) {
            Some(w) => w.iter().flat_map(|&x| self.held(x)).collect(),
            None => Pts::new(),
        }
    }

    /// Whether `l` or a prototype of it has an accessor (see `acc_locs`).
    fn may_have_accessors(&self, l: u32) -> bool {
        if self.acc_locs.is_empty() {
            return false;
        }
        if let Some(&b) = self.acc_memo.borrow().get(&l) {
            return b;
        }
        let b = self.may_have_accessors_uncached(l);
        self.acc_memo.borrow_mut().insert(l, b);
        b
    }

    fn may_have_accessors_uncached(&self, l: u32) -> bool {
        let mut seen = BTreeSet::new();
        let mut work = vec![l];
        while let Some(x) = work.pop() {
            if !seen.insert(x) {
                continue;
            }
            if self.acc_locs.contains(&x) {
                return true;
            }
            work.extend(self.protos_of(x));
        }
        false
    }

    /// What an object's property `k` may hold, its prototypes' included
    /// (and what is held under no name known).
    fn held_field(&self, l: u32, k: &Field) -> Pts {
        if let Some(h) = self.field_memo.borrow().get(&(l, k.clone())) {
            return h.clone();
        }
        let out = self.held_field_uncached(l, k);
        self.field_memo.borrow_mut().insert((l, k.clone()), out.clone());
        out
    }

    fn held_field_uncached(&self, l: u32, k: &Field) -> Pts {
        let mut out = Pts::new();
        let mut seen = BTreeSet::new();
        let mut work = vec![l];
        while let Some(x) = work.pop() {
            if !seen.insert(x) {
                continue;
            }
            if let Some(c) = self.contents.get(&x) {
                for f in [k.clone(), Field::Any, Field::Defined] {
                    if let Some(s) = c.get(&f) {
                        out.extend(s.iter().copied());
                    }
                }
            }
            out.extend(self.wrapped(x));
            work.extend(self.protos_of(x));
        }
        out
    }

    /// The prototypes of an object the analysis follows.
    fn protos_of(&self, x: u32) -> Vec<u32> {
        let mut out: Vec<u32> = self.protos.get(&x).map(|ps| ps.iter().copied().collect()).unwrap_or_default();
        if let Loc::B(a) = &self.locs[x as usize] {
            if let Some(HeapObj::Object { proto: Abs::Ref(p), .. } | HeapObj::Closure { proto: Abs::Ref(p), .. }) = self.snapshot.get(a) {
                if let Some(&pi) = self.ids.get(&Loc::B(*p)) {
                    out.push(pi);
                }
            }
        }
        out
    }

    /// What reading property `k` of a value that may be `p` may give.
    fn read_field(&mut self, p: &Pts, k: &Field) -> Pts {
        let mut out = Pts::new();
        for &l in p {
            match &self.locs[l as usize] {
                Loc::Unknown => {
                    out.insert(l);
                }
                _ if self.esc.contains(&l) => {
                    let u = self.id(Loc::Unknown);
                    out.insert(u);
                }
                _ => {
                    out.extend(self.held_field(l, k));
                    if self.may_have_accessors(l) {
                        let gets = self.accessors(l, Some(k), true);
                        let got = self.run_accessors(l, &gets, Vec::new());
                        out.extend(got);
                    }
                }
            }
        }
        out
    }

    /// The functions that may run as `l`'s accessor for property `k`
    /// (`None`: any), its prototypes' included: a getter (`get`) or setter
    /// of that name, and any function a definition stored (possibly one).
    fn accessors(&self, l: u32, k: Option<&Field>, get: bool) -> Pts {
        let name = match k {
            Some(Field::Name(n)) => Some(n.clone()),
            Some(Field::Index) | Some(Field::Any) | None => None,
            Some(_) => return Pts::new(),
        };
        let mut out = Pts::new();
        let mut seen = BTreeSet::new();
        let mut work = vec![l];
        while let Some(x) = work.pop() {
            if !seen.insert(x) {
                continue;
            }
            if let Some(c) = self.contents.get(&x) {
                for (f, s) in c.iter() {
                    let hit = match f {
                        Field::Getter(n) if get => name.as_ref().is_none_or(|k| k == n) || n.is_empty(),
                        Field::Setter(n) if !get => name.as_ref().is_none_or(|k| k == n) || n.is_empty(),
                        Field::Defined => true,
                        _ => false,
                    };
                    if hit {
                        out.extend(s.iter().copied().filter(|&h| self.is_function(h) || matches!(self.locs[h as usize], Loc::Unknown)));
                    }
                }
            }
            work.extend(self.protos_of(x));
        }
        out
    }

    /// Accessors `fns` run with `this` `l`, given `args`: what they return
    /// (a getter's value).
    fn run_accessors(&mut self, l: u32, fns: &Pts, args: Vec<Pts>) -> Pts {
        if fns.is_empty() {
            return Pts::new();
        }
        match self.resolve(fns) {
            Some(targets) => {
                let mut out = Pts::new();
                for r in targets {
                    self.bind(r, Vec::new(), args.clone(), false, Some(Pts::from([l])));
                    out.extend(self.ret.get(&r).cloned().unwrap_or_default());
                }
                out
            }
            // (Code not followed: given the object and what is stored.)
            None => {
                self.reads_globals();
                let mut given = Pts::from([l]);
                given.extend(args.into_iter().flatten());
                self.escape(&given);
                self.unknown()
            }
        }
    }

    /// What reading property `k` of a value that may be `base` may give.
    fn member(&mut self, base: &Pts, k: &str) -> Pts {
        let mut out = self.read_field(base, &Field::named(k));
        // (A standard prototype's method of that name, should the value
        // not have one of its own: called with its receiver, see
        // `Pta::call`.)
        if MUTATING_METHODS.contains(&k) || READING_METHODS.contains(&k) || Self::standard_method_name(k) {
            out.insert(self.id(Loc::Builtin(format!("%.prototype.{k}"))));
        }
        // (A member of a built-in read through a variable holding it:
        // `d = Object.prototype.hasOwnProperty`, then `d.call`.)
        for &l in base {
            if let Loc::Builtin(b) = self.locs[l as usize].clone() {
                if let Some(m) = Self::builtin_member(&b, k) {
                    out.insert(self.id(Loc::Builtin(m)));
                }
            }
        }
        out
    }

    /// What reading any property of a value that may be `p` may give.
    fn read(&mut self, p: &Pts) -> Pts {
        let mut out = Pts::new();
        for &l in p {
            match &self.locs[l as usize] {
                // (What an escaped object holds has escaped too: anything,
                // which `Unknown` stands for. Every escaped object counts as
                // written, so nothing done to one needs it named.)
                Loc::Unknown => {
                    out.insert(l);
                }
                // (An escaped object holds what has escaped, and what code
                // not followed stored in it: anything.)
                _ if self.esc.contains(&l) => {
                    let u = self.id(Loc::Unknown);
                    out.insert(u);
                }
                _ => {
                    out.extend(self.held(l));
                    if self.may_have_accessors(l) {
                        let gets = self.accessors(l, None, true);
                        let got = self.run_accessors(l, &gets, Vec::new());
                        out.extend(got);
                    }
                }
            }
        }
        out
    }

    /// The functions an object holds (its prototypes' included) that the
    /// language may call with it as `this` where no call is written: under
    /// a conversion's or protocol's name, or a key not known (a symbol's:
    /// `@@toPrimitive`, `@@iterator`, ...). (A getter or setter runs where
    /// its property is read or written: see `Pta::accessors`; any other
    /// method, where it is called.)
    fn implicit_fns(&self, l: u32) -> Pts {
        const IMPLICIT: &[&str] = &["valueOf", "toString", "toLocaleString", "toJSON", "then", "handleEvent"];
        let mut out = Pts::new();
        let mut seen = BTreeSet::new();
        let mut work = vec![l];
        while let Some(x) = work.pop() {
            if !seen.insert(x) {
                continue;
            }
            if let Some(c) = self.contents.get(&x) {
                for (f, s) in c.iter() {
                    let hit = match f {
                        Field::Name(n) => IMPLICIT.contains(&n.as_str()),
                        Field::Any | Field::Defined => true,
                        _ => false,
                    };
                    if hit {
                        out.extend(s.iter().copied());
                    }
                }
            }
            work.extend(self.protos_of(x));
        }
        out
    }

    /// Whether a function an object holds may run with it as `this`
    /// and use it: one whose code reads `this` (a boundary function not
    /// known as made: may).
    fn may_use_this(&mut self, l: u32) -> bool {
        let rfids: Vec<usize> = match &self.locs[l as usize] {
            Loc::Fn(r) => vec![*r],
            Loc::B(a) => match self.snapshot.get(a) {
                Some(HeapObj::Closure { .. }) => match self.fn_of_b.get(a) {
                    Some(rs) => rs.iter().copied().collect(),
                    None => return true,
                },
                // (A built-in function, a bound one: its `this` its own.)
                _ => return false,
            },
            _ => return false,
        };
        rfids.into_iter().any(|r| self.reads_this(r))
    }

    fn reads_this(&mut self, r: usize) -> bool {
        if let Some(&b) = self.uses_this.get(&r) {
            return b;
        }
        let mut found = false;
        if let Some(rf) = self.fns.get(r) {
            fn in_prog(p: &Program<Op, Cond>, found: &mut bool) {
                for b in &p.blocks {
                    for op in &b.ops {
                        if let Op::Try { body, catch_body, finally_body, .. } = op {
                            in_prog(body, found);
                            in_prog(catch_body, found);
                            if let Some(f) = finally_body {
                                in_prog(f, found);
                            }
                        }
                        crate::inline::op_exprs(op).into_iter().for_each(|e| {
                            visit_rexpr(e, &mut |x| {
                                if matches!(x, RExpr::This) {
                                    *found = true;
                                }
                            })
                        });
                    }
                    if let Terminator::Cond { cond: Cond::Falsy(c), .. } = &b.term {
                        visit_rexpr(c, &mut |x| {
                            if matches!(x, RExpr::This) {
                                *found = true;
                            }
                        });
                    }
                }
            }
            in_prog(&rf.body, &mut found);
        }
        self.uses_this.insert(r, found);
        found
    }

    fn is_function(&self, l: u32) -> bool {
        match &self.locs[l as usize] {
            Loc::Fn(_) => true,
            Loc::B(a) => matches!(self.snapshot.get(a), Some(HeapObj::Closure { .. }))
                || matches!(self.snapshot.get(a), Some(HeapObj::Builtin { kind, .. }) if builtin_kind_is_function(kind)),
            _ => false,
        }
    }

    fn seed(&self, v: usize) -> Option<Pts> {
        if self.own.contains(&v) {
            return None;
        }
        self.seeds.get(&v).cloned()
    }

    /// Whether `v` is shared between programs (see `Pta::shared`), and not
    /// the current residual function's own variable (see `Pta::own`).
    fn is_shared(&self, v: usize) -> bool {
        self.shared.contains(&v) && !self.own.contains(&v)
    }

    fn scope(&self, v: usize) -> (usize, usize) {
        if self.is_shared(v) {
            (SHARED, v)
        } else {
            (self.prog, v)
        }
    }

    fn var(&mut self, v: usize) -> Pts {
        let mut p = if self.is_shared(v) { self.vars.get(&self.scope(v)).cloned().unwrap_or_default() } else { self.env.get(&v).cloned().unwrap_or_default() };
        if let Some(s) = self.seed(v) {
            p.extend(s);
        }
        p
    }

    fn new_site(&mut self) -> u32 {
        self.site += 1;
        let mut key = self.at.clone();
        key.push(self.site);
        self.id(Loc::Site(self.prog, key))
    }

    /// The standard built-in an expression names by a chain of reads.
    fn builtin_path(&self, e: &RExpr) -> Option<String> {
        match e {
            RExpr::Global(g) if crate::pristine::BUILTIN_GLOBALS.contains(&g.as_str()) && self.js.pristine(g) => Some(g.clone()),
            RExpr::Get(o, k) => self.builtin_path(o).map(|p| format!("{p}.{k}")),
            _ => None,
        }
    }

    /// The standard member `k` of the standard built-in at `path` (a
    /// standard constructor or object, its `prototype`, a method of
    /// either): its path. `None` for a name that is no member of a
    /// standard built-in, which reads `undefined` while the program
    /// changes none (see `Js::pristine`).
    /// Whether a standard prototype has a method named `k`.
    fn standard_method_name(k: &str) -> bool {
        const PROTOS: &[&str] = &[
            "Object", "Function", "Array", "String", "Number", "Boolean", "Symbol", "BigInt", "RegExp", "Date", "Map", "Set", "WeakMap",
            "WeakSet", "Promise", "Error",
        ];
        PROTOS.iter().any(|g| standard_prototype_method(g, k))
    }

    fn builtin_member(path: &str, k: &str) -> Option<String> {
        let member = format!("{path}.{k}");
        let parts: Vec<&str> = path.split('.').collect();
        let is_fn = match parts.as_slice() {
            [g] => builtin_typeof(g) == Some("function"),
            [_, "prototype", _] => true,
            [_, m] => !m.is_empty(),
            _ => false,
        };
        // (A function's own `call`, `apply`, `bind`, as `Function.prototype`'s.)
        if is_fn && matches!(k, "call" | "apply" | "bind") {
            return Some(member);
        }
        match parts.as_slice() {
            [g] if k == "prototype" && builtin_prototype_typeof(g).is_some() => Some(member),
            [g] if standard_static_method(g, k) => Some(member),
            [g, "prototype"] if standard_prototype_method(g, k) => Some(member),
            _ => None,
        }
    }

    fn expr(&mut self, e: &RExpr) -> Pts {
        let p = self.value_of(e);
        if self.runtime {
            for &l in &p {
                if !self.esc.contains(&l) && self.in_hand.insert(l) {
                    self.changed = true;
                }
            }
        }
        p
    }

    fn value_of(&mut self, e: &RExpr) -> Pts {
        match e {
            RExpr::Num(_) | RExpr::Str(_) | RExpr::Bool(_) | RExpr::Undef | RExpr::Null | RExpr::BigInt(_) | RExpr::Hole => Pts::new(),
            RExpr::Var(v) => self.var(*v),
            // (Its callers', or anything once it escaped: see `settle`.)
            RExpr::This => match self.rfid {
                Some(r) => self.this_of.get(&r).cloned().unwrap_or_default(),
                None => self.unknown(),
            },
            RExpr::Global(g) => {
                if let Some(p) = self.builtin_path(e) {
                    return self.one(Loc::Builtin(p));
                }
                // (A helper of the residual's runtime, `__pe_args` and its
                // kind: a built-in this analysis does not know, which reads
                // none of the program's globals.)
                if g.starts_with("__pe_") && !self.assigned_globals.contains(g) {
                    return self.one(Loc::Builtin(g.clone()));
                }
                // (One the program assigns holds what it assigns; any other
                // is the host's.)
                let mut p = self.globals.get(g).cloned().unwrap_or_default();
                match self.global_roots.get(g).copied() {
                    Some(a) => {
                        p.insert(self.id(Loc::B(a)));
                    }
                    None if self.assigned_globals.contains(g) => {}
                    None => {
                        p.insert(self.id(Loc::Unknown));
                    }
                }
                p
            }
            RExpr::Get(o, k) => {
                if let Some(p) = self.builtin_path(e) {
                    return self.one(Loc::Builtin(p));
                }
                let base = self.expr(o);
                self.member(&base, k)
            }
            RExpr::Index(o, i) => {
                self.expr(i);
                let base = self.expr(o);
                match &**i {
                    RExpr::Str(k) => self.read_field(&base, &Field::named(k)),
                    RExpr::Num(_) => self.read_field(&base, &Field::Index),
                    _ => self.read(&base),
                }
            }
            RExpr::OwnMember { obj, .. } => {
                let base = self.expr(obj);
                self.read(&base)
            }
            RExpr::Bin(_, a, b) => {
                self.expr(a);
                self.expr(b);
                Pts::new()
            }
            RExpr::Opaque(op, xs) => {
                let parts: Vec<Pts> = xs.iter().map(|x| self.expr(x)).collect();
                match op.as_str() {
                    "?:" if parts.len() == 3 => parts[1].union(&parts[2]).copied().collect(),
                    "&&" | "||" | "??" => parts.iter().flatten().copied().collect(),
                    "," => parts.last().cloned().unwrap_or_default(),
                    _ => Pts::new(),
                }
            }
            RExpr::Call(c, args) => self.call(c, args, false),
            RExpr::New(c, args) => self.call(c, args, true),
            RExpr::FnRef { rfid, caps } => {
                let caps: Vec<Pts> = caps.iter().map(|c| self.expr(c)).collect();
                self.bind(*rfid, caps, Vec::new(), true, None);
                self.one(Loc::Fn(*rfid))
            }
            RExpr::NewFn { rfid } => self.one(Loc::Fn(*rfid)),
            RExpr::BoundMethod { func, recv } => {
                self.expr(recv);
                self.expr(func)
            }
            RExpr::ArrayLit(xs) => {
                let s = self.new_site();
                for x in xs {
                    let p = self.expr(x);
                    self.add_field(s, Field::Index, &p);
                }
                let mut out = Pts::new();
                out.insert(s);
                out
            }
            RExpr::ObjectLit(fields) => {
                let s = self.new_site();
                for (k, x) in fields {
                    let p = self.expr(x);
                    self.add_field(s, Field::named(k), &p);
                }
                let mut out = Pts::new();
                out.insert(s);
                out
            }
            RExpr::RegexLit(..) => {
                let s = self.new_site();
                let mut out = Pts::new();
                out.insert(s);
                out
            }
            RExpr::Yield(x) | RExpr::Await(x) => {
                let p = self.expr(x);
                self.escape(&p);
                self.unknown()
            }
            RExpr::Delete(target) => {
                match &**target {
                    RExpr::Get(o, _) | RExpr::Index(o, _) => {
                        let base = self.expr(o);
                        self.write(&base);
                    }
                    t => {
                        self.expr(t);
                    }
                }
                Pts::new()
            }
            RExpr::Verbatim(..) | RExpr::ClassSrc { .. } => {
                self.unseen = true;
                self.unknown()
            }
        }
    }

    /// Residual function `rfid` given `caps` then `args`, with `this`. A
    /// direct call gives, after the captures, the arguments object of a
    /// function that reads it, then the parameters (as `Js::why`'s
    /// `bind`); a call of a closure gives its arguments, the arguments
    /// object holding them all.
    fn bind(&mut self, rfid: usize, caps: Vec<Pts>, args: Vec<Pts>, direct: bool, this: Option<Pts>) {
        let Some(rf) = self.fns.get(rfid) else { return };
        let (ncap, params, args_var) = (rf.ncaptured, rf.param_vars.clone(), rf.args_var);
        if direct {
            let given: Vec<&Pts> = caps.iter().chain(args.iter()).collect();
            for (i, p) in given.iter().enumerate() {
                let target = if i < ncap {
                    params.get(i).copied()
                } else if args_var.is_some() && i == ncap {
                    args_var
                } else {
                    params.get(i - usize::from(args_var.is_some())).copied()
                };
                // (More than it takes: in its arguments object only.)
                if let Some(t) = target {
                    self.add_var(t, p);
                }
            }
        } else {
            for (j, p) in args.iter().enumerate() {
                if let Some(&t) = params.get(ncap + j) {
                    self.add_var(t, p);
                }
            }
            if let Some(a) = args_var {
                let s = self.id(Loc::Site(usize::MAX, vec![rfid as u32]));
                for p in &args {
                    self.add_field(s, Field::Index, p);
                }
                self.add_var(a, &Pts::from([s]));
            }
        }
        if let Some(t) = this {
            let mut ch = false;
            let t = self.norm(&t);
            Self::grow(self.this_of.entry(rfid).or_default(), &t, &mut ch);
            self.changed |= ch;
        }
    }

    /// The residual functions a callee may be, when it may be nothing else.
    fn resolve(&self, callee: &Pts) -> Option<BTreeSet<usize>> {
        if callee.is_empty() {
            return None;
        }
        let mut out = BTreeSet::new();
        for &l in callee {
            match &self.locs[l as usize] {
                Loc::Fn(r) => {
                    out.insert(*r);
                }
                // (A boundary function: as which residual function the load
                // code made it, or else any of its code's.)
                Loc::B(a) => {
                    let Some(HeapObj::Closure { fid, .. }) = self.snapshot.get(a) else { return None };
                    match self.fn_of_b.get(a).filter(|rs| !rs.is_empty()) {
                        Some(rs) => out.extend(rs.iter().copied()),
                        // (No residual function of its code: it is not made
                        // at runtime, so not what runtime code calls.)
                        None => out.extend(self.fns.iter().enumerate().filter(|(_, rf)| rf.fid == Some(*fid)).map(|(r, _)| r)),
                    }
                }
                _ => return None,
            }
        }
        Some(out)
    }

    /// The number of parameters residual function `r` takes after its
    /// captures.
    fn arity(&self, r: usize) -> usize {
        self.fns.get(r).map_or(0, |rf| rf.param_vars.len().saturating_sub(rf.ncaptured))
    }

    fn call(&mut self, c: &RExpr, args: &[RExpr], new: bool) -> Pts {
        // A residual function called directly: given exactly these.
        match c {
            RExpr::FnRef { rfid, caps } => {
                let this = if new { Pts::from([self.new_site()]) } else { Pts::new() };
                let caps: Vec<Pts> = caps.iter().map(|c| self.expr(c)).collect();
                let args: Vec<Pts> = args.iter().map(|a| self.expr(a)).collect();
                self.bind(*rfid, caps, args, true, Some(this.clone()));
                let mut r = self.ret.get(rfid).cloned().unwrap_or_default();
                r.extend(this);
                return r;
            }
            RExpr::Get(f, m) if m == "call" && !new => {
                if let RExpr::FnRef { rfid, caps } = &**f {
                    let caps: Vec<Pts> = caps.iter().map(|c| self.expr(c)).collect();
                    let this = args.first().map(|a| self.expr(a)).unwrap_or_default();
                    let args: Vec<Pts> = args.iter().skip(1).map(|a| self.expr(a)).collect();
                    self.bind(*rfid, caps, args, true, Some(this));
                    return self.ret.get(rfid).cloned().unwrap_or_default();
                }
            }
            _ => {}
        }
        // (`(0, f)(...)`: a call of `f` without a receiver.)
        let c = match c {
            RExpr::Opaque(op, xs) if op == "," && xs.len() == 2 => {
                self.expr(&xs[0]);
                &xs[1]
            }
            c => c,
        };
        let argp: Vec<Pts> = args.iter().map(|a| self.expr(a)).collect();
        // (What a built-in sees of its arguments' source: a key, an object
        // literal's names; see `Pta::defined_fields`.)
        self.arg_exprs = args.to_vec();
        // The callee, and the receiver of a method call.
        let (callee, recv, method): (Pts, Option<Pts>, Option<String>) = match c {
            RExpr::Get(o, m) => {
                if let Some(p) = self.builtin_path(c) {
                    let r = self.expr(o);
                    (self.one(Loc::Builtin(p)), Some(r), Some(m.clone()))
                } else {
                    let r = self.expr(o);
                    // (A receiver code not followed may be: its method is
                    // such code, given that receiver and the arguments, which
                    // escape; the others' methods as they are.)
                    let u = self.id(Loc::Unknown);
                    if r.iter().any(|l| *l == u || self.esc.contains(l)) {
                        for a in &argp {
                            self.escape(a);
                        }
                        let rest: Pts = r.iter().copied().filter(|&l| l != u && !self.esc.contains(&l)).collect();
                        if rest.is_empty() {
                            return self.unknown();
                        }
                        let callee = self.member(&rest, m);
                        let mut out = self.dispatch(callee, Some(rest), argp, Some(m.clone()), new);
                        out.insert(u);
                        return out;
                    }
                    let callee = self.member(&r, m);
                    (callee, Some(r), Some(m.clone()))
                }
            }
            RExpr::Index(o, _) => {
                let r = self.expr(o);
                let callee = self.expr(c);
                (callee, Some(r), None)
            }
            RExpr::BoundMethod { func, recv } => {
                let r = self.expr(recv);
                let callee = self.expr(func);
                if self.debug && std::env::var("ENTRY_PTS_CALLS").is_ok() {
                    let rs: Vec<String> = r.iter().map(|&l| format!("{:?}", self.locs[l as usize])).collect();
                    let cs: Vec<String> = callee.iter().map(|&l| format!("{:?}", self.locs[l as usize])).collect();
                    let args: Vec<String> = argp.iter().map(|p| p.iter().map(|&l| format!("{:?}", self.locs[l as usize])).collect::<Vec<_>>().join(",")).collect();
                    eprintln!("[ENTRY]       bound call in program {}: recv {} callee {} args [{}] at {}", self.prog, rs.join(" "), cs.join(" "), args.join("; "), self.cur_op);
                }
                let m = match &**func {
                    RExpr::Get(_, m) => Some(m.clone()),
                    _ => None,
                };
                // (A receiver code not followed may be: as for `o.m(...)`
                // above; the method read before, what the others give.)
                let u = self.id(Loc::Unknown);
                if r.iter().any(|l| *l == u || self.esc.contains(l)) {
                    for a in &argp {
                        self.escape(a);
                    }
                    let rest: Pts = r.iter().copied().filter(|&l| l != u && !self.esc.contains(&l)).collect();
                    if rest.is_empty() {
                        return self.unknown();
                    }
                    let mut callee: Pts = callee.iter().copied().filter(|&l| l != u).collect();
                    if self.read(&rest).contains(&u) {
                        callee.insert(u);
                    }
                    let mut out = self.dispatch(callee, Some(rest), argp, m, new);
                    out.insert(u);
                    return out;
                }
                (callee, Some(r), m)
            }
            c => (self.expr(c), None, None),
        };
        self.dispatch(callee, recv, argp, method, new)
    }

    /// A call of a callee that may be `callee`, on `recv` (a method call's
    /// receiver), given `argp`.
    fn dispatch(&mut self, callee: Pts, recv: Option<Pts>, argp: Vec<Pts>, method: Option<String>, new: bool) -> Pts {
        // `f.call(t, ...)` of a function the analysis knows: `f` called
        // with `this` `t`.
        let (callee, recv, argp) = match (&method, &recv) {
            (Some(m), Some(f)) if m == "call" && !new && f.iter().any(|&l| self.is_function(l)) => {
                let this = argp.first().cloned().unwrap_or_default();
                (f.clone(), Some(this), argp.get(1..).unwrap_or(&[]).to_vec())
            }
            _ => (callee, recv, argp),
        };
        // (What is no function is not called: the call throws.)
        let callee: Pts = callee.into_iter().filter(|&l| self.is_function(l) || matches!(self.locs[l as usize], Loc::Builtin(_) | Loc::Unknown)).collect();
        if self.debug && std::env::var("ENTRY_PTS_CALLS").is_ok() {
            let shown: Vec<String> = callee.iter().map(|&l| format!("{:?}", self.locs[l as usize])).collect();
            let rs: Vec<String> = recv.iter().flatten().map(|&l| format!("{:?}{}", self.locs[l as usize], if self.esc.contains(&l) { "*" } else { "" })).collect();
            eprintln!("[ENTRY]       call in program {}: callee {} recv {} at {}", self.prog, shown.join(" "), rs.join(" "), self.cur_op);
        }
        if callee.iter().any(|&l| matches!(self.locs[l as usize], Loc::Unknown)) {
            self.reads_globals();
            return self.unknown_call(recv.as_ref(), &argp);
        }
        if callee.is_empty() {
            // Nothing that may be called: the call throws (a standard
            // prototype's method of the name would be among the callees:
            // see `Pta::member`).
            return Pts::new();
        }
        let mut out = Pts::new();
        let mut fns = Pts::new();
        for l in callee {
            let Loc::Builtin(b) = self.locs[l as usize].clone() else {
                fns.insert(l);
                continue;
            };
            // (A standard object, no function: calling it throws, or, for
            // `Function.prototype`, does nothing.)
            if b.ends_with(".prototype") || (!b.contains('.') && builtin_typeof(&b).is_some_and(|ty| ty != "function")) {
                continue;
            }
            // (`f.call(...)`, `f.apply(...)`, `f.bind(...)` of what is no
            // function the analysis knows: calling it throws, unless it may
            // be code not followed. A function known: see above.)
            if matches!(b.as_str(), "%.prototype.call" | "%.prototype.apply" | "%.prototype.bind") {
                let f = recv.clone().unwrap_or_default();
                if f.iter().any(|&l| matches!(self.locs[l as usize], Loc::Unknown) || self.esc.contains(&l)) {
                    self.reads_globals();
                    let r = self.unknown_call(Some(&f), &argp);
                    out.extend(r);
                } else if f.iter().any(|&l| self.is_function(l)) {
                    let r = self.unknown_call(Some(&f), &argp);
                    out.extend(r);
                }
                continue;
            }
            // A standard function called through `apply`: as through `call`,
            // given the array's elements.
            if let (Some(target), false) = (b.strip_suffix(".apply"), new) {
                let recv = argp.first().cloned().unwrap_or_default();
                let spread = argp.get(1).map(|a| self.read(a)).unwrap_or_default();
                let name = target.rsplit('.').next().unwrap_or(target).to_string();
                let r = if target.contains(".prototype.") && self.followed(&recv) {
                    self.method_call(&name, &recv, &[spread])
                } else {
                    self.unknown_call(Some(&recv), &[spread])
                };
                out.extend(r);
                continue;
            }
            let r = match b.strip_suffix(".call") {
                // A standard function called through `call`
                // (`Object.prototype.hasOwnProperty.call(o, k)`).
                Some(target) if !new => {
                    let recv = argp.first().cloned().unwrap_or_default();
                    let rest = argp.get(1..).unwrap_or(&[]).to_vec();
                    let name = target.rsplit('.').next().unwrap_or(target).to_string();
                    if target.contains(".prototype.") && self.followed(&recv) {
                        self.method_call(&name, &recv, &rest)
                    } else {
                        self.unknown_call(Some(&recv), &rest)
                    }
                }
                // A standard prototype's method, with its receiver (called
                // as a function: not followed).
                _ if b.contains(".prototype.") => match &recv {
                    Some(r) if !new && self.followed(r) => {
                        let name = b.rsplit('.').next().unwrap_or(&b).to_string();
                        self.method_call(&name, r, &argp)
                    }
                    _ => self.unknown_call(recv.as_ref(), &argp),
                },
                // A standard function (`Object.keys`).
                _ => self.static_call(&b, &argp),
            };
            out.extend(r);
        }
        if fns.is_empty() {
            return out;
        }
        // A function the analysis knows the code of.
        let Some(targets) = self.resolve(&fns) else {
            self.reads_globals();
            return self.unknown_call(recv.as_ref(), &argp);
        };
        let this = if new {
            // (An instance inherits what its constructor holds: its
            // `prototype`'s methods among them.)
            let s = self.new_site();
            let ctor_held = self.read(&fns);
            let mut ch = false;
            let ctor_held = self.norm(&ctor_held);
            Self::grow(self.protos.entry(s).or_default(), &ctor_held, &mut ch);
            if ch {
                self.holdings_changed();
            }
            self.changed |= ch;
            Pts::from([s])
        } else {
            recv.clone().unwrap_or_default()
        };
        for r in targets {
            self.bind(r, Vec::new(), argp.clone(), false, Some(this.clone()));
            out.extend(self.ret.get(&r).cloned().unwrap_or_default());
        }
        if new {
            out.extend(this);
        }
        out
    }

    /// Whether the analysis follows everything `p` may be (no object code
    /// it does not see may have changed or given methods).
    fn followed(&self, p: &Pts) -> bool {
        p.iter().all(|&l| !matches!(self.locs[l as usize], Loc::Unknown) && !self.esc.contains(&l))
    }

    /// Runtime code calls code that may read the globals (see `unfollowed`).
    fn reads_globals(&mut self) {
        if self.runtime && !self.unfollowed {
            if self.debug {
                eprintln!("[ENTRY]     code that may read the globals, in program {}: {}", self.prog, self.cur_op);
            }
            self.unfollowed = true;
            self.changed = true;
        }
    }

    /// A call the analysis does not follow: what it is given escapes (and
    /// what the globals hold, which such code may read: see `settle`).
    fn unknown_call(&mut self, recv: Option<&Pts>, args: &[Pts]) -> Pts {
        if let Some(r) = recv {
            self.escape(r);
        }
        for a in args {
            self.escape(a);
        }
        self.unknown()
    }

    /// A method of a standard prototype, by name, on `recv`.
    fn method_call(&mut self, m: &str, recv: &Pts, args: &[Pts]) -> Pts {
        let all: Pts = args.iter().flatten().copied().collect();
        let calls = CALLBACK_METHODS.contains(&m);
        // (The receiver's elements: what a function given is called with,
        // and what a method returning one returns.)
        let held = if calls || ELEMENT_RESULT_METHODS.contains(&m) { self.read(recv) } else { Pts::new() };
        let mut rets = Pts::new();
        if calls {
            // (A function given is called with the receiver's elements, an
            // index and the receiver, as the method's contract says; any
            // other: with all of those and the other arguments, as each of
            // its parameters and its `this`.)
            let others: Pts = all.iter().copied().filter(|&l| !self.is_function(l)).collect();
            let layout: Option<Vec<Pts>> = match m {
                "forEach" | "map" | "filter" | "some" | "every" | "find" | "findIndex" | "findLast" | "findLastIndex" | "flatMap" => {
                    Some(vec![held.clone(), Pts::new(), recv.clone()])
                }
                "reduce" | "reduceRight" => Some(vec![others.clone(), held.clone(), Pts::new(), recv.clone()]),
                "sort" | "toSorted" => Some(vec![held.clone(), held.clone()]),
                _ => None,
            };
            let mut given = recv.clone();
            given.extend(held.iter().copied());
            given.extend(others.iter().copied());
            // (`thisArg`, or none.)
            let this = match m {
                "forEach" | "map" | "filter" | "some" | "every" | "find" | "findIndex" | "findLast" | "findLastIndex" | "flatMap" => args.get(1).cloned().unwrap_or_default(),
                _ => given.clone(),
            };
            let Some(r) = self.call_back_as(args, layout, &given, &this, true) else { return self.unknown_call(Some(recv), args) };
            rets = r;
        }
        let mutating = MUTATING_METHODS.contains(&m) || m.starts_with("set");
        if mutating {
            self.write(recv);
            let f = if matches!(m, "push" | "unshift" | "splice" | "fill" | "sort" | "reverse" | "copyWithin") { Field::Index } else { Field::Internal };
            for &l in recv.iter() {
                self.add_field(l, f.clone(), &all);
            }
        } else if !READING_METHODS.contains(&m) {
            return self.unknown_call(Some(recv), args);
        }
        // (A result made of the receiver and the arguments, and what the
        // function given returned: read when it is read, see `wraps`.)
        let s = self.new_site();
        let mut parts: Pts = recv.iter().copied().chain(all.iter().copied()).filter(|&l| !matches!(self.locs[l as usize], Loc::Unknown)).collect();
        parts.retain(|&l| !self.is_function(l));
        let parts = self.norm(&parts);
        let mut ch = false;
        Self::grow(self.wraps.entry(s).or_default(), &parts, &mut ch);
            if ch {
                self.holdings_changed();
            }
        self.changed |= ch;
        let mut made = rets.clone();
        if all.iter().chain(recv.iter()).any(|&l| matches!(self.locs[l as usize], Loc::Unknown)) {
            made.insert(self.id(Loc::Unknown));
        }
        let f = if FRESH_RESULT_METHODS.contains(&m) { Field::Index } else { Field::Any };
        self.add_field(s, f, &made);
        let mut out = Pts::from([s]);
        if mutating {
            out.extend(recv.iter().copied());
        }
        if ELEMENT_RESULT_METHODS.contains(&m) {
            out.extend(held);
            out.extend(all);
            out.extend(rets);
        }
        out
    }

    /// The functions among `args` called with `given` (`layout`: each
    /// parameter's, when the built-in's contract gives them; each one more
    /// than it gives: none), with `this`: what they return, or `None` when
    /// one is not known (a call the analysis does not follow). `calls`:
    /// whether the built-in calls a function it is given (an iteration
    /// method, `sort`, `replace`, ...); otherwise none runs (one stored, as
    /// a descriptor's accessor, runs where its property is used: see
    /// `Pta::accessors`).
    fn call_back_as(&mut self, args: &[Pts], layout: Option<Vec<Pts>>, given: &Pts, this: &Pts, calls: bool) -> Option<Pts> {
        if !calls {
            return Some(Pts::new());
        }
        let funcs: Pts = args.iter().flatten().copied().filter(|&l| self.is_function(l) || matches!(self.locs[l as usize], Loc::Unknown)).collect();
        let mut rets = Pts::new();
        if funcs.is_empty() {
            return Some(rets);
        }
        for r in self.resolve(&funcs)? {
            let params = match &layout {
                Some(l) => l.clone(),
                None => vec![given.clone(); self.arity(r).max(1)],
            };
            self.bind(r, Vec::new(), params, false, Some(this.clone()));
            rets.extend(self.ret.get(&r).cloned().unwrap_or_default());
        }
        Some(rets)
    }

    /// What a definition whose keys the call writes (`defineProperty(o,
    /// "k", d)`, `defineProperties(o, {k: d, ...})`) stores: each
    /// descriptor's `value` under its key, its `get` and `set` as the key's
    /// accessors.
    fn defined_fields(&mut self, path: &str, args: &[Pts]) -> Option<Vec<(Field, Pts)>> {
        let named: Vec<(String, Pts)> = match (path, self.arg_exprs.get(1).cloned()) {
            ("Object.defineProperty" | "Reflect.defineProperty", Some(RExpr::Str(k))) => vec![(k, args.get(2).cloned().unwrap_or_default())],
            ("Object.defineProperties", Some(RExpr::ObjectLit(fields))) => {
                let ds = args.get(1).cloned().unwrap_or_default();
                let mut out = Vec::new();
                for (k, _) in fields {
                    let d = self.read_field(&ds, &Field::named(&k));
                    out.push((k, d));
                }
                out
            }
            _ => return None,
        };
        let mut out = Vec::new();
        for (k, d) in named {
            let value = self.read_field(&d, &Field::Name("value".into()));
            let get = self.read_field(&d, &Field::Name("get".into()));
            let set = self.read_field(&d, &Field::Name("set".into()));
            out.push((Field::named(&k), value));
            out.push((Field::Getter(k.clone()), get));
            out.push((Field::Setter(k), set));
        }
        Some(out)
    }

    /// A standard function, by its path.
    fn static_call(&mut self, path: &str, args: &[Pts]) -> Pts {
        match path {
            // (An object inheriting from the first: what it holds, read
            // from the new one; given the second's definitions.)
            "Object.create" => {
                let s = self.new_site();
                if let Some(p) = args.first() {
                    let p = self.norm(p);
                    let mut ch = false;
                    Self::grow(self.protos.entry(s).or_default(), &p, &mut ch);
            if ch {
                self.holdings_changed();
            }
                    self.changed |= ch;
                }
                if let Some(props) = args.get(1) {
                    let descs = self.read(props);
                    let mut values = Pts::new();
                    for f in ["value", "get", "set"] {
                        let v = self.read_field(&descs, &Field::Name(f.to_string()));
                        values.extend(v);
                    }
                    self.add_field(s, Field::Defined, &values);
                }
                return Pts::from([s]);
            }
            // (Its prototype: one the analysis follows, or a standard one.)
            "Object.getPrototypeOf" | "Reflect.getPrototypeOf" => {
                let mut out = Pts::new();
                for &l in args.first().cloned().unwrap_or_default().iter() {
                    match self.locs[l as usize].clone() {
                        Loc::Unknown => {
                            out.insert(l);
                        }
                        Loc::B(a) => match self.snapshot.get(&a) {
                            Some(HeapObj::Object { proto: Abs::Ref(p), .. } | HeapObj::Closure { proto: Abs::Ref(p), .. }) => {
                                out.insert(self.id(Loc::B(*p)));
                            }
                            Some(HeapObj::Closure { .. }) => {
                                out.insert(self.id(Loc::Builtin("Function.prototype".into())));
                            }
                            _ => {
                                out.insert(self.id(Loc::Builtin("Object.prototype".into())));
                            }
                        },
                        Loc::Site(..) => {
                            out.extend(self.protos.get(&l).cloned().unwrap_or_default());
                            out.insert(self.id(Loc::Builtin("Object.prototype".into())));
                        }
                        Loc::Fn(_) => {
                            out.insert(self.id(Loc::Builtin("Function.prototype".into())));
                        }
                        Loc::Builtin(_) => {
                            out.insert(self.id(Loc::Builtin("Function.prototype".into())));
                        }
                    }
                }
                return out;
            }
            _ => {}
        }
        let all: Pts = args.iter().flatten().copied().collect();
        let known = READING_STATICS.contains(&path) || path.starts_with("Math.");
        let mutating = MUTATING_STATICS.contains(&path);
        if !(known || mutating) {
            if matches!(path, "eval" | "Function" | "setTimeout" | "setInterval" | "setImmediate" | "queueMicrotask") {
                self.reads_globals();
            }
            return self.unknown_call(None, args);
        }
        // (A function given: as a method's, see `method_call`.)
        let calls = CALLBACK_STATICS.contains(&path);
        let mut rets = Pts::new();
        if calls {
            let mut given: Pts = all.iter().copied().filter(|&l| !self.is_function(l)).collect();
            let given_held = self.read(&given);
            given.extend(given_held);
            let Some(r) = self.call_back_as(args, None, &given, &given, true) else { return self.unknown_call(None, args) };
            rets = r;
        }
        if mutating {
            if let Some(first) = args.first() {
                self.write(first);
                // (`assign` copies what the others hold, getters run.)
                let mut more: Pts = args.iter().skip(1).flatten().copied().collect();
                if matches!(path, "Object.assign" | "Reflect.set") {
                    let rest_held = self.read(&more);
                    more.extend(rest_held);
                }
                // (A definition stores its descriptors' `value`, `get` and
                // `set`, by the key when the call writes it: see
                // `defined_fields`; else under any key.)
                if let Some(defs) = self.defined_fields(path, args) {
                    for &l in first.iter() {
                        for (f, p) in &defs {
                            self.add_field(l, f.clone(), p);
                        }
                    }
                    let mut out: Pts = first.clone();
                    out.insert(self.new_site());
                    return out;
                }
                let descs: Option<Pts> = match path {
                    "Object.defineProperty" | "Reflect.defineProperty" => Some(args.get(2).cloned().unwrap_or_default()),
                    "Object.defineProperties" => {
                        let ds = args.get(1).cloned().unwrap_or_default();
                        Some(self.read(&ds))
                    }
                    _ => None,
                };
                if let Some(ds) = descs {
                    more = Pts::new();
                    for f in ["value", "get", "set"] {
                        let v = self.read_field(&ds, &Field::Name(f.to_string()));
                        more.extend(v);
                    }
                }
                // (A definition stores a value or an accessor; `assign`,
                // values; `setPrototypeOf`, a prototype.)
                let f = match path {
                    "Object.assign" | "Reflect.set" => Some(Field::Any),
                    "Object.setPrototypeOf" | "Reflect.setPrototypeOf" => None,
                    _ => Some(Field::Defined),
                };
                for &l in first.iter() {
                    match &f {
                        Some(f) => self.add_field(l, f.clone(), &more),
                        None => {
                            let p = self.norm(&args.get(1).cloned().unwrap_or_default());
                            let mut ch = false;
                            Self::grow(self.protos.entry(l).or_default(), &p, &mut ch);
            if ch {
                self.holdings_changed();
            }
                            self.changed |= ch;
                        }
                    }
                }
            }
        }
        // (A result made of the arguments, read when it is read (see
        // `wraps`); their getters run now.)
        let s = self.new_site();
        let parts: Pts = all.iter().copied().filter(|&l| !matches!(self.locs[l as usize], Loc::Unknown) && !self.is_function(l)).collect();
        let mut made = rets;
        for &l in &parts {
            if !self.esc.contains(&l) && self.may_have_accessors(l) {
                let gets = self.accessors(l, None, true);
                let got = self.run_accessors(l, &gets, Vec::new());
                made.extend(got);
            }
        }
        if all.iter().any(|&l| matches!(self.locs[l as usize], Loc::Unknown)) {
            made.insert(self.id(Loc::Unknown));
        }
        let parts = self.norm(&parts);
        let mut ch = false;
        Self::grow(self.wraps.entry(s).or_default(), &parts, &mut ch);
            if ch {
                self.holdings_changed();
            }
        self.changed |= ch;
        self.add_contents(s, &made);
        // (What returns an argument returns that: `Object(x)`, and the
        // definitions, `freeze` and their kind, their first.)
        let mut out = Pts::from([s]);
        if mutating && !path.starts_with("Reflect.") || path == "Object" {
            out.extend(args.first().cloned().unwrap_or_default());
        }
        out
    }

    fn op(&mut self, op: &Op) {
        if self.debug {
            self.cur_op = format!("{op:?}").chars().take(300).collect();
        }
        match op {
            Op::Assign { var, expr } | Op::Eval { dst: var, expr } => {
                let p = self.expr(expr);
                // (A boundary function made: as which residual function.)
                if let Some(seed) = self.seed(*var) {
                    let made: Vec<usize> = p.iter().filter_map(|&l| match self.locs[l as usize] { Loc::Fn(r) => Some(r), _ => None }).collect();
                    for &b in &seed {
                        if let Loc::B(a) = self.locs[b as usize] {
                            for &r in &made {
                                if self.fn_of_b.entry(a).or_default().insert(r) {
                                    self.changed = true;
                                }
                            }
                        }
                    }
                }
                self.add_var(*var, &p);
            }
            Op::Return(e) => {
                let p = self.expr(e);
                match self.rfid {
                    Some(r) => {
                        let mut ch = false;
                        let p = self.norm(&p);
                        Self::grow(self.ret.entry(r).or_default(), &p, &mut ch);
                        self.changed |= ch;
                    }
                    // (`main`'s result: the caller's.)
                    None => self.escape(&p),
                }
            }
            Op::Throw(e) => {
                let p = self.expr(e);
                self.escape(&p);
            }
            Op::NewObject { dst, fields } => {
                let s = self.alloc(*dst);
                for (k, x) in fields {
                    let p = self.expr(x);
                    self.add_field(s, Field::named(k), &p);
                }
                self.add_var(*dst, &Pts::from([s]));
            }
            Op::NewArray { dst, elems } => {
                let s = self.alloc(*dst);
                for x in elems {
                    let p = self.expr(x);
                    self.add_field(s, Field::Index, &p);
                }
                self.add_var(*dst, &Pts::from([s]));
            }
            Op::PushOp { arr, val } => self.store(arr, Field::Index, None, val),
            Op::SetIndex { arr, index, val } => {
                let key = match index {
                    RExpr::Str(k) => Field::named(k),
                    RExpr::Num(_) => Field::Index,
                    _ => Field::Any,
                };
                self.store(arr, key, Some(index), val)
            }
            Op::SetProp { obj, key, val } => self.store(obj, Field::named(key), None, val),
            Op::DeleteProp { obj, .. } => {
                let base = self.expr(obj);
                self.write(&base);
            }
            Op::DeleteIndex { arr, index } => {
                self.expr(index);
                let base = self.expr(arr);
                self.write(&base);
            }
            Op::AssignGlobal { name, expr } => {
                let p = self.expr(expr);
                let mut ch = false;
                let p = self.norm(&p);
                Self::grow(self.globals.entry(name.clone()).or_default(), &p, &mut ch);
                self.changed |= ch;
            }
            Op::Effect(e) => {
                self.expr(e);
            }
            Op::Try { body, catch_slot, catch_body, finally_body } => {
                // (The handler runs from any point of the body: from what
                // either end holds; after, from either end.)
                let before = self.env.clone();
                let after_body = self.nested(body, 0, before.clone());
                self.env = join_env(&before, &after_body);
                if let Some(c) = catch_slot {
                    let u = self.unknown();
                    self.add_var(*c, &u);
                }
                let catch_start = self.env.clone();
                let after_catch = self.nested(catch_body, 1, catch_start);
                let mut after = join_env(&after_body, &after_catch);
                if let Some(f) = finally_body {
                    after = self.nested(f, 2, join_env(&after, &before));
                }
                self.env = after;
            }
        }
    }

    /// An object the code makes: in the load code, into a variable that is
    /// a boundary object's, that object.
    fn alloc(&mut self, dst: usize) -> u32 {
        if let Some(s) = self.seed(dst) {
            if let Some(&b) = s.iter().next() {
                return b;
            }
        }
        self.new_site()
    }

    fn store(&mut self, obj: &RExpr, key: Field, index: Option<&RExpr>, val: &RExpr) {
        if let Some(i) = index {
            self.expr(i);
        }
        let base = self.expr(obj);
        let v = self.expr(val);
        self.write(&base);
        // (A setter of the property runs, given the value.)
        for &l in &base {
            if !matches!(self.locs[l as usize], Loc::Unknown) && !self.esc.contains(&l) && self.may_have_accessors(l) {
                let sets = self.accessors(l, Some(&key), false);
                self.run_accessors(l, &sets, vec![v.clone()]);
            }
        }
        for &l in &base {
            if matches!(self.locs[l as usize], Loc::Unknown) {
                // (Stored where code the analysis does not follow can reach.)
                self.escape(&v);
            } else {
                self.add_field(l, key.clone(), &v);
            }
        }
    }

    /// A program nested in the current op (`which`: a `try`'s body,
    /// handler, finally), from `start`: what its ends hold.
    fn nested(&mut self, p: &Program<Op, Cond>, which: u32, start: Env) -> Env {
        let saved_at = self.at.clone();
        let saved_site = self.site;
        self.at.push(which);
        let out = self.program(p, start);
        self.at = saved_at;
        self.site = saved_site;
        out
    }

    /// A program from `start`, its own variables flowing through its
    /// blocks to a fixpoint: what its ends (the blocks that halt) hold.
    fn program(&mut self, p: &Program<Op, Cond>, start: Env) -> Env {
        let n = p.blocks.len();
        if n == 0 {
            return start;
        }
        let succs = |b: usize| -> Vec<usize> {
            match &p.blocks[b].term {
                Terminator::Br(t) => vec![t.0],
                Terminator::Cond { t, f, .. } => vec![t.0, f.0],
                _ => Vec::new(),
            }
        };
        // (Blocks in reverse postorder, the earliest first: each runs after
        // what reaches it, but around a loop.)
        let mut order = vec![usize::MAX; n];
        {
            let mut post = Vec::with_capacity(n);
            let mut seen = vec![false; n];
            let mut stack = vec![(p.entry.0, false)];
            while let Some((b, done)) = stack.pop() {
                if done {
                    post.push(b);
                    continue;
                }
                if seen[b] {
                    continue;
                }
                seen[b] = true;
                stack.push((b, true));
                for s in succs(b).into_iter().rev() {
                    if !seen[s] {
                        stack.push((s, false));
                    }
                }
            }
            for (i, b) in post.into_iter().rev().enumerate() {
                order[b] = i;
            }
        }
        let mut ins: Vec<Option<Env>> = vec![None; n];
        ins[p.entry.0] = Some(start);
        let mut work: BTreeSet<(usize, usize)> = BTreeSet::from([(order[p.entry.0], p.entry.0)]);
        let mut end = Env::new();
        let base = self.at.clone();
        while let Some((_, b)) = work.pop_first() {
            self.env = ins[b].clone().unwrap_or_default();
            for (i, op) in p.blocks[b].ops.iter().enumerate() {
                self.at = base.clone();
                self.at.push(b as u32);
                self.at.push(i as u32);
                self.site = 0;
                self.op(op);
            }
            self.at = base.clone();
            self.at.push(b as u32);
            self.at.push(u32::MAX);
            self.site = 0;
            if let Terminator::Cond { cond: Cond::Falsy(c), .. } = &p.blocks[b].term {
                self.expr(c);
            }
            let out = std::mem::take(&mut self.env);
            let next = succs(b);
            if next.is_empty() {
                end = join_env(&end, &out);
            }
            for s in next {
                let (joined, grew) = match &ins[s] {
                    Some(have) => join_env_changed(have, &out),
                    None => (out.clone(), true),
                };
                if grew {
                    ins[s] = Some(joined);
                    work.insert((order[s], s));
                }
            }
        }
        self.at = base;
        end
    }

    /// One walk over every program; `progs`: (program, residual function
    /// it is the body of, whether it runs at runtime).
    fn walk(&mut self, progs: &[(&Program<Op, Cond>, Option<usize>, bool)]) {
        for (i, (p, rfid, runtime)) in progs.iter().enumerate() {
            self.prog = i;
            self.at = Vec::new();
            self.site = 0;
            self.rfid = *rfid;
            self.own = if rfid.is_some() { self.defined[i].clone() } else { std::collections::HashSet::new() };
            self.runtime = *runtime;
            self.program(p, Env::new());
        }
    }

    /// The escaped closed under what objects hold, objects with methods
    /// escaped, and functions made as values called with anything.
    fn settle(&mut self) {
        // (An object holding a function, one runtime code may reach: see
        // the module comment.)
        let mut reach: Pts = Pts::new();
        let mut work: Vec<u32> = self.in_hand.iter().copied().collect();
        while let Some(l) = work.pop() {
            if reach.insert(l) {
                work.extend(self.held(l));
            }
        }
        for l in reach {
            if matches!(self.locs[l as usize], Loc::B(_) | Loc::Site(..)) && !self.esc.contains(&l) {
                let implicit = self.implicit_fns(l);
                if implicit.iter().any(|&h| self.is_function(h) && self.may_use_this(h)) {
                    if self.debug {
                        self.reasons.entry(l).or_insert_with(|| "holds a function using `this`".to_string());
                    }
                    self.esc.insert(l);
                    self.changed = true;
                }
            }
        }
        let mut work: Vec<u32> = self.esc.iter().copied().collect();
        while let Some(l) = work.pop() {
            for h in self.held(l) {
                if self.esc.insert(h) {
                    if self.debug {
                        let r = format!("held by {:?}", self.locs[l as usize]);
                        self.reasons.entry(h).or_insert(r);
                    }
                    self.changed = true;
                    work.push(h);
                }
            }
        }
        // (The objects with an accessor of their own, or a definition's
        // value: see `Pta::accessors`.)
        let acc: Pts = self
            .contents
            .iter()
            .filter(|(_, c)| c.iter().any(|(f, s)| matches!(f, Field::Getter(_) | Field::Setter(_) | Field::Defined) && !s.is_empty()))
            .map(|(l, _)| *l)
            .collect();
        if acc != self.acc_locs {
            self.acc_locs = acc;
            self.holdings_changed();
            self.changed = true;
        }
        // (What the globals hold, when code not followed may read them.)
        // (Not the specializer's own, `__pe_entry`'s: no program names it.)
        if self.unfollowed {
            let mut g: Pts = self.globals.iter().filter(|(n, _)| !n.starts_with("__pe_")).flat_map(|(_, p)| p.iter().copied()).collect();
            let roots: Vec<usize> = self.global_roots.iter().filter(|(n, _)| !n.starts_with("__pe_")).map(|(_, a)| *a).collect();
            for a in roots {
                g.insert(self.id(Loc::B(a)));
            }
            let fresh: Pts = g.iter().copied().filter(|l| !self.esc.contains(l)).collect();
            if !fresh.is_empty() {
                self.note(&fresh, "held by a global");
                self.esc.extend(fresh);
                self.changed = true;
            }
        }
        // (A function escaped, or made unseen: called with anything. One
        // of the boundary's not known as made: every residual function of
        // its code.)
        let mut escaped_fns = self.unreferred.clone();
        for &l in &self.esc {
            match &self.locs[l as usize] {
                Loc::Fn(r) => {
                    escaped_fns.insert(*r);
                }
                Loc::B(a) => {
                    if let Some(HeapObj::Closure { fid, .. }) = self.snapshot.get(a) {
                        match self.fn_of_b.get(a).filter(|rs| !rs.is_empty()) {
                            Some(rs) => escaped_fns.extend(rs.iter().copied()),
                            None => escaped_fns.extend(self.fns.iter().enumerate().filter(|(_, rf)| rf.fid == Some(*fid)).map(|(r, _)| r)),
                        }
                    }
                }
                _ => {}
            }
        }
        let u = self.unknown();
        for r in escaped_fns {
            let Some(rf) = self.fns.get(r) else { continue };
            let (ncap, params, args_var) = (rf.ncaptured, rf.param_vars.clone(), rf.args_var);
            for &p in params.iter().skip(ncap) {
                self.add_var(p, &u);
            }
            if let Some(a) = args_var {
                self.add_var(a, &u);
            }
            let mut ch = false;
            Self::grow(self.this_of.entry(r).or_default(), &u, &mut ch);
            self.changed |= ch;
            let ret = self.ret.get(&r).cloned().unwrap_or_default();
            self.escape(&ret);
        }
        self.compact();
    }

    /// Every set with its escaped objects as `Unknown` (see `norm`), and
    /// the escaped objects' holdings dropped: no change the walk sees.
    fn compact(&mut self) {
        let u = self.id(Loc::Unknown);
        let gone: Pts = self.esc.iter().copied().filter(|&l| !self.is_function(l)).collect();
        let esc = &gone;
        let fix = |set: &mut Pts| {
            if set.iter().any(|l| esc.contains(l)) {
                set.retain(|l| !esc.contains(l));
                set.insert(u);
            }
        };
        for s in self.vars.values_mut() {
            fix(s);
        }
        for c in self.contents.values_mut() {
            for s in c.values_mut() {
                fix(s);
            }
        }
        for s in self.this_of.values_mut() {
            fix(s);
        }
        for s in self.ret.values_mut() {
            fix(s);
        }
        for s in self.globals.values_mut() {
            fix(s);
        }
        for s in self.protos.values_mut() {
            fix(s);
        }
        for s in self.wraps.values_mut() {
            fix(s);
        }
        self.contents.retain(|l, _| !esc.contains(l));
        self.holdings_changed();
        self.in_hand.retain(|l| !esc.contains(l));
    }
}

impl Js {
    /// The boundary objects (addresses of `watch.snapshot`) that code run
    /// after the load code may change (see the module comment), or `None`
    /// when the residual has code the analysis does not see.
    /// `load`: the load code; `main`: `main`'s residual; `live`: the
    /// residual functions they have; `code`: those that run at runtime.
    pub(super) fn entry_may_change(
        &self,
        watch: &EntryWatch,
        load: Option<&Program<Op, Cond>>,
        main: &Program<Op, Cond>,
        fns: &[ResidualFn],
        live: &std::collections::HashSet<usize>,
        code: &std::collections::HashSet<usize>,
    ) -> Option<std::collections::BTreeSet<usize>> {
        if env_flag!("PE_NO_ENTRY_PTS") {
            return None;
        }
        let mut pta = Pta {
            js: self,
            fns,
            snapshot: &watch.snapshot,
            locs: Vec::new(),
            ids: HashMap::new(),
            vars: HashMap::new(),
            shared: std::collections::HashSet::new(),
            contents: HashMap::new(),
            this_of: HashMap::new(),
            ret: HashMap::new(),
            globals: HashMap::new(),
            global_roots: watch.global_roots.iter().cloned().collect(),
            seeds: HashMap::new(),
            unreferred: BTreeSet::new(),
            protos: HashMap::new(),
            wraps: HashMap::new(),
            acc_locs: Pts::new(),
            held_memo: RefCell::new(HashMap::new()),
            field_memo: RefCell::new(HashMap::new()),
            acc_memo: RefCell::new(HashMap::new()),
            esc: Pts::new(),
            written: Pts::new(),
            in_hand: Pts::new(),
            own: std::collections::HashSet::new(),
            defined: Vec::new(),
            unfollowed: false,
            fn_of_b: HashMap::new(),
            uses_this: HashMap::new(),
            assigned_globals: std::collections::HashSet::new(),
            arg_exprs: Vec::new(),
            unseen: false,
            changed: false,
            debug: env_flag!("ENTRY_DEBUG"),
            cur_op: String::new(),
            reasons: HashMap::new(),
            prog: 0,
            at: Vec::new(),
            site: 0,
            env: Env::new(),
            runtime: false,
            rfid: None,
        };
        // (The variables boundary objects are in: those materialization
        // made for them, and those the load code put them in.)
        {
            let keys: Vec<(usize, usize)> = self
                .var_ids
                .borrow()
                .keys
                .iter()
                .filter_map(|(v, k)| match k {
                    VarKey::Escape(a) if watch.snapshot.contains_key(a) => Some((*v, *a)),
                    _ => None,
                })
                .collect();
            for (v, a) in keys {
                let b = pta.id(Loc::B(a));
                pta.seeds.entry(v).or_default().insert(b);
            }
            for (a, v) in &watch.hoisted {
                if watch.snapshot.contains_key(a) {
                    let b = pta.id(Loc::B(*a));
                    pta.seeds.entry(*v).or_default().insert(b);
                }
            }
            let u = pta.unknown();
            pta.seeds.entry(self.input_var()).or_default().extend(u);
            // (See `Pta::shared`.)
            pta.shared.extend(pta.seeds.keys().copied());
            for rf in fns {
                pta.shared.extend(rf.param_vars.iter().copied());
                pta.shared.extend(rf.args_var);
            }
            pta.shared.extend(self.entry.exports.borrow().iter().copied());
        }
        let mut rfids: Vec<usize> = live.iter().copied().collect();
        rfids.sort_unstable();
        let mut progs: Vec<(&Program<Op, Cond>, Option<usize>, bool)> = Vec::new();
        if let Some(l) = load {
            progs.push((l, None, false));
        }
        progs.push((main, None, true));
        for &r in &rfids {
            progs.push((&fns[r].body, Some(r), code.contains(&r)));
        }
        // (What each program defines: see `Pta::own`; and the globals.)
        for (p, _, _) in &progs {
            let mut d = std::collections::HashSet::new();
            fn defs(p: &Program<Op, Cond>, d: &mut std::collections::HashSet<usize>, g: &mut std::collections::HashSet<String>) {
                for b in &p.blocks {
                    for op in &b.ops {
                        d.extend(crate::inline::op_def(op));
                        if let Op::AssignGlobal { name, .. } = op {
                            g.insert(name.clone());
                        }
                        if let Op::Try { body, catch_slot, catch_body, finally_body } = op {
                            d.extend(*catch_slot);
                            defs(body, d, g);
                            defs(catch_body, d, g);
                            if let Some(f) = finally_body {
                                defs(f, d, g);
                            }
                        }
                    }
                }
            }
            defs(p, &mut d, &mut pta.assigned_globals);
            pta.defined.push(d);
        }
        // (A residual function no program here refers to was made where
        // the analysis does not see: as a value.)
        let mut referred = std::collections::HashSet::new();
        for (p, _, _) in &progs {
            referred.extend(reachable_residual_fns(p, fns));
        }
        for &r in &rfids {
            if !referred.contains(&r) {
                pta.unreferred.insert(r);
            }
        }
        let t0 = std::time::Instant::now();
        for round in 0..10_000 {
            pta.changed = false;
            pta.walk(&progs);
            pta.settle();
            if env_flag!("ENTRY_DEBUG") {
                eprintln!("[ENTRY]   points-to round {round}: {} locations, {} escaped, {} written, {:?}", pta.locs.len(), pta.esc.len(), pta.written.len(), t0.elapsed());
                if round > 20 {
                    let sz = |m: &HashMap<usize, Pts>| m.values().map(|s| s.len()).sum::<usize>();
                    eprintln!(
                        "[ENTRY]     sizes: vars {} contents {} protos {} wraps {} this {} ret {} hand {} acc {} fn_of_b {} globals {}",
                        pta.vars.values().map(|s| s.len()).sum::<usize>(),
                        pta.contents.values().flat_map(|c| c.values()).map(|s| s.len()).sum::<usize>(),
                        pta.protos.values().map(|s| s.len()).sum::<usize>(),
                        pta.wraps.values().map(|s| s.len()).sum::<usize>(),
                        sz(&pta.this_of),
                        sz(&pta.ret),
                        pta.in_hand.len(),
                        pta.acc_locs.len(),
                        pta.fn_of_b.values().map(|s| s.len()).sum::<usize>(),
                        pta.globals.values().map(|s| s.len()).sum::<usize>()
                    );
                }
            }
            if pta.unseen {
                return None;
            }
            if !pta.changed {
                let mut out = std::collections::BTreeSet::new();
                if let (true, Ok(vs)) = (pta.debug, std::env::var("ENTRY_PTS_VARS")) {
                    for v in vs.split(',').filter_map(|v| v.trim().parse::<usize>().ok()) {
                        let p = pta.var(v);
                        let shown: Vec<String> = p.iter().map(|&l| format!("{:?}", pta.locs[l as usize])).collect();
                        eprintln!("[ENTRY]     v{v} = {}", shown.join(" "));
                    }
                }
                if pta.debug && env_flag!("ENTRY_PTS_ALL") {
                    for &l in pta.written.iter().chain(pta.esc.iter()) {
                        eprintln!("[ENTRY]     {:?}: {}", pta.locs[l as usize], pta.reasons.get(&l).map_or("?", |s| s.as_str()));
                    }
                }
                for &l in pta.written.iter().chain(pta.esc.iter()) {
                    if let Loc::B(a) = pta.locs[l as usize] {
                        if pta.debug && out.insert(a) {
                            eprintln!("[ENTRY]     @{a}: {}", pta.reasons.get(&l).map_or("?", |s| s.as_str()));
                        }
                        out.insert(a);
                    }
                }
                return Some(out);
            }
        }
        panic!("the entry points-to analysis did not settle in 10000 rounds");
    }
}
