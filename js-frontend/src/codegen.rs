//! Emit valid JavaScript from a residual program.
//!
//! A fully-specialized residual is a single straight-line block, emitted as a
//! clean `function main(v0) { ...; return ...; }`. A residual with control flow
//! (loops / branches) is emitted as structured `while`/`if`/labeled-block code
//! when its graph is reducible (see `structured`), and otherwise as a
//! `switch`-on-program-counter trampoline, which is correct for any graph.

use std::cell::RefCell;
use std::collections::{BTreeSet, HashMap, HashSet};
use std::fmt::Write as _;

use partial::js::{
    member_suffix, render_call, render_fnref, render_get, render_new, rexpr_is_ref_like, Bop, Cond, FnKind, Js, Op, RExpr, ResidualFn,
};
use partial::residual::{Program, Terminator};

/// Render an object expression as a member/call base, parenthesizing it only
/// when it is not already a reference-like chain (so `v100000.k`, `Math.x`, but
/// `((a + b)).k`).
fn base_js(e: &RExpr) -> String {
    if rexpr_is_ref_like(e) {
        rexpr_to_js(e)
    } else {
        format!("({})", rexpr_to_js(e))
    }
}

/// Render the whole residual program: every generated residual function (for
/// escaped closures) plus `main`.
///
/// With `short_names`, each function's variables and labels get the shortest
/// names free in it (see `ShortNames`); otherwise variables print as `v<id>`.
/// `sources` holds each function's source (by fid, see `lower::compile_full`):
/// an escaped closure is emitted from it when that is smaller than its
/// specialized body (see `source_mode`).
pub fn program_to_js(
    vm: &Js,
    main_prog: &Program<Op, Cond>,
    input_var: usize,
    short_names: bool,
    sources: &[Option<crate::lower::FnSource>],
) -> String {
    let mut s = String::new();
    // Residual functions some code calls directly (`__rf<id>(captures...,
    // args...)`), as opposed to only through closure values.
    let mut flat_refs: HashSet<usize> = HashSet::new();
    program_flat_refs(main_prog, &mut flat_refs);
    for rf in vm.residual_fns().iter() {
        program_flat_refs(&rf.body, &mut flat_refs);
    }
    // Only the residual functions `main` reaches (specialization can make
    // some on a path it later abandoned).
    let fns = vm.residual_fns();
    let mut reachable: HashSet<usize> = HashSet::new();
    let mut work: Vec<usize> = Vec::new();
    program_fn_refs(main_prog, &mut work);
    while let Some(r) = work.pop() {
        if reachable.insert(r) {
            program_fn_refs(&fns[r].body, &mut work);
        }
    }
    // Fresh capture-free closures that can be a plain function expression
    // render inline where they are made (inner ones first: an inline body may
    // make another).
    INLINE.with(|m| m.borrow_mut().clear());
    CLASS_TEXT.with(|m| {
        let mut m = m.borrow_mut();
        m.clear();
        for (fid, src) in sources.iter().enumerate() {
            if let Some(src) = src {
                if crate::source_mode::class_text(src).is_some() {
                    let params = src.captures.iter().map(|(n, _)| n.clone()).collect();
                    m.insert(fid, ClassText { src: src.clone(), globals: src.globals.iter().cloned().collect(), params });
                }
            }
        }
    });
    // (A sloppy function made inside strict code would turn strict inline:
    // only one that no strict function makes is inlined.)
    let mut made_in_strict: HashSet<usize> = HashSet::new();
    let mut strict_bodies: Vec<&Program<Op, Cond>> = fns.iter().filter(|rf| rf.strict).map(|rf| &rf.body).collect();
    if vm.main_is_strict() {
        strict_bodies.push(main_prog);
    }
    for body in strict_bodies {
        let mut refs = Vec::new();
        program_fn_refs(body, &mut refs);
        made_in_strict.extend(refs);
    }
    // (Inline functions rendered from their source.)
    let mut inline_from_source: HashSet<usize> = HashSet::new();
    // (A function made more than once is written once, in its factory.)
    let mut made: HashMap<usize, usize> = HashMap::new();
    for body in std::iter::once(main_prog).chain(fns.iter().map(|rf| &rf.body)) {
        for_each_program_expr(body, &mut |e| count_new_fns(e, &mut made));
    }
    let candidates: HashSet<usize> = fns
        .iter()
        .enumerate()
        .filter(|(i, rf)| rf.fresh_values && rf.ncaptured == 0 && (rf.strict || !made_in_strict.contains(i)) && made.get(i).copied().unwrap_or(0) <= 1)
        .map(|(i, _)| i)
        .collect();
    loop {
        let mut progress = false;
        for &rfid in &candidates {
            if INLINE.with(|m| m.borrow().contains_key(&rfid)) {
                continue;
            }
            let mut deps = Vec::new();
            program_fn_refs(&fns[rfid].body, &mut deps);
            let ready = deps.iter().all(|d| *d == rfid || !candidates.contains(d) || INLINE.with(|m| m.borrow().contains_key(d)));
            if !ready || deps.contains(&rfid) {
                continue;
            }
            let spec = inline_fn_expr(&fns[rfid], short_names).map(|t| (t, program_globals(&fns[rfid].body)));
            // (Or its source, when that is smaller.)
            let src = fns[rfid]
                .fid
                .and_then(|f| sources.get(f))
                .and_then(|o| o.as_ref())
                .filter(|src| src.rerun || std::env::var_os("PE_NO_SOURCE_MODE").is_none())
                .and_then(|src| crate::source_mode::expr(&fns[rfid].js_name, src).map(|t| (t, src.globals.iter().cloned().collect())));
            let forced = fns[rfid].fid.and_then(|f| sources.get(f)).and_then(|o| o.as_ref()).is_some_and(|src| src.rerun);
            if forced && src.is_none() {
                continue;
            }
            // (Its source only when it must rerun at runtime: the
            // specialized form holds what was computed.)
            let pick = match (spec, src) {
                (_, Some(b)) if forced => {
                    inline_from_source.insert(rfid);
                    Some(b)
                }
                (Some(a), _) => Some(a),
                (None, _) => None,
            };
            if let Some(entry) = pick {
                INLINE.with(|m| m.borrow_mut().insert(rfid, entry));
                progress = true;
            }
        }
        if !progress {
            break;
        }
    }
    // A capture-free function value referenced once, by `main` outside any
    // loop: rendered there (see `INLINE_VALUE`).
    INLINE_VALUE.with(|m| m.borrow_mut().clear());
    let once_in_main: HashSet<usize> = {
        let mut counts: HashMap<usize, usize> = HashMap::new();
        count_fn_refs(main_prog, &mut counts);
        for &r in &reachable {
            count_fn_refs(&fns[r].body, &mut counts);
        }
        let cyclic = cyclic_blocks(main_prog);
        let mut once = HashSet::new();
        for (bi, b) in main_prog.blocks.iter().enumerate() {
            if cyclic.contains(&bi) {
                continue;
            }
            let mut here: HashMap<usize, usize> = HashMap::new();
            for op in &b.ops {
                if matches!(op, Op::Try { .. }) {
                    continue;
                }
                for e in partial::inline::op_exprs(op) {
                    count_expr_fn_refs(e, &mut here);
                }
            }
            if let partial::residual::Terminator::Cond { cond: Cond::Falsy(e), .. } = &b.term {
                count_expr_fn_refs(e, &mut here);
            }
            for (r, n) in here {
                if n == 1 && counts.get(&r) == Some(&1) {
                    once.insert(r);
                }
            }
        }
        once
    };
    {
        // (In a fixed order: the pools' and factories' numbering follows it.)
        let mut order: Vec<usize> = reachable.iter().copied().collect();
        order.sort_unstable();
        let mut progs: Vec<&Program<Op, Cond>> = vec![main_prog];
        progs.extend(order.iter().map(|&r| &fns[r].body));
        let pool = string_pool(&progs);
        STRING_POOL.with(|p| *p.borrow_mut() = pool);
        let factories = object_factories(&progs);
        OBJ_FACTORY.with(|m| *m.borrow_mut() = factories);
        let writes = partial::pristine::scan_all(&progs);
        STRING_REPEAT.with(|c| c.set(!writes.wild && !writes.names.contains("String")));
    }
    // Each function's text, and whether it is its source (which refers to
    // no residual function): reachability is decided again after.
    let mut segments: Vec<(usize, usize, usize)> = Vec::new();
    let mut from_source_used: HashSet<usize> = HashSet::new();
    // (Functions whose specialized body a factory of no captures holds.)
    let mut specialized_factory: HashSet<usize> = HashSet::new();
    for (rfid, rf) in fns.iter().enumerate() {
        if let Some(last) = segments.last_mut() {
            last.2 = s.len();
        }
        if !reachable.contains(&rfid) {
            continue;
        }
        segments.push((rfid, s.len(), s.len()));
        // A capture-free function some value of which is a fresh object
        // (`NewFn`): its factory of no captures (the shared value too only if
        // something refers to it).
        if rf.fresh_values && rf.ncaptured == 0 {
            let nestable = matches!(rf.kind, FnKind::Normal | FnKind::Arrow | FnKind::Method | FnKind::Generator);
            if INLINE.with(|m| m.borrow().contains_key(&rfid)) {
                // (Rendered where it is made; its body's references count,
                // unless that is its source.)
                if inline_from_source.contains(&rfid) {
                    from_source_used.insert(rfid);
                } else {
                    specialized_factory.insert(rfid);
                }
                if !flat_refs.contains(&rfid) {
                    continue;
                }
            } else if nestable {
                let _ = writeln!(s, "{}", nested_factory(rfid, rf, short_names));
                specialized_factory.insert(rfid);
                if !flat_refs.contains(&rfid) {
                    continue;
                }
                // (The shared value too is one the factory makes: the same
                // code, written once.)
                let _ = writeln!(s, "var __rf{rfid} = __mk{rfid}();\n");
                continue;
            } else {
                let _ = writeln!(s, "{}", closure_factory(rfid, rf));
            }
        }
        let mut params: Vec<usize> = rf.param_vars.clone();
        if let Some(a) = rf.args_var {
            // (The flat form takes its arguments object after the captures.)
            params.insert(rf.ncaptured, a);
        }
        let star = if rf.generator { "*" } else { "" };
        let asy = if rf.is_async { "async " } else { "" };
        let flat = format!("{asy}function{star} __rf{rfid}");
        // A closure used only as a value: the factory holds the body itself.
        let nested = rf.used_as_value
            && rf.ncaptured > 0
            && !flat_refs.contains(&rfid)
            && matches!(rf.kind, FnKind::Normal | FnKind::Arrow | FnKind::Method | FnKind::Generator);
        // (`PE_NO_SOURCE_MODE` always emits the specialized form, to debug it.)
        // (A class's source is the class's, made by `RExpr::ClassSrc`, not
        // its constructor's.)
        let src = rf
            .fid
            .and_then(|f| sources.get(f))
            .and_then(|o| o.as_ref())
            .filter(|src| !matches!(src.node, crate::lower::FnNode::Class { .. }))
            .filter(|src| src.rerun || std::env::var_os("PE_NO_SOURCE_MODE").is_none());
        // (One whose specialization reruns itself at runtime is only ever
        // its source: see `FnSource::rerun`.)
        let forced = src.is_some_and(|src| src.rerun);
        // A closure used only as a value can be its original source instead.
        // (Not one passed only some of its captures: its source takes them all.)
        // (A capture passed as its final cell's value is, in the source, a
        // variable read as is: nothing writes it again.)
        // (Nor one passed values besides its captures: see
        // `ResidualFn::imports`; unless it reads none of them.)
        let own = rf.unboxed.len();
        let as_source_takes = match &rf.cap_keep {
            None => rf.imports == 0,
            Some(keep) => own > 0 && keep.len() == own + rf.imports && keep[..own].iter().all(|k| *k) && keep[own..].iter().all(|k| !*k),
        };
        let from_source = if rf.used_as_value && rf.ncaptured > 0 && !flat_refs.contains(&rfid) && as_source_takes {
            src.and_then(|src| {
                if !rf.unboxed.iter().any(|u| *u) {
                    return crate::source_mode::factory(rfid, &rf.js_name, src);
                }
                assert_eq!(src.captures.len(), rf.unboxed.len(), "a function's source names each of its captures");
                let mut src = src.clone();
                for ((_, boxed), u) in src.captures.iter_mut().zip(&rf.unboxed) {
                    if *u {
                        *boxed = false;
                    }
                }
                crate::source_mode::factory(rfid, &rf.js_name, &src)
            })
        } else {
            None
        };
        if nested {
            let spec = nested_factory(rfid, rf, short_names);
            let pick = match from_source {
                Some(f) if forced => {
                    from_source_used.insert(rfid);
                    f
                }
                _ => spec,
            };
            let _ = writeln!(s, "{pick}");
            continue;
        }
        if let Some(f) = from_source.filter(|_| forced) {
            // (The specialized form here is a flat function plus a factory.)
            from_source_used.insert(rfid);
            let _ = writeln!(s, "{f}");
            continue;
        }
        if forced {
            let name = rf.js_name.as_str();
            let v = src
                .and_then(|src| crate::source_mode::value(rfid, name, src))
                .unwrap_or_else(|| panic!("internal: function `{name}` reruns at runtime but its source cannot be emitted"));
            from_source_used.insert(rfid);
            let _ = writeln!(s, "{v}");
            continue;
        }
        if !rf.used_as_value || rf.ncaptured > 0 {
            let _ = writeln!(s, "{}", render_function(&flat, &params, usize::MAX, &rf.body, short_names, rf.strict));
            if rf.used_as_value {
                let _ = writeln!(s, "{}", closure_factory(rfid, rf));
            }
            continue;
        }
        // The function itself is the runtime value: its `name` and `length`
        // must be the original's. Parameters from `length` on get a default,
        // which leaves them out of `length` without changing what they bind.
        let globals = program_globals(&rf.body);
        let name = rf.js_name.as_str();
        let len = rf.js_length;
        // Strict code: the directive in the function itself, or (when its
        // parameters past `length` are defaulted) in an enclosing function.
        let wrap_strict = rf.strict && len < params.len();
        // A class constructor (a plain function here) throws when called
        // without `new`, as the class's does.
        let guard = match rf.kind {
            FnKind::ClassCtor { .. } => format!(
                "if (!new.target) throw TypeError({});",
                js_string(&format!("Class constructor {name} cannot be invoked without 'new'"))
            ),
            _ => String::new(),
        };
        let render_function = |head: &str, params: &[usize], len: usize, body: &Program<Op, Cond>, short_names: bool, strict: bool| {
            render_function_with(head, params, len, body, short_names, strict, &guard, false, false)
        };
        // A base class whose prototype the residual takes from it: a
        // `class` (materialized both ways, a plain function whose prototype
        // is made read-only as the class's is).
        let class_value = matches!(rf.kind, FnKind::ClassCtor { derived: false }) && rf.as_class && !rf.as_function;
        let value = match rf.kind {
            _ if class_value => {
                let ctor = render_function_with("constructor", &params, len, &rf.body, short_names, rf.strict, "", true, false);
                let body = ctor.trim_end().lines().map(|l| format!("  {l}")).collect::<Vec<_>>().join("\n");
                if name.is_empty() {
                    format!("var __rf{rfid} = (0, class {{\n{body}\n}});")
                } else if binding_name_ok(name) && !globals.contains(name) {
                    format!("var __rf{rfid} = class {name} {{\n{body}\n}};")
                } else {
                    let (key, access) = method_key(name);
                    format!("var __rf{rfid} = {{{key}: class {{\n{body}\n}}}}{access};")
                }
            }
            // Arrows and methods are not constructors and have no
            // `prototype`: a method of a literal is the same kind of function,
            // and its key gives it any name.
            // (An arrow stays one, named by its property definition: its
            // body has no `this` or `arguments` of its own.)
            FnKind::Arrow if !rf.generator => {
                let (key, access) = method_key(name);
                let f = render_arrow(asy, &params, len, &rf.body, short_names, rf.strict);
                if name.is_empty() {
                    strict_value(rfid, &format!("({})", f.trim_end()), wrap_strict)
                } else {
                    strict_value(rfid, &format!("{{{key}: {}}}{access}", f.trim_end()), wrap_strict)
                }
            }
            FnKind::Arrow | FnKind::Method => {
                let (key, access) = method_key(name);
                let f = render_function(&format!("{asy}{star}{key}"), &params, len, &rf.body, short_names, rf.strict);
                strict_value(rfid, &format!("{{{}}}{access}", f.trim_end()), wrap_strict)
            }
            _ if name.is_empty() => {
                let f = render_function(&format!("{asy}function{star}"), &params, len, &rf.body, short_names, rf.strict);
                strict_value(rfid, &format!("(0, {})", f.trim_end()), wrap_strict)
            }
            _ if binding_name_ok(name) && !globals.contains(name) => {
                let f = render_function(&format!("{asy}function{star} {name}"), &params, len, &rf.body, short_names, rf.strict);
                strict_value(rfid, f.trim_end(), wrap_strict)
            }
            // (A name the function cannot take as its own, because the body
            // reads a global of that name: given by its property definition.)
            _ => {
                let (key, access) = method_key(name);
                let f = render_function(&format!("{asy}function{star}"), &params, len, &rf.body, short_names, rf.strict);
                strict_value(rfid, &format!("{{{key}: {}}}{access}", f.trim_end()), wrap_strict)
            }
        };
        let value = if matches!(rf.kind, FnKind::ClassCtor { derived: false }) && rf.as_class && rf.as_function {
            format!("{value}\nObject.defineProperty(__rf{rfid}, \"prototype\", {{ writable: false }});")
        } else {
            value
        };
        let value = match src.and_then(|src| crate::source_mode::value(rfid, name, src)).filter(|_| !matches!(rf.kind, FnKind::ClassCtor { .. })) {
            Some(v) if forced => {
                from_source_used.insert(rfid);
                v
            }
            None if forced => panic!("internal: function `{name}` reruns at runtime but its source cannot be emitted"),
            _ => value,
        };
        // (Referenced once by `main`: rendered there instead.)
        let prefix = format!("var __rf{rfid} = ");
        if once_in_main.contains(&rfid) && !rf.fresh_values && value.starts_with(&prefix) && value.ends_with(';') && !value.contains("\nObject.defineProperty(__rf") {
            let expr = value[prefix.len()..value.len() - 1].to_string();
            let mut globals = program_globals(&rf.body);
            if let Some(src) = src {
                globals.extend(src.globals.iter().cloned());
            }
            INLINE_VALUE.with(|m| m.borrow_mut().insert(rfid, (expr, globals)));
            continue;
        }
        let _ = writeln!(s, "{value}\n");
    }
    if let Some(last) = segments.last_mut() {
        last.2 = s.len();
    }
    // A function only a source-emitted one referred to (in its discarded
    // specialized body) is not needed.
    let mut needed: HashSet<usize> = HashSet::new();
    let mut work: Vec<usize> = Vec::new();
    program_fn_refs(main_prog, &mut work);
    while let Some(r) = work.pop() {
        if needed.insert(r) && (!from_source_used.contains(&r) || specialized_factory.contains(&r)) {
            program_fn_refs(&fns[r].body, &mut work);
        }
    }
    let mut kept = String::new();
    for (rfid, start, end) in segments {
        if needed.contains(&rfid) {
            kept.push_str(&s[start..end]);
        }
    }
    s = kept;
    let main_head = format!("{}function {}", if vm.main_is_async() { "async " } else { "" }, vm.entry_name());
    let _ = write!(s, "{}", render_function(&main_head, &[input_var], usize::MAX, main_prog, short_names, vm.main_is_strict()));
    // A script's top-level declarations, declared by the residual script.
    let vars: Vec<&str> = vm.script_decls().iter().filter(|(_, lex)| !lex).map(|(n, _)| n.as_str()).collect();
    let lets: Vec<&str> = vm.script_decls().iter().filter(|(_, lex)| *lex).map(|(n, _)| n.as_str()).collect();
    let mut decl = String::new();
    if !vars.is_empty() {
        let _ = writeln!(decl, "var {};", vars.join(", "));
    }
    if !lets.is_empty() {
        let _ = writeln!(decl, "let {};", lets.join(", "));
    }
    if !decl.is_empty() {
        s = format!("{decl}\n{s}");
    }
    // The shared object-literal factories.
    let mut facs: Vec<(String, usize)> = OBJ_FACTORY.with(|m| m.borrow().iter().map(|(t, k)| (t.clone(), *k)).collect());
    facs.sort_by_key(|(_, k)| *k);
    if !facs.is_empty() {
        let defs: Vec<String> = facs.iter().map(|(t, k)| format!("function __o{k}() {{\n  return {t};\n}}\n")).collect();
        s = format!("{}\n{s}", defs.concat());
    }
    // The pooled strings, defined first.
    let pool = STRING_POOL.with(|p| p.borrow().clone());
    if !pool.is_empty() {
        let defs: Vec<String> = pool.iter().enumerate().map(|(i, t)| format!("var __s{i} = {};\n", string_literal(t))).collect();
        s = format!("{}\n{s}", defs.concat());
    }
    // Runtime helpers the residual uses (see `runtime.js`), each once.
    let mut used = String::new();
    for (name, text) in runtime_helpers() {
        if s.contains(&format!("{name}(")) {
            used.push_str(text);
            used.push('\n');
        }
    }
    s = format!("{used}{s}");
    s
}

