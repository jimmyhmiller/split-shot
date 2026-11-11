//! Why a residual program holds what it holds.
//!
//! The specializer decides, operation by operation, whether to run it now
//! or leave it to the residual. This module accounts for what it left: each
//! unit of residual work (a call, a read, an operator, a write, a branch, an
//! allocation) is traced back, through the values it operates on, to the
//! *root causes* those values are runtime values for. The causes are a closed
//! set, in three classes:
//!
//! - **needed**: the work depends on what only the run knows: the input, a
//!   host value (a global that is no standard built-in), a caller's arguments,
//!   an exception, a clock or random number;
//! - **merged**: a *known* value became a runtime variable where the
//!   specializer followed several paths as one (a loop under runtime control,
//!   the arms of a runtime branch), though every path gave it that one value;
//!   or a function was kept as one residual function for all its calls. The
//!   value was known and the merge gave it up. (A variable the paths do
//!   assign different values, a loop's counter or what a branch chose, is
//!   the run's: its cause is `carried`, needed.);
//! - **gap**: nothing the run alone knows is involved. A standard built-in
//!   called on known values that no model folds, an operator on known
//!   operands left in place, an object handed to a built-in whose effects on
//!   it are not known, a built-in the program replaces, a limit reached.
//!
//! A unit's class is the worst class among its causes (gap, then merged, then
//! needed). A unit that operates on known values only is *static*: work
//! left to the runtime that the specializer could have done, a gap by
//! definition. It is its own cause (`unmodeled-builtin` for a standard
//! built-in's call, `static-work` for any other operation), and what is
//! computed from its result is charged to it, not counted as static again.
//!
//! What specialization records for this (`Ledger`) is small: where each
//! merged or materialized variable was made, and why a call was kept as a
//! call of a residual function. Everything else is read off the cleaned-up
//! residual and the purpose every residual variable already has (`VarKey`).
//! Recording changes no decision.
//!
//! The analysis is flow-insensitive (a variable's causes are those of every
//! value it is assigned) and field-insensitive (an object's causes are those
//! of everything stored in it). It over-attributes in places; it never
//! invents a cause that is not in the program.

use super::*;
use std::cell::{Cell, RefCell};
use std::collections::{BTreeMap, BTreeSet, HashSet};

/// The merge of paths a variable was made by (see `Js::materialize`).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub(super) enum Merge {
    /// A loop whose control is a runtime value.
    LoopControl,
    /// A loop whose control is known but whose data grew without settling
    /// (`Js::loop_diverges`): the termination heuristic, not runtime control.
    LoopGrowth,
    /// The arms of a runtime branch meeting again.
    Join,
    /// An object an arm of a runtime branch writes, before the branch.
    BranchWrite,
    /// The end of a residual `try`'s body or handler.
    TryEnd,
    /// A whole activation made runtime state.
    Whole,
}

/// Why a call of a known function was kept as a call of a residual function.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub(super) enum Kept {
    Async,
    /// A generator or derived constructor with a `try`.
    Try,
    /// Deeper than the inliner goes (`MAX_DEPTH`).
    Depth,
    /// Its static context was already inlined once under runtime control.
    SharedContext,
    /// A recursive function called with every argument a runtime value.
    DynamicArgs,
    /// A recursive call under runtime control that makes no static progress.
    StalledRecursion,
}

/// Where a residual variable was made.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub(super) struct Site {
    pub pc: usize,
    pub func: usize,
    /// The merge it was made by; `None`: an object flowing into runtime code.
    pub merge: Option<Merge>,
}

/// What specialization records for the report.
#[derive(Default)]
pub(super) struct Ledger {
    merge: Cell<Option<Merge>>,
    vars: RefCell<HashMap<usize, Vec<Site>>>,
    calls: RefCell<HashMap<usize, Kept>>,
    /// Per pc: the standard built-in a residual call there calls.
    builtins: RefCell<HashMap<usize, String>>,
}

/// While it lives, variables made are made by its merge.
pub(super) struct Merging<'a>(&'a Ledger, Option<Merge>);

impl Drop for Merging<'_> {
    fn drop(&mut self) {
        self.0.merge.set(self.1);
    }
}

impl Ledger {
    pub(super) fn reset(&self) {
        self.vars.borrow_mut().clear();
        self.calls.borrow_mut().clear();
        self.builtins.borrow_mut().clear();
    }

    pub(super) fn merging(&self, m: Merge) -> Merging<'_> {
        Merging(self, self.merge.replace(Some(m)))
    }

    /// Residual variable `var` was made at `pc` of `func`.
    pub(super) fn made(&self, var: usize, pc: usize, func: usize) {
        let site = Site { pc, func, merge: self.merge.get() };
        let mut vars = self.vars.borrow_mut();
        let sites = vars.entry(var).or_default();
        if sites.len() < 8 && !sites.contains(&site) {
            sites.push(site);
        }
    }

    /// The residual gets `expr` at `pc`: a call of a standard built-in, when
    /// it is one (an object that flows into runtime code at that pc flows
    /// into that call).
    pub(super) fn emitted(&self, pc: usize, expr: &RExpr) {
        if let RExpr::Call(c, _) | RExpr::New(c, _) = expr {
            if let Some(name) = builtin_callee(c) {
                self.builtins.borrow_mut().insert(pc, name);
            }
        }
    }

    /// The call at `pc` was kept as a call of a residual function.
    pub(super) fn kept(&self, pc: usize, why: Kept) {
        self.calls.borrow_mut().insert(pc, why);
    }
}

/// How bad a cause is for a unit it reaches.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum Class {
    Needed,
    Merged,
    Gap,
}

impl Class {
    pub fn name(self) -> &'static str {
        match self {
            Class::Needed => "needed",
            Class::Merged => "merged",
            Class::Gap => "gap",
        }
    }
}

/// A root cause.
#[derive(Clone, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
enum Root {
    Input,
    /// A global that is no standard built-in (`require`, `process`, ...).
    Host(String),
    /// The arguments or receiver of a function runtime code calls.
    Caller,
    Exception,
    /// A built-in whose answer the run decides (`Date.now`, `Math.random`).
    Impure(String),
    /// State a script's top-level code made that a call of the entry changes.
    CallState,
    /// A function kept as its source (see `Expr::Verbatim`).
    Verbatim,
    /// A variable the merged paths assign different values.
    Carried,
    Merge(Merge, String),
    KeptFn(Kept, String),
    /// A standard built-in called on known values, not folded.
    StaticCall(String),
    /// Any other operation on known values left in place (an operator, a
    /// read, a call of a known value), by what it is.
    StaticOp(String),
    /// An object the residual makes that nothing uses.
    DeadAlloc,
    /// An object given to a standard built-in whose effects on it are not known.
    PassedToBuiltin(String),
    /// A built-in the program replaces.
    Unpristine(String),
}

