//! Structured control flow for residual programs.
//!
//! The residual is a graph of basic blocks. When that graph is *reducible*
//! (every loop has a single entry, which is what a residual specialized from
//! structured JavaScript produces), it is emitted as nested `while (true)` loops,
//! labeled blocks, `if`/`else`, `break` and `continue`, so a residual loop reads
//! as a loop rather than a `switch`-on-program-counter dispatcher.
//!
//! Construction follows Ramsey, "Beyond Relooper" (ICFP 2022):
//! - a loop header (target of a back edge) becomes `while (true) { ... }`;
//! - a merge node (two or more forward predecessors) is placed after a labeled
//!   block nested in its immediate dominator, and reached by `break` to that
//!   label;
//! - any other forward edge goes to a block with a single predecessor, whose
//!   code is placed inline;
//! - a back edge is a `continue` of the loop it closes.
//!
//! A cleanup pass then removes jumps that only restate fall-through, unneeded
//! `else` arms, blocks and labels, and turns a loop that starts with an exit test
//! into a `while (cond)` loop. An irreducible graph, or one that would nest more
//! than `MAX_NESTING` deep, returns `None` and the caller keeps the trampoline.

use std::collections::HashSet;
use std::fmt::Write as _;

use partial::js::{may_throw, Bop, Cond, Op, RExpr};
use partial::residual::{Program, Terminator};

use crate::codegen::{label_js, op_to_js, rexpr_to_js, var_js};

