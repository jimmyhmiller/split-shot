//! Which built-ins a residual program visibly replaces at runtime.
//!
//! The specializer assumes the standard built-ins (`String`, `Math`,
//! `Array.prototype.map`, ...) are what they are in a fresh realm, the way
//! Prepack does. It gives that up only for a built-in the residual program
//! visibly writes; there is no attempt to prove the program writes none. A
//! write counts when its target is evidently a built-in or the global object:
//!
//! - an assignment to a global variable that names a built-in;
//! - a property write, delete or definition (`Object.defineProperty`,
//!   `Object.assign`, `Reflect.set`, ...) or a `push` whose target is a
//!   built-in reached by name (`Array.prototype.x = ..`, also through a
//!   variable holding one), which makes that built-in's root name written;
//! - a write to the global object (`globalThis.Math = ..`) of a key naming a
//!   built-in, or of a computed key ("wild": any of them);
//! - a prototype change of a built-in.
//!
//! A write to anything else (a parameter, a call's result, a property of
//! one) is taken to change no built-in, even if at runtime that value were
//! one (monkey patching through an alias is not looked for).
//!
//! The driver re-specializes with the written names (all of them, when wild)
//! treated as unknown runtime values until no assumption conflicts.

use std::collections::{BTreeSet, HashMap};

use crate::js::{Cond, Op, RExpr};
use crate::residual::{Program, Terminator};

/// The standard global names whose values the specializer may assume.
pub const BUILTIN_GLOBALS: &[&str] = &[
    "Object", "Function", "Array", "Number", "parseFloat", "parseInt", "Infinity", "NaN", "undefined", "Boolean",
    "String", "Symbol", "Date", "Promise", "RegExp", "Error", "AggregateError", "EvalError", "RangeError",
    "ReferenceError", "SyntaxError", "TypeError", "URIError", "JSON", "Math", "Intl", "ArrayBuffer", "Atomics",
    "Uint8Array", "Int8Array", "Uint16Array", "Int16Array", "Uint32Array", "Int32Array", "Float32Array",
    "Float64Array", "Uint8ClampedArray", "BigUint64Array", "BigInt64Array", "DataView", "Map", "BigInt", "Set",
    "WeakMap", "WeakSet", "WeakRef", "Proxy", "Reflect", "decodeURI", "decodeURIComponent", "encodeURI",
    "encodeURIComponent", "escape", "unescape", "eval", "isFinite", "isNaN", "TextDecoder", "TextEncoder",
    "console",
];

/// Names of the global object itself.
const GLOBAL_OBJECT_NAMES: &[&str] = &["globalThis", "global", "window", "self"];

/// The global bindings whose values the specializer may assume while the
/// program does not write them: the standard built-ins, and `globalThis`
/// (the global object: sloppy code's `this` for none, see `Instr::PushThis`;
/// its properties are not assumed).
pub fn tracked(name: &str) -> bool {
    BUILTIN_GLOBALS.contains(&name) || name == "globalThis" || name == ARRAY_INDEXES
}

/// Not a global: the assumption that no array index (`"0"`, `"1"`, ...) is
/// a property of `Array.prototype` or `Object.prototype` (and that their
/// prototypes stay the standard ones). Arrays are modeled on it: a hole or
/// an index past the end reads `undefined`, `in` is false there, and a write
/// there defines an own data property. A program writing such a key there
/// (or a computed one, or setting their prototype) does not get it.
pub const ARRAY_INDEXES: &str = "%ArrayIndexes%";

/// Is `k` an array index (a canonical numeric string below 2^32 - 1)?
fn array_index(k: &str) -> bool {
    k.parse::<u32>().is_ok_and(|n| n < u32::MAX && n.to_string() == k)
}

/// What a residual program writes that may change built-ins.
#[derive(Debug, Default, Clone)]
pub struct Writes {
    /// Built-in names written (a global variable, a property of the global
    /// object, or anything under a built-in's root).
    pub names: BTreeSet<String>,
    /// A computed-key write to the global object: any built-in may have
    /// changed.
    pub wild: bool,
    /// The static keys written to targets not known fresh (see
    /// `Js::react_check_methods`).
    pub keys: BTreeSet<String>,
    /// A write may touch a watched object (see `writes_to`).
    pub watched: bool,
}

impl Writes {
    pub fn merge(&mut self, o: &Writes) {
        self.names.extend(o.names.iter().cloned());
        self.wild |= o.wild;
        self.keys.extend(o.keys.iter().cloned());
        self.watched |= o.watched;
    }
}