impl Root {
    fn class(&self) -> Class {
        match self {
            Root::Input | Root::Host(_) | Root::Caller | Root::Exception | Root::Impure(_) | Root::CallState | Root::Verbatim | Root::Carried => Class::Needed,
            Root::Merge(Merge::LoopGrowth, _) | Root::KeptFn(Kept::Depth, _) => Class::Gap,
            Root::Merge(..) | Root::KeptFn(..) => Class::Merged,
            Root::StaticCall(_) | Root::StaticOp(_) | Root::DeadAlloc | Root::PassedToBuiltin(_) | Root::Unpristine(_) => Class::Gap,
        }
    }

    fn kind(&self) -> &'static str {
        match self {
            Root::Input => "input",
            Root::Host(_) => "host",
            Root::Caller => "caller",
            Root::Exception => "exception",
            Root::Impure(_) => "impure-builtin",
            Root::CallState => "call-state",
            Root::Verbatim => "verbatim-source",
            Root::Carried => "carried",
            Root::Merge(Merge::LoopControl, _) => "merge-loop",
            Root::Merge(Merge::LoopGrowth, _) => "limit-loop-growth",
            Root::Merge(Merge::Join, _) => "merge-join",
            Root::Merge(Merge::BranchWrite, _) => "merge-branch-write",
            Root::Merge(Merge::TryEnd, _) => "merge-try",
            Root::Merge(Merge::Whole, _) => "merge-activation",
            Root::KeptFn(Kept::Async, _) => "kept-async",
            Root::KeptFn(Kept::Try, _) => "kept-try",
            Root::KeptFn(Kept::Depth, _) => "limit-depth",
            Root::KeptFn(Kept::SharedContext, _) => "kept-shared-context",
            Root::KeptFn(Kept::DynamicArgs, _) => "kept-recursion-dynamic-args",
            Root::KeptFn(Kept::StalledRecursion, _) => "kept-recursion-stalled",
            Root::StaticCall(_) => "unmodeled-builtin",
            Root::StaticOp(_) => "static-work",
            Root::DeadAlloc => "dead-allocation",
            Root::PassedToBuiltin(_) => "builtin-effects-unknown",
            Root::Unpristine(_) => "builtin-replaced",
        }
    }

    fn what(&self) -> String {
        match self {
            Root::Host(s)
            | Root::Impure(s)
            | Root::Merge(_, s)
            | Root::KeptFn(_, s)
            | Root::StaticCall(s)
            | Root::StaticOp(s)
            | Root::PassedToBuiltin(s)
            | Root::Unpristine(s) => s.clone(),
            _ => String::new(),
        }
    }
}

/// One unit of residual work.
#[derive(Clone, Debug)]
pub struct Unit {
    /// `load`, `main` or a residual function's name.
    pub section: String,
    /// `call`, `new`, `read`, `op`, `write`, `branch`, `alloc`, `throw`, `suspend`.
    pub kind: &'static str,
    /// The residual expression (before variables are renamed), shortened.
    pub text: String,
    pub class: Class,
    /// It operates on known values only.
    pub is_static: bool,
    /// Indexes into `Report::causes`.
    pub causes: Vec<usize>,
}

/// A root cause, and how much of the residual it reaches.
#[derive(Clone, Debug)]
pub struct Cause {
    pub class: Class,
    pub kind: &'static str,
    pub what: String,
    /// Units it reaches.
    pub units: usize,
    /// Units it alone keeps from being needed work (no other merged or gap
    /// cause reaches them).
    pub sole: usize,
}

#[derive(Clone, Debug, Default)]
pub struct Report {
    pub units: Vec<Unit>,
    pub causes: Vec<Cause>,
}

impl Report {
    /// Units of `class` (all sections, or one).
    pub fn count(&self, class: Class, section: Option<&str>) -> usize {
        self.units.iter().filter(|u| u.class == class && section.is_none_or(|s| u.section == s)).count()
    }

    pub fn sections(&self) -> Vec<String> {
        let mut seen = Vec::new();
        for u in &self.units {
            if !seen.contains(&u.section) {
                seen.push(u.section.clone());
            }
        }
        seen
    }