/// A structured statement. Labels are strings unique within the output.
enum Stmt<'a> {
    Op(&'a Op),
    /// A statement that never falls through (`return undefined;`, a hard error).
    Exit(String),
    If { cond: CondExpr, then: Vec<Stmt<'a>>, els: Vec<Stmt<'a>> },
    Block { label: String, body: Vec<Stmt<'a>> },
    /// `while (cond) { body }`; `cond: None` is `while (true)`. With
    /// `for_in` (a variable and an object), `for (var in obj) { body }`
    /// instead (`cond` then unused: see `native_for_in`).
    Loop { label: String, cond: Option<CondExpr>, body: Vec<Stmt<'a>>, for_in: Option<(usize, RExpr)> },
    Break(String),
    Continue(String),
    /// An expression evaluated for its effect (an `if` with empty arms).
    Eval(RExpr),
}

/// A branch condition, kept as an expression so it can be negated cleanly.
#[derive(Clone)]
struct CondExpr {
    expr: RExpr,
    negated: bool,
}

impl CondExpr {
    fn not(&self) -> CondExpr {
        CondExpr { expr: self.expr.clone(), negated: !self.negated }
    }

    fn render(&self) -> String {
        if self.negated {
            // Only strict (in)equality has an exact negation; `!(a < b)` is not
            // `a >= b` when either side is NaN.
            if let RExpr::Bin(op @ (Bop::Eq | Bop::Ne), a, b) = &self.expr {
                let flipped = if *op == Bop::Eq { Bop::Ne } else { Bop::Eq };
                return strip_parens(&rexpr_to_js(&RExpr::Bin(flipped, a.clone(), b.clone())));
            }
            format!("!{}", paren(&rexpr_to_js(&self.expr)))
        } else {
            strip_parens(&rexpr_to_js(&self.expr))
        }
    }
}

/// `s` wrapped in parentheses unless it already is one parenthesized group.
fn paren(s: &str) -> String {
    if is_one_group(s) { s.to_string() } else { format!("({s})") }
}

/// Drop one pair of parentheses that wraps the whole of `s`.
fn strip_parens(s: &str) -> String {
    if is_one_group(s) { s[1..s.len() - 1].to_string() } else { s.to_string() }
}

/// Is `s` exactly `( ... )` with the opening paren closed at the very end?
/// String literals are skipped so a quoted `)` doesn't count.
fn is_one_group(s: &str) -> bool {
    let b = s.as_bytes();
    if b.first() != Some(&b'(') || b.last() != Some(&b')') {
        return false;
    }
    let mut depth = 0i32;
    let mut i = 0;
    while i < b.len() {
        match b[i] {
            b'"' | b'\'' | b'`' => {
                let q = b[i];
                i += 1;
                while i < b.len() && b[i] != q {
                    if b[i] == b'\\' {
                        i += 1;
                    }
                    i += 1;
                }
            }
            b'(' => depth += 1,
            b')' => {
                depth -= 1;
                if depth == 0 && i != b.len() - 1 {
                    return false;
                }
            }
            _ => {}
        }
        i += 1;
    }
    depth == 0
}

struct Graph<'a> {
    prog: &'a Program<Op, Cond>,
    /// Reverse-postorder number of each reachable block (`usize::MAX` if not).
    rpo: Vec<usize>,
    idom: Vec<usize>,
    loop_header: Vec<bool>,
    merge: Vec<bool>,
    /// Dominator-tree children of each block.
    children: Vec<Vec<usize>>,
    /// Unique prefix for this program's labels (nested `try` programs share a
    /// function, and JavaScript rejects a label nested inside the same label).
    tag: usize,
}

fn succs(term: &Terminator<Cond>) -> Vec<usize> {
    match term {
        Terminator::Br(t) => vec![t.0],
        Terminator::Cond { t, f, .. } => vec![t.0, f.0],
        Terminator::Halt | Terminator::Unset => vec![],
    }
}

impl<'a> Graph<'a> {
    /// Analyze `prog`; `None` if the graph is irreducible.
    fn new(prog: &'a Program<Op, Cond>, tag: usize) -> Option<Graph<'a>> {
        let n = prog.blocks.len();
        // Reverse postorder by iterative DFS from the entry.
        let mut order: Vec<usize> = Vec::with_capacity(n);
        let mut visited = vec![false; n];
        let mut stack: Vec<(usize, usize)> = vec![(prog.entry.0, 0)];
        visited[prog.entry.0] = true;
        while let Some(&mut (b, ref mut i)) = stack.last_mut() {
            let ss = succs(&prog.blocks[b].term);
            if *i < ss.len() {
                let s = ss[*i];
                *i += 1;
                if !visited[s] {
                    visited[s] = true;
                    stack.push((s, 0));
                }
            } else {
                order.push(b);
                stack.pop();
            }
        }
        order.reverse();
        let mut rpo = vec![usize::MAX; n];
        for (i, &b) in order.iter().enumerate() {
            rpo[b] = i;
        }

        let mut preds: Vec<Vec<usize>> = vec![Vec::new(); n];
        for &b in &order {
            for s in succs(&prog.blocks[b].term) {
                preds[s].push(b);
            }
        }

        // Dominators (Cooper, Harvey & Kennedy), over RPO numbers.
        let entry = prog.entry.0;
        let mut idom = vec![usize::MAX; n];
        idom[entry] = entry;
        let mut changed = true;
        while changed {
            changed = false;
            for &b in order.iter().skip(1) {
                let mut new_idom = usize::MAX;
                for &p in &preds[b] {
                    if idom[p] == usize::MAX {
                        continue;
                    }
                    new_idom = if new_idom == usize::MAX {
                        p
                    } else {
                        let (mut x, mut y) = (p, new_idom);
                        while x != y {
                            while rpo[x] > rpo[y] {
                                x = idom[x];
                            }
                            while rpo[y] > rpo[x] {
                                y = idom[y];
                            }
                        }
                        x
                    };
                }
                if idom[b] != new_idom {
                    idom[b] = new_idom;
                    changed = true;
                }
            }
        }
        let dominates = |a: usize, mut b: usize| loop {
            if a == b {
                return true;
            }
            if b == entry {
                return false;
            }
            b = idom[b];
        };

        let mut loop_header = vec![false; n];
        let mut forward_in = vec![0usize; n];
        for &b in &order {
            for s in succs(&prog.blocks[b].term) {
                if rpo[s] <= rpo[b] {
                    // A retreating edge must be a back edge to a dominator, else
                    // the loop has two entries and the graph is irreducible.
                    if !dominates(s, b) {
                        return None;
                    }
                    loop_header[s] = true;
                } else {
                    forward_in[s] += 1;
                }
            }
        }
        let merge: Vec<bool> = forward_in.iter().map(|&c| c >= 2).collect();
        let mut children: Vec<Vec<usize>> = vec![Vec::new(); n];
        for &b in order.iter().skip(1) {
            children[idom[b]].push(b);
        }
        Some(Graph { prog, rpo, idom, loop_header, merge, children, tag })
    }

    fn loop_label(&self, b: usize) -> String {
        format!("L{}_{b}", self.tag)
    }
    fn block_label(&self, b: usize) -> String {
        format!("B{}_{b}", self.tag)
    }

    fn do_tree(&self, x: usize, halt: &Stmt<'a>) -> Vec<Stmt<'a>> {
        // (A long chain of blocks is a deep dominator tree: as deep a
        // recursion here.)
        stacker::maybe_grow(partial::engine::STACK_RED_ZONE, partial::engine::STACK_GROWTH, || self.do_tree_here(x, halt))
    }

    fn do_tree_here(&self, x: usize, halt: &Stmt<'a>) -> Vec<Stmt<'a>> {
        let mut ys: Vec<usize> = self.children[x].iter().copied().filter(|&c| self.merge[c]).collect();
        // The merge child latest in RPO gets the outermost block, so the code
        // after each block is in RPO order.
        ys.sort_by_key(|&y| std::cmp::Reverse(self.rpo[y]));
        let body = self.node_within(x, &ys, halt);
        if self.loop_header[x] {
            vec![Stmt::Loop { label: self.loop_label(x), cond: None, body, for_in: None }]
        } else {
            body
        }
    }

    fn node_within(&self, x: usize, ys: &[usize], halt: &Stmt<'a>) -> Vec<Stmt<'a>> {
        if let Some((&y, rest)) = ys.split_first() {
            let mut out = vec![Stmt::Block { label: self.block_label(y), body: self.node_within(x, rest, halt) }];
            out.extend(self.do_tree(y, halt));
            return out;
        }
        let block = &self.prog.blocks[x];
        let mut out: Vec<Stmt<'a>> = block.ops.iter().map(Stmt::Op).collect();
        match &block.term {
            Terminator::Halt => {
                if !matches!(block.ops.last(), Some(Op::Return(_) | Op::Throw(_))) {
                    out.push(clone_halt(halt));
                }
            }
            Terminator::Br(t) => out.extend(self.branch(x, t.0, halt)),
            Terminator::Cond { cond: Cond::Falsy(e), t, f } => out.push(Stmt::If {
                // `t` is taken when `e` is falsy.
                cond: CondExpr { expr: e.clone(), negated: false },
                then: self.branch(x, f.0, halt),
                els: self.branch(x, t.0, halt),
            }),
            Terminator::Unset => out.push(Stmt::Exit("throw new Error(\"unset terminator\");".into())),
        }
        out
    }

    fn branch(&self, src: usize, dst: usize, halt: &Stmt<'a>) -> Vec<Stmt<'a>> {
        if self.rpo[dst] <= self.rpo[src] {
            vec![Stmt::Continue(self.loop_label(dst))]
        } else if self.merge[dst] {
            vec![Stmt::Break(self.block_label(dst))]
        } else {
            debug_assert_eq!(self.idom[dst], src);
            self.do_tree(dst, halt)
        }
    }
}

fn clone_halt<'a>(h: &Stmt<'a>) -> Stmt<'a> {
    match h {
        Stmt::Exit(s) => Stmt::Exit(s.clone()),
        Stmt::Break(l) => Stmt::Break(l.clone()),
        _ => unreachable!("halt is an exit or a break"),
    }
}

// ───────────── native for..in ─────────────

/// The front end lowers `for (k in o) body` to a snapshot of the keys and a
/// loop over it that skips a key `o` no longer has (`__pe_forInKeys`, see
/// the lowering): what the engine's own `for..in` does. A residual loop of
/// that shape over a runtime object is written as that `for..in` again,
/// which is the original's code and much faster:
///
/// ```text
/// d = __pe_forInKeys(o);  a = 0;  while (a < d.length) { k = d[a]; ...; a += 1; ... }
/// ```
///
/// becomes `for (k in o) { ... }`, when the snapshot `d` and the index `a`
/// are read nowhere else and only `a += 1` writes `a` in the loop (the
/// variables are the lowering's own, dead after the loop), `o` is a
/// variable the loop does not assign, and what stands between the snapshot
/// and the loop can change no object. (The test that skips a key `o` no
/// longer has stays where the specializer left it: the engine skips those
/// too, so it is never taken.)
fn native_for_in<'a>(stmts: Vec<Stmt<'a>>) -> Vec<Stmt<'a>> {
    let mut stmts: Vec<Stmt<'a>> = stmts
        .into_iter()
        .map(|s| match s {
            Stmt::If { cond, then, els } => Stmt::If { cond, then: native_for_in(then), els: native_for_in(els) },
            Stmt::Block { label, body } => Stmt::Block { label, body: native_for_in(body) },
            Stmt::Loop { label, cond, body, for_in } => Stmt::Loop { label, cond, body: native_for_in(body), for_in },
            other => other,
        })
        .collect();
    let mut j = 0;
    while j < stmts.len() {
        if let Some((d, o)) = for_in_keys_def(&stmts[j]) {
            if let Some((k_at, a)) = for_in_loop_after(&stmts, j, d, o) {
                // (The loop, or the block it is all of.)
                let (outer, the_loop) = match stmts.remove(k_at) {
                    Stmt::Block { label, mut body } => (Some(label), body.pop().expect("a block of one loop")),
                    l => (None, l),
                };
                let Stmt::Loop { label, body, .. } = the_loop else { unreachable!() };
                let Some(Stmt::Op(Op::Assign { var: key, .. } | Op::Eval { dst: key, .. })) = body.first() else { unreachable!() };
                let key = *key;
                let mut body = strip_increments(body.into_iter().skip(1).collect(), a);
                // (The test that skips a key `o` no longer has, the engine's
                // own now: run again, it would ask a proxy twice.)
                if body.first().is_some_and(|s| is_key_still_there_test(s, key, o, &label)) {
                    body.remove(0);
                }
                // (The index's start, between the snapshot and the loop.)
                let zero = (j + 1..k_at).find(|&i| matches!(&stmts[i], Stmt::Op(Op::Assign { var, expr: RExpr::Num(n) }) if *var == a && n.f() == 0.0)).expect("checked by for_in_loop_after");
                let l = Stmt::Loop { label, cond: None, body, for_in: Some((key, RExpr::Var(o))) };
                stmts.insert(k_at, match outer {
                    Some(label) => Stmt::Block { label, body: vec![l] },
                    None => l,
                });
                stmts.remove(zero);
                stmts.remove(j);
                continue;
            }
        }
        j += 1;
    }
    stmts
}

/// `if (o != null && !(key in o)) continue;` (or without the `null` test),
/// the lowering's skip of a key `o` no longer has, `continue` of `label`.
fn is_key_still_there_test(s: &Stmt, key: usize, o: usize, label: &str) -> bool {
    let Stmt::If { cond, then, els } = s else { return false };
    if cond.negated || !els.is_empty() || !matches!(then.as_slice(), [Stmt::Continue(l)] if l == label) {
        return false;
    }
    let var = |e: &RExpr, v: usize| matches!(e, RExpr::Var(x) if *x == v);
    let not_in = |e: &RExpr| matches!(e, RExpr::Opaque(op, xs) if op == "!" && matches!(xs.as_slice(), [RExpr::Opaque(i, ys)] if i == "in" && matches!(ys.as_slice(), [k, ob] if var(k, key) && var(ob, o))));
    match &cond.expr {
        RExpr::Opaque(op, xs) if op == "&&" => match xs.as_slice() {
            [RExpr::Opaque(ne, ys), t] => ne == "!=" && matches!(ys.as_slice(), [ob, RExpr::Null] if var(ob, o)) && not_in(t),
            _ => false,
        },
        e => not_in(e),
    }
}

/// `d = __pe_forInKeys(o)`, `o` a variable: `(d, o)`.
fn for_in_keys_def(s: &Stmt) -> Option<(usize, usize)> {
    let Stmt::Op(Op::Assign { var: d, expr } | Op::Eval { dst: d, expr }) = s else { return None };
    match expr {
        RExpr::Call(f, args) => match (&**f, args.as_slice()) {
            (RExpr::Global(g), [RExpr::Var(o)]) if g == "__pe_forInKeys" => Some((*d, *o)),
            _ => None,
        },
        _ => None,
    }
}

/// The loop over the snapshot `d` of `o`'s keys after `stmts[j]`, and its
/// index variable, when it may be a native `for..in` (see `native_for_in`).
fn for_in_loop_after(stmts: &[Stmt], j: usize, d: usize, o: usize) -> Option<(usize, usize)> {
    let mut zero: Option<usize> = None;
    for i in j + 1..stmts.len() {
        match &stmts[i] {
            Stmt::Op(Op::Assign { var, expr: RExpr::Num(n) }) if n.f() == 0.0 && zero.is_none() && *var != o && *var != d => zero = Some(*var),
            Stmt::Block { body: inner, .. } if inner.len() == 1 && matches!(inner[0], Stmt::Loop { .. }) => {
                let a = zero?;
                return for_in_loop_check(&inner[0], a, d, o).then_some((i, a));
            }
            Stmt::Loop { .. } => {
                let a = zero?;
                return for_in_loop_check(&stmts[i], a, d, o).then_some((i, a));
            }
            // (Between them: assignments that change no object and leave
            // `o`, `d` and the index alone.)
            Stmt::Op(Op::Assign { var, expr }) if *var != o && *var != d && Some(*var) != zero && changes_nothing(expr) => {}
            // (A new array or object of such values: no object there was.)
            Stmt::Op(Op::NewArray { dst, elems }) if *dst != o && *dst != d && Some(*dst) != zero && elems.iter().all(changes_nothing) => {}
            Stmt::Op(Op::NewObject { dst, fields }) if *dst != o && *dst != d && Some(*dst) != zero && fields.iter().all(|(_, e)| changes_nothing(e)) => {}
            _ => return None,
        }
    }
    None
}

/// Is `l` the loop `while (a < d.length) { k = d[a]; ... }` that may be a
/// native `for..in` over `o` (see `native_for_in`)?
fn for_in_loop_check(l: &Stmt, a: usize, d: usize, o: usize) -> bool {
    match l {
            Stmt::Loop { cond: Some(CondExpr { expr: RExpr::Bin(Bop::Lt, x, len), negated: false }), body, for_in: None, .. } => {
                if !matches!((&**x, &**len), (RExpr::Var(xa), RExpr::Get(arr, l)) if *xa == a && l == "length" && matches!(&**arr, RExpr::Var(da) if *da == d)) {
                    return false;
                }
                // (The key, read first.)
                let Some(Stmt::Op(Op::Assign { var: key, expr } | Op::Eval { dst: key, expr })) = body.first() else { return false };
                let key_read = matches!(expr, RExpr::Index(arr, ix) if matches!(&**arr, RExpr::Var(v) if *v == d) && matches!(&**ix, RExpr::Var(v) if *v == a));
                if !key_read || *key == a || *key == d || *key == o {
                    return false;
                }
                let rest = &body[1..];
                only_increments(rest, a, d) && !assigns(rest, o)
            }
            _ => false,
    }
}

/// Does `e` neither call anything nor write anything (a literal, a variable,
/// an operator on such: no getter or conversion of an object runs)?
fn changes_nothing(e: &RExpr) -> bool {
    match e {
        // (Not a global's read: a property of the global object may be a
        // getter.)
        RExpr::Num(_) | RExpr::Str(_) | RExpr::Bool(_) | RExpr::Undef | RExpr::Null | RExpr::Var(_) => true,
        _ => false,
    }
}

/// Is `a += 1` the only mention of the index `a` in `stmts`, and is the
/// snapshot `d` mentioned nowhere?
fn only_increments(stmts: &[Stmt], a: usize, d: usize) -> bool {
    let named = |e: &RExpr| {
        let mut vs = Vec::new();
        partial::coalesce::rexpr_vars(e, &mut vs);
        vs.contains(&a) || vs.contains(&d)
    };
    stmts.iter().all(|s| match s {
        Stmt::Op(op) if is_increment(op, a) => true,
        // (A `try`'s sub-programs are not looked into: none, then.)
        Stmt::Op(Op::Try { .. }) => false,
        Stmt::Op(op) => {
            let def = partial::inline::op_def(op);
            def != Some(a) && def != Some(d) && partial::inline::op_exprs(op).into_iter().all(|e| !named(e))
        }
        Stmt::If { cond, then, els } => !named(&cond.expr) && only_increments(then, a, d) && only_increments(els, a, d),
        Stmt::Block { body, .. } => only_increments(body, a, d),
        Stmt::Loop { cond, body, for_in, .. } => {
            cond.as_ref().is_none_or(|c| !named(&c.expr)) && for_in.as_ref().is_none_or(|(v, o)| *v != a && *v != d && !named(o)) && only_increments(body, a, d)
        }
        Stmt::Eval(e) => !named(e),
        Stmt::Exit(_) | Stmt::Break(_) | Stmt::Continue(_) => true,
    })
}

/// `a = a + 1`.
fn is_increment(op: &Op, a: usize) -> bool {
    matches!(op, Op::Assign { var, expr: RExpr::Bin(Bop::Add, x, one) } if *var == a && matches!(&**x, RExpr::Var(v) if *v == a) && matches!(&**one, RExpr::Num(n) if n.f() == 1.0))
}

/// Does some operation in `stmts` assign variable `o`?
fn assigns(stmts: &[Stmt], o: usize) -> bool {
    stmts.iter().any(|s| match s {
        // (A `try`'s sub-programs are not looked into: it may.)
        Stmt::Op(Op::Try { .. }) => true,
        Stmt::Op(op) => partial::inline::op_def(op) == Some(o),
        Stmt::If { then, els, .. } => assigns(then, o) || assigns(els, o),
        Stmt::Block { body, .. } => assigns(body, o),
        Stmt::Loop { body, for_in, .. } => for_in.as_ref().is_some_and(|(v, _)| *v == o) || assigns(body, o),
        _ => false,
    })
}

/// `stmts` without the index's increments.
fn strip_increments<'a>(stmts: Vec<Stmt<'a>>, a: usize) -> Vec<Stmt<'a>> {
    stmts
        .into_iter()
        .filter(|s| !matches!(s, Stmt::Op(op) if is_increment(op, a)))
        .map(|s| match s {
            Stmt::If { cond, then, els } => Stmt::If { cond, then: strip_increments(then, a), els: strip_increments(els, a) },
            Stmt::Block { label, body } => Stmt::Block { label, body: strip_increments(body, a) },
            Stmt::Loop { label, cond, body, for_in } => Stmt::Loop { label, cond, body: strip_increments(body, a), for_in },
            other => other,
        })
        .collect()
}