/// The residual runtime helpers: (name, source) for each `// helper: name`
/// section of `runtime.js`.
fn runtime_helpers() -> Vec<(&'static str, &'static str)> {
    const RUNTIME: &str = include_str!("runtime.js");
    let mut out = Vec::new();
    let mut rest = RUNTIME;
    while let Some(i) = rest.find("// helper: ") {
        let after = &rest[i + "// helper: ".len()..];
        let name_end = after.find('\n').expect("a helper name line");
        let name = after[..name_end].trim();
        let body = &after[name_end + 1..];
        let end = body.find("// helper: ").unwrap_or(body.len());
        out.push((name, &body[..end]));
        rest = &body[end..];
    }
    out
}

/// `var __rf<rfid> = <expr>;`, the expression created in a strict function
/// when `wrap_strict` (so a function with defaulted parameters is strict code).
fn strict_value(rfid: usize, expr: &str, wrap_strict: bool) -> String {
    if wrap_strict {
        format!("var __rf{rfid} = (function () {{\n  \"use strict\";\n  return {expr};\n}})();")
    } else {
        format!("var __rf{rfid} = {expr};")
    }
}

/// `__mk<rfid>(captures...)` holding the closure's body: it returns a
/// function of the original's kind, `name` and `length` whose body is the
/// residual body, the captures being the factory's parameters.
fn nested_factory(rfid: usize, rf: &ResidualFn, short_names: bool) -> String {
    let caps: Vec<usize> = rf.param_vars[..rf.ncaptured].to_vec();
    let params: Vec<usize> = rf.param_vars[rf.ncaptured..].to_vec();
    let globals = program_globals(&rf.body);
    let name = rf.js_name.as_str();
    let star = if rf.generator { "*" } else { "" };
    let asy = if rf.is_async { "async " } else { "" };
    let is_method = matches!(rf.kind, FnKind::Arrow | FnKind::Method);
    // A function expression's own name is a binding around its body: it must
    // not hide a global the body reads or one of its variables.
    let own_name = !name.is_empty()
        && binding_name_ok(name)
        && !globals.contains(name)
        && !(name.starts_with('v') && name[1..].chars().all(|c| c.is_ascii_digit()));
    let mut all: Vec<usize> = caps.clone();
    all.extend(params.iter().copied());
    let mut decls: BTreeSet<usize> = BTreeSet::new();
    collect_decls(&rf.body, &mut decls);
    for p in &all {
        decls.remove(p);
    }
    if short_names {
        let reserved: Vec<&str> = if own_name { vec![name] } else { vec![] };
        SHORT.with(|n| *n.borrow_mut() = Some(ShortNames::for_function(&all, &rf.body, &reserved)));
    }
    STRICT.with(|c| c.set(rf.strict));
    let cap_list: Vec<String> = caps.iter().map(|v| var_js(*v)).collect();
    let param_list = param_list(rf, &params);
    let mut body = String::new();
    if !decls.is_empty() {
        let names: Vec<String> = decls.iter().map(|v| var_js(*v)).collect();
        let _ = writeln!(body, "    let {};", names.join(", "));
    }
    if let Some(a) = rf.args_var.filter(|a| program_reads_var(&rf.body, *a)) {
        let _ = writeln!(body, "    const {} = arguments;", var_js(a));
    }
    body.push_str(&render_blocks(&rf.body, "    ", false));
    SHORT.with(|n| *n.borrow_mut() = None);
    let ps = param_list.join(", ");
    let mut out = format!("function __mk{rfid}({}) {{\n", cap_list.join(", "));
    if rf.strict {
        // (The returned function may have defaulted parameters: it inherits
        // the factory's strictness.)
        out.push_str("  \"use strict\";\n");
    }
    if matches!(rf.kind, FnKind::Arrow) && !rf.generator && rf.args_var.is_none() {
        // (An arrow stays one, named by its property definition.)
        if name.is_empty() {
            let _ = write!(out, "  return {asy}({ps}) => {{\n{body}  }};\n");
        } else {
            let (key, access) = method_key(name);
            let _ = write!(out, "  return {{{key}: {asy}({ps}) => {{\n{body}  }}}}{access};\n");
        }
    } else if is_method {
        let (key, access) = method_key(name);
        let _ = write!(out, "  return {{{asy}{star}{key}({ps}) {{\n{body}  }}}}{access};\n");
    } else if own_name || name.is_empty() {
        let sp = if name.is_empty() { String::new() } else { format!(" {name}") };
        let _ = write!(out, "  return {asy}function{star}{sp}({ps}) {{\n{body}  }};\n");
    } else {
        let _ = write!(
            out,
            "  const __f = {asy}function{star} ({ps}) {{\n{body}  }};\n  Object.defineProperty(__f, \"name\", {{ value: {} }});\n  return __f;\n",
            js_string(name)
        );
    }
    out.push_str("}\n");
    out
}

