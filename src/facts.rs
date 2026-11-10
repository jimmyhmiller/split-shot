//! Facts: what one specialization path has established about the runtime
//! values of residual variables.
//!
//! A path learns facts from the branches it takes (`x > 5` on the true arm),
//! from `typeof` and `== null` tests, and from the expression each variable
//! is assigned (`t = a + 1` is a number when `a` is). The specializer then
//! decides comparisons, `typeof`, truthiness and strict equality that the
//! facts settle (`x > 3` after `x > 5`), instead of residualizing them.
//!
//! An `Info` describes one value. Its numeric bounds are bounds on the
//! value's ToNumeric (what a relational comparison with a number compares)
//! *when it is not NaN*; `nan` says whether it may be NaN. Comparisons and
//! conversions are assumed to run no user code that changes the answer (an
//! object's `valueOf` answers the same each time), as Prepack assumes.
//!
//! Facts live in the specialization state, keyed by residual variable, are
//! part of its identity, and weaken where paths merge: `join` (the hull) at a
//! forward join, `widen` (a bound that differs is dropped) at a loop head, so
//! a loop's facts settle.

use crate::js::{Bop, RExpr};
use crate::jsnum::JsNum;

pub const T_UNDEF: u16 = 1;
pub const T_NULL: u16 = 2;
pub const T_BOOL: u16 = 4;
pub const T_NUM: u16 = 8;
pub const T_STR: u16 = 16;
pub const T_SYM: u16 = 32;
pub const T_BIGINT: u16 = 64;
pub const T_OBJ: u16 = 128;
pub const T_FUNC: u16 = 256;
pub const T_ALL: u16 = 511;
/// Types whose ToPrimitive is never a string: a relational comparison with
/// one of them compares numbers.
const T_NEVER_STR: u16 = T_UNDEF | T_NULL | T_BOOL | T_NUM | T_BIGINT | T_SYM;
/// Types that convert to a Number (never a BigInt, never a string, no user
/// code): `+`, `-` and `*` over them give a Number.
const T_PLAIN_NUMERIC: u16 = T_UNDEF | T_NULL | T_BOOL | T_NUM;

/// One end of an interval: the value, and whether it is included.
#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug)]
pub struct Bound {
    pub v: JsNum,
    pub incl: bool,
}

impl Bound {
    fn incl(v: f64) -> Option<Bound> {
        if v.is_finite() {
            Some(Bound { v: JsNum::new(v), incl: true })
        } else {
            None
        }
    }
}

/// The function a runtime value is: its code (`fid`) and what its closure
/// captured, each a runtime expression. A function's code and captures never
/// change, so a call of the value can run that code (see `Js::known_callee`).
/// `object`: what its function object held when this was learned (it may
/// have changed since: only a host model's contract, `--react`, relies on
/// it).
#[derive(Clone, PartialEq, Eq, Hash, Debug)]
pub struct KnownFn {
    pub fid: usize,
    pub caps: Vec<KnownCap>,
    pub object: FnObject,
    /// A class's: the methods its definition gave its prototype (by name),
    /// as they were when this was learned, each a runtime value (whose own
    /// facts say what it is).
    pub methods: Vec<(String, KnownVal)>,
    /// The static methods of its own a host model reads (by name; see
    /// `Js::carried_statics`), each a runtime value.
    pub statics: Vec<(String, KnownVal)>,
}

/// What a function object held, as far as it is told by values with no
/// identity of their own (see `KnownFn::object`).
#[derive(Clone, PartialEq, Eq, Hash, Debug, Default)]
pub struct FnObject {
    /// Its `prototype` was still the object it was made with, holding only
    /// its `constructor`.
    pub proto_as_made: bool,
    /// Its other own properties: data properties holding a primitive or an
    /// ordinary object of primitives (`None`: any other value), in order.
    pub props: Vec<(String, Option<FnObjectValue>)>,
    /// Its `[[Prototype]]` when that was a runtime value (a class's parent),
    /// that value.
    pub parent: Option<RExpr>,
    /// It is an ES5 class of that parent: its body only constructs as the
    /// parent does (`parent.apply(this, arguments)`), its own `prototype`
    /// an object inheriting from the parent's (see `Js::es5_methods`).
    pub es5_class: bool,
    /// A class's: its `prototype` holds its `constructor` and the methods
    /// its definition gave it, nothing else, and inherits from its parent's
    /// `prototype` (as `Js::fn_object` tells it).
    pub class_proto: bool,
}

#[derive(Clone, PartialEq, Eq, Hash, Debug)]
pub enum FnObjectValue {
    Prim(RExpr),
    Record(Vec<(String, RExpr)>),
}

impl FnObject {
    /// It held only what it was made with.
    pub fn as_made(&self) -> bool {
        self.proto_as_made && self.props.is_empty()
    }
}

/// One capture of a `KnownFn`: the value captured, or (`cell`) the value a
/// variable's final cell (`ObjClass::FinalCell`) holds for good, the cell
/// itself no runtime object the value names.
#[derive(Clone, PartialEq, Eq, Hash, Debug)]
pub struct KnownCap {
    pub cell: bool,
    pub value: KnownVal,
}

/// A value a `KnownCap` holds.
#[derive(Clone, PartialEq, Eq, Hash, Debug)]
pub enum KnownVal {
    /// This runtime expression (a static primitive, or a variable).
    Expr(RExpr),
    /// A handle of a host model (the module `require(name)` gave, a React
    /// context, ...: `Js`'s handles, see `react::is_handle`) of this kind and
    /// static parts, this runtime value.
    Handle(String, Vec<RExpr>, RExpr),
    /// An element of React's model (`Js`'s, see `react`), its data each so
    /// (its props object a `Record`, React's array of its children a
    /// `List`), the runtime element this expression is.
    Element(Vec<KnownVal>, RExpr),
    Record(Vec<(String, KnownVal)>),
    List(Vec<KnownVal>),
}