    /// The report as text: totals, then the merged and gap causes by reach,
    /// then the static units.
    pub fn render(&self, max_rows: usize) -> String {
        use std::fmt::Write;
        let mut o = String::new();
        let total = self.units.len();
        let _ = writeln!(
            o,
            "residual work: {total} unit(s): {} needed, {} merged, {} gap",
            self.count(Class::Needed, None),
            self.count(Class::Merged, None),
            self.count(Class::Gap, None)
        );
        for s in self.sections() {
            let n = self.units.iter().filter(|u| u.section == s).count();
            let _ = writeln!(
                o,
                "  {s}: {n} ({} needed, {} merged, {} gap)",
                self.count(Class::Needed, Some(&s)),
                self.count(Class::Merged, Some(&s)),
                self.count(Class::Gap, Some(&s))
            );
        }
        let mut order: Vec<usize> = (0..self.causes.len()).filter(|&i| self.causes[i].class != Class::Needed && self.causes[i].units > 0).collect();
        order.sort_by_key(|&i| (std::cmp::Reverse(self.causes[i].class), std::cmp::Reverse(self.causes[i].units)));
        if !order.is_empty() {
            let _ = writeln!(o, "causes (units reached / units it alone holds back):");
        }
        for &i in order.iter().take(max_rows) {
            let c = &self.causes[i];
            let _ = writeln!(o, "  {:<6} {:<28} {:>5} / {:<5} {}", c.class.name(), c.kind, c.units, c.sole, c.what);
        }
        if order.len() > max_rows {
            let _ = writeln!(o, "  ... {} more", order.len() - max_rows);
        }
        let mut statics: BTreeMap<(String, &'static str, String), usize> = BTreeMap::new();
        for u in self.units.iter().filter(|u| u.is_static) {
            *statics.entry((u.section.clone(), u.kind, u.text.clone())).or_default() += 1;
        }
        if !statics.is_empty() {
            let _ = writeln!(o, "static work left to the runtime (known operands):");
            let mut rows: Vec<_> = statics.into_iter().collect();
            rows.sort_by_key(|(_, n)| std::cmp::Reverse(*n));
            let more = rows.len().saturating_sub(max_rows);
            for ((section, kind, text), n) in rows.into_iter().take(max_rows) {
                let _ = writeln!(o, "  {n:>4}x {kind:<6} in {section}: {text}");
            }
            if more > 0 {
                let _ = writeln!(o, "  ... {more} more");
            }
        }
        o
    }
}

type Roots = BTreeSet<u32>;

/// What a residual call calls.
enum Callee {
    /// A standard built-in, by its dotted name (a method of a known
    /// primitive: `String.prototype.startsWith`).
    Builtin(String),
    Host(String),
    Residual(usize),
    /// A runtime value.
    Value,
}

fn is_builtin_global(g: &str) -> bool {
    crate::pristine::BUILTIN_GLOBALS.contains(&g) || matches!(g, "globalThis" | "__pe_constructorPrototype")
}

/// The dotted name of a chain of static reads from a global, and the global.
fn global_chain(e: &RExpr) -> Option<(String, String)> {
    match e {
        RExpr::Global(g) => Some((g.clone(), g.clone())),
        RExpr::Get(o, k) => global_chain(o).map(|(root, path)| (root, format!("{path}.{k}"))),
        _ => None,
    }
}

fn is_const(e: &RExpr) -> bool {
    matches!(e, RExpr::Num(_) | RExpr::Str(_) | RExpr::Bool(_) | RExpr::Undef | RExpr::Null | RExpr::BigInt(_))
}

/// The standard built-in `c` is, as a callee: one read by name from a
/// standard global, or a method of a known primitive.
fn builtin_callee(c: &RExpr) -> Option<String> {
    match c {
        RExpr::Opaque(op, xs) if op == "," && xs.len() == 2 => builtin_callee(&xs[1]),
        RExpr::BoundMethod { func, .. } => builtin_callee(func),
        RExpr::Get(o, k) if is_const(o) => {
            let ty = match &**o {
                RExpr::Str(_) => "String",
                RExpr::Num(_) => "Number",
                RExpr::Bool(_) => "Boolean",
                RExpr::BigInt(_) => "BigInt",
                _ => return None,
            };
            Some(format!("{ty}.prototype.{k}"))
        }
        _ => global_chain(c).filter(|(root, _)| is_builtin_global(root)).map(|(_, path)| path),
    }
}

/// Does evaluating `e` make a value with an identity of its own: an object
/// (`makes_object`), or a fresh symbol?
fn allocates(e: &RExpr) -> bool {
    makes_object(e) || matches!(e, RExpr::Call(c, _) if builtin_callee(c).as_deref() == Some("Symbol"))
}

/// What a unit of work is, for the cause a static one is: an operator by
/// its token, a read by its property, a call by its method.
fn work_label(e: &RExpr) -> String {
    match e {
        RExpr::Bin(op, ..) => format!("`{}`", op.sym()),
        RExpr::Opaque(op, _) => format!("`{op}`"),
        RExpr::Get(_, k) => format!("read .{k}"),
        RExpr::Index(..) => "read [...]".to_string(),
        RExpr::Call(c, _) => match &**c {
            RExpr::Get(_, m) => format!("call .{m}()"),
            RExpr::BoundMethod { .. } => "call of a method value".to_string(),
            _ => "call of a known value".to_string(),
        },
        RExpr::New(..) => "new".to_string(),
        RExpr::Yield(_) | RExpr::Await(_) => "suspend".to_string(),
        RExpr::Delete(_) => "delete".to_string(),
        _ => "expression".to_string(),
    }
}

/// Built-ins whose answer is the run's.
fn impure_builtin(name: &str, nargs: usize, new: bool) -> bool {
    match name {
        "Date.now" | "Math.random" | "performance.now" => true,
        "Date" => !new || nargs == 0,
        _ => name.starts_with("console.") || name.starts_with("Atomics.") || name.starts_with("Intl."),
    }
}

struct Analysis<'a> {
    js: &'a Js,
    fns: &'a [ResidualFn],
    roots: Vec<Root>,
    ids: HashMap<Root, u32>,
    var: HashMap<usize, Roots>,
    global: HashMap<String, Roots>,
    /// Per residual function: what its `return`s return.
    ret: Vec<Roots>,
    /// Globals the residual assigns (a script's own).
    own_globals: HashSet<String>,
    /// Variables assigned the result of work on known operands (set between
    /// the passes): what they hold is that work's to answer for.
    static_defs: HashMap<usize, Root>,
    /// A residual function's parameter and a variable holding an object it
    /// is given: what the function stores through the parameter reaches the
    /// variable.
    aliases: HashSet<(usize, usize)>,
    /// The variables some expression reads.
    used: HashSet<usize>,
    sites: HashMap<usize, Vec<Site>>,
    kept: HashMap<usize, Kept>,
    builtins: HashMap<usize, String>,
    /// Merged variables the paths assign different values, or a value that
    /// is the run's anyway (set after the first pass).
    varies: HashSet<usize>,
    changed: bool,
}

impl<'a> Analysis<'a> {
    fn id(&mut self, r: Root) -> u32 {
        if let Some(&i) = self.ids.get(&r) {
            return i;
        }
        let i = self.roots.len() as u32;
        self.roots.push(r.clone());
        self.ids.insert(r, i);
        i
    }

    fn one(&mut self, r: Root) -> Roots {
        let mut s = Roots::new();
        s.insert(self.id(r));
        s
    }

    fn add_var(&mut self, v: usize, rs: &Roots) {
        if rs.is_empty() {
            return;
        }
        let e = self.var.entry(v).or_default();
        let n = e.len();
        e.extend(rs.iter().copied());
        self.changed |= e.len() != n;
    }

    fn fn_name(&self, func: usize) -> &str {
        match self.js.names[func].as_str() {
            "" => "an anonymous function",
            n => n,
        }
    }

    fn slot_name(&self, func: usize, slot: usize) -> String {
        match self.js.slot_names.get(func).and_then(|n| n.get(slot)) {
            Some(n) if !n.is_empty() => n.clone(),
            _ => format!("slot {slot}"),
        }
    }

    /// The function `pc` lies in.
    fn fn_of_pc(&self, pc: usize) -> usize {
        let mut best = 0;
        for (f, &e) in self.js.entries.iter().enumerate() {
            if e <= pc && e >= self.js.entries[best] {
                best = f;
            }
        }
        best
    }

    /// What a variable is of itself (its purpose), besides what it is assigned.
    fn var_own(&mut self, v: usize) -> Roots {
        if v == self.js.input_var() {
            return self.one(Root::Input);
        }
        if v == ARGUMENTS_VAR_ID {
            return self.one(Root::Caller);
        }
        let key = self.js.var_ids.borrow().keys.get(&v).cloned();
        let mut out = Roots::new();
        match key {
            Some(VarKey::Exc(_)) => out.insert(self.id(Root::Exception)),
            // (A residual function's `arguments`; a root's own value.)
            Some(VarKey::Residual(2 | 3, _, _)) => out.insert(self.id(Root::Caller)),
            _ => false,
        };
        let what = match &key {
            Some(VarKey::Stable(func, slot)) => Some(format!("`{}` in {}", self.slot_name(*func, *slot), self.fn_name(*func))),
            Some(VarKey::HeapField(cpc, _, idx)) => {
                let f = self.fn_of_pc(*cpc);
                Some(format!("field {idx} of an object made in {}", self.fn_name(f)))
            }
            _ => None,
        };
        if let Some(sites) = self.sites.get(&v).cloned() {
            for s in sites {
                match s.merge {
                    Some(_) if self.varies.contains(&v) => {
                        out.insert(self.id(Root::Carried));
                    }
                    Some(m) => {
                        let what = what.clone().unwrap_or_else(|| format!("an object in {}", self.fn_name(s.func)));
                        let id = self.id(Root::Merge(m, what));
                        out.insert(id);
                    }
                    // An object that flowed into runtime code. Into a call of
                    // a standard built-in: that the built-in leaves it alone
                    // is what a model of the built-in would say. Anywhere
                    // else, its consumers' roots reach it as they use it.
                    None => {
                        if let Some(name) = self.builtins.get(&s.pc).cloned() {
                            let id = self.id(Root::PassedToBuiltin(name));
                            out.insert(id);
                        }
                    }
                }
            }
        }
        if let Some(root) = self.static_defs.get(&v).cloned() {
            let id = self.id(root);
            out.insert(id);
        }
        out
    }