/// A residual function's parameters as written: those past its `length`
/// defaulted (`= void 0`: they do not count), but trailing ones its body
/// never reads, left out.
fn param_list(rf: &ResidualFn, params: &[usize]) -> Vec<String> {
    let used = partial::inline::used_vars(&rf.body);
    let mut n = params.len();
    while n > rf.js_length && !used.contains(&params[n - 1]) {
        n -= 1;
    }
    params[..n].iter().enumerate().map(|(i, v)| if i >= rf.js_length { format!("{} = void 0", var_js(*v)) } else { var_js(*v) }).collect()
}

/// The function expression a fresh capture-free closure of `rf` is, when it
/// can be a plain expression (a nested form without a factory's own strict
/// directive or `name` definition); else `None` (it keeps its factory).
fn inline_fn_expr(rf: &ResidualFn, short_names: bool) -> Option<String> {
    if !matches!(rf.kind, FnKind::Normal | FnKind::Arrow | FnKind::Method | FnKind::Generator) || rf.args_var.is_some() {
        return None;
    }
    let params: Vec<usize> = rf.param_vars.clone();
    // (A strict function needs its own directive, which defaulted
    // parameters rule out.)
    if rf.strict && rf.js_length < params.len() {
        return None;
    }
    let globals = program_globals(&rf.body);
    let name = rf.js_name.as_str();
    let is_method = matches!(rf.kind, FnKind::Arrow | FnKind::Method);
    let own_name = !name.is_empty()
        && binding_name_ok(name)
        && !globals.contains(name)
        && !(name.starts_with('v') && name[1..].chars().all(|c| c.is_ascii_digit()));
    if !is_method && !name.is_empty() && !own_name {
        return None;
    }
    let star = if rf.generator { "*" } else { "" };
    let asy = if rf.is_async { "async " } else { "" };
    let mut decls: BTreeSet<usize> = BTreeSet::new();
    collect_decls(&rf.body, &mut decls);
    for p in &params {
        decls.remove(p);
    }
    // (Rendered with its own names, restoring the enclosing state after.)
    let saved_short = SHORT.with(|n| n.borrow_mut().take());
    let saved_strict = STRICT.with(|c| c.get());
    if short_names {
        let reserved: Vec<&str> = if own_name { vec![name] } else { vec![] };
        SHORT.with(|n| *n.borrow_mut() = Some(ShortNames::for_function(&params, &rf.body, &reserved)));
    }
    STRICT.with(|c| c.set(rf.strict));
    let param_list = param_list(rf, &params);
    let mut body = String::new();
    if rf.strict {
        let _ = writeln!(body, "  \"use strict\";");
    }
    if !decls.is_empty() {
        let names: Vec<String> = decls.iter().map(|v| var_js(*v)).collect();
        let _ = writeln!(body, "  let {};", names.join(", "));
    }
    body.push_str(&render_blocks(&rf.body, "  ", false));
    SHORT.with(|n| *n.borrow_mut() = saved_short);
    STRICT.with(|c| c.set(saved_strict));
    let ps = param_list.join(", ");
    Some(if is_method {
        let (key, access) = method_key(name);
        format!("{{{asy}{star}{key}({ps}) {{\n{body}}}}}{access}")
    } else {
        let sp = if name.is_empty() { String::new() } else { format!(" {name}") };
        format!("{asy}function{star}{sp}({ps}) {{\n{body}}}")
    })
}

/// The long strings (`MIN_POOLED` characters or more) the string values of
/// `progs` repeat, longest first: each occurs at least twice in all of them
/// together (as a whole value or inside one), and contains or is contained
/// in no string pooled before it.
fn string_pool(progs: &[&Program<Op, Cond>]) -> Vec<String> {
    const MIN_POOLED: usize = 32;
    let mut values: Vec<String> = Vec::new();
    fn collect(e: &RExpr, out: &mut Vec<String>) {
        if let RExpr::Str(s) = e {
            out.push(s.clone());
        }
        for_each_child(e, &mut |c| collect(c, out));
    }
    for p in progs {
        for_each_program_expr(p, &mut |e| collect(e, &mut values));
    }
    // (Only a value as long as a candidate can hold it: the long values,
    // each counted once with how often it occurs.)
    let mut long: HashMap<&str, usize> = HashMap::new();
    for v in &values {
        if v.chars().count() >= MIN_POOLED {
            *long.entry(v.as_str()).or_insert(0) += 1;
        }
    }
    let mut candidates: Vec<&str> = long.keys().copied().collect();
    candidates.sort_by(|a, b| b.len().cmp(&a.len()).then_with(|| a.cmp(b)));
    let mut pool: Vec<String> = Vec::new();
    for c in candidates {
        if pool.iter().any(|p| p.contains(c) || c.contains(p.as_str())) {
            continue;
        }
        let finder = memchr::memmem::Finder::new(c.as_bytes());
        // (Occurrences as `str::matches` counts them: not overlapping.)
        let occurrences: usize = long.iter().map(|(v, n)| n * non_overlapping(&finder, v.as_bytes(), c.len())).sum();
        if occurrences >= 2 {
            pool.push(c.to_string());
        }
    }
    pool
}

/// How many times `finder`'s needle (`len` bytes) occurs in `hay`, none
/// overlapping another (as `str::matches` counts them).
fn non_overlapping(finder: &memchr::memmem::Finder, hay: &[u8], len: usize) -> usize {
    let mut n = 0;
    let mut at = 0;
    while let Some(i) = finder.find(&hay[at..]) {
        n += 1;
        at += i + len;
    }
    n
}

/// A string value as source: a literal, or `"u".repeat(n)` for a long one
/// that is a short unit repeated (when the residual writes nothing of
/// `String`). Either is a member-call or primary expression.
fn string_literal(s: &str) -> String {
    let n = s.chars().count();
    if n >= 32 && STRING_REPEAT.with(|c| c.get()) {
        let chars: Vec<char> = s.chars().collect();
        for len in 1..=8 {
            if n % len == 0 && n / len >= 4 && chars.chunks(len).all(|c| c == &chars[..len]) {
                let unit: String = chars[..len].iter().collect();
                return format!("{}.repeat({})", js_string(&unit), n / len);
            }
        }
    }
    js_string(s)
}