impl KnownVal {
    /// Every variable this names.
    pub fn vars(&self, out: &mut Vec<usize>) {
        match self {
            KnownVal::Expr(e) => crate::coalesce::rexpr_vars(e, out),
            KnownVal::Handle(_, statics, e) => {
                crate::coalesce::rexpr_vars(e, out);
                statics.iter().for_each(|x| crate::coalesce::rexpr_vars(x, out));
            }
            KnownVal::Element(parts, e) => {
                crate::coalesce::rexpr_vars(e, out);
                parts.iter().for_each(|p| p.vars(out));
            }
            KnownVal::Record(fs) => fs.iter().for_each(|(_, p)| p.vars(out)),
            KnownVal::List(xs) => xs.iter().for_each(|p| p.vars(out)),
        }
    }

    /// This with each variable `v` it names replaced by `f(v)`.
    pub fn renamed(&self, f: &dyn Fn(usize) -> usize) -> KnownVal {
        let r = |x: &RExpr| crate::inline::rename_vars(x, f);
        match self {
            KnownVal::Expr(x) => KnownVal::Expr(r(x)),
            KnownVal::Handle(kind, statics, x) => KnownVal::Handle(kind.clone(), statics.iter().map(r).collect(), r(x)),
            KnownVal::Element(parts, x) => KnownVal::Element(parts.iter().map(|p| p.renamed(f)).collect(), r(x)),
            KnownVal::Record(fs) => KnownVal::Record(fs.iter().map(|(k, p)| (k.clone(), p.renamed(f))).collect()),
            KnownVal::List(xs) => KnownVal::List(xs.iter().map(|p| p.renamed(f)).collect()),
        }
    }
}

/// What is known about one runtime value.
#[derive(Clone, PartialEq, Eq, Hash, Debug)]
pub struct Info {
    /// The possible types (`T_*` bits).
    pub types: u16,
    /// Lower and upper bounds on ToNumeric of the value, if it is not NaN.
    pub lo: Option<Bound>,
    pub hi: Option<Bound>,
    /// ToNumeric of the value may be NaN.
    pub nan: bool,
    pub truthy: Option<bool>,
    /// Strictly equal to this primitive constant (never NaN), or, for a
    /// known property, the value of this residual binding (a variable no
    /// code assigns: see `Js::object_assign_info`).
    pub eq: Option<RExpr>,
    /// Strictly unequal to each of these primitive constants.
    pub ne: Vec<RExpr>,
    /// The value of `c ? x : y`: the condition and what each side is (a
    /// decision holds of the value when it holds of both sides).
    pub cases: Option<Box<(RExpr, Info, Info)>>,
    /// Own data properties of the object the value is that can never change
    /// (it is frozen), with their values.
    pub fixed: Vec<(String, RExpr)>,
    /// What is known of own data properties of the object the value is,
    /// until something may change them: the value of `v.k` (code that may
    /// write it drops it; see `Js::freeze_readers`).
    pub props: Vec<(String, Info)>,
    /// The function the value is, when known.
    pub callee: Option<std::rc::Rc<KnownFn>>,
    /// The value is an ordinary object, or an ordinary function as made:
    /// its properties, own and inherited, writable data properties (a
    /// function's but its read-only `length` and `name` and
    /// `Function.prototype`'s `caller` and `arguments`: its [[Prototype]]
    /// the unmodified `Function.prototype`). (A write of any other key to an
    /// object whose chain reaches it makes an own data property: see
    /// `set_resolves_statically`.)
    pub ordinary: bool,
}

impl Info {
    pub fn top() -> Info {
        Info { types: T_ALL, lo: None, hi: None, nan: true, truthy: None, eq: None, ne: Vec::new(), cases: None, fixed: Vec::new(), props: Vec::new(), callee: None, ordinary: false }
    }

    fn of_types(types: u16) -> Info {
        Info { types, ..Info::top() }
    }

    pub fn is_top(&self) -> bool {
        *self == Info::top()
    }

    /// The info of a primitive constant expression, if `e` is one.
    pub fn of_const(e: &RExpr) -> Option<Info> {
        let mut i = Info::top();
        match e {
            RExpr::Num(n) => {
                i.types = T_NUM;
                if n.f().is_nan() {
                    i.truthy = Some(false);
                    return Some(i);
                }
                i.lo = Bound::incl(n.f());
                i.hi = i.lo;
                i.nan = false;
                i.truthy = Some(n.truthy());
            }
            RExpr::Str(s) => {
                i.types = T_STR;
                let n = JsNum::parse(s);
                if !n.f().is_nan() {
                    i.lo = Bound::incl(n.f());
                    i.hi = i.lo;
                    i.nan = false;
                }
                i.truthy = Some(!s.is_empty());
            }
            RExpr::Bool(b) => {
                i.types = T_BOOL;
                i.lo = Bound::incl(if *b { 1.0 } else { 0.0 });
                i.hi = i.lo;
                i.nan = false;
                i.truthy = Some(*b);
            }
            RExpr::Undef => {
                i.types = T_UNDEF;
                i.truthy = Some(false);
            }
            RExpr::Null => {
                i.types = T_NULL;
                i.lo = Bound::incl(0.0);
                i.hi = i.lo;
                i.nan = false;
                i.truthy = Some(false);
            }
            RExpr::BigInt(d) => {
                i.types = T_BIGINT;
                i.truthy = Some(d.trim_start_matches('-').trim_start_matches('0') != "");
            }
            _ => return None,
        }
        i.eq = Some(e.clone());
        Some(i)
    }

    /// The hull of two infos (what holds of a value that is one or the other).
    pub fn join(&self, o: &Info) -> Info {
        Info {
            types: self.types | o.types,
            lo: looser_lo(self.lo, o.lo),
            hi: looser_hi(self.hi, o.hi),
            nan: self.nan || o.nan,
            truthy: if self.truthy == o.truthy { self.truthy } else { None },
            eq: if self.eq == o.eq { self.eq.clone() } else { None },
            ne: self.ne.iter().filter(|c| o.ne.contains(c)).cloned().collect(),
            cases: if self.cases == o.cases { self.cases.clone() } else { None },
            fixed: self.fixed.iter().filter(|p| o.fixed.contains(p)).cloned().collect(),
            props: self
                .props
                .iter()
                .filter_map(|(k, i)| o.props.iter().find(|(k2, _)| k2 == k).map(|(_, j)| (k.clone(), i.join(j))))
                .collect(),
            callee: if self.callee == o.callee { self.callee.clone() } else { None },
            ordinary: self.ordinary && o.ordinary,
        }
    }

