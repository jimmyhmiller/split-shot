//! Residual variable coalescing for the JS client's residual programs.
//!
//! Specialization names residual variables by where they come from (a slot, a
//! call site, a heap field), so a residual function can declare hundreds of
//! them even though few are live at once. Every declared variable costs a slot
//! in the JavaScript engine's stack frame, which matters for deep recursion
//! (a browser worker's stack is small), and the names are hard to read.
//!
//! This pass computes liveness over the residual CFG, builds the interference
//! graph (two variables interfere when one is assigned while the other is
//! live), colors it greedily, and renames every variable to `1 + color`. Kept
//! variables (parameters, the input, `arguments`) are left alone and no new
//! name collides with them. A function containing a residual `try` is left
//! unchanged: an exception can leave the protected body from any operation, and
//! that edge is not modeled here.

use std::collections::{HashMap, HashSet};

use crate::js::{Cond, Op, RExpr};
use crate::residual::{Program, Terminator};

pub(crate) fn rexpr_vars(e: &RExpr, out: &mut Vec<usize>) {
    match e {
        RExpr::Var(v) => out.push(*v),
        RExpr::Bin(_, a, b) | RExpr::Index(a, b) => {
            rexpr_vars(a, out);
            rexpr_vars(b, out);
        }
        RExpr::Get(o, _) => rexpr_vars(o, out),
        RExpr::Opaque(_, xs) => xs.iter().for_each(|x| rexpr_vars(x, out)),
        RExpr::Call(c, xs) | RExpr::New(c, xs) => {
            rexpr_vars(c, out);
            xs.iter().for_each(|x| rexpr_vars(x, out));
        }
        RExpr::FnRef { caps, .. } => caps.iter().for_each(|x| rexpr_vars(x, out)),
        RExpr::BoundMethod { func, recv } => {
            rexpr_vars(func, out);
            rexpr_vars(recv, out);
        }
        RExpr::Yield(e) | RExpr::Await(e) | RExpr::Delete(e) | RExpr::OwnMember { obj: e, .. } => rexpr_vars(e, out),
        RExpr::ClassSrc { parent, caps, .. } => {
            if let Some(p) = parent {
                rexpr_vars(p, out)
            }
            caps.iter().for_each(|x| rexpr_vars(x, out));
        }
        RExpr::ArrayLit(xs) => xs.iter().for_each(|x| rexpr_vars(x, out)),
        RExpr::ObjectLit(fs) => fs.iter().for_each(|(_, x)| rexpr_vars(x, out)),
        RExpr::Num(_)
        | RExpr::Str(_)
        | RExpr::Bool(_)
        | RExpr::Undef
        | RExpr::Null
        | RExpr::This
        | RExpr::Global(_)
        | RExpr::RegexLit(..) | RExpr::BigInt(_) | RExpr::NewFn { .. } | RExpr::Hole | RExpr::Verbatim(..) => {}
    }
}

/// The variables an op reads, and the one it assigns (if any). `None` for a
/// residual `try`, which this pass does not handle.
pub(crate) fn op_uses_def(op: &Op) -> Option<(Vec<usize>, Option<usize>)> {
    let mut uses = Vec::new();
    let def = match op {
        Op::Assign { var, expr } => {
            rexpr_vars(expr, &mut uses);
            Some(*var)
        }
        Op::Eval { dst, expr } => {
            rexpr_vars(expr, &mut uses);
            Some(*dst)
        }
        Op::NewObject { dst, fields } => {
            fields.iter().for_each(|(_, e)| rexpr_vars(e, &mut uses));
            Some(*dst)
        }
        Op::NewArray { dst, elems } => {
            elems.iter().for_each(|e| rexpr_vars(e, &mut uses));
            Some(*dst)
        }
        Op::Return(e) | Op::Throw(e) | Op::AssignGlobal { expr: e, .. } | Op::Effect(e) => {
            rexpr_vars(e, &mut uses);
            None
        }
        Op::PushOp { arr, val } => {
            rexpr_vars(arr, &mut uses);
            rexpr_vars(val, &mut uses);
            None
        }
        Op::SetIndex { arr, index, val } => {
            rexpr_vars(arr, &mut uses);
            rexpr_vars(index, &mut uses);
            rexpr_vars(val, &mut uses);
            None
        }
        Op::SetProp { obj, val, .. } => {
            rexpr_vars(obj, &mut uses);
            rexpr_vars(val, &mut uses);
            None
        }
        Op::DeleteProp { obj, .. } => {
            rexpr_vars(obj, &mut uses);
            None
        }
        Op::DeleteIndex { arr, index } => {
            rexpr_vars(arr, &mut uses);
            rexpr_vars(index, &mut uses);
            None
        }
        Op::Try { .. } => return None,
    };
    Some((uses, def))
}