/// `s` as a concatenation naming the pooled strings it holds (see
/// `STRING_POOL`), or `None` when it holds none.
fn pooled_string(s: &str) -> Option<String> {
    STRING_POOL.with(|pool| {
        let pool = pool.borrow();
        let (i, p) = pool.iter().enumerate().find(|(_, p)| s.contains(p.as_str()))?;
        let name = format!("__s{i}");
        let mut parts: Vec<String> = Vec::new();
        let mut rest = s;
        while let Some(at) = rest.find(p.as_str()) {
            if at > 0 {
                parts.push(pooled_string(&rest[..at]).unwrap_or_else(|| string_literal(&rest[..at])));
            }
            parts.push(name.clone());
            rest = &rest[at + p.len()..];
        }
        if !rest.is_empty() {
            parts.push(pooled_string(rest).unwrap_or_else(|| string_literal(rest)));
        }
        // (A lone name that is not first is still a string: the first part
        // is a literal or a pooled string.)
        Some(parts.join(" + "))
    })
}

/// Count every reference (`FnRef`, `NewFn`) to a residual function in `prog`.
/// Count the `NewFn`s (fresh function objects) in `e`, by function.
fn count_new_fns(e: &RExpr, out: &mut HashMap<usize, usize>) {
    if let RExpr::NewFn { rfid } = e {
        *out.entry(*rfid).or_insert(0) += 1;
    }
    for_each_child(e, &mut |c| count_new_fns(c, out));
}

fn count_fn_refs(prog: &Program<Op, Cond>, out: &mut HashMap<usize, usize>) {
    for_each_program_expr(prog, &mut |e| count_expr_fn_refs(e, out));
}

fn count_expr_fn_refs(e: &RExpr, out: &mut HashMap<usize, usize>) {
    if let RExpr::FnRef { rfid, .. } | RExpr::NewFn { rfid } = e {
        *out.entry(*rfid).or_insert(0) += 1;
    }
    for_each_child(e, &mut |c| count_expr_fn_refs(c, out));
}

/// The blocks of `prog` on a cycle (a loop's).
fn cyclic_blocks(prog: &Program<Op, Cond>) -> HashSet<usize> {
    let succs = |b: usize| -> Vec<usize> {
        match &prog.blocks[b].term {
            partial::residual::Terminator::Br(t) => vec![t.0],
            partial::residual::Terminator::Cond { t, f, .. } => vec![t.0, f.0],
            _ => vec![],
        }
    };
    let mut out = HashSet::new();
    for b in 0..prog.blocks.len() {
        let mut seen = HashSet::new();
        let mut work = succs(b);
        while let Some(x) = work.pop() {
            if x == b {
                out.insert(b);
                break;
            }
            if seen.insert(x) {
                work.extend(succs(x));
            }
        }
    }
    out
}

/// Record every residual function `prog` refers to directly (a `FnRef`
/// without captures: a direct call, or an uncaptured function's value).
fn program_flat_refs(prog: &Program<Op, Cond>, out: &mut HashSet<usize>) {
    fn expr(e: &RExpr, out: &mut HashSet<usize>) {
        if let RExpr::FnRef { rfid, caps } = e {
            if caps.is_empty() {
                out.insert(*rfid);
            }
        }
        for_each_child(e, &mut |c| expr(c, out));
    }
    for_each_program_expr(prog, &mut |e| expr(e, out));
}

/// Every residual function `prog` refers to (directly or through a closure
/// value).
fn program_fn_refs(prog: &Program<Op, Cond>, out: &mut Vec<usize>) {
    fn expr(e: &RExpr, out: &mut Vec<usize>) {
        if let RExpr::FnRef { rfid, .. } | RExpr::NewFn { rfid } = e {
            out.push(*rfid);
        }
        for_each_child(e, &mut |c| expr(c, out));
    }
    for_each_program_expr(prog, &mut |e| expr(e, out));
}

/// Does `prog` read the variable `v`?
fn program_reads_var(prog: &Program<Op, Cond>, v: usize) -> bool {
    let mut counts = HashMap::new();
    let mut globals = HashSet::new();
    count_program(prog, &mut counts, &mut globals);
    counts.contains_key(&v)
}

fn for_each_child(e: &RExpr, f: &mut dyn FnMut(&RExpr)) {
    match e {
        RExpr::Num(_) | RExpr::Str(_) | RExpr::Bool(_) | RExpr::Undef | RExpr::Null | RExpr::This | RExpr::Var(_) | RExpr::Global(_) | RExpr::RegexLit(..) | RExpr::BigInt(_) | RExpr::NewFn { .. } | RExpr::Hole | RExpr::Verbatim(..) => {}
        RExpr::OwnMember { obj, .. } => f(obj),
        RExpr::ClassSrc { parent, caps, .. } => {
            if let Some(p) = parent {
                f(p);
            }
            caps.iter().for_each(|x| f(x));
        }
        RExpr::Bin(_, a, b) | RExpr::Index(a, b) => {
            f(a);
            f(b);
        }
        RExpr::Get(o, _) | RExpr::Yield(o) | RExpr::Await(o) | RExpr::Delete(o) => f(o),
        RExpr::Opaque(_, xs) | RExpr::FnRef { caps: xs, .. } | RExpr::ArrayLit(xs) => xs.iter().for_each(|x| f(x)),
        RExpr::Call(c, xs) | RExpr::New(c, xs) => {
            f(c);
            xs.iter().for_each(|x| f(x));
        }
        RExpr::BoundMethod { func, recv } => {
            f(func);
            f(recv);
        }
        RExpr::ObjectLit(fs) => fs.iter().for_each(|(_, x)| f(x)),
    }
}

/// Visit every top-level expression of every op and condition in `prog`
/// (and its `try` sub-programs).
fn for_each_program_expr(prog: &Program<Op, Cond>, f: &mut dyn FnMut(&RExpr)) {
    for b in &prog.blocks {
        for op in &b.ops {
            match op {
                Op::Assign { expr, .. } | Op::Eval { expr, .. } | Op::AssignGlobal { expr, .. } => f(expr),
                Op::Return(e) | Op::Throw(e) | Op::Effect(e) => f(e),
                Op::NewObject { fields, .. } => fields.iter().for_each(|(_, e)| f(e)),
                Op::NewArray { elems, .. } => elems.iter().for_each(|e| f(e)),
                Op::PushOp { arr, val } => {
                    f(arr);
                    f(val);
                }
                Op::SetIndex { arr, index, val } => {
                    f(arr);
                    f(index);
                    f(val);
                }
                Op::SetProp { obj, val, .. } => {
                    f(obj);
                    f(val);
                }
                Op::DeleteProp { obj, .. } => f(obj),
                Op::DeleteIndex { arr, index } => {
                    f(arr);
                    f(index);
                }
                Op::Try { body, catch_body, finally_body, .. } => {
                    for_each_program_expr(body, f);
                    for_each_program_expr(catch_body, f);
                    if let Some(fb) = finally_body {
                        for_each_program_expr(fb, f);
                    }
                }
            }
        }
        if let Terminator::Cond { cond: Cond::Falsy(e), .. } = &b.term {
            f(e);
        }
    }
}

/// `__mk<rfid>(captures...)`: the runtime value of a closure whose residual
/// function takes its captures as leading arguments. It returns a function of
/// the original's kind, `name` and `length` that forwards its `this` and
/// arguments (and, for a constructor, `new.target`).
fn closure_factory(rfid: usize, rf: &ResidualFn) -> String {
    let caps: Vec<String> = (0..rf.ncaptured).map(|i| format!("c{i}")).collect();
    let cs = caps.join(", ");
    let name = rf.js_name.as_str();
    // Parameter names that only set `length` (the call forwards `arguments`).
    let mut taken: HashSet<String> = caps.iter().cloned().collect();
    taken.insert(name.to_string());
    let mut ps = Vec::new();
    let mut k = 0;
    while ps.len() < rf.js_length {
        let n = nth_ident(k);
        k += 1;
        if !taken.contains(&n) && !RESERVED.contains(&n.as_str()) {
            ps.push(n);
        }
    }
    let params = ps.join(", ");
    // (A function reading `arguments` gets this one's after its captures.)
    // The forwarded leading arguments: the captures (and, for a function
    // reading `arguments`, this one's), each followed by a comma.
    let mut lead: Vec<String> = caps.clone();
    if rf.args_var.is_some() {
        lead.push("arguments".into());
    }
    let pass: String = lead.iter().map(|x| format!("{x}, ")).collect();
    let fwd = format!("__rf{rfid}.call(this, {pass}...arguments)");
    // A strict function's wrapper is strict too (a sloppy one would pass the
    // global object as an undefined `this`).
    let directive = if rf.strict { "\"use strict\";\n  " } else { "" };
    if rf.is_async {
        // An async function: not a constructor, an `AsyncFunction` (by its
        // prototype), returning the residual function's own promise (an
        // `async` wrapper would add microtask ticks).
        let (key, access) = method_key(name);
        return format!(
            "function __mk{rfid}({cs}) {{\n  {directive}return Object.setPrototypeOf({{{key}({params}) {{ return {fwd}; }}}}{access}, Object.getPrototypeOf(async function () {{}}));\n}}\n"
        );
    }
    let (head, body) = match rf.kind {
        FnKind::Arrow | FnKind::Method => {
            let (key, access) = method_key(name);
            let star = if rf.generator { "*" } else { "" };
            let body = if rf.generator { format!("return yield* {fwd};") } else { format!("return {fwd};") };
            return format!("function __mk{rfid}({cs}) {{\n  {directive}return {{{star}{key}({params}) {{ {body} }}}}{access};\n}}\n");
        }
        FnKind::Generator => ("function*", format!("return yield* {fwd};")),
        // Called without `new`, `Reflect.construct` throws its TypeError.
        FnKind::ClassCtor { .. } => {
            ("function", format!("return Reflect.construct(__rf{rfid}, [{pass}...arguments], new.target);"))
        }
        FnKind::Normal => (
            "function",
            format!("return new.target ? Reflect.construct(__rf{rfid}, [{pass}...arguments], new.target) : {fwd};"),
        ),
    };
    let reserved_here = ["Reflect", "arguments", "eval"];
    if name.is_empty() || (binding_name_ok(name) && !reserved_here.contains(&name) && !name.starts_with("__")) {
        let sp = if name.is_empty() { String::new() } else { format!(" {name}") };
        format!("function __mk{rfid}({cs}) {{\n  {directive}return {head}{sp}({params}) {{ {body} }};\n}}\n")
    } else {
        format!(
            "function __mk{rfid}({cs}) {{\n  {directive}const __f = {head} ({params}) {{ {body} }};\n  Object.defineProperty(__f, \"name\", {{ value: {} }});\n  return __f;\n}}\n",
            js_string(name)
        )
    }
}