/// What a write target is known to be.
enum Target {
    /// An object the residual made itself (a literal, `[]`, `{}`, a residual
    /// function).
    Fresh,
    /// The global object or something reached from built-in `root`.
    Builtin { root: String, global_object: bool },
    /// Anything else (a parameter, a call result, a property of one).
    Unknown,
}

/// The built-ins whose standard behavior the scan itself relies on while
/// the program does not write them: `Object.create` makes a fresh object
/// (a write to it changes no built-in), `Symbol()` makes a symbol (a key no
/// global name is).
const TRUSTED: &[&str] = &["Object", "Symbol"];

/// Scan a residual program (its main body and residual functions' bodies):
/// what it writes, with the trusted built-ins relied on only as long as the
/// result does not write them.
pub fn scan_all(progs: &[&Program<Op, Cond>]) -> Writes {
    let mut trust: BTreeSet<&'static str> = TRUSTED.iter().copied().collect();
    loop {
        let mut w = Writes::default();
        for p in progs {
            w.merge(&scan(p, &trust));
        }
        let broken: Vec<&'static str> = trust.iter().copied().filter(|t| w.wild || w.names.contains(*t)).collect();
        if broken.is_empty() {
            return w;
        }
        for b in broken {
            trust.remove(b);
        }
    }
}

/// Scan one residual function body.
fn scan(prog: &Program<Op, Cond>, trust: &BTreeSet<&'static str>) -> Writes {
    scan_watching(prog, trust, None)
}

fn scan_watching(prog: &Program<Op, Cond>, trust: &BTreeSet<&'static str>, watch: Option<&Watch>) -> Writes {
    let mut defs: HashMap<usize, Vec<Def>> = HashMap::new();
    collect_defs(prog, &mut defs);
    let num = crate::inline::number_vars(prog, &std::collections::HashSet::new());
    let mut w = Writes::default();
    scan_program(prog, &Ctx { defs, num, trust: trust.clone(), watch: watch.cloned() }, &mut w);
    w
}

/// Whether the residual (`progs`) writes one of `keys`, or a computed key,
/// on an object that is, or may be, one of `vars` (a variable whose value
/// it holds, or an object of no known origin: not one the residual made
/// plainly, nor a function it made in another variable).
pub fn writes_to(progs: &[&Program<Op, Cond>], vars: &std::collections::HashSet<usize>, keys: &[&str]) -> bool {
    let watch = Watch { vars: vars.clone(), keys: keys.iter().map(|k| k.to_string()).collect() };
    let trust: BTreeSet<&'static str> = TRUSTED.iter().copied().collect();
    progs.iter().any(|p| scan_watching(p, &trust, Some(&watch)).watched)
}

#[derive(Clone)]
struct Watch {
    vars: std::collections::HashSet<usize>,
    keys: BTreeSet<String>,
}

struct Ctx {
    defs: HashMap<usize, Vec<Def>>,
    /// Variables certainly holding Numbers (an index write with one cannot
    /// name a built-in).
    num: std::collections::HashSet<usize>,
    /// The trusted built-ins (see `TRUSTED`) the program does not write.
    trust: BTreeSet<&'static str>,
    /// Objects watched for writes of some keys (see `writes_to`).
    watch: Option<Watch>,
}

/// The variable `e` holds the value of, through copies, if it is one.
fn base_var(e: &RExpr, cx: &Ctx, depth: usize) -> Option<usize> {
    let RExpr::Var(v) = e else { return None };
    match cx.defs.get(v).map(|d| d.as_slice()) {
        Some([Def::Expr(x @ RExpr::Var(_))]) if depth < 32 => base_var(x, cx, depth + 1).or(Some(*v)),
        _ => Some(*v),
    }
}

/// Whether a write of `key` on `target` may touch a watched object.
fn watched_write(target: &RExpr, key: Option<&str>, cx: &Ctx) -> bool {
    let Some(w) = &cx.watch else { return false };
    if key.is_some_and(|k| !w.keys.contains(k)) {
        return false;
    }
    if plain_fresh(target, cx, 0) {
        return false;
    }
    match base_var(target, cx, 0) {
        Some(v) if w.vars.contains(&v) => true,
        // (A function the residual made, in a variable of its own: another
        // object than any watched one.)
        Some(v) if cx.defs.get(&v).is_some_and(|ds| !ds.is_empty() && ds.iter().all(|d| matches!(d, Def::Expr(RExpr::FnRef { .. }) | Def::Fresh))) => false,
        _ => true,
    }
}