    /// The info of `c ? x : y` from the sides' infos.
    pub fn choice(c: &RExpr, x: Info, y: Info) -> Info {
        let mut i = x.join(&y);
        if let (Some(a), Some(b)) = (x.truthiness(), y.truthiness()) {
            if a == b {
                i.truthy = Some(a);
            }
        }
        i.cases = Some(Box::new((c.clone(), x, y)));
        i
    }

    /// `join`, but a bound the two disagree on is dropped (at a loop head:
    /// a counter's interval would otherwise grow without end).
    pub fn widen(&self, o: &Info) -> Info {
        let mut j = self.join(o);
        if self.lo != o.lo {
            j.lo = None;
        }
        if self.hi != o.hi {
            j.hi = None;
        }
        j
    }

    /// Whether the value is truthy, when the info settles it.
    pub fn truthiness(&self) -> Option<bool> {
        if self.truthy.is_some() {
            return self.truthy;
        }
        if let Some(c) = &self.cases {
            if let (Some(a), Some(b)) = (c.1.truthiness(), c.2.truthiness()) {
                if a == b {
                    return Some(a);
                }
            }
        }
        if let Some(t) = self.eq.as_ref().and_then(Info::of_const).and_then(|i| i.truthy) {
            return Some(t);
        }
        if self.types & !(T_OBJ | T_FUNC | T_SYM) == 0 {
            return Some(true);
        }
        if self.types & !(T_UNDEF | T_NULL) == 0 {
            return Some(false);
        }
        if self.types == T_NUM && !self.nan {
            let excludes_zero = matches!(self.lo, Some(b) if b.v.f() > 0.0 || (b.v.f() == 0.0 && !b.incl))
                || matches!(self.hi, Some(b) if b.v.f() < 0.0 || (b.v.f() == 0.0 && !b.incl));
            if excludes_zero {
                return Some(true);
            }
        }
        if self.types == T_STR && self.ne.contains(&RExpr::Str(String::new())) {
            return Some(true);
        }
        None
    }

    /// `typeof` of the value, when every possible type gives the same answer.
    pub fn typeof_name(&self) -> Option<&'static str> {
        if let Some(c) = &self.cases {
            if let (Some(a), Some(b)) = (c.1.typeof_name(), c.2.typeof_name()) {
                if a == b {
                    return Some(a);
                }
            }
        }
        let mut name = None;
        for (bit, n) in TYPE_NAMES {
            if self.types & bit != 0 {
                match name {
                    None => name = Some(n),
                    Some(m) if m == n => {}
                    Some(_) => return None,
                }
            }
        }
        name
    }

    /// Bounds usable in a numeric comparison: (lo, hi) with `None` unbounded.
    fn interval(&self) -> (Option<Bound>, Option<Bound>) {
        (self.lo, self.hi)
    }
}

const TYPE_NAMES: [(u16, &str); 9] = [
    (T_UNDEF, "undefined"),
    (T_NULL, "object"),
    (T_BOOL, "boolean"),
    (T_NUM, "number"),
    (T_STR, "string"),
    (T_SYM, "symbol"),
    (T_BIGINT, "bigint"),
    (T_OBJ, "object"),
    (T_FUNC, "function"),
];

/// The types `typeof v === name` admits.
fn typeof_mask(name: &str) -> Option<u16> {
    Some(match name {
        "undefined" => T_UNDEF,
        "object" => T_NULL | T_OBJ,
        "boolean" => T_BOOL,
        "number" => T_NUM,
        "string" => T_STR,
        "symbol" => T_SYM,
        "bigint" => T_BIGINT,
        "function" => T_FUNC,
        _ => return None,
    })
}

/// The type a `__abstract("number", ...)`-style declaration names.
pub fn declared_type_mask(name: &str) -> Option<u16> {
    match name {
        "object" => Some(T_OBJ),
        "array" => Some(T_OBJ),
        "integral" => Some(T_NUM),
        "empty" => None,
        n => typeof_mask(n),
    }
}

fn tighter_lo(a: Option<Bound>, b: Option<Bound>) -> Option<Bound> {
    match (a, b) {
        (None, x) | (x, None) => x,
        (Some(x), Some(y)) => {
            if x.v.f() > y.v.f() || (x.v.f() == y.v.f() && !x.incl) {
                Some(x)
            } else {
                Some(y)
            }
        }
    }
}

fn tighter_hi(a: Option<Bound>, b: Option<Bound>) -> Option<Bound> {
    match (a, b) {
        (None, x) | (x, None) => x,
        (Some(x), Some(y)) => {
            if x.v.f() < y.v.f() || (x.v.f() == y.v.f() && !x.incl) {
                Some(x)
            } else {
                Some(y)
            }
        }
    }
}

fn looser_lo(a: Option<Bound>, b: Option<Bound>) -> Option<Bound> {
    match (a, b) {
        (Some(x), Some(y)) => {
            if x.v.f() < y.v.f() || (x.v.f() == y.v.f() && x.incl) {
                Some(x)
            } else {
                Some(y)
            }
        }
        _ => None,
    }
}

fn looser_hi(a: Option<Bound>, b: Option<Bound>) -> Option<Bound> {
    match (a, b) {
        (Some(x), Some(y)) => {
            if x.v.f() > y.v.f() || (x.v.f() == y.v.f() && x.incl) {
                Some(x)
            } else {
                Some(y)
            }
        }
        _ => None,
    }
}

/// How the facts of a variable are looked up.
pub type Lookup<'a> = &'a dyn Fn(usize) -> Option<Info>;