/// A method key giving a function the name `name`, and the member access that
/// reads it back: `name`/`.name` for an identifier name, else a string key.
fn method_key(name: &str) -> (String, String) {
    if is_identifier_name(name) {
        (name.to_string(), format!(".{name}"))
    } else {
        let k = js_string(name);
        (k.clone(), format!("[{k}]"))
    }
}

/// An IdentifierName (ASCII subset): letters, digits, `_`, `$`, not starting
/// with a digit.
fn is_identifier_name(name: &str) -> bool {
    let mut cs = name.chars();
    matches!(cs.next(), Some(c) if c.is_ascii_alphabetic() || c == '_' || c == '$')
        && cs.all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '$')
}

/// Usable as a function expression's own name: an identifier that is not a
/// reserved word and not one of the residual's own names (`__rf...`).
fn binding_name_ok(name: &str) -> bool {
    // (Some names are only kept from variables, which these are not: `main`
    // is the residual's entry, and `of`/`get`/`set`/`async` are fine
    // identifiers. A function expression's own name is scoped to itself.)
    let only_for_variables = ["main", "of", "get", "set", "async"];
    is_identifier_name(name) && (only_for_variables.contains(&name) || !RESERVED.contains(&name)) && !name.starts_with("__")
}

/// The globals a residual function body refers to (a local of the same name,
/// such as the function expression's own name, would shadow them).
fn program_globals(prog: &Program<Op, Cond>) -> HashSet<String> {
    let mut counts = HashMap::new();
    let mut globals = HashSet::new();
    count_program(prog, &mut counts, &mut globals);
    globals
}

/// Collect every residual variable that needs a `let` declaration, recursing
/// into nested `try`/`catch` programs (their locals are hoisted to the enclosing
/// function; the catch's exception binding is a `catch` parameter, not a `let`).
fn collect_decls(prog: &Program<Op, Cond>, decls: &mut BTreeSet<usize>) {
    for b in &prog.blocks {
        for op in &b.ops {
            match op {
                Op::Assign { var, .. } => {
                    decls.insert(*var);
                }
                Op::NewObject { dst, .. } | Op::NewArray { dst, .. } | Op::Eval { dst, .. } => {
                    decls.insert(*dst);
                }
                Op::Try { body, catch_slot, catch_body, finally_body } => {
                    collect_decls(body, decls);
                    collect_decls(catch_body, decls);
                    if let Some(fb) = finally_body {
                        collect_decls(fb, decls);
                    }
                    if let Some(cs) = catch_slot {
                        decls.remove(cs); // bound by `catch (vN)`, not `let`
                    }
                }
                Op::PushOp { .. }
                | Op::SetIndex { .. }
                | Op::SetProp { .. }
                | Op::DeleteProp { .. }
                | Op::DeleteIndex { .. }
                | Op::AssignGlobal { .. }
                | Op::Return(_)
                | Op::Effect(_)
                | Op::Throw(_) => {}
            }
        }
    }
}

/// Fresh trampoline labels so a `try`/`catch` sub-program can break out of its
/// own loop without colliding with an enclosing one.
static LABEL: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);

/// Render a residual program's blocks (no function wrapper, no declarations):
/// a single-block `Halt` program emits straight-line statements, anything with
/// control flow emits a `switch`-on-program-counter trampoline. Used for the
/// function body and, recursively, for `try`/`catch` bodies. `ind` is the
/// leading indentation.
///
/// `in_try` distinguishes the two uses on a normal-completion (`Halt`)
/// terminator: a function body returns from the function (`return undefined`),
/// but a `try`/`catch` sub-program must merely *end the block* (break out of its
/// trampoline) so control continues after the `try`. Rendering the latter as a
/// `return` would return from the enclosing function instead of finishing the
/// handler, e.g. a `catch` that should fall through and loop again.
fn render_blocks(prog: &Program<Op, Cond>, ind: &str, in_try: bool) -> String {
    let mut s = String::new();
    let straight_line =
        prog.blocks.len() == 1 && matches!(prog.blocks[0].term, Terminator::Halt);
    if straight_line {
        // A single Halt block: emit the ops and fall through (the block ends
        // naturally; a function then returns undefined, a try block continues).
        let ops = &prog.blocks[0].ops;
        // (A function body's final `return undefined;` is falling off its end.)
        let n = if !in_try && matches!(ops.last(), Some(Op::Return(RExpr::Undef))) { ops.len() - 1 } else { ops.len() };
        for op in &ops[..n] {
            let _ = writeln!(s, "{ind}{}", op_to_js(op, ind));
        }
        return s;
    }
    let tag = LABEL.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    if let Some(structured) = crate::structured::render_structured(prog, ind, in_try, tag) {
        return structured;
    }
    // Irreducible control flow: fall back to the trampoline.
    let label = if in_try { Some(format!("__t{tag}")) } else { None };
    let halt_stmt = match &label {
        Some(l) => format!("break {l};"),
        None => "return undefined;".to_string(),
    };
    let _ = writeln!(s, "{ind}let __pc = {};", prog.entry.0);
    if let Some(l) = &label {
        let _ = writeln!(s, "{ind}{l}: for (;;) {{");
    } else {
        let _ = writeln!(s, "{ind}for (;;) {{");
    }
    let _ = writeln!(s, "{ind}  switch (__pc) {{");
    let inner = format!("{ind}      ");
    for (i, b) in prog.blocks.iter().enumerate() {
        let _ = writeln!(s, "{ind}    case {i}: {{");
        for op in &b.ops {
            let _ = writeln!(s, "{inner}{}", op_to_js(op, &inner));
        }
        match &b.term {
            Terminator::Halt => {
                if !ends_with_return(b) {
                    let _ = writeln!(s, "{inner}{halt_stmt}");
                }
            }
            Terminator::Br(t) => {
                let _ = writeln!(s, "{inner}__pc = {}; break;", t.0);
            }
            Terminator::Cond { cond: Cond::Falsy(e), t, f } => {
                let _ = writeln!(
                    s,
                    "{inner}if (!({})) {{ __pc = {}; }} else {{ __pc = {}; }} break;",
                    rexpr_to_js(e),
                    t.0,
                    f.0
                );
            }
            Terminator::Unset => {
                let _ = writeln!(s, "{inner}throw new Error(\"unset terminator\");");
            }
        }
        let _ = writeln!(s, "{ind}    }}");
    }
    let _ = writeln!(s, "{ind}  }}");
    let _ = writeln!(s, "{ind}}}");
    s
}

/// Render one residual program as `function {name}(params...) { body }`.
/// Render one residual program as `{head}(params...) { body }` (`head` is
/// `function name`, `function*`, a method key, ...). Parameters from index
/// `defaults_from` on are written `p = void 0`.
///
/// `strict`: strict code. The body starts with a `"use strict"` directive
/// unless parameters are defaulted (such a function may not carry its own:
/// the caller then creates it inside a strict function).
fn render_function(head: &str, params: &[usize], defaults_from: usize, prog: &Program<Op, Cond>, short_names: bool, strict: bool) -> String {
    render_function_with(head, params, defaults_from, prog, short_names, strict, "", false, false)
}

/// `render_function` as an arrow function: `(params) => { body }`.
fn render_arrow(head: &str, params: &[usize], defaults_from: usize, prog: &Program<Op, Cond>, short_names: bool, strict: bool) -> String {
    render_function_with(head, params, defaults_from, prog, short_names, strict, "", false, true)
}

/// `render_function`, with `prologue` (a statement) first in the body;
/// `implied_strict`: strict code without its directive (a class body).
#[allow(clippy::too_many_arguments)]
fn render_function_with(
    head: &str,
    params: &[usize],
    defaults_from: usize,
    prog: &Program<Op, Cond>,
    short_names: bool,
    strict: bool,
    prologue: &str,
    implied_strict: bool,
    arrow: bool,
) -> String {
    let mut decls: BTreeSet<usize> = BTreeSet::new();
    collect_decls(prog, &mut decls);
    for p in params {
        decls.remove(p); // parameters are not `let`-declared locals
    }
    if short_names {
        SHORT.with(|n| *n.borrow_mut() = Some(ShortNames::for_function(params, prog, &[])));
    }
    STRICT.with(|c| c.set(strict));
    let mut s = String::new();
    let param_list: Vec<String> = params
        .iter()
        .enumerate()
        .map(|(i, v)| if i >= defaults_from { format!("{} = void 0", var_js(*v)) } else { var_js(*v) })
        .collect();
    let _ = writeln!(s, "{head}({}){} {{", param_list.join(", "), if arrow { " =>" } else { "" });
    if strict && defaults_from >= params.len() && !implied_strict {
        let _ = writeln!(s, "  \"use strict\";");
    }
    if !prologue.is_empty() {
        let _ = writeln!(s, "  {prologue}");
    }
    if !decls.is_empty() {
        let names: Vec<String> = decls.iter().map(|v| var_js(*v)).collect();
        let _ = writeln!(s, "  let {};", names.join(", "));
    }
    let body = render_blocks(prog, "  ", false);
    // (A `return;` that ends the body is falling off its end.)
    let body = match body.strip_suffix("  return;\n") {
        Some(rest) if rest.is_empty() || rest.ends_with('\n') => rest.to_string(),
        _ => body,
    };
    s.push_str(&body);
    let _ = writeln!(s, "}}");
    SHORT.with(|n| *n.borrow_mut() = None);
    s
}

thread_local! {
    /// The short names of the function being rendered, when enabled.
    static SHORT: RefCell<Option<ShortNames>> = const { RefCell::new(None) };
    /// The function being rendered is strict code.
    static STRICT: std::cell::Cell<bool> = const { std::cell::Cell::new(false) };
    /// The fresh capture-free closures rendered inline where they are made:
    /// each one's function expression, and the globals it refers to (which a
    /// local of the enclosing function must not shadow).
    static INLINE: RefCell<HashMap<usize, (String, HashSet<String>)>> = RefCell::new(HashMap::new());
    /// Capture-free function values `main` references once, outside any
    /// loop, rendered where referenced (by residual fid): their expression
    /// and the globals it names.
    static INLINE_VALUE: RefCell<HashMap<usize, (String, HashSet<String>)>> = RefCell::new(HashMap::new());
    /// Long strings the residual's string values repeat, each defined once
    /// (`var __s<i> = "..."`): a literal holding one prints as a
    /// concatenation naming it (see `string_pool`).
    static STRING_POOL: RefCell<Vec<String>> = const { RefCell::new(Vec::new()) };
    /// Object literals of constants the residual makes several times, each
    /// made by one function (`function __o<k>() { return {...}; }`): the
    /// literal's text, and `k` (see `object_factories`).
    static OBJ_FACTORY: RefCell<HashMap<String, usize>> = RefCell::new(HashMap::new());
    /// The residual writes nothing of `String` (so `"x".repeat(n)` is the
    /// standard one: see `string_literal`).
    static STRING_REPEAT: std::cell::Cell<bool> = const { std::cell::Cell::new(false) };
    /// The source of each class the residual makes from it (by its
    /// constructor's fid).
    static CLASS_TEXT: RefCell<HashMap<usize, ClassText>> = RefCell::new(HashMap::new());
}

