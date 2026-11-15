//! The roles a function's local slots play for the arrays they index (see
//! `SlotRoles`), found once from its code (`analyse`): which slots drive
//! dispatch, which are places in a program the function interprets (an
//! index into an array it does not change, a lookup key), which of those
//! jump or step both ways (a program counter, as no loop counter does),
//! which walk a structure (a node pointer), and the arrays each indexes.
//! Every judgement the specializer makes about a slot as a place, at a
//! join, at a loop head, for a call's context, reads it from here.
//!
//! Per (func, slot): does the slot's value flow into an array-INDEX
//! position (`a[slot]`)? Such a slot is a *dispatch index* — if it is also
//! STATIC at a control-flow join it must stay SPLIT (polyvariant) rather
//! than merge to one dynamic variable, or the dispatch (`a[slot]`) could
//! never fold and the interpreter never compiles away. Computed coarsely:
//! the slots an index (of a read `a[i]` or a write `a[i] = v`) is
//! computed from by arithmetic within a straight-line run: `a[slot]`,
//! and an asm.js heap address `H[(base + pc) << 2 >> 2]`. (A stack
//! simulation that forgets at a leader and at any instruction it does
//! not follow: missing an index only forgoes a fold, so the
//! approximation is safe.)
//! (Run twice: `strict` as the joins have always judged a dispatch
//! slot (an index computed from slots by arithmetic alone), and not,
//! for the places of a program: lookup keys, concatenations.)

use super::*;

/// What each local slot of one function is to the arrays it indexes (see
/// `analyse`). A slot past the end of a table plays no role.
#[derive(Clone, Debug, Default)]
pub(super) struct SlotRoles {
    /// The slot is an array index (`a[slot]`, read or written), computed
    /// from slots by arithmetic alone: a static value of it stays split at
    /// a join (see `Js::join_mergeable`).
    pub(super) dispatch: Vec<bool>,
    /// The slots holding the arrays the slot indexes, `None` when one is no
    /// slot's (`this.code`) or the slot is a lookup key; empty, it indexes
    /// none itself.
    pub(super) bases: Vec<Option<Vec<usize>>>,
    /// A place of a program: the slot indexes an array the function does
    /// not change (a program, not a list it builds or a stack it pushes),
    /// or is a lookup key, or a copy of one of those.
    pub(super) program: Vec<bool>,
    /// A program counter: a place a store gives a value not made of
    /// constants and itself (it jumps, a counter only counts), or one
    /// stepped both ways (`++` and `--`) over a program the function holds
    /// in a slot and does not change, every array it indexes such (a
    /// matcher scanning its source for a bracket, as no counter does).
    pub(super) pc: Vec<bool>,
    /// A node pointer: a slot that walks a structure, every value stored in
    /// it read from one (or `null`/`undefined`, no node), reaching itself
    /// back through a property read.
    pub(super) node: Vec<bool>,
}

impl SlotRoles {
    pub(super) fn dispatch(&self, slot: usize) -> bool {
        self.dispatch.get(slot).copied().unwrap_or(false)
    }
    pub(super) fn program(&self, slot: usize) -> bool {
        self.program.get(slot).copied().unwrap_or(false)
    }
    pub(super) fn pc(&self, slot: usize) -> bool {
        self.pc.get(slot).copied().unwrap_or(false)
    }
    pub(super) fn node(&self, slot: usize) -> bool {
        self.node.get(slot).copied().unwrap_or(false)
    }
    /// The slots of the arrays `slot` indexes, when every one is a slot's
    /// and it indexes some.
    pub(super) fn bases(&self, slot: usize) -> Option<&[usize]> {
        match self.bases.get(slot) {
            Some(Some(b)) if !b.is_empty() => Some(b.as_slice()),
            _ => None,
        }
    }
    /// Has the function a node pointer at all?
    pub(super) fn any_node(&self) -> bool {
        self.node.iter().any(|n| *n)
    }
}