/// The info of a residual expression under the facts `lookup` gives. A call
/// of one of `typed_fns` (a declaration of an unknown value of a named type,
/// `__abstract("number", ...)`) has the type it names.
pub fn info_of(e: &RExpr, lookup: Lookup, typed_fns: &[&str]) -> Info {
    if let Some(i) = Info::of_const(e) {
        return i;
    }
    // A property the object's facts know (a known or frozen one): what is
    // known of it.
    let property = match e {
        RExpr::Get(base, key) | RExpr::OwnMember { obj: base, key, .. } => Some((&**base, key.as_str())),
        RExpr::Index(base, key) => match &**key {
            RExpr::Str(key) => Some((&**base, key.as_str())),
            _ => None,
        },
        _ => None,
    };
    if let Some((base, key)) = property {
        let object = info_of(base, lookup, typed_fns);
        if let Some((_, field)) = object.props.iter().find(|(name, _)| name == key) {
            return field.clone();
        }
        if let Some((_, value)) = object.fixed.iter().find(|(name, _)| name == key) {
            return info_of(value, lookup, typed_fns);
        }
    }
    match e {
        RExpr::Var(v) => lookup(*v).unwrap_or_else(Info::top),
        RExpr::Bin(op, a, b) => {
            let (ia, ib) = (info_of(a, lookup, typed_fns), info_of(b, lookup, typed_fns));
            // (A comparison the facts decide is that boolean.)
            let decided = match op {
                Bop::Lt | Bop::Le | Bop::Gt | Bop::Ge => decide_rel(*op, &ia, &ib),
                Bop::Eq => decide_strict_eq(&ia, &ib),
                Bop::Ne => decide_strict_eq(&ia, &ib).map(|r| !r),
                _ => None,
            };
            if let Some(r) = decided {
                return Info::of_const(&RExpr::Bool(r)).unwrap();
            }
            bin_info(*op, &ia, &ib)
        }
        RExpr::Opaque(op, xs) if op == "?:" && xs.len() == 3 => {
            let c = info_of(&xs[0], lookup, typed_fns);
            let (x, y) = (info_of(&xs[1], lookup, typed_fns), info_of(&xs[2], lookup, typed_fns));
            match c.truthiness() {
                Some(true) => x,
                Some(false) => y,
                None => Info::choice(&xs[0], x, y),
            }
        }
        RExpr::Opaque(op, xs) => {
            let infos: Vec<Info> = xs.iter().map(|x| info_of(x, lookup, typed_fns)).collect();
            // (`v == null` and `typeof v` the facts decide.)
            match (op.as_str(), xs.as_slice()) {
                ("==" | "!=", [a, b]) => {
                    let other = match (a, b) {
                        (x, RExpr::Null | RExpr::Undef) => Some(x),
                        (RExpr::Null | RExpr::Undef, x) => Some(x),
                        _ => None,
                    };
                    if let Some(x) = other {
                        if let Some(r) = decide_nullish(&info_of(x, lookup, typed_fns)) {
                            return Info::of_const(&RExpr::Bool(if op == "==" { r } else { !r })).unwrap();
                        }
                    }
                }
                ("typeof", [_]) => {
                    if let Some(t) = infos[0].typeof_name() {
                        return Info::of_const(&RExpr::Str(t.to_string())).unwrap();
                    }
                }
                _ => {}
            }
            opaque_info(op, &infos)
        }
        RExpr::Call(c, args) => {
            // (The runtime helpers that make an object, `runtime.js`.)
            if args.len() == 1 {
                match &**c {
                    RExpr::Global(g) if g == "__pe_objectCreate" => return Info { types: T_OBJ, truthy: Some(true), ..Info::top() },
                    RExpr::Global(g) if g == "__pe_constructorPrototype" => return Info { types: T_OBJ | T_FUNC, truthy: Some(true), ..Info::top() },
                    _ => {}
                }
            }
            if let (RExpr::Global(g), Some(RExpr::Str(t))) = (&**c, args.first()) {
                if typed_fns.contains(&g.as_str()) {
                    if let Some(mask) = declared_type_mask(t) {
                        let mut i = Info::of_types(mask);
                        let or = |s: &str| g.ends_with(s);
                        if or("OrNull") || or("OrNullOrUndefined") {
                            i.types |= T_NULL;
                        }
                        if or("OrUndefined") || or("OrNullOrUndefined") {
                            i.types |= T_UNDEF;
                        }
                        return i;
                    }
                }
            }
            // (A declared value of an object's shape, `__abstract({...}, src)`.)
            if let (RExpr::Global(g), Some(RExpr::ObjectLit(_))) = (&**c, args.first()) {
                if typed_fns.contains(&g.as_str()) && !g.contains("Or") {
                    return Info { truthy: Some(true), ..Info::of_types(T_OBJ) };
                }
            }
            Info::top()
        }
        // A string's length: at least its known part's.
        RExpr::Get(o, k) if k == "length" && info_of(o, lookup, typed_fns).types == T_STR => {
            fn min_len(e: &RExpr, lookup: Lookup, typed_fns: &[&str]) -> f64 {
                match e {
                    RExpr::Str(s) => s.encode_utf16().count() as f64,
                    RExpr::Bin(Bop::Add, a, b) if info_of(e, lookup, typed_fns).types == T_STR => {
                        let part = |x: &RExpr| match info_of(x, lookup, typed_fns).types {
                            T_STR => min_len(x, lookup, typed_fns),
                            // (A number, boolean, null or undefined prints as at least one character.)
                            t if t & !(T_NUM | T_BOOL | T_NULL | T_UNDEF) == 0 => 1.0,
                            _ => 0.0,
                        };
                        part(a) + part(b)
                    }
                    _ => 0.0,
                }
            }
            Info { lo: Bound::incl(min_len(o, lookup, typed_fns)), nan: false, ..Info::of_types(T_NUM) }
        }
        RExpr::ArrayLit(_) | RExpr::ObjectLit(_) | RExpr::RegexLit(..) => Info { truthy: Some(true), ..Info::of_types(T_OBJ) },
        // (`new` gives an object, which may be callable: `new Proxy(f, h)`,
        // `new Function(..)`, a constructor that returns a function.)
        RExpr::New(..) => Info { truthy: Some(true), ..Info::of_types(T_OBJ | T_FUNC) },
        RExpr::FnRef { .. } | RExpr::NewFn { .. } | RExpr::ClassSrc { .. } => Info { truthy: Some(true), ..Info::of_types(T_FUNC) },
        _ => Info::top(),
    }
}

