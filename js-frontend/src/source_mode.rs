//! Emit an escaped closure as its original source.
//!
//! A residual function is normally the closure's body specialized with its
//! captures unknown. That can be larger than the code it came from (Prepack
//! emits such functions from source). This module rebuilds the original
//! function as a JavaScript expression over its captured variables, so codegen
//! can emit `function __mkN(captures...) { return <source>; }` when that is
//! smaller:
//!
//! - captured variables are the factory's parameters, named as in the source,
//!   so the body's references resolve to them exactly as in the original
//!   scope;
//! - a capture that is a boxed cell (`{value}`, for a variable some closure
//!   assigns) is read and written as `x.value`;
//! - an arrow's lexical `this` (the `%this` capture) is supplied by creating
//!   the arrow inside a function called with that `this`;
//! - the function keeps its JS `name` (a property-definition wrapper names an
//!   anonymous function) and its strictness (a directive in the factory).
//!
//! Functions this cannot express exactly are refused (`None`): class members
//! and anything using `super`, other pseudo-captures (`%home`, `%super`, ...),
//! a captured `arguments`, a direct `eval`, a body that declares a name it
//! captures as a cell (the rewrite would have to respect the shadowing), or a
//! global named like the residual's own helpers (`__...`).

use std::collections::BTreeSet;

use swc_common::{sync::Lrc, SourceMap, DUMMY_SP};
use swc_ecma_ast as ast;
use swc_ecma_codegen::{text_writer::JsWriter, Config, Emitter, Node};
use swc_ecma_visit::{Visit, VisitMut, VisitMutWith, VisitWith};

use crate::lower::{FnNode, FnSource};

/// The pseudo-capture holding an arrow's lexical `this`.
const LEXICAL_THIS: &str = "%this";

/// `function __mk<rfid>(captures...) { return <source>; }` for a closure
/// with captures, or `None` if its source cannot be emitted exactly.
pub fn factory(rfid: usize, js_name: &str, src: &FnSource) -> Option<String> {
    let (params, expr) = closure_expr(js_name, src)?;
    let directive = if needs_directive(src) { "\"use strict\";\n  " } else { "" };
    Some(format!("function __mk{rfid}({}) {{\n  {directive}return {expr};\n}}\n", params.join(", ")))
}

/// `var __rf<rfid> = <source>;` for a closure without captures, or `None`.
pub fn value(rfid: usize, js_name: &str, src: &FnSource) -> Option<String> {
    if !src.captures.is_empty() {
        return None;
    }
    let (_, expr) = closure_expr(js_name, src)?;
    if needs_directive(src) {
        Some(format!("var __rf{rfid} = (function () {{\n  \"use strict\";\n  return {expr};\n}})();"))
    } else {
        Some(format!("var __rf{rfid} = {expr};"))
    }
}

/// The source of a closure without captures as an expression (to render
/// where it is made), or `None`.
pub fn expr(js_name: &str, src: &FnSource) -> Option<String> {
    if !src.captures.is_empty() {
        return None;
    }
    let (_, expr) = closure_expr(js_name, src)?;
    Some(if needs_directive(src) { format!("(function () {{\n  \"use strict\";\n  return {expr};\n}})()") } else { expr })
}

/// A class made from its source (`FnNode::Class`): the text of its class
/// expression before and after its heritage (the parent's expression goes
/// between them), or the whole text for a base class. `None` for any other
/// source, or one that names a global the residual defines.
pub fn class_text(src: &FnSource) -> Option<(String, Option<String>)> {
    class_text_with_cells(src, &BTreeSet::new(), &[])
}