    fn var_roots(&mut self, v: usize) -> Roots {
        let mut out = self.var_own(v);
        if let Some(rs) = self.var.get(&v) {
            out.extend(rs.iter().copied());
        }
        out
    }

    fn callee(&self, c: &RExpr) -> Callee {
        if let Some(name) = builtin_callee(c) {
            return Callee::Builtin(name);
        }
        match c {
            RExpr::FnRef { rfid, .. } | RExpr::NewFn { rfid } => Callee::Residual(*rfid),
            RExpr::Opaque(op, xs) if op == "," && xs.len() == 2 => self.callee(&xs[1]),
            RExpr::BoundMethod { func, .. } => self.callee(func),
            RExpr::Get(o, k) if matches!(&**o, RExpr::FnRef { .. }) && matches!(k.as_str(), "call" | "apply" | "bind") => {
                let RExpr::FnRef { rfid, .. } = &**o else { unreachable!() };
                Callee::Residual(*rfid)
            }
            _ => match global_chain(c) {
                Some((root, path)) if !self.own_globals.contains(&root) => Callee::Host(path),
                _ => Callee::Value,
            },
        }
    }

    /// The roots of `e`'s value. `dst`: the variable it is evaluated into.
    fn expr(&mut self, e: &RExpr, dst: Option<usize>) -> Roots {
        match e {
            RExpr::Num(_) | RExpr::Str(_) | RExpr::Bool(_) | RExpr::Undef | RExpr::Null | RExpr::BigInt(_) | RExpr::Hole | RExpr::RegexLit(..) => Roots::new(),
            RExpr::This => self.one(Root::Caller),
            RExpr::Var(v) => self.var_roots(*v),
            RExpr::Global(g) => self.global_roots(g),
            RExpr::Bin(_, a, b) | RExpr::Index(a, b) => {
                let mut r = self.expr(a, None);
                r.extend(self.expr(b, None));
                r
            }
            RExpr::Get(o, _) | RExpr::Delete(o) | RExpr::OwnMember { obj: o, .. } => self.expr(o, None),
            // (What a suspended function is resumed with is its caller's.)
            RExpr::Yield(o) | RExpr::Await(o) => {
                let mut r = self.expr(o, None);
                r.insert(self.id(Root::Caller));
                r
            }
            RExpr::Opaque(_, xs) | RExpr::ArrayLit(xs) => self.all(xs),
            RExpr::ObjectLit(fs) => {
                let mut r = Roots::new();
                for (_, x) in fs {
                    r.extend(self.expr(x, None));
                }
                r
            }
            RExpr::FnRef { rfid, caps } => {
                let r = self.all(caps);
                self.bind(*rfid, caps, &[], true);
                r
            }
            RExpr::NewFn { rfid } => {
                self.bind(*rfid, &[], &[], true);
                Roots::new()
            }
            RExpr::BoundMethod { func, recv } => {
                let mut r = self.expr(func, None);
                r.extend(self.expr(recv, None));
                r
            }
            RExpr::Verbatim(..) => self.one(Root::Verbatim),
            RExpr::ClassSrc { parent, caps, .. } => {
                let mut r = self.all(caps);
                if let Some(p) = parent {
                    r.extend(self.expr(p, None));
                }
                r.insert(self.id(Root::Verbatim));
                r
            }
            RExpr::Call(c, args) | RExpr::New(c, args) => self.call(c, args, dst, matches!(e, RExpr::New(..))),
        }
    }

    fn all(&mut self, xs: &[RExpr]) -> Roots {
        let mut r = Roots::new();
        for x in xs {
            r.extend(self.expr(x, None));
        }
        r
    }

    fn global_roots(&mut self, g: &str) -> Roots {
        if self.own_globals.contains(g) {
            return self.global.get(g).cloned().unwrap_or_default();
        }
        if is_builtin_global(g) {
            let replaced = crate::pristine::tracked(g) && (self.js.all_unpristine.get() || self.js.unpristine.borrow().contains(g));
            return if replaced { self.one(Root::Unpristine(g.to_string())) } else { Roots::new() };
        }
        self.one(Root::Host(g.to_string()))
    }

    /// Residual function `rfid` is given `caps` then `args` (`value`: it is
    /// made a value, which runtime code may call with anything).
    fn bind(&mut self, rfid: usize, caps: &[RExpr], args: &[RExpr], value: bool) {
        let Some(rf) = self.fns.get(rfid) else { return };
        let (ncap, params, args_var) = (rf.ncaptured, rf.param_vars.clone(), rf.args_var);
        let given: Vec<&RExpr> = caps.iter().chain(args.iter()).collect();
        let mut k = 0;
        for (i, x) in given.iter().enumerate() {
            // (After the captures, the arguments object of a function that
            // reads it, then the parameters.)
            let target = if i < ncap {
                params.get(i).copied()
            } else if args_var.is_some() && i == ncap && !value {
                args_var
            } else {
                let j = i - usize::from(args_var.is_some() && !value);
                params.get(j).copied()
            };
            let r = self.expr(x, None);
            if let Some(t) = target {
                self.add_var(t, &r);
                if let RExpr::Var(v) = x {
                    if self.js.why_is_object_var(*v) {
                        self.aliases.insert((t, *v));
                    }
                }
            }
            k = i + 1;
        }
        if value {
            let caller = self.one(Root::Caller);
            for &p in params.iter().skip(k.max(ncap)) {
                self.add_var(p, &caller);
            }
            if let Some(a) = args_var {
                self.add_var(a, &caller);
            }
        }
    }

    /// The object variable at the bottom of a chain of reads.
    fn base_var(e: &RExpr) -> Option<usize> {
        match e {
            RExpr::Var(v) => Some(*v),
            RExpr::Get(o, _) | RExpr::Index(o, _) => Self::base_var(o),
            _ => None,
        }
    }