// ───────────── cleanup ─────────────

/// Does control never fall out of the end of `stmts`?
fn never_falls_through(stmts: &[Stmt]) -> bool {
    match stmts.last() {
        Some(Stmt::Op(Op::Return(_) | Op::Throw(_))) => true,
        Some(Stmt::Exit(_) | Stmt::Break(_) | Stmt::Continue(_)) => true,
        Some(Stmt::If { then, els, .. }) => never_falls_through(then) && never_falls_through(els),
        // `while (true)` only exits through a `break` of its own label, and this
        // construction never breaks a loop label.
        Some(Stmt::Loop { cond: None, for_in: None, .. }) => true,
        _ => false,
    }
}

/// Remove a jump in tail position of `stmts` that only restates fall-through:
/// `pred` matches the redundant jump. Returns whether anything was removed.
fn drop_tail_jump(stmts: &mut Vec<Stmt>, pred: &dyn Fn(&Stmt) -> bool) -> bool {
    match stmts.last_mut() {
        Some(s) if pred(s) => {
            stmts.pop();
            true
        }
        Some(Stmt::If { then, els, .. }) => {
            let a = drop_tail_jump(then, pred);
            let b = drop_tail_jump(els, pred);
            a || b
        }
        _ => false,
    }
}

fn mentions_label(stmts: &[Stmt], label: &str) -> bool {
    stmts.iter().any(|s| match s {
        Stmt::Break(l) | Stmt::Continue(l) => l == label,
        Stmt::If { then, els, .. } => mentions_label(then, label) || mentions_label(els, label),
        Stmt::Block { body, .. } | Stmt::Loop { body, .. } => mentions_label(body, label),
        Stmt::Op(_) | Stmt::Exit(_) | Stmt::Eval(_) => false,
    })
}