/// Is `e` certainly a symbol (a fresh one from the trusted `Symbol`), so no
/// global's name as a property key?
fn is_symbol(e: &RExpr, cx: &Ctx) -> bool {
    const WELL_KNOWN: &[&str] = &[
        "asyncIterator", "hasInstance", "isConcatSpreadable", "iterator", "match", "matchAll", "replace", "search", "species",
        "split", "toPrimitive", "toStringTag", "unscopables",
    ];
    match e {
        RExpr::Call(c, _) => cx.trust.contains("Symbol") && matches!(&**c, RExpr::Global(g) if g == "Symbol"),
        // (A well-known symbol of the trusted `Symbol`.)
        RExpr::Get(o, k) => cx.trust.contains("Symbol") && matches!(&**o, RExpr::Global(g) if g == "Symbol") && WELL_KNOWN.contains(&k.as_str()),
        RExpr::Var(v) => match cx.defs.get(v) {
            Some(ds) if !ds.is_empty() => ds.iter().all(|d| matches!(d, Def::Expr(x) if !matches!(x, RExpr::Var(_)) && is_symbol(x, cx))),
            _ => false,
        },
        _ => false,
    }
}

#[derive(Clone)]
enum Def {
    Expr(RExpr),
    Fresh,
    Other,
}

fn collect_defs(prog: &Program<Op, Cond>, defs: &mut HashMap<usize, Vec<Def>>) {
    for b in &prog.blocks {
        for op in &b.ops {
            match op {
                Op::Assign { var, expr } | Op::Eval { dst: var, expr } => defs.entry(*var).or_default().push(Def::Expr(expr.clone())),
                Op::NewArray { dst, .. } | Op::NewObject { dst, .. } => defs.entry(*dst).or_default().push(Def::Fresh),
                Op::Try { body, catch_slot, catch_body, finally_body } => {
                    if let Some(c) = catch_slot {
                        defs.entry(*c).or_default().push(Def::Other);
                    }
                    collect_defs(body, defs);
                    collect_defs(catch_body, defs);
                    if let Some(f) = finally_body {
                        collect_defs(f, defs);
                    }
                }
                _ => {}
            }
        }
    }
}

fn classify(e: &RExpr, cx: &Ctx, depth: usize) -> Target {
    let defs = &cx.defs;
    if depth > 32 {
        return Target::Unknown;
    }
    match e {
        RExpr::ArrayLit(_) | RExpr::ObjectLit(_) => Target::Fresh,
        // (A residual function: the residual's own, no built-in.)
        RExpr::FnRef { .. } => Target::Fresh,
        RExpr::Call(c, _)
            if cx.trust.contains("Object")
                && matches!(&**c, RExpr::Get(o, m) if m == "create" && matches!(&**o, RExpr::Global(g) if g == "Object")) =>
        {
            Target::Fresh
        }
        RExpr::Global(g) => {
            let head: String = g.chars().take_while(|c| c.is_alphanumeric() || *c == '_' || *c == '$').collect();
            if GLOBAL_OBJECT_NAMES.contains(&head.as_str()) && head.len() == g.len() {
                Target::Builtin { root: head, global_object: true }
            } else if BUILTIN_GLOBALS.contains(&head.as_str()) {
                Target::Builtin { root: head, global_object: false }
            } else {
                Target::Unknown
            }
        }
        RExpr::Get(o, _) | RExpr::Index(o, _) => match classify(o, cx, depth + 1) {
            Target::Builtin { root: _, global_object: true } => {
                // A property of the global object: a built-in if its key names one.
                match e {
                    RExpr::Get(_, k) if GLOBAL_OBJECT_NAMES.contains(&k.as_str()) => Target::Builtin { root: k.clone(), global_object: true },
                    RExpr::Get(_, k) if tracked(k) => Target::Builtin { root: k.clone(), global_object: false },
                    _ => Target::Unknown,
                }
            }
            Target::Builtin { root, .. } => Target::Builtin { root, global_object: false },
            // (A property read from a fresh object can hold anything.)
            _ => Target::Unknown,
        },
        RExpr::Var(v) => match defs.get(v).map(|d| d.as_slice()) {
            Some([Def::Fresh]) => Target::Fresh,
            Some([Def::Expr(x)]) => classify(x, cx, depth + 1),
            // (Assigned on several paths: fresh when each assignment makes a
            // fresh object.)
            Some(ds) if !ds.is_empty() && ds.iter().all(|d| match d {
                Def::Fresh => true,
                Def::Expr(x) => matches!(classify(x, cx, depth + 1), Target::Fresh),
                Def::Other => false,
            }) => Target::Fresh,
            _ => Target::Unknown,
        },
        _ => Target::Unknown,
    }
}

