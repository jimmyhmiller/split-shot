//! The generic online partial-evaluation / driving engine.
//!
//! This module knows nothing about any particular source language. It walks a
//! client-provided operational semantics over a partially-static state, reduces
//! static control flow away, residualizes dynamic operations into basic blocks,
//! and memoizes specialization contexts so that runtime loops in the source
//! become loops in the residual.
//!
//! It is, structurally, abstract interpretation whose abstract domain is
//! "partially-static state" and whose output is a residual program rather than
//! a table of facts. Two clients drive it: `bf` (finite key space, no
//! generalization) and `imp` (a partially-static store that needs the whistle).

use std::collections::{HashMap, HashSet};
use std::hash::{Hash, Hasher};

use crate::residual::{Block, BlockId, Program, Terminator};

/// Backstop against unbounded *static* unrolling (e.g. `while 1 { i := i+1 }`).
/// If a single program point is specialized more than this many times, the
/// engine forces generalization. Generous enough that real static loops are
/// unaffected; small enough to guarantee termination.
const UNROLL_BOUND: usize = 5_000;

/// How many of the most recent earlier states at a point a candidate whose
/// loop guards are static is compared with (see `whistle_candidate`).
const WHISTLE_WINDOW: usize = 512;

/// A client supplies the *meaning* of its language; the engine supplies the
/// fixpoint, memoization, termination, and CFG-reconstruction plumbing.
pub trait Client {
    /// Partially-static machine state (what is known so far at a program point).
    type State: Clone;
    /// Full memoization key. Two states with the same key share a residual block.
    type Key: Eq + Hash + Clone;
    /// Coarse program point, used to group states for the generalization whistle.
    /// Many distinct `Key`s (different static stores) map to one `Point`.
    type Point: Eq + Hash + Clone;
    /// A straight-line residual instruction (opaque to the engine).
    type Op;
    /// A residual branch condition (opaque to the engine).
    type Cond;

    fn key(&self, s: &Self::State) -> Self::Key;
    fn point(&self, s: &Self::State) -> Self::Point;

    /// Advance the state by one source construct.
    ///
    /// * `at_entry` is true only for the very first step of a fresh block, so a
    ///   client can force a block boundary (end the block, restart fresh) when
    ///   straight-line execution falls into a join point / loop header.
    /// * Push onto `out` to residualize (the binding-time "dynamic" decision).
    /// * Returning `Continue` without pushing is the "static" decision.
    fn step(&self, s: &mut Self::State, out: &mut Vec<Self::Op>, at_entry: bool) -> Step<Self>;

    /// Termination whistle: should re-entering a point with `cand`, having
    /// already specialized it with `seen`, trigger generalization? Default:
    /// never (sound only when the key space is finite, as for BF).
    fn whistle(&self, _seen: &Self::State, _cand: &Self::State) -> bool {
        false
    }

    /// What `whistle` needs of `cand` alone, computed once for every `seen`
    /// it is weighed against (`whistle_given`). Default: nothing.
    type CandFacts;
    fn cand_facts(&self, cand: &Self::State) -> Self::CandFacts;
    /// A class of states for the whistle: two states in different classes
    /// (both `Some`) never fire it against each other, so `cand` is weighed
    /// only against the states of its own class and those of none. `None`
    /// (the default): weighed against all.
    fn whistle_class(&self, _s: &Self::State) -> Option<u64> {
        None
    }
    /// `whistle_class(cand)`, given `cand_facts(cand)` (`None` when `cand`
    /// may fire against a state of any class).
    fn cand_class(&self, cand: &Self::State, _facts: &Self::CandFacts) -> Option<u64> {
        self.whistle_class(cand)
    }
    /// `whistle(seen, cand)`, given `cand_facts(cand)`, for a `seen` known
    /// to differ from `cand` (the engine asks only about such: `cand`'s key
    /// is not memoized, every `seen`'s is).
    fn whistle_given(&self, seen: &Self::State, cand: &Self::State, _facts: &Self::CandFacts) -> bool {
        self.whistle(seen, cand)
    }

    /// Produce a state more general than `from` (typically by turning some
    /// static values dynamic), pushing into `out` whatever residual ops bridge
    /// the runtime state from `from` to the generalized state (materializing the
    /// now-dynamic values). Default: identity (no generalization).
    fn generalize(
        &self,
        _seen: &Self::State,
        from: &Self::State,
        _out: &mut Vec<Self::Op>,
    ) -> Self::State {
        from.clone()
    }
}

