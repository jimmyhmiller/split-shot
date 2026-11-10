//! Name analysis for lowering: which names a function references, binds,
//! captures and assigns, computed with SWC's visitor so every construct
//! (classes, methods, accessors, templates, destructuring, ...) is covered.
//!
//! Scoping is per function: every binding anywhere in a function's own body
//! (`var`, `let`, `const`, `class`, function declarations, parameters, catch
//! parameters) counts as bound in the whole function. The lowerer resolves
//! names block-precisely itself; this analysis only decides capture lists and
//! boxing, where treating a block-scoped name as function-wide is the
//! conservative direction.
//!
//! `this` is tracked as the pseudo-name `%this`: an arrow function refers to
//! the `this` of the nearest enclosing non-arrow function, so an arrow that
//! uses `this` has `%this` free, and that function captures it.

use std::collections::BTreeSet;

use swc_ecma_ast as ast;
use swc_ecma_visit::{Visit, VisitWith};

/// The pseudo-variable an arrow function captures for lexical `this`.
pub const LEXICAL_THIS: &str = "%this";

/// What a function's body does with names.
#[derive(Default, Debug, Clone)]
pub struct FnInfo {
    /// Names referenced inside (including nested functions) and not bound
    /// inside. Includes `%this` for an arrow that uses `this`.
    pub free: BTreeSet<String>,
    /// Names bound by this function itself (params and body declarations).
    pub bound: BTreeSet<String>,
    /// Names referenced by nested functions (their free names). A name both
    /// bound here and in this set is captured. `%this` when a nested arrow
    /// uses lexical `this`.
    pub nested_free: BTreeSet<String>,
    /// Names assigned anywhere inside (including nested functions).
    pub assigned: BTreeSet<String>,
    /// A non-arrow function whose body (or an arrow inside) refers to its
    /// own `arguments` object (no binding of that name shadows it).
    pub uses_arguments: bool,
    /// Names referenced by nested function *declarations* (hoisted: their
    /// closures are created at function entry, before the body runs).
    pub hoisted_free: BTreeSet<String>,
    /// The function's own `var` names (function-scoped, hoisted).
    pub vars: BTreeSet<String>,
    /// The function's own body-level lexical names (`let`/`const`/`class`
    /// directly in the body, not in a nested block).
    pub top_lexical: BTreeSet<String>,
    /// Every lexical name the function's own body declares at any depth:
    /// `let`/`const`/`class` (including loop heads) and block-level function
    /// declarations.
    pub lexical: BTreeSet<String>,
    /// Names a nested function inside their own initializer refers to
    /// (`const o = { m() { return o; } }`): captured before initialization.
    pub init_captured: BTreeSet<String>,
    /// The function's own `var` names written exactly once: one initializer
    /// (`var x = e`), not in a loop, no loop head binding them, and no
    /// assignment anywhere (see `assigned`). Once that initializer has run,
    /// the binding keeps its value.
    pub once_written_vars: BTreeSet<String>,
    /// The function's own `var` names with at least one initializer.
    pub var_initialized: BTreeSet<String>,
    /// Names a `catch` clause of the function binds.
    pub catch_names: BTreeSet<String>,
}

impl FnInfo {
    /// A `catch` clause of the function binds `name`.
    pub fn catch_bound(&self, name: &str) -> bool {
        self.catch_names.contains(name)
    }

    pub fn captured(&self, name: &str) -> bool {
        self.nested_free.contains(name)
    }
}