fn add_bounds(a: Option<Bound>, b: Option<Bound>, f: impl Fn(f64, f64) -> f64) -> Option<Bound> {
    let (a, b) = (a?, b?);
    let v = f(a.v.f(), b.v.f());
    if v.is_finite() {
        Some(Bound { v: JsNum::new(v), incl: a.incl && b.incl })
    } else {
        None
    }
}

/// Bounded on both sides by finite bounds: then never an infinity.
fn bounded(i: &Info) -> bool {
    i.lo.is_some() && i.hi.is_some()
}

fn bin_info(op: Bop, a: &Info, b: &Info) -> Info {
    // (A BigInt result needs both operands BigInts: one mixed with a Number
    // throws. An object may convert to either.)
    let maybe_big = |i: &Info| i.types & (T_BIGINT | T_OBJ | T_FUNC) != 0;
    let numeric = if maybe_big(a) && maybe_big(b) { T_NUM | T_BIGINT } else { T_NUM };
    match op {
        Bop::Lt | Bop::Le | Bop::Gt | Bop::Ge | Bop::Eq | Bop::Ne => Info::of_types(T_BOOL),
        Bop::Add => {
            if a.types & !T_PLAIN_NUMERIC == 0 && b.types & !T_PLAIN_NUMERIC == 0 {
                let mut i = Info::of_types(T_NUM);
                i.lo = add_bounds(a.lo, b.lo, |x, y| x + y);
                i.hi = add_bounds(a.hi, b.hi, |x, y| x + y);
                i.nan = a.nan || b.nan || !(bounded(a) && bounded(b));
                return i;
            }
            if a.types == T_STR || b.types == T_STR {
                return Info::of_types(T_STR);
            }
            Info::of_types(T_NUM | T_STR | T_BIGINT)
        }
        Bop::Sub => {
            if a.types & !T_PLAIN_NUMERIC == 0 && b.types & !T_PLAIN_NUMERIC == 0 {
                let mut i = Info::of_types(T_NUM);
                i.lo = add_bounds(a.lo, b.hi, |x, y| x - y);
                i.hi = add_bounds(a.hi, b.lo, |x, y| x - y);
                i.nan = a.nan || b.nan || !(bounded(a) && bounded(b));
                return i;
            }
            Info::of_types(numeric)
        }
        Bop::Mul => {
            if a.types & !T_PLAIN_NUMERIC == 0 && b.types & !T_PLAIN_NUMERIC == 0 {
                let mut i = Info::of_types(T_NUM);
                if let (Some(al), Some(ah), Some(bl), Some(bh)) = (a.lo, a.hi, b.lo, b.hi) {
                    let ps = [al.v.f() * bl.v.f(), al.v.f() * bh.v.f(), ah.v.f() * bl.v.f(), ah.v.f() * bh.v.f()];
                    let lo = ps.iter().cloned().fold(f64::INFINITY, f64::min);
                    let hi = ps.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
                    i.lo = Bound::incl(lo);
                    i.hi = Bound::incl(hi);
                    i.nan = a.nan || b.nan;
                }
                return i;
            }
            Info::of_types(numeric)
        }
        Bop::BitAnd | Bop::BitOr | Bop::BitXor | Bop::Shl | Bop::Shr => {
            if numeric == T_NUM {
                Info { lo: Bound::incl(-2147483648.0), hi: Bound::incl(2147483647.0), nan: false, ..Info::of_types(T_NUM) }
            } else {
                Info::of_types(T_NUM | T_BIGINT)
            }
        }
        Bop::UShr => Info { lo: Bound::incl(0.0), hi: Bound::incl(4294967295.0), nan: false, ..Info::of_types(T_NUM) },
    }
}

fn opaque_info(op: &str, xs: &[Info]) -> Info {
    match (op, xs) {
        ("typeof", _) => Info { truthy: Some(true), ..Info::of_types(T_STR) },
        // (Unary `+`: ToNumber, which throws for a BigInt.)
        ("+", [_]) => Info::of_types(T_NUM),
        ("!", [a]) => {
            let mut i = Info::of_types(T_BOOL);
            if let Some(t) = a.truthiness() {
                i = Info::of_const(&RExpr::Bool(!t)).unwrap();
            }
            i
        }
        ("void", _) => Info::of_const(&RExpr::Undef).unwrap(),
        ("==" | "!=" | "in" | "instanceof", _) => Info::of_types(T_BOOL),
        ("-", [a]) if a.types & !T_PLAIN_NUMERIC == 0 => {
            let neg = |b: Option<Bound>| b.map(|b| Bound { v: JsNum::new(-b.v.f()), incl: b.incl });
            Info { lo: neg(a.hi), hi: neg(a.lo), nan: a.nan, ..Info::of_types(T_NUM) }
        }
        ("tonumeric", [a]) if a.types & !T_PLAIN_NUMERIC == 0 => Info { lo: a.lo, hi: a.hi, nan: a.nan, ..Info::of_types(T_NUM) },
        ("inc" | "dec", [a]) if a.types & !T_PLAIN_NUMERIC == 0 => {
            let d = if op == "inc" { 1.0 } else { -1.0 };
            let shift = |b: Option<Bound>| add_bounds(b, Bound::incl(d), |x, y| x + y);
            Info { lo: shift(a.lo), hi: shift(a.hi), nan: a.nan, ..Info::of_types(T_NUM) }
        }
        ("-" | "tonumeric" | "inc" | "dec" | "~", _) => Info::of_types(T_NUM | T_BIGINT),
        ("?:", [_, a, b]) => a.join(b),
        ("&&", [a, b]) => match a.truthiness() {
            Some(true) => b.clone(),
            Some(false) => a.clone(),
            None => a.join(b),
        },
        ("||", [a, b]) => match a.truthiness() {
            Some(true) => a.clone(),
            Some(false) => b.clone(),
            None => a.join(b),
        },
        _ => Info::top(),
    }
}