pub enum Step<C: Client + ?Sized> {
    /// Static reduction (or coalescing into pending state): stay in this block.
    Continue,
    /// Unconditional transfer. Subject to the whistle: this is where loop
    /// back-edges are tied off (and, if needed, generalized).
    Jump(C::State),
    /// `Jump`, to a state the client knows no other path reaches (a static
    /// loop's entry, in an activation that took no dynamic branch): no memo
    /// entry could match it, so its key is not computed (a key is a
    /// canonical copy of the whole state). Its block is still weighed by the
    /// whistle and kept for it; a jump the whistle fires on is a `Jump`.
    JumpFresh(C::State),
    /// Two-way dynamic branch. Each arm is specialized independently.
    Branch {
        cond: C::Cond,
        t: C::State,
        f: C::State,
    },
    /// End of computation along this path.
    Halt,
}

/// All the mutable bookkeeping for one specialization run.
struct Ctx<C: Client> {
    blocks: Vec<Block<C::Op, C::Cond>>,
    /// The blocks by their key's hash. A key is not kept: it is recomputed
    /// from the block's state (`block_states`) to confirm a match. (A key is
    /// a canonical copy of the whole state, sharing nothing with it or with
    /// other keys: kept, every block held a full copy of its heap.)
    memo: HashMap<u64, Vec<BlockId>>,
    /// Each block's state, as it was memoized (sharing structure with the
    /// states around it).
    block_states: Vec<C::State>,
    /// States already specialized, grouped by point, for the whistle, with
    /// their blocks.
    seen: HashMap<C::Point, Vec<(C::State, BlockId)>>,
    /// Per point: the indices into `seen` of each whistle class, and of the
    /// states of none (see `Client::whistle_class`), ascending.
    classes: HashMap<C::Point, (HashMap<u64, Vec<usize>>, Vec<usize>)>,
    work: Vec<(BlockId, C::State)>,
    /// Blocks rewritten by upward generalization into `bridge; br general`. Their
    /// original specialization is discarded: a pending work item for one is
    /// skipped, and a block being processed when it is rewritten keeps the
    /// rewrite rather than its own ops.
    replaced: HashSet<BlockId>,
}

/// Stack left before a deep recursion grows it (`stacker`), and how much it
/// grows by. A specialization nests one inside another (a residual
/// function's body is specialized when a call or a materialization needs it,
/// from inside the caller's), and a client may recurse over its values: the
/// depth follows the program, not a bound of ours.
pub const STACK_RED_ZONE: usize = 1024 * 1024;
pub const STACK_GROWTH: usize = 64 * 1024 * 1024;

pub fn specialize<C: Client>(client: &C, init: C::State) -> Program<C::Op, C::Cond> {
    stacker::maybe_grow(STACK_RED_ZONE, STACK_GROWTH, || specialize_here(client, init))
}

fn specialize_here<C: Client>(client: &C, init: C::State) -> Program<C::Op, C::Cond> {
    let mut cx = Ctx {
        blocks: Vec::new(),
        memo: HashMap::new(),
        block_states: Vec::new(),
        seen: HashMap::new(),
        classes: HashMap::new(),
        work: Vec::new(),
        replaced: HashSet::new(),
    };

    let entry = create_or_get(client, init, &mut cx);

    while let Some((bid, state)) = cx.work.pop() {
        if cx.replaced.contains(&bid) {
            continue;
        }
        let mut s = state;
        let mut ops: Vec<C::Op> = Vec::new();
        let mut at_entry = true;

        let term = loop {
            match client.step(&mut s, &mut ops, at_entry) {
                Step::Continue => at_entry = false,
                Step::Halt => break Terminator::Halt,
                Step::Jump(next) => {
                    // Back-edges run through the whistle and may append bridge
                    // ops (materializations) to this block before transferring.
                    let succ = resolve_jump(client, next, &mut ops, &mut cx);
                    break Terminator::Br(succ);
                }
                Step::JumpFresh(next) => {
                    let succ = match whistle_candidate(client, &next, &cx) {
                        None => create_fresh(client, next, &mut cx),
                        Some(_) => resolve_jump(client, next, &mut ops, &mut cx),
                    };
                    break Terminator::Br(succ);
                }
                Step::Branch { cond, t, f } => {
                    let bt = create_or_get(client, t, &mut cx);
                    let bf = create_or_get(client, f, &mut cx);
                    break Terminator::Cond { cond, t: bt, f: bf };
                }
            }
        };

        if cx.replaced.contains(&bid) {
            // This block was itself generalized upward while being specialized
            // (a back-edge into it fired the whistle); keep the rewrite.
            continue;
        }
        cx.blocks[bid.0].ops = ops;
        cx.blocks[bid.0].term = term;
    }

    Program {
        blocks: cx.blocks,
        entry,
    }
}