/// A class the residual makes from its source (see `RExpr::ClassSrc`): its
/// source, the globals it names and the variables it is passed (by name, in
/// order).
struct ClassText {
    src: crate::lower::FnSource,
    globals: Vec<String>,
    params: Vec<String>,
}

/// Short names for one residual function: its variables, most used first,
/// take the shortest identifiers that are not reserved words and not a global
/// the function refers to (which a local of that name would shadow); its
/// labels (a separate namespace) take short names of their own, one per
/// distinct label so nesting stays legal.
struct ShortNames {
    vars: HashMap<usize, String>,
    labels: HashMap<String, String>,
    taken_labels: usize,
}

const RESERVED: &[&str] = &[
    "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do", "else", "enum",
    "export", "extends", "false", "finally", "for", "function", "if", "import", "in", "instanceof", "new", "null",
    "return", "super", "switch", "this", "throw", "true", "try", "typeof", "var", "void", "while", "with", "yield",
    "let", "static", "implements", "interface", "package", "private", "protected", "public", "await", "async",
    "undefined", "NaN", "Infinity", "eval", "arguments", "of", "get", "set", "main",
];

/// The `k`-th identifier of the sequence a..z, A..Z, aa, ab, ...
fn nth_ident(mut k: usize) -> String {
    const FIRST: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const REST: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    if k < FIRST.len() {
        return (FIRST[k] as char).to_string();
    }
    k -= FIRST.len();
    let mut tail = Vec::new();
    // Two or more characters: a first character, then base-62 digits.
    let mut width = 1;
    let mut span = FIRST.len() * REST.len();
    while k >= span {
        k -= span;
        width += 1;
        span *= REST.len();
    }
    for _ in 0..width {
        tail.push(REST[k % REST.len()] as char);
        k /= REST.len();
    }
    let mut out = String::new();
    out.push(FIRST[k % FIRST.len()] as char);
    out.extend(tail.into_iter().rev());
    out
}

impl ShortNames {
    fn for_function(params: &[usize], prog: &Program<Op, Cond>, also_reserved: &[&str]) -> ShortNames {
        let mut counts: HashMap<usize, usize> = HashMap::new();
        let mut globals: HashSet<String> = HashSet::new();
        for p in params {
            *counts.entry(*p).or_insert(0) += 1;
        }
        count_program(prog, &mut counts, &mut globals);
        counts.remove(&partial::js::ARGUMENTS_VAR_ID);
        let mut order: Vec<(usize, usize)> = counts.into_iter().collect();
        // Most used first; ties by id, for a deterministic result.
        order.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
        let mut vars = HashMap::new();
        let mut k = 0;
        for (v, _) in order {
            let name = loop {
                let n = nth_ident(k);
                k += 1;
                if !RESERVED.contains(&n.as_str()) && !globals.contains(&n) && !also_reserved.contains(&n.as_str()) {
                    break n;
                }
            };
            vars.insert(v, name);
        }
        ShortNames { vars, labels: HashMap::new(), taken_labels: 0 }
    }
}

fn count_program(prog: &Program<Op, Cond>, counts: &mut HashMap<usize, usize>, globals: &mut HashSet<String>) {
    for b in &prog.blocks {
        for op in &b.ops {
            match op {
                Op::Assign { var, expr } | Op::Eval { dst: var, expr } => {
                    *counts.entry(*var).or_insert(0) += 1;
                    count_rexpr(expr, counts, globals);
                }
                Op::Return(e) | Op::Throw(e) | Op::Effect(e) => count_rexpr(e, counts, globals),
                Op::NewObject { dst, fields } => {
                    *counts.entry(*dst).or_insert(0) += 1;
                    fields.iter().for_each(|(_, e)| count_rexpr(e, counts, globals));
                }
                Op::NewArray { dst, elems } => {
                    *counts.entry(*dst).or_insert(0) += 1;
                    elems.iter().for_each(|e| count_rexpr(e, counts, globals));
                }
                Op::PushOp { arr, val } => {
                    count_rexpr(arr, counts, globals);
                    count_rexpr(val, counts, globals);
                }
                Op::SetIndex { arr, index, val } => {
                    count_rexpr(arr, counts, globals);
                    count_rexpr(index, counts, globals);
                    count_rexpr(val, counts, globals);
                }
                Op::SetProp { obj, val, .. } => {
                    count_rexpr(obj, counts, globals);
                    count_rexpr(val, counts, globals);
                }
                Op::DeleteProp { obj, .. } => count_rexpr(obj, counts, globals),
                Op::DeleteIndex { arr, index } => {
                    count_rexpr(arr, counts, globals);
                    count_rexpr(index, counts, globals);
                }
                Op::AssignGlobal { name, expr } => {
                    globals.insert(name.clone());
                    count_rexpr(expr, counts, globals);
                }
                Op::Try { body, catch_slot, catch_body, finally_body } => {
                    count_program(body, counts, globals);
                    count_program(catch_body, counts, globals);
                    if let Some(fb) = finally_body {
                        count_program(fb, counts, globals);
                    }
                    if let Some(c) = catch_slot {
                        *counts.entry(*c).or_insert(0) += 1;
                    }
                }
            }
        }
        if let Terminator::Cond { cond: Cond::Falsy(e), .. } = &b.term {
            count_rexpr(e, counts, globals);
        }
    }
}

fn count_rexpr(e: &RExpr, counts: &mut HashMap<usize, usize>, globals: &mut HashSet<String>) {
    match e {
        RExpr::Var(v) => *counts.entry(*v).or_insert(0) += 1,
        RExpr::RegexLit(..) | RExpr::BigInt(_) | RExpr::Hole => {}
        // (The globals a function kept as source names.)
        RExpr::Verbatim(_, gs) => globals.extend(gs.iter().cloned()),
        RExpr::ClassSrc { fid, parent, caps, .. } => {
            CLASS_TEXT.with(|m| {
                if let Some(t) = m.borrow().get(fid) {
                    globals.extend(t.globals.iter().cloned());
                }
            });
            if let Some(p) = parent {
                count_rexpr(p, counts, globals);
            }
            for x in caps {
                count_rexpr(x, counts, globals);
            }
        }
        RExpr::OwnMember { obj, .. } => count_rexpr(obj, counts, globals),
        RExpr::NewFn { rfid } => INLINE.with(|m| {
            if let Some((_, gs)) = m.borrow().get(rfid) {
                globals.extend(gs.iter().cloned());
            }
        }),
        RExpr::Global(g) => {
            // `a.b` style global paths count by their first identifier.
            let head: String = g.chars().take_while(|c| c.is_alphanumeric() || *c == '_' || *c == '$').collect();
            globals.insert(head);
        }
        RExpr::Num(_) | RExpr::Str(_) | RExpr::Bool(_) | RExpr::Undef | RExpr::Null | RExpr::This => {}
        RExpr::Bin(_, a, b) | RExpr::Index(a, b) => {
            count_rexpr(a, counts, globals);
            count_rexpr(b, counts, globals);
        }
        RExpr::FnRef { rfid, caps } if caps.is_empty() => INLINE_VALUE.with(|m| {
            if let Some((_, gs)) = m.borrow().get(rfid) {
                globals.extend(gs.iter().cloned());
            }
        }),
        RExpr::Opaque(_, xs) | RExpr::FnRef { caps: xs, .. } => xs.iter().for_each(|x| count_rexpr(x, counts, globals)),
        RExpr::Get(o, _) | RExpr::Yield(o) | RExpr::Await(o) | RExpr::Delete(o) => count_rexpr(o, counts, globals),
        RExpr::Call(c, xs) | RExpr::New(c, xs) => {
            count_rexpr(c, counts, globals);
            xs.iter().for_each(|x| count_rexpr(x, counts, globals));
        }
        RExpr::BoundMethod { func, recv } => {
            count_rexpr(func, counts, globals);
            count_rexpr(recv, counts, globals);
        }
        RExpr::ArrayLit(xs) => xs.iter().for_each(|x| count_rexpr(x, counts, globals)),
        RExpr::ObjectLit(fs) => fs.iter().for_each(|(_, x)| count_rexpr(x, counts, globals)),
    }
}

/// A residual variable as JS.
pub(crate) fn var_js(v: usize) -> String {
    if v == partial::js::ARGUMENTS_VAR_ID {
        return "arguments".to_string();
    }
    SHORT.with(|n| match &*n.borrow() {
        Some(names) => names.vars.get(&v).cloned().unwrap_or_else(|| panic!("internal: no short name for v{v}")),
        None => format!("v{v}"),
    })
}

/// A structured-control-flow label as JS.
pub(crate) fn label_js(l: &str) -> String {
    SHORT.with(|n| match &mut *n.borrow_mut() {
        Some(names) => {
            if let Some(x) = names.labels.get(l) {
                return x.clone();
            }
            // (A label is an identifier: not a reserved word, as `do`.)
            let x = loop {
                let x = nth_ident(names.taken_labels);
                names.taken_labels += 1;
                if !RESERVED.contains(&x.as_str()) {
                    break x;
                }
            };
            names.labels.insert(l.to_string(), x.clone());
            x
        }
        None => l.to_string(),
    })
}

fn ends_with_return(b: &partial::residual::Block<Op, Cond>) -> bool {
    matches!(b.ops.last(), Some(Op::Return(_) | Op::Throw(_)))
}

/// An array literal of `elems`, a `Hole` an elision (`[11,, 333]`; a
/// trailing one takes an extra comma, which keeps the length).
/// `e` where nothing names a function it makes: an argument, an element.
/// There a function inlined from `var __rfN = (0, function () {...})` (the
/// `(0, ...)` keeps a binding from naming it) is written without it.
fn js_unnamed(e: &RExpr) -> String {
    if let RExpr::FnRef { rfid, caps } = e {
        if caps.is_empty() {
            if let Some(text) = INLINE_VALUE.with(|m| m.borrow().get(rfid).map(|v| v.0.clone())) {
                if let Some(inner) = text.strip_prefix("(0, ").and_then(|t| t.strip_suffix(')')) {
                    if inner.starts_with("function") || inner.starts_with("async function") || inner.starts_with("class") {
                        return inner.to_string();
                    }
                }
            }
        }
    }
    js(e, P_ASSIGN)
}

fn array_literal(elems: &[RExpr]) -> String {
    let mut s = String::from("[");
    for (i, e) in elems.iter().enumerate() {
        if i > 0 {
            s.push(',');
        }
        match e {
            RExpr::Hole => {
                if i + 1 == elems.len() {
                    s.push(',');
                }
            }
            e => {
                if i > 0 {
                    s.push(' ');
                }
                s.push_str(&js_unnamed(e));
            }
        }
    }
    s.push(']');
    s
}