/// `class_text`, the variables `cells` (some the source names, see
/// `FnSource::captures`) read and written through their cells
/// (`x.value`), and without the (non-static, statically named) methods
/// `omit` names.
pub fn class_text_with_cells(src: &FnSource, cells: &BTreeSet<String>, omit: &[String]) -> Option<(String, Option<String>)> {
    let FnNode::Class { class, name, hint } = &src.node else { return None };
    if src.globals.iter().any(|g| residual_name(g)) {
        return None;
    }
    let mut class = class.clone();
    class.body.retain(|m| match m {
        ast::ClassMember::Method(m) if !m.is_static && m.kind == ast::MethodKind::Method => match &m.key {
            ast::PropName::Ident(i) => !omit.iter().any(|o| *o == *i.sym),
            ast::PropName::Str(s) => !omit.iter().any(|o| *o == s.value.to_string_lossy()),
            _ => true,
        },
        _ => true,
    });
    if !class_with_cells(&mut class, cells) {
        return None;
    }
    let text = print(&ast::Expr::Class(ast::ClassExpr { ident: name.clone(), class: Box::new(class.clone()) }))?;
    // (An anonymous class named where it is defined is named by a property
    // definition, as an anonymous function is.)
    let text = if name.is_none() && !hint.is_empty() {
        name_by_key(hint, &text)
    } else if name.is_none() {
        format!("(0, {text})")
    } else {
        text
    };
    if class.super_class.is_none() {
        return Some((text, None));
    }
    let (before, after) = text.split_once(PARENT_PLACEHOLDER)?;
    Some((before.to_string(), Some(after.to_string())))
}

/// An anonymous function or class `text` named `name` by a property
/// definition: `{name: text}.name` (a quoted key when `name` is no
/// IdentifierName).
fn name_by_key(name: &str, text: &str) -> String {
    let ident = {
        let mut cs = name.chars();
        name != "__proto__"
            && matches!(cs.next(), Some(c) if c.is_ascii_alphabetic() || c == '_' || c == '$')
            && cs.all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '$')
    };
    if ident {
        format!("{{{name}: {text}}}.{name}")
    } else {
        let k = json_string(name);
        format!("{{{k}: {text}}}[{k}]")
    }
}

/// The identifier a class source's heritage is replaced by (see
/// `FnNode::Class`).
pub const PARENT_PLACEHOLDER: &str = "__pe_parent";

/// Strict code whose own body does not say so: the directive goes in the
/// factory.
fn needs_directive(src: &FnSource) -> bool {
    if !src.strict {
        return false;
    }
    let body = match &src.node {
        // (A class body is strict code.)
        FnNode::Class { .. } => return false,
        FnNode::Function { func, .. } => func.body.as_ref().map(|b| &b.stmts),
        FnNode::Method(m) => m.function.body.as_ref().map(|b| &b.stmts),
        FnNode::Arrow(a) => match &*a.body {
            ast::BlockStmtOrExpr::BlockStmt(b) => Some(&b.stmts),
            ast::BlockStmtOrExpr::Expr(_) => None,
        },
    };
    !body.is_some_and(|stmts| {
        stmts.iter().take_while(|s| matches!(s, ast::Stmt::Expr(e) if matches!(&*e.expr, ast::Expr::Lit(ast::Lit::Str(_))))).any(
            |s| matches!(s, ast::Stmt::Expr(e) if matches!(&*e.expr, ast::Expr::Lit(ast::Lit::Str(st)) if st.value == *"use strict")),
        )
    })
}

/// A name the residual itself defines (`__rf<n>`, `__mk<n>`, its `__pe_`
/// helpers, a factory's `__this`, a wrapper's `__f`): a global of the same
/// name would be shadowed.
/// `class` with each name in `cells` (a variable of an enclosing function
/// the class gets as its `{value}` cell) read and written as `name.value`;
/// `false` (unchanged) when the rewrite cannot express it (a binding of
/// such a name inside, a direct `eval`).
pub fn class_with_cells(class: &mut ast::Class, cells: &BTreeSet<String>) -> bool {
    if cells.is_empty() {
        return true;
    }
    let mut check = Check { boxed: cells, refuse: false, allow_eval: false, class_mode: true };
    class.visit_with(&mut check);
    if check.refuse {
        return false;
    }
    let mut rw = Rewrite { boxed: cells };
    class.visit_mut_with(&mut rw);
    true
}

/// Whether `n` can be a parameter of a wrapper the residual makes: an
/// identifier that is no name the residual reserves.
pub fn is_plain_param_name(n: &str) -> bool {
    is_identifier(n) && !residual_name(n) && !RESERVED.contains(&n) && !is_reserved_word(n) && n != crate::source_mode::PARENT_PLACEHOLDER
}