/// The body of a function being analyzed.
pub enum Body<'a> {
    Stmts(&'a [ast::Stmt]),
    Expr(&'a ast::Expr),
}

/// Analyze a function with these parameters and body. `is_arrow` decides
/// whether `this` is lexical (free) or bound.
pub fn analyze(params: &[&ast::Pat], body: Body<'_>, is_arrow: bool) -> FnInfo {
    let mut c = Collector { is_arrow, ..Default::default() };
    for p in params {
        c.bind_pat(p);
        // default values and computed keys are evaluated in the function
        p.visit_with(&mut c);
    }
    match body {
        Body::Stmts(stmts) => {
            for s in stmts {
                c.top_level_decl(s);
            }
            for s in stmts {
                s.visit_with(&mut c);
            }
        }
        Body::Expr(e) => e.visit_with(&mut c),
    }
    c.finish()
}

#[derive(Default)]
struct Collector {
    is_arrow: bool,
    refs: BTreeSet<String>,
    binds: BTreeSet<String>,
    assigned: BTreeSet<String>,
    nested_free: BTreeSet<String>,
    hoisted_free: BTreeSet<String>,
    vars: BTreeSet<String>,
    top_lexical: BTreeSet<String>,
    lexical: BTreeSet<String>,
    init_captured: BTreeSet<String>,
    /// Per own `var` name: how many initializers (`var x = e`) it has.
    var_inits: std::collections::BTreeMap<String, usize>,
    /// Own `var` names written repeatedly by a declaration: initialized in
    /// a loop, or bound by a `for (var x in/of ...)` head.
    var_rewritten: BTreeSet<String>,
    /// Names a `catch` clause binds (a `var` of the same name inside it
    /// initializes the catch parameter, not the `var`).
    catch_names: BTreeSet<String>,
    uses_this: bool,
    /// Nesting depth of blocks inside the body (0 = the body itself).
    block_depth: usize,
    /// Nesting depth of loops inside the body.
    loop_depth: usize,
}

impl Collector {
    fn finish(self) -> FnInfo {
        let mut free: BTreeSet<String> =
            self.refs.iter().filter(|n| !self.binds.contains(*n)).cloned().collect();
        let uses_arguments = !self.is_arrow && free.contains("arguments");
        if !self.is_arrow {
            // A non-arrow function binds its own `arguments`.
            free.remove("arguments");
        }
        if self.is_arrow && self.uses_this {
            free.insert(LEXICAL_THIS.to_string());
        }
        let once_written_vars = self
            .var_inits
            .iter()
            .filter(|(n, k)| {
                **k == 1 && !self.var_rewritten.contains(*n) && !self.assigned.contains(*n) && !self.catch_names.contains(*n) && !self.lexical.contains(*n)
            })
            .map(|(n, _)| n.clone())
            .collect();
        let var_initialized = self.var_inits.keys().cloned().collect();
        let catch_names = self.catch_names.clone();
        FnInfo {
            catch_names,
            once_written_vars,
            var_initialized,
            free,
            bound: self.binds,
            nested_free: self.nested_free,
            assigned: self.assigned,
            uses_arguments,
            hoisted_free: self.hoisted_free,
            vars: self.vars,
            top_lexical: self.top_lexical,
            lexical: self.lexical,
            init_captured: self.init_captured,
        }
    }

    /// Record the binding names of a pattern.
    fn bind_pat(&mut self, p: &ast::Pat) {
        for n in pat_names(p) {
            self.binds.insert(n);
        }
    }

    /// Body-level declarations (for `top_lexical`).
    fn top_level_decl(&mut self, s: &ast::Stmt) {
        if let ast::Stmt::Decl(d) = s {
            match d {
                ast::Decl::Var(v) if !matches!(v.kind, ast::VarDeclKind::Var) => {
                    for d in &v.decls {
                        self.top_lexical.extend(pat_names(&d.name));
                    }
                }
                ast::Decl::Class(c) => {
                    self.top_lexical.insert(c.ident.sym.to_string());
                }
                _ => {}
            }
        }
    }

    /// Merge a nested function's analysis: its free names are references
    /// here; its lexical `this` (arrows only) is ours.
    fn nested(&mut self, info: FnInfo, hoisted: bool) {
        for n in &info.free {
            if n == LEXICAL_THIS {
                self.uses_this = true;
            } else {
                self.refs.insert(n.clone());
            }
            self.nested_free.insert(n.clone());
            if hoisted {
                self.hoisted_free.insert(n.clone());
            }
        }
        self.assigned.extend(info.assigned);
    }

    /// Names assigned by an assignment target (simple or destructuring).
    fn assign_target_pat(&mut self, p: &ast::Pat) {
        for n in pat_names(p) {
            self.refs.insert(n.clone());
            self.assigned.insert(n);
        }
        // defaults and computed keys inside the pattern are evaluated here
        visit_pat_exprs(p, self);
    }
}

/// The names a binding pattern binds.
pub fn pat_names(p: &ast::Pat) -> Vec<String> {
    let mut out = Vec::new();
    collect_pat_names(p, &mut out);
    out
}

fn collect_pat_names(p: &ast::Pat, out: &mut Vec<String>) {
    match p {
        ast::Pat::Ident(b) => out.push(b.id.sym.to_string()),
        ast::Pat::Array(a) => {
            for e in a.elems.iter().flatten() {
                collect_pat_names(e, out);
            }
        }
        ast::Pat::Object(o) => {
            for prop in &o.props {
                match prop {
                    ast::ObjectPatProp::KeyValue(kv) => collect_pat_names(&kv.value, out),
                    ast::ObjectPatProp::Assign(a) => out.push(a.key.id.sym.to_string()),
                    ast::ObjectPatProp::Rest(r) => collect_pat_names(&r.arg, out),
                }
            }
        }
        ast::Pat::Rest(r) => collect_pat_names(&r.arg, out),
        ast::Pat::Assign(a) => collect_pat_names(&a.left, out),
        ast::Pat::Expr(_) | ast::Pat::Invalid(_) => {}
    }
}

/// Visit the expressions inside a pattern (defaults, computed keys, member
/// targets) without treating its names as references.
fn visit_pat_exprs(p: &ast::Pat, v: &mut Collector) {
    match p {
        ast::Pat::Ident(_) | ast::Pat::Invalid(_) => {}
        ast::Pat::Array(a) => {
            for e in a.elems.iter().flatten() {
                visit_pat_exprs(e, v);
            }
        }
        ast::Pat::Object(o) => {
            for prop in &o.props {
                match prop {
                    ast::ObjectPatProp::KeyValue(kv) => {
                        if let ast::PropName::Computed(c) = &kv.key {
                            c.expr.visit_with(v);
                        }
                        visit_pat_exprs(&kv.value, v);
                    }
                    ast::ObjectPatProp::Assign(a) => {
                        if let Some(d) = &a.value {
                            d.visit_with(v);
                        }
                    }
                    ast::ObjectPatProp::Rest(r) => visit_pat_exprs(&r.arg, v),
                }
            }
        }
        ast::Pat::Rest(r) => visit_pat_exprs(&r.arg, v),
        ast::Pat::Assign(a) => {
            visit_pat_exprs(&a.left, v);
            a.right.visit_with(v);
        }
        // An expression target (`[o.a, o.b] = ...`) is evaluated here.
        ast::Pat::Expr(e) => e.visit_with(v),
    }
}

fn function_params(f: &ast::Function) -> Vec<&ast::Pat> {
    f.params.iter().map(|p| &p.pat).collect()
}

impl Visit for Collector {
    fn visit_ident(&mut self, i: &ast::Ident) {
        self.refs.insert(i.sym.to_string());
    }

    // A binding occurrence is not a reference (bindings are recorded where
    // their declaration is handled).
    fn visit_binding_ident(&mut self, _: &ast::BindingIdent) {}

    fn visit_this_expr(&mut self, _: &ast::ThisExpr) {
        self.uses_this = true;
    }

    // A private name `#x` refers to the binding its class declares (the
    // lowerer's `#x`).
    fn visit_private_name(&mut self, p: &ast::PrivateName) {
        self.refs.insert(format!("#{}", p.name));
    }

    // Declarations bind; their initializers are visited.
    fn visit_var_decl(&mut self, v: &ast::VarDecl) {
        for d in &v.decls {
            let names = pat_names(&d.name);
            if matches!(v.kind, ast::VarDeclKind::Var) {
                self.vars.extend(names.iter().cloned());
            } else {
                self.lexical.extend(names.iter().cloned());
            }
            self.binds.extend(names.iter().cloned());
            visit_pat_exprs(&d.name, self);
            if matches!(v.kind, ast::VarDeclKind::Var) {
                if d.init.is_some() {
                    for n in &names {
                        *self.var_inits.entry(n.clone()).or_insert(0) += 1;
                    }
                }
                if self.loop_depth > 0 {
                    self.var_rewritten.extend(names.iter().cloned());
                }
            }
            if let Some(init) = &d.init {
                // A `var` initialized after a closure capturing it was made
                // (earlier in the body), or in a loop (where a closure made
                // in an earlier iteration sees the later ones), must be shared.
                // So must a `let`/`const` a closure made before its
                // declaration refers to (it reads the binding once initialized).
                for n in &names {
                    let in_loop = matches!(v.kind, ast::VarDeclKind::Var) && self.loop_depth > 0;
                    if self.nested_free.contains(n) || in_loop {
                        self.init_captured.insert(n.clone());
                    }
                }
                // Which names the initializer's nested functions refer to.
                let outer = std::mem::take(&mut self.nested_free);
                init.visit_with(self);
                for n in &names {
                    if self.nested_free.contains(n) {
                        self.init_captured.insert(n.clone());
                    }
                }
                let inner = std::mem::replace(&mut self.nested_free, outer);
                self.nested_free.extend(inner);
            }
        }
    }

    fn visit_fn_decl(&mut self, f: &ast::FnDecl) {
        self.binds.insert(f.ident.sym.to_string());
        if self.block_depth > 0 {
            self.lexical.insert(f.ident.sym.to_string());
        }
        let info = analyze_function(&f.function, None);
        // A function declaration is hoisted: to the top of the body, or of
        // its block (created when the block is entered, before the block's
        // other declarations are initialized).
        self.nested(info, true);
    }

    fn visit_fn_expr(&mut self, f: &ast::FnExpr) {
        let name = f.ident.as_ref().map(|i| i.sym.to_string());
        let info = analyze_function(&f.function, name.as_deref());
        self.nested(info, false);
    }

    fn visit_arrow_expr(&mut self, a: &ast::ArrowExpr) {
        let params: Vec<&ast::Pat> = a.params.iter().collect();
        let info = match &*a.body {
            ast::BlockStmtOrExpr::BlockStmt(b) => analyze(&params, Body::Stmts(&b.stmts), true),
            ast::BlockStmtOrExpr::Expr(e) => analyze(&params, Body::Expr(e), true),
        };
        self.nested(info, false);
    }

    fn visit_class_decl(&mut self, c: &ast::ClassDecl) {
        // (Referred to by a closure made before it: a shared binding.)
        if self.nested_free.contains(&*c.ident.sym) {
            self.init_captured.insert(c.ident.sym.to_string());
        }
        self.binds.insert(c.ident.sym.to_string());
        self.lexical.insert(c.ident.sym.to_string());
        self.visit_class_parts(&c.class, Some(&c.ident.sym.to_string()));
    }

    fn visit_class_expr(&mut self, c: &ast::ClassExpr) {
        let name = c.ident.as_ref().map(|i| i.sym.to_string());
        self.visit_class_parts(&c.class, name.as_deref());
    }

    // Object-literal methods and accessors are functions.
    fn visit_method_prop(&mut self, m: &ast::MethodProp) {
        if let ast::PropName::Computed(c) = &m.key {
            c.expr.visit_with(self);
        }
        let info = analyze_function(&m.function, None);
        self.nested(info, false);
    }

    fn visit_getter_prop(&mut self, g: &ast::GetterProp) {
        if let ast::PropName::Computed(c) = &g.key {
            c.expr.visit_with(self);
        }
        let info = match &g.body {
            Some(b) => analyze(&[], Body::Stmts(&b.stmts), false),
            None => FnInfo::default(),
        };
        self.nested(info, false);
    }

    fn visit_setter_prop(&mut self, sp: &ast::SetterProp) {
        if let ast::PropName::Computed(c) = &sp.key {
            c.expr.visit_with(self);
        }
        let info = match &sp.body {
            Some(b) => analyze(&[&sp.param], Body::Stmts(&b.stmts), false),
            None => FnInfo::default(),
        };
        self.nested(info, false);
    }

    fn visit_catch_clause(&mut self, c: &ast::CatchClause) {
        if let Some(p) = &c.param {
            self.catch_names.extend(pat_names(p));
            self.bind_pat(p);
            visit_pat_exprs(p, self);
        }
        c.body.visit_with(self);
    }

    fn visit_assign_expr(&mut self, a: &ast::AssignExpr) {
        match &a.left {
            ast::AssignTarget::Simple(ast::SimpleAssignTarget::Ident(b)) => {
                self.refs.insert(b.id.sym.to_string());
                self.assigned.insert(b.id.sym.to_string());
            }
            ast::AssignTarget::Simple(other) => other.visit_with(self),
            ast::AssignTarget::Pat(p) => {
                let pat: ast::Pat = match p {
                    ast::AssignTargetPat::Array(x) => ast::Pat::Array(x.clone()),
                    ast::AssignTargetPat::Object(x) => ast::Pat::Object(x.clone()),
                    ast::AssignTargetPat::Invalid(x) => ast::Pat::Invalid(x.clone()),
                };
                self.assign_target_pat(&pat);
            }
        }
        a.right.visit_with(self);
    }

    fn visit_update_expr(&mut self, u: &ast::UpdateExpr) {
        if let ast::Expr::Ident(i) = &*u.arg {
            self.assigned.insert(i.sym.to_string());
        }
        u.arg.visit_with(self);
    }

    fn visit_while_stmt(&mut self, w: &ast::WhileStmt) {
        self.loop_depth += 1;
        w.visit_children_with(self);
        self.loop_depth -= 1;
    }

    fn visit_do_while_stmt(&mut self, w: &ast::DoWhileStmt) {
        self.loop_depth += 1;
        w.visit_children_with(self);
        self.loop_depth -= 1;
    }

    fn visit_for_stmt(&mut self, f: &ast::ForStmt) {
        self.loop_depth += 1;
        f.visit_children_with(self);
        self.loop_depth -= 1;
    }

    fn visit_for_in_stmt(&mut self, f: &ast::ForInStmt) {
        f.right.visit_with(self);
        self.loop_depth += 1;
        self.for_head(&f.left);
        self.block(|c| f.body.visit_with(c));
        self.loop_depth -= 1;
    }

    fn visit_for_of_stmt(&mut self, f: &ast::ForOfStmt) {
        f.right.visit_with(self);
        self.loop_depth += 1;
        self.for_head(&f.left);
        self.block(|c| f.body.visit_with(c));
        self.loop_depth -= 1;
    }

    fn visit_block_stmt(&mut self, b: &ast::BlockStmt) {
        self.block(|c| b.stmts.iter().for_each(|s| s.visit_with(c)));
    }

    // `super.x` reads through the method's home object, which the class
    // binds as `%home`, with `this` as the receiver; `super(...)` constructs
    // with `%super`.
    fn visit_super_prop_expr(&mut self, sp: &ast::SuperPropExpr) {
        self.refs.insert("%home".to_string());
        self.uses_this = true;
        if let ast::SuperProp::Computed(c) = &sp.prop {
            c.expr.visit_with(self);
        }
    }
    fn visit_callee(&mut self, c: &ast::Callee) {
        match c {
            ast::Callee::Super(_) => {
                self.refs.insert("%super".to_string());
                self.refs.insert("%init".to_string());
            }
            ast::Callee::Expr(e) => e.visit_with(self),
            ast::Callee::Import(_) => {}
        }
    }

    // Labels are not variables.
    fn visit_labeled_stmt(&mut self, l: &ast::LabeledStmt) {
        l.body.visit_with(self);
    }
    fn visit_break_stmt(&mut self, _: &ast::BreakStmt) {}
    fn visit_continue_stmt(&mut self, _: &ast::ContinueStmt) {}
}

impl Collector {
    fn block(&mut self, f: impl FnOnce(&mut Collector)) {
        self.block_depth += 1;
        f(self);
        self.block_depth -= 1;
    }

    fn for_head(&mut self, h: &ast::ForHead) {
        match h {
            ast::ForHead::VarDecl(v) => v.visit_with(self),
            ast::ForHead::Pat(p) => self.assign_target_pat(p),
            ast::ForHead::UsingDecl(u) => u.visit_with(self),
        }
    }

    /// A class: the heritage and computed keys are evaluated in the enclosing
    /// scope; each method, accessor, constructor and field initializer is a
    /// function with its own `this` (and the class name bound inside).
    fn visit_class_parts(&mut self, class: &ast::Class, name: Option<&str>) {
        if let Some(sc) = &class.super_class {
            sc.visit_with(self);
        }
        // The private names this class declares are its own bindings.
        let privates: BTreeSet<String> = class
            .body
            .iter()
            .filter_map(|m| match m {
                ast::ClassMember::PrivateMethod(pm) => Some(format!("#{}", pm.key.name)),
                ast::ClassMember::PrivateProp(pp) => Some(format!("#{}", pp.key.name)),
                _ => None,
            })
            .collect();
        for m in &class.body {
            let (key, info) = match m {
                ast::ClassMember::Constructor(c) => {
                    let params: Vec<&ast::Pat> = c
                        .params
                        .iter()
                        .filter_map(|p| match p {
                            ast::ParamOrTsParamProp::Param(p) => Some(&p.pat),
                            ast::ParamOrTsParamProp::TsParamProp(_) => None,
                        })
                        .collect();
                    let info = match &c.body {
                        Some(b) => analyze(&params, Body::Stmts(&b.stmts), false),
                        None => FnInfo::default(),
                    };
                    (None, info)
                }
                ast::ClassMember::Method(m) => (Some(&m.key), analyze_function(&m.function, None)),
                ast::ClassMember::ClassProp(p) => {
                    let info = match &p.value {
                        Some(v) => analyze(&[], Body::Expr(v), false),
                        None => FnInfo::default(),
                    };
                    (Some(&p.key), info)
                }
                ast::ClassMember::StaticBlock(b) => (None, analyze(&[], Body::Stmts(&b.body.stmts), false)),
                ast::ClassMember::PrivateMethod(m) => (None, analyze_function(&m.function, None)),
                ast::ClassMember::PrivateProp(p) => {
                    let info = match &p.value {
                        Some(v) => analyze(&[], Body::Expr(v), false),
                        None => FnInfo::default(),
                    };
                    (None, info)
                }
                ast::ClassMember::Empty(_) | ast::ClassMember::TsIndexSignature(_) | ast::ClassMember::AutoAccessor(_) => {
                    continue
                }
            };
            if let Some(ast::PropName::Computed(c)) = key {
                c.expr.visit_with(self);
            }
            let mut info = info;
            if let Some(n) = name {
                info.free.remove(n);
            }
            info.free.retain(|n| !privates.contains(n));
            self.nested(info, false);
        }
    }
}

/// Analyze a `function` (declaration, expression, method): its own name, if
/// it is a named function expression, is bound inside it.
pub fn analyze_function(f: &ast::Function, own_name: Option<&str>) -> FnInfo {
    let params = function_params(f);
    let mut info = match &f.body {
        Some(b) => analyze(&params, Body::Stmts(&b.stmts), false),
        None => analyze(&params, Body::Stmts(&[]), false),
    };
    if let Some(n) = own_name {
        info.free.remove(n);
    }
    info
}

/// How a non-arrow function uses its own `arguments` object (arrows inside
/// share it; nested non-arrow functions have their own).
#[derive(Default, Debug)]
pub struct ArgumentsUse {
    /// Used other than by reading an element or `length`, spreading it, or
    /// passing it as `apply`'s argument list: written, passed somewhere,
    /// stored, called through (`arguments[0]()` passes it as `this`).
    pub escapes: bool,
    /// `delete arguments[k]` (or any `delete` of one of its properties).
    pub deletes: bool,
}

/// Analyze how `stmts` use their function's `arguments`.
pub fn arguments_use(stmts: &[ast::Stmt]) -> ArgumentsUse {
    let mut v = ArgsVisitor::default();
    for s in stmts {
        s.visit_with(&mut v);
    }
    v.out
}

#[derive(Default)]
struct ArgsVisitor {
    out: ArgumentsUse,
}

fn is_arguments(e: &ast::Expr) -> bool {
    matches!(e, ast::Expr::Ident(i) if &*i.sym == "arguments")
}

fn member_of_arguments(e: &ast::Expr) -> bool {
    matches!(e, ast::Expr::Member(m) if is_arguments(&m.obj))
}

impl Visit for ArgsVisitor {
    // Nested non-arrow functions have their own `arguments`.
    fn visit_function(&mut self, _: &ast::Function) {}
    fn visit_getter_prop(&mut self, _: &ast::GetterProp) {}
    fn visit_setter_prop(&mut self, _: &ast::SetterProp) {}
    fn visit_constructor(&mut self, _: &ast::Constructor) {}
    fn visit_class_prop(&mut self, _: &ast::ClassProp) {}
    fn visit_private_prop(&mut self, _: &ast::PrivateProp) {}
    fn visit_static_block(&mut self, _: &ast::StaticBlock) {}

    fn visit_ident(&mut self, i: &ast::Ident) {
        if &*i.sym == "arguments" {
            self.out.escapes = true;
        }
    }

    fn visit_expr(&mut self, e: &ast::Expr) {
        match e {
            // `arguments.length`, `arguments[k]`: a read.
            ast::Expr::Member(m) if is_arguments(&m.obj) => {
                if let ast::MemberProp::Computed(c) = &m.prop {
                    c.expr.visit_with(self);
                }
            }
            // `f.apply(t, arguments)`: the callee gets a copy.
            ast::Expr::Call(c)
                if c.args.len() == 2
                    && c.args[1].spread.is_none()
                    && is_arguments(&c.args[1].expr)
                    && matches!(&c.callee, ast::Callee::Expr(f)
                        if matches!(&**f, ast::Expr::Member(m) if matches!(&m.prop, ast::MemberProp::Ident(p) if &*p.sym == "apply"))) =>
            {
                c.callee.visit_with(self);
                c.args[0].visit_with(self);
            }
            // `arguments[k]()` passes it as `this`.
            ast::Expr::Call(c) if matches!(&c.callee, ast::Callee::Expr(f) if member_of_arguments(f)) => {
                self.out.escapes = true;
                e.visit_children_with(self);
            }
            ast::Expr::Update(u) if member_of_arguments(&u.arg) => {
                self.out.escapes = true;
                e.visit_children_with(self);
            }
            ast::Expr::Unary(u) if u.op == ast::UnaryOp::Delete && member_of_arguments(&u.arg) => {
                self.out.escapes = true;
                self.out.deletes = true;
                e.visit_children_with(self);
            }
            _ => e.visit_children_with(self),
        }
    }

    // `...arguments`: read element by element.
    fn visit_expr_or_spread(&mut self, e: &ast::ExprOrSpread) {
        if e.spread.is_some() && is_arguments(&e.expr) {
            return;
        }
        e.visit_children_with(self);
    }

    // An element or property of `arguments` as an assignment target.
    fn visit_simple_assign_target(&mut self, t: &ast::SimpleAssignTarget) {
        if let ast::SimpleAssignTarget::Member(m) = t {
            if is_arguments(&m.obj) {
                self.out.escapes = true;
            }
        }
        t.visit_children_with(self);
    }
    fn visit_pat(&mut self, p: &ast::Pat) {
        if let ast::Pat::Expr(e) = p {
            if member_of_arguments(e) {
                self.out.escapes = true;
            }
        }
        p.visit_children_with(self);
    }
}