/// `++`/`--` of `x` (a value that may be a BigInt) into the variable `v`, as
/// statements: `v = x; ++v;` (or `++v;` when `x` is `v`), which needs no
/// helper.
fn inc_dec_into(v: &str, expr: &RExpr) -> Option<String> {
    let RExpr::Opaque(op, xs) = expr else { return None };
    let sign = match op.as_str() {
        "inc" => "++",
        "dec" => "--",
        _ => return None,
    };
    let [x] = xs.as_slice() else { return None };
    // (`++` converts with ToNumeric itself.)
    let x = match x {
        RExpr::Opaque(op, ys) if op == "tonumeric" && ys.len() == 1 => &ys[0],
        x => x,
    };
    let xs = js_assign(x);
    Some(if xs == v { format!("{sign}{v};") } else { format!("{v} = {xs}; {sign}{v};") })
}

/// `target = target OP rhs` as `(OP, rhs)` for a compound assignment
/// (`target` the variable or global `base`, or its property `key`).
fn compound<'a>(base: &RExpr, key: Option<&String>, val: &'a RExpr) -> Option<(&'static str, &'a RExpr)> {
    let RExpr::Bin(op, a, b) = val else { return None };
    let same = match (key, &**a) {
        (None, x) => x == base,
        (Some(k), RExpr::Get(o, k2)) => **o == *base && k2 == k,
        _ => false,
    };
    if !same {
        return None;
    }
    let sym = match op {
        Bop::Add => "+",
        Bop::Sub => "-",
        Bop::Mul => "*",
        Bop::BitAnd => "&",
        Bop::BitOr => "|",
        Bop::BitXor => "^",
        Bop::Shl => "<<",
        Bop::Shr => ">>",
        Bop::UShr => ">>>",
        _ => return None,
    };
    Some((sym, b))
}

pub(crate) fn op_to_js(op: &Op, ind: &str) -> String {
    match op {
        Op::Assign { var, expr } | Op::Eval { dst: var, expr } if inc_dec_into(&var_js(*var), expr).is_some() => {
            inc_dec_into(&var_js(*var), expr).unwrap()
        }
        // `x = x + e`: `x += e`.
        Op::Assign { var, expr } if compound(&RExpr::Var(*var), None, expr).is_some() => {
            let (op, rhs) = compound(&RExpr::Var(*var), None, expr).unwrap();
            format!("{} {op}= {};", var_js(*var), js_assign(rhs))
        }
        Op::Assign { var, expr } => format!("{} = {};", var_js(*var), js_assign(expr)),
        Op::Return(RExpr::Undef) => "return;".to_string(),
        Op::Return(e) => format!("return {};", rexpr_to_js(e)),
        Op::NewObject { dst, fields } => format!("{} = {};", var_js(*dst), object_literal(fields)),
        Op::NewArray { dst, elems } => format!("{} = {};", var_js(*dst), array_literal(elems)),
        Op::PushOp { arr, val } => {
            format!("{}.push({});", base_js(arr), js_assign(val))
        }
        Op::SetIndex { arr, index, val } => {
            format!("{}[{}] = {};", base_js(arr), rexpr_to_js(index), js_assign(val))
        }
        Op::Eval { dst, expr } => format!("{} = {};", var_js(*dst), js_assign(expr)),
        // `o.k = inc(o.k)` of a variable `o`: `++o.k;`.
        Op::SetProp { obj: obj @ RExpr::Var(_), key, val }
            if inc_dec_into(&format!("{}{}", base_js(obj), member_suffix(key)), val).is_some_and(|t| !t.contains(" = ")) =>
        {
            inc_dec_into(&format!("{}{}", base_js(obj), member_suffix(key)), val).unwrap()
        }
        // `o.k = o.k + e` of a variable or global `o`: `o.k += e` (which
        // reads `o` once, as the residual's temp of a global did).
        Op::SetProp { obj: obj @ (RExpr::Var(_) | RExpr::Global(_)), key, val } if compound(obj, Some(key), val).is_some() => {
            let (op, rhs) = compound(obj, Some(key), val).unwrap();
            format!("{}{} {op}= {};", base_js(obj), member_suffix(key), js_assign(rhs))
        }
        Op::SetProp { obj, key, val } => {
            // (An assignment to a member names no function.)
            format!("{}{} = {};", base_js(obj), member_suffix(key), js_unnamed(val))
        }
        Op::DeleteProp { obj, key } => format!("delete {}{};", base_js(obj), member_suffix(key)),
        Op::DeleteIndex { arr, index } => {
            format!("delete {}[{}];", base_js(arr), rexpr_to_js(index))
        }
        Op::Throw(e) => format!("throw {};", rexpr_to_js(e)),
        Op::Effect(e) => {
            // An expression statement may not start with `{`, `function`,
            // `class` or `let [`.
            let js = rexpr_to_js(e);
            if js.starts_with('{') || js.starts_with("function") || js.starts_with("class") || js.starts_with("let") {
                format!("({js});")
            } else {
                format!("{js};")
            }
        }
        // (In strict code an assignment to an undeclared name throws: the
        // write is the global object's property, which is what it models.)
        Op::AssignGlobal { name, expr } if STRICT.with(|c| c.get()) => {
            format!("globalThis{} = {};", member_suffix(name), js_assign(expr))
        }
        Op::AssignGlobal { name, expr } => inc_dec_into(name, expr).unwrap_or_else(|| match compound(&RExpr::Global(name.clone()), None, expr) {
            // (`g = g + e` reads `g` and then writes it, as `g += e` does.)
            Some((op, rhs)) => format!("{name} {op}= {};", js_assign(rhs)),
            None => format!("{name} = {};", js_assign(expr)),
        }),
        Op::Try { body, catch_slot, catch_body, finally_body } => {
            let inner = format!("{ind}  ");
            let mut text = format!("try {{\n{}{ind}}}", render_blocks(body, &inner, true));
            // (A native `finally` region may have no catch.)
            let no_catch = finally_body.is_some() && catch_slot.is_none() && catch_body.blocks.iter().all(|b| b.ops.is_empty());
            if !no_catch {
                let cs = catch_slot.map(var_js).unwrap_or_else(|| "__e".to_string());
                text.push_str(&format!(" catch ({cs}) {{\n{}{ind}}}", render_blocks(catch_body, &inner, true)));
            }
            if let Some(fb) = finally_body {
                text.push_str(&format!(" finally {{\n{}{ind}}}", render_blocks(fb, &inner, true)));
            }
            text
        }
    }
}

/// A JS number as a literal expression: `-0` keeps its sign, and the
/// non-finite values use the global constants (residual locals are all `vN`,
/// so nothing shadows them).
fn num_to_js(x: f64) -> String {
    if x == 0.0 && x.is_sign_negative() {
        "-0".to_string()
    } else {
        partial::jsnum::JsNum(x).to_js_string()
    }
}

/// An expression in a context that takes any expression (a statement, a
/// condition, a parenthesized position).
pub(crate) fn rexpr_to_js(e: &RExpr) -> String {
    js(e, 0)
}

/// JS precedence levels used here (higher binds tighter).
const P_ASSIGN: u8 = 2; // an AssignmentExpression: call arguments, elements, right-hand sides
const P_UNARY: u8 = 15;
const P_MEMBER: u8 = 17;
const P_ATOM: u8 = 20;

/// The precedence of a binary operator token, `None` for one this printer
/// does not know (it is then printed fully parenthesized).
fn binary_prec(op: &str) -> Option<u8> {
    Some(match op {
        "," => 1,
        "??" => 3,
        "||" => 4,
        "&&" => 5,
        "|" => 6,
        "^" => 7,
        "&" => 8,
        "==" | "!=" | "===" | "!==" => 9,
        "<" | ">" | "<=" | ">=" | "in" | "instanceof" => 10,
        "<<" | ">>" | ">>>" => 11,
        "+" | "-" => 12,
        "*" | "/" | "%" => 13,
        "**" => 14,
        _ => return None,
    })
}

/// Render a binary expression `a op b` at precedence `p`: operands of a
/// left-associative operator bind at `p` on the left and above `p` on the
/// right (`a - (b - c)`, and `a + (b + c)`, which is not associative for
/// strings); `**` is right-associative and its left operand may not be a
/// unary expression. `??` does not mix with `||`/`&&` unparenthesized, which
/// its operands binding above `|` ensures (and theirs above `??`).
fn binary(op: &str, p: u8, a: &RExpr, b: &RExpr, min: u8) -> String {
    let (lmin, rmin) = match op {
        "**" => (P_UNARY + 1, p),
        "??" => (6, 6),
        _ => (p, p + 1),
    };
    let inner = format!("{} {op} {}", js(a, lmin), js(b, rmin));
    if p < min { format!("({inner})") } else { inner }
}