fn residual_name(g: &str) -> bool {
    let numbered = |p: &str| g.strip_prefix(p).is_some_and(|rest| !rest.is_empty() && rest.bytes().all(|b| b.is_ascii_digit()));
    numbered("__rf") || numbered("__mk") || g.starts_with("__pe_") || g == "__this" || g == "__f"
}

/// The factory's parameters and the expression it returns.
fn closure_expr(js_name: &str, src: &FnSource) -> Option<(Vec<String>, String)> {
    // (A function rerun at runtime keeps its direct `eval`: it has no
    // captures.)
    closure_expr_with(js_name, src, src.rerun && src.captures.is_empty())
}

/// The source of a function the specializer runs as is (it has a direct
/// `eval` of code it cannot see): capture-free, so the `eval` sees the same
/// scope it does in the original (its own, then the globals). `None` if it
/// cannot be emitted exactly.
pub fn verbatim(js_name: &str, src: &FnSource) -> Option<String> {
    if !src.captures.is_empty() {
        return None;
    }
    let (_, expr) = closure_expr_with(js_name, src, true)?;
    Some(if needs_directive(src) { format!("(function () {{\n  \"use strict\";\n  return {expr};\n}})()") } else { expr })
}

/// `closure_expr`; `allow_eval`: a direct `eval` is kept (no captures).
fn closure_expr_with(js_name: &str, src: &FnSource, allow_eval: bool) -> Option<(Vec<String>, String)> {
    // Captures: identifiers, or the lexical `this` of an arrow.
    let mut params = Vec::new();
    let mut boxed: BTreeSet<String> = BTreeSet::new();
    let mut has_this = false;
    for (name, is_boxed) in &src.captures {
        if name == LEXICAL_THIS {
            has_this = true;
            params.push("__this".to_string());
            continue;
        }
        if name.starts_with('%') || name == "arguments" || !is_identifier(name) {
            return None;
        }
        if *is_boxed {
            boxed.insert(name.clone());
        }
        params.push(name.clone());
    }
    // (A global the residual itself defines would be shadowed by the
    // residual's. `main` is the residual's entry, which a specialized body
    // naming the global `main` reaches just the same.)
    if src.globals.iter().any(|g| residual_name(g) || (g == "eval" && !allow_eval)) {
        return None;
    }
    let mut node = src.node.clone();
    // Refuse what the rewrite cannot express.
    let mut check = Check { boxed: &boxed, refuse: false, allow_eval, class_mode: false };
    match &node {
        FnNode::Class { .. } => return None,
        FnNode::Function { func, own_name } => {
            if own_name.as_ref().is_some_and(|n| boxed.contains(&n.sym.to_string())) {
                return None;
            }
            func.visit_with(&mut check);
        }
        FnNode::Arrow(a) => a.visit_with(&mut check),
        FnNode::Method(m) => {
            if !matches!(m.key, ast::PropName::Ident(_) | ast::PropName::Str(_)) {
                return None;
            }
            m.function.visit_with(&mut check);
        }
    }
    if check.refuse {
        return None;
    }
    // Rewrite the cells.
    let mut rw = Rewrite { boxed: &boxed };
    match &mut node {
        FnNode::Function { func, .. } => func.visit_mut_with(&mut rw),
        FnNode::Arrow(a) => a.visit_mut_with(&mut rw),
        FnNode::Method(m) => m.function.visit_mut_with(&mut rw),
        FnNode::Class { .. } => return None,
    }
    // A capture is a parameter of the factory: one no binding inside
    // shadows takes a short name no identifier inside uses.
    let mentions_name;
    {
        let mut idents = Idents::default();
        match &node {
            FnNode::Function { func, own_name } => {
                func.visit_with(&mut idents);
                if let Some(n) = own_name {
                    idents.all.insert(n.sym.to_string());
                }
            }
            FnNode::Arrow(a) => a.visit_with(&mut idents),
            FnNode::Method(m) => m.function.visit_with(&mut idents),
            FnNode::Class { .. } => return None,
        }
        mentions_name = idents.all.contains(js_name);
        let mut renames: std::collections::HashMap<String, String> = std::collections::HashMap::new();
        let mut taken: BTreeSet<String> = idents.all.clone();
        taken.extend(params.iter().cloned());
        taken.insert(js_name.to_string());
        let mut next = 0usize;
        for p in params.iter_mut() {
            if p == "__this" || idents.bound.contains(p) || p.len() <= 2 {
                continue;
            }
            let short = loop {
                let n = short_name(next);
                next += 1;
                if !taken.contains(&n) && !RESERVED.contains(&n.as_str()) {
                    break n;
                }
            };
            taken.insert(short.clone());
            renames.insert(p.clone(), short.clone());
            *p = short;
        }
        if !renames.is_empty() {
            let mut rn = Rename { map: &renames };
            match &mut node {
                FnNode::Function { func, .. } => func.visit_mut_with(&mut rn),
                FnNode::Arrow(a) => a.visit_mut_with(&mut rn),
                FnNode::Method(m) => m.function.visit_mut_with(&mut rn),
                FnNode::Class { .. } => return None,
            }
        }
    }
    let named = |text: String| -> String {
        if js_name.is_empty() {
            text
        } else {
            name_by_key(js_name, &text)
        }
    };
    let expr = match node {
        FnNode::Class { .. } => return None,
        // A declaration's name is a binding of its scope (a capture, if the
        // body uses it), not of the function: an anonymous function named by
        // its property definition.
        // (Its own name when nothing inside names it: the same function.)
        FnNode::Function { func, own_name: None } if !allow_eval && !mentions_name && is_identifier(js_name) && !RESERVED.contains(&js_name) && !is_reserved_word(js_name) => {
            let id = ast::Ident::new_no_ctxt(js_name.into(), DUMMY_SP);
            print(&ast::Expr::Fn(ast::FnExpr { ident: Some(id), function: Box::new(func) }))?
        }
        FnNode::Function { func, own_name: None } => {
            named(print(&ast::Expr::Fn(ast::FnExpr { ident: None, function: Box::new(func) }))?)
        }
        FnNode::Function { func, own_name: Some(id) } => {
            print(&ast::Expr::Fn(ast::FnExpr { ident: Some(id), function: Box::new(func) }))?
        }
        FnNode::Arrow(a) => {
            let text = named(print(&ast::Expr::Arrow(a))?);
            if has_this {
                format!("function () {{ return {text}; }}.call(__this)")
            } else {
                text
            }
        }
        FnNode::Method(m) => {
            let access = match &m.key {
                ast::PropName::Ident(i) => format!(".{}", i.sym),
                ast::PropName::Str(s) => format!("[{}]", json_string(&s.value.to_string_lossy())),
                _ => unreachable!("checked above"),
            };
            let obj = ast::Expr::Object(ast::ObjectLit {
                span: DUMMY_SP,
                props: vec![ast::PropOrSpread::Prop(Box::new(ast::Prop::Method(m)))],
            });
            format!("{}{access}", print(&obj)?)
        }
    };
    if has_this && !matches!(src.node, FnNode::Arrow(_)) {
        return None;
    }
    Some((params, expr))
}

