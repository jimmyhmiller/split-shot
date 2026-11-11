//! Fold single-use temporaries into the statement that uses them.
//!
//! Specialization keeps every effect in program order by binding values to
//! temporaries (`t = f(x); u = [t, 1]; return u.join(",")`). When a temporary
//! is defined once, read once, and that read is in the very next statement at
//! a point that statement evaluates before anything observable, the
//! definition can move into the use without changing what runs or in what
//! order: `return [f(x), 1].join(",")`.
//!
//! The position test: walking the using statement in JavaScript evaluation
//! order, everything evaluated before the read must be a local variable, a
//! literal or `this` (which the moved expression cannot change, since
//! expressions do not assign locals), with no operation completed before it
//! (a property read, a call, an operator, a global read, any of which could
//! observe or be observed by the moved expression), and the read must not sit
//! in an operand that is evaluated only conditionally (the right of `&&`,
//! `||`, `??`, the arms of `?:`).
//!
//! Runs before variable coalescing, while each temporary still has its own
//! name, so "defined once, read once" is a count over the function.

use std::collections::{HashMap, HashSet};

use crate::js::{Cond, Op, RExpr};
use crate::residual::{Program, Terminator};

/// Fold the single-use temporaries of a function body. `keep` are variables
/// bound from outside (parameters, the input, `arguments`).
pub fn inline_temps(prog: &mut Program<Op, Cond>, keep: &HashSet<usize>) {
    let mut defs: HashMap<usize, usize> = HashMap::new();
    let mut uses: HashMap<usize, usize> = HashMap::new();
    count_program(prog, &mut defs, &mut uses);
    let mut pairs: HashMap<usize, usize> = HashMap::new();
    count_pairs(prog, &mut pairs);
    let paired: HashSet<usize> = pairs.into_iter().filter(|(t, n)| defs.get(t) == Some(n) && uses.get(t) == Some(n)).map(|(t, _)| t).collect();

    inline_program(prog, keep, &defs, &mut uses, &paired, false);
}

/// The size (in nodes) past which a temporary's value is not folded into
/// its use.
const MAX_FOLDED_NODES: usize = 40;

/// Has `e` more than `limit` nodes? (Stops counting there.)
fn larger_than(e: &RExpr, limit: usize) -> bool {
    fn count(e: &RExpr, left: &mut usize) -> bool {
        if *left == 0 {
            return true;
        }
        *left -= 1;
        children(e).into_iter().any(|c| count(c, left))
    }
    let mut left = limit;
    count(e, &mut left)
}

/// How far past a definition `count_pairs` looks for the read of it.
const PAIR_REACH: usize = 48;

/// For each variable, its definitions that are read once later in their
/// block before anything else mentions the variable. A variable all of whose
/// definitions are such, and with no other read, is a temporary at each of
/// them: each read sees the one definition before it (code the specializer
/// wrote several times over, a call's result named by where the call is).
fn count_pairs(prog: &Program<Op, Cond>, pairs: &mut HashMap<usize, usize>) {
    for b in &prog.blocks {
        for (i, op) in b.ops.iter().enumerate() {
            if let Op::Try { body, catch_body, finally_body, .. } = op {
                count_pairs(body, pairs);
                count_pairs(catch_body, pairs);
                if let Some(f) = finally_body {
                    count_pairs(f, pairs);
                }
            }
            let Some(t) = op_def(op) else { continue };
            let reads = |e: &RExpr| {
                let mut n = 0;
                visit(e, &mut |x| {
                    if matches!(x, RExpr::Var(v) if *v == t) {
                        n += 1;
                    }
                });
                n
            };
            let mut found = None;
            for later in b.ops[i + 1..].iter().take(PAIR_REACH) {
                // (A `try` may read it anywhere in its parts.)
                if matches!(later, Op::Try { .. }) {
                    found = Some(false);
                    break;
                }
                let n: usize = op_exprs(later).iter().map(|e| reads(e)).sum();
                if n > 0 || op_def(later) == Some(t) {
                    found = Some(n == 1);
                    break;
                }
            }
            let found = match found {
                Some(f) => f,
                None if b.ops.len() - (i + 1) <= PAIR_REACH => matches!(&b.term, Terminator::Cond { cond: Cond::Falsy(e), .. } if reads(e) == 1),
                None => false,
            };
            if found {
                *pairs.entry(t).or_insert(0) += 1;
            }
        }
    }
}

/// The variables `prog` reads (anywhere, nested programs included).
pub fn used_vars(prog: &Program<Op, Cond>) -> HashSet<usize> {
    let (mut defs, mut uses) = (HashMap::new(), HashMap::new());
    count_program(prog, &mut defs, &mut uses);
    uses.into_keys().collect()
}

fn count_program(prog: &Program<Op, Cond>, defs: &mut HashMap<usize, usize>, uses: &mut HashMap<usize, usize>) {
    for b in &prog.blocks {
        for op in &b.ops {
            if let Some(d) = op_def(op) {
                *defs.entry(d).or_insert(0) += 1;
            }
            if let Op::Try { body, catch_slot, catch_body, finally_body } = op {
                if let Some(c) = catch_slot {
                    *defs.entry(*c).or_insert(0) += 1;
                }
                count_program(body, defs, uses);
                count_program(catch_body, defs, uses);
                if let Some(f) = finally_body {
                    count_program(f, defs, uses);
                }
            }
            for e in op_exprs(op) {
                count_uses(e, uses);
            }
        }
        if let Terminator::Cond { cond: Cond::Falsy(e), .. } = &b.term {
            count_uses(e, uses);
        }
    }
}

fn count_uses(e: &RExpr, uses: &mut HashMap<usize, usize>) {
    visit(e, &mut |x| {
        if let RExpr::Var(v) = x {
            *uses.entry(*v).or_insert(0) += 1;
        }
    });
}

/// Pre-order visit of every subexpression.
fn visit(e: &RExpr, f: &mut dyn FnMut(&RExpr)) {
    f(e);
    for c in children(e) {
        visit(c, f);
    }
}

/// The direct subexpressions of `e`, in evaluation order.
pub(crate) fn children(e: &RExpr) -> Vec<&RExpr> {
    match e {
        RExpr::Num(_) | RExpr::Str(_) | RExpr::Bool(_) | RExpr::Undef | RExpr::Null | RExpr::This | RExpr::Var(_) | RExpr::Global(_) | RExpr::RegexLit(..) | RExpr::BigInt(_) | RExpr::NewFn { .. } | RExpr::Hole | RExpr::Verbatim(..) => {
            vec![]
        }
        RExpr::Bin(_, a, b) | RExpr::Index(a, b) => vec![a, b],
        RExpr::Get(o, _) | RExpr::Yield(o) | RExpr::Await(o) | RExpr::Delete(o) | RExpr::OwnMember { obj: o, .. } => vec![o],
        RExpr::ClassSrc { parent, caps, .. } => parent.iter().map(|p| &**p).chain(caps.iter()).collect(),
        RExpr::Opaque(_, xs) | RExpr::FnRef { caps: xs, .. } | RExpr::ArrayLit(xs) => xs.iter().collect(),
        RExpr::Call(c, xs) | RExpr::New(c, xs) => std::iter::once(&**c).chain(xs.iter()).collect(),
        RExpr::BoundMethod { func, recv } => vec![func, recv],
        RExpr::ObjectLit(fs) => fs.iter().map(|(_, x)| x).collect(),
    }
}

/// The variable an op assigns (`None` for a `try`, whose catch binding is
/// counted separately).
fn op_def(op: &Op) -> Option<usize> {
    match op {
        Op::Assign { var, .. } => Some(*var),
        Op::Eval { dst, .. } | Op::NewObject { dst, .. } | Op::NewArray { dst, .. } => Some(*dst),
        _ => None,
    }
}

/// The expressions an op evaluates, in order (a `try`'s sub-programs are not
/// included).
pub fn op_exprs(op: &Op) -> Vec<&RExpr> {
    match op {
        Op::Assign { expr, .. } | Op::Eval { expr, .. } | Op::AssignGlobal { expr, .. } => vec![expr],
        Op::Return(e) | Op::Throw(e) | Op::Effect(e) => vec![e],
        Op::NewObject { fields, .. } => fields.iter().map(|(_, e)| e).collect(),
        Op::NewArray { elems, .. } => elems.iter().collect(),
        Op::PushOp { arr, val } => vec![arr, val],
        Op::SetIndex { arr, index, val } => vec![arr, index, val],
        Op::SetProp { obj, val, .. } => vec![obj, val],
        Op::DeleteProp { obj, .. } => vec![obj],
        Op::DeleteIndex { arr, index } => vec![arr, index],
        Op::Try { .. } => vec![],
    }
}

pub(crate) fn op_exprs_mut(op: &mut Op) -> Vec<&mut RExpr> {
    match op {
        Op::Assign { expr, .. } | Op::Eval { expr, .. } | Op::AssignGlobal { expr, .. } => vec![expr],
        Op::Return(e) | Op::Throw(e) | Op::Effect(e) => vec![e],
        Op::NewObject { fields, .. } => fields.iter_mut().map(|(_, e)| e).collect(),
        Op::NewArray { elems, .. } => elems.iter_mut().collect(),
        Op::PushOp { arr, val } => vec![arr, val],
        Op::SetIndex { arr, index, val } => vec![arr, index, val],
        Op::SetProp { obj, val, .. } => vec![obj, val],
        Op::DeleteProp { obj, .. } => vec![obj],
        Op::DeleteIndex { arr, index } => vec![arr, index],
        Op::Try { .. } => vec![],
    }
}