/// One cleanup pass over a statement list; returns whether anything changed.
fn cleanup<'a>(stmts: Vec<Stmt<'a>>, changed: &mut bool) -> Vec<Stmt<'a>> {
    let mut out: Vec<Stmt<'a>> = Vec::with_capacity(stmts.len());
    for s in stmts {
        match s {
            Stmt::Block { label, body } => {
                let mut body = cleanup(body, changed);
                // Falling off the end of the block continues after it.
                let l = label.clone();
                if drop_tail_jump(&mut body, &|s| matches!(s, Stmt::Break(b) if *b == l)) {
                    *changed = true;
                }
                if mentions_label(&body, &label) {
                    out.push(Stmt::Block { label, body });
                } else {
                    *changed = true;
                    out.extend(body);
                }
            }
            Stmt::Loop { label, cond, body, for_in } => {
                let mut body = cleanup(body, changed);
                // Falling off the end of the loop body starts the next iteration.
                let l = label.clone();
                if drop_tail_jump(&mut body, &|s| matches!(s, Stmt::Continue(c) if *c == l)) {
                    *changed = true;
                }
                // `while (true) { if (c) { exit } rest }` is `while (!c) { rest } exit`
                // when `exit` leaves the loop: it never falls through, and it has
                // no `continue` of this loop (it is moved outside the loop).
                if cond.is_none() && for_in.is_none() {
                    if let Some(Stmt::If { then, els, .. }) = body.first() {
                        if els.is_empty() && never_falls_through(then.as_slice()) && !mentions_label(then.as_slice(), &label) {
                            let Stmt::If { cond: c, then, .. } = body.remove(0) else { unreachable!() };
                            *changed = true;
                            out.push(Stmt::Loop { label, cond: Some(c.not()), body, for_in: None });
                            out.extend(then);
                            continue;
                        }
                    }
                }
                // `while (true) { if (c) { B } E }`, where `B` never falls through
                // and `E` leaves the loop (never falls through, no `continue` of
                // this loop), is `while (c) { B } E`.
                if cond.is_none() && for_in.is_none() && body.len() >= 2 {
                    if let Some(Stmt::If { then, els, .. }) = body.first() {
                        let rest = &body[1..];
                        if els.is_empty()
                            && never_falls_through(then.as_slice())
                            && never_falls_through(rest)
                            && !mentions_label(rest, &label)
                        {
                            let mut body = body;
                            let rest: Vec<Stmt<'a>> = body.split_off(1);
                            let Stmt::If { cond: c, then, .. } = body.remove(0) else { unreachable!() };
                            *changed = true;
                            out.push(Stmt::Loop { label, cond: Some(c), body: then, for_in: None });
                            out.extend(rest);
                            continue;
                        }
                    }
                }
                // `while (true) { A: { if (c) { T } } R }`, where `T` never
                // falls through and `R` leaves the loop (never falls
                // through, no `continue` of it), is `A: { while (c) { T } } R`:
                // a loop whose body breaks out of it to code after it.
                if cond.is_none() && for_in.is_none() && body.len() >= 2 {
                    if let Some(Stmt::Block { body: inner, label: a }) = body.first() {
                        let rest = &body[1..];
                        if let [Stmt::If { then, els, .. }] = inner.as_slice() {
                            if els.is_empty() && never_falls_through(then) && never_falls_through(rest) && !mentions_label(rest, &label) && !mentions_label(rest, a) {
                                let mut body = body;
                                let rest: Vec<Stmt<'a>> = body.split_off(1);
                                let Some(Stmt::Block { label: a, body: mut inner }) = body.pop() else { unreachable!() };
                                let Some(Stmt::If { cond: c, then, .. }) = inner.pop() else { unreachable!() };
                                *changed = true;
                                out.push(Stmt::Block { label: a, body: vec![Stmt::Loop { label, cond: Some(c), body: then, for_in: None }] });
                                out.extend(rest);
                                continue;
                            }
                        }
                    }
                }
                out.push(Stmt::Loop { label, cond, body, for_in });
            }
            Stmt::If { cond, then, els } => {
                let then = cleanup(then, changed);
                let els = cleanup(els, changed);
                if then.is_empty() && els.is_empty() {
                    // Only the condition's evaluation remains (it may throw).
                    *changed = true;
                    if may_throw(&cond.expr) {
                        out.push(Stmt::Eval(cond.expr));
                    }
                } else if then.is_empty() {
                    *changed = true;
                    out.push(Stmt::If { cond: cond.not(), then: els, els: Vec::new() });
                } else if !els.is_empty() && never_falls_through(&then) {
                    // `if (c) { jump } else { E }` is `if (c) { jump } E`.
                    *changed = true;
                    out.push(Stmt::If { cond, then, els: Vec::new() });
                    out.extend(els);
                } else {
                    out.push(Stmt::If { cond, then, els });
                }
            }
            other => out.push(other),
        }
    }
    out
}