/// Every identifier a function's source names, and the ones it binds.
#[derive(Default)]
struct Idents {
    all: BTreeSet<String>,
    bound: BTreeSet<String>,
}

impl Visit for Idents {
    fn visit_ident(&mut self, i: &ast::Ident) {
        self.all.insert(i.sym.to_string());
    }
    fn visit_binding_ident(&mut self, b: &ast::BindingIdent) {
        self.bound.insert(b.id.sym.to_string());
        self.all.insert(b.id.sym.to_string());
    }
    fn visit_fn_decl(&mut self, f: &ast::FnDecl) {
        self.bound.insert(f.ident.sym.to_string());
        f.visit_children_with(self);
    }
    fn visit_fn_expr(&mut self, f: &ast::FnExpr) {
        if let Some(i) = &f.ident {
            self.bound.insert(i.sym.to_string());
        }
        f.visit_children_with(self);
    }
    fn visit_class_decl(&mut self, c: &ast::ClassDecl) {
        self.bound.insert(c.ident.sym.to_string());
        c.visit_children_with(self);
    }
    fn visit_class_expr(&mut self, c: &ast::ClassExpr) {
        if let Some(i) = &c.ident {
            self.bound.insert(i.sym.to_string());
        }
        c.visit_children_with(self);
    }
    fn visit_catch_clause(&mut self, c: &ast::CatchClause) {
        c.visit_children_with(self);
    }
}