/// The value an op binds, as an expression.
fn op_value(op: &Op) -> Option<RExpr> {
    match op {
        Op::Assign { expr, .. } | Op::Eval { expr, .. } => Some(expr.clone()),
        Op::NewArray { elems, .. } => Some(RExpr::ArrayLit(elems.clone())),
        Op::NewObject { fields, .. } => Some(RExpr::ObjectLit(fields.clone())),
        _ => None,
    }
}

enum Walk {
    /// The read was reached with nothing observable evaluated before it.
    Found,
    /// The read comes after an operation, or is conditionally evaluated.
    Blocked,
    /// The read is not in this subexpression.
    Absent,
}

/// Walk `e` in evaluation order looking for the read of `t`; `done` records
/// whether an operation has completed so far.
fn walk(e: &RExpr, t: usize, done: &mut bool) -> Walk {
    match e {
        RExpr::Var(v) if *v == t => {
            if *done {
                Walk::Blocked
            } else {
                Walk::Found
            }
        }
        RExpr::Var(_) | RExpr::Num(_) | RExpr::Str(_) | RExpr::Bool(_) | RExpr::Undef | RExpr::Null | RExpr::This => Walk::Absent,
        RExpr::Global(_) => {
            *done = true;
            Walk::Absent
        }
        RExpr::Opaque(op, xs) if matches!(op.as_str(), "&&" | "||" | "??" | "?:") => {
            match walk(&xs[0], t, done) {
                Walk::Absent => {}
                w => return w,
            }
            if xs[1..].iter().any(|x| mentions(x, t)) {
                return Walk::Blocked;
            }
            *done = true;
            Walk::Absent
        }
        _ => {
            for c in children(e) {
                match walk(c, t, done) {
                    Walk::Absent => {}
                    w => return w,
                }
            }
            // Building a literal or a closure value observes nothing; any
            // other node is an operation that has now run.
            if !matches!(e, RExpr::ArrayLit(_) | RExpr::ObjectLit(_) | RExpr::FnRef { .. }) {
                *done = true;
            }
            Walk::Absent
        }
    }
}

fn mentions(e: &RExpr, t: usize) -> bool {
    let mut found = false;
    visit(e, &mut |x| {
        if matches!(x, RExpr::Var(v) if *v == t) {
            found = true;
        }
    });
    found
}

/// Is the read of `t` in `op` at a position evaluated before anything
/// observable?
fn use_is_first(op: &Op, t: usize) -> bool {
    let mut done = false;
    let exprs = op_exprs(op);
    for (i, e) in exprs.iter().enumerate() {
        match walk(e, t, &mut done) {
            Walk::Found => return true,
            Walk::Blocked => return false,
            Walk::Absent => {}
        }
        // `arr.push(v)` reads `arr.push` before evaluating `v`.
        if matches!(op, Op::PushOp { .. }) && i == 0 {
            done = true;
        }
    }
    false
}

fn cond_use_is_first(e: &RExpr, t: usize) -> bool {
    let mut done = false;
    matches!(walk(e, t, &mut done), Walk::Found)
}

/// `e` with each variable `v` it reads replaced by `f(v)`.
pub fn rename_vars(e: &RExpr, f: &dyn Fn(usize) -> usize) -> RExpr {
    let mut e = e.clone();
    rename_in(&mut e, f);
    e
}

fn rename_in(e: &mut RExpr, f: &dyn Fn(usize) -> usize) {
    match e {
        RExpr::Var(v) => *v = f(*v),
        RExpr::Num(_) | RExpr::Str(_) | RExpr::Bool(_) | RExpr::Undef | RExpr::Null | RExpr::This | RExpr::Global(_) | RExpr::RegexLit(..) | RExpr::BigInt(_) | RExpr::NewFn { .. } | RExpr::Hole | RExpr::Verbatim(..) => {}
        RExpr::Bin(_, a, b) | RExpr::Index(a, b) => {
            rename_in(a, f);
            rename_in(b, f);
        }
        RExpr::Get(o, _) | RExpr::Yield(o) | RExpr::Await(o) | RExpr::Delete(o) | RExpr::OwnMember { obj: o, .. } => rename_in(o, f),
        RExpr::ClassSrc { parent, caps, .. } => {
            if let Some(p) = parent {
                rename_in(p, f);
            }
            caps.iter_mut().for_each(|x| rename_in(x, f));
        }
        RExpr::Opaque(_, xs) | RExpr::FnRef { caps: xs, .. } | RExpr::ArrayLit(xs) => xs.iter_mut().for_each(|x| rename_in(x, f)),
        RExpr::Call(c, xs) | RExpr::New(c, xs) => {
            rename_in(c, f);
            xs.iter_mut().for_each(|x| rename_in(x, f));
        }
        RExpr::BoundMethod { func, recv } => {
            rename_in(func, f);
            rename_in(recv, f);
        }
        RExpr::ObjectLit(fs) => fs.iter_mut().for_each(|(_, x)| rename_in(x, f)),
    }
}

/// `prog` with each variable `v` it reads replaced by `f(v)` (anywhere,
/// nested programs included).
pub fn rename_vars_in(prog: &mut Program<Op, Cond>, f: &dyn Fn(usize) -> usize) {
    for b in &mut prog.blocks {
        for op in &mut b.ops {
            if let Op::Try { body, catch_body, finally_body, .. } = op {
                rename_vars_in(body, f);
                rename_vars_in(catch_body, f);
                if let Some(fb) = finally_body {
                    rename_vars_in(fb, f);
                }
            }
            for e in op_exprs_mut(op) {
                rename_in(e, f);
            }
        }
        if let Terminator::Cond { cond: Cond::Falsy(e), .. } = &mut b.term {
            rename_in(e, f);
        }
    }
}

/// `e` with each read of `v` replaced by `value`.
pub fn substitute_all(e: &RExpr, v: usize, value: &RExpr) -> RExpr {
    fn go(e: &mut RExpr, v: usize, value: &RExpr) {
        if matches!(e, RExpr::Var(x) if *x == v) {
            *e = value.clone();
            return;
        }
        for c in children_mut(e) {
            go(c, v, value);
        }
    }
    let mut e = e.clone();
    go(&mut e, v, value);
    e
}

/// The direct subexpressions of `e`, mutably.
pub(crate) fn children_mut(e: &mut RExpr) -> Vec<&mut RExpr> {
    match e {
        RExpr::Num(_) | RExpr::Str(_) | RExpr::Bool(_) | RExpr::Undef | RExpr::Null | RExpr::This | RExpr::Var(_) | RExpr::Global(_) | RExpr::RegexLit(..) | RExpr::BigInt(_) | RExpr::NewFn { .. } | RExpr::Hole | RExpr::Verbatim(..) => vec![],
        RExpr::Bin(_, a, b) | RExpr::Index(a, b) => vec![&mut **a, &mut **b],
        RExpr::Get(o, _) | RExpr::Yield(o) | RExpr::Await(o) | RExpr::Delete(o) | RExpr::OwnMember { obj: o, .. } => vec![&mut **o],
        RExpr::ClassSrc { parent, caps, .. } => parent.iter_mut().map(|p| &mut **p).chain(caps.iter_mut()).collect(),
        RExpr::Opaque(_, xs) | RExpr::FnRef { caps: xs, .. } | RExpr::ArrayLit(xs) => xs.iter_mut().collect(),
        RExpr::Call(c, xs) | RExpr::New(c, xs) => std::iter::once(&mut **c).chain(xs.iter_mut()).collect(),
        RExpr::BoundMethod { func, recv } => vec![&mut **func, &mut **recv],
        RExpr::ObjectLit(fs) => fs.iter_mut().map(|(_, x)| x).collect(),
    }
}

/// The uses of each variable `prog` reads (anywhere, nested programs
/// included).
pub fn use_counts(prog: &Program<Op, Cond>) -> HashMap<usize, usize> {
    let (mut defs, mut uses) = (HashMap::new(), HashMap::new());
    count_program(prog, &mut defs, &mut uses);
    uses
}