    fn call(&mut self, c: &RExpr, args: &[RExpr], dst: Option<usize>, new: bool) -> Roots {
        let callee = self.callee(c);
        let mut r = self.all(args);
        match &callee {
            Callee::Residual(rfid) => {
                // (`f.call(this, ...)`: the receiver is no parameter.)
                let (caps, direct): (&[RExpr], bool) = match c {
                    RExpr::FnRef { caps, .. } => (caps, true),
                    _ => (&[], false),
                };
                let method = match c {
                    RExpr::Get(_, k) => Some(k.as_str()),
                    _ => None,
                };
                match method {
                    Some("call") if !args.is_empty() => self.bind(*rfid, &[], &args[1..], false),
                    Some(_) => self.bind(*rfid, &[], &[], true),
                    None if direct => self.bind(*rfid, caps, args, false),
                    None => self.bind(*rfid, &[], &[], true),
                }
                r.extend(self.ret.get(*rfid).cloned().unwrap_or_default());
                let why = dst
                    .and_then(|d| match self.js.var_ids.borrow().keys.get(&d) {
                        Some(VarKey::OpaqueCall(pc)) => Some(*pc),
                        _ => None,
                    })
                    .and_then(|pc| self.kept.get(&pc).copied());
                if let Some(k) = why {
                    let name = self.fns[*rfid].js_name.clone();
                    r.insert(self.id(Root::KeptFn(k, if name.is_empty() { format!("__rf{rfid}") } else { name })));
                }
            }
            Callee::Host(name) => {
                r.extend(self.expr(c, None));
                r.insert(self.id(Root::Host(name.clone())));
            }
            Callee::Builtin(name) => {
                r.extend(self.expr(c, None));
                if impure_builtin(name, args.len(), new) {
                    r.insert(self.id(Root::Impure(name.clone())));
                }
            }
            Callee::Value => r.extend(self.expr(c, None)),
        }
        // What the callee may do to an object it is given reaches every later
        // read of the object.
        let mut given: Vec<&RExpr> = args.iter().collect();
        if let RExpr::Get(o, _) | RExpr::Index(o, _) = c {
            given.push(o);
        }
        if let RExpr::BoundMethod { recv, .. } = c {
            given.push(recv);
        }
        let objects: Vec<usize> = given.into_iter().filter_map(Self::base_var).filter(|v| self.js.why_is_object_var(*v)).collect();
        if !objects.is_empty() {
            for v in objects {
                self.add_var(v, &r);
            }
        }
        r
    }

    /// One pass over a program: every assignment's roots reach its variable.
    fn flow(&mut self, prog: &Program<Op, Cond>, rfid: Option<usize>) {
        for b in &prog.blocks {
            for op in &b.ops {
                self.flow_op(op, rfid);
            }
        }
    }

    fn store(&mut self, obj: &RExpr, parts: &[&RExpr]) {
        let mut r = Roots::new();
        for p in parts {
            r.extend(self.expr(p, None));
        }
        // (What is stored in an object is reachable from it, and what the
        // object is reachable from may change what is stored.)
        let o = self.expr(obj, None);
        if let Some(v) = Self::base_var(obj) {
            self.add_var(v, &r);
        }
        for p in parts {
            if let RExpr::Var(v) = p {
                if self.js.why_is_object_var(*v) {
                    self.add_var(*v, &o);
                }
            }
        }
    }

    fn flow_op(&mut self, op: &Op, rfid: Option<usize>) {
        match op {
            Op::Assign { var, expr } | Op::Eval { dst: var, expr } => {
                let r = self.expr(expr, Some(*var));
                self.add_var(*var, &r);
            }
            Op::Return(e) => {
                let r = self.expr(e, None);
                if let Some(f) = rfid {
                    let n = self.ret[f].len();
                    self.ret[f].extend(r);
                    self.changed |= self.ret[f].len() != n;
                }
            }
            Op::NewObject { dst, fields } => {
                let mut r = Roots::new();
                for (_, x) in fields {
                    r.extend(self.expr(x, None));
                }
                self.add_var(*dst, &r);
            }
            Op::NewArray { dst, elems } => {
                let r = self.all(elems);
                self.add_var(*dst, &r);
            }
            Op::PushOp { arr, val } => self.store(arr, &[val]),
            Op::SetIndex { arr, index, val } => self.store(arr, &[index, val]),
            Op::SetProp { obj, val, .. } => self.store(obj, &[val]),
            Op::DeleteProp { obj, .. } => {
                self.expr(obj, None);
            }
            Op::DeleteIndex { arr, index } => {
                self.expr(arr, None);
                self.expr(index, None);
            }
            Op::Throw(e) | Op::Effect(e) => {
                self.expr(e, None);
            }
            Op::AssignGlobal { name, expr } => {
                let r = self.expr(expr, None);
                let e = self.global.entry(name.clone()).or_default();
                let n = e.len();
                e.extend(r);
                self.changed |= e.len() != n;
            }
            Op::Try { body, catch_body, finally_body, .. } => {
                self.flow(body, rfid);
                self.flow(catch_body, rfid);
                if let Some(f) = finally_body {
                    self.flow(f, rfid);
                }
            }
        }
    }

    /// What the load code made that a call of the entry may change is the
    /// run's by the second call.
    fn seed_call_state(&mut self) {
        let js = self.js;
        if js.entry.load.borrow().is_none() {
            return;
        }
        let state = self.one(Root::CallState);
        let dynamic = js.entry.dynamic.borrow().clone();
        let exports = js.entry.exports.borrow().clone();
        for v in exports {
            if js.escape_addr(v).is_some_and(|a| dynamic.contains(&a)) {
                self.add_var(v, &state);
            }
        }
        if let Some((w, _)) = js.entry.watched.borrow().as_ref() {
            for (a, v) in &w.hoisted {
                if dynamic.contains(a) {
                    self.add_var(*v, &state);
                }
            }
        }
        let globals: Vec<String> = js.entry.dynamic_globals.borrow().iter().cloned().collect();
        for g in globals {
            self.global.entry(g).or_default().extend(state.iter().copied());
        }
    }

    fn fixpoint(&mut self, progs: &[(String, Option<usize>, &Program<Op, Cond>)]) {
        for _ in 0..64 {
            self.changed = false;
            for (_, rfid, p) in progs {
                self.flow(p, *rfid);
            }
            let aliases: Vec<(usize, usize)> = self.aliases.iter().copied().collect();
            for (param, given) in aliases {
                if let Some(rs) = self.var.get(&param).cloned() {
                    self.add_var(given, &rs);
                }
            }
            if !self.changed {
                break;
            }
        }
    }
}

fn shorten(mut s: String) -> String {
    const MAX: usize = 120;
    if s.len() > MAX {
        let mut cut = MAX;
        while !s.is_char_boundary(cut) {
            cut -= 1;
        }
        s.truncate(cut);
        s.push_str("...");
    }
    s
}

/// A unit as collected: its section, kind, text, causes, and whether it
/// operates on known values only.
struct Raw {
    section: String,
    kind: &'static str,
    text: String,
    roots: Roots,
    is_static: bool,
}

/// Collects the units of a program, once the roots are settled.
struct Units<'a, 'b> {
    an: &'b mut Analysis<'a>,
    section: String,
    out: Vec<Raw>,
}