/// Whether `e` is an object or array the residual made plainly (a literal,
/// `{}`, `[]`, `Object.create(..)`), no function.
fn plain_fresh(e: &RExpr, cx: &Ctx, depth: usize) -> bool {
    if depth > 32 {
        return false;
    }
    match e {
        RExpr::ArrayLit(_) | RExpr::ObjectLit(_) => true,
        RExpr::Call(c, _) => matches!(&**c, RExpr::Get(o, m) if m == "create" && matches!(&**o, RExpr::Global(g) if g == "Object")) && cx.trust.contains("Object"),
        RExpr::Var(v) => match cx.defs.get(v).map(|d| d.as_slice()) {
            Some(ds) if !ds.is_empty() => ds.iter().all(|d| match d {
                Def::Fresh => true,
                Def::Expr(x) => plain_fresh(x, cx, depth + 1),
                Def::Other => false,
            }),
            _ => false,
        },
        _ => false,
    }
}

/// Record a write of `key` (a static key, or `None` for a computed one) to
/// `target`.
fn write(target: &RExpr, key: Option<&str>, cx: &Ctx, w: &mut Writes) {
    if watched_write(target, key, cx) {
        w.watched = true;
    }
    let class = classify(target, cx, 0);
    // (A key written on anything but an object or array the residual made
    // plainly: a function it made counts, see `Writes::keys`.)
    if let (false, Some(k)) = (plain_fresh(target, cx, 0), key) {
        w.keys.insert(k.to_string());
    }
    match class {
        Target::Fresh => {}
        Target::Builtin { root: _, global_object: true } => match key {
            Some(k) => {
                if tracked(k) {
                    w.names.insert(k.to_string());
                }
            }
            None => w.wild = true,
        },
        Target::Builtin { root, global_object: false } => {
            if (root == "Array" || root == "Object") && key.is_none_or(array_index) {
                w.names.insert(ARRAY_INDEXES.to_string());
            }
            w.names.insert(root);
        }
        // (No evidence it is a built-in: taken to be none.)
        Target::Unknown => {}
    }
}

/// A write of a numeric key to `target` (an element of an array, as no
/// built-in's name is): one to `Array.prototype` or `Object.prototype`
/// gives arrays an inherited index (see `ARRAY_INDEXES`).
fn index_write(target: &RExpr, cx: &Ctx, w: &mut Writes) {
    if let Target::Builtin { root, global_object: false } = classify(target, cx, 0) {
        if root == "Array" || root == "Object" {
            w.names.insert(ARRAY_INDEXES.to_string());
        }
    }
}

/// A static key: a primitive literal, as the property key it converts to.
fn static_key(e: &RExpr) -> Option<String> {
    match e {
        RExpr::Str(s) => Some(s.clone()),
        RExpr::Num(n) => Some(n.to_js_string()),
        RExpr::Bool(b) => Some(b.to_string()),
        RExpr::Null => Some("null".into()),
        RExpr::Undef => Some("undefined".into()),
        _ => None,
    }
}

fn scan_program(prog: &Program<Op, Cond>, cx: &Ctx, w: &mut Writes) {
    for b in &prog.blocks {
        for op in &b.ops {
            match op {
                Op::AssignGlobal { name, expr } => {
                    if tracked(name) {
                        w.names.insert(name.clone());
                    }
                    scan_expr(expr, cx, w);
                }
                Op::SetProp { obj, key, val } => {
                    write(obj, Some(key), cx, w);
                    scan_expr(obj, cx, w);
                    scan_expr(val, cx, w);
                }
                Op::DeleteProp { obj, key } => {
                    write(obj, Some(key), cx, w);
                    scan_expr(obj, cx, w);
                }
                Op::SetIndex { arr, index, val } => {
                    if !crate::inline::is_number(index, &cx.num) && !is_symbol(index, cx) {
                        write(arr, static_key(index).as_deref(), cx, w);
                    } else {
                        index_write(arr, cx, w);
                    }
                    scan_expr(arr, cx, w);
                    scan_expr(index, cx, w);
                    scan_expr(val, cx, w);
                }
                Op::DeleteIndex { arr, index } => {
                    if !crate::inline::is_number(index, &cx.num) && !is_symbol(index, cx) {
                        write(arr, static_key(index).as_deref(), cx, w);
                    } else {
                        index_write(arr, cx, w);
                    }
                    scan_expr(arr, cx, w);
                    scan_expr(index, cx, w);
                }
                Op::PushOp { arr, val } => {
                    // (`push` on a built-in, `Array.prototype.push(v)`, writes
                    // it; on anything else, indices and `length`, never a
                    // built-in's name.)
                    if let Target::Builtin { root, global_object: false } = classify(arr, cx, 0) {
                        index_write(arr, cx, w);
                        w.names.insert(root);
                    }
                    scan_expr(arr, cx, w);
                    scan_expr(val, cx, w);
                }
                Op::Assign { expr, .. } | Op::Eval { expr, .. } | Op::Return(expr) | Op::Throw(expr) | Op::Effect(expr) => {
                    scan_expr(expr, cx, w)
                }
                Op::NewArray { elems, .. } => elems.iter().for_each(|e| scan_expr(e, cx, w)),
                Op::NewObject { fields, .. } => fields.iter().for_each(|(_, e)| scan_expr(e, cx, w)),
                Op::Try { body, catch_body, finally_body, .. } => {
                    scan_program(body, cx, w);
                    scan_program(catch_body, cx, w);
                    if let Some(f) = finally_body {
                        scan_program(f, cx, w);
                    }
                }
            }
        }
        if let Terminator::Cond { cond: Cond::Falsy(e), .. } = &b.term {
            scan_expr(e, cx, w);
        }
    }
}