/// Replace the read of `t` in `e` by `value`.
fn substitute(e: &mut RExpr, t: usize, value: &mut Option<RExpr>) {
    if matches!(e, RExpr::Var(v) if *v == t) {
        *e = value.take().expect("a single-use temporary is read once");
        return;
    }
    match e {
        RExpr::Num(_) | RExpr::Str(_) | RExpr::Bool(_) | RExpr::Undef | RExpr::Null | RExpr::This | RExpr::Var(_) | RExpr::Global(_) | RExpr::RegexLit(..) | RExpr::BigInt(_) | RExpr::NewFn { .. } | RExpr::Hole | RExpr::Verbatim(..) => {}
        RExpr::Bin(_, a, b) | RExpr::Index(a, b) => {
            substitute(a, t, value);
            substitute(b, t, value);
        }
        RExpr::Get(o, _) | RExpr::Yield(o) | RExpr::Await(o) | RExpr::Delete(o) | RExpr::OwnMember { obj: o, .. } => substitute(o, t, value),
        RExpr::ClassSrc { parent, caps, .. } => {
            if let Some(p) = parent {
                substitute(p, t, value);
            }
            caps.iter_mut().for_each(|x| substitute(x, t, value));
        }
        RExpr::Opaque(_, xs) | RExpr::FnRef { caps: xs, .. } | RExpr::ArrayLit(xs) => {
            xs.iter_mut().for_each(|x| substitute(x, t, value))
        }
        RExpr::Call(c, xs) => {
            // A temporary holding a member's value, called: the call has no
            // `this`, which `recv.m(...)` would give it; `(0, recv.m)(...)`
            // does not.
            if matches!(&**c, RExpr::Var(v) if *v == t) && matches!(value, Some(RExpr::Get(..) | RExpr::Index(..) | RExpr::OwnMember { .. })) {
                let member = value.take().expect("a single-use temporary is read once");
                **c = RExpr::Opaque(",".into(), vec![RExpr::Num(crate::jsnum::JsNum::int(0)), member]);
            } else {
                substitute(c, t, value);
            }
            xs.iter_mut().for_each(|x| substitute(x, t, value));
        }
        RExpr::New(c, xs) => {
            substitute(c, t, value);
            xs.iter_mut().for_each(|x| substitute(x, t, value));
        }
        RExpr::BoundMethod { func, recv } => {
            substitute(func, t, value);
            substitute(recv, t, value);
        }
        RExpr::ObjectLit(fs) => fs.iter_mut().for_each(|(_, x)| substitute(x, t, value)),
    }
}

fn inline_program(
    prog: &mut Program<Op, Cond>,
    keep: &HashSet<usize>,
    defs: &HashMap<usize, usize>,
    uses: &mut HashMap<usize, usize>,
    paired: &HashSet<usize>,
    in_try: bool,
) {
    for b in &mut prog.blocks {
        for op in b.ops.iter_mut() {
            if let Op::Try { body, catch_body, finally_body, .. } = op {
                inline_program(body, keep, defs, uses, paired, true);
                inline_program(catch_body, keep, defs, uses, paired, true);
                if let Some(f) = finally_body {
                    inline_program(f, keep, defs, uses, paired, true);
                }
            }
        }
        let mut i = 0;
        while i < b.ops.len() {
            let Some(t) = op_def(&b.ops[i]) else {
                i += 1;
                continue;
            };
            // (Not a value already large: folded on, a chain of a thousand
            // statements would be one expression a thousand deep.)
            let small = op_value(&b.ops[i]).is_none_or(|v| !larger_than(&v, MAX_FOLDED_NODES));
            let single = small && !keep.contains(&t) && (paired.contains(&t) || (defs.get(&t) == Some(&1) && uses.get(&t) == Some(&1)));
            // (A value that reads no state and makes only fresh values may go
            // anywhere in the next statement: nothing there can tell.)
            let free = op_value(&b.ops[i]).is_some_and(|v| state_free(&v));
            let foldable = single
                && if i + 1 < b.ops.len() {
                    use_is_first(&b.ops[i + 1], t) || (free && !matches!(&b.ops[i + 1], Op::Try { .. }) && op_exprs(&b.ops[i + 1]).iter().any(|e| mentions(e, t)))
                } else {
                    matches!(&b.term, Terminator::Cond { cond: Cond::Falsy(e), .. } if cond_use_is_first(e, t) || (free && mentions(e, t)))
                };
            if !foldable {
                // A single-use temporary whose use comes after definitions
                // that read no state and make only fresh values (`m = o.f;
                // box = {value: null}; m.call(o, box)`): those go before
                // it, where nothing can tell, and it folds into its use
                // (`o.f(box)`, which fails as the original call did when
                // `o.f` is no function). Not in a `try`, whose handler
                // would see the variables assigned early.
                if single && !in_try {
                    let value = op_value(&b.ops[i]);
                    let reads = |d: usize| value.as_ref().is_some_and(|v| mentions(v, d));
                    let mut j = i + 1;
                    while j < b.ops.len()
                        && op_def(&b.ops[j]).is_some_and(|d| d != t && !reads(d) && !keep.contains(&d))
                        && op_value(&b.ops[j]).is_some_and(|v| state_free(&v) && !mentions(&v, t))
                    {
                        j += 1;
                    }
                    let lands = if j < b.ops.len() {
                        use_is_first(&b.ops[j], t)
                    } else {
                        matches!(&b.term, Terminator::Cond { cond: Cond::Falsy(e), .. } if cond_use_is_first(e, t))
                    };
                    if j > i + 1 && lands {
                        b.ops[i..j].rotate_left(1);
                        i = j - 1;
                        continue;
                    }
                }
                i += 1;
                continue;
            }
            let mut value = op_value(&b.ops[i]);
            if i + 1 < b.ops.len() {
                for e in op_exprs_mut(&mut b.ops[i + 1]) {
                    substitute(e, t, &mut value);
                }
            } else if let Terminator::Cond { cond: Cond::Falsy(e), .. } = &mut b.term {
                substitute(e, t, &mut value);
            }
            assert!(value.is_none(), "internal: the read of a folded temporary was not found");
            b.ops.remove(i);
            uses.remove(&t);
            // The statement before may now fold into the merged one.
            i = i.saturating_sub(1);
        }
    }
}

/// Drop `x - 0` (ToNumber) where `x` is certainly a Number.
///
/// A variable is a Number when every definition of it assigns a Number
/// expression, found as the greatest fixpoint: start from every variable
/// defined only by assignments, drop any with a definition that is not a
/// Number expression given the rest, repeat. Parameters and other variables
/// bound from outside (`keep`) are unknown. `x - 0` is exactly `x` for a
/// Number (including `-0` and `NaN`); for a BigInt it would throw, which is
/// why a merely numeric operand does not qualify.
pub fn drop_number_coercions(prog: &mut Program<Op, Cond>, keep: &HashSet<usize>) {
    let num = number_vars(prog, keep);
    let int = int32_vars(prog, keep, &num);
    rewrite_program(prog, &num, &int);
}

/// The variables of `prog` that certainly hold 32-bit integers (every
/// definition an int32 expression, given the rest: the greatest fixpoint,
/// as for `number_vars`).
fn int32_vars(prog: &Program<Op, Cond>, keep: &HashSet<usize>, num: &HashSet<usize>) -> HashSet<usize> {
    let mut defs: HashMap<usize, Vec<Option<RExpr>>> = HashMap::new();
    collect_defs(prog, &mut defs);
    let mut int: HashSet<usize> = defs
        .iter()
        .filter(|(v, ds)| !keep.contains(v) && ds.iter().all(|d| d.is_some()))
        .map(|(v, _)| *v)
        .collect();
    loop {
        let drop: Vec<usize> = int.iter().copied().filter(|v| defs[v].iter().any(|d| !is_int32(d.as_ref().unwrap(), num, &int))).collect();
        if drop.is_empty() {
            break;
        }
        for v in drop {
            int.remove(&v);
        }
    }
    int
}

/// Is `e` certainly a 32-bit integer (when it evaluates without throwing):
/// an integer literal in range (not `-0`), a bitwise operator's result with
/// a Number operand (with two BigInts it is a BigInt; mixing throws), or
/// such a variable?
fn is_int32(e: &RExpr, num: &HashSet<usize>, int: &HashSet<usize>) -> bool {
    use crate::js::Bop;
    match e {
        RExpr::Num(n) => {
            let f = n.f();
            f.fract() == 0.0 && f >= -2147483648.0 && f <= 2147483647.0 && !(f == 0.0 && f.is_sign_negative())
        }
        RExpr::Var(v) => int.contains(v),
        RExpr::Bin(Bop::BitOr | Bop::BitAnd | Bop::BitXor | Bop::Shl | Bop::Shr, a, b) => {
            is_number(a, num) || is_number(b, num) || is_int32(a, num, int) || is_int32(b, num, int)
        }
        RExpr::Opaque(op, xs) => match (op.as_str(), xs.as_slice()) {
            ("?:", [_, a, b]) => is_int32(a, num, int) && is_int32(b, num, int),
            _ => false,
        },
        _ => false,
    }
}

/// The variables of `prog` that certainly hold Numbers (see
/// `drop_number_coercions`).
pub fn number_vars(prog: &Program<Op, Cond>, keep: &HashSet<usize>) -> HashSet<usize> {
    let mut defs: HashMap<usize, Vec<Option<RExpr>>> = HashMap::new();
    collect_defs(prog, &mut defs);
    let mut num: HashSet<usize> = defs
        .iter()
        .filter(|(v, ds)| !keep.contains(v) && ds.iter().all(|d| d.is_some()))
        .map(|(v, _)| *v)
        .collect();
    loop {
        let drop: Vec<usize> = num
            .iter()
            .copied()
            .filter(|v| defs[v].iter().any(|d| !is_number(d.as_ref().unwrap(), &num)))
            .collect();
        if drop.is_empty() {
            break;
        }
        for v in drop {
            num.remove(&v);
        }
    }
    num
}