pub(crate) fn term_uses(t: &Terminator<Cond>) -> Vec<usize> {
    let mut uses = Vec::new();
    if let Terminator::Cond { cond: Cond::Falsy(e), .. } = t {
        rexpr_vars(e, &mut uses);
    }
    uses
}

pub(crate) fn succs(t: &Terminator<Cond>) -> Vec<usize> {
    match t {
        Terminator::Br(b) => vec![b.0],
        Terminator::Cond { t, f, .. } => vec![t.0, f.0],
        Terminator::Halt | Terminator::Unset => vec![],
    }
}

struct Bits(Vec<u64>);
impl Bits {
    fn new(n: usize) -> Bits {
        Bits(vec![0; n.div_ceil(64).max(1)])
    }
    fn set(&mut self, i: usize) {
        self.0[i / 64] |= 1 << (i % 64);
    }
    fn clear(&mut self, i: usize) {
        self.0[i / 64] &= !(1 << (i % 64));
    }
    fn union_with(&mut self, o: &Bits) -> bool {
        let mut changed = false;
        for (a, b) in self.0.iter_mut().zip(&o.0) {
            let n = *a | *b;
            changed |= n != *a;
            *a = n;
        }
        changed
    }
    fn ones(&self) -> impl Iterator<Item = usize> + '_ {
        self.0.iter().enumerate().flat_map(|(w, &bits)| {
            (0..64).filter(move |b| bits & (1 << b) != 0).map(move |b| w * 64 + b)
        })
    }
}

fn rename_rexpr(e: &mut RExpr, m: &HashMap<usize, usize>) {
    match e {
        RExpr::Var(v) => {
            if let Some(n) = m.get(v) {
                *v = *n;
            }
        }
        RExpr::Bin(_, a, b) | RExpr::Index(a, b) => {
            rename_rexpr(a, m);
            rename_rexpr(b, m);
        }
        RExpr::Get(o, _) => rename_rexpr(o, m),
        RExpr::Opaque(_, xs) => xs.iter_mut().for_each(|x| rename_rexpr(x, m)),
        RExpr::Call(c, xs) | RExpr::New(c, xs) => {
            rename_rexpr(c, m);
            xs.iter_mut().for_each(|x| rename_rexpr(x, m));
        }
        RExpr::FnRef { caps, .. } => caps.iter_mut().for_each(|x| rename_rexpr(x, m)),
        RExpr::BoundMethod { func, recv } => {
            rename_rexpr(func, m);
            rename_rexpr(recv, m);
        }
        RExpr::Yield(e) | RExpr::Await(e) | RExpr::Delete(e) | RExpr::OwnMember { obj: e, .. } => rename_rexpr(e, m),
        RExpr::ClassSrc { parent, caps, .. } => {
            if let Some(p) = parent {
                rename_rexpr(p, m)
            }
            caps.iter_mut().for_each(|x| rename_rexpr(x, m));
        }
        RExpr::ArrayLit(xs) => xs.iter_mut().for_each(|x| rename_rexpr(x, m)),
        RExpr::ObjectLit(fs) => fs.iter_mut().for_each(|(_, x)| rename_rexpr(x, m)),
        RExpr::Num(_) | RExpr::Str(_) | RExpr::Bool(_) | RExpr::Undef | RExpr::Null | RExpr::This | RExpr::Global(_) | RExpr::RegexLit(..) | RExpr::BigInt(_) | RExpr::NewFn { .. } | RExpr::Hole | RExpr::Verbatim(..) => {}
    }
}

fn rename_op(op: &mut Op, m: &HashMap<usize, usize>) {
    let r = |v: &mut usize| {
        if let Some(n) = m.get(v) {
            *v = *n;
        }
    };
    match op {
        Op::Assign { var, expr } => {
            r(var);
            rename_rexpr(expr, m);
        }
        Op::Eval { dst, expr } => {
            r(dst);
            rename_rexpr(expr, m);
        }
        Op::NewObject { dst, fields } => {
            r(dst);
            fields.iter_mut().for_each(|(_, e)| rename_rexpr(e, m));
        }
        Op::NewArray { dst, elems } => {
            r(dst);
            elems.iter_mut().for_each(|e| rename_rexpr(e, m));
        }
        Op::Return(e) | Op::Throw(e) | Op::AssignGlobal { expr: e, .. } | Op::Effect(e) => rename_rexpr(e, m),
        Op::PushOp { arr, val } => {
            rename_rexpr(arr, m);
            rename_rexpr(val, m);
        }
        Op::SetIndex { arr, index, val } => {
            rename_rexpr(arr, m);
            rename_rexpr(index, m);
            rename_rexpr(val, m);
        }
        Op::SetProp { obj, val, .. } => {
            rename_rexpr(obj, m);
            rename_rexpr(val, m);
        }
        Op::DeleteProp { obj, .. } => rename_rexpr(obj, m),
        Op::DeleteIndex { arr, index } => {
            rename_rexpr(arr, m);
            rename_rexpr(index, m);
        }
        Op::Try { .. } => unreachable!("coalesce_vars skips programs with a residual try"),
    }
}