impl Units<'_, '_> {
    /// A unit of work over operands of roots `r`: with none, it is static
    /// work, its own cause (`own`, or the operation by `label`). Its roots,
    /// for what consumes its result.
    fn work(&mut self, kind: &'static str, label: &str, own: Option<Root>, text: String, mut r: Roots) -> Roots {
        let is_static = r.is_empty();
        if is_static {
            let root = own.unwrap_or_else(|| Root::StaticOp(label.to_string()));
            r.insert(self.an.id(root));
        }
        self.out.push(Raw { section: self.section.clone(), kind, text: shorten(text), roots: r.clone(), is_static });
        r
    }

    fn all(&mut self, xs: &[RExpr]) -> Roots {
        let mut r = Roots::new();
        for x in xs {
            r.extend(self.expr(x, false, None));
        }
        r
    }

    /// The units in `e`, and the roots of its value (those of the static
    /// work in it among them). `callee`: it is called (reading a method is
    /// part of the call). `dst`: the variable it is evaluated into.
    fn expr(&mut self, e: &RExpr, callee: bool, dst: Option<usize>) -> Roots {
        match e {
            RExpr::Bin(_, a, b) => {
                let mut r = self.expr(a, false, None);
                r.extend(self.expr(b, false, None));
                self.work("op", &work_label(e), None, fmt_rexpr(e), r)
            }
            RExpr::Opaque(op, xs) => {
                let r = self.all(xs);
                // (`(0, f)`: how a call without a receiver is written; a
                // string that is not well-formed Unicode: a literal.)
                if op == "," || op == ILL_FORMED_STRING {
                    r
                } else {
                    self.work("op", &work_label(e), None, fmt_rexpr(e), r)
                }
            }
            RExpr::Index(a, b) => {
                let mut r = self.expr(a, false, None);
                r.extend(self.expr(b, false, None));
                if callee {
                    r
                } else {
                    self.work("read", &work_label(e), None, fmt_rexpr(e), r)
                }
            }
            RExpr::Get(o, _) => {
                // (A member of a standard built-in read by name is the
                // built-in: `Math.PI` is no work.)
                if matches!(global_chain(e), Some((root, _)) if is_builtin_global(&root)) {
                    return self.an.expr(e, None);
                }
                let r = self.expr(o, false, None);
                if callee {
                    r
                } else {
                    self.work("read", &work_label(e), None, fmt_rexpr(e), r)
                }
            }
            // (A registered symbol, `Symbol.for("k")`: how the residual
            // writes that value, there being no literal of it. No work.)
            RExpr::Call(c, args) if builtin_callee(c).as_deref() == Some("Symbol.for") && matches!(args.as_slice(), [RExpr::Str(_)]) => Roots::new(),
            RExpr::Call(c, args) | RExpr::New(c, args) => {
                let new = matches!(e, RExpr::New(..));
                let mut r = self.expr(c, true, None);
                r.extend(self.all(args));
                // (What makes an object or a fresh symbol is an allocation,
                // whatever its operands: its identity is the run's.)
                if allocates(e) {
                    return self.alloc(fmt_rexpr(e), dst, r, false);
                }
                r.extend(self.an.call(c, args, dst, new));
                let own = match self.an.callee(c) {
                    Callee::Builtin(name) => Some(Root::StaticCall(name)),
                    _ => None,
                };
                self.work(if new { "new" } else { "call" }, &work_label(e), own, fmt_rexpr(e), r)
            }
            RExpr::Yield(o) | RExpr::Await(o) => {
                let mut r = self.expr(o, false, None);
                r.extend(self.an.expr(e, None));
                self.work("suspend", &work_label(e), None, fmt_rexpr(e), r)
            }
            RExpr::Delete(o) => {
                let r = self.expr(o, true, None);
                self.write(fmt_rexpr(e), r)
            }
            RExpr::OwnMember { obj, .. } => self.expr(obj, false, None),
            RExpr::FnRef { caps, .. } => {
                let r = self.all(caps);
                self.an.expr(e, None);
                if callee {
                    r
                } else {
                    self.alloc(fmt_rexpr(e), dst, r, false)
                }
            }
            RExpr::NewFn { .. } | RExpr::RegexLit(..) => self.alloc(fmt_rexpr(e), dst, Roots::new(), false),
            RExpr::Verbatim(..) => {
                let r = self.an.expr(e, None);
                self.alloc(fmt_rexpr(e), dst, r, false)
            }
            RExpr::ArrayLit(xs) => {
                let r = self.all(xs);
                self.alloc(fmt_rexpr(e), dst, r, false)
            }
            RExpr::ObjectLit(fs) => {
                let mut r = Roots::new();
                for (_, x) in fs {
                    r.extend(self.expr(x, false, None));
                }
                self.alloc(fmt_rexpr(e), dst, r, false)
            }
            RExpr::ClassSrc { parent, caps, .. } => {
                let mut r = self.all(caps);
                if let Some(p) = parent {
                    r.extend(self.expr(p, false, None));
                }
                r.extend(self.an.expr(e, None));
                self.alloc(fmt_rexpr(e), dst, r, false)
            }
            RExpr::BoundMethod { func, recv } => {
                let mut r = self.expr(func, callee, None);
                r.extend(self.expr(recv, false, None));
                r
            }
            RExpr::Num(_) | RExpr::Str(_) | RExpr::Bool(_) | RExpr::Undef | RExpr::Null | RExpr::This | RExpr::Var(_) | RExpr::Global(_) | RExpr::BigInt(_) | RExpr::Hole => {
                self.an.expr(e, None)
            }
        }
    }

    /// An allocation: an object the residual makes, of parts of roots
    /// `parts`. It is there because the object reached runtime code
    /// (needed), or was made a variable by a merge; never static work (its
    /// identity is the run's). One nothing uses (`dead`, or made into a
    /// variable nothing reads) is a gap of its own. Its roots.
    fn alloc(&mut self, text: String, dst: Option<usize>, parts: Roots, dead: bool) -> Roots {
        let mut r = parts;
        if let Some(d) = dst {
            let own = self.an.var_own(d);
            r.extend(own.into_iter().filter(|&i| !matches!(self.an.roots[i as usize], Root::StaticCall(_) | Root::StaticOp(_))));
        }
        let value = r.clone();
        if dead || dst.is_some_and(|d| !self.an.used.contains(&d)) {
            r.insert(self.an.id(Root::DeadAlloc));
        } else {
            // (At least needed: by whoever it reaches.)
            r.insert(self.an.id(Root::Caller));
        }
        self.out.push(Raw { section: self.section.clone(), kind: "alloc", text: shorten(text), roots: r, is_static: false });
        value
    }

    /// A write into an object or a global, of operands of roots `r`. (Of
    /// known values into an object the residual made: part of making it.)
    fn write(&mut self, text: String, mut r: Roots) -> Roots {
        if r.is_empty() {
            r.insert(self.an.id(Root::Caller));
        }
        self.out.push(Raw { section: self.section.clone(), kind: "write", text: shorten(text), roots: r.clone(), is_static: false });
        r
    }