/// Renames references to captured names (`map`), leaving labels alone and
/// keeping a shorthand property's key.
struct Rename<'a> {
    map: &'a std::collections::HashMap<String, String>,
}

impl VisitMut for Rename<'_> {
    fn visit_mut_ident(&mut self, i: &mut ast::Ident) {
        if let Some(n) = self.map.get(&*i.sym) {
            i.sym = n.as_str().into();
        }
    }
    fn visit_mut_prop(&mut self, p: &mut ast::Prop) {
        if let ast::Prop::Shorthand(i) = p {
            if let Some(n) = self.map.get(&*i.sym) {
                let key = ast::PropName::Ident(ast::IdentName::new(i.sym.clone(), i.span));
                let value = Box::new(ast::Expr::Ident(ast::Ident::new_no_ctxt(n.as_str().into(), i.span)));
                *p = ast::Prop::KeyValue(ast::KeyValueProp { key, value });
                return;
            }
        }
        p.visit_mut_children_with(self);
    }
    fn visit_mut_labeled_stmt(&mut self, l: &mut ast::LabeledStmt) {
        l.body.visit_mut_with(self);
    }
    fn visit_mut_break_stmt(&mut self, _: &mut ast::BreakStmt) {}
    fn visit_mut_continue_stmt(&mut self, _: &mut ast::ContinueStmt) {}
}

/// A reserved word of strict code (not a binding name).
fn is_reserved_word(n: &str) -> bool {
    matches!(
        n,
        "break" | "case" | "catch" | "class" | "const" | "continue" | "debugger" | "default" | "delete" | "do" | "else" | "export"
            | "extends" | "finally" | "for" | "function" | "if" | "import" | "in" | "instanceof" | "new" | "return" | "super"
            | "switch" | "this" | "throw" | "try" | "typeof" | "var" | "void" | "while" | "with" | "yield" | "let" | "static"
            | "implements" | "interface" | "package" | "private" | "protected" | "public" | "await" | "enum" | "null" | "true"
            | "false" | "eval" | "arguments" | "undefined"
    )
}

/// The `n`th short name: `a`..`z`, then `a0`.. (as the residual's own).
fn short_name(n: usize) -> String {
    let letter = (b'a' + (n % 26) as u8) as char;
    if n < 26 {
        letter.to_string()
    } else {
        format!("{letter}{}", n / 26 - 1)
    }
}

const RESERVED: &[&str] = &["do", "if", "in", "for", "let", "new", "try", "var", "case", "else", "enum", "eval", "null", "this", "true", "void", "with", "await", "break", "catch", "class", "const", "false", "super", "throw", "while", "yield", "arguments"];

/// Finds what the source form cannot express.
struct Check<'a> {
    boxed: &'a BTreeSet<String>,
    refuse: bool,
    allow_eval: bool,
    /// Checking a class (`class_with_cells`): its members' own `super` is
    /// kept, and an assignment to a cell's name is rewritten.
    class_mode: bool,
}