/// Render `e` where the context requires precedence at least `min`.
fn js(e: &RExpr, min: u8) -> String {
    let wrap = |p: u8, s: String| if p < min { format!("({s})") } else { s };
    match e {
        RExpr::Num(n) => {
            let s = num_to_js(n.f());
            // A negative literal is a unary minus.
            if s.starts_with('-') { wrap(P_UNARY, s) } else { s }
        }
        RExpr::Str(s) => match pooled_string(s) {
            // (A lone name needs no parentheses; a concatenation may.)
            Some(text) if text.starts_with("__s") && !text.contains(' ') => text,
            Some(text) => {
                let p = binary_prec("+").expect("`+` has a precedence");
                if p < min { format!("({text})") } else { text }
            }
            None => string_literal(s),
        },
        RExpr::Bool(b) => b.to_string(),
        // (`void 0`: shorter, and no binding can shadow it.)
        RExpr::Undef => wrap(P_UNARY, "void 0".to_string()),
        RExpr::Null => "null".to_string(),
        RExpr::This => "this".to_string(),
        RExpr::Var(v) => var_js(*v),
        RExpr::Bin(op, a, b) => {
            let t = bop(*op);
            binary(t, binary_prec(t).expect("every Bop has a precedence"), a, b, min)
        }
        RExpr::Index(a, i) => format!("{}[{}]", js(a, P_MEMBER), js(i, 0)),
        RExpr::Opaque(op, args) => match args.as_slice() {
            [a] if op == partial::js::TEMPLATE_TO_STRING => format!("`${{{}}}`", js(a, 0)),
            // ToNumeric (a Number or a BigInt): negated twice.
            [a] if op == "tonumeric" => {
                // (A space keeps `- -x` from reading as the decrement `--x`.)
                let operand = js(a, P_UNARY);
                let sep = if operand.starts_with('-') || operand.starts_with('+') { " " } else { "" };
                wrap(P_UNARY, format!("-(-{sep}{operand})"))
            }
            // `++`/`--` of a value that may be a BigInt: the runtime helper.
            [a] if op == "inc" || op == "dec" => format!("__pe_{op}({})", js(a, P_ASSIGN)),
            [a] => {
                let operand = js(a, P_UNARY);
                let s = if op.chars().next().is_some_and(|c| c.is_alphabetic()) {
                    format!("{op} {operand}")
                } else if (op == "-" || op == "+") && operand.starts_with(op.as_str()) {
                    // `- -x`, not the decrement `--x`.
                    format!("{op} {operand}")
                } else {
                    format!("{op}{operand}")
                };
                wrap(P_UNARY, s)
            }
            [a, b] => match binary_prec(op) {
                Some(p) => binary(op, p, a, b, min),
                None => format!("({} {op} {})", js(a, P_ATOM), js(b, P_ATOM)),
            },
            [a, b, c] if op == "?:" => wrap(P_ASSIGN, format!("{} ? {} : {}", js(a, 3), js(b, P_ASSIGN), js(c, P_ASSIGN))),
            _ => panic!("opaque operator `{op}` with unexpected arity {}", args.len()),
        },
        RExpr::Global(name) => name.clone(),
        RExpr::RegexLit(p, f) => format!("/{}/{f}", partial::js::regex_literal_source(p)),
        RExpr::BigInt(d) => format!("{d}n"),
        RExpr::NewFn { rfid } => match INLINE.with(|m| m.borrow().get(rfid).map(|(t, _)| t.clone())) {
            Some(text) => format!("({text})"),
            None => format!("__mk{rfid}()"),
        },
        RExpr::Get(o, k) => render_get(o, js(o, 0), k),
        RExpr::Call(callee, args) if matches!(&**callee, RExpr::BoundMethod { .. }) => {
            let RExpr::BoundMethod { func, recv } = &**callee else { unreachable!() };
            match partial::js::bound_call(func, recv, args) {
                Some((c, a)) => js(&RExpr::Call(Box::new(c), a), min),
                None => js(&RExpr::Call(func.clone(), args.clone()), min),
            }
        }
        RExpr::Call(callee, args) => {
            let a: Vec<String> = args.iter().map(js_unnamed).collect();
            // A call of the global `eval` is an indirect eval (global scope):
            // written `eval(...)` it would be a direct one, in this scope.
            if matches!(&**callee, RExpr::Global(g) if g == "eval") {
                return format!("(0, eval)({})", a.join(", "));
            }
            render_call(callee, js(callee, 0), &a)
        }
        RExpr::New(callee, args) => {
            let a: Vec<String> = args.iter().map(js_unnamed).collect();
            render_new(callee, js(callee, 0), &a)
        }
        // (A function expression without parentheses only as an assignment
        // expression: a right-hand side, an argument, an element. A callee,
        // a member's base or a statement's start would read it otherwise.)
        RExpr::FnRef { rfid, caps } if caps.is_empty() && INLINE_VALUE.with(|m| m.borrow().contains_key(rfid)) => {
            let text = INLINE_VALUE.with(|m| m.borrow()[rfid].0.clone());
            if min == P_ASSIGN { text } else { format!("({text})") }
        }
        RExpr::FnRef { rfid, caps } => {
            let cs: Vec<String> = caps.iter().map(|x| js(x, P_ASSIGN)).collect();
            render_fnref(*rfid, &cs)
        }
        // Outside call position a bound method decays to its function value (JS
        // detaches `this` once a method is read into a value); a call of one
        // is rendered above (`bound_call`).
        RExpr::BoundMethod { func, .. } => js(func, min),
        RExpr::Yield(x) => format!("(yield {})", js(x, P_ASSIGN)),
        RExpr::Await(x) => format!("(await {})", js(x, P_UNARY)),
        RExpr::Delete(x) => format!("(delete {})", js(x, P_UNARY)),
        RExpr::ArrayLit(xs) => array_literal(xs),
        RExpr::Hole => unreachable!("a hole is only an element of an array literal"),
        RExpr::Verbatim(t, _) => wrap(P_ASSIGN, t.clone()),
        RExpr::ClassSrc { fid, parent, caps, unboxed, omit, keep } => {
            // (A variable in a cell passed as the cell is read as `x.value`;
            // one passed as its final cell's value, as is. Only those
            // passed: see `keep`.)
            let text = CLASS_TEXT.with(|m| {
                m.borrow().get(fid).map(|t| {
                    let passed: Vec<&(String, bool)> = t.src.captures.iter().zip(keep).filter(|(_, k)| **k).map(|(c, _)| c).collect();
                    let cells: std::collections::BTreeSet<String> =
                        passed.iter().zip(unboxed).filter(|((_, cell), u)| *cell && !**u).map(|((n, _), _)| n.clone()).collect();
                    let (before, after) = crate::source_mode::class_text_with_cells(&t.src, &cells, omit)
                        .unwrap_or_else(|| panic!("internal: the class of function {fid} cannot be printed with its cells"));
                    let params: Vec<String> = t.params.iter().zip(keep).filter(|(_, k)| **k).map(|(p, _)| p.clone()).collect();
                    (before, after, params)
                })
            });
            let (before, after, params) = text.unwrap_or_else(|| panic!("internal: no source for the class of function {fid}"));
            if params.len() != caps.len() || caps.len() != unboxed.len() {
                panic!("internal: the class of function {fid} names {} variables, passed {}", params.len(), caps.len());
            }
            // (Passed the variables it names: a function of them, called.)
            if !caps.is_empty() {
                let parent_param = crate::source_mode::PARENT_PLACEHOLDER;
                let (text, mut ps, mut args) = match (parent, after) {
                    (Some(p), Some(after)) => (format!("{before}{parent_param}{after}"), vec![parent_param.to_string()], vec![js(p, P_ASSIGN)]),
                    (None, None) => (before, vec![], vec![]),
                    _ => panic!("internal: a class's heritage and its source disagree"),
                };
                ps.extend(params);
                args.extend(caps.iter().map(|c| js(c, P_ASSIGN)));
                return format!("(function ({}) {{\n  return {text};\n}})({})", ps.join(", "), args.join(", "));
            }
            match (parent, after) {
                (Some(p), Some(after)) => format!("({before}({}){after})", js(p, P_ASSIGN)),
                (None, None) => format!("({before})"),
                _ => panic!("internal: a class's heritage and its source disagree"),
            }
        }
        RExpr::OwnMember { obj, key, kind } => match kind {
            0 => wrap(P_MEMBER, format!("{}{}", base_js(obj), member_suffix(key))),
            k => wrap(
                P_MEMBER,
                format!("Object.getOwnPropertyDescriptor({}, {}).{}", js(obj, P_ASSIGN), js_string(key), if *k == 1 { "get" } else { "set" }),
            ),
        },
        RExpr::ObjectLit(fs) => object_literal(fs),
    }
}

/// An object literal `{k: e, ...}`, or the call of the factory that makes
/// it (see `OBJ_FACTORY`).
fn object_literal(fields: &[(String, RExpr)]) -> String {
    let parts: Vec<String> = fields.iter().map(|(k, x)| format!("{}: {}", literal_key(k), js_assign(x))).collect();
    let text = format!("{{{}}}", parts.join(", "));
    match OBJ_FACTORY.with(|m| m.borrow().get(&text).copied()) {
        Some(k) => format!("__o{k}()"),
        None => text,
    }
}

/// The object literals of constants `progs` make often enough that one
/// function making each is shorter than writing it at every place: their
/// text, numbered.
fn object_factories(progs: &[&Program<Op, Cond>]) -> HashMap<String, usize> {
    fn constant(e: &RExpr) -> bool {
        matches!(e, RExpr::Num(_) | RExpr::Str(_) | RExpr::Bool(_) | RExpr::Undef | RExpr::Null | RExpr::BigInt(_))
    }
    fn text(fields: &[(String, RExpr)]) -> Option<String> {
        if fields.is_empty() || !fields.iter().all(|(_, e)| constant(e)) {
            return None;
        }
        let parts: Vec<String> = fields.iter().map(|(k, x)| format!("{}: {}", literal_key(k), js_assign(x))).collect();
        Some(format!("{{{}}}", parts.join(", ")))
    }
    let mut counts: HashMap<String, usize> = HashMap::new();
    let mut order: Vec<String> = Vec::new();
    let mut note = |t: String, counts: &mut HashMap<String, usize>| {
        if !counts.contains_key(&t) {
            order.push(t.clone());
        }
        *counts.entry(t).or_insert(0) += 1;
    };
    fn walk(e: &RExpr, f: &mut dyn FnMut(String)) {
        if let RExpr::ObjectLit(fs) = e {
            if let Some(t) = text(fs) {
                f(t);
            }
        }
        for_each_child(e, &mut |c| walk(c, f));
    }
    for prog in progs {
        for b in &prog.blocks {
            for op in &b.ops {
                if let Op::NewObject { fields, .. } = op {
                    if let Some(t) = text(fields) {
                        note(t, &mut counts);
                    }
                }
                for e in partial::inline::op_exprs(op) {
                    walk(e, &mut |t| note(t, &mut counts));
                }
            }
        }
    }
    let mut out = HashMap::new();
    for t in order {
        let n = counts[&t];
        let k = out.len();
        // (Written `n` times, or once in `function __oK(){return T}` and
        // `n` calls.)
        let call = format!("__o{k}()").len();
        let def = format!("function __o{k}(){{return {t}}}").len();
        if n >= 2 && n * t.len() > def + n * call {
            out.insert(t, k);
        }
    }
    out
}

/// An object literal's key for the own property `k`: `__proto__` written
/// plainly would set the prototype instead (Annex B), so it is computed.
fn literal_key(k: &str) -> String {
    if k == "__proto__" {
        format!("[{}]", js_string(k))
    } else if is_identifier_name(k) || partial::js::canonical_index(k) {
        // (An IdentifierName, reserved words too, is a property name as is;
        // an array index as its number.)
        k.to_string()
    } else {
        js_string(k)
    }
}

/// An expression in an AssignmentExpression position (a right-hand side, an
/// argument, an element).
fn js_assign(e: &RExpr) -> String {
    js(e, P_ASSIGN)
}

fn bop(op: Bop) -> &'static str {
    match op {
        Bop::Add => "+",
        Bop::Sub => "-",
        Bop::Mul => "*",
        Bop::Lt => "<",
        Bop::Le => "<=",
        Bop::Gt => ">",
        Bop::Ge => ">=",
        Bop::Eq => "===",
        Bop::Ne => "!==",
        Bop::BitAnd => "&",
        Bop::BitOr => "|",
        Bop::BitXor => "^",
        Bop::Shl => "<<",
        Bop::Shr => ">>",
        Bop::UShr => ">>>",
    }
}

/// A JSON-style string literal (valid as a JS string and as an object key).
fn js_string(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => {
                let _ = write!(out, "\\u{:04x}", c as u32);
            }
            c => out.push(c),
        }
    }
    out.push('"');
    out
}