    fn prog(&mut self, prog: &Program<Op, Cond>) {
        for b in &prog.blocks {
            for op in &b.ops {
                self.op(op);
            }
            if let Terminator::Cond { cond: Cond::Falsy(c), .. } = &b.term {
                let r = self.expr(c, false, None);
                self.work("branch", "branch", None, format!("if ({})", fmt_rexpr(c)), r);
            }
        }
    }

    fn op(&mut self, op: &Op) {
        match op {
            Op::Assign { var, expr } | Op::Eval { dst: var, expr } => {
                self.expr(expr, false, Some(*var));
            }
            Op::Return(e) => {
                self.expr(e, false, None);
            }
            // (Evaluated for its effects: what it makes, nothing uses.)
            Op::Effect(e) if allocates(e) => {
                let parts = match e {
                    RExpr::Call(c, args) | RExpr::New(c, args) => {
                        let mut r = self.expr(c, true, None);
                        r.extend(self.all(args));
                        r
                    }
                    _ => Roots::new(),
                };
                self.alloc(fmt_rexpr(e), None, parts, true);
            }
            Op::Effect(e) => {
                self.expr(e, false, None);
            }
            Op::NewObject { dst, fields } => {
                let mut r = Roots::new();
                for (_, x) in fields {
                    r.extend(self.expr(x, false, None));
                }
                let keys: Vec<&str> = fields.iter().map(|(k, _)| k.as_str()).collect();
                self.alloc(format!("{{{}}}", keys.join(", ")), Some(*dst), r, false);
            }
            Op::NewArray { dst, elems } => {
                let r = self.all(elems);
                self.alloc(format!("[{} element(s)]", elems.len()), Some(*dst), r, false);
            }
            Op::PushOp { arr, val } => {
                let mut r = self.expr(arr, false, None);
                r.extend(self.expr(val, false, None));
                self.write(format!("{}.push({})", fmt_rexpr(arr), fmt_rexpr(val)), r);
            }
            Op::SetIndex { arr, index, val } => {
                let mut r = self.expr(arr, false, None);
                r.extend(self.expr(index, false, None));
                r.extend(self.expr(val, false, None));
                self.write(format!("{}[{}] = {}", fmt_rexpr(arr), fmt_rexpr(index), fmt_rexpr(val)), r);
            }
            Op::SetProp { obj, key, val } => {
                let mut r = self.expr(obj, false, None);
                r.extend(self.expr(val, false, None));
                self.write(format!("{}.{key} = {}", fmt_rexpr(obj), fmt_rexpr(val)), r);
            }
            Op::DeleteProp { obj, key } => {
                let r = self.expr(obj, false, None);
                self.write(format!("delete {}.{key}", fmt_rexpr(obj)), r);
            }
            Op::DeleteIndex { arr, index } => {
                let mut r = self.expr(arr, false, None);
                r.extend(self.expr(index, false, None));
                self.write(format!("delete {}[{}]", fmt_rexpr(arr), fmt_rexpr(index)), r);
            }
            Op::Throw(e) => {
                let mut r = self.expr(e, false, None);
                // (A `throw` the residual reaches is the path's result.)
                r.insert(self.an.id(Root::Caller));
                self.out.push(Raw { section: self.section.clone(), kind: "throw", text: shorten(format!("throw {}", fmt_rexpr(e))), roots: r, is_static: false });
            }
            Op::AssignGlobal { name, expr } => {
                let r = self.expr(expr, false, None);
                self.write(format!("{name} = {}", fmt_rexpr(expr)), r);
            }
            Op::Try { body, catch_body, finally_body, .. } => {
                self.prog(body);
                self.prog(catch_body);
                if let Some(f) = finally_body {
                    self.prog(f);
                }
            }
        }
    }
}

/// Per variable: how many assignments `prog` makes it, and (`stored`) the
/// variables it writes into.
fn count_defs(prog: &Program<Op, Cond>, defs: &mut HashMap<usize, Vec<RExpr>>, stored: &mut HashSet<usize>) {
    for b in &prog.blocks {
        for op in &b.ops {
            match op {
                Op::Assign { var, expr } | Op::Eval { dst: var, expr } => defs.entry(*var).or_default().push(expr.clone()),
                Op::NewObject { dst, fields } => {
                    defs.entry(*dst).or_default().push(RExpr::ObjectLit(fields.clone()));
                }
                Op::NewArray { dst, elems } => defs.entry(*dst).or_default().push(RExpr::ArrayLit(elems.clone())),
                Op::PushOp { arr: o, .. } | Op::SetIndex { arr: o, .. } | Op::SetProp { obj: o, .. } | Op::DeleteProp { obj: o, .. } | Op::DeleteIndex { arr: o, .. } => {
                    stored.extend(Analysis::base_var(o));
                }
                Op::Try { body, catch_body, finally_body, .. } => {
                    count_defs(body, defs, stored);
                    count_defs(catch_body, defs, stored);
                    if let Some(f) = finally_body {
                        count_defs(f, defs, stored);
                    }
                }
                Op::Return(_) | Op::Throw(_) | Op::Effect(_) | Op::AssignGlobal { .. } => {}
            }
        }
    }
}

fn own_globals(prog: &Program<Op, Cond>, out: &mut HashSet<String>) {
    for b in &prog.blocks {
        for op in &b.ops {
            match op {
                Op::AssignGlobal { name, .. } => {
                    out.insert(name.clone());
                }
                Op::Try { body, catch_body, finally_body, .. } => {
                    own_globals(body, out);
                    own_globals(catch_body, out);
                    if let Some(f) = finally_body {
                        own_globals(f, out);
                    }
                }
                _ => {}
            }
        }
    }
}

/// The variables `prog` assigns by an `Assign` or `Eval` (not those it
/// makes an object in), each with what it is assigned; and (`used`) the
/// variables its expressions read.
fn defs_and_uses(prog: &Program<Op, Cond>, defs: &mut Vec<(usize, RExpr)>, used: &mut HashSet<usize>) {
    let reads = |e: &RExpr, used: &mut HashSet<usize>| {
        visit_rexpr(e, &mut |x| {
            if let RExpr::Var(v) = x {
                used.insert(*v);
            }
        })
    };
    for b in &prog.blocks {
        for op in &b.ops {
            match op {
                Op::Assign { var, expr } | Op::Eval { dst: var, expr } => {
                    reads(expr, used);
                    defs.push((*var, expr.clone()));
                }
                Op::Return(e) | Op::Throw(e) | Op::Effect(e) | Op::AssignGlobal { expr: e, .. } => reads(e, used),
                Op::NewObject { fields, .. } => fields.iter().for_each(|(_, x)| reads(x, used)),
                Op::NewArray { elems, .. } => elems.iter().for_each(|x| reads(x, used)),
                Op::PushOp { arr, val } => {
                    reads(arr, used);
                    reads(val, used);
                }
                Op::SetIndex { arr, index, val } => {
                    reads(arr, used);
                    reads(index, used);
                    reads(val, used);
                }
                Op::SetProp { obj, val, .. } => {
                    reads(obj, used);
                    reads(val, used);
                }
                Op::DeleteProp { obj, .. } => reads(obj, used),
                Op::DeleteIndex { arr, index } => {
                    reads(arr, used);
                    reads(index, used);
                }
                Op::Try { body, catch_body, finally_body, .. } => {
                    defs_and_uses(body, defs, used);
                    defs_and_uses(catch_body, defs, used);
                    if let Some(f) = finally_body {
                        defs_and_uses(f, defs, used);
                    }
                }
            }
        }
        if let Terminator::Cond { cond: Cond::Falsy(c), .. } = &b.term {
            reads(c, used);
        }
    }
}