/// A memo key with its hash computed once (a key can be large: rehashing
/// the memo would otherwise hash every key again).
struct Hashed<K> {
    hash: u64,
    key: K,
}

impl<K: Hash> Hashed<K> {
    fn new(key: K) -> Self {
        let mut h = crate::js::FxHasher::default();
        key.hash(&mut h);
        Hashed { hash: h.finish(), key }
    }
}

impl<K: Eq> PartialEq for Hashed<K> {
    fn eq(&self, o: &Self) -> bool {
        self.hash == o.hash && self.key == o.key
    }
}

impl<K: Eq> Eq for Hashed<K> {}

impl<K> Hash for Hashed<K> {
    fn hash<H: Hasher>(&self, h: &mut H) {
        h.write_u64(self.hash);
    }
}

/// Look up a specialization context, or allocate a fresh block for it. This
/// single memo lookup is what turns source loops into residual loops and makes
/// specialization terminate.
fn create_or_get<C: Client>(client: &C, st: C::State, cx: &mut Ctx<C>) -> BlockId {
    let k = Hashed::new(client.key(&st));
    create_or_get_keyed(client, st, k, cx)
}

/// The block memoized with key `k`, if any: one whose key has `k`'s hash and,
/// recomputed from its state, equals `k`.
fn memo_get<C: Client>(client: &C, cx: &Ctx<C>, k: &Hashed<C::Key>) -> Option<BlockId> {
    cx.memo.get(&k.hash)?.iter().copied().find(|b| client.key(&cx.block_states[b.0]) == k.key)
}

/// `create_or_get`, with `st`'s key already computed.
fn create_or_get_keyed<C: Client>(client: &C, st: C::State, k: Hashed<C::Key>, cx: &mut Ctx<C>) -> BlockId {
    if let Some(b) = memo_get(client, cx, &k) {
        return b;
    }
    let id = BlockId(cx.blocks.len());
    cx.blocks.push(Block {
        ops: Vec::new(),
        term: Terminator::Unset,
    });
    cx.memo.entry(k.hash).or_default().push(id);
    add_block(client, st, id, cx);
    id
}

/// A fresh block for `st`, not memoized (see `Step::JumpFresh`).
fn create_fresh<C: Client>(client: &C, st: C::State, cx: &mut Ctx<C>) -> BlockId {
    let id = BlockId(cx.blocks.len());
    cx.blocks.push(Block {
        ops: Vec::new(),
        term: Terminator::Unset,
    });
    add_block(client, st, id, cx);
    id
}

/// Record block `id`'s state (for the memo's confirmation and the whistle)
/// and queue it.
fn add_block<C: Client>(client: &C, st: C::State, id: BlockId, cx: &mut Ctx<C>) {
    cx.block_states.push(st.clone());
    let p = client.point(&st);
    let list = cx.seen.entry(p.clone()).or_default();
    let i = list.len();
    list.push((st.clone(), id));
    let (by_class, unclassed) = cx.classes.entry(p).or_default();
    match client.whistle_class(&st) {
        Some(c) => by_class.entry(c).or_default().push(i),
        None => unclassed.push(i),
    }
    cx.work.push((id, st));
}