/// Maximum statement nesting depth for structured output.
const MAX_NESTING: usize = 64;

/// Do `stmts` nest more than `limit` deep? (It looks no deeper than that.)
fn nests_deeper(stmts: &[Stmt], limit: usize) -> bool {
    if limit == 0 {
        return stmts.iter().any(|s| !matches!(s, Stmt::Op(_) | Stmt::Exit(_) | Stmt::Eval(_) | Stmt::Break(_) | Stmt::Continue(_)));
    }
    stmts.iter().any(|s| match s {
        Stmt::If { then, els, .. } => nests_deeper(then, limit - 1) || nests_deeper(els, limit - 1),
        Stmt::Block { body, .. } | Stmt::Loop { body, .. } => nests_deeper(body, limit - 1),
        _ => false,
    })
}

fn nesting(stmts: &[Stmt]) -> usize {
    stmts
        .iter()
        .map(|s| match s {
            Stmt::If { then, els, .. } => 1 + nesting(then).max(nesting(els)),
            Stmt::Block { body, .. } | Stmt::Loop { body, .. } => 1 + nesting(body),
            Stmt::Op(_) | Stmt::Exit(_) | Stmt::Eval(_) | Stmt::Break(_) | Stmt::Continue(_) => 0,
        })
        .max()
        .unwrap_or(0)
}