impl Visit for Check<'_> {
    fn visit_super(&mut self, _: &ast::Super) {
        if !self.class_mode {
            self.refuse = true;
        }
    }
    fn visit_super_prop_expr(&mut self, s: &ast::SuperPropExpr) {
        if !self.class_mode {
            self.refuse = true;
        }
        s.visit_children_with(self);
    }
    // (For a class: an assignment's target names the cell, `x = v`
    // becomes `x.value = v`.)
    fn visit_simple_assign_target(&mut self, t: &ast::SimpleAssignTarget) {
        if self.class_mode && matches!(t, ast::SimpleAssignTarget::Ident(_)) {
            return;
        }
        t.visit_children_with(self);
    }
    // A binding of a cell's name anywhere inside would shadow it.
    fn visit_binding_ident(&mut self, b: &ast::BindingIdent) {
        if self.boxed.contains(&b.id.sym.to_string()) {
            self.refuse = true;
        }
    }
    fn visit_fn_decl(&mut self, f: &ast::FnDecl) {
        if self.boxed.contains(&f.ident.sym.to_string()) {
            self.refuse = true;
        }
        f.visit_children_with(self);
    }
    fn visit_fn_expr(&mut self, f: &ast::FnExpr) {
        if f.ident.as_ref().is_some_and(|i| self.boxed.contains(&i.sym.to_string())) {
            self.refuse = true;
        }
        f.visit_children_with(self);
    }
    fn visit_class_decl(&mut self, c: &ast::ClassDecl) {
        if self.boxed.contains(&c.ident.sym.to_string()) {
            self.refuse = true;
        }
        c.visit_children_with(self);
    }
    fn visit_class_expr(&mut self, c: &ast::ClassExpr) {
        if c.ident.as_ref().is_some_and(|i| self.boxed.contains(&i.sym.to_string())) {
            self.refuse = true;
        }
        c.visit_children_with(self);
    }
    // `{x = 1} = o` targeting a cell would need a key-value rewrite.
    fn visit_assign_pat_prop(&mut self, p: &ast::AssignPatProp) {
        if self.boxed.contains(&p.key.id.sym.to_string()) {
            self.refuse = true;
        }
        p.visit_children_with(self);
    }
    // A direct `eval` sees (and could rebind) the local scope.
    fn visit_call_expr(&mut self, c: &ast::CallExpr) {
        if let ast::Callee::Expr(e) = &c.callee {
            if matches!(&**e, ast::Expr::Ident(i) if i.sym == *"eval") && !self.allow_eval {
                self.refuse = true;
            }
        }
        c.visit_children_with(self);
    }
}

/// Reads and writes of a cell's name become `name.value`.
struct Rewrite<'a> {
    boxed: &'a BTreeSet<String>,
}

fn cell_member(id: &ast::Ident) -> ast::MemberExpr {
    ast::MemberExpr {
        span: DUMMY_SP,
        obj: Box::new(ast::Expr::Ident(id.clone())),
        prop: ast::MemberProp::Ident(ast::IdentName::new("value".into(), DUMMY_SP)),
    }
}