/// A decision about `a` and `b` that holds of every side of either's
/// `cases`.
fn over_cases(a: &Info, b: &Info, f: &dyn Fn(&Info, &Info) -> Option<bool>) -> Option<bool> {
    if let Some(c) = &a.cases {
        let (x, y) = (over_cases(&c.1, b, f)?, over_cases(&c.2, b, f)?);
        return (x == y).then_some(x);
    }
    if let Some(c) = &b.cases {
        let (x, y) = (over_cases(a, &c.1, f)?, over_cases(a, &c.2, f)?);
        return (x == y).then_some(x);
    }
    f(a, b)
}

/// Decide `a op b` for a relational operator from the operands' infos.
pub fn decide_rel(op: Bop, a: &Info, b: &Info) -> Option<bool> {
    if a.cases.is_some() || b.cases.is_some() {
        if let Some(r) = over_cases(a, b, &|x, y| decide_rel(op, x, y)) {
            return Some(r);
        }
    }
    // (A Symbol operand throws; a comparison of two strings compares text.)
    if (a.types | b.types) & T_SYM != 0 {
        return None;
    }
    if a.types & !T_NEVER_STR != 0 && b.types & !T_NEVER_STR != 0 {
        return None;
    }
    // (`undefined` converts to NaN: every comparison with it is false.)
    let only_undef = |i: &Info| i.types == T_UNDEF;
    let lt = |x: &Info, y: &Info| -> Option<bool> {
        let ((xl, xh), (yl, yh)) = (x.interval(), y.interval());
        if let (Some(xh), Some(yl)) = (xh, yl) {
            if !x.nan && !y.nan && (xh.v.f() < yl.v.f() || (xh.v.f() == yl.v.f() && (!xh.incl || !yl.incl))) {
                return Some(true);
            }
        }
        if let (Some(xl), Some(yh)) = (xl, yh) {
            if xl.v.f() >= yh.v.f() {
                return Some(false);
            }
        }
        if only_undef(x) || only_undef(y) {
            return Some(false);
        }
        None
    };
    let le = |x: &Info, y: &Info| -> Option<bool> {
        let ((xl, xh), (yl, yh)) = (x.interval(), y.interval());
        if let (Some(xh), Some(yl)) = (xh, yl) {
            if !x.nan && !y.nan && xh.v.f() <= yl.v.f() {
                return Some(true);
            }
        }
        if let (Some(xl), Some(yh)) = (xl, yh) {
            if xl.v.f() > yh.v.f() || (xl.v.f() == yh.v.f() && (!xl.incl || !yh.incl)) {
                return Some(false);
            }
        }
        if only_undef(x) || only_undef(y) {
            return Some(false);
        }
        None
    };
    match op {
        Bop::Lt => lt(a, b),
        Bop::Gt => lt(b, a),
        Bop::Le => le(a, b),
        Bop::Ge => le(b, a),
        _ => None,
    }
}

/// JS `===` of two primitive constants.
fn const_strict_eq(a: &RExpr, b: &RExpr) -> Option<bool> {
    Some(match (a, b) {
        (RExpr::Num(x), RExpr::Num(y)) => x.f() == y.f(),
        (RExpr::Str(x), RExpr::Str(y)) => x == y,
        (RExpr::Bool(x), RExpr::Bool(y)) => x == y,
        (RExpr::BigInt(x), RExpr::BigInt(y)) => x == y,
        (RExpr::Undef, RExpr::Undef) | (RExpr::Null, RExpr::Null) => true,
        (x, y) if Info::of_const(x).is_some() && Info::of_const(y).is_some() => false,
        _ => return None,
    })
}

/// Decide `a === b` from the operands' infos.
pub fn decide_strict_eq(a: &Info, b: &Info) -> Option<bool> {
    if a.cases.is_some() || b.cases.is_some() {
        if let Some(r) = over_cases(a, b, &decide_strict_eq) {
            return Some(r);
        }
    }
    if a.types & b.types == 0 {
        return Some(false);
    }
    if let (Some(x), Some(y)) = (&a.eq, &b.eq) {
        return const_strict_eq(x, y);
    }
    if let Some(y) = &b.eq {
        if a.ne.iter().any(|c| const_strict_eq(c, y) == Some(true)) {
            return Some(false);
        }
    }
    if let Some(x) = &a.eq {
        if b.ne.iter().any(|c| const_strict_eq(c, x) == Some(true)) {
            return Some(false);
        }
    }
    if a.types == T_NUM && b.types == T_NUM {
        if let (Some(ah), Some(bl)) = (a.hi, b.lo) {
            if ah.v.f() < bl.v.f() || (ah.v.f() == bl.v.f() && (!ah.incl || !bl.incl)) {
                return Some(false);
            }
        }
        if let (Some(bh), Some(al)) = (b.hi, a.lo) {
            if bh.v.f() < al.v.f() || (bh.v.f() == al.v.f() && (!bh.incl || !al.incl)) {
                return Some(false);
            }
        }
        let point = |i: &Info| match (i.lo, i.hi) {
            (Some(l), Some(h)) if l.incl && h.incl && l.v.f() == h.v.f() && !i.nan => Some(l.v.f()),
            _ => None,
        };
        if let (Some(x), Some(y)) = (point(a), point(b)) {
            return Some(x == y);
        }
    }
    None
}

/// Decide `a == null` (and `a == undefined`) from `a`'s info. (An object is
/// never loosely equal to null here: the one exotic exception,
/// `document.all`, does not exist outside a browser.)
pub fn decide_nullish(a: &Info) -> Option<bool> {
    if let Some(c) = &a.cases {
        if let (Some(x), Some(y)) = (decide_nullish(&c.1), decide_nullish(&c.2)) {
            if x == y {
                return Some(x);
            }
        }
    }
    if a.types & !(T_UNDEF | T_NULL) == 0 {
        Some(true)
    } else if a.types & (T_UNDEF | T_NULL) == 0 {
        Some(false)
    } else {
        None
    }
}