/// The roles of function `fid`'s slots, from its code. Two passes over it:
/// `strict` as the joins have always judged a dispatch slot (an index
/// computed from slots by arithmetic alone), and not, for the places of a
/// program (lookup keys, concatenations).
pub(super) fn analyse(code: &[Instr], entries: &[usize], leaders: &[bool], nslots: &[usize], fid: usize) -> SlotRoles {
    let (dispatch, _, bases) = analyse_pass(code, entries, leaders, nslots, fid, true);
    let (_, (_, (pc, program, node)), _) = analyse_pass(code, entries, leaders, nslots, fid, false);
    SlotRoles { dispatch, bases, program, pc, node }
}

/// One pass of `analyse`: the slots that drive dispatch; which jump and,
/// of the places of a program, the program counters, the places, and the
/// node pointers; and the arrays each indexes.
#[allow(clippy::type_complexity)]
fn analyse_pass(code: &[Instr], entries: &[usize], leaders: &[bool], nslots: &[usize], fid: usize, strict: bool) -> (Vec<bool>, (Vec<bool>, (Vec<bool>, Vec<bool>, Vec<bool>)), Vec<Option<Vec<usize>>>) {
    // (What a value on the stack is computed from: slots, by
    // arithmetic or concatenation; or a `get`/`has` method
    // read off an object, whose call's key drives dispatch as
    // an index does (an interpreter's state looked up in a
    // table: `rules.get(state + " " + symbol)`); or neither.)
    #[derive(Clone)]
    enum Prov {
        Slots(Vec<usize>),
        Lookup,
        /// A property read of the value of these slots.
        Field(Vec<usize>),
        /// A number constant (made of no slot, as `Slots([])`).
        Num(f64),
        /// `null` or `undefined`: no node, to a slot that walks
        /// a structure (`let picked = null`, the case not found
        /// yet). `PE_NO_NULL_NODES`: any other value.
        Nullish,
        Other,
    }
    let lo = entries[fid];
    let hi = entries.get(fid + 1).copied().unwrap_or(code.len());
    let mut dd = vec![false; nslots[fid]];
    // (Per slot, the slots a store into it computed its value
    // from: an index computed from a copy of the program counter,
    // `t = pc; pc = t + 1; code[t]`, drives dispatch through the
    // counter too.)
    let mut derived: Vec<Vec<usize>> = vec![Vec::new(); nslots[fid]];
    // (Per slot, whether a store gives it a value not made of
    // constants and itself alone: a program counter jumps (`pc =
    // ins[1]`), a loop's counter only counts.)
    let mut jumps = vec![false; nslots[fid]];
    // (Per slot, whether its value is stepped forward (`++`,
    // `+ c`) and back (`--`, `- c`): a place moving both ways
    // over what it indexes walks a program (a matcher scanning
    // for a bracket), no counter does. `PE_NO_TWO_WAY_PLACES`:
    // a counter.)
    let mut forward = vec![false; nslots[fid]];
    let mut backward = vec![false; nslots[fid]];
    // (Per slot, whether its array is changed in the function
    // (an indexed store, a mutating method): a program an
    // interpreter runs is not, a list it builds is. And each
    // index read: its slots, its array's.)
    let mut mutated = vec![false; nslots[fid]];
    // (Per slot, whether it is the key of a lookup, `rules.get(key)`.)
    let mut lookup_key = vec![false; nslots[fid]];
    let mut reads: Vec<(Vec<usize>, Option<Vec<usize>>)> = Vec::new();
    // (Per slot, the slots of the arrays it indexes (reads and
    // writes `a[slot]`), `None` when one is not a slot's.)
    let mut index_bases: Vec<Option<Vec<usize>>> = vec![Some(Vec::new()); nslots[fid]];
    let mut note_bases = |index: &Option<Vec<usize>>, base: &Option<Vec<usize>>| {
        for &sl in index.iter().flatten() {
            if let Some(Some(bs)) = index_bases.get_mut(sl) {
                match base {
                    Some(b) if !b.is_empty() => bs.extend(b.iter().copied()),
                    _ => index_bases[sl] = None,
                }
            }
        }
    };
    // (Per slot, whether a store gives it a property of its own
    // value (`node = node.then`): it walks a structure, an
    // interpreter's place in a syntax tree. And whether a store
    // gives it what is no property read at all.)
    // (Per slot, the slots whose values' properties a store
    // gives it, the slots a store copies, and whether a store
    // gives it anything else.)
    let mut field_of: Vec<Vec<usize>> = vec![Vec::new(); nslots[fid]];
    let mut copy_of: Vec<Vec<usize>> = vec![Vec::new(); nslots[fid]];
    let mut not_read = vec![false; nslots[fid]];
    let mut stack: Vec<Prov> = Vec::new();
    let slots_of = |p: Option<Prov>| match p {
        Some(Prov::Slots(v)) => Some(v),
        Some(Prov::Num(_) | Prov::Nullish) => Some(Vec::new()),
        _ => None,
    };
    let mark = |dd: &mut Vec<bool>, p: Option<Vec<usize>>| {
        for sl in p.unwrap_or_default() {
            if sl < dd.len() {
                dd[sl] = true;
            }
        }
    };
    for pc in lo..hi {
        if leaders[pc] {
            stack.clear();
        }
        match &code[pc] {
            Instr::Load(slot) => stack.push(Prov::Slots(vec![*slot])),
            Instr::PushNum(n) => stack.push(Prov::Num(n.f())),
            Instr::PushNull | Instr::PushUndef if !env_flag!("PE_NO_NULL_NODES") => stack.push(Prov::Nullish),
            Instr::PushStr(_) if !strict => stack.push(Prov::Slots(Vec::new())),
            Instr::Dup => {
                let top = stack.last().cloned().unwrap_or(Prov::Other);
                stack.push(top);
            }
            // (Operands combined: the slots of those that have
            // some, `state + " " + tape[head]` of `state`; when
            // `strict`, only of operands all computed so.)
            Instr::Bin(bop) => {
                let (b, a) = (stack.pop(), stack.pop());
                if let (Some(Prov::Slots(x)), Some(Prov::Num(c))) = (&a, &b) {
                    let dir = match bop {
                        Bop::Add if *c > 0.0 => Some(&mut forward),
                        Bop::Add if *c < 0.0 => Some(&mut backward),
                        Bop::Sub if *c > 0.0 => Some(&mut backward),
                        Bop::Sub if *c < 0.0 => Some(&mut forward),
                        _ => None,
                    };
                    if let Some(dir) = dir {
                        for &sl in x {
                            if sl < dir.len() {
                                dir[sl] = true;
                            }
                        }
                    }
                }
                let (b, a) = (slots_of(b), slots_of(a));
                stack.push(match (a, b) {
                    (Some(mut x), Some(y)) => {
                        x.extend(y);
                        Prov::Slots(x)
                    }
                    (None, None) => Prov::Other,
                    _ if strict => Prov::Other,
                    (x, y) => Prov::Slots(x.unwrap_or_default().into_iter().chain(y.unwrap_or_default()).collect()),
                });
            }
            // (A value computed from operands by an operator,
            // and a snapshot of one: from what they are. `pc++`
            // reads `pc` through `tonumeric` and a snapshot; its
            // store pops the incremented value.)
            Instr::OpaqueOp { arity, op } => {
                let mut from: Option<Vec<usize>> = Some(Vec::new());
                for _ in 0..*arity {
                    match (slots_of(stack.pop()), &mut from) {
                        (Some(x), Some(f)) => f.extend(x),
                        _ => from = None,
                    }
                }
                if let (Some(f), true) = (&from, *arity == 1) {
                    let dir = match op.as_str() {
                        "inc" => Some(&mut forward),
                        "dec" => Some(&mut backward),
                        _ => None,
                    };
                    if let Some(dir) = dir {
                        for &sl in f {
                            if sl < dir.len() {
                                dir[sl] = true;
                            }
                        }
                    }
                }
                stack.push(from.map_or(Prov::Other, Prov::Slots));
            }
            Instr::Snapshot => {}
            Instr::Store(dst) => {
                let top = stack.pop();
                if *dst < not_read.len() {
                    match &top {
                        Some(Prov::Field(objs)) => field_of[*dst].extend(objs.iter().copied()),
                        Some(Prov::Slots(from)) if !from.is_empty() => copy_of[*dst].extend(from.iter().copied()),
                        Some(Prov::Nullish) => {}
                        _ => not_read[*dst] = true,
                    }
                }
                let from = slots_of(top);
                if *dst < jumps.len() && from.as_ref().is_none_or(|v| v.iter().any(|s| s != dst)) {
                    jumps[*dst] = true;
                }
                if let (Some(from), true) = (from, *dst < derived.len()) {
                    derived[*dst].extend(from.into_iter().filter(|s| s != dst));
                }
            }
            Instr::GetProp(k) => {
                let obj = slots_of(stack.pop());
                if matches!(k.as_str(), "push" | "pop" | "shift" | "unshift" | "splice" | "reverse" | "sort" | "fill" | "copyWithin" | "set") {
                    for sl in obj.clone().unwrap_or_default() {
                        if sl < mutated.len() {
                            mutated[sl] = true;
                        }
                    }
                }
                stack.push(if k == "get" || k == "has" {
                    Prov::Lookup
                } else {
                    obj.map_or(Prov::Other, Prov::Field)
                });
            }
            Instr::CallMethod(n) => {
                let n = *n;
                if stack.len() >= n + 2 {
                    let at = stack.len() - n - 2;
                    if n >= 1 && !strict && matches!(stack[at + 1], Prov::Lookup) {
                        let key = slots_of(Some(stack[at + 2].clone()));
                        note_bases(&key, &None);
                        for &sl in key.iter().flatten() {
                            if sl < lookup_key.len() {
                                lookup_key[sl] = true;
                            }
                        }
                        mark(&mut dd, key);
                    }
                    stack.truncate(at);
                } else {
                    stack.clear();
                }
                stack.push(Prov::Other);
            }
            Instr::GetIndex => {
                let index = slots_of(stack.pop());
                let base = slots_of(stack.pop());
                // (An element at an index no slot gives
                // (`x[2]`, `x[x.length - 1]`) is a part of the
                // value read, as a property is: a syntax tree of
                // arrays is walked so, `x = x[2]`.
                // `PE_NO_INDEX_NODES`: no part, as before.)
                let part = match (&index, &base) {
                    (Some(i), Some(b)) if i.is_empty() && !b.is_empty() && !env_flag!("PE_NO_INDEX_NODES") => Some(b.clone()),
                    _ => None,
                };
                note_bases(&index, &base);
                reads.push((index.clone().unwrap_or_default(), base));
                mark(&mut dd, index);
                stack.push(part.map_or(Prov::Other, Prov::Field));
            }
            Instr::SetIndexOp => {
                stack.pop();
                let index = slots_of(stack.pop());
                let base = slots_of(stack.pop());
                note_bases(&index, &base);
                mark(&mut dd, index);
                for sl in base.unwrap_or_default() {
                    if sl < mutated.len() {
                        mutated[sl] = true;
                    }
                }
            }
            _ => stack.clear(),
        }
    }
    loop {
        let mut grew = false;
        for slot in 0..dd.len() {
            if dd[slot] {
                for &from in &derived[slot] {
                    if from < dd.len() && !dd[from] {
                        dd[from] = true;
                        grew = true;
                    }
                }
            }
        }
        if !grew {
            break;
        }
    }
    // (A slot a copy of which indexes (`t = pc; pc = t + 1;
    // code[t]`) indexes those arrays too.)
    loop {
        let mut grew = false;
        for slot in 0..index_bases.len() {
            let from_bases = index_bases[slot].clone();
            if from_bases.as_ref().is_some_and(|b| b.is_empty()) {
                continue;
            }
            for &from in &derived[slot] {
                let Some(cur) = index_bases.get(from).cloned() else { continue };
                let next = match (cur, &from_bases) {
                    (Some(mut c), Some(b)) => {
                        let before = c.len();
                        for x in b {
                            if !c.contains(x) {
                                c.push(*x);
                            }
                        }
                        if c.len() == before {
                            continue;
                        }
                        Some(c)
                    }
                    (Some(_), None) => None,
                    (None, _) => continue,
                };
                index_bases[from] = next;
                grew = true;
            }
        }
        if !grew {
            break;
        }
    }
    // (A program counter: a slot that jumps, indexing an array
    // the function does not change (or one read otherwise,
    // `this.code`), or a lookup key.)
    let mut program = vec![false; nslots[fid]];
    for (index, base) in &reads {
        if base.as_ref().is_none_or(|b| b.iter().all(|sl| !mutated.get(*sl).copied().unwrap_or(false))) {
            for &sl in index {
                if sl < program.len() {
                    program[sl] = true;
                }
            }
        }
    }
    for sl in 0..program.len() {
        // (A lookup key, or a copy of a counter that indexes:
        // as `dd` has it, through `derived`.)
        // (A copy that drives dispatch only through the copies of
        // a slot that indexes, `t = sp; st[t] = v; sp = t + 1`,
        // is a place only as that slot is (below): a VM's data
        // stack, which it writes, is no program, nor is the
        // pointer into it. `PE_COPY_INDEX_PLACES`: every copy.)
        if dd[sl] && !reads.iter().any(|(i, _)| i.contains(&sl)) && (lookup_key[sl] || env_flag!("PE_COPY_INDEX_PLACES")) {
            program[sl] = true;
        }
    }
    loop {
        let mut grew = false;
        for slot in 0..program.len() {
            if program[slot] {
                for &from in &derived[slot] {
                    if from < program.len() && !program[from] {
                        program[from] = true;
                        grew = true;
                    }
                }
            }
        }
        if !grew {
            break;
        }
    }
    // (Stepped both ways, itself or through the copies it is
    // stored from, `t = ip; ip = t - 1`.)
    let two_way: Vec<bool> = (0..jumps.len())
        .map(|i| {
            let fw = forward[i] || derived[i].iter().any(|&t| forward.get(t).copied().unwrap_or(false));
            let bw = backward[i] || derived[i].iter().any(|&t| backward.get(t).copied().unwrap_or(false));
            // (Over a program the function holds and does not
            // change, every array it indexes a slot's: one read
            // otherwise (a module's heap, `H[...]`) may be its
            // data too, which a stack pointer walks both ways.)
            let known = matches!(index_bases.get(i), Some(Some(b)) if !b.is_empty() && b.iter().all(|x| !mutated.get(*x).copied().unwrap_or(true)));
            fw && bw && known && !env_flag!("PE_NO_TWO_WAY_PLACES")
        })
        .collect();
    let pcs: Vec<bool> = (0..jumps.len()).map(|i| (jumps[i] || two_way[i]) && program[i]).collect();
    // (A node pointer: a slot that walks a structure, every value
    // stored in it read from one, or a copy of such a slot's
    // (`t = node.then; node = t`): read back into itself through
    // a property read.)
    let n = not_read.len();
    let mut ok: Vec<bool> = (0..n).map(|i| !not_read[i] && (!field_of[i].is_empty() || !copy_of[i].is_empty())).collect();
    loop {
        let mut changed = false;
        for i in 0..n {
            if ok[i] && copy_of[i].iter().any(|&c| c >= n || !ok[c]) {
                ok[i] = false;
                changed = true;
            }
        }
        if !changed {
            break;
        }
    }
    // (Whether `i` reaches itself back along stores, through at
    // least one property read.)
    let nodes: Vec<bool> = (0..n)
        .map(|i| {
            if !ok[i] {
                return false;
            }
            // (Search over (slot, through a read yet).)
            let mut seen = std::collections::HashSet::new();
            let mut work: Vec<(usize, bool)> = field_of[i].iter().map(|&o| (o, true)).chain(copy_of[i].iter().map(|&c| (c, false))).collect();
            while let Some((x, read)) = work.pop() {
                if x == i && read {
                    return true;
                }
                if x >= n || !seen.insert((x, read)) {
                    continue;
                }
                work.extend(field_of[x].iter().map(|&o| (o, true)));
                work.extend(copy_of[x].iter().map(|&c| (c, read)));
            }
            false
        })
        .collect();
    (dd, (jumps, (pcs, program, nodes)), index_bases)
}