/// The most recent state seen at `target`'s point the whistle fires on
/// against `target` (or that the unroll backstop forces), with its block.
fn whistle_candidate<C: Client>(client: &C, target: &C::State, cx: &Ctx<C>) -> Option<(C::State, BlockId)> {
    let p = client.point(target);
    let v = cx.seen.get(&p)?;
    let force = v.len() >= UNROLL_BOUND;
    let facts = client.cand_facts(target);
    let class = if force { None } else { client.cand_class(target, &facts) };
    match class {
        None => v.iter().rev().find(|(s, _)| force || client.whistle_given(s, target, &facts)).cloned(),
        // (Only its class and the unclassed, most recent first.)
        Some(c) => {
            let (by_class, unclassed) = &cx.classes[&p];
            let same = by_class.get(&c).map(Vec::as_slice).unwrap_or(&[]);
            let (mut i, mut j) = (same.len(), unclassed.len());
            let mut looked = 0usize;
            loop {
                // (A classed candidate is compared with the most recent
                // states only: a loop's growth shows against its last
                // rounds, a join's other path arrived not long before. A
                // loop that fires against none of them goes on, to the
                // unroll backstop if it never ends, without each round
                // being compared with every round before it.)
                looked += 1;
                if looked > WHISTLE_WINDOW {
                    break None;
                }
                let next = match (i.checked_sub(1).map(|x| same[x]), j.checked_sub(1).map(|x| unclassed[x])) {
                    (Some(a), Some(b)) if a > b => {
                        i -= 1;
                        a
                    }
                    (_, Some(b)) => {
                        j -= 1;
                        b
                    }
                    (Some(a), None) => {
                        i -= 1;
                        a
                    }
                    (None, None) => break None,
                };
                if client.whistle_given(&v[next].0, target, &facts) {
                    break Some(v[next].clone());
                }
            }
        }
    }
}

/// Resolve a back-edge target, applying the generalization whistle. If re-entry
/// risks non-termination (the whistle fires, or the unroll backstop trips), the
/// target is generalized and bridge ops are appended to `ops` before the jump.
fn resolve_jump<C: Client>(
    client: &C,
    mut target: C::State,
    ops: &mut Vec<C::Op>,
    cx: &mut Ctx<C>,
) -> BlockId {
    loop {
        let k = Hashed::new(client.key(&target));
        if let Some(b) = memo_get(client, cx, &k) {
            return b;
        }

        match whistle_candidate(client, &target, cx) {
            Some((seen_state, seen_bid)) => {
                let general = client.generalize(&seen_state, &target, ops);
                // Generalization must make progress (a strictly more general
                // key), otherwise we would loop forever resolving the same key.
                let gk = client.key(&general);
                if gk == k.key {
                    // `target` is already the general state (a forward join
                    // whose other path is the more specific one): `seen` may
                    // still generalize up to it.
                    generalize_upward(client, &seen_state, seen_bid, &target, &general, &gk, cx);
                    return create_or_get(client, target, cx);
                }
                generalize_upward(client, &seen_state, seen_bid, &target, &general, &gk, cx);
                target = general;
            }
            None => return create_or_get_keyed(client, target, k, cx),
        }
    }
}

/// Upward generalization. The whistle fired because `target` re-enters the point
/// of an earlier state `seen` and has to be generalized to `general`. Jumping to
/// `general` from here alone would leave `seen`'s block as a peeled copy of the
/// loop's first iteration. Instead, rewrite `seen`'s block into the bridge from
/// `seen` to the same generalized state followed by a jump to it, so the residual
/// loop starts at its first iteration.
///
/// Sound by the `generalize` contract: generalizing `seen` (comparing it against
/// `target`) yields ops that bridge `seen`'s runtime state into the generalized
/// state. The rewrite only happens when that state has exactly the key of
/// `general`, i.e. both directions agree on one generalized state; otherwise
/// `seen`'s block is left alone, which is what the engine did before.
fn generalize_upward<C: Client>(
    client: &C,
    seen: &C::State,
    seen_bid: BlockId,
    target: &C::State,
    general: &C::State,
    general_key: &C::Key,
    cx: &mut Ctx<C>,
) {
    if cx.replaced.contains(&seen_bid) {
        return;
    }
    let mut bridge = Vec::new();
    let up = client.generalize(target, seen, &mut bridge);
    if client.key(&up) != *general_key {
        return;
    }
    let g = create_or_get(client, general.clone(), cx);
    if g == seen_bid {
        return;
    }
    cx.blocks[seen_bid.0] = Block {
        ops: bridge,
        term: Terminator::Br(g),
    };
    cx.replaced.insert(seen_bid);
}