/// Writes made by calls of the reflective built-ins (`Object.defineProperty`,
/// `Object.assign`, `Reflect.set`, ...), anywhere in an expression.
fn scan_expr(e: &RExpr, cx: &Ctx, w: &mut Writes) {
    if let RExpr::Call(callee, args) = e {
        let name = match &**callee {
            RExpr::Get(o, m) => match &**o {
                RExpr::Global(g) => Some(format!("{g}.{m}")),
                _ => None,
            },
            _ => None,
        };
        match name.as_deref() {
            Some("Object.defineProperty") | Some("Reflect.defineProperty") | Some("Reflect.set") | Some("Reflect.deleteProperty") => {
                if let (Some(t), false) = (args.first(), args.get(1).is_some_and(|k| is_symbol(k, cx))) {
                    write(t, args.get(1).and_then(static_key).as_deref(), cx, w);
                }
            }
            Some("Object.defineProperties") | Some("Object.assign") => {
                if let Some(t) = args.first() {
                    write(t, None, cx, w);
                }
            }
            // A prototype change binds no property: it changes a built-in
            // only when its target is one (not the global object, whose
            // built-ins are own properties).
            Some("Object.setPrototypeOf") | Some("Reflect.setPrototypeOf") => {
                if let Some(Target::Builtin { root, global_object: false }) = args.first().map(|t| classify(t, cx, 0)) {
                    if root == "Array" || root == "Object" {
                        w.names.insert(ARRAY_INDEXES.to_string());
                    }
                    w.names.insert(root);
                }
            }
            _ => {}
        }
    }
    match e {
        RExpr::Bin(_, a, b) | RExpr::Index(a, b) => {
            scan_expr(a, cx, w);
            scan_expr(b, cx, w);
        }
        RExpr::Get(o, _) | RExpr::Yield(o) | RExpr::Await(o) | RExpr::OwnMember { obj: o, .. } => scan_expr(o, cx, w),
        RExpr::ClassSrc { parent, caps, .. } => {
            if let Some(p) = parent {
                scan_expr(p, cx, w);
            }
            caps.iter().for_each(|x| scan_expr(x, cx, w));
        }
        // `delete o.k` / `delete o[k]` for its value: a write of the key.
        RExpr::Delete(t) => {
            match &**t {
                RExpr::Get(o, k) => write(o, Some(k), cx, w),
                RExpr::Index(o, i) if !matches!(&**i, RExpr::Num(_)) && !is_symbol(i, cx) => write(o, static_key(i).as_deref(), cx, w),
                _ => {}
            }
            scan_expr(t, cx, w);
        }
        RExpr::Opaque(_, xs) | RExpr::FnRef { caps: xs, .. } | RExpr::ArrayLit(xs) => xs.iter().for_each(|x| scan_expr(x, cx, w)),
        RExpr::Call(c, xs) | RExpr::New(c, xs) => {
            scan_expr(c, cx, w);
            xs.iter().for_each(|x| scan_expr(x, cx, w));
        }
        RExpr::BoundMethod { func, recv } => {
            scan_expr(func, cx, w);
            scan_expr(recv, cx, w);
        }
        RExpr::ObjectLit(fs) => fs.iter().for_each(|(_, x)| scan_expr(x, cx, w)),
        RExpr::Num(_) | RExpr::Str(_) | RExpr::Bool(_) | RExpr::Undef | RExpr::Null | RExpr::This | RExpr::Var(_) | RExpr::Global(_) | RExpr::RegexLit(..) | RExpr::BigInt(_) | RExpr::NewFn { .. } | RExpr::Hole | RExpr::Verbatim(..) => {}
    }
}