impl VisitMut for Rewrite<'_> {
    // (A call of a cell's value has no `this`: `(0, x.value)(...)`, not the
    // method call `x.value(...)`.)
    fn visit_mut_callee(&mut self, c: &mut ast::Callee) {
        if let ast::Callee::Expr(e) = c {
            if let ast::Expr::Ident(id) = &**e {
                if self.boxed.contains(&id.sym.to_string()) {
                    let zero = ast::Expr::Lit(ast::Lit::Num(ast::Number { span: DUMMY_SP, value: 0.0, raw: None }));
                    let seq = ast::Expr::Seq(ast::SeqExpr { span: DUMMY_SP, exprs: vec![Box::new(zero), Box::new(ast::Expr::Member(cell_member(id)))] });
                    *e = Box::new(ast::Expr::Paren(ast::ParenExpr { span: DUMMY_SP, expr: Box::new(seq) }));
                    return;
                }
            }
        }
        c.visit_mut_children_with(self);
    }
    fn visit_mut_tagged_tpl(&mut self, t: &mut ast::TaggedTpl) {
        if let ast::Expr::Ident(id) = &*t.tag {
            if self.boxed.contains(&id.sym.to_string()) {
                let zero = ast::Expr::Lit(ast::Lit::Num(ast::Number { span: DUMMY_SP, value: 0.0, raw: None }));
                let seq = ast::Expr::Seq(ast::SeqExpr { span: DUMMY_SP, exprs: vec![Box::new(zero), Box::new(ast::Expr::Member(cell_member(id)))] });
                t.tag = Box::new(ast::Expr::Paren(ast::ParenExpr { span: DUMMY_SP, expr: Box::new(seq) }));
                t.tpl.visit_mut_with(self);
                return;
            }
        }
        t.visit_mut_children_with(self);
    }
    fn visit_mut_opt_call(&mut self, c: &mut ast::OptCall) {
        if let ast::Expr::Ident(id) = &*c.callee {
            if self.boxed.contains(&id.sym.to_string()) {
                let zero = ast::Expr::Lit(ast::Lit::Num(ast::Number { span: DUMMY_SP, value: 0.0, raw: None }));
                let seq = ast::Expr::Seq(ast::SeqExpr { span: DUMMY_SP, exprs: vec![Box::new(zero), Box::new(ast::Expr::Member(cell_member(id)))] });
                c.callee = Box::new(ast::Expr::Paren(ast::ParenExpr { span: DUMMY_SP, expr: Box::new(seq) }));
                c.args.visit_mut_with(self);
                return;
            }
        }
        c.visit_mut_children_with(self);
    }
    fn visit_mut_expr(&mut self, e: &mut ast::Expr) {
        if let ast::Expr::Ident(id) = e {
            if self.boxed.contains(&id.sym.to_string()) {
                *e = ast::Expr::Member(cell_member(id));
                return;
            }
        }
        e.visit_mut_children_with(self);
    }
    fn visit_mut_prop(&mut self, p: &mut ast::Prop) {
        if let ast::Prop::Shorthand(id) = p {
            if self.boxed.contains(&id.sym.to_string()) {
                *p = ast::Prop::KeyValue(ast::KeyValueProp {
                    key: ast::PropName::Ident(ast::IdentName::new(id.sym.clone(), DUMMY_SP)),
                    value: Box::new(ast::Expr::Member(cell_member(id))),
                });
                return;
            }
        }
        p.visit_mut_children_with(self);
    }
    fn visit_mut_simple_assign_target(&mut self, t: &mut ast::SimpleAssignTarget) {
        if let ast::SimpleAssignTarget::Ident(b) = t {
            if self.boxed.contains(&b.id.sym.to_string()) {
                *t = ast::SimpleAssignTarget::Member(cell_member(&b.id));
                return;
            }
        }
        t.visit_mut_children_with(self);
    }
    // In a destructuring assignment a cell's name is a target (bindings of
    // it were refused).
    fn visit_mut_pat(&mut self, p: &mut ast::Pat) {
        if let ast::Pat::Ident(b) = p {
            if self.boxed.contains(&b.id.sym.to_string()) {
                *p = ast::Pat::Expr(Box::new(ast::Expr::Member(cell_member(&b.id))));
                return;
            }
        }
        p.visit_mut_children_with(self);
    }
    // Labels are not variables.
    fn visit_mut_labeled_stmt(&mut self, l: &mut ast::LabeledStmt) {
        l.body.visit_mut_with(self);
    }
    fn visit_mut_break_stmt(&mut self, _: &mut ast::BreakStmt) {}
    fn visit_mut_continue_stmt(&mut self, _: &mut ast::ContinueStmt) {}
}

/// Print an expression (without TypeScript annotations).
fn print(e: &ast::Expr) -> Option<String> {
    let mut e = e.clone();
    crate::ts::strip_annotations(&mut e);
    let e = &e;
    let cm: Lrc<SourceMap> = Default::default();
    let mut buf = Vec::new();
    // (With the comments inside the source: they are kept. Only those
    // strictly inside it: one before it is not its own.)
    let comments = crate::COMMENTS.with(|c| c.borrow().clone()).map(|all| {
        use swc_common::comments::Comments;
        use swc_common::Spanned;
        let span = e.span();
        let inside = swc_common::comments::SingleThreadedComments::default();
        let (leading, trailing) = all.borrow_all();
        for (pos, cs) in leading.iter() {
            if *pos > span.lo && *pos < span.hi {
                for c in cs {
                    inside.add_leading(*pos, c.clone());
                }
            }
        }
        for (pos, cs) in trailing.iter() {
            if *pos > span.lo && *pos < span.hi {
                for c in cs {
                    inside.add_trailing(*pos, c.clone());
                }
            }
        }
        inside
    });

    {
        let mut emitter = Emitter {
            cfg: Config::default(),
            cm: cm.clone(),
            comments: comments.as_ref().map(|c| c as &dyn swc_common::comments::Comments),
            wr: JsWriter::new(cm, "\n", &mut buf, None),
        };
        e.emit_with(&mut emitter).ok()?;
    }
    String::from_utf8(buf).ok()
}

fn is_identifier(n: &str) -> bool {
    let mut cs = n.chars();
    matches!(cs.next(), Some(c) if c.is_alphabetic() || c == '_' || c == '$') && cs.all(|c| c.is_alphanumeric() || c == '_' || c == '$')
}

fn json_string(s: &str) -> String {
    let mut out = String::from("\"");
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}