impl Info {
    /// Whether this info's `cases` name variable `v` (they describe its
    /// value at the time: once `v` is assigned they no longer hold).
    pub fn mentions(&self, v: usize) -> bool {
        let expression = |e: &RExpr| {
            let mut vars = Vec::new();
            crate::coalesce::rexpr_vars(e, &mut vars);
            vars.contains(&v)
        };
        let known = |value: &KnownVal| {
            let mut vars = Vec::new();
            value.vars(&mut vars);
            vars.contains(&v)
        };
        // (What it equals or not, its frozen and known properties, and what
        // it knows of a function, as much as its cases.)
        self.eq.iter().chain(self.ne.iter()).any(&expression)
            || self.fixed.iter().any(|(_, e)| expression(e))
            || self.props.iter().any(|(_, i)| i.mentions(v))
            || self.cases.as_ref().is_some_and(|c| expression(&c.0) || c.1.mentions(v) || c.2.mentions(v))
            || self.callee.as_ref().is_some_and(|f| {
                f.caps.iter().any(|c| known(&c.value))
                    || f.methods.iter().any(|(_, m)| known(m))
                    || f.statics.iter().any(|(_, m)| known(m))
                    || f.object.parent.as_ref().is_some_and(&expression)
                    || f.object.props.iter().any(|(_, p)| match p {
                        Some(FnObjectValue::Prim(e)) => expression(e),
                        Some(FnObjectValue::Record(fields)) => fields.iter().any(|(_, e)| expression(e)),
                        None => false,
                    })
            })
    }

    /// Every variable this names (its cases' conditions, constants, known
    /// and frozen properties, and what it knows of a function: captures,
    /// methods, statics, parent).
    pub fn vars(&self, out: &mut Vec<usize>) {
        let e = |x: &RExpr, out: &mut Vec<usize>| crate::coalesce::rexpr_vars(x, out);
        if let Some(x) = &self.eq {
            e(x, out);
        }
        self.ne.iter().for_each(|x| e(x, out));
        for (_, x) in &self.fixed {
            e(x, out);
        }
        if let Some(c) = &self.cases {
            e(&c.0, out);
        }
        if let Some(kf) = &self.callee {
            let known = kf.caps.iter().map(|c| &c.value).chain(kf.methods.iter().map(|(_, m)| m)).chain(kf.statics.iter().map(|(_, m)| m));
            for k in known {
                k.vars(out);
            }
            if let Some(p) = &kf.object.parent {
                e(p, out);
            }
        }
        if let Some(c) = &self.cases {
            c.1.vars(out);
            c.2.vars(out);
        }
        for (_, pi) in &self.props {
            pi.vars(out);
        }
    }

    /// This with each variable `v` it names replaced by `f(v)`.
    pub fn renamed(&self, f: &dyn Fn(usize) -> usize) -> Info {
        let r = |x: &RExpr| crate::inline::rename_vars(x, f);
        let rk = |k: &KnownVal| k.renamed(f);
        let mut i = self.clone();
        i.eq = self.eq.as_ref().map(r);
        i.ne = self.ne.iter().map(r).collect();
        i.fixed = self.fixed.iter().map(|(k, x)| (k.clone(), r(x))).collect();
        i.cases = self.cases.as_ref().map(|c| Box::new((r(&c.0), c.1.renamed(f), c.2.renamed(f))));
        i.props = self.props.iter().map(|(k, pi)| (k.clone(), pi.renamed(f))).collect();
        i.callee = self.callee.as_ref().map(|kf| {
            let mut k = (**kf).clone();
            k.caps = kf.caps.iter().map(|c| KnownCap { cell: c.cell, value: rk(&c.value) }).collect();
            k.methods = kf.methods.iter().map(|(n, m)| (n.clone(), rk(m))).collect();
            k.statics = kf.statics.iter().map(|(n, m)| (n.clone(), rk(m))).collect();
            k.object.parent = kf.object.parent.as_ref().map(r);
            std::rc::Rc::new(k)
        });
        i
    }

    /// The variables the values of the object's known and frozen
    /// properties name (a property known to hold a residual binding's
    /// value: see `Js::object_assign_info`).
    pub fn property_vars(&self, out: &mut Vec<usize>) {
        for (_, e) in &self.fixed {
            crate::coalesce::rexpr_vars(e, out);
        }
        for (_, pi) in &self.props {
            if let Some(e) = &pi.eq {
                crate::coalesce::rexpr_vars(e, out);
            }
            pi.property_vars(out);
        }
    }
}

/// The facts a path keeps (variable -> info).
pub type Facts = im::OrdMap<usize, Info>;

fn refine(facts: &mut Facts, v: usize, f: impl FnOnce(&mut Info)) {
    let mut i = facts.get(&v).cloned().unwrap_or_else(Info::top);
    f(&mut i);
    if i.is_top() {
        facts.remove(&v);
    } else {
        facts.insert(v, i);
    }
}