/// Coalesce the residual variables of `prog`, leaving the `keep` variables
/// (parameters, the input) unchanged.
pub fn coalesce_vars(prog: &mut Program<Op, Cond>, keep: &HashSet<usize>) {
    // Per op: uses and def. Bail out on a residual `try`.
    let mut info: Vec<Vec<(Vec<usize>, Option<usize>)>> = Vec::with_capacity(prog.blocks.len());
    for b in &prog.blocks {
        let mut v = Vec::with_capacity(b.ops.len());
        for op in &b.ops {
            match op_uses_def(op) {
                Some(x) => v.push(x),
                None => return,
            }
        }
        info.push(v);
    }
    // Index the renameable variables in order of first appearance.
    let mut index: HashMap<usize, usize> = HashMap::new();
    let mut order: Vec<usize> = Vec::new();
    let note = |v: usize, index: &mut HashMap<usize, usize>, order: &mut Vec<usize>| {
        if !keep.contains(&v) && !index.contains_key(&v) {
            index.insert(v, order.len());
            order.push(v);
        }
    };
    for (bi, b) in prog.blocks.iter().enumerate() {
        for (uses, def) in &info[bi] {
            for &u in uses {
                note(u, &mut index, &mut order);
            }
            if let Some(d) = def {
                note(*d, &mut index, &mut order);
            }
        }
        for u in term_uses(&b.term) {
            note(u, &mut index, &mut order);
        }
    }
    let n = order.len();
    if n == 0 {
        return;
    }
    let idx = |v: &usize| index.get(v).copied();
    // Liveness (backward, to a fixpoint).
    let nb = prog.blocks.len();
    let mut live_in: Vec<Bits> = (0..nb).map(|_| Bits::new(n)).collect();
    let mut changed = true;
    while changed {
        changed = false;
        for bi in (0..nb).rev() {
            let b = &prog.blocks[bi];
            let mut live = Bits::new(n);
            for s in succs(&b.term) {
                live.union_with(&live_in[s]);
            }
            for u in term_uses(&b.term) {
                if let Some(i) = idx(&u) {
                    live.set(i);
                }
            }
            for (uses, def) in info[bi].iter().rev() {
                if let Some(i) = def.as_ref().and_then(idx) {
                    live.clear(i);
                }
                for u in uses {
                    if let Some(i) = idx(u) {
                        live.set(i);
                    }
                }
            }
            if live_in[bi].union_with(&live) {
                changed = true;
            }
        }
    }
    // Interference: a variable assigned while another is live interferes with it.
    let mut adj: Vec<HashSet<usize>> = vec![HashSet::new(); n];
    for bi in 0..nb {
        let b = &prog.blocks[bi];
        let mut live = Bits::new(n);
        for s in succs(&b.term) {
            live.union_with(&live_in[s]);
        }
        for u in term_uses(&b.term) {
            if let Some(i) = idx(&u) {
                live.set(i);
            }
        }
        for (uses, def) in info[bi].iter().rev() {
            if let Some(d) = def.as_ref().and_then(idx) {
                for l in live.ones() {
                    if l != d {
                        adj[d].insert(l);
                        adj[l].insert(d);
                    }
                }
                live.clear(d);
            }
            for u in uses {
                if let Some(i) = idx(u) {
                    live.set(i);
                }
            }
        }
    }
    // Greedy coloring in order of first appearance.
    let mut color: Vec<usize> = vec![usize::MAX; n];
    for i in 0..n {
        let taken: HashSet<usize> = adj[i].iter().map(|&j| color[j]).collect();
        let mut c = 0;
        while taken.contains(&c) {
            c += 1;
        }
        color[i] = c;
    }
    // New names 1, 2, ... skipping kept ones (0 is the input).
    let mut names: Vec<usize> = Vec::new();
    let mut next = 1usize;
    let ncolors = color.iter().copied().max().map_or(0, |m| m + 1);
    while names.len() < ncolors {
        if !keep.contains(&next) {
            names.push(next);
        }
        next += 1;
    }
    let map: HashMap<usize, usize> = order.iter().enumerate().map(|(i, &v)| (v, names[color[i]])).collect();
    for b in &mut prog.blocks {
        for op in &mut b.ops {
            rename_op(op, &map);
        }
        // A copy between two variables that now share a name is a no-op.
        b.ops.retain(|op| !matches!(op, Op::Assign { var, expr: RExpr::Var(w) } if var == w));
        if let Terminator::Cond { cond: Cond::Falsy(e), .. } = &mut b.term {
            rename_rexpr(e, &map);
        }
    }
}