impl Js {
    /// Is residual variable `v` one that holds an object the residual made
    /// (a materialized object, a merged local or field that may hold one, a
    /// temp of a call that makes one)?
    fn why_is_object_var(&self, v: usize) -> bool {
        if self.object_temps.borrow().contains(&v) {
            return true;
        }
        matches!(self.var_ids.borrow().keys.get(&v), Some(VarKey::Escape(_) | VarKey::Stable(..) | VarKey::HeapField(..) | VarKey::Residual(..)))
    }

    /// Account for the residual `main` (with the load code and the residual
    /// functions it reaches), cleaned up (`Js::clean`) and before its
    /// variables are coalesced: they still are the variables specialization
    /// made, each with its purpose.
    pub fn why_report(&self, main: &Program<Op, Cond>) -> Report {
        let fns = self.residual_fns.borrow();
        let load = self.entry.load.borrow();
        let mut live = reachable_residual_fns(main, &fns);
        if let Some(l) = load.as_ref() {
            live.extend(reachable_residual_fns(l, &fns));
        }
        let mut progs: Vec<(String, Option<usize>, &Program<Op, Cond>)> = Vec::new();
        if let Some(l) = load.as_ref() {
            progs.push(("load".to_string(), None, l));
        }
        progs.push(("main".to_string(), None, main));
        let mut rfids: Vec<usize> = live.iter().copied().collect();
        rfids.sort_unstable();
        for r in rfids {
            let name = if fns[r].js_name.is_empty() { format!("__rf{r}") } else { format!("{} (__rf{r})", fns[r].js_name) };
            progs.push((name, Some(r), &fns[r].body));
        }
        let mut own = HashSet::new();
        for (_, _, p) in &progs {
            own_globals(p, &mut own);
        }
        let mut an = Analysis {
            js: self,
            fns: &fns,
            roots: Vec::new(),
            ids: HashMap::new(),
            var: HashMap::new(),
            global: HashMap::new(),
            ret: vec![Roots::new(); fns.len()],
            own_globals: own,
            static_defs: HashMap::new(),
            aliases: HashSet::new(),
            used: HashSet::new(),
            sites: self.why.vars.borrow().clone(),
            kept: self.why.calls.borrow().clone(),
            builtins: self.why.builtins.borrow().clone(),
            varies: HashSet::new(),
            changed: false,
        };
        an.seed_call_state();
        an.fixpoint(&progs);
        // A merged variable holds a known value the merge gave up only when
        // it is assigned one value, a known one, and nothing is stored in
        // it: otherwise what it holds is the run's whatever the merge did.
        {
            let mut defs: HashMap<usize, Vec<RExpr>> = HashMap::new();
            let mut stored = HashSet::new();
            for (_, _, p) in &progs {
                count_defs(p, &mut defs, &mut stored);
            }
            // (A store through a copy of the variable is a store in what
            // it holds.)
            loop {
                let more: Vec<usize> = defs
                    .iter()
                    .filter(|(v, _)| stored.contains(*v))
                    .flat_map(|(_, es)| es.iter())
                    .filter_map(|e| match e {
                        RExpr::Var(src) if !stored.contains(src) => Some(*src),
                        _ => None,
                    })
                    .collect();
                if more.is_empty() {
                    break;
                }
                stored.extend(more);
            }
            let merged: Vec<usize> = an.sites.iter().filter(|(_, ss)| ss.iter().any(|s| s.merge.is_some())).map(|(v, _)| *v).collect();
            for v in merged {
                let known_once = match defs.get(&v).map(|d| d.as_slice()) {
                    Some([one]) => an.expr(one, None).is_empty(),
                    _ => false,
                };
                if !known_once || stored.contains(&v) {
                    an.varies.insert(v);
                }
            }
            an.var.clear();
            an.global.retain(|_, r| {
                r.clear();
                true
            });
            an.ret.iter_mut().for_each(|r| r.clear());
            an.seed_call_state();
            an.fixpoint(&progs);
        }
        // What is assigned the result of work on known operands holds that
        // work's result: the work is the cause of whatever is computed from
        // it (a standard built-in's call by its name, any other operation
        // by what it is), and the roots settle again with those.
        let mut defs = Vec::new();
        let mut used = HashSet::new();
        for (_, _, p) in &progs {
            defs_and_uses(p, &mut defs, &mut used);
        }
        an.used = used;
        for (var, expr) in defs {
            let plain = is_const(&expr) || matches!(expr, RExpr::Var(_) | RExpr::Global(_) | RExpr::This | RExpr::Hole) || allocates(&expr);
            if plain || !an.expr(&expr, Some(var)).is_empty() {
                continue;
            }
            let root = match &expr {
                RExpr::Call(c, _) => match an.callee(c) {
                    Callee::Builtin(name) => Root::StaticCall(name),
                    _ => Root::StaticOp(work_label(&expr)),
                },
                _ => Root::StaticOp(work_label(&expr)),
            };
            an.static_defs.insert(var, root);
        }
        an.fixpoint(&progs);

        let mut raw = Vec::new();
        for (name, _, p) in &progs {
            let mut u = Units { an: &mut an, section: name.clone(), out: Vec::new() };
            u.prog(p);
            raw.extend(u.out);
        }
        let mut causes: Vec<Cause> =
            an.roots.iter().map(|r| Cause { class: r.class(), kind: r.kind(), what: r.what(), units: 0, sole: 0 }).collect();
        let mut units = Vec::with_capacity(raw.len());
        for Raw { section, kind, text, roots, is_static } in raw {
            let class = roots.iter().map(|&i| causes[i as usize].class).max().expect("a unit has a cause");
            let blockers: Vec<usize> = roots.iter().map(|&i| i as usize).filter(|&i| causes[i].class != Class::Needed).collect();
            for &i in &roots {
                causes[i as usize].units += 1;
            }
            if let [one] = blockers[..] {
                causes[one].sole += 1;
            }
            units.push(Unit { section, kind, text, class, is_static, causes: roots.iter().map(|&i| i as usize).collect() });
        }
        Report { units, causes }
    }
}