/// Each variable's definitions: the assigned expression, or `None` for a
/// definition that is not an expression (a fresh object or array, a catch
/// binding).
fn collect_defs(prog: &Program<Op, Cond>, defs: &mut HashMap<usize, Vec<Option<RExpr>>>) {
    for b in &prog.blocks {
        for op in &b.ops {
            match op {
                Op::Assign { var, expr } | Op::Eval { dst: var, expr } => defs.entry(*var).or_default().push(Some(expr.clone())),
                Op::NewObject { dst, .. } | Op::NewArray { dst, .. } => defs.entry(*dst).or_default().push(None),
                Op::Try { body, catch_slot, catch_body, finally_body } => {
                    if let Some(c) = catch_slot {
                        defs.entry(*c).or_default().push(None);
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

/// The variables of `prog` whose every definition makes an object (a fresh
/// object or array, a `new`, a function, `Object.create`).
pub fn object_vars(prog: &Program<Op, Cond>) -> HashSet<usize> {
    fn walk(prog: &Program<Op, Cond>, yes: &mut HashSet<usize>, no: &mut HashSet<usize>) {
        for b in &prog.blocks {
            for op in &b.ops {
                match op {
                    Op::NewObject { dst, .. } | Op::NewArray { dst, .. } => {
                        yes.insert(*dst);
                    }
                    Op::Assign { var, expr } | Op::Eval { dst: var, expr } => {
                        if crate::js::makes_object(expr) {
                            yes.insert(*var);
                        } else {
                            no.insert(*var);
                        }
                    }
                    Op::Try { body, catch_slot, catch_body, finally_body } => {
                        if let Some(c) = catch_slot {
                            no.insert(*c);
                        }
                        walk(body, yes, no);
                        walk(catch_body, yes, no);
                        if let Some(f) = finally_body {
                            walk(f, yes, no);
                        }
                    }
                    _ => {}
                }
            }
        }
    }
    let (mut yes, mut no) = (HashSet::new(), HashSet::new());
    walk(prog, &mut yes, &mut no);
    yes.retain(|v| !no.contains(v));
    yes
}

/// Is `e` certainly a Number (when it evaluates without throwing)?
pub fn is_number(e: &RExpr, num: &HashSet<usize>) -> bool {
    use crate::js::Bop;
    match e {
        RExpr::Num(_) => true,
        RExpr::Var(v) => num.contains(v),
        // With a Number operand the result is a Number (mixing in a BigInt
        // throws); `>>>` never yields a BigInt.
        RExpr::Bin(Bop::UShr, _, _) => true,
        RExpr::Bin(Bop::Sub | Bop::Mul | Bop::Shl | Bop::Shr | Bop::BitAnd | Bop::BitOr | Bop::BitXor, a, b) => {
            is_number(a, num) || is_number(b, num)
        }
        RExpr::Bin(Bop::Add, a, b) => is_number(a, num) && is_number(b, num),
        RExpr::Opaque(op, xs) => match (op.as_str(), xs.as_slice()) {
            ("/" | "%" | "**", [a, b]) => is_number(a, num) || is_number(b, num),
            ("+", [_]) => true,
            ("-" | "~", [a]) => is_number(a, num),
            ("tonumeric" | "inc" | "dec", [a]) => is_number(a, num),
            ("?:", [_, a, b]) => is_number(a, num) && is_number(b, num),
            _ => false,
        },
        _ => false,
    }
}

fn rewrite(e: &mut RExpr, num: &HashSet<usize>, int: &HashSet<usize>) {
    use crate::js::Bop;
    for_each_child_mut(e, &mut |c| rewrite(c, num, int));
    // `e | 0` (ToInt32) of a 32-bit integer is `e`.
    if let RExpr::Bin(Bop::BitOr, a, b) = e {
        let zero = |x: &RExpr| matches!(x, RExpr::Num(n) if n.f() == 0.0);
        if zero(b) && is_int32(a, num, int) {
            *e = std::mem::replace(&mut **a, RExpr::Undef);
        } else if zero(a) && is_int32(b, num, int) {
            *e = std::mem::replace(&mut **b, RExpr::Undef);
        }
    }
    if let RExpr::Bin(Bop::Sub, a, b) = e {
        if matches!(&**b, RExpr::Num(n) if n.f() == 0.0 && !n.f().is_sign_negative()) && is_number(a, num) {
            *e = std::mem::replace(&mut **a, RExpr::Undef);
        }
    }
    // `++`/`--` (ToNumeric, then plus or minus one) of a Number is plain
    // arithmetic; an increment applies ToNumeric itself.
    if let RExpr::Opaque(op, xs) = e {
        if matches!(op.as_str(), "inc" | "dec") && xs.len() == 1 {
            if let RExpr::Opaque(inner, ys) = &mut xs[0] {
                if inner == "tonumeric" && ys.len() == 1 {
                    xs[0] = ys.pop().unwrap();
                }
            }
        }
        if matches!(op.as_str(), "tonumeric" | "inc" | "dec") && xs.len() == 1 && is_number(&xs[0], num) {
            let a = xs.pop().unwrap();
            *e = match op.as_str() {
                "inc" => RExpr::Bin(Bop::Add, Box::new(a), Box::new(RExpr::Num(crate::jsnum::JsNum::int(1)))),
                "dec" => RExpr::Bin(Bop::Sub, Box::new(a), Box::new(RExpr::Num(crate::jsnum::JsNum::int(1)))),
                _ => a,
            };
        }
    }
}

fn for_each_child_mut(e: &mut RExpr, f: &mut dyn FnMut(&mut RExpr)) {
    match e {
        RExpr::Num(_) | RExpr::Str(_) | RExpr::Bool(_) | RExpr::Undef | RExpr::Null | RExpr::This | RExpr::Var(_) | RExpr::Global(_) | RExpr::RegexLit(..) | RExpr::BigInt(_) | RExpr::NewFn { .. } | RExpr::Hole | RExpr::Verbatim(..) => {}
        RExpr::Bin(_, a, b) | RExpr::Index(a, b) => {
            f(a);
            f(b);
        }
        RExpr::Get(o, _) | RExpr::Yield(o) | RExpr::Await(o) | RExpr::Delete(o) | RExpr::OwnMember { obj: o, .. } => f(o),
        RExpr::ClassSrc { parent, caps, .. } => {
            if let Some(p) = parent {
                f(p);
            }
            caps.iter_mut().for_each(|x| f(x));
        }
        RExpr::Opaque(_, xs) | RExpr::FnRef { caps: xs, .. } | RExpr::ArrayLit(xs) => xs.iter_mut().for_each(|x| f(x)),
        RExpr::Call(c, xs) | RExpr::New(c, xs) => {
            f(c);
            xs.iter_mut().for_each(|x| f(x));
        }
        RExpr::BoundMethod { func, recv } => {
            f(func);
            f(recv);
        }
        RExpr::ObjectLit(fs) => fs.iter_mut().for_each(|(_, x)| f(x)),
    }
}

fn rewrite_program(prog: &mut Program<Op, Cond>, num: &HashSet<usize>, int: &HashSet<usize>) {
    for b in &mut prog.blocks {
        for op in b.ops.iter_mut() {
            if let Op::Try { body, catch_body, finally_body, .. } = op {
                rewrite_program(body, num, int);
                rewrite_program(catch_body, num, int);
                if let Some(f) = finally_body {
                    rewrite_program(f, num, int);
                }
            }
            for e in op_exprs_mut(op) {
                rewrite(e, num, int);
            }
        }
        if let Terminator::Cond { cond: Cond::Falsy(e), .. } = &mut b.term {
            rewrite(e, num, int);
        }
    }
}

/// Remove definitions nothing reads: one whose expression may have an effect
/// (a call, a read that may throw) keeps the evaluation as `Op::Effect`, any
/// other is deleted, which may leave further definitions unread; repeated to
/// a fixpoint.
///
/// `pure_call` says whether a call has no effect (a standard built-in such as
/// `Date.now()`), so an unread one is deleted like any pure expression; `num`
/// gives it the variables certainly holding Numbers.
/// `pure_call` also judges property reads (`Get`), given each variable's
/// single defining expression when it has one (`defs1`).
pub fn drop_dead_defs(
    prog: &mut Program<Op, Cond>,
    keep: &HashSet<usize>,
    pure_call: &dyn Fn(&RExpr, &HashSet<usize>, &HashMap<usize, RExpr>) -> bool,
) {
    loop {
        let mut defs: HashMap<usize, usize> = HashMap::new();
        let mut uses: HashMap<usize, usize> = HashMap::new();
        count_program(prog, &mut defs, &mut uses);
        let num = number_vars(prog, keep);
        let mut all: HashMap<usize, Vec<Option<RExpr>>> = HashMap::new();
        collect_defs(prog, &mut all);
        let defs1: HashMap<usize, RExpr> = all
            .into_iter()
            .filter_map(|(v, ds)| match ds.as_slice() {
                [Some(e)] => Some((v, e.clone())),
                _ => None,
            })
            .collect();
        // (Converting a value certainly an object runs its `valueOf`.)
        let objs = object_vars(prog);
        let is_object = |x: &RExpr| match x {
            RExpr::Var(v) => objs.contains(v),
            x => crate::js::makes_object(x),
        };
        // (So does converting a value of unknown type: it can throw, for a
        // Symbol, or run an object's `valueOf`.)
        let effect = |e: &RExpr| {
            has_effect(e, &|c| pure_call(c, &num, &defs1)) || crate::js::coerces_object(e, &is_object) || crate::js::converts_unknown(e)
        };
        let a = drop_dead_in(prog, keep, &uses, &effect);
        let b = drop_dead_stores(prog, keep, &effect);
        // (A statement run only for what it does, which does nothing.)
        let mut c = false;
        for blk in prog.blocks.iter_mut() {
            let before = blk.ops.len();
            blk.ops.retain(|op| !matches!(op, Op::Effect(e) if !effect(e)));
            c |= blk.ops.len() != before;
        }
        if !a && !b && !c {
            break;
        }
    }
}

/// May evaluating `e` have an effect (including throwing)? A call does unless
/// `pure_call` says otherwise and its parts have none.
fn has_effect(e: &RExpr, pure_call: &dyn Fn(&RExpr) -> bool) -> bool {
    match e {
        RExpr::Get(o, _) if pure_call(e) => has_effect(o, pure_call),
        RExpr::Call(c, xs) if pure_call(e) => {
            // The callee path (`Date.now`) and the arguments must be inert too.
            let callee_inert = matches!(&**c, RExpr::Global(_)) || matches!(&**c, RExpr::Get(o, _) if matches!(&**o, RExpr::Global(_)));
            !callee_inert || xs.iter().any(|x| has_effect(x, pure_call))
        }
        RExpr::New(c, xs) if pure_call(e) => has_effect(c, pure_call) || xs.iter().any(|x| has_effect(x, pure_call)),
        RExpr::Bin(_, a, b) => has_effect(a, pure_call) || has_effect(b, pure_call) || crate::js::throws_by_types(e),
        RExpr::Opaque(op, xs) => {
            op == "in" || op == "instanceof" || xs.iter().any(|x| has_effect(x, pure_call)) || crate::js::throws_by_types(e)
        }
        RExpr::ArrayLit(xs) | RExpr::FnRef { caps: xs, .. } => xs.iter().any(|x| has_effect(x, pure_call)),
        RExpr::ObjectLit(fs) => fs.iter().any(|(_, x)| has_effect(x, pure_call)),
        other => crate::js::may_throw(other),
    }
}

/// Hoist an operation both arms of a branch begin with (each arm entered
/// only from the branch) to just before the branch: a definition whose
/// value reads only variables and builds values (a function, a literal),
/// which the condition does not read. It then runs once on every path, as
/// it did, and is written once.
/// A value that reads no state and makes only fresh values: variables,
/// literals, functions, literals of these.
fn state_free(e: &RExpr) -> bool {
    match e {
        RExpr::Var(_) | RExpr::Num(_) | RExpr::Str(_) | RExpr::Bool(_) | RExpr::Undef | RExpr::Null | RExpr::BigInt(_) | RExpr::This => true,
        RExpr::NewFn { .. } | RExpr::Verbatim(..) | RExpr::Hole | RExpr::RegexLit(..) => true,
        RExpr::FnRef { caps, .. } => caps.iter().all(state_free),
        RExpr::ArrayLit(xs) => xs.iter().all(state_free),
        RExpr::ObjectLit(fs) => fs.iter().all(|(_, x)| state_free(x)),
        _ => false,
    }
}

pub fn hoist_common_prefix(prog: &mut Program<Op, Cond>) {
    use crate::coalesce::{rexpr_vars, succs};
    fn same_def(a: &Op, b: &Op) -> Option<usize> {
        match (a, b) {
            (Op::Assign { var: v1, expr: e1 }, Op::Assign { var: v2, expr: e2 }) | (Op::Eval { dst: v1, expr: e1 }, Op::Eval { dst: v2, expr: e2 })
                if v1 == v2 && e1 == e2 && state_free(e1) =>
            {
                Some(*v1)
            }
            (Op::NewObject { dst: v1, fields: f1 }, Op::NewObject { dst: v2, fields: f2 }) if v1 == v2 && f1 == f2 && f1.iter().all(|(_, x)| state_free(x)) => {
                Some(*v1)
            }
            (Op::NewArray { dst: v1, elems: e1 }, Op::NewArray { dst: v2, elems: e2 }) if v1 == v2 && e1 == e2 && e1.iter().all(state_free) => Some(*v1),
            _ => None,
        }
    }
    loop {
        let mut preds = vec![0usize; prog.blocks.len()];
        for b in &prog.blocks {
            for s in succs(&b.term) {
                preds[s] += 1;
            }
        }
        preds[prog.entry.0] += 1;
        let mut changed = false;
        for bi in 0..prog.blocks.len() {
            let (t, f, cond_vars) = match &prog.blocks[bi].term {
                Terminator::Cond { cond: Cond::Falsy(e), t, f } if t != f => {
                    let mut vs = Vec::new();
                    rexpr_vars(e, &mut vs);
                    (t.0, f.0, vs)
                }
                _ => continue,
            };
            if preds[t] != 1 || preds[f] != 1 || t == bi || f == bi {
                continue;
            }
            let def = match (prog.blocks[t].ops.first(), prog.blocks[f].ops.first()) {
                (Some(a), Some(b)) => same_def(a, b),
                _ => None,
            };
            let Some(def) = def else { continue };
            if cond_vars.contains(&def) {
                continue;
            }
            let op = prog.blocks[t].ops.remove(0);
            prog.blocks[f].ops.remove(0);
            prog.blocks[bi].ops.push(op);
            changed = true;
        }
        if !changed {
            break;
        }
    }
}

/// Drop each definition whose variable is not live after it (no path from
/// it reads the variable before redefining it): a variable read on one path
/// out of a join need not be written on another. Keeps the value's effect.
/// (Not done in a program with a residual `try`.)
fn drop_dead_stores(prog: &mut Program<Op, Cond>, keep: &HashSet<usize>, effect: &dyn Fn(&RExpr) -> bool) -> bool {
    use crate::coalesce::{op_uses_def, succs, term_uses};
    let mut info: Vec<Vec<(Vec<usize>, Option<usize>)>> = Vec::with_capacity(prog.blocks.len());
    for b in &prog.blocks {
        let mut v = Vec::with_capacity(b.ops.len());
        for op in &b.ops {
            match op_uses_def(op) {
                Some(x) => v.push(x),
                None => return false,
            }
        }
        info.push(v);
    }
    let nb = prog.blocks.len();
    let mut live_in: Vec<HashSet<usize>> = vec![HashSet::new(); nb];
    let live_out = |bi: usize, live_in: &Vec<HashSet<usize>>, prog: &Program<Op, Cond>| {
        let mut live: HashSet<usize> = HashSet::new();
        for s in succs(&prog.blocks[bi].term) {
            live.extend(live_in[s].iter().copied());
        }
        live.extend(term_uses(&prog.blocks[bi].term));
        live
    };
    let mut changed = true;
    while changed {
        changed = false;
        for bi in (0..nb).rev() {
            let mut live = live_out(bi, &live_in, prog);
            for (uses, def) in info[bi].iter().rev() {
                if let Some(d) = def {
                    live.remove(d);
                }
                live.extend(uses.iter().copied());
            }
            if live.len() != live_in[bi].len() || !live.is_subset(&live_in[bi]) {
                live_in[bi].extend(live);
                changed = true;
            }
        }
    }
    let mut dropped = false;
    for bi in 0..nb {
        let mut live = live_out(bi, &live_in, prog);
        let ops = std::mem::take(&mut prog.blocks[bi].ops);
        let mut kept: Vec<Op> = Vec::with_capacity(ops.len());
        for (op, (uses, def)) in ops.into_iter().zip(info[bi].iter()).rev() {
            if let Some(d) = def {
                if !keep.contains(d) && !live.contains(d) {
                    dropped = true;
                    let value = op_value(&op).expect("a definition has a value");
                    if effect(&value) {
                        let mut vs = Vec::new();
                        crate::coalesce::rexpr_vars(&value, &mut vs);
                        live.extend(vs);
                        kept.push(Op::Effect(value));
                    }
                    continue;
                }
                live.remove(d);
            }
            live.extend(uses.iter().copied());
            kept.push(op);
        }
        kept.reverse();
        prog.blocks[bi].ops = kept;
    }
    dropped
}

fn drop_dead_in(prog: &mut Program<Op, Cond>, keep: &HashSet<usize>, uses: &HashMap<usize, usize>, effect: &dyn Fn(&RExpr) -> bool) -> bool {
    let mut changed = false;
    for b in &mut prog.blocks {
        let ops = std::mem::take(&mut b.ops);
        for mut op in ops {
            if let Op::Try { body, catch_body, finally_body, .. } = &mut op {
                changed |= drop_dead_in(body, keep, uses, effect);
                changed |= drop_dead_in(catch_body, keep, uses, effect);
                if let Some(f) = finally_body {
                    changed |= drop_dead_in(f, keep, uses, effect);
                }
            }
            let dead = op_def(&op).is_some_and(|t| !keep.contains(&t) && !uses.contains_key(&t));
            if !dead {
                b.ops.push(op);
                continue;
            }
            changed = true;
            let value = op_value(&op).expect("a definition has a value");
            if effect(&value) {
                b.ops.push(Op::Effect(value));
            }
        }
    }
    changed
}

/// Replace every `BoundMethod { func, recv }` that is a value by `func`: as a
/// value it is `func`, so its `recv` is not a read. (One called stays, a
/// call of `func` with `recv` as `this`: see `js::bound_call`.)
pub fn strip_bound_methods(prog: &mut Program<Op, Cond>) {
    fn strip(e: &mut RExpr) {
        // (A call of one keeps it: see `js::bound_call`.)
        if let RExpr::Call(c, xs) = e {
            if let RExpr::BoundMethod { func, recv } = &mut **c {
                strip(func);
                strip(recv);
                xs.iter_mut().for_each(strip);
                return;
            }
        }
        if let RExpr::BoundMethod { func, .. } = e {
            *e = std::mem::replace(&mut **func, RExpr::Undef);
            strip(e);
            return;
        }
        for_each_child_mut(e, &mut strip);
    }
    for b in &mut prog.blocks {
        for op in b.ops.iter_mut() {
            if let Op::Try { body, catch_body, finally_body, .. } = op {
                strip_bound_methods(body);
                strip_bound_methods(catch_body);
                if let Some(f) = finally_body {
                    strip_bound_methods(f);
                }
            }
            for e in op_exprs_mut(op) {
                strip(e);
            }
        }
        if let Terminator::Cond { cond: Cond::Falsy(e), .. } = &mut b.term {
            strip(e);
        }
    }
}

/// Propagate and fold literal values. A variable the function defines once,
/// in its entry block before any read of it there, to a primitive literal
/// holds that literal at every read; then operators over literals fold
/// (`true ? a : b`, `!false`, `{} == null`, `typeof 1`, `1 === 1`) and a
/// branch on a literal goes its one way. (The definitions stay, for
/// `drop_dead_defs`.) Whether anything changed.
pub fn fold_literals(prog: &mut Program<Op, Cond>, keep: &HashSet<usize>) -> bool {
    let mut ndefs: HashMap<usize, usize> = HashMap::new();
    fn count_defs(prog: &Program<Op, Cond>, n: &mut HashMap<usize, usize>) {
        for b in &prog.blocks {
            for op in &b.ops {
                if let Some(d) = op_def(op) {
                    *n.entry(d).or_insert(0) += 1;
                }
                if let Op::Try { body, catch_body, finally_body, .. } = op {
                    count_defs(body, n);
                    count_defs(catch_body, n);
                    if let Some(f) = finally_body {
                        count_defs(f, n);
                    }
                }
            }
        }
    }
    count_defs(prog, &mut ndefs);
    let mut consts: HashMap<usize, RExpr> = HashMap::new();
    // (Variables certainly holding an object: truthy, never nullish.)
    let mut objs: HashSet<usize> = HashSet::new();
    let mut read: HashSet<usize> = HashSet::new();
    for op in &prog.blocks[prog.entry.0].ops {
        for e in op_exprs(op) {
            visit(e, &mut |x| {
                if let RExpr::Var(v) = x {
                    read.insert(*v);
                }
            });
        }
        if let Op::Assign { var, expr } | Op::Eval { dst: var, expr } = op {
            if ndefs.get(var) == Some(&1) && !keep.contains(var) && !read.contains(var) {
                if matches!(expr, RExpr::ObjectLit(_) | RExpr::ArrayLit(_) | RExpr::New(..)) {
                    objs.insert(*var);
                } else if literal_truthy(expr).is_some() {
                    consts.insert(*var, expr.clone());
                }
            }
        }
        if let Op::NewObject { dst, .. } | Op::NewArray { dst, .. } = op {
            if ndefs.get(dst) == Some(&1) && !keep.contains(dst) && !read.contains(dst) {
                objs.insert(*dst);
            }
        }
        if matches!(op, Op::Try { .. }) {
            break;
        }
    }
    let mut changed = false;
    // (The variables certainly holding integers, for `combine_int_arith`;
    // those certainly holding Numbers, whose arithmetic does nothing but
    // compute.)
    let num = number_vars(prog, keep);
    let mut ints = int32_vars(prog, keep, &num);
    INT_VARS.with(|v| *v.borrow_mut() = ints.clone());
    // (And those defined once, as an integer of at most 32 bits: `x >>> 0`.)
    for b in prog.blocks.iter() {
        for op in &b.ops {
            if let Op::Assign { var, expr } | Op::Eval { dst: var, expr } = op {
                if ndefs.get(var) == Some(&1) && !keep.contains(var) && wrapped_int(expr) {
                    ints.insert(*var);
                    INT_VARS.with(|v| v.borrow_mut().insert(*var));
                }
            }
        }
    }
    fn only_computes(e: &RExpr, num: &HashSet<usize>) -> bool {
        match e {
            RExpr::Num(_) => true,
            RExpr::Var(v) => num.contains(v),
            RExpr::Bin(_, a, b) => only_computes(a, num) && only_computes(b, num),
            _ => false,
        }
    }
    for b in prog.blocks.iter_mut() {
        for op in b.ops.iter_mut() {
            for e in op_exprs_mut(op) {
                changed |= subst_consts(e, &consts);
                changed |= fold_expr(e, &objs);
            }
        }
        // (A statement evaluated only for what it does, now a literal, or
        // arithmetic on Numbers, does nothing.)
        let before = b.ops.len();
        b.ops.retain(|op| !matches!(op, Op::Effect(e) if (pure_literal(e) && !matches!(e, RExpr::Var(_))) || (matches!(e, RExpr::Bin(..)) && only_computes(e, &num))));
        changed |= b.ops.len() != before;
        if let Terminator::Cond { cond: Cond::Falsy(e), t, f } = &mut b.term {
            changed |= subst_consts(e, &consts);
            changed |= fold_expr(e, &objs);
            if let (Some(truth), true) = (literal_truthy_in(e, &objs), pure_literal(e)) {
                b.term = Terminator::Br(if truth { *f } else { *t });
                changed = true;
            }
        }
    }
    INT_VARS.with(|v| v.borrow_mut().clear());
    changed
}

thread_local! {
    /// The variables of the function `fold_literals` is at work on that
    /// certainly hold 32-bit integers (see `wrapped_int`).
    static INT_VARS: std::cell::RefCell<HashSet<usize>> = std::cell::RefCell::new(HashSet::new());
}

fn subst_consts(e: &mut RExpr, consts: &HashMap<usize, RExpr>) -> bool {
    if consts.is_empty() {
        return false;
    }
    if let RExpr::Var(v) = e {
        if let Some(c) = consts.get(v) {
            *e = c.clone();
            return true;
        }
        return false;
    }
    let mut changed = false;
    for_each_child_mut(e, &mut |c| changed |= subst_consts(c, consts));
    changed
}

/// The truthiness of a literal (an object or array literal is truthy).
fn literal_truthy(e: &RExpr) -> Option<bool> {
    Some(match e {
        RExpr::Num(n) => n.truthy(),
        RExpr::Str(s) => !s.is_empty(),
        RExpr::Bool(b) => *b,
        RExpr::Undef | RExpr::Null => false,
        RExpr::ObjectLit(_) | RExpr::ArrayLit(_) => true,
        _ => return None,
    })
}

/// `literal_truthy`, where a variable of `objs` holds an object.
fn literal_truthy_in(e: &RExpr, objs: &HashSet<usize>) -> Option<bool> {
    match e {
        RExpr::Var(v) if objs.contains(v) => Some(true),
        e => literal_truthy(e),
    }
}

/// A literal whose evaluation does nothing but make its value.
fn pure_literal(e: &RExpr) -> bool {
    match e {
        RExpr::Num(_) | RExpr::Str(_) | RExpr::Bool(_) | RExpr::Undef | RExpr::Null | RExpr::Var(_) | RExpr::Hole => true,
        RExpr::ObjectLit(fs) => fs.iter().all(|(_, x)| pure_literal(x)),
        RExpr::ArrayLit(xs) => xs.iter().all(pure_literal),
        _ => false,
    }
}

fn prim_strict_eq(a: &RExpr, b: &RExpr) -> Option<bool> {
    Some(match (a, b) {
        (RExpr::Num(x), RExpr::Num(y)) => x.f() == y.f(),
        (RExpr::Str(x), RExpr::Str(y)) => x == y,
        (RExpr::Bool(x), RExpr::Bool(y)) => x == y,
        (RExpr::Undef, RExpr::Undef) | (RExpr::Null, RExpr::Null) => true,
        (RExpr::Num(_) | RExpr::Str(_) | RExpr::Bool(_) | RExpr::Undef | RExpr::Null, RExpr::Num(_) | RExpr::Str(_) | RExpr::Bool(_) | RExpr::Undef | RExpr::Null) => false,
        _ => return None,
    })
}

/// Fold operators over literals in `e` (children first).
fn fold_expr(e: &mut RExpr, objs: &HashSet<usize>) -> bool {
    let mut changed = false;
    for_each_child_mut(e, &mut |c| changed |= fold_expr(c, objs));
    while let Some(r) = combine_int_arith(e).or_else(|| combine_strings(e)) {
        *e = r;
        changed = true;
    }
    let literal_truthy = |x: &RExpr| literal_truthy_in(x, objs);
    let folded = match e {
        RExpr::Opaque(op, xs) => match (op.as_str(), xs.as_mut_slice()) {
            ("?:", [c, x, y]) if pure_literal(c) => literal_truthy(c).map(|t| if t { x.clone() } else { y.clone() }),
            ("!", [c]) if pure_literal(c) => literal_truthy(c).map(|t| RExpr::Bool(!t)),
            ("&&", [a, b]) if pure_literal(a) => literal_truthy(a).map(|t| if t { b.clone() } else { a.clone() }),
            ("||", [a, b]) if pure_literal(a) => literal_truthy(a).map(|t| if t { a.clone() } else { b.clone() }),
            ("==" | "!=", [a, b]) if pure_literal(a) && pure_literal(b) => {
                let nullish = |x: &RExpr| matches!(x, RExpr::Null | RExpr::Undef);
                let object = |x: &RExpr| matches!(x, RExpr::ObjectLit(_) | RExpr::ArrayLit(_)) || matches!(x, RExpr::Var(v) if objs.contains(v));
                let r = if nullish(a) && nullish(b) {
                    Some(true)
                } else if (nullish(a) && (object(b) || prim_strict_eq(b, b).is_some())) || (nullish(b) && (object(a) || prim_strict_eq(a, a).is_some())) {
                    Some(false)
                } else {
                    None
                };
                r.map(|r| RExpr::Bool(if op == "==" { r } else { !r }))
            }
            ("typeof", [x]) => match x {
                RExpr::Num(_) => Some(RExpr::Str("number".into())),
                RExpr::Str(_) => Some(RExpr::Str("string".into())),
                RExpr::Bool(_) => Some(RExpr::Str("boolean".into())),
                RExpr::Undef => Some(RExpr::Str("undefined".into())),
                RExpr::Null => Some(RExpr::Str("object".into())),
                RExpr::ObjectLit(_) | RExpr::ArrayLit(_) if pure_literal(x) => Some(RExpr::Str("object".into())),
                _ => None,
            },
            _ => None,
        },
        RExpr::Bin(op @ (crate::js::Bop::Eq | crate::js::Bop::Ne), a, b) => {
            prim_strict_eq(a, b).map(|r| RExpr::Bool(if *op == crate::js::Bop::Eq { r } else { !r }))
        }
        // A string literal's length.
        RExpr::Get(o, k) if k == "length" && matches!(&**o, RExpr::Str(_)) => {
            let RExpr::Str(x) = &**o else { unreachable!() };
            Some(RExpr::Num(crate::jsnum::JsNum::int(x.encode_utf16().count() as i64)))
        }
        // Arithmetic and concatenation of literals.
        RExpr::Bin(op, a, b) => {
            use crate::js::Bop;
            use crate::jsnum::JsNum;
            match (*op, &**a, &**b) {
                (Bop::Add, RExpr::Num(x), RExpr::Num(y)) => Some(RExpr::Num(JsNum::new(x.f() + y.f()))),
                (Bop::Sub, RExpr::Num(x), RExpr::Num(y)) => Some(RExpr::Num(JsNum::new(x.f() - y.f()))),
                (Bop::Mul, RExpr::Num(x), RExpr::Num(y)) => Some(RExpr::Num(JsNum::new(x.f() * y.f()))),
                (Bop::Add, RExpr::Str(x), RExpr::Str(y)) => Some(RExpr::Str(format!("{x}{y}"))),
                (Bop::Add, RExpr::Str(x), RExpr::Num(y)) => Some(RExpr::Str(format!("{x}{}", y.to_js_string()))),
                (Bop::Add, RExpr::Num(x), RExpr::Str(y)) => Some(RExpr::Str(format!("{}{y}", x.to_js_string()))),
                (Bop::Lt | Bop::Le | Bop::Gt | Bop::Ge, RExpr::Num(x), RExpr::Num(y)) => Some(RExpr::Bool(match op {
                    Bop::Lt => x.f() < y.f(),
                    Bop::Le => x.f() <= y.f(),
                    Bop::Gt => x.f() > y.f(),
                    _ => x.f() >= y.f(),
                })),
                _ => None,
            }
        }
        _ => None,
    };
    if let Some(f) = folded {
        *e = f;
        changed = true;
    }
    changed
}

/// Trailing holes of an array literal the next operation gives a length
/// at least as long (`a = [1, , 3, , ,]; a.length = 100`) are not written:
/// the length makes them.
pub fn trim_holes_before_length(prog: &mut Program<Op, Cond>) {
    let mut preds = vec![0usize; prog.blocks.len()];
    for b in &prog.blocks {
        for t in crate::coalesce::succs(&b.term) {
            preds[t] += 1;
        }
    }
    preds[prog.entry.0] += 1;
    // The operation after op `i` of block `bi` (in the next block when `i`
    // ends a block that jumps to one only it enters).
    let next_len = |prog: &Program<Op, Cond>, bi: usize, i: usize| -> Option<(usize, usize)> {
        let op = if i + 1 < prog.blocks[bi].ops.len() {
            &prog.blocks[bi].ops[i + 1]
        } else {
            match &prog.blocks[bi].term {
                Terminator::Br(t) if preds[t.0] == 1 => prog.blocks[t.0].ops.first()?,
                _ => return None,
            }
        };
        match op {
            Op::SetProp { obj: RExpr::Var(v), key, val: RExpr::Num(n) } if key == "length" => n.as_index().map(|l| (*v, l)),
            _ => None,
        }
    };
    for bi in 0..prog.blocks.len() {
        for i in 0..prog.blocks[bi].ops.len() {
            let Some((v, l)) = next_len(prog, bi, i) else { continue };
            let elems = match &mut prog.blocks[bi].ops[i] {
                Op::NewArray { dst, elems } if *dst == v => elems,
                Op::Eval { dst, expr: RExpr::ArrayLit(elems) } | Op::Assign { var: dst, expr: RExpr::ArrayLit(elems) } if *dst == v => elems,
                _ => continue,
            };
            if l >= elems.len() {
                while matches!(elems.last(), Some(RExpr::Hole)) {
                    elems.pop();
                }
            }
        }
    }
}

/// `t = g; t.k = t.k OP e` for a global `g` (read once): `g.k = g.k OP e`,
/// which codegen writes `g.k OP= e`, reading `g` once too.
pub fn fold_global_base(prog: &mut Program<Op, Cond>, keep: &HashSet<usize>) {
    let mut defs: HashMap<usize, usize> = HashMap::new();
    let mut uses: HashMap<usize, usize> = HashMap::new();
    count_program(prog, &mut defs, &mut uses);
    for b in prog.blocks.iter_mut() {
        let mut i = 0;
        while i + 1 < b.ops.len() {
            let fold = match (&b.ops[i], &b.ops[i + 1]) {
                (Op::Eval { dst: t, expr: g @ RExpr::Global(_) } | Op::Assign { var: t, expr: g @ RExpr::Global(_) }, Op::SetProp { obj: RExpr::Var(o), key, val: RExpr::Bin(op, a, rhs) })
                    if o == t
                        && !keep.contains(t)
                        && defs.get(t) == Some(&1)
                        && uses.get(t) == Some(&2)
                        && matches!(&**a, RExpr::Get(x, k) if matches!(&**x, RExpr::Var(v) if v == t) && k == key)
                        && !mentions(rhs, *t) =>
                {
                    Some(Op::SetProp {
                        obj: g.clone(),
                        key: key.clone(),
                        val: RExpr::Bin(*op, Box::new(RExpr::Get(Box::new(g.clone()), key.clone())), rhs.clone()),
                    })
                }
                _ => None,
            };
            if let Some(op) = fold {
                b.ops[i + 1] = op;
                b.ops.remove(i);
            } else {
                i += 1;
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Integer arithmetic under a wrap.
// ---------------------------------------------------------------------------

/// An integer literal of at most 32 bits: sums of a few of them, and of one
/// with a 32-bit integer, are exact (far below 2^53).
fn small_int(e: &RExpr) -> Option<i64> {
    let RExpr::Num(n) = e else { return None };
    let f = n.f();
    (f.fract() == 0.0 && f.abs() <= 4294967296.0 && !(f == 0.0 && f.is_sign_negative())).then_some(f as i64)
}

/// Is `e` certainly an integer-valued Number of small magnitude when it
/// evaluates without throwing: a small integer literal, a bitwise
/// operator's result with a Number literal operand (with two BigInts it
/// would be a BigInt; mixing throws), or such a value plus or minus a small
/// integer literal? (Its value is then exact, and so is that of adding a
/// small integer to it.)
fn wrapped_int(e: &RExpr) -> bool {
    use crate::js::Bop;
    match e {
        RExpr::Num(_) => small_int(e).is_some(),
        // (A variable every definition of which is a 32-bit integer.)
        RExpr::Var(v) => INT_VARS.with(|s| s.borrow().contains(v)),
        RExpr::Bin(Bop::BitOr | Bop::BitAnd | Bop::BitXor | Bop::Shl | Bop::Shr | Bop::UShr, a, b) => {
            matches!(&**a, RExpr::Num(_)) || matches!(&**b, RExpr::Num(_)) || wrapped_int(a) || wrapped_int(b)
        }
        RExpr::Bin(Bop::Add | Bop::Sub, a, b) => wrapped_int(a) && small_int(b).is_some(),
        _ => false,
    }
}

/// `e` as `base + c` for a small integer literal `c` (`base - c` as `base +
/// -c`), when `base` is an integer (`wrapped_int`).
fn int_plus(e: &RExpr) -> Option<(&RExpr, i64)> {
    use crate::js::Bop;
    match e {
        RExpr::Bin(op @ (Bop::Add | Bop::Sub), a, b) if wrapped_int(a) => {
            let c = small_int(b)?;
            Some((a, if *op == Bop::Add { c } else { -c }))
        }
        _ => None,
    }
}

/// `base + c`, written `base - |c|` for a negative `c` and `base` for zero.
fn plus_int(base: RExpr, c: i64) -> RExpr {
    use crate::js::Bop;
    use crate::jsnum::JsNum;
    match c {
        0 => base,
        c if c < 0 => RExpr::Bin(Bop::Sub, Box::new(base), Box::new(RExpr::Num(JsNum::int(-c)))),
        c => RExpr::Bin(Bop::Add, Box::new(base), Box::new(RExpr::Num(JsNum::int(c)))),
    }
}

/// A reduction of an integer modulo a power of two (what storing into a
/// typed array, or asm.js-style code, applies to every value): `x & (2^k -
/// 1)`, `x << n >> n`, `x | 0`, `x >>> 0`. The operand, and the bits kept
/// (`k`, signed or not).
#[derive(PartialEq, Clone, Copy)]
enum Wrap {
    Mask(u32),
    Signed(u32),
    Unsigned32,
}

fn as_wrap(e: &RExpr) -> Option<(Wrap, &RExpr)> {
    use crate::js::Bop;
    match e {
        RExpr::Bin(Bop::BitAnd, x, m) => {
            let m = small_int(m)?;
            (m > 0 && (m + 1) & m == 0).then(|| (Wrap::Mask((m + 1).trailing_zeros()), &**x))
        }
        RExpr::Bin(Bop::BitOr, x, z) if small_int(z) == Some(0) => Some((Wrap::Signed(32), x)),
        RExpr::Bin(Bop::UShr, x, z) if small_int(z) == Some(0) => Some((Wrap::Unsigned32, x)),
        RExpr::Bin(Bop::Shr, inner, n) => {
            let n = small_int(n)?;
            match &**inner {
                RExpr::Bin(Bop::Shl, x, n2) if small_int(n2) == Some(n) && (1..32).contains(&n) => Some((Wrap::Signed(32 - n as u32), x)),
                _ => None,
            }
        }
        _ => None,
    }
}

/// The largest constant a combination makes (sums stay exact).
const MAX_COMBINED: i64 = 1 << 40;

/// Combine integer arithmetic at the root of `e` (its operands taken as
/// already combined), when that changes nothing it computes:
///
/// - `(u + c1) + c2` is `u + (c1 + c2)` for an integer `u` and small integer
///   literals: every sum is exact.
/// - `W(W(t) + c)` is `W(t + c)` for a reduction `W` modulo a power of two
///   and an integer `t`: reducing first changes the sum by a multiple of
///   that power, which the outer reduction drops. (`& 255` after `& 65535`
///   likewise: the inner one keeps every bit the outer one keeps.)
///
/// So the increments an unrolled loop applies to a byte, `((b & 255) + 1 &
/// 255) + 1 & 255`, are one: `(b & 255) + 2 & 255`. The innermost
/// reduction stays unless its operand is an integer: it is what makes
/// `b` one (`b` may be a fraction, a string, an object with a `valueOf`).
/// `None` when nothing combines.
pub fn combine_int_arith(e: &RExpr) -> Option<RExpr> {
    use crate::js::Bop;
    // `(u + c1) + c2`.
    if let RExpr::Bin(op @ (Bop::Add | Bop::Sub), a, b) = e {
        if let (Some((u, c1)), Some(c2)) = (int_plus(a), small_int(b)) {
            let c = c1 + if *op == Bop::Add { c2 } else { -c2 };
            if c.abs() <= MAX_COMBINED {
                return Some(plus_int(u.clone(), c));
            }
        }
        return None;
    }
    // `W(W'(t) + c)`, `W(W'(t))`.
    let (w, operand) = as_wrap(e)?;
    let (inner, c) = match int_plus(operand) {
        Some((x, c)) => (x, c),
        None => (operand, 0),
    };
    let (w2, t) = as_wrap(inner)?;
    // (The inner reduction keeps what the outer one does.)
    let keeps = match (w, w2) {
        (Wrap::Mask(k), Wrap::Mask(k2)) => k2 >= k,
        (Wrap::Mask(k), Wrap::Signed(k2)) => k2 >= k,
        (Wrap::Mask(_), Wrap::Unsigned32) => true,
        (Wrap::Signed(k), Wrap::Signed(k2)) => k2 >= k,
        (Wrap::Signed(k), Wrap::Mask(k2)) => k2 >= k,
        (Wrap::Signed(_), Wrap::Unsigned32) => true,
        (Wrap::Unsigned32, Wrap::Unsigned32) => true,
        (Wrap::Unsigned32, Wrap::Signed(32)) => true,
        (Wrap::Unsigned32, _) => false,
    };
    if !keeps {
        return None;
    }
    // (The inner reduction goes only from an integer: then `t + c` is the
    // exact sum, congruent to the reduced one's. From anything else it is
    // the conversion to one. A reduction applied twice is applied once.)
    let sum = if wrapped_int(t) {
        let (base, c0) = int_plus(t).unwrap_or((t, 0));
        let total = c0 + c;
        if total.abs() > MAX_COMBINED {
            return None;
        }
        // (Any constant congruent to the total does: the one nearest zero.)
        let bits = match w {
            Wrap::Mask(k) | Wrap::Signed(k) => k,
            Wrap::Unsigned32 => 32,
        };
        let m = 1i64 << bits;
        let mut total = total.rem_euclid(m);
        if total > m / 2 {
            total -= m;
        }
        plus_int(base.clone(), total)
    } else if c == 0 && w == w2 {
        return Some(inner.clone());
    } else {
        return None;
    };
    Some(rewrap(e, sum))
}

/// `e`'s reduction (see `as_wrap`), of `operand`.
fn rewrap(e: &RExpr, operand: RExpr) -> RExpr {
    use crate::js::Bop;
    match e {
        RExpr::Bin(Bop::Shr, inner, n) => match &**inner {
            RExpr::Bin(Bop::Shl, _, n2) => RExpr::Bin(Bop::Shr, Box::new(RExpr::Bin(Bop::Shl, Box::new(operand), n2.clone())), n.clone()),
            _ => unreachable!("a sign extension is a shift left then right"),
        },
        RExpr::Bin(op, _, m) => RExpr::Bin(*op, Box::new(operand), m.clone()),
        _ => unreachable!("a reduction is a binary operator"),
    }
}

/// `combine_int_arith`, everywhere in `e` (operands first). Whether anything
/// changed.
pub fn combine_int_arith_deep(e: &mut RExpr) -> bool {
    let mut changed = false;
    for_each_child_mut(e, &mut |c| changed |= combine_int_arith_deep(c));
    while let Some(r) = combine_int_arith(e) {
        *e = r;
        changed = true;
    }
    changed
}

// ---------------------------------------------------------------------------
// String concatenation.
// ---------------------------------------------------------------------------

/// Is `e` certainly a string when it evaluates without throwing: a string
/// literal, a template's conversion, or a `+` with such an operand (which
/// then concatenates)?
fn is_string(e: &RExpr) -> bool {
    use crate::js::Bop;
    match e {
        RExpr::Str(_) => true,
        RExpr::Opaque(op, xs) => match (op.as_str(), xs.as_slice()) {
            (crate::js::TEMPLATE_TO_STRING, [_]) => true,
            ("?:", [_, a, b]) => is_string(a) && is_string(b),
            _ => false,
        },
        RExpr::Bin(Bop::Add, a, b) => is_string(a) || is_string(b),
        _ => false,
    }
}

/// Combine string concatenation at the root of `e` (its operands taken as
/// already combined), when that changes nothing it computes:
///
/// - `"" + s` and `s + ""` are `s`, and a template's conversion of `s` is
///   `s`, for a string `s`: nothing is converted, nothing is added.
/// - `(x + "a") + "b"` is `x + "ab"`: the left operand is a string once `x +
///   "a"` is, so the second `+` appends.
///
/// `None` when nothing combines.
pub fn combine_strings(e: &RExpr) -> Option<RExpr> {
    use crate::js::Bop;
    match e {
        RExpr::Opaque(op, xs) if op == crate::js::TEMPLATE_TO_STRING && xs.len() == 1 && is_string(&xs[0]) => Some(xs[0].clone()),
        RExpr::Bin(Bop::Add, a, b) => match (&**a, &**b) {
            (RExpr::Str(x), RExpr::Str(y)) => Some(RExpr::Str(format!("{x}{y}"))),
            (RExpr::Str(x), s) if x.is_empty() && is_string(s) => Some(s.clone()),
            (s, RExpr::Str(y)) if y.is_empty() && is_string(s) => Some(s.clone()),
            (RExpr::Bin(Bop::Add, x, mid), RExpr::Str(y)) => match &**mid {
                RExpr::Str(m) => Some(RExpr::Bin(Bop::Add, x.clone(), Box::new(RExpr::Str(format!("{m}{y}"))))),
                _ => None,
            },
            _ => None,
        },
        _ => None,
    }
}