// ───────────── printing ─────────────

/// Labels a `break`/`continue` must name explicitly: any `break` target, and a
/// `continue` of a loop other than the innermost one.
fn needed_labels(stmts: &[Stmt], loops: &mut Vec<String>, need: &mut HashSet<String>) {
    for s in stmts {
        match s {
            Stmt::Break(l) => {
                need.insert(l.clone());
            }
            Stmt::Continue(l) => {
                if loops.last() != Some(l) {
                    need.insert(l.clone());
                }
            }
            Stmt::If { then, els, .. } => {
                needed_labels(then, loops, need);
                needed_labels(els, loops, need);
            }
            Stmt::Block { body, .. } => needed_labels(body, loops, need),
            Stmt::Loop { label, body, .. } => {
                loops.push(label.clone());
                needed_labels(body, loops, need);
                loops.pop();
            }
            Stmt::Op(_) | Stmt::Exit(_) | Stmt::Eval(_) => {}
        }
    }
}

fn print(stmts: &[Stmt], ind: &str, loops: &mut Vec<String>, need: &HashSet<String>, out: &mut String) {
    let inner = format!("{ind}  ");
    for s in stmts {
        match s {
            Stmt::Op(op) => {
                let _ = writeln!(out, "{ind}{}", op_to_js(op, ind));
            }
            Stmt::Exit(text) => {
                let _ = writeln!(out, "{ind}{text}");
            }
            Stmt::Break(l) => {
                let _ = writeln!(out, "{ind}break {};", label_js(l));
            }
            Stmt::Continue(l) => {
                if loops.last() == Some(l) {
                    let _ = writeln!(out, "{ind}continue;");
                } else {
                    let _ = writeln!(out, "{ind}continue {};", label_js(l));
                }
            }
            Stmt::If { cond, then, els } => {
                let _ = writeln!(out, "{ind}if ({}) {{", cond.render());
                print(then, &inner, loops, need, out);
                if els.is_empty() {
                    let _ = writeln!(out, "{ind}}}");
                } else if let [Stmt::If { .. }] = els.as_slice() {
                    // `else if`: print the nested if on the `else` line.
                    let mut nested = String::new();
                    print(els, ind, loops, need, &mut nested);
                    let _ = write!(out, "{ind}}} else {}", nested.trim_start());
                } else {
                    let _ = writeln!(out, "{ind}}} else {{");
                    print(els, &inner, loops, need, out);
                    let _ = writeln!(out, "{ind}}}");
                }
            }
            Stmt::Eval(e) => {
                let js = rexpr_to_js(e);
                // An expression statement may not start with `{`, `function`,
                // `class` or `let [`.
                let ambiguous = js.starts_with('{') || js.starts_with("function") || js.starts_with("class") || js.starts_with("let");
                if ambiguous {
                    let _ = writeln!(out, "{ind}({js});");
                } else {
                    let _ = writeln!(out, "{ind}{js};");
                }
            }
            Stmt::Block { label, body } => {
                let _ = writeln!(out, "{ind}{}: {{", label_js(label));
                print(body, &inner, loops, need, out);
                let _ = writeln!(out, "{ind}}}");
            }
            Stmt::Loop { label, cond, body, for_in } => {
                let head = match (for_in, cond) {
                    (Some((v, o)), _) => format!("for ({} in {})", var_js(*v), rexpr_to_js(o)),
                    (None, Some(c)) => format!("while ({})", c.render()),
                    (None, None) => "while (true)".to_string(),
                };
                if need.contains(label) {
                    let _ = writeln!(out, "{ind}{}: {head} {{", label_js(label));
                } else {
                    let _ = writeln!(out, "{ind}{head} {{");
                }
                loops.push(label.clone());
                print(body, &inner, loops, need, out);
                loops.pop();
                let _ = writeln!(out, "{ind}}}");
            }
        }
    }
}