/// Record that `cond` evaluated to a value of truthiness `truth`.
pub fn learn(facts: &mut Facts, cond: &RExpr, truth: bool, typed_fns: &[&str]) {
    match cond {
        RExpr::Var(v) => refine(facts, *v, |i| {
            i.truthy = Some(truth);
            if truth {
                i.types &= !(T_UNDEF | T_NULL);
            } else {
                i.types &= !(T_OBJ | T_FUNC | T_SYM);
            }
        }),
        RExpr::Opaque(op, xs) => match (op.as_str(), xs.as_slice()) {
            ("!", [e]) => learn(facts, e, !truth, typed_fns),
            ("&&", [a, b]) if truth => {
                learn(facts, a, true, typed_fns);
                learn(facts, b, true, typed_fns);
            }
            ("||", [a, b]) if !truth => {
                learn(facts, a, false, typed_fns);
                learn(facts, b, false, typed_fns);
            }
            ("==" | "!=", [a, b]) => {
                let nullish = (op == "==") == truth;
                let var = match (a, b) {
                    (RExpr::Var(v), RExpr::Null | RExpr::Undef) | (RExpr::Null | RExpr::Undef, RExpr::Var(v)) => Some(*v),
                    _ => None,
                };
                if let Some(v) = var {
                    refine(facts, v, |i| {
                        if nullish {
                            i.types &= T_UNDEF | T_NULL;
                        } else {
                            i.types &= !(T_UNDEF | T_NULL);
                        }
                    });
                }
            }
            // `c ? x : y` with one arm truthy and the other falsy: as `c`.
            ("?:", [c, x, y]) => {
                let t = |e: &RExpr| Info::of_const(e).and_then(|i| i.truthy);
                match (t(x), t(y)) {
                    (Some(a), Some(b)) if a != b => learn(facts, c, if a { truth } else { !truth }, typed_fns),
                    _ => {}
                }
            }
            ("instanceof", [RExpr::Var(v), _]) if truth => refine(facts, *v, |i| {
                i.types &= T_OBJ | T_FUNC;
                i.truthy = Some(true);
            }),
            ("in", [_, RExpr::Var(v)]) => refine(facts, *v, |i| {
                i.types &= T_OBJ | T_FUNC;
                i.truthy = Some(true);
            }),
            _ => {}
        },
        RExpr::Bin(op @ (Bop::Eq | Bop::Ne), a, b) => {
            let equal = (*op == Bop::Eq) == truth;
            // `typeof v === "name"`.
            let typeof_test = match (&**a, &**b) {
                (RExpr::Opaque(t, x), RExpr::Str(n)) | (RExpr::Str(n), RExpr::Opaque(t, x)) if t == "typeof" => match x.as_slice() {
                    [RExpr::Var(v)] => typeof_mask(n).map(|m| (*v, m)),
                    _ => None,
                },
                _ => None,
            };
            if let Some((v, mask)) = typeof_test {
                refine(facts, v, |i| {
                    if equal {
                        i.types &= mask;
                    } else {
                        i.types &= !mask;
                    }
                });
                return;
            }
            let var_const = match (&**a, &**b) {
                (RExpr::Var(v), c) | (c, RExpr::Var(v)) if Info::of_const(c).is_some() => Some((*v, c.clone())),
                _ => None,
            };
            if let Some((v, c)) = var_const {
                if matches!(&c, RExpr::Num(n) if n.f().is_nan()) {
                    return;
                }
                let ci = Info::of_const(&c).unwrap();
                refine(facts, v, |i| {
                    if equal {
                        // (Only the constant's own facts, but not its numeric
                        // point for a zero: -0 === 0.)
                        i.types &= ci.types;
                        i.truthy = ci.truthy;
                        i.eq = Some(c.clone());
                        if ci.types == T_NUM || ci.types == T_BOOL || ci.types == T_NULL {
                            i.lo = tighter_lo(i.lo, ci.lo);
                            i.hi = tighter_hi(i.hi, ci.hi);
                            i.nan = false;
                        }
                    } else {
                        match &c {
                            RExpr::Undef => i.types &= !T_UNDEF,
                            RExpr::Null => i.types &= !T_NULL,
                            _ => {
                                if !i.ne.contains(&c) {
                                    i.ne.push(c.clone());
                                }
                            }
                        }
                    }
                });
            }
        }
        RExpr::Bin(op @ (Bop::Lt | Bop::Le | Bop::Gt | Bop::Ge), a, b) => {
            // Normalize to `x < y` or `x <= y`.
            let (x, y, strict) = match op {
                Bop::Lt => (&**a, &**b, true),
                Bop::Le => (&**a, &**b, false),
                Bop::Gt => (&**b, &**a, true),
                _ => (&**b, &**a, false),
            };
            let lookup = |v: usize| facts.get(&v).cloned();
            let (ix, iy) = (info_of(x, &lookup, typed_fns), info_of(y, &lookup, typed_fns));
            // (Only a numeric comparison bounds ToNumeric.)
            let numeric = ix.types & !T_NEVER_STR == 0 || iy.types & !T_NEVER_STR == 0;
            // The comparison ran without throwing: neither is a Symbol.
            for e in [x, y] {
                if let RExpr::Var(v) = e {
                    refine(facts, *v, |i| i.types &= !T_SYM);
                }
            }
            if !numeric {
                return;
            }
            // `x < y` (strict) or `x <= y` holds when `truth`; otherwise (not
            // NaN) `x >= y` / `x > y`.
            if truth {
                if let RExpr::Var(v) = x {
                    let hi = iy.hi.map(|b| Bound { v: b.v, incl: b.incl && !strict });
                    refine(facts, *v, |i| {
                        i.hi = tighter_hi(i.hi, hi);
                        i.nan = false;
                    });
                }
                if let RExpr::Var(v) = y {
                    let lo = ix.lo.map(|b| Bound { v: b.v, incl: b.incl && !strict });
                    refine(facts, *v, |i| {
                        i.lo = tighter_lo(i.lo, lo);
                        i.nan = false;
                    });
                }
            } else {
                if let RExpr::Var(v) = x {
                    let lo = iy.lo.map(|b| Bound { v: b.v, incl: b.incl && strict });
                    refine(facts, *v, |i| i.lo = tighter_lo(i.lo, lo));
                }
                if let RExpr::Var(v) = y {
                    let hi = ix.hi.map(|b| Bound { v: b.v, incl: b.incl && strict });
                    refine(facts, *v, |i| i.hi = tighter_hi(i.hi, hi));
                }
            }
        }
        _ => {}
    }
}

/// The facts both paths share, weakened to hold on either (`widen` at a
/// loop head).
pub fn merge(a: &Facts, b: &Facts, widen: bool) -> Facts {
    let mut out = Facts::new();
    for (v, ia) in a.iter() {
        if let Some(ib) = b.get(v) {
            let m = if widen { ia.widen(ib) } else { ia.join(ib) };
            if !m.is_top() {
                out.insert(*v, m);
            }
        }
    }
    out
}