/// Render `prog` as structured statements at indentation `ind`, or `None` if
/// its graph is irreducible. `halt_return` is the statement for a block that
/// completes normally (`Halt` without a `return`) in a function body; inside a
/// `try`/`catch` sub-program (`in_try`) normal completion instead ends the
/// sub-program, which is a `break` out of a block wrapping it.
pub(crate) fn render_structured(prog: &Program<Op, Cond>, ind: &str, in_try: bool, tag: usize) -> Option<String> {
    let g = Graph::new(prog, tag)?;
    let wrap = format!("T{tag}");
    let halt = if in_try { Stmt::Break(wrap.clone()) } else { Stmt::Exit("return undefined;".into()) };
    let mut stmts = g.do_tree(prog.entry.0, &halt);
    if in_try {
        stmts = vec![Stmt::Block { label: wrap, body: stmts }];
    } else {
        // Falling off the end of a function body returns undefined anyway.
        match stmts.last() {
            Some(Stmt::Exit(s)) if s == "return undefined;" => {
                stmts.pop();
            }
            Some(Stmt::Op(Op::Return(RExpr::Undef))) => {
                stmts.pop();
            }
            _ => {}
        }
    }
    // (Before cleanup, which recurses as deep as the statements nest: a
    // graph that nests far past MAX_NESTING keeps the trampoline anyway,
    // see below. Cleanup only shallows the nesting.)
    if nests_deeper(&stmts, 4 * MAX_NESTING) {
        return None;
    }
    loop {
        let mut changed = false;
        stmts = cleanup(stmts, &mut changed);
        if !changed {
            break;
        }
    }
    if std::env::var_os("PE_NO_NATIVE_FOR_IN").is_none() {
        stmts = native_for_in(stmts);
        loop {
            let mut changed = false;
            stmts = cleanup(stmts, &mut changed);
            if !changed {
                break;
            }
        }
    }
    // A very large graph can nest thousands of blocks deep (one labeled block
    // per merge point). Past MAX_NESTING the output is unreadable and risks
    // overflowing a JavaScript parser, so the caller keeps the trampoline.
    if nesting(&stmts) > MAX_NESTING {
        return None;
    }
    let mut need = HashSet::new();
    needed_labels(&stmts, &mut Vec::new(), &mut need);
    let mut out = String::new();
    print(&stmts, ind, &mut Vec::new(), &need, &mut out);
    Some(out)
}
