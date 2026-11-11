//! Lower the supported subset of real JavaScript (an SWC AST) to the
//! `partial::js` AST (`FuncDef`/`Stmt`/`Expr` with integer-slot locals).
//!
//! Supported: numbers (integer i64), strings, booleans, `undefined`; objects
//! and arrays; member (`o.k`) and index (`a[i]`) read and write; `+ - *` and the
//! comparisons `< <= > >=` plus `=== !==`; unary `-`; `if`/`else`, `while`,
//! `for` (desugared), `switch`/`break`, `return`; named function declarations
//! and **non-capturing** arrow / function expressions (lifted to top level);
//! `arr.push(x)` as a statement.
//!
//! Everything else is a hard error (e.g. closures capturing outer variables,
//! `for..of`/`for..in`, `&&`/`||`, `/`, `%`, classes, `try`, regex, `null`,
//! non-integer numbers, destructuring). No silent fallbacks.

use std::collections::{BTreeSet, HashMap, HashSet};

use partial::js::{
    Bop, Clause, Expr, FnKind, FuncDef, PropDef, PropKey, Stmt, ATTR_CONFIGURABLE, ATTR_ENUMERABLE, ATTR_WRITABLE,
    ILL_FORMED_STRING, PRIVATE_MAP_HELPER, PRIVATE_SET_HELPER, SUPER_GET_HELPER, TEMPLATE_TO_STRING,
};
use partial::jsnum::JsNum;

use crate::scope;
use swc_ecma_ast as ast;

type R<T> = Result<T, String>;

/// Compile JS source to a list of `FuncDef`s (fid = index). Requires a
/// `function main(input) { ... }` entry.
pub fn compile(src: &str) -> R<Vec<FuncDef>> {
    compile_with_entry(src, "main")
}

/// Like `compile`, with the entry function named `entry` (its parameter is
/// the dynamic input). The entry becomes function 0, named `main` for the
/// engine; a script's own `main` (if any) is then an ordinary function.
pub fn compile_with_entry(src: &str, entry: &str) -> R<Vec<FuncDef>> {
    compile_full(src, entry).map(|(fs, _)| fs)
}

/// The source of a lifted function, for emitting an escaped closure as its
/// original code (see `codegen`): the AST node, the captured variables in
/// capture order with whether each is a boxed cell, the globals it names, and
/// whether it is strict code.
#[derive(Clone)]
pub struct FnSource {
    pub node: FnNode,
    pub captures: Vec<(String, bool)>,
    pub globals: BTreeSet<String>,
    pub strict: bool,
    /// Always emitted as this source (never as its specialization): a
    /// function whose direct `eval` reruns the call at runtime (see
    /// `Stmt::RerunAtRuntime`).
    pub rerun: bool,
}

/// The syntactic form of a lifted function.
#[derive(Clone)]
pub enum FnNode {
    /// A function declaration (`own_name: None`: its name is a binding of the
    /// enclosing scope) or expression (`own_name`: bound inside it).
    Function { func: ast::Function, own_name: Option<ast::Ident> },
    Arrow(ast::ArrowExpr),
    /// A method of an object literal.
    Method(ast::MethodProp),
    /// A class (its constructor's source), its heritage, if any, the
    /// identifier `__pe_parent` standing for the parent the residual gives
    /// it; `name` its own name, if any, else `hint` the name it takes from
    /// where it is defined (`const Bar = class {}`).
    Class { class: ast::Class, name: Option<ast::Ident>, hint: String },
}

/// `compile_with_entry`, with each function's source (`None` for declared
/// top-level functions and synthesized ones), indexed by fid.
pub fn compile_full(src: &str, entry: &str) -> R<(Vec<FuncDef>, Vec<Option<FnSource>>)> {
    compile_full_opts(src, entry, &LowerOpts::default())
}

/// How a program is lowered.
#[derive(Clone, Default)]
pub struct LowerOpts {
    /// No other script reads this one's top-level `let`/`const`/`class`
    /// bindings: one no function of the script mentions (and with no `eval`
    /// in the script) is a plain local of the top-level code.
    pub closed_script: bool,
    /// The source is TypeScript (its types are erased; see `ts`).
    pub typescript: bool,
    /// Trust the TypeScript annotations: a parameter or variable annotated
    /// `number` holds a number (see `Stmt::AssumeType`).
    pub trust_types: bool,
    /// Rely on React's contract: the program gets React's model
    /// (`react_model.js`; see the engine's `js/react.rs`).
    pub react: bool,
    /// The residual names each variable that stands for one of the
    /// program's as the source does (see `codegen::set_source_names`).
    pub source_names: bool,
}

/// `compile_full`, with the lowering options.
pub fn compile_full_opts(src: &str, entry: &str, opts: &LowerOpts) -> R<(Vec<FuncDef>, Vec<Option<FnSource>>)> {
    let closed_script = opts.closed_script;
    let trust_types = opts.typescript && opts.trust_types;
    let module = if opts.typescript { crate::parse_ts(src)? } else { crate::parse_program(src)? };
    reject_unsupported(&module)?;
    let script_strict = has_use_strict(module.body.iter().filter_map(|i| if let ast::ModuleItem::Stmt(s) = i { Some(s) } else { None }));
    let react_roots = opts.react.then(|| react_root_names(&module));
    if module.body.iter().any(|i| matches!(i, ast::ModuleItem::ModuleDecl(_))) {
        return Err("ES module imports/exports are not supported".into());
    }
    // (An entry function the script declares; other top-level code.)
    // (Or a variable the script declares, `var main = (function () { ...
    // return function main(input) {...} })()`: its value when the
    // top-level code is done.)
    let explicit_main = module.body.iter().any(|i| match i {
        ast::ModuleItem::Stmt(ast::Stmt::Decl(ast::Decl::Fn(f))) => &*f.ident.sym == entry,
        ast::ModuleItem::Stmt(ast::Stmt::Decl(ast::Decl::Var(v))) => {
            v.decls.iter().any(|d| matches!(&d.name, ast::Pat::Ident(b) if &*b.id.sym == entry))
        }
        _ => false,
    });
    let top_code = module.body.iter().any(|i| !matches!(i, ast::ModuleItem::Stmt(ast::Stmt::Decl(ast::Decl::Fn(_)) | ast::Stmt::Empty(_))));
    // (A name of a function the script declares that some code assigns: its
    // binding is a variable, the function object only its first value.)
    let writes_function_binding = {
        let stmts: Vec<ast::Stmt> = module.body.iter().filter_map(|i| if let ast::ModuleItem::Stmt(st) = i { Some(st.clone()) } else { None }).collect();
        let info = crate::scope::analyze(&[], crate::scope::Body::Stmts(&stmts), false);
        stmts.iter().any(|st| matches!(st, ast::Stmt::Decl(ast::Decl::Fn(f)) if info.assigned.contains(&*f.ident.sym) || info.var_initialized.contains(&*f.ident.sym)))
    };
    if (explicit_main && (top_code || entry != "main")) || writes_function_binding {
        // A whole script: its top-level code runs first, then `main(input)`.
        // (Also a script of nothing but a named entry: its residual entry
        // keeps that name; and one that assigns a function's name.)
        // The script is one function (top-level declarations are its locals
        // and nested functions), ending in `return main(input)`.
        let mut c = Compiler { closed_script, trust_types, react_roots, ..Compiler::default() };
        let mut stmts: Vec<ast::Stmt> = Vec::new();
        for item in module.body {
            match item {
                ast::ModuleItem::Stmt(st) => stmts.push(st),
                ast::ModuleItem::ModuleDecl(_) => unreachable!("module declarations are refused above"),
            }
        }
        let ident = |n: &str| ast::Ident::new_no_ctxt(n.into(), Default::default());
        let call = ast::Expr::Call(ast::CallExpr {
            span: Default::default(),
            ctxt: Default::default(),
            callee: ast::Callee::Expr(Box::new(ast::Expr::Ident(ident(entry)))),
            args: vec![ast::ExprOrSpread { spread: None, expr: Box::new(ast::Expr::Ident(ident(SCRIPT_INPUT))) }],
            type_args: None,
        });
        if explicit_main {
            stmts.push(ast::Stmt::Return(ast::ReturnStmt { span: Default::default(), arg: Some(Box::new(call)) }));
        }
        // (The script body is `main` to the engine, but no name in the script
        // refers to it: a global `main` the script defines is its own.)
        c.decls.push(DeclFn { name: "main".to_string(), strict: script_strict, function: None, module_body: Some(stmts) });
        c.script_input = true;
        c.script_entry = explicit_main.then(|| entry.to_string());
        c.add_prelude()?;
        if opts.react {
            c.add_model(REACT_MODEL)?;
        }
        c.lower_declared()?;
        return Ok(c.finish_with_sources());
    }
    let mut c = Compiler { trust_types, react_roots, ..Compiler::default() };
    let (module_body, explicit_main) = c.collect_fns(module, script_strict, entry)?;
    if explicit_main {
    } else if !module_body.is_empty() {
        // Synthesize `main` from the program's top-level statements (a name
        // the program itself cannot refer to it by).
        c.decls.push(DeclFn { name: "main".to_string(), strict: script_strict, function: None, module_body: Some(module_body) });
    } else {
        return Err("no `function main(input)` and no top-level code to specialize".into());
    }
    c.add_prelude()?;
    if opts.react {
        c.add_model(REACT_MODEL)?;
    }
    c.lower_declared()?;
    Ok(c.finish_with_sources())
}

/// How a function with `params` and `body` uses its own `this` (see
/// `FuncDef::this_reads`): nested functions have their own; arrows share it.
/// The variable `x` of a body that is only `x.apply(this, arguments)` (see
/// `FuncDef::this_forward`).
fn this_forward_of(body: &ArrowBody) -> Option<String> {
    let stmts: &[ast::Stmt] = match body {
        ArrowBody::Block(b) => b,
        ArrowBody::BlockOwned(b) => b,
        _ => return None,
    };
    let [ast::Stmt::Expr(e)] = stmts else { return None };
    let ast::Expr::Call(c) = &*e.expr else { return None };
    let ast::Callee::Expr(callee) = &c.callee else { return None };
    let ast::Expr::Member(m) = &**callee else { return None };
    let (ast::Expr::Ident(x), ast::MemberProp::Ident(p)) = (&*m.obj, &m.prop) else { return None };
    let this_then_arguments = matches!(&c.args[..], [a, b] if a.spread.is_none() && b.spread.is_none()
        && matches!(&*a.expr, ast::Expr::This(_))
        && matches!(&*b.expr, ast::Expr::Ident(i) if &*i.sym == "arguments"));
    (&*p.sym == "apply" && this_then_arguments).then(|| x.sym.to_string())
}

fn this_reads_of(params: &[ast::Pat], body: &ArrowBody) -> Option<Vec<String>> {
    use swc_ecma_visit::{Visit, VisitWith};
    #[derive(Default)]
    struct Uses {
        names: BTreeSet<String>,
        other: bool,
    }
    fn this_member(e: &ast::Expr) -> bool {
        matches!(e, ast::Expr::Member(m) if matches!(&*m.obj, ast::Expr::This(_)))
    }
    impl Visit for Uses {
        fn visit_function(&mut self, _: &ast::Function) {}
        fn visit_class(&mut self, _: &ast::Class) {}
        fn visit_this_expr(&mut self, _: &ast::ThisExpr) {
            self.other = true;
        }
        fn visit_super_prop_expr(&mut self, _: &ast::SuperPropExpr) {
            self.other = true;
        }
        fn visit_member_expr(&mut self, m: &ast::MemberExpr) {
            if matches!(&*m.obj, ast::Expr::This(_)) {
                match &m.prop {
                    ast::MemberProp::Ident(i) => {
                        self.names.insert(i.sym.to_string());
                    }
                    _ => self.other = true,
                }
                return;
            }
            m.visit_children_with(self);
        }
        fn visit_assign_expr(&mut self, a: &ast::AssignExpr) {
            match &a.left {
                ast::AssignTarget::Simple(ast::SimpleAssignTarget::Member(m)) if matches!(&*m.obj, ast::Expr::This(_)) => self.other = true,
                // (A pattern target writes what it names.)
                ast::AssignTarget::Pat(p) => {
                    let mut inner = Uses::default();
                    p.visit_with(&mut inner);
                    if inner.other || !inner.names.is_empty() {
                        self.other = true;
                    }
                }
                _ => {}
            }
            a.visit_children_with(self);
        }
        fn visit_for_head(&mut self, h: &ast::ForHead) {
            // (A loop head's pattern writes what it names.)
            if let ast::ForHead::Pat(p) = h {
                let mut inner = Uses::default();
                p.visit_with(&mut inner);
                if inner.other || !inner.names.is_empty() {
                    self.other = true;
                }
            }
            h.visit_children_with(self);
        }
        fn visit_update_expr(&mut self, u: &ast::UpdateExpr) {
            if this_member(&u.arg) {
                self.other = true;
            }
            u.visit_children_with(self);
        }
        fn visit_unary_expr(&mut self, u: &ast::UnaryExpr) {
            if u.op == ast::UnaryOp::Delete && this_member(&u.arg) {
                self.other = true;
            }
            u.visit_children_with(self);
        }
    }
    let mut v = Uses::default();
    for p in params {
        p.visit_with(&mut v);
    }
    match body {
        ArrowBody::Block(s) => s.iter().for_each(|st| st.visit_with(&mut v)),
        ArrowBody::BlockOwned(s) => s.iter().for_each(|st| st.visit_with(&mut v)),
        ArrowBody::Expr(e) => e.visit_with(&mut v),
        ArrowBody::Fields(..) => return None,
    }
    (!v.other).then(|| v.names.into_iter().collect())
}

/// How a class's own code uses its instances' `this` (see
/// `FuncDef::instance_uses`): over its constructor, its instance fields'
/// keys and initializers, and its non-static members' bodies (an arrow
/// shares its function's `this`; another function or class has its own).
/// `None` when `this` reaches other code (passed, stored, returned, a
/// `super` method called with it), has a computed key written, or a
/// non-static member has a computed key (it could be any method's).
fn instance_uses_of(class: &ast::Class) -> Option<partial::js::InstanceUses> {
    this_uses_of(UsesOf::Class(class))
}

/// How a plain function uses its own `this`, as `instance_uses_of` says of
/// a class's code: what an ES5 class's constructor or method does with its
/// instance. A first statement `X.apply(this, arguments)` (`X` a name)
/// calls the class's parent with it (`InstanceUses::parent`).
fn function_instance_uses(params: &[ast::Pat], body: &ArrowBody) -> Option<partial::js::InstanceUses> {
    let stmts: &[ast::Stmt] = match body {
        ArrowBody::Block(b) => b,
        ArrowBody::BlockOwned(b) => b,
        _ => return None,
    };
    this_uses_of(UsesOf::Function(params, stmts))
}

enum UsesOf<'a> {
    Class(&'a ast::Class),
    Function(&'a [ast::Pat], &'a [ast::Stmt]),
}

fn this_uses_of(of: UsesOf<'_>) -> Option<partial::js::InstanceUses> {
    use swc_ecma_visit::{Visit, VisitWith};
    #[derive(Default)]
    struct Uses {
        written: BTreeSet<String>,
        written_otherwise: BTreeSet<String>,
        called: BTreeSet<String>,
        bound: BTreeSet<String>,
        escape: bool,
    }
    // (`this.k.bind(this)` of `this.k`: its key.)
    fn bound_self(e: &ast::Expr) -> Option<String> {
        let ast::Expr::Call(c) = e else { return None };
        let ast::Callee::Expr(callee) = &c.callee else { return None };
        let ast::Expr::Member(m) = &**callee else { return None };
        let ast::MemberProp::Ident(f) = &m.prop else { return None };
        if &*f.sym != "bind" || c.args.len() != 1 || c.args[0].spread.is_some() || !matches!(&*c.args[0].expr, ast::Expr::This(_)) {
            return None;
        }
        this_member_key(&m.obj).flatten()
    }
    fn this_member_key(e: &ast::Expr) -> Option<Option<String>> {
        match e {
            ast::Expr::Member(m) if matches!(&*m.obj, ast::Expr::This(_)) => Some(match &m.prop {
                ast::MemberProp::Ident(i) => Some(i.sym.to_string()),
                ast::MemberProp::Computed(c) => match &*c.expr {
                    ast::Expr::Lit(ast::Lit::Str(st)) => Some(st.value.to_string_lossy().into_owned()),
                    _ => None,
                },
                // (A private name is no property.)
                ast::MemberProp::PrivateName(_) => None,
            }),
            ast::Expr::Paren(p) => this_member_key(&p.expr),
            _ => None,
        }
    }
    impl Uses {
        fn write(&mut self, target: &ast::Expr) {
            match this_member_key(target) {
                Some(Some(k)) => {
                    self.written.insert(k.clone());
                    self.written_otherwise.insert(k);
                }
                Some(None) => {
                    // (A private field, or a computed key.)
                    if let ast::Expr::Member(m) = target {
                        if !matches!(m.prop, ast::MemberProp::PrivateName(_)) {
                            self.escape = true;
                        }
                    }
                }
                None => {}
            }
        }
    }
    impl Visit for Uses {
        fn visit_function(&mut self, _: &ast::Function) {}
        fn visit_class(&mut self, _: &ast::Class) {}
        fn visit_this_expr(&mut self, _: &ast::ThisExpr) {
            self.escape = true;
        }
        fn visit_member_expr(&mut self, m: &ast::MemberExpr) {
            if matches!(&*m.obj, ast::Expr::This(_)) {
                // (A read of a member: its computed key's expression is read.)
                if let ast::MemberProp::Computed(c) = &m.prop {
                    c.expr.visit_with(self);
                }
                return;
            }
            m.visit_children_with(self);
        }
        fn visit_super_prop_expr(&mut self, s: &ast::SuperPropExpr) {
            if let ast::SuperProp::Computed(c) = &s.prop {
                c.expr.visit_with(self);
            }
        }
        fn visit_call_expr(&mut self, c: &ast::CallExpr) {
            if let ast::Callee::Expr(callee) = &c.callee {
                // `this.k(...)`: the method called with `this`.
                if let Some(Some(k)) = this_member_key(callee) {
                    self.called.insert(k);
                    c.args.iter().for_each(|a| a.visit_with(self));
                    return;
                }
                // `this.k.bind(this, ...)` (a bound copy of the method),
                // `.call(this, ...)`, `.apply(this, ...)` (the method called).
                if let ast::Expr::Member(m) = &**callee {
                    if let (Some(Some(k)), ast::MemberProp::Ident(f)) = (this_member_key(&m.obj), &m.prop) {
                        if matches!(&*f.sym, "bind" | "call" | "apply") && matches!(c.args.first(), Some(a) if a.spread.is_none() && matches!(&*a.expr, ast::Expr::This(_))) {
                            if &*f.sym == "bind" {
                                self.bound.insert(k);
                            } else {
                                self.called.insert(k);
                            }
                            c.args.iter().skip(1).for_each(|a| a.visit_with(self));
                            return;
                        }
                    }
                }
                // (A `super` method called with `this`.)
                if matches!(&**callee, ast::Expr::SuperProp(_)) {
                    self.escape = true;
                }
            }
            c.visit_children_with(self);
        }
        fn visit_assign_expr(&mut self, a: &ast::AssignExpr) {
            match &a.left {
                // (`this.k = this.k.bind(this)`: the own property a bound copy
                // of the method.)
                ast::AssignTarget::Simple(ast::SimpleAssignTarget::Member(m))
                    if a.op == ast::AssignOp::Assign && this_member_key(&ast::Expr::Member(m.clone())).flatten().is_some_and(|k| bound_self(&a.right) == Some(k)) =>
                {
                    let k = bound_self(&a.right).expect("a bound method");
                    self.written.insert(k.clone());
                    self.bound.insert(k);
                    return;
                }
                ast::AssignTarget::Simple(ast::SimpleAssignTarget::Member(m)) => {
                    let e = ast::Expr::Member(m.clone());
                    self.write(&e);
                    if this_member_key(&e).is_none() {
                        m.visit_with(self);
                    } else if let ast::MemberProp::Computed(c) = &m.prop {
                        c.expr.visit_with(self);
                    }
                }
                ast::AssignTarget::Pat(p) => {
                    // (A pattern writing members of `this`.)
                    let mut inner = Uses::default();
                    p.visit_with(&mut inner);
                    if inner.escape {
                        self.escape = true;
                    }
                    struct Targets<'a>(&'a mut Uses);
                    impl Visit for Targets<'_> {
                        fn visit_member_expr(&mut self, m: &ast::MemberExpr) {
                            self.0.write(&ast::Expr::Member(m.clone()));
                        }
                    }
                    p.visit_with(&mut Targets(self));
                }
                _ => a.left.visit_with(self),
            }
            a.right.visit_with(self);
        }
        fn visit_update_expr(&mut self, u: &ast::UpdateExpr) {
            if this_member_key(&u.arg).is_some() {
                self.write(&u.arg);
                return;
            }
            u.visit_children_with(self);
        }
        fn visit_unary_expr(&mut self, u: &ast::UnaryExpr) {
            if u.op == ast::UnaryOp::Delete && this_member_key(&u.arg).is_some() {
                self.write(&u.arg);
                return;
            }
            u.visit_children_with(self);
        }
        fn visit_for_head(&mut self, h: &ast::ForHead) {
            if let ast::ForHead::Pat(p) = h {
                struct Targets<'a>(&'a mut Uses);
                impl Visit for Targets<'_> {
                    fn visit_member_expr(&mut self, m: &ast::MemberExpr) {
                        self.0.write(&ast::Expr::Member(m.clone()));
                    }
                }
                p.visit_with(&mut Targets(self));
                return;
            }
            h.visit_children_with(self);
        }
    }
    let mut u = Uses::default();
    let mut parent: Option<String> = None;
    let class = match of {
        UsesOf::Class(c) => c,
        UsesOf::Function(params, stmts) => {
            for p in params {
                p.visit_with(&mut u);
            }
            // (`X.apply(this, arguments)` first: the parent's constructor.)
            let forwards = |st: &ast::Stmt| -> Option<String> {
                let ast::Stmt::Expr(e) = st else { return None };
                let ast::Expr::Call(c) = &*e.expr else { return None };
                let ast::Callee::Expr(callee) = &c.callee else { return None };
                let ast::Expr::Member(m) = &**callee else { return None };
                let (ast::Expr::Ident(x), ast::MemberProp::Ident(f)) = (&*m.obj, &m.prop) else { return None };
                let ok = &*f.sym == "apply"
                    && matches!(&c.args[..], [a, b] if a.spread.is_none() && b.spread.is_none()
                        && matches!(&*a.expr, ast::Expr::This(_))
                        && matches!(&*b.expr, ast::Expr::Ident(i) if &*i.sym == "arguments"));
                ok.then(|| x.sym.to_string())
            };
            let rest = match stmts.first().and_then(forwards) {
                Some(x) => {
                    parent = Some(x);
                    &stmts[1..]
                }
                None => stmts,
            };
            for st in rest {
                st.visit_with(&mut u);
            }
            return (!u.escape).then(|| partial::js::InstanceUses {
                written: u.written.into_iter().collect(),
                called: u.called.into_iter().collect(),
                bound: u.bound.into_iter().collect(),
                written_otherwise: u.written_otherwise.into_iter().collect(),
                parent,
                parent_capture: None,
            });
        }
    };
    for m in &class.body {
        match m {
            ast::ClassMember::Constructor(c) => {
                for p in &c.params {
                    p.visit_with(&mut u);
                }
                if let Some(b) = &c.body {
                    // (`super(...)`: React's or another parent's constructor
                    // given `this` to make.)
                    b.visit_with(&mut u);
                }
            }
            ast::ClassMember::Method(m) if !m.is_static => {
                match &m.key {
                    ast::PropName::Computed(_) => return None,
                    k => {
                        let name = match k {
                            ast::PropName::Ident(i) => i.sym.to_string(),
                            ast::PropName::Str(st) => st.value.to_string_lossy().into_owned(),
                            ast::PropName::Num(n) => n.value.to_string(),
                            _ => return None,
                        };
                        // (An accessor's key is no method's.)
                        if m.kind != ast::MethodKind::Method {
                            u.written.insert(name.clone());
                            u.written_otherwise.insert(name);
                        }
                    }
                }
                m.function.visit_with(&mut ThisBody(&mut u));
            }
            ast::ClassMember::PrivateMethod(m) if !m.is_static => {
                m.function.visit_with(&mut ThisBody(&mut u));
            }
            ast::ClassMember::ClassProp(p) if !p.is_static => {
                let key = match &p.key {
                    ast::PropName::Computed(_) => return None,
                    ast::PropName::Ident(i) => i.sym.to_string(),
                    ast::PropName::Str(st) => st.value.to_string_lossy().into_owned(),
                    _ => return None,
                };
                u.written.insert(key.clone());
                u.written_otherwise.insert(key);
                if let Some(v) = &p.value {
                    v.visit_with(&mut u);
                }
            }
            ast::ClassMember::PrivateProp(p) if !p.is_static => {
                if let Some(v) = &p.value {
                    v.visit_with(&mut u);
                }
            }
            _ => {}
        }
    }
    // (A method's own body, its `this` the instance: visited as the
    // constructor's is, not skipped as a nested function's.)
    struct ThisBody<'a>(&'a mut Uses);
    impl Visit for ThisBody<'_> {
        fn visit_function(&mut self, f: &ast::Function) {
            for p in &f.params {
                p.visit_with(self.0);
            }
            if let Some(b) = &f.body {
                b.visit_with(self.0);
            }
        }
    }
    (!u.escape).then(|| partial::js::InstanceUses {
        written: u.written.into_iter().collect(),
        called: u.called.into_iter().collect(),
        bound: u.bound.into_iter().collect(),
        written_otherwise: u.written_otherwise.into_iter().collect(),
        parent,
        parent_capture: None,
    })
}

/// The classes React's model may need modeled (see
/// `Compiler::react_roots`): the names a script passes
/// `__optimizeReactComponentTree`, and those of classes it makes elements of
/// (`createElement(Name, ...)`) whose definition may be a simple class's
/// (see `class_may_be_simple`).
fn react_root_names(module: &ast::Module) -> HashSet<String> {
    #[derive(Default)]
    struct Names {
        roots: HashSet<String>,
        types: HashSet<String>,
        simple_classes: HashSet<String>,
        /// Classes with a parent (a first render may mount one: see the
        /// engine's `mountable_class`; a root's tree may make one's `render`
        /// a root).
        classes: HashSet<String>,
        /// A root's tree is rendered once (`firstRenderOnly: true`).
        first_render: bool,
    }
    impl swc_ecma_visit::Visit for Names {
        fn visit_call_expr(&mut self, c: &ast::CallExpr) {
            if let ast::Callee::Expr(e) = &c.callee {
                let first = c.args.first().map(|a| &*a.expr);
                match (&**e, first) {
                    (ast::Expr::Ident(i), Some(ast::Expr::Ident(a))) if &*i.sym == "__optimizeReactComponentTree" => {
                        self.roots.insert(a.sym.to_string());
                        let first_render = c.args.get(1).is_some_and(|o| matches!(&*o.expr, ast::Expr::Object(o) if o.props.iter().any(|p| matches!(p,
                            ast::PropOrSpread::Prop(p) if matches!(&**p, ast::Prop::KeyValue(kv)
                                if matches!(&kv.key, ast::PropName::Ident(k) if &*k.sym == "firstRenderOnly")
                                    && matches!(&*kv.value, ast::Expr::Lit(ast::Lit::Bool(b)) if b.value))))));
                        self.first_render |= first_render;
                    }
                    (ast::Expr::Member(m), Some(ast::Expr::Ident(a))) if matches!(&m.prop, ast::MemberProp::Ident(p) if &*p.sym == "createElement") => {
                        self.types.insert(a.sym.to_string());
                    }
                    _ => {}
                }
            }
            swc_ecma_visit::VisitWith::visit_children_with(c, self);
        }
        fn visit_class_decl(&mut self, d: &ast::ClassDecl) {
            if class_may_be_simple(&d.class) {
                self.simple_classes.insert(d.ident.sym.to_string());
            }
            if d.class.super_class.is_some() {
                self.classes.insert(d.ident.sym.to_string());
            }
            swc_ecma_visit::VisitWith::visit_children_with(d, self);
        }
    }
    let mut r = Names::default();
    swc_ecma_visit::VisitWith::visit_with(module, &mut r);
    let mut out = r.roots;
    out.extend(r.types.intersection(&r.simple_classes).cloned());
    // (A class with a parent an element is made of: a first render may
    // mount it, and a root's tree that renders it as an element makes its
    // `render` a root of its own, see the engine's `react_note_branch_roots`.)
    out.extend(r.types.intersection(&r.classes).cloned());
    out
}

/// A class whose definition may be React's simple class (the specializer
/// decides: see the engine's `js/react.rs`): no instance fields, no
/// constructor or one of nothing but `super(...)`, no lifecycle method.
fn class_may_be_simple(c: &ast::Class) -> bool {
    const LIFECYCLE: &[&str] = &[
        "componentWillMount", "UNSAFE_componentWillMount", "componentDidMount", "componentWillReceiveProps", "UNSAFE_componentWillReceiveProps",
        "shouldComponentUpdate", "componentWillUpdate", "UNSAFE_componentWillUpdate", "getSnapshotBeforeUpdate", "componentDidUpdate",
        "componentWillUnmount", "componentDidCatch", "getChildContext",
    ];
    c.super_class.is_some()
        && c.body.iter().all(|m| match m {
            ast::ClassMember::Method(m) => !matches!(&m.key, ast::PropName::Ident(i) if LIFECYCLE.contains(&&*i.sym)),
            ast::ClassMember::Constructor(k) => k.body.as_ref().is_some_and(|b| {
                b.stmts.iter().all(|st| matches!(st, ast::Stmt::Expr(e) if matches!(&*e.expr, ast::Expr::Call(c) if matches!(c.callee, ast::Callee::Super(_)))))
            }),
            ast::ClassMember::Empty(_) => true,
            _ => false,
        })
}

/// Constructs that are not modeled at all, rejected up front (rather than
/// lowered as something they are not): async functions and `await`.
fn reject_unsupported(module: &ast::Module) -> R<()> {
    use swc_ecma_visit::{Visit, VisitWith};
    struct Finder(Option<&'static str>);
    impl Visit for Finder {
        fn visit_function(&mut self, f: &ast::Function) {
            // An async generator runs as a residual `async function*`; its
            // `yield*` delegates to an async iterator (the lowering of
            // `yield*` follows the sync protocol).
            if f.is_async && f.is_generator {
                struct Delegates(bool);
                impl Visit for Delegates {
                    fn visit_function(&mut self, _: &ast::Function) {}
                    fn visit_arrow_expr(&mut self, _: &ast::ArrowExpr) {}
                    fn visit_yield_expr(&mut self, y: &ast::YieldExpr) {
                        self.0 |= y.delegate;
                        y.visit_children_with(self);
                    }
                }
                let mut d = Delegates(false);
                if let Some(b) = &f.body {
                    b.visit_children_with(&mut d);
                }
                if d.0 {
                    self.0 = Some("`yield*` in an async generator is not supported yet");
                }
            }
            f.visit_children_with(self);
        }
    }
    let mut f = Finder(None);
    module.visit_with(&mut f);
    match f.0 {
        Some(m) => Err(m.into()),
        None => Ok(()),
    }
}

/// Does this constructor body read a `super` property (`super.m`,
/// `super[k]`)? Arrows share the constructor's; a nested function or class
/// has its own.
fn super_prop_in(body: &[ast::Stmt]) -> bool {
    use swc_ecma_visit::{Visit, VisitWith};
    struct Finder(bool);
    impl Visit for Finder {
        fn visit_function(&mut self, _: &ast::Function) {}
        fn visit_class(&mut self, _: &ast::Class) {}
        fn visit_super_prop_expr(&mut self, _: &ast::SuperPropExpr) {
            self.0 = true;
        }
    }
    let mut f = Finder(false);
    for st in body {
        st.visit_with(&mut f);
    }
    f.0
}

/// The self-hosted built-ins (see `prelude.js`).
const PRELUDE: &str = include_str!("prelude.js");

/// React's rendering as code the specializer runs (`LowerOpts::react`; see
/// `react_model.js`).
const REACT_MODEL: &str = include_str!("react_model.js");

/// React's model function deciding whether a class extends React's
/// `Component` as the specializer knows it (see `Lowerer::lower_class`).
const REACT_EXTENDS_COMPONENT: &str = "__pe_react_extends_component";

/// Does this body begin with a `"use strict"` directive?
fn has_use_strict<'a>(stmts: impl IntoIterator<Item = &'a ast::Stmt>) -> bool {
    for s in stmts {
        match s {
            ast::Stmt::Expr(e) => match &*e.expr {
                ast::Expr::Lit(ast::Lit::Str(st)) => {
                    if st.value == *"use strict" {
                        return true;
                    }
                }
                _ => return false,
            },
            _ => return false,
        }
    }
    false
}

fn leak(s: String) -> &'static str {
    Box::leak(s.into_boxed_str())
}

/// The entry's input parameter in whole-script mode (not a JS identifier, so
/// it cannot clash with a script binding).
const SCRIPT_INPUT: &str = "%input";

#[derive(Default)]
struct Compiler {
    /// How many tagged templates have been lowered: each is a site of its
    /// own (see `lower_tagged_template`).
    template_sites: usize,
    /// See `LowerOpts`.
    closed_script: bool,
    /// See `LowerOpts`.
    trust_types: bool,
    /// React's model is in use (`LowerOpts::react`): the names the script
    /// passes `__optimizeReactComponentTree`, whose classes are modeled,
    /// not made from their source at runtime, so that their `render` is
    /// code the specializer runs.
    react_roots: Option<HashSet<String>>,
    /// A whole script's entry function (not one of its globals: the
    /// residual's `main` stands for it).
    script_entry: Option<String>,
    /// The script's top-level declarations, (name, lexical), which the
    /// residual declares at its top level.
    script_decls: Vec<(String, bool)>,
    /// The names of the classes declaring private names (`PrivInfo::class`),
    /// for the brand-check errors.
    class_names: Vec<String>,
    /// Whole-script mode: the entry's parameter is `SCRIPT_INPUT`.
    script_input: bool,
    /// The top-level function being lowered is strict code (inherited by the
    /// functions nested in it).
    strict_now: bool,
    /// Declared top-level functions, cloned from the module, indexed by fid.
    decls: Vec<DeclFn>,
    name_to_fid: HashMap<String, usize>,
    /// Lowered declared functions (fid 0..decls.len()), then lifted functions.
    declared: Vec<FuncDef>,
    lifted: Vec<FuncDef>,
    /// The source of each lifted function (aligned with `lifted`).
    lifted_sources: Vec<Option<FnSource>>,
    /// The source of each declared function that has one (one whose direct
    /// `eval` reruns the call at runtime, see `rerun_eval_ok`).
    decl_sources: HashMap<usize, FnSource>,
    /// The declared function being lowered reruns at runtime.
    rerun_next: bool,
}

struct DeclFn {
    name: String,
    /// Strict-mode code (a directive in it or around it).
    strict: bool,
    /// A real declared function, or `None` for the synthetic module `main`
    /// (whose body is the program's top-level statements).
    function: Option<ast::Function>,
    module_body: Option<Vec<ast::Stmt>>,
}

/// A bound name's residual slot plus whether it is BOXED (a `{value}` cell, for
/// capture-by-reference). A MAPPED parameter (`mapped: Some(i)`, of a sloppy
/// function with simple parameters whose `arguments` aliases them) is boxed
/// too: its cell is the arguments object itself, at key `i`, when the call
/// passed that argument (else a `{i: value}` holder).
#[derive(Clone, Copy)]
struct Binding {
    slot: usize,
    boxed: bool,
    mapped: Option<u32>,
}

impl Binding {
    /// The property of a boxed binding's cell that holds its value.
    fn key(&self) -> String {
        match self.mapped {
            Some(i) => i.to_string(),
            None => "value".to_string(),
        }
    }
    /// Read the binding (through its cell if boxed).
    fn read(&self) -> Expr {
        if self.boxed {
            Expr::Get(Box::new(Expr::Var(self.slot)), self.key())
        } else {
            Expr::Var(self.slot)
        }
    }
    /// Write `value` to the binding (through its cell if boxed).
    fn write(&self, value: Expr) -> Stmt {
        if self.boxed {
            Stmt::SetProp(Expr::Var(self.slot), self.key(), value)
        } else {
            Stmt::Set(self.slot, value)
        }
    }
}

/// Per-function lowering state: a lexical stack of name→binding scopes.
struct FnCtx {
    /// Lowering a script's top-level code: there `this` is the global object.
    script_top: bool,
    /// Variables nothing ever reads (of this function or an enclosing one):
    /// an assignment to one is only its value, a declaration only its
    /// initializer's effects, and it needs no cell.
    dead: HashSet<String>,
    scopes: Vec<HashMap<String, Binding>>,
    /// Per scope: the `let`/`const`/`class` names its block declares
    /// further on, not yet declared (see `Compiler::block_prologue`): a
    /// reference to one from here is in its temporal dead zone.
    tdz: Vec<HashSet<String>>,
    next_slot: usize,
    max_slot: usize,
    /// Lowering an object literal whose home-object cell is bound already
    /// (see the `super` properties of an object literal's methods).
    object_home: bool,
    /// The source names of the slots that have one (for diagnostics: see
    /// `FuncDef::slot_names`).
    names: Vec<(usize, String)>,
    /// nesting depth of enclosing `switch`/loop, to validate `break`.
    break_depth: usize,
    /// nesting depth of enclosing *loops*, to validate `continue` (which, unlike
    /// `break`, does not target a `switch`).
    loop_depth: usize,
    /// Names bound in enclosing functions (would-be captures). Referencing one
    /// from a lifted arrow is a clear "capturing closure" error; a name in
    /// neither the local scopes nor here is treated as a runtime global.
    outer_names: HashSet<String>,
    /// Names that must be boxed in THIS function (captured + mutated `var`s or
    /// parameters).
    boxed_set: HashSet<String>,
    /// `return eval(e)` reruns the call at runtime (see `rerun_eval_ok`).
    rerun_eval: bool,
    /// The names this function's code assigns (`None` before its scope is
    /// analyzed), and those enclosing functions' code assigns (by name).
    assigned: Option<HashSet<String>>,
    outer_assigned: HashSet<String>,
    /// The bindings (by slot) certainly initialized by now in program
    /// order: parameters, function declarations, declarations already
    /// lowered, and captures initialized when the closure was made.
    initialized: HashSet<usize>,
    /// Of `boxed_set`, the names no code assigns (boxed only to be seen by
    /// a closure made before their initialization): once a `let`/`const`
    /// of one is initialized, its cell is final (`Stmt::FinalCell`).
    final_cells: HashSet<String>,
    /// Of `boxed_set`, the `var`s and function declarations written exactly
    /// once (`scope::FnInfo::once_written_vars`; a declaration no code
    /// assigns, the only one of its name): after that write, the cell is
    /// final (`Stmt::FinalCell`).
    once_cells: HashSet<String>,
    /// Of `boxed_set`, the names that are PARAMETERS. Their `{value}` cell is
    /// initialized from the incoming argument (`p = {value: p}`), not from
    /// `undefined` like a hoisted local.
    boxed_params: HashSet<String>,
    /// Names of nested `function` declarations hoisted to the top of THIS
    /// function body (so `lower_stmt` skips them at their textual position; a
    /// `function` declaration anywhere else is rejected).
    hoisted_fns: HashSet<String>,
    /// Lowering an async function's body (`await` is allowed).
    is_async: bool,
    /// A generator with a `try`/`finally` around a `yield`: its `finally`
    /// blocks stay native (see `Stmt::TryFinally`).
    native_finally: bool,
    /// The native `finally` regions being lowered: the break stack depth and
    /// loop depth at each one's entry (a `break`/`continue` may not leave one).
    native_regions: Vec<(usize, usize)>,
    /// Block-level `function` declarations already created at the entry of
    /// their block (by source span), so `lower_stmt` does not reject them.
    block_fns: HashSet<(u32, u32)>,
    /// Names whose block-level function declarations also assign a
    /// function-scoped `var` of the same name when evaluated (sloppy mode,
    /// Annex B.3.3).
    annex_b: HashSet<String>,
    /// Slot reserved (lazily, on first reference) for this function's
    /// `arguments` object. The engine fills it with the actual call args on the
    /// inline path.
    arguments_slot: Option<usize>,
    /// The parameters alias `arguments` (see `Binding::mapped`).
    mapped_arguments: bool,
    /// Set when lowering a class constructor.
    ctor: Option<CtorInfo>,
    /// The private names visible here (`#x`: what the enclosing classes
    /// declare it as; its binding is the `#x` local).
    privates: HashMap<String, PrivInfo>,
    /// A script's top-level declarations (in the body that runs the script):
    /// properties of the global object (`var`, functions) or global lexical
    /// bindings (`let`, `const`, `class`), written and read as globals.
    script_globals: HashSet<String>,
    /// Of those, the functions also kept in a local (the program never
    /// assigns the name, so the two stay the same).
    script_fn_aliases: HashSet<String>,
    /// The binding name an anonymous function or class being lowered right
    /// now is assigned to (`var f = function () {}` names it "f").
    name_hint: Option<String>,
    /// One entry per enclosing loop or switch (innermost last): the slot of
    /// a `for..of` loop's iterator, closed when `break` or `return` leaves
    /// the loop early.
    iter_stack: Vec<Option<(usize, bool)>>,
    /// Enclosing labels: name, the index its statement's break target has
    /// in the break stack, and for a loop its index among the loops.
    labels: Vec<(String, usize, Option<usize>)>,
    /// Strict-mode code.
    strict: bool,
    /// Enclosing `try ... finally` regions (innermost last).
    finally_stack: Vec<FinRegion>,
}

/// A `try ... finally` region being lowered: a jump that leaves it records
/// its completion in `kind` (1 return, 2 throw, 3 + i the i-th deferred
/// `break`/`continue`) and `val`, then exits the region's block; after the
/// `finally` code the completion resumes.
struct FinRegion {
    kind: usize,
    val: usize,
    /// The region block's index in the break stack.
    block_index: usize,
    /// `iter_stack` / `loop_depth` at the region's entry.
    iter_depth: usize,
    loop_depth: usize,
    /// `break`/`continue` statements leaving the region, re-issued after it.
    deferred: Vec<ast::Stmt>,
}

/// What a private name `#x` is, in the class that declares it. A field's
/// binding is a `WeakMap` from instances to values; a method's or accessor's
/// is a cell holding `{b, f}` / `{b, g, s}`: the class's brand (a `WeakSet`
/// of the objects that have its private methods) and the functions.
#[derive(Clone, Copy, Debug)]
struct PrivInfo {
    kind: PrivKind,
    is_static: bool,
    /// The declaring class (an index into `Compiler::class_names`).
    class: usize,
}

#[derive(Clone, Copy, Debug, PartialEq)]
enum PrivKind {
    Field,
    Method,
    Accessor { get: bool, set: bool },
}

/// What a class made from its source names (see `Lowerer::class_source`):
/// globals, and the variables the residual passes it, each with whether it
/// is a cell.
struct ClassSource {
    globals: BTreeSet<String>,
    vars: Vec<(String, bool)>,
    /// Per variable: the members naming it (`partial::js::ClassSourceCaps`).
    users: Vec<Vec<String>>,
}

/// What lowering a class constructor needs to know.
#[derive(Clone, Copy)]
struct CtorInfo {
    /// The class has an `extends` clause (`this` is bound by `super(...)`).
    derived: bool,
    /// The class has instance fields, initialized by the captured `%init`
    /// function: at entry in a base class, right after `super(...)` in a
    /// derived one.
    has_init: bool,
    /// The implicit constructor of a derived class: `super(...arguments)`.
    default_derived: bool,
}

/// How to lift a function.
struct LiftOpts {
    kind: FnKind,
    /// An async function (or arrow or method).
    is_async: bool,
    /// The function's JS `name`.
    name: String,
    strict: bool,
    ctor: Option<CtorInfo>,
    /// Bindings to capture although the body's names don't mention them
    /// (`%init`, `%super`, which constructor lowering references).
    extra_free: Vec<String>,
    /// The function's syntax, when it can be emitted as source.
    source: Option<FnNode>,
    /// Its direct `eval` reruns the call at runtime (see `rerun_eval_ok`).
    rerun_eval: bool,
}

impl LiftOpts {
    fn new(kind: FnKind) -> Self {
        LiftOpts { kind, is_async: false, name: String::new(), strict: false, ctor: None, extra_free: vec![], source: None, rerun_eval: false }
    }
    fn named(mut self, name: impl Into<String>) -> Self {
        self.name = name.into();
        self
    }
    fn strict(mut self, strict: bool) -> Self {
        self.strict = strict;
        self
    }
    fn asynchronous(mut self, is_async: bool) -> Self {
        self.is_async = is_async;
        self
    }
    fn source(mut self, node: FnNode) -> Self {
        self.source = Some(node);
        self
    }
}

impl FnCtx {
    fn new(outer_names: HashSet<String>) -> Self {
        FnCtx {
            script_top: false,
            dead: HashSet::new(),
            scopes: vec![HashMap::new()],
            tdz: vec![HashSet::new()],
            next_slot: 0,
            object_home: false,
            names: Vec::new(),
            max_slot: 0,
            break_depth: 0,
            loop_depth: 0,
            outer_names,
            boxed_set: HashSet::new(),
            rerun_eval: false,
            assigned: None,
            outer_assigned: HashSet::new(),
            initialized: HashSet::new(),
            final_cells: HashSet::new(),
            once_cells: HashSet::new(),
            boxed_params: HashSet::new(),
            hoisted_fns: HashSet::new(),
            is_async: false,
            native_finally: false,
            native_regions: Vec::new(),
            block_fns: HashSet::new(),
            annex_b: HashSet::new(),
            arguments_slot: None,
            mapped_arguments: false,
            ctor: None,
            privates: HashMap::new(),
            script_globals: HashSet::new(),
            script_fn_aliases: HashSet::new(),
            name_hint: None,
            iter_stack: Vec::new(),
            labels: Vec::new(),
            strict: false,
            finally_stack: Vec::new(),
        }
    }
    /// The slot for this function's `arguments`, reserving one on first use.
    fn arguments_slot_or_reserve(&mut self) -> usize {
        if let Some(slot) = self.arguments_slot {
            return slot;
        }
        let slot = self.next_slot;
        self.next_slot += 1;
        self.max_slot = self.max_slot.max(self.next_slot);
        self.arguments_slot = Some(slot);
        slot
    }
    fn push(&mut self) {
        self.scopes.push(HashMap::new());
        self.tdz.push(HashSet::new());
    }
    /// Is a reference to `name` here to a `let`/`const`/`class` binding of an
    /// enclosing block whose declaration has not run (it is declared
    /// further on in that block, and no nearer scope declares the name)?
    /// Reading or assigning it throws a ReferenceError.
    fn in_tdz(&self, name: &str) -> bool {
        for (scope, pending) in self.scopes.iter().zip(&self.tdz).rev() {
            if scope.contains_key(name) {
                return false;
            }
            if pending.contains(name) {
                return true;
            }
        }
        false
    }
    /// A fresh unnamed local (a lowering temporary).
    fn fresh_slot(&mut self) -> usize {
        let slot = self.next_slot;
        self.next_slot += 1;
        self.max_slot = self.max_slot.max(self.next_slot);
        slot
    }
    /// Enter / leave a loop or switch (a `break` target).
    /// `iter`: a `for..of` loop's iterator (and whether it is async), closed
    /// when control leaves the loop early.
    fn enter_breakable(&mut self, is_loop: bool, iter: Option<(usize, bool)>) {
        self.break_depth += 1;
        if is_loop {
            self.loop_depth += 1;
        }
        self.iter_stack.push(iter);
    }
    fn leave_breakable(&mut self, is_loop: bool) {
        self.break_depth -= 1;
        if is_loop {
            self.loop_depth -= 1;
        }
        self.iter_stack.pop();
    }
    fn pop(&mut self) {
        self.scopes.pop();
        self.tdz.pop();
    }
    fn declare(&mut self, name: &str) -> usize {
        self.declare_boxed(name, self.boxed_set.contains(name))
    }
    fn declare_boxed(&mut self, name: &str, boxed: bool) -> usize {
        let slot = self.next_slot;
        self.next_slot += 1;
        self.max_slot = self.max_slot.max(self.next_slot);
        self.scopes.last_mut().unwrap().insert(name.to_string(), Binding { slot, boxed, mapped: None });
        self.tdz.last_mut().unwrap().remove(name);
        self.names.push((slot, name.to_string()));
        slot
    }
    /// Declare (or reuse) a `var` in the *function* scope. `var` is
    /// function-scoped and hoisted, so it survives inner blocks and a
    /// redeclaration refers to the same binding.
    fn declare_var(&mut self, name: &str) -> usize {
        if let Some(b) = self.scopes[0].get(name) {
            return b.slot;
        }
        let boxed = self.boxed_set.contains(name);
        let slot = self.next_slot;
        self.next_slot += 1;
        self.max_slot = self.max_slot.max(self.next_slot);
        self.scopes[0].insert(name.to_string(), Binding { slot, boxed, mapped: None });
        self.names.push((slot, name.to_string()));
        slot
    }
    /// Each slot's source name (`""` for a lowering temporary; the names
    /// joined by `/` for a slot several bindings share).
    fn slot_names(&self) -> Vec<&'static str> {
        let mut by_slot: Vec<Vec<&str>> = vec![Vec::new(); self.max_slot];
        for (slot, name) in &self.names {
            if *slot < by_slot.len() && !by_slot[*slot].contains(&name.as_str()) {
                by_slot[*slot].push(name);
            }
        }
        by_slot.into_iter().map(|n| leak(n.join("/"))).collect()
    }
    /// `var name = value` (or a `var` pattern's name): a write of the
    /// function-scoped binding, or of the global for a script's top level.
    ///
    /// The initializer assigns the name as an assignment would: inside a
    /// `catch (name)` clause, the catch parameter (the one binding a `var`
    /// may be declared under: any other is an early error).
    fn var_write(&mut self, name: &str, value: Expr) -> Stmt {
        if let Some(b) = self.scopes[1..].iter().rev().find_map(|s| s.get(name).copied()) {
            return b.write(value);
        }
        if self.script_globals.contains(name) && !self.scopes[0].contains_key(name) {
            return Stmt::SetGlobal(name.to_string(), value);
        }
        self.declare_var(name);
        self.scopes[0][name].write(value)
    }
    fn resolve(&self, name: &str) -> Option<usize> {
        self.scopes.iter().rev().find_map(|s| s.get(name).map(|b| b.slot))
    }
    fn resolve_binding(&self, name: &str) -> Option<Binding> {
        self.scopes.iter().rev().find_map(|s| s.get(name).copied())
    }
    /// All names visible here (local scopes + already-inherited outer names),
    /// i.e. the would-be captures for an arrow lifted at this point.
    fn visible_names(&self) -> HashSet<String> {
        let mut names = self.outer_names.clone();
        for scope in &self.scopes {
            names.extend(scope.keys().cloned());
        }
        names
    }
}

impl Compiler {
    /// Register top-level function declarations and gather the remaining
    /// top-level statements (the module body: `var`s, IIFEs, expression
    /// statements) into `module_body` for a synthetic `main`.
    fn collect_fns(&mut self, module: ast::Module, script_strict: bool, entry: &str) -> R<(Vec<ast::Stmt>, bool)> {
        let mut module_body: Vec<ast::Stmt> = Vec::new();
        let mut explicit_main = false;
        for item in module.body {
            match item {
                ast::ModuleItem::Stmt(ast::Stmt::Decl(ast::Decl::Fn(f))) => {
                    let name = f.ident.sym.to_string();
                    if name == entry {
                        explicit_main = true;
                    }
                    let strict = script_strict || f.function.body.as_ref().is_some_and(|b| has_use_strict(&b.stmts));
                    let decl = DeclFn { name: name.clone(), strict, function: Some(*f.function), module_body: None };
                    // (A script's later declaration of a name replaces an
                    // earlier one.)
                    match self.name_to_fid.get(&name) {
                        Some(&fid) => self.decls[fid] = decl,
                        None => {
                            self.name_to_fid.insert(name, self.decls.len());
                            self.decls.push(decl);
                        }
                    }
                }
                ast::ModuleItem::Stmt(ast::Stmt::Empty(_)) => {}
                ast::ModuleItem::Stmt(s) => module_body.push(s),
                ast::ModuleItem::ModuleDecl(_) => {
                    return Err("ES module imports/exports are not supported".into());
                }
            }
        }
        // The entry is function 0 (where the engine looks for `main`).
        if let Some(i) = self.decls.iter().position(|d| d.name == entry) {
            let mut d = self.decls.remove(i);
            d.name = "main".to_string();
            self.decls.insert(0, d);
            self.name_to_fid.clear();
            for (fid, d) in self.decls.iter().enumerate() {
                let key = if fid == 0 { entry.to_string() } else { d.name.clone() };
                self.name_to_fid.insert(key, fid);
            }
        }
        Ok((module_body, explicit_main))
    }

    /// Add the prelude's functions as top-level functions (strict code).
    fn add_prelude(&mut self) -> R<()> {
        self.add_model(PRELUDE)
    }

    /// Add the function declarations of `src` (a model of the environment:
    /// the prelude, React's) as top-level functions of strict code: the
    /// program's names refer to them, the residual's globals they are not.
    fn add_model(&mut self, src: &str) -> R<()> {
        let module = crate::parse_model(src)?;
        for item in module.body {
            if let ast::ModuleItem::Stmt(ast::Stmt::Decl(ast::Decl::Fn(f))) = item {
                let name = f.ident.sym.to_string();
                let fid = self.decls.len();
                self.name_to_fid.insert(name.clone(), fid);
                self.decls.push(DeclFn { name, strict: true, function: Some(*f.function), module_body: None });
            }
        }
        Ok(())
    }

    fn lower_declared(&mut self) -> R<()> {
        for i in 0..self.decls.len() {
            let name = self.decls[i].name.clone();
            self.strict_now = self.decls[i].strict;
            let length = self.decls[i].function.as_ref().map_or(0, |f| {
                expected_argument_count(&f.params.iter().map(|p| p.pat.clone()).collect::<Vec<_>>())
            });
            // (Each declaration is lowered once: its syntax is taken, not
            // copied.)
            let is_generator = self.decls[i].function.as_ref().is_some_and(|f| f.is_generator);
            let is_async = self.decls[i].function.as_ref().is_some_and(|f| f.is_async);
            let is_main = self.decls[i].module_body.is_some();
            let source_text = self.decls[i].function.as_ref().and_then(|f| span_text(f.span));
            let (nslots, nparams, (arguments_slot, mapped_arguments), body, slot_names) = match self.decls[i].function.take() {
                Some(func) => {
                    // (A direct `eval` that reruns the call at runtime: the
                    // function is then emitted as its source, which may
                    // name no top-level function, as the residual renames
                    // them.)
                    let rerun = has_dynamic_direct_eval(&func) && rerun_eval_ok(&func);
                    if rerun {
                        let params: Vec<&ast::Pat> = func.params.iter().map(|p| &p.pat).collect();
                        let body = func.body.as_ref().map(|b| b.stmts.as_slice()).unwrap_or(&[]);
                        let info = scope::analyze(&params, scope::Body::Stmts(body), false);
                        if info.free.iter().any(|n| self.name_to_fid.contains_key(n)) {
                            return Err("a function with a direct `eval(...)` of code not known here that names a function of the program is not supported".into());
                        }
                        let strict = self.decls[i].strict;
                        let src = FnSource { node: FnNode::Function { func: func.clone(), own_name: None }, captures: vec![], globals: info.free.iter().cloned().collect(), strict, rerun: true };
                        self.decl_sources.insert(i, src);
                    }
                    self.rerun_next = rerun;
                    let r = self.lower_fn(&func);
                    self.rerun_next = false;
                    r?
                }
                None => {
                    let stmts = self.decls[i].module_body.take().expect("a declaration is a function or the script's body");
                    let mut lowered = self.lower_module_main(&stmts)?;
                    // (A whole script ending in `return main(input)`: its
                    // top-level code ends just before that call, see
                    // `Stmt::EntryBoundary`.)
                    if self.script_entry.is_some() {
                        let body = &mut lowered.3;
                        if matches!(body.last(), Some(Stmt::Return(_))) {
                            let at = body.len() - 1;
                            body.insert(at, Stmt::EntryBoundary);
                        }
                    }
                    lowered
                }
            };
            self.declared.push(FuncDef {
                name: leak(name),
                nslots,
                ncaptured: 0,
                nparams,
                length,
                slot_names,
                arguments_slot,
                mapped_arguments,
                script_globals: if is_main { std::mem::take(&mut self.script_decls) } else { vec![] },
                script_entry: if is_main { self.script_entry.clone() } else { None },
                class_source: None,
                this_forward: None,
                instance_uses: None,
                cell_captures: vec![],
                proto_methods: vec![],
                this_reads: None,
                kind: if is_generator { FnKind::Generator } else { FnKind::Normal },
                is_async,
                strict: self.decls[i].strict,
                source_text,
                body,
            });
        }
        Ok(())
    }

    /// Lower the program's top-level statements as the body of a synthetic
    /// `main(input)` (the engine entry). `input` is the one dynamic value; the
    /// top-level `var`s and code run in order.
    fn lower_module_main(&mut self, stmts: &[ast::Stmt]) -> R<(usize, usize, (Option<usize>, bool), Vec<Stmt>, Vec<&'static str>)> {
        let mut ctx = FnCtx::new(HashSet::new());
        ctx.script_top = true;
        ctx.strict = self.strict_now;
        // The script's top-level declarations are globals (all but the entry
        // function the residual's `main` stands for).
        let info = scope::analyze(&[], scope::Body::Stmts(stmts), false);
        let mut vars = Vec::new();
        for st in stmts {
            collect_vars(st, &mut vars);
        }
        let fns = fn_decl_names(stmts);
        let mut decls: Vec<(String, bool)> = Vec::new();
        for n in vars.iter().chain(fns.iter()) {
            if Some(n.as_str()) != self.script_entry.as_deref() && !decls.iter().any(|(d, _)| d == n) {
                decls.push((n.clone(), false));
            }
        }
        // (In a closed script a top-level lexical binding no function
        // mentions is a local: nothing else can observe it.)
        let mentions_eval = {
            let mut v = MentionsIdent { name: "eval".to_string(), found: false };
            for st in stmts {
                swc_ecma_visit::VisitWith::visit_with(st, &mut v);
            }
            v.found
        };
        for n in &info.top_lexical {
            if self.closed_script && !mentions_eval && !info.nested_free.contains(n) {
                continue;
            }
            if !decls.iter().any(|(d, _)| d == n) {
                decls.push((n.clone(), true));
            }
        }
        for (n, _) in &decls {
            ctx.script_globals.insert(n.clone());
        }
        self.script_decls = decls;
        let pname = if self.script_input { SCRIPT_INPUT } else { "input" };
        let input = ast::Pat::Ident(ast::BindingIdent::from(ast::Ident::new_no_ctxt(pname.into(), Default::default())));
        let body = self.lower_function_body(&mut ctx, &[&input], stmts, false)?;
        Ok((ctx.max_slot.max(1), 1, (ctx.arguments_slot, ctx.mapped_arguments), body, ctx.slot_names()))
    }

    /// Set up a function's scope and lower its body: parameters (after any
    /// captures the caller declared), hoisted `var`s and function
    /// declarations, the boxed cells of captured-and-mutated bindings, the
    /// `this` an arrow inside may capture, then the statements.
    fn lower_function_body(
        &mut self,
        ctx: &mut FnCtx,
        params: &[&ast::Pat],
        stmts: &[ast::Stmt],
        is_arrow: bool,
    ) -> R<Vec<Stmt>> {
        let info = scope::analyze(params, scope::Body::Stmts(stmts), is_arrow);
        ctx.assigned = Some(info.assigned.iter().cloned().collect());
        // Simple parameters bind their argument slot directly; a pattern,
        // default or rest parameter gets an unnamed slot and is bound at
        // entry (its names are then initialized like `var`s).
        let param_names: Vec<&str> = params
            .iter()
            .filter_map(|p| match p {
                ast::Pat::Ident(b) => Some(&*b.id.sym),
                _ => None,
            })
            .collect();
        // (The names the body reads.)
        let reads = read_names(params, stmts);
        // Variables declared here that nothing reads (no `eval` could): dead.
        {
            let declared: BTreeSet<&String> = info.vars.iter().chain(info.top_lexical.iter()).chain(info.lexical.iter()).collect();
            let mut inherited: HashSet<String> = std::mem::take(&mut ctx.dead);
            inherited.retain(|n| !info.bound.contains(n));
            let mut dead = inherited;
            if !reads.contains("eval") {
                let fns = fn_decl_names(stmts);
                for n in declared {
                    if !reads.contains(n.as_str())
                        && !param_names.contains(&n.as_str())
                        && !fns.contains(n)
                        && n != "arguments"
                        && !n.starts_with('%')
                        && !ctx.script_globals.contains(n)
                    {
                        dead.insert(n.clone());
                    }
                }
            }
            ctx.dead = dead;
        }
        ctx.boxed_set = boxed_locals(&info, &param_names, &fn_decl_names(stmts));
        ctx.boxed_set.retain(|n| !ctx.dead.contains(n));
        ctx.final_cells = ctx.boxed_set.iter().filter(|n| !info.assigned.contains(*n)).cloned().collect();
        // (Not where an `eval` could write a variable by its name.)
        ctx.once_cells = HashSet::new();
        if !reads.contains("eval") {
            let decls = fn_decl_names(stmts);
            for n in &ctx.boxed_set {
                if info.assigned.contains(n) || info.catch_bound(n) {
                    continue;
                }
                // (A parameter nothing assigns: final once its cell holds
                // its argument, at entry, unless `arguments` aliases it.)
                if param_names.contains(&n.as_str()) {
                    if ctx.resolve_binding(n).is_some_and(|b| b.mapped.is_none()) && !info.var_initialized.contains(n) && !decls.contains(n) {
                        ctx.once_cells.insert(n.clone());
                    }
                    continue;
                }
                let is_fn = decls.iter().filter(|d| *d == n).count();
                let once = if is_fn > 0 {
                    is_fn == 1 && !info.var_initialized.contains(n) && !info.lexical.contains(n)
                } else {
                    info.once_written_vars.contains(n)
                };
                if once {
                    ctx.once_cells.insert(n.clone());
                }
            }
        }
        // Sloppy code with simple parameters: `arguments[i]` and parameter
        // `i` are one variable while the call passed that argument. That is
        // only observable when a parameter is assigned or `arguments` is
        // used other than read; then each parameter lives in a cell that is
        // the arguments object itself (see `Binding::mapped`).
        let simple_params = params.iter().all(|p| matches!(p, ast::Pat::Ident(_)));
        if info.uses_arguments && info.assigned.contains("arguments") {
            return Err("assigning to `arguments` is not supported".into());
        }
        let mapped = !is_arrow
            && !ctx.strict
            && simple_params
            && !params.is_empty()
            && info.uses_arguments
            && {
                let usage = scope::arguments_use(stmts);
                let mapped = usage.escapes || param_names.iter().any(|n| info.assigned.contains(*n));
                if mapped && usage.deletes {
                    return Err(
                        "deleting an element of a mapped arguments object (a sloppy function with simple \
                         parameters, whose elements alias the parameters) is not supported"
                            .into(),
                    );
                }
                mapped
            };
        if mapped {
            for n in &param_names {
                ctx.boxed_set.remove(*n);
            }
            ctx.mapped_arguments = true;
        }
        let mut complex_params: Vec<(usize, usize, &ast::Pat)> = Vec::new();
        for (i, p) in params.iter().enumerate() {
            match p {
                ast::Pat::Ident(b) => {
                    let name = &*b.id.sym;
                    if ctx.boxed_set.contains(name) {
                        ctx.boxed_params.insert(name.to_string());
                    }
                    ctx.declare(name);
                }
                ast::Pat::Rest(_) => {
                    // Collected from `arguments`; its argument slot (which
                    // keeps later slots aligned with argument positions) is
                    // unused.
                    let slot = ctx.fresh_slot();
                    complex_params.push((i, slot, p));
                }
                _ => {
                    let slot = ctx.fresh_slot();
                    complex_params.push((i, slot, p));
                }
            }
        }
        hoist_vars(stmts, ctx);
        // Sloppy mode: a function declared in a block also binds a `var` of
        // its name in the function (Annex B.3.3), unless that would clash
        // with a parameter, an enclosing lexical declaration, or `arguments`.
        if !ctx.strict {
            let mut names = Vec::new();
            let mut lexical: Vec<String> = info.top_lexical.iter().cloned().collect();
            for st in stmts {
                annex_b_names(st, &mut lexical, false, &mut names);
            }
            for name in names {
                if name == "arguments" || param_names.contains(&name.as_str()) || ctx.annex_b.contains(&name) {
                    continue;
                }
                if ctx.script_globals.contains(&name) {
                    return Err(format!("a block-level function `{name}` also bound at a script's top level is not supported"));
                }
                ctx.declare_var(&name);
                ctx.annex_b.insert(name);
            }
        }
        // A boxed body-level `let`/`const`/`class` gets its cell at entry (a
        // hoisted function may capture it before its declaration runs).
        let mut lexical: Vec<&String> =
            info.top_lexical.iter().filter(|n| ctx.boxed_set.contains(*n) && !ctx.script_globals.contains(*n)).collect();
        lexical.sort();
        for name in lexical {
            ctx.declare_var(name);
        }
        self.hoist_fn_decls(stmts, ctx);
        let mut body = Vec::new();
        // An arrow inside uses this function's `this`: bind it to a local the
        // arrow captures.
        if !is_arrow && info.nested_free.contains(scope::LEXICAL_THIS) {
            let slot = ctx.declare_var(scope::LEXICAL_THIS);
            body.push(Stmt::Let(slot, if ctx.script_top { Expr::Global("globalThis".into()) } else { Expr::This }));
        }
        body.extend(self.boxed_cell_stmts(ctx));
        if info.uses_arguments && !is_arrow {
            // `arguments` is a binding of the function arrows inside capture.
            let aslot = ctx.arguments_slot_or_reserve();
            ctx.scopes[0].insert("arguments".to_string(), Binding { slot: aslot, boxed: false, mapped: None });
            if mapped {
                // A parameter's cell: `arguments` if the call passed it,
                // else a holder of its (`undefined`) value.
                for (i, n) in param_names.iter().enumerate() {
                    let Some(b) = ctx.scopes[0].get(*n).copied() else { continue };
                    // (A repeated name binds its last occurrence.)
                    if param_names[i + 1..].contains(n) {
                        continue;
                    }
                    let key = i.to_string();
                    body.push(Stmt::Let(b.slot, Expr::Object(vec![(key, Expr::Var(b.slot))])));
                    body.push(Stmt::If(
                        Expr::Bin(
                            Bop::Lt,
                            Box::new(Expr::Num(JsNum::int(i as i64))),
                            Box::new(Expr::Get(Box::new(Expr::Var(aslot)), "length".into())),
                        ),
                        vec![Stmt::Set(b.slot, Expr::Var(aslot))],
                        vec![],
                    ));
                    ctx.scopes[0].insert(n.to_string(), Binding { slot: b.slot, boxed: true, mapped: Some(i as u32) });
                }
            }
        }
        for (i, slot, p) in complex_params {
            match p {
                ast::Pat::Rest(r) => {
                    // `...rest`: the arguments from position `i` on.
                    let args = ctx.arguments_slot_or_reserve();
                    let acc = ctx.fresh_slot();
                    let k = ctx.fresh_slot();
                    body.push(Stmt::Let(acc, Expr::Array(vec![])));
                    body.push(Stmt::Let(k, Expr::Num(JsNum::int(i as i64))));
                    body.push(Stmt::For {
                        cond: Expr::Bin(
                            Bop::Lt,
                            Box::new(Expr::Var(k)),
                            Box::new(Expr::Get(Box::new(Expr::Var(args)), "length".into())),
                        ),
                        body: vec![Stmt::Push(Expr::Var(acc), Expr::Index(Box::new(Expr::Var(args)), Box::new(Expr::Var(k))))],
                        update: vec![Stmt::Set(k, Expr::Bin(Bop::Add, Box::new(Expr::Var(k)), Box::new(Expr::Num(JsNum::int(1)))))],
                    });
                    self.bind_pat(&r.arg, Expr::Var(acc), BindKind::Var, ctx, &mut body)?;
                }
                p => self.bind_pat(p, Expr::Var(slot), BindKind::Var, ctx, &mut body)?,
            }
        }
        // A parameter's type annotation, trusted: what its value is.
        if self.trust_types {
            for p in params {
                let (b, defaulted) = match p {
                    ast::Pat::Ident(b) => (b, false),
                    ast::Pat::Assign(a) => match &*a.left {
                        ast::Pat::Ident(b) => (b, true),
                        _ => continue,
                    },
                    _ => continue,
                };
                let Some(ann) = &b.type_ann else { continue };
                let Some(mut mask) = crate::ts::type_mask(&ann.type_ann) else { continue };
                if b.id.optional && !defaulted {
                    mask |= partial::facts::T_UNDEF;
                }
                if let Some(binding) = ctx.scopes[0].get(&*b.id.sym).copied() {
                    if !binding.boxed && binding.mapped.is_none() {
                        body.push(Stmt::AssumeType(binding.slot, mask));
                    }
                }
            }
        }
        Compiler::note_tdz(stmts, ctx);
        body.extend(self.lower_fn_decls(stmts, ctx)?);
        // (Initialized from here on: the parameters and the function
        // declarations.)
        let mut init_names: Vec<String> = params.iter().flat_map(|p| scope::pat_names(p)).collect();
        init_names.extend(fn_decl_names(stmts));
        for n in init_names {
            if let Some(b) = ctx.resolve_binding(&n) {
                ctx.initialized.insert(b.slot);
            }
        }
        if let Some(ci) = ctx.ctor {
            if ci.default_derived {
                // `constructor(...args) { super(...args); }`
                let args = ctx.arguments_slot_or_reserve();
                body.extend(self.lower_super_call(ctx, SuperArgs::Spread(Expr::Var(args)))?);
            } else if !ci.derived && ci.has_init {
                body.push(self.init_call(ctx)?);
            }
        }
        body.extend(self.lower_stmts(stmts, ctx)?);
        Ok(body)
    }

    /// Declare a block-scoped binding initialized to `value` (a boxed
    /// body-level binding writes its entry-created cell).
    fn bind_lexical(&mut self, name: &str, value: Expr, ctx: &mut FnCtx, out: &mut Vec<Stmt>) -> R<()> {
        // A script's top-level `let`/`const`/`class`: the global binding.
        if ctx.scopes.len() == 1 && ctx.script_globals.contains(name) {
            out.push(Stmt::SetGlobal(name.to_string(), value));
            return Ok(());
        }
        if ctx.boxed_set.contains(name) {
            self.init_boxed_lexical(name, value, ctx, out);
            return Ok(());
        }
        let slot = ctx.declare(name);
        out.push(Stmt::Let(slot, value));
        Ok(())
    }

    /// Initialize a boxed (captured and mutated) lexical binding: its cell,
    /// when the enclosing block's entry created one, else a fresh cell here
    /// (a loop head's per-iteration binding, a declaration in a scope with no
    /// block prologue).
    fn init_boxed_lexical(&mut self, name: &str, value: Expr, ctx: &mut FnCtx, out: &mut Vec<Stmt>) {
        let slot = match ctx.scopes.last().unwrap().get(name).copied() {
            Some(b) if b.boxed => {
                out.push(Stmt::SetProp(Expr::Var(b.slot), "value".to_string(), value));
                b.slot
            }
            _ => {
                let slot = ctx.declare_boxed(name, true);
                out.push(Stmt::Let(slot, Expr::Object(vec![("value".to_string(), value)])));
                slot
            }
        };
        if ctx.final_cells.contains(name) {
            out.push(Stmt::FinalCell(slot));
        }
    }

    /// Lower `e`, the value bound to `name`: an anonymous function, arrow or
    /// class there takes `name` as its JS `name`.
    fn lower_named(&mut self, e: &ast::Expr, name: &str, ctx: &mut FnCtx) -> R<Expr> {
        let anonymous = match unparen(e) {
            ast::Expr::Fn(f) => f.ident.is_none(),
            ast::Expr::Class(c) => c.ident.is_none(),
            ast::Expr::Arrow(_) => true,
            _ => false,
        };
        if anonymous {
            ctx.name_hint = Some(name.to_string());
        }
        let r = self.lower_expr(e, ctx);
        ctx.name_hint = None;
        r
    }

    /// Assign `value` to the name `name` (a local, a boxed cell, or an
    /// implicit global).
    fn assign_name(&mut self, name: &str, value: Expr, ctx: &mut FnCtx, out: &mut Vec<Stmt>) {
        // (In its temporal dead zone: the value is computed, and the
        // assignment throws.)
        if ctx.in_tdz(name) {
            out.push(Stmt::ExprStmt(value));
            let thrown = self.tdz_error(name).unwrap_or_else(|e| panic!("{e}"));
            out.push(Stmt::ExprStmt(thrown));
            return;
        }
        match ctx.resolve_binding(name) {
            Some(b) => out.push(b.write(value)),
            None => out.push(Stmt::SetGlobal(name.to_string(), value)),
        }
    }

    /// Bind a pattern to `value`, emitting the statements: declare (`var` /
    /// lexical) or assign the names it holds. Array patterns use the iterator
    /// protocol (so any iterable destructures; arrays and strings fold),
    /// object patterns read properties (`null`/`undefined` throw), defaults
    /// apply to `undefined`, and rest elements collect what remains.
    fn bind_pat(&mut self, pat: &ast::Pat, value: Expr, kind: BindKind, ctx: &mut FnCtx, out: &mut Vec<Stmt>) -> R<()> {
        match pat {
            ast::Pat::Ident(b) => {
                let name = b.id.sym.to_string();
                match kind {
                    BindKind::Var => out.push(ctx.var_write(&name, value)),
                    BindKind::Lexical => self.bind_lexical(&name, value, ctx, out)?,
                    BindKind::Assign => self.assign_name(&name, value, ctx, out),
                }
            }
            ast::Pat::Assign(a) => {
                let t = ctx.fresh_slot();
                out.push(Stmt::Let(t, value));
                let default = match &*a.left {
                    ast::Pat::Ident(b) => self.lower_named(&a.right, &b.id.sym.to_string(), ctx)?,
                    _ => self.lower_expr(&a.right, ctx)?,
                };
                out.push(Stmt::If(
                    Expr::Bin(Bop::Eq, Box::new(Expr::Var(t)), Box::new(Expr::Undefined)),
                    vec![Stmt::Set(t, default)],
                    vec![],
                ));
                self.bind_pat(&a.left, Expr::Var(t), kind, ctx, out)?;
            }
            ast::Pat::Array(arr) => {
                let it = ctx.fresh_slot();
                out.push(Stmt::Let(it, Expr::GetIter(Box::new(value))));
                let done = ctx.fresh_slot();
                out.push(Stmt::Let(done, Expr::Bool(false)));
                let next = |it: usize| {
                    Expr::Call(Box::new(Expr::Get(Box::new(Expr::Var(it)), "next".to_string())), vec![])
                };
                for el in &arr.elems {
                    let r = ctx.fresh_slot();
                    match el {
                        None => {
                            // An elision consumes one value.
                            out.push(Stmt::If(
                                Expr::Opaque("!".into(), vec![Expr::Var(done)]),
                                vec![
                                    Stmt::Let(r, next(it)),
                                    Stmt::If(
                                        Expr::Get(Box::new(Expr::Var(r)), "done".into()),
                                        vec![Stmt::Set(done, Expr::Bool(true))],
                                        vec![],
                                    ),
                                ],
                                vec![],
                            ));
                        }
                        Some(ast::Pat::Rest(rest)) => {
                            let acc = ctx.fresh_slot();
                            out.push(Stmt::Let(acc, Expr::Array(vec![])));
                            out.push(Stmt::While(
                                Expr::Opaque("!".into(), vec![Expr::Var(done)]),
                                vec![
                                    Stmt::Let(r, next(it)),
                                    Stmt::If(
                                        Expr::Get(Box::new(Expr::Var(r)), "done".into()),
                                        vec![Stmt::Set(done, Expr::Bool(true))],
                                        vec![Stmt::Push(Expr::Var(acc), Expr::Get(Box::new(Expr::Var(r)), "value".into()))],
                                    ),
                                ],
                            ));
                            self.bind_pat(&rest.arg, Expr::Var(acc), kind, ctx, out)?;
                        }
                        Some(p) => {
                            let v = ctx.fresh_slot();
                            out.push(Stmt::Let(v, Expr::Undefined));
                            out.push(Stmt::If(
                                Expr::Opaque("!".into(), vec![Expr::Var(done)]),
                                vec![
                                    Stmt::Let(r, next(it)),
                                    Stmt::If(
                                        Expr::Get(Box::new(Expr::Var(r)), "done".into()),
                                        vec![Stmt::Set(done, Expr::Bool(true))],
                                        vec![Stmt::Set(v, Expr::Get(Box::new(Expr::Var(r)), "value".into()))],
                                    ),
                                ],
                                vec![],
                            ));
                            self.bind_pat(p, Expr::Var(v), kind, ctx, out)?;
                        }
                    }
                }
                // Stopped before the end: close the iterator.
                out.push(Stmt::If(
                    Expr::Opaque("!".into(), vec![Expr::Var(done)]),
                    vec![Stmt::ExprStmt(Expr::IterClose(Box::new(Expr::Var(it))))],
                    vec![],
                ));
            }
            ast::Pat::Object(obj) => {
                let o = ctx.fresh_slot();
                out.push(Stmt::Let(o, value));
                // RequireObjectCoercible
                out.push(Stmt::If(
                    Expr::Opaque("==".into(), vec![Expr::Var(o), Expr::Null]),
                    vec![Stmt::Throw(Expr::New(
                        Box::new(Expr::Global("TypeError".into())),
                        vec![Expr::Str("Cannot destructure a null or undefined value".into())],
                    ))],
                    vec![],
                ));
                let mut used: Vec<Expr> = Vec::new();
                for prop in &obj.props {
                    match prop {
                        ast::ObjectPatProp::KeyValue(kv) => {
                            let key = self.lower_prop_key(&kv.key, ctx)?;
                            let (read, kexpr) = match key {
                                PropKey::Static(k) => {
                                    (Expr::Get(Box::new(Expr::Var(o)), k.clone()), Expr::Str(k))
                                }
                                PropKey::Computed(e) => {
                                    let kslot = ctx.fresh_slot();
                                    out.push(Stmt::Let(kslot, e));
                                    (Expr::Index(Box::new(Expr::Var(o)), Box::new(Expr::Var(kslot))), Expr::Var(kslot))
                                }
                            };
                            used.push(kexpr);
                            self.bind_pat(&kv.value, read, kind, ctx, out)?;
                        }
                        ast::ObjectPatProp::Assign(a) => {
                            let name = a.key.id.sym.to_string();
                            used.push(Expr::Str(name.clone()));
                            let read = Expr::Get(Box::new(Expr::Var(o)), name.clone());
                            let target = ast::Pat::Ident(a.key.clone());
                            match &a.value {
                                Some(d) => {
                                    let t = ctx.fresh_slot();
                                    out.push(Stmt::Let(t, read));
                                    let default = self.lower_named(d, &name, ctx)?;
                                    out.push(Stmt::If(
                                        Expr::Bin(Bop::Eq, Box::new(Expr::Var(t)), Box::new(Expr::Undefined)),
                                        vec![Stmt::Set(t, default)],
                                        vec![],
                                    ));
                                    self.bind_pat(&target, Expr::Var(t), kind, ctx, out)?;
                                }
                                None => self.bind_pat(&target, read, kind, ctx, out)?,
                            }
                        }
                        ast::ObjectPatProp::Rest(r) => {
                            // CopyDataProperties excluding the keys named
                            // before: own enumerable keys (strings and
                            // symbols), read with [[Get]].
                            let rest = ctx.fresh_slot();
                            out.push(Stmt::Let(rest, Expr::Object(vec![])));
                            let keys = ctx.fresh_slot();
                            out.push(Stmt::Let(
                                keys,
                                Expr::Call(
                                    Box::new(Expr::Get(Box::new(Expr::Global("Reflect".into())), "ownKeys".into())),
                                    vec![Expr::Var(o)],
                                ),
                            ));
                            let i = ctx.fresh_slot();
                            out.push(Stmt::Let(i, Expr::Num(JsNum::int(0))));
                            let k = ctx.fresh_slot();
                            let mut cond = Expr::Call(
                                Box::new(Expr::Get(
                                    Box::new(Expr::Get(
                                        Box::new(Expr::Get(Box::new(Expr::Global("Object".into())), "prototype".into())),
                                        "propertyIsEnumerable".into(),
                                    )),
                                    "call".into(),
                                )),
                                vec![Expr::Var(o), Expr::Var(k)],
                            );
                            for u in &used {
                                cond = Expr::Opaque(
                                    "&&".into(),
                                    vec![Expr::Bin(Bop::Ne, Box::new(Expr::Var(k)), Box::new(u.clone())), cond],
                                );
                            }
                            out.push(Stmt::For {
                                cond: Expr::Bin(
                                    Bop::Lt,
                                    Box::new(Expr::Var(i)),
                                    Box::new(Expr::Get(Box::new(Expr::Var(keys)), "length".into())),
                                ),
                                body: vec![
                                    Stmt::Let(k, Expr::Index(Box::new(Expr::Var(keys)), Box::new(Expr::Var(i)))),
                                    Stmt::If(
                                        cond,
                                        vec![Stmt::ExprStmt(Expr::DefineProps(
                                            Box::new(Expr::Var(rest)),
                                            vec![PropDef::Data {
                                                key: PropKey::Computed(Expr::Var(k)),
                                                value: Expr::Index(Box::new(Expr::Var(o)), Box::new(Expr::Var(k))),
                                                attrs: DEFAULT_ATTRS,
                                            }],
                                        ))],
                                        vec![],
                                    ),
                                ],
                                update: vec![Stmt::Set(
                                    i,
                                    Expr::Bin(Bop::Add, Box::new(Expr::Var(i)), Box::new(Expr::Num(JsNum::int(1)))),
                                )],
                            });
                            self.bind_pat(&r.arg, Expr::Var(rest), kind, ctx, out)?;
                        }
                    }
                }
            }
            ast::Pat::Expr(e) if kind == BindKind::Assign => {
                // A member target in a destructuring assignment.
                match unparen(e) {
                    ast::Expr::Member(m) => {
                        let obj = self.lower_expr(&m.obj, ctx)?;
                        match &m.prop {
                            ast::MemberProp::Ident(id) => out.push(Stmt::SetProp(obj, id.sym.to_string(), value)),
                            ast::MemberProp::Computed(c) => {
                                let k = self.lower_expr(&c.expr, ctx)?;
                                out.push(Stmt::SetIndex(obj, k, value));
                            }
                            ast::MemberProp::PrivateName(p) => {
                                let e = self.private_assign(obj, &p.name, value, None, ctx)?;
                                out.push(Stmt::ExprStmt(e));
                            }
                        }
                    }
                    ast::Expr::Ident(id) => {
                        let name = id.sym.to_string();
                        self.assign_name(&name, value, ctx, out);
                    }
                    _ => return Err("unsupported destructuring assignment target".into()),
                }
            }
            ast::Pat::Rest(_) => return Err("a rest element outside an array or object pattern".into()),
            _ => return Err("unsupported binding pattern".into()),
        }
        Ok(())
    }

    /// `for (head of iterable) body`: get the iterator, then each step binds
    /// `head` to the next value (a fresh binding per iteration for
    /// `let`/`const`); `break`/`return` close the iterator.
    fn lower_for_of(&mut self, f: &ast::ForOfStmt, ctx: &mut FnCtx, out: &mut Vec<Stmt>) -> R<()> {
        let iterable = self.lower_expr(&f.right, ctx)?;
        let it = ctx.fresh_slot();
        let r = ctx.fresh_slot();
        let next = Expr::Call(Box::new(Expr::Get(Box::new(Expr::Var(it)), "next".to_string())), vec![]);
        let mut body = Vec::new();
        if f.is_await {
            // `for await`: the async iterator (see `runtime.js`), each
            // `next()` awaited and checked to be an object.
            out.push(Stmt::Let(it, Expr::CallPlain(Box::new(Expr::Global(ASYNC_ITER.into())), vec![iterable])));
            body.push(Stmt::Let(r, Expr::Await(Box::new(next))));
            body.push(type_error_unless_object(r, "Iterator result ", " is not an object"));
        } else {
            out.push(Stmt::Let(it, Expr::GetIter(Box::new(iterable))));
            body.push(Stmt::Let(r, next));
        }
        body.push(Stmt::If(Expr::Get(Box::new(Expr::Var(r)), "done".into()), vec![Stmt::Break], vec![]));
        ctx.push();
        let value = Expr::Get(Box::new(Expr::Var(r)), "value".into());
        self.bind_for_head(&f.left, value, ctx, &mut body)?;
        ctx.enter_breakable(true, Some((it, f.is_await)));
        body.extend(self.lower_body(&f.body, ctx)?);
        ctx.leave_breakable(true);
        ctx.pop();
        out.push(Stmt::While(Expr::Bool(true), body));
        Ok(())
    }

    /// `for (head in obj) body`: the enumerable string keys of `obj` and its
    /// prototypes, snapshotted at entry; a key deleted before its turn is
    /// skipped.
    fn lower_for_in(&mut self, f: &ast::ForInStmt, ctx: &mut FnCtx, out: &mut Vec<Stmt>) -> R<()> {
        let obj = self.lower_expr(&f.right, ctx)?;
        let o = ctx.fresh_slot();
        out.push(Stmt::Let(o, obj));
        let keys = ctx.fresh_slot();
        out.push(Stmt::Let(
            keys,
            Expr::CallPlain(Box::new(Expr::Global(FOR_IN_KEYS.into())), vec![Expr::Var(o)]),
        ));
        let i = ctx.fresh_slot();
        out.push(Stmt::Let(i, Expr::Num(JsNum::int(0))));
        let k = ctx.fresh_slot();
        ctx.push();
        let mut body = vec![
            Stmt::Let(k, Expr::Index(Box::new(Expr::Var(keys)), Box::new(Expr::Var(i)))),
            Stmt::Set(i, Expr::Bin(Bop::Add, Box::new(Expr::Var(i)), Box::new(Expr::Num(JsNum::int(1))))),
            // `o` may be null/undefined (no keys); `in` would throw on it.
            Stmt::If(
                Expr::Opaque(
                    "&&".into(),
                    vec![
                        Expr::Opaque("!=".into(), vec![Expr::Var(o), Expr::Null]),
                        Expr::Opaque("!".into(), vec![Expr::Opaque("in".into(), vec![Expr::Var(k), Expr::Var(o)])]),
                    ],
                ),
                vec![Stmt::Continue],
                vec![],
            ),
        ];
        self.bind_for_head(&f.left, Expr::Var(k), ctx, &mut body)?;
        ctx.enter_breakable(true, None);
        body.extend(self.lower_body(&f.body, ctx)?);
        ctx.leave_breakable(true);
        ctx.pop();
        out.push(Stmt::While(
            Expr::Bin(Bop::Lt, Box::new(Expr::Var(i)), Box::new(Expr::Get(Box::new(Expr::Var(keys)), "length".into()))),
            body,
        ));
        Ok(())
    }

    /// Bind a `for..of` / `for..in` head to the current value.
    fn bind_for_head(&mut self, head: &ast::ForHead, value: Expr, ctx: &mut FnCtx, out: &mut Vec<Stmt>) -> R<()> {
        match head {
            ast::ForHead::VarDecl(v) => {
                let d = v.decls.first().ok_or("empty declaration in a loop head")?;
                let kind = if matches!(v.kind, ast::VarDeclKind::Var) { BindKind::Var } else { BindKind::Lexical };
                self.bind_pat(&d.name, value, kind, ctx, out)
            }
            ast::ForHead::Pat(p) => self.bind_pat(p, value, BindKind::Assign, ctx, out),
            ast::ForHead::UsingDecl(_) => Err("`using` declarations are not supported".into()),
        }
    }

    /// An array built from elements and spread iterables, in order:
    /// `[a, ...b, c]`.
    fn lower_spread_array(&mut self, elems: &[&ast::ExprOrSpread], ctx: &mut FnCtx) -> R<Expr> {
        let acc = ctx.fresh_slot();
        let mut stmts = vec![Stmt::Let(acc, Expr::Array(vec![]))];
        for el in elems {
            let v = self.lower_expr(&el.expr, ctx)?;
            if el.spread.is_some() {
                let it = ctx.fresh_slot();
                let r = ctx.fresh_slot();
                stmts.push(Stmt::Let(it, Expr::GetIter(Box::new(v))));
                stmts.push(Stmt::While(
                    Expr::Bool(true),
                    vec![
                        Stmt::Let(r, Expr::Call(Box::new(Expr::Get(Box::new(Expr::Var(it)), "next".into())), vec![])),
                        Stmt::If(Expr::Get(Box::new(Expr::Var(r)), "done".into()), vec![Stmt::Break], vec![]),
                        Stmt::Push(Expr::Var(acc), Expr::Get(Box::new(Expr::Var(r)), "value".into())),
                    ],
                ));
            } else {
                stmts.push(Stmt::Push(Expr::Var(acc), v));
            }
        }
        Ok(Expr::Seq(stmts, Box::new(Expr::Var(acc))))
    }

    /// An assignment used as an expression: its value is the value assigned
    /// (for a destructuring assignment, the right-hand side). The target's
    /// object and key are evaluated once, before the right-hand side.
    fn lower_assign_expr(&mut self, a: &ast::AssignExpr, ctx: &mut FnCtx) -> R<Expr> {
        if let Some(thrown) = self.tdz_assign(a, ctx)? {
            return Ok(thrown);
        }
        let mut stmts = Vec::new();
        // The target as a reader and a writer, with its base evaluated once.
        enum Target {
            Name(String),
            Prop(usize, String),
            Index(usize, usize),
            Private(usize, String),
        }
        // (An assignment to a variable nothing reads is its value.)
        if let (ast::AssignOp::Assign, ast::AssignTarget::Simple(ast::SimpleAssignTarget::Ident(b))) = (a.op, &a.left) {
            if ctx.dead.contains(&*b.id.sym) {
                return self.lower_expr(&a.right, ctx);
            }
        }
        let target = match &a.left {
            ast::AssignTarget::Simple(ast::SimpleAssignTarget::Ident(b)) => Target::Name(b.id.sym.to_string()),
            ast::AssignTarget::Simple(ast::SimpleAssignTarget::Member(m)) => {
                let o = self.lower_expr(&m.obj, ctx)?;
                let ob = ctx.fresh_slot();
                stmts.push(Stmt::Let(ob, o));
                match &m.prop {
                    ast::MemberProp::Ident(id) => Target::Prop(ob, id.sym.to_string()),
                    ast::MemberProp::Computed(c) => {
                        let k = self.lower_expr(&c.expr, ctx)?;
                        let kb = ctx.fresh_slot();
                        stmts.push(Stmt::Let(kb, k));
                        Target::Index(ob, kb)
                    }
                    ast::MemberProp::PrivateName(p) => {
                        self.private_binding(&p.name, ctx)?; // (an undeclared name is an error here)
                        Target::Private(ob, p.name.to_string())
                    }
                }
            }
            ast::AssignTarget::Pat(p) => {
                if !matches!(a.op, ast::AssignOp::Assign) {
                    return Err("invalid compound assignment to a pattern".into());
                }
                let pat: ast::Pat = match p {
                    ast::AssignTargetPat::Array(x) => ast::Pat::Array(x.clone()),
                    ast::AssignTargetPat::Object(x) => ast::Pat::Object(x.clone()),
                    ast::AssignTargetPat::Invalid(_) => return Err("invalid assignment target".into()),
                };
                let v = self.lower_expr(&a.right, ctx)?;
                let t = ctx.fresh_slot();
                stmts.push(Stmt::Let(t, v));
                self.bind_pat(&pat, Expr::Var(t), BindKind::Assign, ctx, &mut stmts)?;
                return Ok(Expr::Seq(stmts, Box::new(Expr::Var(t))));
            }
            _ => return Err("unsupported assignment target".into()),
        };
        let read = |this: &mut Self, ctx: &mut FnCtx, t: &Target| -> R<Expr> {
            Ok(match t {
                Target::Name(n) => this.lower_ident(n, ctx)?,
                Target::Prop(ob, k) => Expr::Get(Box::new(Expr::Var(*ob)), k.clone()),
                Target::Index(ob, kb) => Expr::Index(Box::new(Expr::Var(*ob)), Box::new(Expr::Var(*kb))),
                Target::Private(ob, n) => {
                    let (pre, v) = this.private_get_on(*ob, n, ctx)?;
                    Expr::Seq(pre, Box::new(v))
                }
            })
        };
        let write = |this: &mut Self, ctx: &mut FnCtx, t: &Target, v: Expr, out: &mut Vec<Stmt>| match t {
            Target::Name(n) => this.assign_name(n, v, ctx, out),
            Target::Prop(ob, k) => out.push(Stmt::SetProp(Expr::Var(*ob), k.clone(), v)),
            Target::Index(ob, kb) => out.push(Stmt::SetIndex(Expr::Var(*ob), Expr::Var(*kb), v)),
            Target::Private(ob, n) => {
                let vs = ctx.fresh_slot();
                out.push(Stmt::Let(vs, v));
                out.extend(this.private_set_on(*ob, n, vs, ctx).expect("the private name was checked when the target was made"));
            }
        };
        let t = ctx.fresh_slot();
        let logical = match a.op {
            ast::AssignOp::AndAssign => Some("&&"),
            ast::AssignOp::OrAssign => Some("||"),
            ast::AssignOp::NullishAssign => Some("??"),
            _ => None,
        };
        if let Some(op) = logical {
            // `x op= e`: assign only when `x` does not decide the result.
            let cur = read(self, ctx, &target)?;
            stmts.push(Stmt::Let(t, cur));
            let cond = match op {
                "&&" => Expr::Var(t),
                "||" => Expr::Opaque("!".into(), vec![Expr::Var(t)]),
                _ => Expr::Opaque("==".into(), vec![Expr::Var(t), Expr::Null]),
            };
            let mut arm = Vec::new();
            let v = match &target {
                Target::Name(n) => self.lower_named(&a.right, &n.clone(), ctx)?,
                _ => self.lower_expr(&a.right, ctx)?,
            };
            arm.push(Stmt::Set(t, v));
            write(self, ctx, &target, Expr::Var(t), &mut arm);
            stmts.push(Stmt::If(cond, arm, vec![]));
            return Ok(Expr::Seq(stmts, Box::new(Expr::Var(t))));
        }
        let combine: Option<Combine> = match a.op {
            ast::AssignOp::Assign => None,
            ast::AssignOp::AddAssign => Some(Combine::Bin(Bop::Add)),
            ast::AssignOp::SubAssign => Some(Combine::Bin(Bop::Sub)),
            ast::AssignOp::MulAssign => Some(Combine::Bin(Bop::Mul)),
            ast::AssignOp::DivAssign => Some(Combine::Opaque("/")),
            ast::AssignOp::ModAssign => Some(Combine::Opaque("%")),
            ast::AssignOp::ExpAssign => Some(Combine::Opaque("**")),
            ast::AssignOp::BitAndAssign => Some(Combine::Bin(Bop::BitAnd)),
            ast::AssignOp::BitOrAssign => Some(Combine::Bin(Bop::BitOr)),
            ast::AssignOp::BitXorAssign => Some(Combine::Bin(Bop::BitXor)),
            ast::AssignOp::LShiftAssign => Some(Combine::Bin(Bop::Shl)),
            ast::AssignOp::RShiftAssign => Some(Combine::Bin(Bop::Shr)),
            ast::AssignOp::ZeroFillRShiftAssign => Some(Combine::Bin(Bop::UShr)),
            _ => unreachable!("logical assignment handled above"),
        };
        // (A compound assignment reads the target before the right side.)
        let cur = if combine.is_some() { Some(read(self, ctx, &target)?) } else { None };
        let rhs = match (&target, &combine) {
            (Target::Name(n), None) => self.lower_named(&a.right, &n.clone(), ctx)?,
            _ => self.lower_expr(&a.right, ctx)?,
        };
        let v = combine_assign(&combine, rhs, || cur.unwrap());
        stmts.push(Stmt::Let(t, v));
        write(self, ctx, &target, Expr::Var(t), &mut stmts);
        Ok(Expr::Seq(stmts, Box::new(Expr::Var(t))))
    }

    /// `return e`: inside a `try ... finally` region, record the completion
    /// and leave the region (the `finally` code runs, then the return);
    /// otherwise close the iterators of enclosing `for..of` loops and return.
    fn lower_return(&mut self, e: Expr, ctx: &mut FnCtx, out: &mut Vec<Stmt>) {
        if let Some(region) = ctx.finally_stack.last() {
            let (kind, val, block_index, iter_depth) = (region.kind, region.val, region.block_index, region.iter_depth);
            out.push(Stmt::Set(val, e));
            let iters: Vec<(usize, bool)> = ctx.iter_stack[iter_depth..].iter().rev().flatten().copied().collect();
            for (it, asy) in iters {
                out.extend(close_iter(it, asy, ctx));
            }
            out.push(Stmt::Set(kind, Expr::Num(JsNum::int(1))));
            out.push(Stmt::BreakOuter(ctx.break_depth - 1 - block_index));
            return;
        }
        let iters: Vec<(usize, bool)> = ctx.iter_stack.iter().rev().flatten().copied().collect();
        if iters.is_empty() {
            out.push(Stmt::Return(e));
        } else {
            let t = ctx.fresh_slot();
            out.push(Stmt::Let(t, e));
            for (it, asy) in iters {
                out.extend(close_iter(it, asy, ctx));
            }
            out.push(Stmt::Return(Expr::Var(t)));
        }
    }

    /// Does this `break`/`continue` jump out of the innermost native `finally`
    /// region?
    fn leaves_native_region(&self, st: &ast::Stmt, ctx: &FnCtx) -> R<bool> {
        let Some(&(depth, loops)) = ctx.native_regions.last() else { return Ok(false) };
        let label_target = |l: &ast::Ident| -> R<usize> {
            let name = l.sym.to_string();
            let &(_, t, _) = ctx.labels.iter().rev().find(|(n, _, _)| *n == name).ok_or(format!("undefined label `{name}`"))?;
            Ok(t)
        };
        Ok(match st {
            ast::Stmt::Break(ast::BreakStmt { label: Some(l), .. }) | ast::Stmt::Continue(ast::ContinueStmt { label: Some(l), .. }) => {
                label_target(l)? < depth
            }
            ast::Stmt::Break(_) => ctx.break_depth <= depth,
            ast::Stmt::Continue(_) => ctx.loop_depth <= loops,
            _ => false,
        })
    }

    /// Does this `break`/`continue` jump out of the innermost `finally` region?
    fn leaves_finally_region(&self, st: &ast::Stmt, ctx: &FnCtx) -> R<bool> {
        let Some(region) = ctx.finally_stack.last() else { return Ok(false) };
        let target_of = |label: &Option<ast::Ident>, want_loop: bool| -> R<usize> {
            match label {
                Some(l) => {
                    let name = l.sym.to_string();
                    let &(_, t, _) = ctx.labels.iter().rev().find(|(n, _, _)| *n == name).ok_or(format!("undefined label `{name}`"))?;
                    Ok(t)
                }
                // The innermost loop (or, for `break`, loop/switch) inside the
                // function; a region's own block is never a target.
                None => {
                    if want_loop {
                        Ok(if ctx.loop_depth > region.loop_depth { usize::MAX } else { 0 })
                    } else {
                        Ok(ctx.break_depth - 1)
                    }
                }
            }
        };
        Ok(match st {
            ast::Stmt::Break(b) => target_of(&b.label, false)? <= region.block_index,
            ast::Stmt::Continue(c) => match &c.label {
                None => ctx.loop_depth <= region.loop_depth,
                Some(_) => target_of(&c.label, true)? <= region.block_index,
            },
            _ => false,
        })
    }

    /// `this` in the current function (the captured lexical `this` if any).
    fn lower_this(&self, ctx: &FnCtx) -> Expr {
        match ctx.resolve(scope::LEXICAL_THIS) {
            Some(slot) => Expr::Var(slot),
            // (A script's top-level `this` is the global object.)
            None if ctx.script_top => Expr::Global("globalThis".into()),
            None => Expr::This,
        }
    }

    /// Run the class's instance field initializers on `this`.
    fn init_call(&self, ctx: &FnCtx) -> R<Stmt> {
        let init = ctx.resolve("%init").ok_or("internal: class field initializer not captured")?;
        Ok(Stmt::ExprStmt(Expr::Call(
            Box::new(Expr::Get(Box::new(Expr::Var(init)), "call".to_string())),
            vec![Expr::This],
        )))
    }

    /// `super(args)` in a derived constructor: construct with the parent,
    /// bind `this` (and the captured lexical `this`), then run the field
    /// initializers. The statements; the value of the call is `this`.
    fn lower_super_call(&mut self, ctx: &mut FnCtx, args: SuperArgs) -> R<Vec<Stmt>> {
        match ctx.ctor {
            Some(CtorInfo { derived: true, .. }) => {}
            _ => return Err("`super(...)` outside a derived class constructor".into()),
        }
        let parent = ctx.resolve("%super").ok_or("internal: superclass not captured")?;
        let call = match args {
            SuperArgs::List(a) => Expr::SuperCall(Box::new(Expr::Var(parent)), a),
            SuperArgs::Spread(arr) => Expr::SuperCallSpread(Box::new(Expr::Var(parent)), Box::new(arr)),
        };
        let mut out = vec![Stmt::ExprStmt(call)];
        if let Some(slot) = ctx.resolve(scope::LEXICAL_THIS) {
            out.push(Stmt::Set(slot, Expr::This));
        }
        if ctx.ctor.is_some_and(|c| c.has_init) {
            out.push(self.init_call(ctx)?);
        }
        Ok(out)
    }

    /// A property key: static (identifier, string, number) or computed.
    fn lower_prop_key(&mut self, k: &ast::PropName, ctx: &mut FnCtx) -> R<PropKey> {
        Ok(self.lower_prop_key_named(k, ctx)?.0)
    }

    /// A property key, and for a computed one known only at runtime the slot
    /// holding it, converted once (ToPropertyKey), for SetFunctionName. (A
    /// computed literal key is a static key.)
    fn lower_prop_key_named(&mut self, k: &ast::PropName, ctx: &mut FnCtx) -> R<(PropKey, Option<usize>)> {
        Ok(match k {
            ast::PropName::Computed(c) => match self.lower_expr(&c.expr, ctx)? {
                Expr::Str(st) => (PropKey::Static(st), None),
                Expr::Num(n) => (PropKey::Static(n.to_js_string()), None),
                e => {
                    let slot = ctx.fresh_slot();
                    let is_symbol = Expr::Bin(Bop::Eq, Box::new(Expr::Opaque("typeof".into(), vec![Expr::Var(slot)])), Box::new(Expr::Str("symbol".into())));
                    let to_string = Expr::Call(Box::new(Expr::Global("String".into())), vec![Expr::Var(slot)]);
                    let stmts = vec![Stmt::Let(slot, e), Stmt::If(is_symbol, vec![], vec![Stmt::Set(slot, to_string)])];
                    (PropKey::Computed(Expr::Seq(stmts, Box::new(Expr::Var(slot)))), Some(slot))
                }
            },
            ast::PropName::Num(n) => (PropKey::Static(JsNum(n.value).to_js_string()), None),
            other => (PropKey::Static(prop_name(other)?), None),
        })
    }

    /// SetFunctionName(f, key, prefix) for the property key in slot `key`:
    /// the function `f` with its `name` defined (`[description]` for a
    /// symbol). The value is the function.
    fn named_after_key(&mut self, f: Expr, key: usize, prefix: &str, ctx: &mut FnCtx) -> Expr {
        let fs = ctx.fresh_slot();
        let desc = || Expr::Get(Box::new(Expr::Var(key)), "description".into());
        let is_symbol = Expr::Bin(Bop::Eq, Box::new(Expr::Opaque("typeof".into(), vec![Expr::Var(key)])), Box::new(Expr::Str("symbol".into())));
        let symbol_name = Expr::Opaque(
            "?:".into(),
            vec![
                Expr::Bin(Bop::Eq, Box::new(desc()), Box::new(Expr::Undefined)),
                Expr::Str(prefix.into()),
                Expr::Bin(
                    Bop::Add,
                    Box::new(Expr::Str(format!("{prefix}["))),
                    Box::new(Expr::Bin(Bop::Add, Box::new(desc()), Box::new(Expr::Str("]".into())))),
                ),
            ],
        );
        let name = Expr::Opaque(
            "?:".into(),
            vec![is_symbol, symbol_name, Expr::Bin(Bop::Add, Box::new(Expr::Str(prefix.into())), Box::new(Expr::Var(key)))],
        );
        Expr::Seq(
            vec![
                Stmt::Let(fs, f),
                Stmt::ExprStmt(Expr::DefineProps(
                    Box::new(Expr::Var(fs)),
                    vec![PropDef::Data { key: PropKey::Static("name".into()), value: name, attrs: CONFIGURABLE_ATTR }],
                )),
            ],
            Box::new(Expr::Var(fs)),
        )
    }

    /// Lower a class to an expression whose value is its constructor:
    /// create the constructor (capturing the superclass and the field
    /// initializer), link prototypes for `extends`, define methods and
    /// accessors (non-enumerable) on the prototype or the constructor, then
    /// static fields. Inside the class, its name is a binding to the
    /// constructor; methods find `super` through their home object.
    fn lower_class(&mut self, class: &ast::Class, name: Option<&str>, ctx: &mut FnCtx) -> R<Expr> {
        let react_root = name.is_some_and(|n| self.react_roots.as_ref().is_some_and(|r| r.contains(n)));
        // A class modeled for React's sake (see `react_root_names`) extends
        // React's `Component`: modeled when the specializer knows its parent
        // is that (`__pe_react_extends_component`, decided as it runs), else
        // made at runtime from its source, as any other class. (Its heritage
        // evaluated once, for either.)
        if react_root {
            if let Some(sc) = &class.super_class {
                let h = ctx.fresh_slot();
                let heritage = self.lower_expr(sc, ctx)?;
                if let Some(runtime) = self.class_at_runtime(class, name, ctx, Some(Expr::Var(h)))? {
                    let modeled = self.lower_class_with(class, name, ctx, true, Some(Expr::Var(h)))?;
                    let guard = *self.name_to_fid.get(REACT_EXTENDS_COMPONENT).expect("--react adds the model of React");
                    let r = ctx.fresh_slot();
                    let test = Expr::Call(Box::new(Expr::Func(guard)), vec![Expr::Var(h)]);
                    let stmts = vec![Stmt::Let(h, heritage), Stmt::If(test, vec![Stmt::Let(r, modeled)], vec![Stmt::Let(r, runtime)])];
                    return Ok(Expr::Seq(stmts, Box::new(Expr::Var(r))));
                }
                return self.lower_class_with(class, name, ctx, true, Some(Expr::Seq(vec![Stmt::Let(h, heritage)], Box::new(Expr::Var(h)))));
            }
        }
        self.lower_class_with(class, name, ctx, react_root, None)
    }

    /// `lower_class`: a class, modeled however it is made (private
    /// members, computed keys, static fields and blocks included), and
    /// with `modeled` one the residual may make from its source
    /// (`class_source`) as a class made at runtime would be (see
    /// `class_at_runtime`). `heritage`: its parent's expression, when
    /// evaluated before (else its own).
    fn lower_class_with(&mut self, class: &ast::Class, name: Option<&str>, ctx: &mut FnCtx, modeled: bool, heritage: Option<Expr>) -> R<Expr> {
        // (Decided in the enclosing scope, before the class's own.)
        let source = self.class_source(class, name, ctx, modeled);
        let hint = ctx.name_hint.clone().unwrap_or_default();
        let mut stmts = Vec::new();
        ctx.push();
        let derived = class.super_class.is_some();
        if let Some(sc) = &class.super_class {
            let e = match heritage {
                Some(h) => h,
                None => self.lower_expr(sc, ctx)?,
            };
            let slot = ctx.declare_boxed("%super", false);
            stmts.push(Stmt::Let(slot, e));
        }
        // The private names this class declares (its heritage was evaluated
        // outside them): a binding each (see `PrivInfo`), and the brands of
        // the objects that have its instance / static private methods.
        let saved_privates = ctx.privates.clone();
        let class_index = self.class_names.len();
        self.class_names.push(name.map(str::to_string).or_else(|| ctx.name_hint.clone()).unwrap_or_else(|| "anonymous".into()));
        let mut declared: Vec<(String, PrivKind, bool)> = Vec::new();
        let (mut instance_brand, mut static_brand) = (false, false);
        for m in &class.body {
            let (n, kind, is_static) = match m {
                ast::ClassMember::PrivateProp(p) => (format!("#{}", p.key.name), PrivKind::Field, p.is_static),
                ast::ClassMember::PrivateMethod(pm) => {
                    let kind = match pm.kind {
                        ast::MethodKind::Method => PrivKind::Method,
                        ast::MethodKind::Getter => PrivKind::Accessor { get: true, set: false },
                        ast::MethodKind::Setter => PrivKind::Accessor { get: false, set: true },
                    };
                    (format!("#{}", pm.key.name), kind, pm.is_static)
                }
                _ => continue,
            };
            if kind != PrivKind::Field {
                if is_static { static_brand = true } else { instance_brand = true }
            }
            match declared.iter_mut().find(|(d, _, _)| *d == n) {
                // A getter and a setter of one name are one accessor.
                Some((_, PrivKind::Accessor { get, set }, _)) if matches!(kind, PrivKind::Accessor { .. }) => {
                    let PrivKind::Accessor { get: g, set: st } = kind else { unreachable!() };
                    *get |= g;
                    *set |= st;
                }
                Some(_) => return Err(format!("duplicate private name {n}")),
                None => declared.push((n, kind, is_static)),
            }
        }
        for (n, kind, is_static) in &declared {
            ctx.privates.insert(n.clone(), PrivInfo { kind: *kind, is_static: *is_static, class: class_index });
            if *kind == PrivKind::Field {
                let slot = ctx.declare_boxed(n, false);
                stmts.push(Stmt::Let(slot, Expr::Call(Box::new(Expr::Global(PRIVATE_MAP_HELPER.into())), vec![])));
            } else {
                // (Set once the methods exist, which may refer to each other.)
                let slot = ctx.declare_boxed(n, true);
                stmts.push(Stmt::Let(slot, Expr::Object(vec![("value".into(), Expr::Undefined)])));
            }
        }
        for (brand, used) in [("%ibrand", instance_brand), ("%sbrand", static_brand)] {
            if used {
                let slot = ctx.declare_boxed(brand, false);
                stmts.push(Stmt::Let(slot, Expr::Call(Box::new(Expr::Global(PRIVATE_SET_HELPER.into())), vec![])));
            }
        }
        // Fields, in order. A computed key is evaluated once, with the
        // methods' keys in member order, into a cell the initializer reads.
        let mut instance_fields: Vec<FieldInit> = Vec::new();
        let mut static_elems: Vec<StaticElem> = Vec::new();
        let mut computed_keys: HashMap<*const ast::ClassProp, String> = HashMap::new();
        let mut ctor: Option<&ast::Constructor> = None;
        for m in &class.body {
            match m {
                ast::ClassMember::Constructor(c) => ctor = Some(c),
                ast::ClassMember::ClassProp(p) => {
                    let key = match &p.key {
                        ast::PropName::Computed(_) => {
                            let cell = format!("%fieldkey{}", computed_keys.len());
                            let slot = ctx.declare_boxed(&cell, true);
                            stmts.push(Stmt::Let(slot, Expr::Object(vec![("value".into(), Expr::Undefined)])));
                            computed_keys.insert(p as *const _, cell.clone());
                            FieldKey::Computed(cell)
                        }
                        k => FieldKey::Name(k),
                    };
                    let init = FieldInit { key, value: p.value.as_deref() };
                    if p.is_static { static_elems.push(StaticElem::Field(init)) } else { instance_fields.push(init) }
                }
                ast::ClassMember::PrivateProp(p) => {
                    let init = FieldInit { key: FieldKey::Private(format!("#{}", p.key.name)), value: p.value.as_deref() };
                    if p.is_static { static_elems.push(StaticElem::Field(init)) } else { instance_fields.push(init) }
                }
                ast::ClassMember::StaticBlock(b) => static_elems.push(StaticElem::Block(&b.body.stmts)),
                ast::ClassMember::Method(_) | ast::ClassMember::PrivateMethod(_) | ast::ClassMember::Empty(_) => {}
                _ => return Err("unsupported class member".into()),
            }
        }
        let has_init = !instance_fields.is_empty() || instance_brand;
        // The class name inside the class body is a binding of its own, set
        // once the class exists. The field initializer and the constructor
        // are made before that, so they see it through a cell, filled then.
        let names_self = |n: &str| {
            ctor.is_some_and(|c| mentions_ident(c, n)) || instance_fields.iter().any(|f| f.value.is_some_and(|v| mentions_ident(v, n)))
        };
        let self_cell = name.filter(|n| names_self(n)).map(|n| {
            let cell = ctx.declare_boxed("%self", true);
            stmts.push(Stmt::Let(cell, Expr::Object(vec![("value".into(), Expr::Undefined)])));
            ctx.scopes.last_mut().unwrap().insert(n.to_string(), Binding { slot: cell, boxed: true, mapped: None });
            cell
        });
        if has_init {
            // (The initializer refers to these although its values may not.)
            let mut extra: Vec<String> = instance_fields
                .iter()
                .filter_map(|f| match &f.key {
                    FieldKey::Computed(c) => Some(c.clone()),
                    FieldKey::Private(n) => Some(n.clone()),
                    FieldKey::Name(_) => None,
                })
                .collect();
            if instance_brand {
                extra.push("%ibrand".into());
            }
            let mut opts = LiftOpts::new(FnKind::Method).strict(true);
            opts.extra_free = extra;
            let (fid, caps) = self.lift_arrow(&[], ArrowBody::Fields(instance_fields, instance_brand.then_some(class_index)), ctx, opts)?;
            let caps = self.capture_exprs(&caps, ctx)?;
            let slot = ctx.declare_boxed("%init", false);
            stmts.push(Stmt::Let(slot, Expr::Closure(fid, caps)));
        }
        // The constructor.
        let info = CtorInfo { derived, has_init, default_derived: derived && ctor.is_none() };
        let class_name = name.map(str::to_string).or_else(|| ctx.name_hint.take()).unwrap_or_default();
        let mut opts = LiftOpts::new(FnKind::ClassCtor { derived }).strict(true).named(class_name);
        opts.ctor = Some(info);
        if has_init {
            opts.extra_free.push("%init".into());
        }
        if derived {
            opts.extra_free.push("%super".into());
        }
        // (The variables its source names, which the residual passes it from
        // the constructor's captures: see `FuncDef::class_source`.)
        if let Some(src) = &source {
            opts.extra_free.extend(src.vars.iter().map(|(n, _)| n.clone()));
        }
        let class_slot = ctx.declare_boxed("%class", false);
        let (params, body): (Vec<ast::Pat>, Vec<ast::Stmt>) = match ctor {
            Some(c) => {
                let mut ps = Vec::new();
                for p in &c.params {
                    match p {
                        ast::ParamOrTsParamProp::Param(p) => ps.push(p.pat.clone()),
                        ast::ParamOrTsParamProp::TsParamProp(_) => return Err("TypeScript parameter properties".into()),
                    }
                }
                (ps, c.body.as_ref().map(|b| b.stmts.clone()).unwrap_or_default())
            }
            None => (vec![], vec![]),
        };
        // The home object `super.m` reads from in the constructor is the
        // class's prototype, read only after the constructor is made: a cell
        // the constructor captures, filled once the prototype is known
        // (below). (Only for a constructor that reads a `super` property.)
        let home_cell = if super_prop_in(&body) {
            let cell = ctx.declare_boxed("%ctorhome", true);
            stmts.push(Stmt::Let(cell, Expr::Object(vec![("value".into(), Expr::Undefined)])));
            Some(cell)
        } else {
            None
        };
        ctx.push();
        if let Some(cell) = home_cell {
            ctx.scopes.last_mut().unwrap().insert("%home".into(), Binding { slot: cell, boxed: true, mapped: None });
        }
        let (fid, caps) = self.lift_arrow(&params, ArrowBody::BlockOwned(body), ctx, opts)?;
        let source_caps: Option<Vec<usize>> = source.as_ref().map(|src| {
            src.vars.iter().map(|(n, _)| caps.iter().position(|(c, _)| c == n).expect("the constructor captures what its class's source names")).collect()
        });
        let caps = self.capture_exprs(&caps, ctx)?;
        ctx.pop();
        stmts.push(Stmt::Let(class_slot, Expr::Closure(fid, caps)));
        let ctor_fid = fid;
        // (A class's source text is the whole class's.)
        if let Some(i) = ctor_fid.checked_sub(self.decls.len()) {
            self.lifted[i].source_text = span_text(class.span);
        }
        // (The rest of the class body refers to the class itself.)
        if let Some(cell) = self_cell {
            stmts.push(Binding { slot: cell, boxed: true, mapped: None }.write(Expr::Var(class_slot)));
        }
        if let Some(n) = name {
            ctx.scopes.last_mut().unwrap().insert(n.to_string(), Binding { slot: class_slot, boxed: false, mapped: None });
        }
        if derived {
            // ClassDefinitionEvaluation: `extends null` gives the prototype
            // no parent (the constructor keeps `Function.prototype`); else
            // the superclass must be a constructor whose `prototype` is an
            // object or null: C.__proto__ = Super, C.prototype.__proto__ =
            // Super.prototype.
            let sup = ctx.resolve("%super").unwrap();
            let parent = ctx.fresh_slot();
            let type_error = |msg: &str| {
                Stmt::Throw(Expr::New(Box::new(Expr::Global("TypeError".into())), vec![Expr::Str(msg.into())]))
            };
            let typeof_is = |e: Expr, t: &str| {
                Expr::Bin(Bop::Eq, Box::new(Expr::Opaque("typeof".into(), vec![e])), Box::new(Expr::Str(t.into())))
            };
            let not = |e: Expr| Expr::Opaque("!".into(), vec![e]);
            stmts.push(Stmt::Let(parent, Expr::Null));
            stmts.push(Stmt::If(
                Expr::Bin(Bop::Eq, Box::new(Expr::Var(sup)), Box::new(Expr::Null)),
                vec![],
                vec![
                    Stmt::If(not(typeof_is(Expr::Var(sup), "function")), vec![type_error("Class extends value is not a constructor or null")], vec![]),
                    Stmt::Set(parent, Expr::Get(Box::new(Expr::Var(sup)), "prototype".into())),
                    Stmt::If(
                        not(Expr::Opaque(
                            "||".into(),
                            vec![
                                Expr::Bin(Bop::Eq, Box::new(Expr::Var(parent)), Box::new(Expr::Null)),
                                Expr::Opaque("||".into(), vec![typeof_is(Expr::Var(parent), "object"), typeof_is(Expr::Var(parent), "function")]),
                            ],
                        )),
                        vec![type_error("Class extends value does not have valid prototype property")],
                        vec![],
                    ),
                    Stmt::ExprStmt(Expr::DefineProps(Box::new(Expr::Var(class_slot)), vec![PropDef::Proto(Expr::Var(sup))])),
                ],
            ));
            stmts.push(Stmt::ExprStmt(Expr::DefineProps(
                Box::new(Expr::Get(Box::new(Expr::Var(class_slot)), "prototype".into())),
                vec![PropDef::Proto(Expr::Var(parent))],
            )));
        }
        let proto_slot = ctx.declare_boxed("%proto", false);
        stmts.push(Stmt::Let(proto_slot, Expr::Get(Box::new(Expr::Var(class_slot)), "prototype".into())));
        if let Some(cell) = home_cell {
            stmts.push(Stmt::SetProp(Expr::Var(cell), "value".into(), Expr::Var(proto_slot)));
        }
        // Methods and accessors: non-enumerable. (Private ones fill their
        // name's cell; a computed field key is evaluated here, in order.)
        let mut private_accessors: Vec<(String, bool, Option<Expr>, Option<Expr>)> = Vec::new();
        for m in &class.body {
            match m {
                ast::ClassMember::PrivateMethod(pm) => {
                    let n = format!("#{}", pm.key.name);
                    let home = if pm.is_static { class_slot } else { proto_slot };
                    ctx.push();
                    ctx.scopes.last_mut().unwrap().insert("%home".into(), Binding { slot: home, boxed: false, mapped: None });
                    let params: Vec<ast::Pat> = pm.function.params.iter().map(|p| p.pat.clone()).collect();
                    let body = pm.function.body.as_ref().map(|b| b.stmts.clone()).unwrap_or_default();
                    let fname = match pm.kind {
                        ast::MethodKind::Method => n.clone(),
                        ast::MethodKind::Getter => format!("get {n}"),
                        ast::MethodKind::Setter => format!("set {n}"),
                    };
                    let mkind = if pm.function.is_generator { FnKind::Generator } else { FnKind::Method };
                    let (fid, caps) = self.lift_arrow(
                        &params,
                        ArrowBody::BlockOwned(body),
                        ctx,
                        LiftOpts::new(mkind).strict(true).named(fname).asynchronous(pm.function.is_async),
                    )?;
                    let func = Expr::Closure(fid, self.capture_exprs(&caps, ctx)?);
                    ctx.pop();
                    match pm.kind {
                        ast::MethodKind::Method => {
                            let brand = ctx.resolve(if pm.is_static { "%sbrand" } else { "%ibrand" }).expect("brand declared");
                            let cell = ctx.resolve(&n).expect("private name declared");
                            let rec = Expr::Object(vec![("b".into(), Expr::Var(brand)), ("f".into(), func)]);
                            stmts.push(Stmt::SetProp(Expr::Var(cell), "value".into(), rec));
                        }
                        kind => {
                            let entry = match private_accessors.iter_mut().find(|a| a.0 == n) {
                                Some(e) => e,
                                None => {
                                    private_accessors.push((n.clone(), pm.is_static, None, None));
                                    private_accessors.last_mut().unwrap()
                                }
                            };
                            if kind == ast::MethodKind::Getter { entry.2 = Some(func) } else { entry.3 = Some(func) }
                        }
                    }
                }
                ast::ClassMember::ClassProp(p) if computed_keys.contains_key(&(p as *const _)) => {
                    // ToPropertyKey, once.
                    let ast::PropName::Computed(c) = &p.key else { unreachable!() };
                    let k = self.lower_expr(&c.expr, ctx)?;
                    let t = ctx.fresh_slot();
                    stmts.push(Stmt::Let(t, k));
                    let is_symbol = Expr::Bin(Bop::Eq, Box::new(Expr::Opaque("typeof".into(), vec![Expr::Var(t)])), Box::new(Expr::Str("symbol".into())));
                    let as_string = Expr::Call(Box::new(Expr::Global("String".into())), vec![Expr::Var(t)]);
                    stmts.push(Stmt::If(is_symbol, vec![], vec![Stmt::Set(t, as_string)]));
                    let cell = ctx.resolve(&computed_keys[&(p as *const _)]).expect("computed key cell declared");
                    stmts.push(Stmt::SetProp(Expr::Var(cell), "value".into(), Expr::Var(t)));
                }
                ast::ClassMember::Method(m) => {
                    let home = if m.is_static { class_slot } else { proto_slot };
                    ctx.push();
                    ctx.scopes.last_mut().unwrap().insert("%home".into(), Binding { slot: home, boxed: false, mapped: None });
                    let (key, key_slot) = self.lower_prop_key_named(&m.key, ctx)?;
                    let params: Vec<ast::Pat> = m.function.params.iter().map(|p| p.pat.clone()).collect();
                    let body = m.function.body.as_ref().map(|b| b.stmts.clone()).unwrap_or_default();
                    let fname = method_name(&key, match m.kind {
                        ast::MethodKind::Method => "",
                        ast::MethodKind::Getter => "get ",
                        ast::MethodKind::Setter => "set ",
                    });
                    let mkind = if m.function.is_generator { FnKind::Generator } else { FnKind::Method };
                    let (fid, caps) =
                        self.lift_arrow(&params, ArrowBody::BlockOwned(body), ctx, LiftOpts::new(mkind).strict(true).named(fname).asynchronous(m.function.is_async))?;
                    let mut func = Expr::Closure(fid, self.capture_exprs(&caps, ctx)?);
                    if let Some(sl) = key_slot {
                        let prefix = match m.kind {
                            ast::MethodKind::Method => "",
                            ast::MethodKind::Getter => "get ",
                            ast::MethodKind::Setter => "set ",
                        };
                        func = self.named_after_key(func, sl, prefix, ctx);
                    }
                    ctx.pop();
                    let def = match m.kind {
                        ast::MethodKind::Method => PropDef::Data { key, value: func, attrs: WRITABLE_ATTRS | CONFIGURABLE_ATTR },
                        ast::MethodKind::Getter => PropDef::Accessor { key, getter: true, func, attrs: CONFIGURABLE_ATTR },
                        ast::MethodKind::Setter => PropDef::Accessor { key, getter: false, func, attrs: CONFIGURABLE_ATTR },
                    };
                    // (What the class's prototype is given, for the
                    // specializer: see `FuncDef::proto_methods`.)
                    if let (false, ast::MethodKind::Method, PropDef::Data { key: PropKey::Static(n), .. }) = (m.is_static, m.kind, &def) {
                        let i = ctor_fid - self.decls.len();
                        self.lifted[i].proto_methods.push((n.clone(), fid));
                    }
                    stmts.push(Stmt::ExprStmt(Expr::DefineProps(Box::new(Expr::Var(home)), vec![def])));
                }
                _ => {}
            }
        }
        for (n, is_static, get, set) in private_accessors {
            let brand = ctx.resolve(if is_static { "%sbrand" } else { "%ibrand" }).expect("brand declared");
            let cell = ctx.resolve(&n).expect("private name declared");
            let rec = Expr::Object(vec![
                ("b".into(), Expr::Var(brand)),
                ("g".into(), get.unwrap_or(Expr::Undefined)),
                ("s".into(), set.unwrap_or(Expr::Undefined)),
            ]);
            stmts.push(Stmt::SetProp(Expr::Var(cell), "value".into(), rec));
        }
        // The static private methods' brand, then the static fields and
        // blocks in order, with `this` the class.
        if static_brand {
            let b = ctx.resolve("%sbrand").expect("brand declared");
            stmts.push(Stmt::ExprStmt(Self::coll_call(Expr::Var(b), "add", vec![Expr::Var(class_slot)])));
        }
        for el in static_elems {
            match el {
                StaticElem::Field(f) => {
                    ctx.push();
                    ctx.scopes.last_mut().unwrap().insert(scope::LEXICAL_THIS.into(), Binding { slot: class_slot, boxed: false, mapped: None });
                    let out = self.define_field(Expr::Var(class_slot), &f, ctx);
                    ctx.pop();
                    stmts.extend(out?);
                }
                StaticElem::Block(body) => {
                    ctx.push();
                    ctx.scopes.last_mut().unwrap().insert("%home".into(), Binding { slot: class_slot, boxed: false, mapped: None });
                    let lifted = self.lift_arrow(&[], ArrowBody::BlockOwned(body.to_vec()), ctx, LiftOpts::new(FnKind::Method).strict(true));
                    let (fid, caps) = match lifted {
                        Ok(x) => x,
                        Err(e) => {
                            ctx.pop();
                            return Err(e);
                        }
                    };
                    let block = Expr::Closure(fid, self.capture_exprs(&caps, ctx)?);
                    ctx.pop();
                    stmts.push(Stmt::ExprStmt(Expr::Call(Box::new(Expr::Get(Box::new(block), "call".into())), vec![Expr::Var(class_slot)])));
                }
            }
        }
        ctx.privates = saved_privates;
        ctx.pop();
        // (How the class's own code uses its instances' `this`: see
        // `FuncDef::instance_uses`.)
        {
            let i = ctor_fid - self.decls.len();
            self.lifted[i].instance_uses = instance_uses_of(class);
        }
        // A class the residual may make from its source: remembered as its
        // definition leaves it (see `Instr::MarkClass`).
        if let (Some(ClassSource { globals, vars, users }), Some(source_caps)) = (source, source_caps) {
            let mut c = class.clone();
            // (Its variables in cells are read as `x.value`: rewritten where
            // it is made, for those passed as cells, see `RExpr::ClassSrc`.)
            let cells: BTreeSet<String> = vars.iter().filter(|(_, cell)| *cell).map(|(n, _)| n.clone()).collect();
            if !crate::source_mode::class_with_cells(&mut c.clone(), &cells) {
                return Ok(Expr::Seq(stmts, Box::new(Expr::Var(class_slot))));
            }
            if c.super_class.is_some() {
                c.super_class = Some(Box::new(ast::Expr::Ident(ast::Ident::new_no_ctxt(
                    crate::source_mode::PARENT_PLACEHOLDER.into(),
                    Default::default(),
                ))));
            }
            let name = name.map(|n| ast::Ident::new_no_ctxt(n.into(), Default::default()));
            let i = ctor_fid - self.decls.len();
            self.lifted_sources[i] = Some(FnSource { node: FnNode::Class { class: c, name, hint }, captures: vars, globals, strict: true, rerun: false });
            self.lifted[i].class_source = Some(partial::js::ClassSourceCaps { caps: source_caps, users });
            return Ok(Expr::Seq(stmts, Box::new(Expr::MarkClass(Box::new(Expr::Var(class_slot))))));
        }
        Ok(Expr::Seq(stmts, Box::new(Expr::Var(class_slot))))
    }

    /// A React root's class whose parent is not known to be React's
    /// `Component` (see `lower_class`), when the residual cannot make it
    /// from its source later (see `class_source`: it has computed keys,
    /// private members, static fields or blocks): made from its source
    /// here, at runtime, where the original makes it, so its heritage,
    /// computed keys and static initializers run as the original's do. Its heritage and the
    /// variables of enclosing functions it names (ones no code assigns, so
    /// their values now are theirs from now on) are passed in:
    /// `(function (parent, x) { return class extends parent { ... }; })(P, x)`.
    /// `None` when it has decorators, names `arguments` or an assigned
    /// variable of an enclosing function, uses `this`, `super`,
    /// `arguments` or `new.target` in a computed key, or cannot be
    /// printed as is. `heritage_value`: its parent, when evaluated before.
    fn class_at_runtime(&mut self, class: &ast::Class, name: Option<&str>, ctx: &mut FnCtx, heritage_value: Option<Expr>) -> R<Option<Expr>> {
        if std::env::var_os("PE_NO_RUNTIME_CLASS").is_some() || !class.decorators.is_empty() {
            return Ok(None);
        }
        let Some(assigned) = ctx.assigned.clone() else { return Ok(None) };
        let mut keys: Vec<&ast::Expr> = Vec::new();
        let mut runs_code = class.super_class.is_some();
        for m in &class.body {
            let decorated = match m {
                ast::ClassMember::Method(m) => {
                    if let ast::PropName::Computed(c) = &m.key {
                        keys.push(&c.expr);
                    }
                    !m.function.decorators.is_empty()
                }
                ast::ClassMember::PrivateMethod(m) => !m.function.decorators.is_empty(),
                ast::ClassMember::ClassProp(p) => {
                    if let ast::PropName::Computed(c) = &p.key {
                        keys.push(&c.expr);
                    }
                    runs_code |= p.is_static;
                    !p.decorators.is_empty()
                }
                ast::ClassMember::PrivateProp(p) => {
                    runs_code |= p.is_static;
                    !p.decorators.is_empty()
                }
                ast::ClassMember::StaticBlock(_) => {
                    runs_code = true;
                    false
                }
                ast::ClassMember::Constructor(c) => c.params.iter().any(|p| matches!(p, ast::ParamOrTsParamProp::TsParamProp(_))),
                ast::ClassMember::Empty(_) => false,
                _ => true,
            };
            if decorated {
                return Ok(None);
            }
        }
        runs_code |= !keys.is_empty();
        // (A computed key is evaluated in the enclosing function's scope:
        // its `this`, `arguments`, `super` and `new.target` are not the
        // wrapper's.)
        struct OuterScope(bool);
        impl swc_ecma_visit::Visit for OuterScope {
            fn visit_this_expr(&mut self, _: &ast::ThisExpr) {
                self.0 = true;
            }
            fn visit_super(&mut self, _: &ast::Super) {
                self.0 = true;
            }
            fn visit_meta_prop_expr(&mut self, _: &ast::MetaPropExpr) {
                self.0 = true;
            }
            fn visit_ident(&mut self, i: &ast::Ident) {
                if &*i.sym == "arguments" {
                    self.0 = true;
                }
            }
            fn visit_function(&mut self, _: &ast::Function) {}
            fn visit_class(&mut self, _: &ast::Class) {}
        }
        for k in &keys {
            let mut v = OuterScope(false);
            swc_ecma_visit::VisitWith::visit_with(*k, &mut v);
            if v.0 {
                return Ok(None);
            }
        }
        let mut c = class.clone();
        let heritage = c.super_class.take();
        let ident = name.map(|n| ast::Ident::new_no_ctxt(n.into(), Default::default()));
        let as_expr = ast::Expr::Class(ast::ClassExpr { ident: ident.clone(), class: Box::new(c.clone()) });
        let ret = ast::Stmt::Return(ast::ReturnStmt { span: Default::default(), arg: Some(Box::new(as_expr)) });
        let info = scope::analyze(&[], scope::Body::Stmts(std::slice::from_ref(&ret)), false);
        let mut locals: Vec<String> = Vec::new();
        let mut cells: BTreeSet<String> = BTreeSet::new();
        let mut globals = BTreeSet::new();
        for n in &info.free {
            if Some(n.as_str()) == name {
                continue;
            }
            let local = ctx.resolve_binding(n).is_some() || ctx.outer_names.contains(n) || self.name_to_fid.contains_key(n);
            if !local {
                globals.insert(n.clone());
                continue;
            }
            if n == "arguments" || !crate::source_mode::is_plain_param_name(n) {
                return Ok(None);
            }
            match ctx.resolve_binding(n) {
                // A variable in a cell: the class gets the cell (it shares
                // the variable, whatever assigns it when).
                Some(b) if b.boxed && b.mapped.is_none() => {
                    cells.insert(n.clone());
                }
                // Else its value now is its value from now on: nothing
                // assigns it, and it is initialized.
                Some(b) if ctx.initialized.contains(&b.slot) && !assigned.contains(n) && !ctx.outer_assigned.contains(n) => {}
                _ => return Ok(None),
            }
            locals.push(n.clone());
        }
        if !crate::source_mode::class_with_cells(&mut c, &cells) {
            return Ok(None);
        }
        if heritage.is_some() {
            c.super_class = Some(Box::new(ast::Expr::Ident(ast::Ident::new_no_ctxt(crate::source_mode::PARENT_PLACEHOLDER.into(), Default::default()))));
        }
        let hint = ctx.name_hint.clone().unwrap_or_default();
        let src = FnSource { node: FnNode::Class { class: c, name: ident, hint }, captures: vec![], globals: globals.clone(), strict: true, rerun: false };
        let Some((before, after)) = crate::source_mode::class_text(&src) else { return Ok(None) };
        let text = match after {
            Some(a) => format!("{before}{}{a}", crate::source_mode::PARENT_PLACEHOLDER),
            None => before,
        };
        let mut params = Vec::new();
        let mut args = Vec::new();
        if let Some(h) = &heritage {
            params.push(crate::source_mode::PARENT_PLACEHOLDER.to_string());
            args.push(match heritage_value {
                Some(v) => v,
                None => self.lower_expr(h, ctx)?,
            });
        }
        for n in &locals {
            params.push(n.clone());
            let b = ctx.resolve_binding(n).expect("a local the class names");
            args.push(if cells.contains(n) { Expr::Var(b.slot) } else { b.read() });
        }
        let globals: Vec<String> = globals.into_iter().collect();
        if params.is_empty() && !runs_code {
            return Ok(Some(Expr::Verbatim(text, globals)));
        }
        let wrapper = format!("(function ({}) {{\n  return {text};\n}})", params.join(", "));
        Ok(Some(Expr::Call(Box::new(Expr::Verbatim(wrapper, globals)), args)))
    }

    /// What a class names when the residual can make it from its source:
    /// it has no private members, no static fields or blocks and no
    /// computed keys (evaluated when the class is made), and no decorators,
    /// and refers to nothing of the enclosing functions but its heritage
    /// (which the residual supplies) and, with `locals`, variables the
    /// residual passes it as `class_at_runtime` does: a variable in a cell
    /// (the cell), or one nothing assigns and that is initialized (its
    /// value). Its globals, and those variables in order, each with whether
    /// it is a cell. `None` otherwise.
    fn class_source(&self, class: &ast::Class, name: Option<&str>, ctx: &FnCtx, locals: bool) -> Option<ClassSource> {
        if !class.decorators.is_empty() {
            return None;
        }
        let computed = |k: &ast::PropName| matches!(k, ast::PropName::Computed(_));
        // (The names each member's code names free, by member: a prototype
        // method by its name, anything else as `constructor` or `static`.)
        let mut free: Vec<(String, String)> = Vec::new();
        let mut add = |member: String, params: &[ast::Pat], body: &[ast::Stmt], arrow: bool| {
            let refs: Vec<&ast::Pat> = params.iter().collect();
            free.extend(scope::analyze(&refs, scope::Body::Stmts(body), arrow).free.into_iter().map(|n| (n, member.clone())));
        };
        for m in &class.body {
            match m {
                ast::ClassMember::Constructor(c) => {
                    let mut ps = Vec::new();
                    for p in &c.params {
                        match p {
                            ast::ParamOrTsParamProp::Param(p) => ps.push(p.pat.clone()),
                            ast::ParamOrTsParamProp::TsParamProp(_) => return None,
                        }
                    }
                    add("constructor".into(), &ps, c.body.as_ref().map(|b| b.stmts.as_slice()).unwrap_or(&[]), false);
                }
                ast::ClassMember::Method(m) if !computed(&m.key) => {
                    let ps: Vec<ast::Pat> = m.function.params.iter().map(|p| p.pat.clone()).collect();
                    let member = match (&m.key, m.is_static, m.kind) {
                        (ast::PropName::Ident(i), false, ast::MethodKind::Method) => i.sym.to_string(),
                        (ast::PropName::Str(st), false, ast::MethodKind::Method) => st.value.to_string_lossy().into_owned(),
                        _ => "static".into(),
                    };
                    add(member, &ps, m.function.body.as_ref().map(|b| b.stmts.as_slice()).unwrap_or(&[]), false);
                }
                ast::ClassMember::ClassProp(p) if !p.is_static && !computed(&p.key) && p.decorators.is_empty() => {
                    if let Some(v) = &p.value {
                        let ret = ast::Stmt::Return(ast::ReturnStmt { span: Default::default(), arg: Some(v.clone()) });
                        add("constructor".into(), &[], &[ret], true);
                    }
                }
                ast::ClassMember::Empty(_) => {}
                _ => return None,
            }
        }
        let mut globals = BTreeSet::new();
        let mut vars: Vec<(String, bool)> = Vec::new();
        let mut users: Vec<Vec<String>> = Vec::new();
        for (n, member) in free {
            if let Some(i) = vars.iter().position(|(v, _)| *v == n) {
                if !users[i].contains(&member) {
                    users[i].push(member);
                }
                continue;
            }
            if Some(n.as_str()) == name || n == "arguments" {
                continue;
            }
            if !(ctx.resolve_binding(&n).is_some() || ctx.outer_names.contains(&n) || self.name_to_fid.contains_key(&n)) {
                globals.insert(n);
                continue;
            }
            if !locals || !crate::source_mode::is_plain_param_name(&n) {
                return None;
            }
            let assigned = ctx.assigned.as_ref()?;
            match ctx.resolve_binding(&n) {
                Some(b) if b.boxed && b.mapped.is_none() => vars.push((n, true)),
                Some(b) if ctx.initialized.contains(&b.slot) && !assigned.contains(&n) && !ctx.outer_assigned.contains(&n) => vars.push((n, false)),
                _ => return None,
            }
            users.push(vec![member]);
        }
        Some(ClassSource { globals, vars, users })
    }

    fn finish_with_sources(mut self) -> (Vec<FuncDef>, Vec<Option<FnSource>>) {
        let mut sources: Vec<Option<FnSource>> = (0..self.declared.len()).map(|i| self.decl_sources.remove(&i)).collect();
        sources.append(&mut self.lifted_sources);
        self.declared.append(&mut self.lifted);
        (self.declared, sources)
    }

    /// Create the `{value: undefined}` cells for this function's own boxed vars,
    /// at the top of its body (so capture-by-reference cells exist before use).
    fn boxed_cell_stmts(&self, ctx: &FnCtx) -> Vec<Stmt> {
        let mut names: Vec<&String> = ctx.boxed_set.iter().collect();
        names.sort();
        names
            .into_iter()
            .filter_map(|name| ctx.resolve(name).map(|slot| (name, slot)))
            .flat_map(|(name, slot)| {
                // A boxed parameter starts holding its incoming argument; wrap it
                // in place (`p = {value: p}`, the inner `Var(slot)` reading the raw
                // arg before the assignment rebinds the slot). A boxed local starts
                // `undefined` (it is hoisted).
                let param = ctx.boxed_params.contains(name);
                let init = if param { Expr::Var(slot) } else { Expr::Undefined };
                let mut out = vec![Stmt::Let(slot, Expr::Object(vec![("value".to_string(), init)]))];
                // (A parameter written once, now: see `once_cells`.)
                if param && ctx.once_cells.contains(name) {
                    out.push(Stmt::FinalCell(slot));
                }
                out
            })
            .collect()
    }

    /// Declare a slot (function-scoped, hoisted) for each direct-child
    /// `function` declaration of `stmts`, and record the names so `lower_stmt`
    /// skips them at their textual position. Must run after `hoist_vars` and
    /// after `ctx.boxed_set` is set (so the slot picks up the boxed flag).
    fn hoist_fn_decls(&self, stmts: &[ast::Stmt], ctx: &mut FnCtx) {
        for name in fn_decl_names(stmts) {
            // (A script's top-level function is a global, also kept in a
            // local when the program never assigns it.)
            if !ctx.script_globals.contains(&name) || ctx.script_fn_aliases.contains(&name) {
                ctx.declare_var(&name);
            }
            ctx.hoisted_fns.insert(name);
        }
    }

    /// Lower the direct-child `function` declarations of `stmts` into assignment
    /// statements, emitted at the top of the body (JS function-declaration
    /// hoisting). Each becomes a closure assigned to its hoisted slot (or its
    /// `{value}` cell when boxed for capture-by-reference).
    fn lower_fn_decls(&mut self, stmts: &[ast::Stmt], ctx: &mut FnCtx) -> R<Vec<Stmt>> {
        let mut out = Vec::new();
        for s in stmts {
            let ast::Stmt::Decl(ast::Decl::Fn(f)) = s else {
                continue;
            };
            let name = f.ident.sym.to_string();
            let closure = self.fn_decl_closure(f, ctx)?;
            if ctx.script_globals.contains(&name) && ctx.scopes.len() == 1 {
                match ctx.scopes[0].get(&name).copied() {
                    Some(b) => {
                        out.push(b.write(closure));
                        out.push(Stmt::SetGlobal(name.clone(), b.read()));
                    }
                    None => out.push(Stmt::SetGlobal(name.clone(), closure)),
                }
                continue;
            }
            let b = ctx
                .resolve_binding(&name)
                .expect("fn-decl slot declared by hoist_fn_decls");
            out.push(b.write(closure));
            if b.boxed && b.mapped.is_none() && ctx.once_cells.contains(&name) {
                out.push(Stmt::FinalCell(b.slot));
            }
        }
        Ok(out)
    }

    /// The closure a `function` declaration creates.
    /// A function holding a direct `eval` of code not known here runs as
    /// is (`Expr::Verbatim`): the specializer cannot see what the code does
    /// with the function's scope. Its source is emitted unchanged, so it
    /// must refer to nothing of the enclosing functions (only its own scope
    /// and globals); `Ok(None)` for a function without such an `eval`.
    fn verbatim_fn(&self, func: &ast::Function, own_name: Option<ast::Ident>, js_name: &str, ctx: &FnCtx, allow_rerun: bool) -> R<Option<Expr>> {
        if !has_dynamic_direct_eval(func) || (allow_rerun && rerun_eval_ok(func)) {
            return Ok(None);
        }
        let params: Vec<ast::Pat> = func.params.iter().map(|p| p.pat.clone()).collect();
        let param_refs: Vec<&ast::Pat> = params.iter().collect();
        let body = func.body.as_ref().map(|b| b.stmts.clone()).unwrap_or_default();
        let info = scope::analyze(&param_refs, scope::Body::Stmts(&body), false);
        let own = own_name.as_ref().map(|i| i.sym.to_string());
        let mut globals = BTreeSet::new();
        for n in &info.free {
            if Some(n) == own.as_ref() || n == "arguments" {
                continue;
            }
            if ctx.resolve_binding(n).is_some() || ctx.outer_names.contains(n) || self.name_to_fid.contains_key(n) {
                return Err(format!(
                    "a function with a direct `eval(...)` of code not known here that refers to `{n}` of an enclosing function is not supported"
                ));
            }
            globals.insert(n.clone());
        }
        let strict = ctx.strict || has_use_strict(&body);
        let src = FnSource { node: FnNode::Function { func: func.clone(), own_name }, captures: vec![], globals: globals.clone(), strict, rerun: false };
        match crate::source_mode::verbatim(js_name, &src) {
            Some(text) => Ok(Some(Expr::Verbatim(text, globals.into_iter().collect()))),
            None => Err("a function with a direct `eval(...)` of code not known here cannot be emitted as is (it uses `super` or a name the residual reserves)".into()),
        }
    }

    fn fn_decl_closure(&mut self, f: &ast::FnDecl, ctx: &mut FnCtx) -> R<Expr> {
        let name = f.ident.sym.to_string();
        if let Some(v) = self.verbatim_fn(&f.function, None, &name, ctx, true)? {
            return Ok(v);
        }
        let params: Vec<ast::Pat> = f.function.params.iter().map(|p| p.pat.clone()).collect();
        let body = match &f.function.body {
            Some(b) => b.stmts.clone(),
            None => return Err(format!("function `{name}` without a body")),
        };
        let kind = if f.function.is_generator { FnKind::Generator } else { FnKind::Normal };
        let mut opts = LiftOpts::new(kind)
            .named(name)
            .asynchronous(f.function.is_async)
            .source(FnNode::Function { func: (*f.function).clone(), own_name: None });
        opts.rerun_eval = has_dynamic_direct_eval(&f.function) && rerun_eval_ok(&f.function);
        let (fid, captures) = self.lift_arrow(&params, ArrowBody::BlockOwned(body), ctx, opts)?;
        let caps = self.capture_exprs(&captures, ctx)?;
        Ok(Expr::Closure(fid, caps))
    }

    /// The `let`/`const`/`class` names the block of `stmts` (its scope the
    /// current one) declares, not yet declared: until its declaration runs,
    /// a reference to one is in its temporal dead zone (`FnCtx::in_tdz`).
    /// (One a closure captures is a cell made as the block is entered, read
    /// as `undefined` until then: that zone is not modeled.)
    fn note_tdz(stmts: &[ast::Stmt], ctx: &mut FnCtx) {
        for st in stmts {
            let names: Vec<String> = match st {
                ast::Stmt::Decl(ast::Decl::Var(v)) if !matches!(v.kind, ast::VarDeclKind::Var) => v.decls.iter().flat_map(|d| scope::pat_names(&d.name)).collect(),
                ast::Stmt::Decl(ast::Decl::Class(c)) => vec![c.ident.sym.to_string()],
                _ => continue,
            };
            for name in names {
                if !ctx.boxed_set.contains(&name) && !ctx.scopes.last().unwrap().contains_key(&name) {
                    ctx.tdz.last_mut().unwrap().insert(name);
                }
            }
        }
    }

    /// An assignment to a name in its temporal dead zone, as the expression
    /// that throws its ReferenceError: after the value is computed for
    /// `name = value`; at once for a compound one, which reads the name
    /// first.
    fn tdz_assign(&mut self, a: &ast::AssignExpr, ctx: &mut FnCtx) -> R<Option<Expr>> {
        let ast::AssignTarget::Simple(ast::SimpleAssignTarget::Ident(bi)) = &a.left else { return Ok(None) };
        let name = bi.id.sym.as_str();
        if !ctx.in_tdz(name) {
            return Ok(None);
        }
        let Expr::Call(thrower, mut args) = self.tdz_error(name)? else { unreachable!("`tdz_error` is a call") };
        if matches!(a.op, ast::AssignOp::Assign) {
            args.push(self.lower_expr(&a.right, ctx)?);
        }
        Ok(Some(Expr::Call(thrower, args)))
    }

    /// `name` referenced in its temporal dead zone: the ReferenceError the
    /// reference throws, as an expression (the prelude's `__pe_tdz`).
    fn tdz_error(&self, name: &str) -> R<Expr> {
        let fid = *self.name_to_fid.get("__pe_tdz").ok_or("internal: the prelude's `__pe_tdz` is missing")?;
        Ok(Expr::Call(Box::new(Expr::Func(fid)), vec![Expr::Str(name.to_string())]))
    }

    /// Entering a block whose statements are `stmts` (its scope just pushed):
    /// a fresh `{value}` cell for each boxed lexical name it declares (closures
    /// capture the binding of this entry of the block, and a function
    /// declared in it may capture a later `let`), then its function
    /// declarations, created here (hoisted to the top of the block) and bound
    /// block-scoped.
    fn block_prologue(&mut self, stmts: &[ast::Stmt], ctx: &mut FnCtx, out: &mut Vec<Stmt>) -> R<()> {
        let mut names = Vec::new();
        for st in stmts {
            match st {
                ast::Stmt::Decl(ast::Decl::Var(v)) if !matches!(v.kind, ast::VarDeclKind::Var) => {
                    for d in &v.decls {
                        names.extend(scope::pat_names(&d.name));
                    }
                }
                ast::Stmt::Decl(ast::Decl::Class(c)) => names.push(c.ident.sym.to_string()),
                ast::Stmt::Decl(ast::Decl::Fn(f)) => names.push(f.ident.sym.to_string()),
                _ => {}
            }
        }
        Compiler::note_tdz(stmts, ctx);
        for name in names {
            if ctx.boxed_set.contains(&name) && !ctx.scopes.last().unwrap().contains_key(&name) {
                let slot = ctx.declare_boxed(&name, true);
                out.push(Stmt::Let(slot, Expr::Object(vec![("value".to_string(), Expr::Undefined)])));
            }
        }
        for st in stmts {
            let ast::Stmt::Decl(ast::Decl::Fn(f)) = st else { continue };
            let name = f.ident.sym.to_string();
            let closure = self.fn_decl_closure(f, ctx)?;
            match ctx.scopes.last().unwrap().get(&name).copied() {
                Some(b) if b.boxed => out.push(Stmt::SetProp(Expr::Var(b.slot), "value".to_string(), closure)),
                Some(b) => out.push(Stmt::Set(b.slot, closure)),
                None => {
                    let slot = ctx.declare_boxed(&name, false);
                    out.push(Stmt::Let(slot, closure));
                }
            }
            ctx.block_fns.insert((f.function.span.lo.0, f.function.span.hi.0));
        }
        Ok(())
    }

    /// Lower a function (declaration or lifted expression). Returns
    /// (nslots, nparams, (arguments_slot, mapped_arguments), body).
    fn lower_fn(&mut self, function: &ast::Function) -> R<(usize, usize, (Option<usize>, bool), Vec<Stmt>, Vec<&'static str>)> {
        let block = match &function.body {
            Some(b) => b,
            None => return Err("function without a body".into()),
        };
        let mut ctx = FnCtx::new(HashSet::new());
        ctx.strict = self.strict_now;
        ctx.rerun_eval = self.rerun_next;
        ctx.is_async = function.is_async;
        ctx.native_finally = function.is_generator && yield_in_try_finally(&block.stmts);
        let params: Vec<&ast::Pat> = function.params.iter().map(|p| &p.pat).collect();
        let nparams = params.len();
        let body = self.lower_function_body(&mut ctx, &params, &block.stmts, false)?;
        Ok((ctx.max_slot.max(nparams), nparams, (ctx.arguments_slot, ctx.mapped_arguments), body, ctx.slot_names()))
    }

    /// Lift an arrow / function expression to a top-level function via closure
    /// conversion: its free variables that are visible in the enclosing scope
    /// become leading *captured* parameters (slots `0..ncaptured`). Returns the
    /// new fid and the captured names (in capture-slot order) so the caller emits
    /// `Closure(fid, [capture values])`.
    ///
    /// Captures are by VALUE (snapshot at closure creation). This matches JS for
    /// immediately-invoked functions and for captures that aren't reassigned
    /// after creation; a long-lived closure observing a later mutation of a
    /// captured variable is NOT modeled (Node validation would surface it).
    fn lift_arrow(
        &mut self,
        params: &[ast::Pat],
        body: ArrowBody,
        enclosing: &FnCtx,
        opts: LiftOpts,
    ) -> R<(usize, Vec<(String, bool)>)> {
        let kind = opts.kind;
        // (How it uses its own `this`; a constructor of a class with
        // instance fields writes them on it.)
        let this_reads = if opts.ctor.as_ref().is_some_and(|c| c.has_init) { None } else { this_reads_of(params, &body) };
        let this_forward = if kind == FnKind::Normal { this_forward_of(&body) } else { None };
        // (A plain function's: an ES5 class's constructor or method, see
        // `function_instance_uses`.)
        let instance_uses = if kind == FnKind::Normal { function_instance_uses(params, &body) } else { None };
        // free variables visible outside become captures (deterministic order),
        // each tagged with whether it is a boxed cell in the enclosing scope.
        let is_arrow = kind == FnKind::Arrow;
        let param_refs: Vec<&ast::Pat> = params.iter().collect();
        let mut free: Vec<String> = match &body {
            ArrowBody::Block(s) => scope::analyze(&param_refs, scope::Body::Stmts(s), is_arrow).free,
            ArrowBody::BlockOwned(s) => scope::analyze(&param_refs, scope::Body::Stmts(s), is_arrow).free,
            ArrowBody::Expr(e) => scope::analyze(&param_refs, scope::Body::Expr(e), is_arrow).free,
            ArrowBody::Fields(fs, _) => {
                let stmts = field_value_stmts(fs);
                scope::analyze(&[], scope::Body::Stmts(&stmts), false).free
            }
        }
        .into_iter()
        .collect();
        for n in &opts.extra_free {
            if !free.contains(n) {
                free.push(n.clone());
            }
        }
        free.sort();
        let visible = enclosing.visible_names();
        let globals: BTreeSet<String> = free.iter().filter(|n| !visible.contains(*n)).cloned().collect();
        let captures: Vec<(String, bool)> = free
            .into_iter()
            .filter(|n| visible.contains(n))
            .map(|n| {
                let boxed = enclosing.resolve_binding(&n).map_or(false, |b| b.boxed);
                (n, boxed)
            })
            .collect();
        // A captured mapped parameter's cell is read at its index, not
        // `value` (the closure's source cannot be emitted as is then).
        let capture_mapped: Vec<Option<u32>> =
            captures.iter().map(|(n, _)| enclosing.resolve_binding(n).and_then(|b| b.mapped)).collect();

        let mut ctx = FnCtx::new(HashSet::new());
        ctx.ctor = opts.ctor;
        ctx.rerun_eval = opts.rerun_eval;
        ctx.privates = enclosing.privates.clone();
        ctx.dead = enclosing.dead.clone();
        ctx.outer_assigned = enclosing.outer_assigned.iter().chain(enclosing.assigned.iter().flatten()).cloned().collect();
        let own_directive = match &body {
            ArrowBody::Block(st) => has_use_strict(*st),
            ArrowBody::BlockOwned(st) => has_use_strict(st),
            _ => false,
        };
        ctx.strict = opts.strict || enclosing.strict || own_directive;
        ctx.is_async = opts.is_async;
        ctx.native_finally = kind == FnKind::Generator
            && match &body {
                ArrowBody::Block(st) => yield_in_try_finally(st),
                ArrowBody::BlockOwned(st) => yield_in_try_finally(st),
                _ => false,
            };
        for ((name, boxed), mapped) in captures.iter().zip(&capture_mapped) {
            let slot = ctx.declare_boxed(name, *boxed); // captured slots first; cell from enclosing
            if let Some(b) = ctx.scopes.last_mut().unwrap().get_mut(name) {
                b.mapped = *mapped;
            }
            if enclosing.resolve_binding(name).is_some_and(|b| enclosing.initialized.contains(&b.slot)) {
                ctx.initialized.insert(slot);
            }
        }
        let ncaptured = captures.len();
        let nparams = params.len();
        let stmts = match body {
            ArrowBody::Block(stmts) => self.lower_function_body(&mut ctx, &param_refs, stmts, is_arrow)?,
            ArrowBody::BlockOwned(stmts) => self.lower_function_body(&mut ctx, &param_refs, &stmts, is_arrow)?,
            ArrowBody::Expr(e) => {
                let ret = ast::Stmt::Return(ast::ReturnStmt { span: Default::default(), arg: Some(Box::new(e.clone())) });
                self.lower_function_body(&mut ctx, &param_refs, std::slice::from_ref(&ret), is_arrow)?
            }
            ArrowBody::Fields(fs, brand) => {
                // InitializeInstanceElements: the private methods' brand, then
                // each field on `this`, in order.
                let analysis = field_value_stmts(&fs);
                let mut body = self.lower_function_body(&mut ctx, &[], &[], false)?;
                if scope::analyze(&[], scope::Body::Stmts(&analysis), false).nested_free.contains(scope::LEXICAL_THIS)
                    && ctx.resolve(scope::LEXICAL_THIS).is_none()
                {
                    let slot = ctx.declare_var(scope::LEXICAL_THIS);
                    body.insert(0, Stmt::Let(slot, Expr::This));
                }
                if let Some(class) = brand {
                    let b = ctx.resolve_binding("%ibrand").ok_or("internal: private brand not captured")?.read();
                    let this = self.lower_this(&ctx);
                    body.push(Stmt::If(
                        Self::coll_call(b.clone(), "has", vec![this.clone()]),
                        vec![Self::throw_type_error(format!(
                            "Cannot initialize private methods of class {} twice on the same object",
                            self.class_names[class]
                        ))],
                        vec![],
                    ));
                    body.push(Stmt::ExprStmt(Self::coll_call(b, "add", vec![this])));
                }
                for f in fs {
                    let this = self.lower_this(&ctx);
                    body.extend(self.define_field(this, &f, &mut ctx)?);
                }
                body
            }
        };
        let fid = self.decls.len() + self.lifted.len();
        // (Its source cannot be emitted as is when it captures a mapped
        // parameter, or names a top-level function of the program, which the
        // residual names differently.)
        let source_text = opts.source.as_ref().and_then(fn_node_text);
        let source = if capture_mapped.iter().any(|m| m.is_some()) || globals.iter().any(|g| self.name_to_fid.contains_key(g)) {
            None
        } else {
            opts.source.clone()
        };
        if opts.rerun_eval && (source.is_none() || !captures.is_empty()) {
            return Err("a function with a direct `eval(...)` of code not known here that refers to an enclosing function's variable is not supported".into());
        }
        self.lifted_sources.push(source.map(|node| FnSource {
            node,
            captures: captures.clone(),
            globals: globals.clone(),
            strict: ctx.strict,
            rerun: opts.rerun_eval,
        }));
        self.lifted.push(FuncDef {
            name: leak(opts.name.clone()),
            nslots: ctx.max_slot.max(ncaptured + nparams),
            ncaptured,
            nparams,
            length: expected_argument_count(params),
            slot_names: ctx.slot_names(),
            arguments_slot: ctx.arguments_slot,
            mapped_arguments: ctx.mapped_arguments,
            script_globals: vec![],
            script_entry: None,
            class_source: None,
            this_forward: this_forward.and_then(|x| captures.iter().position(|(n, _)| *n == x)),
            instance_uses: instance_uses.map(|mut u| {
                u.parent_capture = u.parent.as_ref().and_then(|x| captures.iter().position(|(n, _)| n == x));
                u
            }),
            cell_captures: captures.iter().zip(&capture_mapped).map(|((_, boxed), m)| *boxed && m.is_none()).collect(),
            proto_methods: vec![],
            this_reads,
            kind,
            is_async: opts.is_async,
            strict: ctx.strict,
            source_text,
            body: stmts,
        });
        Ok((fid, captures))
    }

    /// Lower the capture values for a lifted closure: the enclosing slot's
    /// content (the cell itself if boxed, else the value).
    fn capture_exprs(&self, captures: &[(String, bool)], ctx: &FnCtx) -> R<Vec<Expr>> {
        let mut caps = Vec::with_capacity(captures.len());
        for (name, _boxed) in captures {
            let slot = ctx
                .resolve(name)
                .ok_or_else(|| format!("capture of unbound `{name}`"))?;
            caps.push(Expr::Var(slot));
        }
        Ok(caps)
    }

    // ---- statements ----

    fn lower_stmts(&mut self, stmts: &[ast::Stmt], ctx: &mut FnCtx) -> R<Vec<Stmt>> {
        let mut out = Vec::new();
        for s in stmts {
            self.lower_stmt(s, ctx, &mut out)?;
        }
        Ok(out)
    }

    /// Lower a block or single statement into a fresh `Vec<Stmt>` (its own scope).
    fn lower_body(&mut self, s: &ast::Stmt, ctx: &mut FnCtx) -> R<Vec<Stmt>> {
        ctx.push();
        let mut out = Vec::new();
        match s {
            ast::Stmt::Block(b) => {
                self.block_prologue(&b.stmts, ctx, &mut out)?;
                for st in &b.stmts {
                    self.lower_stmt(st, ctx, &mut out)?;
                }
            }
            other => {
                // `if (c) function f() {}` (sloppy) is a block of its own.
                self.block_prologue(std::slice::from_ref(other), ctx, &mut out)?;
                self.lower_stmt(other, ctx, &mut out)?
            }
        }
        ctx.pop();
        Ok(out)
    }

    fn lower_stmt(&mut self, s: &ast::Stmt, ctx: &mut FnCtx, out: &mut Vec<Stmt>) -> R<()> {
        match s {
            ast::Stmt::Decl(ast::Decl::Var(v)) => {
                self.lower_var_decl(v, ctx, out)?;
                // (Its names are declared from here on, however each is
                // bound: a local, a cell, a script's global, or nothing for
                // one nothing reads. See `FnCtx::in_tdz`.)
                if !matches!(v.kind, ast::VarDeclKind::Var) {
                    for d in &v.decls {
                        for name in scope::pat_names(&d.name) {
                            ctx.tdz.last_mut().unwrap().remove(&name);
                        }
                    }
                }
            }
            ast::Stmt::Decl(ast::Decl::Fn(f)) => {
                // Function declarations were created where they are hoisted
                // to: the top of the body (see `lower_fn_decls`) or of their
                // block (see `block_prologue`).
                let name = f.ident.sym.to_string();
                if ctx.block_fns.contains(&(f.function.span.lo.0, f.function.span.hi.0)) {
                    // Annex B.3.3: evaluating it copies the block's binding
                    // to the function's `var`.
                    if ctx.annex_b.contains(&name) {
                        let value = match ctx.resolve_binding(&name) {
                            Some(b) => b.read(),
                            None => return Err(format!("internal: block function `{name}` has no binding")),
                        };
                        match ctx.scopes[0].get(&name).copied() {
                            Some(b) => out.push(b.write(value)),
                            None => return Err(format!("internal: Annex B `var {name}` was not hoisted")),
                        }
                    }
                } else if !ctx.hoisted_fns.contains(&name) {
                    return Err(format!("internal: `function {name}` was not hoisted"));
                }
            }
            // `class C {...}` binds `C` like `let`.
            ast::Stmt::Decl(ast::Decl::Class(c)) => {
                let name = c.ident.sym.to_string();
                let value = self.lower_class(&c.class, Some(&name), ctx)?;
                self.bind_lexical(&name, value, ctx, out)?;
                ctx.tdz.last_mut().unwrap().remove(&name);
                if let Some(b) = ctx.resolve_binding(&name) {
                    ctx.initialized.insert(b.slot);
                }
            }
            ast::Stmt::Decl(_) => return Err("unsupported declaration (using/etc.)".into()),
            ast::Stmt::Expr(e) => self.lower_expr_stmt(&e.expr, ctx, out)?,
            // (In a function that reruns at runtime, see `rerun_eval_ok`.)
            ast::Stmt::Return(r) if ctx.rerun_eval && r.arg.as_deref().is_some_and(is_direct_eval_call) => {
                out.push(Stmt::RerunAtRuntime);
            }
            ast::Stmt::Return(r) => {
                let e = match &r.arg {
                    Some(e) => self.lower_expr(e, ctx)?,
                    None => Expr::Undefined,
                };
                self.lower_return(e, ctx, out);
            }
            ast::Stmt::If(i) => {
                let cond = self.lower_expr(&i.test, ctx)?;
                let cons = self.lower_body(&i.cons, ctx)?;
                let alt = match &i.alt {
                    Some(a) => self.lower_body(a, ctx)?,
                    None => vec![],
                };
                out.push(Stmt::If(cond, cons, alt));
            }
            ast::Stmt::While(w) => {
                let cond = self.lower_expr(&w.test, ctx)?;
                ctx.enter_breakable(true, None);
                let body = self.lower_body(&w.body, ctx)?;
                ctx.leave_breakable(true);
                out.push(Stmt::While(cond, body));
            }
            // `do body while (test)`: `for (first = true; first || test; first = false) body`
            // would re-test after `continue` correctly; here the body runs
            // once, then the loop re-tests before each further run.
            ast::Stmt::DoWhile(d) => {
                let first = ctx.fresh_slot();
                out.push(Stmt::Let(first, Expr::Bool(true)));
                let test = self.lower_expr(&d.test, ctx)?;
                let cond = Expr::Opaque("||".into(), vec![Expr::Var(first), test]);
                ctx.enter_breakable(true, None);
                let body = self.lower_body(&d.body, ctx)?;
                ctx.leave_breakable(true);
                out.push(Stmt::For { cond, body, update: vec![Stmt::Set(first, Expr::Bool(false))] });
            }
            ast::Stmt::ForOf(f) => self.lower_for_of(f, ctx, out)?,
            ast::Stmt::ForIn(f) => self.lower_for_in(f, ctx, out)?,
            ast::Stmt::For(f) => self.lower_for(f, ctx, out)?,
            ast::Stmt::Switch(sw) => self.lower_switch(sw, ctx, out)?,
            // A jump out of a `try ... finally` region runs the `finally` first.
            ast::Stmt::Break(_) | ast::Stmt::Continue(_) if self.leaves_native_region(s, ctx)? => {
                return Err(
                    "`break`/`continue` out of a `try`/`finally` around a `yield` in a generator is not supported yet".into(),
                );
            }
            ast::Stmt::Break(_) | ast::Stmt::Continue(_) if self.leaves_finally_region(s, ctx)? => {
                let region = ctx.finally_stack.last_mut().unwrap();
                region.deferred.push(s.clone());
                let code = 2 + region.deferred.len();
                let (kind, block_index, iter_depth) = (region.kind, region.block_index, region.iter_depth);
                let iters: Vec<(usize, bool)> = ctx.iter_stack[iter_depth..].iter().rev().flatten().copied().collect();
                for (it, asy) in iters {
                    out.extend(close_iter(it, asy, ctx));
                }
                out.push(Stmt::Set(kind, Expr::Num(JsNum::int(code as i64))));
                out.push(Stmt::BreakOuter(ctx.break_depth - 1 - block_index));
            }
            ast::Stmt::Break(ast::BreakStmt { label: Some(l), .. }) => {
                let name = l.sym.to_string();
                let &(_, target, _) = ctx.labels.iter().rev().find(|(n, _, _)| *n == name).ok_or(format!("undefined label `{name}`"))?;
                // Close the iterators of the `for..of` loops left (the target too).
                let iters: Vec<(usize, bool)> = ctx.iter_stack[target..].iter().rev().flatten().copied().collect();
                for (it, asy) in iters {
                    out.extend(close_iter(it, asy, ctx));
                }
                out.push(Stmt::BreakOuter(ctx.break_depth - 1 - target));
            }
            ast::Stmt::Continue(ast::ContinueStmt { label: Some(l), .. }) => {
                let name = l.sym.to_string();
                let &(_, target, loop_index) =
                    ctx.labels.iter().rev().find(|(n, _, _)| *n == name).ok_or(format!("undefined label `{name}`"))?;
                let loop_index = loop_index.ok_or(format!("`continue {name}`: the label is not on a loop"))?;
                let iters: Vec<(usize, bool)> = ctx.iter_stack[target + 1..].iter().rev().flatten().copied().collect();
                for (it, asy) in iters {
                    out.extend(close_iter(it, asy, ctx));
                }
                out.push(Stmt::ContinueOuter(ctx.loop_depth - 1 - loop_index));
            }
            ast::Stmt::Labeled(l) => {
                let name = l.label.sym.to_string();
                let is_loop = matches!(
                    &*l.body,
                    ast::Stmt::While(_) | ast::Stmt::DoWhile(_) | ast::Stmt::For(_) | ast::Stmt::ForIn(_) | ast::Stmt::ForOf(_)
                );
                if is_loop {
                    // The label names the loop's own break/continue target,
                    // which the loop pushes next.
                    ctx.labels.push((name, ctx.break_depth, Some(ctx.loop_depth)));
                    let r = self.lower_stmt(&l.body, ctx, out);
                    ctx.labels.pop();
                    r?;
                } else {
                    let mut body = Vec::new();
                    ctx.labels.push((name, ctx.break_depth, None));
                    ctx.enter_breakable(false, None);
                    let r = self.lower_stmt(&l.body, ctx, &mut body);
                    ctx.leave_breakable(false);
                    ctx.labels.pop();
                    r?;
                    out.push(Stmt::BreakableBlock(body));
                }
            }
            ast::Stmt::Break(b) => {
                let _ = b;
                if ctx.break_depth == 0 {
                    return Err("`break` outside of a switch or loop".into());
                }
                // Leaving a `for..of` early closes its iterator.
                if let Some(Some((it, asy))) = ctx.iter_stack.last().copied() {
                    out.extend(close_iter(it, asy, ctx));
                }
                out.push(Stmt::Break);
            }
            ast::Stmt::Continue(_) => {
                if ctx.loop_depth == 0 {
                    return Err("`continue` outside of a loop".into());
                }
                out.push(Stmt::Continue);
            }
            ast::Stmt::Block(b) => {
                ctx.push();
                self.block_prologue(&b.stmts, ctx, out)?;
                for st in &b.stmts {
                    self.lower_stmt(st, ctx, out)?;
                }
                ctx.pop();
            }
            ast::Stmt::Empty(_) => {}
            // (With no debugger attached, `debugger;` does nothing.)
            ast::Stmt::Debugger(_) => {}

            ast::Stmt::Throw(t) => {
                let e = self.lower_expr(&t.arg, ctx)?;
                out.push(Stmt::Throw(e));
            }
            ast::Stmt::Try(t) => self.lower_try(t, ctx, out)?,
            other => return Err(format!("unsupported statement: {:?}", std::mem::discriminant(other))),
        }
        Ok(())
    }

    fn lower_for(&mut self, f: &ast::ForStmt, ctx: &mut FnCtx, out: &mut Vec<Stmt>) -> R<()> {
        // `for (init; cond; update) body` becomes `init; For { cond, body, update }`.
        // Keeping `update` separate lets `continue` run it before re-testing.
        ctx.push();
        match &f.init {
            Some(ast::VarDeclOrExpr::VarDecl(v)) => self.lower_var_decl(v, ctx, out)?,
            Some(ast::VarDeclOrExpr::Expr(e)) => self.lower_expr_stmt(e, ctx, out)?,
            None => {}
        }
        // An absent test means `true`: `for (;;)` is an infinite loop, exited via
        // `break`/`return`.
        let cond = match &f.test {
            Some(e) => self.lower_expr(e, ctx)?,
            None => Expr::Bool(true),
        };
        // A boxed `let` of the head gets a fresh binding per iteration, a
        // copy of the previous one, made before the first test and before
        // each update (CreatePerIterationEnvironment): a closure made in one
        // iteration keeps that iteration's binding.
        let mut copies = Vec::new();
        if let Some(ast::VarDeclOrExpr::VarDecl(v)) = &f.init {
            if !matches!(v.kind, ast::VarDeclKind::Var) {
                for d in &v.decls {
                    for name in scope::pat_names(&d.name) {
                        if let Some(b) = ctx.scopes.last().unwrap().get(&name).copied().filter(|b| b.boxed) {
                            let read = Expr::Get(Box::new(Expr::Var(b.slot)), "value".to_string());
                            copies.push(Stmt::Set(b.slot, Expr::Object(vec![("value".to_string(), read)])));
                        }
                    }
                }
            }
        }
        out.extend(copies.iter().cloned());
        ctx.enter_breakable(true, None);
        let body = self.lower_body(&f.body, ctx)?;
        let mut update = copies;
        if let Some(u) = &f.update {
            self.lower_expr_stmt(u, ctx, &mut update)?;
        }
        ctx.leave_breakable(true);
        out.push(Stmt::For { cond, body, update });
        ctx.pop();
        Ok(())
    }

    fn lower_switch(&mut self, sw: &ast::SwitchStmt, ctx: &mut FnCtx, out: &mut Vec<Stmt>) -> R<()> {
        let disc = self.lower_expr(&sw.discriminant, ctx)?;
        ctx.enter_breakable(false, None);
        // The clauses share one block scope (a `let` in one case is visible
        // in the cases after it); its declarations are set up before the
        // switch dispatches.
        ctx.push();
        let all: Vec<ast::Stmt> = sw.cases.iter().flat_map(|c| c.cons.iter().cloned()).collect();
        self.block_prologue(&all, ctx, out)?;
        let mut clauses = Vec::new();
        for case in &sw.cases {
            let body = {
                let mut b = Vec::new();
                for st in &case.cons {
                    self.lower_stmt(st, ctx, &mut b)?;
                }
                b
            };
            match &case.test {
                Some(t) => {
                    let test = self.lower_expr(t, ctx)?;
                    clauses.push(Clause::Case(test, body));
                }
                None => clauses.push(Clause::Default(body)),
            }
        }
        ctx.pop();
        ctx.leave_breakable(false);
        out.push(Stmt::Switch(disc, clauses));
        Ok(())
    }

    /// Lower a `var`/`let`/`const` declaration (one or more declarators). `var`
    /// is function-scoped and hoisted; `let`/`const` are block-scoped.
    fn lower_var_decl(&mut self, v: &ast::VarDecl, ctx: &mut FnCtx, out: &mut Vec<Stmt>) -> R<()> {
        self.lower_var_decl_inner(v, ctx, out)?;
        // (Its bindings are initialized from here on; one without an
        // initializer holds `undefined`, or a `var` what it held.)
        for d in &v.decls {
            for n in scope::pat_names(&d.name) {
                if let Some(b) = ctx.resolve_binding(&n) {
                    ctx.initialized.insert(b.slot);
                }
            }
        }
        Ok(())
    }

    fn lower_var_decl_inner(&mut self, v: &ast::VarDecl, ctx: &mut FnCtx, out: &mut Vec<Stmt>) -> R<()> {
        let is_var = matches!(v.kind, ast::VarDeclKind::Var);
        for d in &v.decls {
            if !matches!(d.name, ast::Pat::Ident(_)) {
                // A destructuring declaration.
                let init = match &d.init {
                    Some(e) => self.lower_expr(e, ctx)?,
                    None => return Err("a destructuring declaration needs an initializer".into()),
                };
                let kind = if is_var { BindKind::Var } else { BindKind::Lexical };
                self.bind_pat(&d.name, init, kind, ctx, out)?;
                // (A `var` it writes once: final once it is written, as for
                // `var x = e`.)
                if is_var {
                    for n in scope::pat_names(&d.name) {
                        if ctx.once_cells.contains(&n) {
                            if let Some(b) = ctx.scopes[0].get(&n).copied().filter(|b| b.boxed && b.mapped.is_none()) {
                                out.push(Stmt::FinalCell(b.slot));
                            }
                        }
                    }
                }
                continue;
            }
            let name = pat_ident(&d.name)?;
            // (A variable nothing reads: only what its initializer does.)
            if ctx.dead.contains(name) {
                if !is_var {
                    ctx.declare(name);
                }
                if let Some(e) = &d.init {
                    let v = self.lower_expr(e, ctx)?;
                    out.push(Stmt::ExprStmt(v));
                }
                continue;
            }
            // `var x = c ? a : b` is an `if` (see `lower_cond_assign`).
            if let (true, Some(e)) = (
                is_var && !ctx.boxed_set.contains(name) && !ctx.scopes[0].get(name).is_some_and(|b| b.boxed) && !ctx.script_globals.contains(name),
                &d.init,
            ) {
                if is_cond(e) {
                    let slot = ctx.declare_var(name);
                    self.lower_cond_assign(e, ctx, &|v| Stmt::Set(slot, v), out)?;
                    continue;
                }
            }
            // A boxed lexical binding not created by its block's entry (a
            // loop head's) gets its cell before the initializer runs, which
            // may capture it.
            let script_global = !is_var && ctx.scopes.len() == 1 && ctx.script_globals.contains(name);
            if !is_var && !script_global && ctx.boxed_set.contains(name) && !ctx.scopes.last().unwrap().get(name).is_some_and(|b| b.boxed) {
                let slot = ctx.declare_boxed(name, true);
                out.push(Stmt::Let(slot, Expr::Object(vec![("value".to_string(), Expr::Undefined)])));
            }
            let init = match &d.init {
                Some(e) => Some(self.lower_named(e, name, ctx)?),
                None => None,
            };
            if is_var {
                // Hoisted: the slot already holds `undefined` (or a `{value}` cell
                // if boxed), created at function entry; only an explicit
                // initializer assigns (a bare `var x;` after a write is a no-op).
                if let Some(e) = init {
                    out.push(ctx.var_write(name, e));
                    if ctx.once_cells.contains(name) {
                        if let Some(b) = ctx.scopes[0].get(name).copied().filter(|b| b.boxed && b.mapped.is_none()) {
                            out.push(Stmt::FinalCell(b.slot));
                        }
                    }
                } else if !ctx.script_globals.contains(name) {
                    ctx.declare_var(name);
                }
            } else {
                // A script's top-level `let`/`const`: the global binding.
                if script_global {
                    out.push(Stmt::SetGlobal(name.to_string(), init.unwrap_or(Expr::Undefined)));
                    continue;
                }
                if ctx.boxed_set.contains(name) {
                    self.init_boxed_lexical(name, init.unwrap_or(Expr::Undefined), ctx, out);
                    continue;
                }
                let slot = ctx.declare(name);
                out.push(Stmt::Let(slot, init.unwrap_or(Expr::Undefined)));
            }
            // A declared type, trusted, of an initialized variable.
            if self.trust_types && d.init.is_some() {
                if let ast::Pat::Ident(b) = &d.name {
                    if let Some(mask) = b.type_ann.as_ref().and_then(|a| crate::ts::type_mask(&a.type_ann)) {
                        if let Some(binding) = ctx.resolve_binding(name) {
                            if !binding.boxed && binding.mapped.is_none() {
                                out.push(Stmt::AssumeType(binding.slot, mask));
                            }
                        }
                    }
                }
            }
        }
        Ok(())
    }

    /// Lower `target = test ? cons : alt` (nested ternaries in the arms too) as
    /// `if (test) target = cons; else target = alt;`. A ternary assigned to a
    /// local is a two-way branch exactly like an `if`, so it gets the `if`
    /// treatment: control splits on a dynamic test and the arms rejoin with the
    /// usual join generalization, which keeps a static dispatch variable (an
    /// interpreter's `pc = c ? L1 : L2`) static on both paths instead of turning
    /// it into one dynamic value. `assign` builds the store for one arm's value.
    fn lower_cond_assign(
        &mut self,
        e: &ast::Expr,
        ctx: &mut FnCtx,
        assign: &dyn Fn(Expr) -> Stmt,
        out: &mut Vec<Stmt>,
    ) -> R<()> {
        match e {
            ast::Expr::Paren(p) => self.lower_cond_assign(&p.expr, ctx, assign, out),
            ast::Expr::Cond(c) => {
                let test = self.lower_expr(&c.test, ctx)?;
                let mut cons = vec![];
                self.lower_cond_assign(&c.cons, ctx, assign, &mut cons)?;
                let mut alt = vec![];
                self.lower_cond_assign(&c.alt, ctx, assign, &mut alt)?;
                out.push(Stmt::If(test, cons, alt));
                Ok(())
            }
            other => {
                let v = self.lower_expr(other, ctx)?;
                out.push(assign(v));
                Ok(())
            }
        }
    }

    fn lower_try(&mut self, t: &ast::TryStmt, ctx: &mut FnCtx, out: &mut Vec<Stmt>) -> R<()> {
        // A generator's native `finally` (see `FnCtx::native_finally`).
        if let (Some(fin), true) = (&t.finalizer, ctx.native_finally) {
            ctx.native_regions.push((ctx.break_depth, ctx.loop_depth));
            let mut body = Vec::new();
            let r = match &t.handler {
                Some(_) => {
                    let without_finally = ast::TryStmt { span: t.span, block: t.block.clone(), handler: t.handler.clone(), finalizer: None };
                    self.lower_try(&without_finally, ctx, &mut body)
                }
                None => {
                    ctx.push();
                    let r = self
                        .block_prologue(&t.block.stmts, ctx, &mut body)
                        .and_then(|_| t.block.stmts.iter().try_for_each(|st| self.lower_stmt(st, ctx, &mut body)));
                    ctx.pop();
                    r
                }
            };
            let mut finally_body = Vec::new();
            let r = r.and_then(|_| {
                ctx.push();
                let r = self
                    .block_prologue(&fin.stmts, ctx, &mut finally_body)
                    .and_then(|_| fin.stmts.iter().try_for_each(|st| self.lower_stmt(st, ctx, &mut finally_body)));
                ctx.pop();
                r
            });
            ctx.native_regions.pop();
            r?;
            out.push(Stmt::TryFinally { body, finally_body });
            return Ok(());
        }
        if let Some(fin) = &t.finalizer {
            // try { [try { B } catch (e) { C }] } catch (x) { kind = 2; val = x }
            // F; then resume the recorded completion.
            let kind = ctx.fresh_slot();
            let val = ctx.fresh_slot();
            let x = ctx.fresh_slot();
            out.push(Stmt::Let(kind, Expr::Num(JsNum::int(0))));
            out.push(Stmt::Let(val, Expr::Undefined));
            ctx.enter_breakable(false, None);
            ctx.finally_stack.push(FinRegion {
                kind,
                val,
                block_index: ctx.break_depth - 1,
                iter_depth: ctx.iter_stack.len(),
                loop_depth: ctx.loop_depth,
                deferred: Vec::new(),
            });
            let mut inner = Vec::new();
            let r = match &t.handler {
                Some(_) => {
                    let without_finally = ast::TryStmt { span: t.span, block: t.block.clone(), handler: t.handler.clone(), finalizer: None };
                    self.lower_try(&without_finally, ctx, &mut inner)
                }
                None => {
                    ctx.push();
                    let r = self
                        .block_prologue(&t.block.stmts, ctx, &mut inner)
                        .and_then(|_| t.block.stmts.iter().try_for_each(|st| self.lower_stmt(st, ctx, &mut inner)));
                    ctx.pop();
                    r
                }
            };
            let region = ctx.finally_stack.pop().unwrap();
            ctx.leave_breakable(false);
            r?;
            out.push(Stmt::Try {
                body: vec![Stmt::BreakableBlock(inner)],
                catch_slot: Some(x),
                catch_body: vec![Stmt::Set(kind, Expr::Num(JsNum::int(2))), Stmt::Set(val, Expr::Var(x))],
            });
            ctx.push();
            self.block_prologue(&fin.stmts, ctx, out)?;
            for st in &fin.stmts {
                self.lower_stmt(st, ctx, out)?;
            }
            ctx.pop();
            let is = |k: i64| Expr::Bin(Bop::Eq, Box::new(Expr::Var(kind)), Box::new(Expr::Num(JsNum::int(k))));
            let mut ret = Vec::new();
            self.lower_return(Expr::Var(val), ctx, &mut ret);
            out.push(Stmt::If(is(1), ret, vec![]));
            out.push(Stmt::If(is(2), vec![Stmt::Throw(Expr::Var(val))], vec![]));
            for (i, d) in region.deferred.iter().enumerate() {
                let mut arm = Vec::new();
                self.lower_stmt(d, ctx, &mut arm)?;
                out.push(Stmt::If(is(3 + i as i64), arm, vec![]));
            }
            return Ok(());
        }
        let handler = match &t.handler {
            Some(h) => h,
            None => return Err("a `try` without `catch` or `finally`".into()),
        };
        // try body, in its own scope
        ctx.push();
        let mut body = Vec::new();
        self.block_prologue(&t.block.stmts, ctx, &mut body)?;
        for st in &t.block.stmts {
            self.lower_stmt(st, ctx, &mut body)?;
        }
        ctx.pop();
        // catch body, with the (optional) exception binding in its own scope
        ctx.push();
        let mut catch_body = Vec::new();
        let catch_slot = match &handler.param {
            Some(ast::Pat::Ident(b)) => Some(ctx.declare(&b.id.sym)),
            Some(p) => {
                let slot = ctx.fresh_slot();
                self.bind_pat(p, Expr::Var(slot), BindKind::Lexical, ctx, &mut catch_body)?;
                Some(slot)
            }
            None => None,
        };
        // The catch block's own declarations live in a scope inside the
        // parameter's.
        ctx.push();
        self.block_prologue(&handler.body.stmts, ctx, &mut catch_body)?;
        for st in &handler.body.stmts {
            self.lower_stmt(st, ctx, &mut catch_body)?;
        }
        ctx.pop();
        ctx.pop();
        out.push(Stmt::Try { body, catch_slot, catch_body });
        Ok(())
    }

    /// Lower an expression used in statement position (assignments, calls, the
    /// `arr.push(x)` form).
    fn lower_expr_stmt(&mut self, e: &ast::Expr, ctx: &mut FnCtx, out: &mut Vec<Stmt>) -> R<()> {
        if let ast::Expr::Assign(a) = e {
            if let Some(thrown) = self.tdz_assign(a, ctx)? {
                out.push(Stmt::ExprStmt(thrown));
                return Ok(());
            }
        }
        match e {
            // `i++` / `--i` etc. in statement position (e.g. a `for` update): the
            // result value is discarded, so pre/post doesn't matter — it's just
            // `target = target ± 1`.
            ast::Expr::Update(u) => {
                let (stmts, _) = self.lower_update(u, false, ctx)?;
                out.extend(stmts);
            }
            ast::Expr::Assign(a)
                if matches!(a.op, ast::AssignOp::Assign)
                    && is_cond(&a.right)
                    && matches!(&a.left, ast::AssignTarget::Simple(ast::SimpleAssignTarget::Ident(bi))
                        if matches!(ctx.resolve_binding(bi.id.sym.as_str()), Some(b) if !b.boxed)) =>
            {
                // `x = c ? a : b` on a local is an `if` (see `lower_cond_assign`).
                let ast::AssignTarget::Simple(ast::SimpleAssignTarget::Ident(bi)) = &a.left else {
                    unreachable!()
                };
                let slot = ctx.resolve_binding(bi.id.sym.as_str()).unwrap().slot;
                self.lower_cond_assign(&a.right, ctx, &|v| Stmt::Set(slot, v), out)?;
            }
            // `x ||= e`, `x &&= e`, `x ??= e`: the expression form, its value
            // dropped.
            ast::Expr::Assign(a) if matches!(a.op, ast::AssignOp::OrAssign | ast::AssignOp::AndAssign | ast::AssignOp::NullishAssign) => {
                let e = self.lower_assign_expr(a, ctx)?;
                out.push(Stmt::ExprStmt(e));
            }
            // A compound assignment to a member: its base and key evaluated
            // once (the expression form keeps them in slots).
            ast::Expr::Assign(a)
                if !matches!(a.op, ast::AssignOp::Assign)
                    && matches!(&a.left, ast::AssignTarget::Simple(ast::SimpleAssignTarget::Member(_))) =>
            {
                let e = self.lower_assign_expr(a, ctx)?;
                out.push(Stmt::ExprStmt(e));
            }
            ast::Expr::Assign(a) => {
                // (`x = function () {}`: NamedEvaluation names it `x`.)
                let rhs = match (&a.op, &a.left) {
                    (ast::AssignOp::Assign, ast::AssignTarget::Simple(ast::SimpleAssignTarget::Ident(bi))) => {
                        self.lower_named(&a.right, bi.id.sym.as_str(), ctx)?
                    }
                    _ => self.lower_expr(&a.right, ctx)?,
                };
                // A compound assignment `t <op>= r` desugars to `t = t <op> r`.
                // Modeled arithmetic uses a folding `Bin`; everything else pure
                // (`/`, `%`, bitwise, shifts, `**`) passes through as `Opaque`.
                let op_combine: Option<Combine> = match a.op {
                    ast::AssignOp::Assign => None,
                    ast::AssignOp::AddAssign => Some(Combine::Bin(Bop::Add)),
                    ast::AssignOp::SubAssign => Some(Combine::Bin(Bop::Sub)),
                    ast::AssignOp::MulAssign => Some(Combine::Bin(Bop::Mul)),
                    ast::AssignOp::DivAssign => Some(Combine::Opaque("/")),
                    ast::AssignOp::ModAssign => Some(Combine::Opaque("%")),
                    ast::AssignOp::ExpAssign => Some(Combine::Opaque("**")),
                    // Bitwise / shift compound assignments fold like their binary
                    // forms (modeled `Bop`s), not opaque.
                    ast::AssignOp::BitAndAssign => Some(Combine::Bin(Bop::BitAnd)),
                    ast::AssignOp::BitOrAssign => Some(Combine::Bin(Bop::BitOr)),
                    ast::AssignOp::BitXorAssign => Some(Combine::Bin(Bop::BitXor)),
                    ast::AssignOp::LShiftAssign => Some(Combine::Bin(Bop::Shl)),
                    ast::AssignOp::RShiftAssign => Some(Combine::Bin(Bop::Shr)),
                    ast::AssignOp::ZeroFillRShiftAssign => Some(Combine::Bin(Bop::UShr)),
                    // `&&=` / `||=` / `??=` are short-circuiting (conditional
                    // assignment); their control flow is not modeled here.
                    other => return Err(format!("unsupported assignment operator {:?}", other)),
                };
                // resolve the target
                match &a.left {
                    ast::AssignTarget::Simple(ast::SimpleAssignTarget::Ident(bi)) => {
                        let name = bi.id.sym.as_str();
                        match ctx.resolve_binding(name) {
                            // (a boxed one writes through its cell)
                            Some(b) => {
                                let value = combine_assign(&op_combine, rhs, || b.read());
                                out.push(b.write(value));
                            }
                            // Assignment to an undeclared name = an implicit global
                            // write; passes through to the residual. (In strict
                            // code, to a name the script does not declare: the
                            // runtime's strict assignment, which throws if no
                            // global of that name exists then: `runtime.js`'s
                            // `__pe_strictSetGlobal`.)
                            None => {
                                let value = combine_assign(&op_combine, rhs, || {
                                    Expr::Global(name.to_string())
                                });
                                if ctx.strict && !ctx.script_globals.contains(name) {
                                    let helper = Expr::Global("__pe_strictSetGlobal".into());
                                    out.push(Stmt::ExprStmt(Expr::Call(Box::new(helper), vec![Expr::Str(name.to_string()), value])));
                                } else {
                                    out.push(Stmt::SetGlobal(name.to_string(), value));
                                }
                            }
                        }
                    }
                    ast::AssignTarget::Simple(ast::SimpleAssignTarget::Member(m)) => {
                        let obj = self.lower_expr(&m.obj, ctx)?;
                        match &m.prop {
                            ast::MemberProp::Ident(id) => {
                                let key = id.sym.to_string();
                                let value = combine_assign(&op_combine, rhs, || {
                                    Expr::Get(Box::new(obj.clone()), key.clone())
                                });
                                out.push(Stmt::SetProp(obj, key, value));
                            }
                            ast::MemberProp::Computed(c) => {
                                let idx = self.lower_expr(&c.expr, ctx)?;
                                let value = combine_assign(&op_combine, rhs, || {
                                    Expr::Index(Box::new(obj.clone()), Box::new(idx.clone()))
                                });
                                out.push(Stmt::SetIndex(obj, idx, value));
                            }
                            ast::MemberProp::PrivateName(p) => {
                                let f = |old: Expr, r: Expr| combine_assign(&op_combine, r, || old);
                                let combine: Option<&dyn Fn(Expr, Expr) -> Expr> = if op_combine.is_some() { Some(&f) } else { None };
                                let e = self.private_assign(obj, &p.name, rhs, combine, ctx)?;
                                out.push(Stmt::ExprStmt(e));
                            }
                        }
                    }
                    ast::AssignTarget::Pat(p) if op_combine.is_none() => {
                        let pat: ast::Pat = match p {
                            ast::AssignTargetPat::Array(x) => ast::Pat::Array(x.clone()),
                            ast::AssignTargetPat::Object(x) => ast::Pat::Object(x.clone()),
                            ast::AssignTargetPat::Invalid(_) => return Err("invalid assignment target".into()),
                        };
                        let t = ctx.fresh_slot();
                        out.push(Stmt::Let(t, rhs));
                        self.bind_pat(&pat, Expr::Var(t), BindKind::Assign, ctx, out)?;
                    }
                    _ => return Err("unsupported assignment target".into()),
                }
            }
            ast::Expr::Call(c) => {
                // `arr.push(x)` with one plain argument has its own statement
                // (the specializer appends to a modeled array directly); any
                // other call, `push` with several or spread arguments
                // included, is an ordinary call.
                if let Some((arr, args)) = self.as_push_call(c, ctx)? {
                    out.push(Stmt::Push(arr, args.into_iter().next().unwrap()));
                } else {
                    let call = self.lower_call(c, ctx)?;
                    out.push(Stmt::ExprStmt(call));
                }
            }
            // `delete obj.k` / `delete obj[i]` as a statement (the common form).
            ast::Expr::Unary(u) if matches!(u.op, ast::UnaryOp::Delete) && continues_chain(&u.arg) => {
                let v = self.lower_delete_chain(&u.arg, ctx)?;
                out.push(Stmt::ExprStmt(v));
            }
            ast::Expr::Unary(u) if matches!(u.op, ast::UnaryOp::Delete) => {
                let member = match &*u.arg {
                    ast::Expr::Member(m) => m,
                    _ => return Err("`delete` of a non-member expression is not supported".into()),
                };
                let obj = self.lower_expr(&member.obj, ctx)?;
                match &member.prop {
                    ast::MemberProp::Ident(id) => {
                        out.push(Stmt::DeleteProp(obj, id.sym.to_string()));
                    }
                    ast::MemberProp::Computed(c) => {
                        let idx = self.lower_expr(&c.expr, ctx)?;
                        out.push(Stmt::DeleteIndex(obj, idx));
                    }
                    ast::MemberProp::PrivateName(_) => {
                        return Err("`delete` of a private name is a SyntaxError".into())
                    }
                }
            }
            ast::Expr::Paren(p) => self.lower_expr_stmt(&p.expr, ctx, out)?,
            other => {
                // any other expression statement: lower as a (side-effect-free) expr
                let lowered = self.lower_expr(other, ctx)?;
                out.push(Stmt::ExprStmt(lowered));
            }
        }
        Ok(())
    }

    // ---- expressions ----

    fn lower_expr(&mut self, e: &ast::Expr, ctx: &mut FnCtx) -> R<Expr> {
        match e {
            ast::Expr::Lit(lit) => lower_lit(lit),
            ast::Expr::Ident(id) => self.lower_ident(id.sym.as_str(), ctx),
            ast::Expr::Paren(p) => self.lower_expr(&p.expr, ctx),
            // `#x in obj`: does `obj` have the private name?
            ast::Expr::Bin(b) if b.op == ast::BinaryOp::In && matches!(&*b.left, ast::Expr::PrivateName(_)) => {
                let ast::Expr::PrivateName(p) = &*b.left else { unreachable!() };
                let obj = self.lower_expr(&b.right, ctx)?;
                self.private_in(&p.name, obj, ctx)
            }
            ast::Expr::Bin(b) => {
                // Operators we model and constant-fold:
                let modeled = match b.op {
                    ast::BinaryOp::Add => Some(Bop::Add),
                    ast::BinaryOp::Sub => Some(Bop::Sub),
                    ast::BinaryOp::Mul => Some(Bop::Mul),
                    ast::BinaryOp::Lt => Some(Bop::Lt),
                    ast::BinaryOp::LtEq => Some(Bop::Le),
                    ast::BinaryOp::Gt => Some(Bop::Gt),
                    ast::BinaryOp::GtEq => Some(Bop::Ge),
                    ast::BinaryOp::EqEqEq => Some(Bop::Eq),
                    ast::BinaryOp::NotEqEq => Some(Bop::Ne),
                    // Bitwise / shift: modeled so they fold on static integers
                    // (JS 32-bit semantics) and residualize when dynamic.
                    ast::BinaryOp::BitAnd => Some(Bop::BitAnd),
                    ast::BinaryOp::BitOr => Some(Bop::BitOr),
                    ast::BinaryOp::BitXor => Some(Bop::BitXor),
                    ast::BinaryOp::LShift => Some(Bop::Shl),
                    ast::BinaryOp::RShift => Some(Bop::Shr),
                    ast::BinaryOp::ZeroFillRShift => Some(Bop::UShr),
                    _ => None,
                };
                let l = self.lower_expr(&b.left, ctx)?;
                let r = self.lower_expr(&b.right, ctx)?;
                if let Some(op) = modeled {
                    return Ok(Expr::Bin(op, Box::new(l), Box::new(r)));
                }
                // Operators we don't model but that are pure over primitives:
                // pass them through verbatim (the operands are still specialized).
                let token = match b.op {
                    ast::BinaryOp::Div => "/",
                    ast::BinaryOp::Mod => "%",
                    ast::BinaryOp::Exp => "**",
                    ast::BinaryOp::LogicalAnd => "&&",
                    ast::BinaryOp::LogicalOr => "||",
                    ast::BinaryOp::NullishCoalescing => "??",
                    ast::BinaryOp::EqEq => "==",
                    ast::BinaryOp::NotEq => "!=",
                    // `in` / `instanceof` are pure (no mutation); an object
                    // operand escapes, then the test passes through verbatim.
                    ast::BinaryOp::In => "in",
                    ast::BinaryOp::InstanceOf => "instanceof",
                    other => return Err(format!("unsupported binary operator {:?}", other)),
                };
                Ok(Expr::Opaque(token.to_string(), vec![l, r]))
            }
            ast::Expr::Unary(u) => match u.op {
                ast::UnaryOp::Minus => {
                    // Unary minus is its own (foldable) operator: `0 - x` would
                    // give `+0` for `x = 0`, where JS gives `-0`.
                    let arg = self.lower_expr(&u.arg, ctx)?;
                    Ok(Expr::Opaque("-".to_string(), vec![arg]))
                }
                // Unary `+x` is `ToNumber(x)`, exactly `x - 0` (unary `-` is
                // `0 - x`). Lowering it this way means the coercion is real (the
                // old identity lowering silently dropped it) and folds through the
                // same numeric-coercion path as subtraction.
                ast::UnaryOp::Plus => {
                    let arg = self.lower_expr(&u.arg, ctx)?;
                    Ok(Expr::Bin(Bop::Sub, Box::new(arg), Box::new(Expr::Num(JsNum::int(0)))))
                }
                // Pure unary operators pass through. (`void e` evaluates `e` and
                // yields undefined; emitting `(void e)` preserves both.)
                ast::UnaryOp::Bang
                | ast::UnaryOp::Tilde
                | ast::UnaryOp::TypeOf
                | ast::UnaryOp::Void => {
                    let token = match u.op {
                        ast::UnaryOp::Bang => "!",
                        ast::UnaryOp::Tilde => "~",
                        ast::UnaryOp::TypeOf => "typeof",
                        ast::UnaryOp::Void => "void",
                        _ => unreachable!(),
                    };
                    let arg = self.lower_expr(&u.arg, ctx)?;
                    Ok(Expr::Opaque(token.to_string(), vec![arg]))
                }
                ast::UnaryOp::Delete => match &*u.arg {
                    e if continues_chain(e) => self.lower_delete_chain(e, ctx),
                    ast::Expr::Member(m) => {
                        let obj = self.lower_expr(&m.obj, ctx)?;
                        let key = match &m.prop {
                            ast::MemberProp::Ident(id) => Expr::Str(id.sym.to_string()),
                            ast::MemberProp::Computed(c) => self.lower_expr(&c.expr, ctx)?,
                            ast::MemberProp::PrivateName(_) => return Err("`delete` of a private name is a SyntaxError".into()),
                        };
                        Ok(Expr::DeleteValue(Box::new(obj), Box::new(key)))
                    }
                    ast::Expr::Paren(p) if matches!(&*p.expr, ast::Expr::Member(_)) => {
                        let inner = ast::UnaryExpr { span: u.span, op: u.op, arg: p.expr.clone() };
                        self.lower_expr(&ast::Expr::Unary(inner), ctx)
                    }
                    // `delete x` of a binding (sloppy only): false for a
                    // declared variable, a global property delete otherwise.
                    ast::Expr::Ident(_) => Err("`delete` of a variable is not supported".into()),
                    // `delete e` of a value: `e` is evaluated, the result is true.
                    e => {
                        let v = self.lower_expr(e, ctx)?;
                        Ok(Expr::Seq(vec![Stmt::ExprStmt(v)], Box::new(Expr::Bool(true))))
                    }
                },
            },
            // An optional chain, and a member access or call continuing one
            // (`a?.b.c` short-circuits as a whole).
            ast::Expr::OptChain(_) => self.lower_opt_chain(e, ctx),
            ast::Expr::Member(m) if continues_chain(&m.obj) => self.lower_opt_chain(e, ctx),
            ast::Expr::Call(c) if matches!(&c.callee, ast::Callee::Expr(f) if continues_chain(f)) => self.lower_opt_chain(e, ctx),
            ast::Expr::Member(m) => {
                let obj = self.lower_expr(&m.obj, ctx)?;
                match &m.prop {
                    ast::MemberProp::Ident(id) => Ok(Expr::Get(Box::new(obj), id.sym.to_string())),
                    ast::MemberProp::Computed(c) => {
                        let idx = self.lower_expr(&c.expr, ctx)?;
                        Ok(Expr::Index(Box::new(obj), Box::new(idx)))
                    }
                    ast::MemberProp::PrivateName(p) => self.private_get(obj, &p.name, ctx),
                }
            }
            ast::Expr::Array(a) => {
                // Elisions (`[1, , 3]`): the elements with `undefined` there,
                // then those indices deleted (holes).
                if a.elems.iter().any(|e| e.is_none()) {
                    if a.elems.iter().flatten().any(|e| e.spread.is_some()) {
                        return Err("an array literal with both holes and spread elements is not supported yet".into());
                    }
                    let mut elems = Vec::with_capacity(a.elems.len());
                    for el in &a.elems {
                        elems.push(match el {
                            Some(e) => self.lower_expr(&e.expr, ctx)?,
                            None => Expr::Undefined,
                        });
                    }
                    let t = ctx.fresh_slot();
                    let mut stmts = vec![Stmt::Let(t, Expr::Array(elems))];
                    for (i, el) in a.elems.iter().enumerate() {
                        if el.is_none() {
                            stmts.push(Stmt::DeleteIndex(Expr::Var(t), Expr::Num(JsNum::int(i as i64))));
                        }
                    }
                    return Ok(Expr::Seq(stmts, Box::new(Expr::Var(t))));
                }
                if a.elems.iter().flatten().any(|e| e.spread.is_some()) {
                    let elems: Vec<&ast::ExprOrSpread> = a.elems.iter().flatten().collect();
                    return self.lower_spread_array(&elems, ctx);
                }
                let mut out = Vec::with_capacity(a.elems.len());
                for el in a.elems.iter().flatten() {
                    out.push(self.lower_expr(&el.expr, ctx)?);
                }
                Ok(Expr::Array(out))
            }
            ast::Expr::Object(o) => {
                // Leading plain `key: value` properties build the object;
                // anything else (methods, accessors, computed keys, spread,
                // `__proto__`), and everything after it, is defined in order.
                // A method, getter or setter of it that reads a `super`
                // property reads it from this object's prototype: the object
                // is its home object, which its functions capture as a cell
                // filled once the object is made (as a constructor's is).
                let reads_super = o.props.iter().any(|p| match p {
                    ast::PropOrSpread::Prop(prop) => match &**prop {
                        ast::Prop::Method(m) => m.function.body.as_ref().is_some_and(|b| super_prop_in(&b.stmts)),
                        ast::Prop::Getter(g) => g.body.as_ref().is_some_and(|b| super_prop_in(&b.stmts)),
                        ast::Prop::Setter(st) => st.body.as_ref().is_some_and(|b| super_prop_in(&b.stmts)),
                        _ => false,
                    },
                    _ => false,
                });
                if reads_super && !ctx.object_home {
                    ctx.push();
                    let cell = ctx.declare_boxed("%objhome", true);
                    ctx.scopes.last_mut().unwrap().insert("%home".into(), Binding { slot: cell, boxed: true, mapped: None });
                    ctx.object_home = true;
                    let made = self.lower_expr(e, ctx);
                    ctx.object_home = false;
                    let object = ctx.fresh_slot();
                    ctx.pop();
                    let stmts = vec![
                        Stmt::Let(cell, Expr::Object(vec![("value".into(), Expr::Undefined)])),
                        Stmt::Let(object, made?),
                        Stmt::SetProp(Expr::Var(cell), "value".into(), Expr::Var(object)),
                    ];
                    return Ok(Expr::Seq(stmts, Box::new(Expr::Var(object))));
                }
                ctx.object_home = false;
                let mut fields = Vec::with_capacity(o.props.len());
                let mut defs: Vec<PropDef> = Vec::new();
                for p in &o.props {
                    match p {
                        ast::PropOrSpread::Prop(prop) => match &**prop {
                            ast::Prop::KeyValue(kv) => {
                                let is_proto = matches!(&kv.key, ast::PropName::Ident(i) if i.sym == *"__proto__")
                                    || matches!(&kv.key, ast::PropName::Str(st) if st.value == *"__proto__");
                                if is_proto {
                                    let value = self.lower_expr(&kv.value, ctx)?;
                                    defs.push(PropDef::Proto(value));
                                    continue;
                                }
                                let (key, slot) = self.lower_prop_key_named(&kv.key, ctx)?;
                                // (An anonymous function is named after its key.)
                                let value = match (&key, slot) {
                                    (PropKey::Static(k), _) => self.lower_named(&kv.value, &k.clone(), ctx)?,
                                    (_, Some(sl)) if is_anonymous_fn(&kv.value) => {
                                        let v = self.lower_expr(&kv.value, ctx)?;
                                        self.named_after_key(v, sl, "", ctx)
                                    }
                                    _ => self.lower_expr(&kv.value, ctx)?,
                                };
                                match key {
                                    PropKey::Static(k) if defs.is_empty() => fields.push((k, value)),
                                    key => defs.push(PropDef::Data { key, value, attrs: DEFAULT_ATTRS }),
                                }
                            }
                            ast::Prop::Shorthand(id) => {
                                let name = id.sym.to_string();
                                let value = self.lower_ident(&name, ctx)?;
                                if defs.is_empty() {
                                    fields.push((name, value));
                                } else {
                                    defs.push(PropDef::Data { key: PropKey::Static(name), value, attrs: DEFAULT_ATTRS });
                                }
                            }
                            ast::Prop::Method(m) => {
                                let (key, slot) = self.lower_prop_key_named(&m.key, ctx)?;
                                let params: Vec<ast::Pat> = m.function.params.iter().map(|p| p.pat.clone()).collect();
                                let body = m.function.body.as_ref().map(|b| b.stmts.clone()).unwrap_or_default();
                                let mkind = if m.function.is_generator { FnKind::Generator } else { FnKind::Method };
                                let opts = LiftOpts::new(mkind)
                                    .named(method_name(&key, ""))
                                    .asynchronous(m.function.is_async)
                                    .source(FnNode::Method(m.clone()));
                                let (fid, caps) = self.lift_arrow(&params, ArrowBody::BlockOwned(body), ctx, opts)?;
                                let mut value = Expr::Closure(fid, self.capture_exprs(&caps, ctx)?);
                                if let Some(sl) = slot {
                                    value = self.named_after_key(value, sl, "", ctx);
                                }
                                defs.push(PropDef::Data { key, value, attrs: DEFAULT_ATTRS });
                            }
                            ast::Prop::Getter(g) => {
                                let (key, slot) = self.lower_prop_key_named(&g.key, ctx)?;
                                let body = g.body.as_ref().map(|b| b.stmts.clone()).unwrap_or_default();
                                let (fid, caps) = self.lift_arrow(&[], ArrowBody::BlockOwned(body), ctx, LiftOpts::new(FnKind::Method).named(method_name(&key, "get ")))?;
                                let mut func = Expr::Closure(fid, self.capture_exprs(&caps, ctx)?);
                                if let Some(sl) = slot {
                                    func = self.named_after_key(func, sl, "get ", ctx);
                                }
                                defs.push(PropDef::Accessor { key, getter: true, func, attrs: ATTR_ENUMERABLE | ATTR_CONFIGURABLE });
                            }
                            ast::Prop::Setter(st) => {
                                let (key, slot) = self.lower_prop_key_named(&st.key, ctx)?;
                                let body = st.body.as_ref().map(|b| b.stmts.clone()).unwrap_or_default();
                                let params = vec![(*st.param).clone()];
                                let (fid, caps) = self.lift_arrow(&params, ArrowBody::BlockOwned(body), ctx, LiftOpts::new(FnKind::Method).named(method_name(&key, "set ")))?;
                                let mut func = Expr::Closure(fid, self.capture_exprs(&caps, ctx)?);
                                if let Some(sl) = slot {
                                    func = self.named_after_key(func, sl, "set ", ctx);
                                }
                                defs.push(PropDef::Accessor { key, getter: false, func, attrs: ATTR_ENUMERABLE | ATTR_CONFIGURABLE });
                            }
                            ast::Prop::Assign(_) => return Err("invalid object literal property `a = b`".into()),
                        },
                        ast::PropOrSpread::Spread(sp) => {
                            let e = self.lower_expr(&sp.expr, ctx)?;
                            defs.push(PropDef::Spread(e));
                        }
                    }
                }
                if defs.is_empty() {
                    Ok(Expr::Object(fields))
                } else {
                    Ok(Expr::DefineProps(Box::new(Expr::Object(fields)), defs))
                }
            }
            ast::Expr::Call(c) => self.lower_call(c, ctx),
            ast::Expr::Arrow(a) => {
                let body = match &*a.body {
                    ast::BlockStmtOrExpr::BlockStmt(b) => ArrowBody::Block(&b.stmts),
                    ast::BlockStmtOrExpr::Expr(e) => ArrowBody::Expr(e),
                };
                let hint = ctx.name_hint.take().unwrap_or_default();
                let opts = LiftOpts::new(FnKind::Arrow).named(hint).asynchronous(a.is_async).source(FnNode::Arrow(a.clone()));
                let (fid, captures) = self.lift_arrow(&a.params, body, ctx, opts)?;
                let caps = self.capture_exprs(&captures, ctx)?;
                Ok(Expr::Closure(fid, caps))
            }
            ast::Expr::Fn(f) => {
                let js_name = f.ident.as_ref().map(|i| i.sym.to_string()).or_else(|| ctx.name_hint.clone()).unwrap_or_default();
                if let Some(v) = self.verbatim_fn(&f.function, f.ident.clone(), &js_name, ctx, false)? {
                    ctx.name_hint = None;
                    return Ok(v);
                }
                let params: Vec<ast::Pat> =
                    f.function.params.iter().map(|p| p.pat.clone()).collect();
                let body_stmts = match &f.function.body {
                    Some(b) => b.stmts.clone(),
                    None => return Err("function expression without a body".into()),
                };
                // A named function expression's name is in scope only inside its
                // own body, bound to the function itself. If the body refers to
                // it, it is a binding (a cell) of a scope around the function,
                // set right after the function is made.
                if let Some(id) = &f.ident {
                    let name = id.sym.to_string();
                    if free_vars(&params, &body_stmts).contains(&name) {
                        let param_refs: Vec<&ast::Pat> = params.iter().collect();
                        if scope::analyze(&param_refs, scope::Body::Stmts(&body_stmts), false).assigned.contains(&name) {
                            return Err(format!(
                                "assigning to a named function expression's own name `{name}` (immutable) is not supported"
                            ));
                        }
                        ctx.push();
                        let cell = ctx.declare_boxed(&name, true);
                        let mut stmts = vec![Stmt::Let(cell, Expr::Object(vec![("value".into(), Expr::Undefined)]))];
                        let kind = if f.function.is_generator { FnKind::Generator } else { FnKind::Normal };
                        let opts = LiftOpts::new(kind)
                            .named(name.clone())
                            .asynchronous(f.function.is_async)
                            .source(FnNode::Function { func: (*f.function).clone(), own_name: f.ident.clone() });
                        let lifted = self.lift_arrow(&params, ArrowBody::BlockOwned(body_stmts), ctx, opts);
                        let closure = lifted.and_then(|(fid, captures)| Ok(Expr::Closure(fid, self.capture_exprs(&captures, ctx)?)));
                        ctx.pop();
                        stmts.push(Stmt::SetProp(Expr::Var(cell), "value".into(), closure?));
                        ctx.name_hint = None;
                        return Ok(Expr::Seq(stmts, Box::new(Expr::Get(Box::new(Expr::Var(cell)), "value".into()))));
                    }
                }
                let (fid, captures) =
                    {
                        let hint = ctx.name_hint.take().unwrap_or_default();
                        let name = f.ident.as_ref().map(|i| i.sym.to_string()).unwrap_or(hint);
                        let kind = if f.function.is_generator { FnKind::Generator } else { FnKind::Normal };
                        let opts = LiftOpts::new(kind)
                            .named(name)
                            .asynchronous(f.function.is_async)
                            .source(FnNode::Function { func: (*f.function).clone(), own_name: f.ident.clone() });
                        self.lift_arrow(&params, ArrowBody::BlockOwned(body_stmts), ctx, opts)?
                    };
                let caps = self.capture_exprs(&captures, ctx)?;
                Ok(Expr::Closure(fid, caps))
            }
            ast::Expr::Cond(c) => {
                // `test ? cons : alt` passes through; operands are specialized.
                let test = self.lower_expr(&c.test, ctx)?;
                let cons = self.lower_expr(&c.cons, ctx)?;
                let alt = self.lower_expr(&c.alt, ctx)?;
                Ok(Expr::Opaque("?:".to_string(), vec![test, cons, alt]))
            }
            // `a${x}b`: the cooked strings and each substitution's `ToString`.
            ast::Expr::Tpl(t) => {
                let cooked = |q: &ast::TplElement| -> R<Expr> {
                    q.cooked.as_ref().map(string_value).ok_or_else(|| "a template with an invalid escape".to_string())
                };
                let mut acc = cooked(&t.quasis[0])?;
                for (i, e) in t.exprs.iter().enumerate() {
                    let v = Expr::Opaque(TEMPLATE_TO_STRING.into(), vec![self.lower_expr(e, ctx)?]);
                    acc = Expr::Bin(Bop::Add, Box::new(acc), Box::new(v));
                    let q = cooked(&t.quasis[i + 1])?;
                    if !matches!(&q, Expr::Str(t) if t.is_empty()) {
                        acc = Expr::Bin(Bop::Add, Box::new(acc), Box::new(q));
                    }
                }
                Ok(acc)
            }
            ast::Expr::New(n) => {
                let callee = self.lower_expr(&n.callee, ctx)?;
                let mut args = Vec::new();
                if let Some(arg_list) = &n.args {
                    if arg_list.iter().any(|a| a.spread.is_some()) {
                        // `new C(...xs)` is `Reflect.construct(C, [...xs])`.
                        let elems: Vec<&ast::ExprOrSpread> = arg_list.iter().collect();
                        let arr = self.lower_spread_array(&elems, ctx)?;
                        return Ok(Expr::Call(
                            Box::new(Expr::Get(Box::new(Expr::Global("Reflect".into())), "construct".into())),
                            vec![callee, arr],
                        ));
                    }
                    for a in arg_list {
                        args.push(self.lower_expr(&a.expr, ctx)?);
                    }
                }
                Ok(Expr::New(Box::new(callee), args))
            }
            // Inside an arrow (or a function containing one), `this` is the
            // captured local of the enclosing non-arrow function.
            ast::Expr::This(_) => Ok(self.lower_this(ctx)),
            ast::Expr::Class(c) => {
                let name = c.ident.as_ref().map(|i| i.sym.to_string());
                self.lower_class(&c.class, name.as_deref(), ctx)
            }
            // `super.x` / `super[x]`: a read from the home object's prototype
            // with `this` as the receiver (an accessor's `this`):
            // `__pe_superGet(home, key, this)`.
            ast::Expr::SuperProp(sp) => {
                let home = ctx.resolve_binding("%home").ok_or("`super` property outside a method")?;
                // (A constructor's is a cell: see `lower_class`.)
                let home = if home.boxed { Expr::Get(Box::new(Expr::Var(home.slot)), "value".into()) } else { Expr::Var(home.slot) };
                let key = match &sp.prop {
                    ast::SuperProp::Ident(id) => Expr::Str(id.sym.to_string()),
                    ast::SuperProp::Computed(c) => self.lower_expr(&c.expr, ctx)?,
                };
                Ok(Expr::Call(Box::new(Expr::Global(SUPER_GET_HELPER.into())), vec![home, key, self.lower_this(ctx)]))
            }
            ast::Expr::MetaProp(m) if matches!(m.kind, ast::MetaPropKind::NewTarget) => Ok(Expr::NewTarget),
            ast::Expr::Await(a) => {
                if !ctx.is_async {
                    return Err("`await` outside an async function (top-level await is not supported)".into());
                }
                let v = self.lower_expr(&a.arg, ctx)?;
                Ok(Expr::Await(Box::new(v)))
            }
            ast::Expr::Yield(y) if !y.delegate => {
                let v = match &y.arg {
                    Some(e) => self.lower_expr(e, ctx)?,
                    None => Expr::Undefined,
                };
                Ok(Expr::Yield(Box::new(v)))
            }
            // `yield* e`: yield each value of `e`'s iterator, passing what each
            // `next(v)` brings back into the inner iterator; the value is the
            // inner iterator's return value.
            ast::Expr::Yield(y) => {
                let inner = self.lower_expr(y.arg.as_ref().ok_or("`yield*` without an operand")?, ctx)?;
                let it = ctx.fresh_slot();
                let received = ctx.fresh_slot();
                let r = ctx.fresh_slot();
                let result = ctx.fresh_slot();
                let stmts = vec![
                    Stmt::Let(it, Expr::GetIter(Box::new(inner))),
                    Stmt::Let(received, Expr::Undefined),
                    Stmt::Let(result, Expr::Undefined),
                    Stmt::While(
                        Expr::Bool(true),
                        vec![
                            Stmt::Let(
                                r,
                                Expr::Call(Box::new(Expr::Get(Box::new(Expr::Var(it)), "next".into())), vec![Expr::Var(received)]),
                            ),
                            Stmt::If(
                                Expr::Get(Box::new(Expr::Var(r)), "done".into()),
                                vec![Stmt::Set(result, Expr::Get(Box::new(Expr::Var(r)), "value".into())), Stmt::Break],
                                vec![],
                            ),
                            Stmt::Set(received, Expr::Yield(Box::new(Expr::Get(Box::new(Expr::Var(r)), "value".into())))),
                        ],
                    ),
                ];
                Ok(Expr::Seq(stmts, Box::new(Expr::Var(result))))
            }
            ast::Expr::Update(u) => {
                // `place++` / `++place` used for its value.
                let (stmts, v) = self.lower_update(u, true, ctx)?;
                Ok(Expr::Seq(stmts, Box::new(v)))
            }
            ast::Expr::Assign(a) => self.lower_assign_expr(a, ctx),
            // `a, b, c`: evaluate each, the value is the last.
            ast::Expr::Seq(sq) => {
                let mut stmts = Vec::new();
                for e in &sq.exprs[..sq.exprs.len() - 1] {
                    self.lower_expr_stmt(e, ctx, &mut stmts)?;
                }
                let last = self.lower_expr(sq.exprs.last().ok_or("empty sequence expression")?, ctx)?;
                Ok(Expr::Seq(stmts, Box::new(last)))
            }
            ast::Expr::TaggedTpl(t) => self.lower_tagged_template(t, ctx),
            other => Err(format!("unsupported expression: {:?}", other)),
        }
    }

    /// A tagged template, ``tag`a${x}b` ``: `tag(strings, x)`, a method call
    /// when the tag is a member. `strings` is the site's template object:
    /// the cooked strings (`undefined` for one with an invalid escape),
    /// frozen, with the frozen raw strings as `raw`; one object for the
    /// site, however often it is evaluated (the prelude's `__pe_template`
    /// keeps it).
    fn lower_tagged_template(&mut self, t: &ast::TaggedTpl, ctx: &mut FnCtx) -> R<Expr> {
        let site = self.template_sites;
        self.template_sites += 1;
        let tag = self.lower_expr(&t.tag, ctx)?;
        let cooked: Vec<Expr> = t.tpl.quasis.iter().map(|q| q.cooked.as_ref().map_or(Expr::Undefined, string_value)).collect();
        // (A line end in the source is a line feed in the raw string.)
        let raw: Vec<Expr> = t.tpl.quasis.iter().map(|q| Expr::Str(q.raw.replace("\r\n", "\n").replace('\r', "\n"))).collect();
        let keeper = *self.name_to_fid.get("__pe_template").ok_or("internal: the prelude's `__pe_template` is missing")?;
        let strings = Expr::Call(Box::new(Expr::Func(keeper)), vec![Expr::Num(JsNum(site as f64)), Expr::Array(cooked), Expr::Array(raw)]);
        let mut args = vec![strings];
        for e in &t.tpl.exprs {
            args.push(self.lower_expr(e, ctx)?);
        }
        Ok(Expr::Call(Box::new(tag), args))
    }

    fn lower_ident(&self, name: &str, ctx: &mut FnCtx) -> R<Expr> {
        if ctx.in_tdz(name) {
            return self.tdz_error(name);
        }
        if let Some(b) = ctx.resolve_binding(name) {
            // A boxed variable lives in a cell; read through it.
            Ok(b.read())
        } else if let Some(&fid) = self.name_to_fid.get(name) {
            Ok(Expr::Func(fid))
        } else if name == "undefined" {
            Ok(Expr::Undefined)
        // (Non-writable, non-configurable properties of the global object.)
        } else if name == "NaN" {
            Ok(Expr::Num(JsNum(f64::NAN)))
        } else if name == "Infinity" {
            Ok(Expr::Num(JsNum(f64::INFINITY)))
        } else if name == "arguments" {
            // `arguments` reads from a per-function slot the engine fills with
            // the actual call args (see `FuncDef::arguments_slot`). Reserved
            // lazily so only functions that use it pay for it.
            Ok(Expr::Var(ctx.arguments_slot_or_reserve()))
        } else if ctx.outer_names.contains(name) {
            Err(format!(
                "identifier `{name}` is captured from an enclosing scope; closures \
                 capturing outer variables are not supported in this subset"
            ))
        } else {
            // Not a local, a known function, or a capture: treat it as a runtime
            // global (e.g. `Math`, `parseInt`) and let it pass through.
            Ok(Expr::Global(name.to_string()))
        }
    }

    fn lower_call(&mut self, c: &ast::CallExpr, ctx: &mut FnCtx) -> R<Expr> {
        // A direct `eval(...)` runs its code in this function's scope, which
        // specialization renames and removes: only code that cannot tell
        // (see `eval_code_is_scope_free`) runs, as an indirect eval.
        if let ast::Callee::Expr(e) = &c.callee {
            if let ast::Expr::Ident(id) = &**e {
                if &*id.sym == "eval" && ctx.resolve_binding("eval").is_none() && !self.name_to_fid.contains_key("eval") {
                    let code = c.args.first().filter(|a| a.spread.is_none()).and_then(|a| match unparen(&a.expr) {
                        ast::Expr::Lit(ast::Lit::Str(st)) => Some(st.value.to_string_lossy().into_owned()),
                        ast::Expr::Tpl(t) if t.exprs.is_empty() => t.quasis.first().and_then(|q| q.cooked.as_ref()).map(|c| c.to_string_lossy().into_owned()),
                        _ => None,
                    });
                    let scope_free = !ctx.strict && code.as_deref().is_some_and(|code| self.eval_code_is_scope_free(code, ctx));
                    if !scope_free {
                        return Err("direct `eval(...)` of code that may use the caller's scope is not supported; an indirect `(0, eval)(...)` is".into());
                    }
                }
            }
        }
        // The callee is lowered like any expression: a known function name
        // becomes `Func`/`Var` (a modeled, inlinable call); a member access
        // (`recv.method`) becomes a `Get`, and an unknown name a `Global`, both
        // of which evaluate to a dynamic callee and pass the call through.
        // (`arr.push(x)` in statement position is special-cased earlier.)
        if c.args.iter().any(|a| a.spread.is_some()) {
            // `f(...xs)` is `f.apply(undefined, [...xs])`; `o.m(...xs)` is
            // `o.m.apply(o, [...xs])` with `o` evaluated once.
            let callee_ast = match &c.callee {
                ast::Callee::Expr(e) => unparen(e),
                ast::Callee::Super(_) => {
                    let elems: Vec<&ast::ExprOrSpread> = c.args.iter().collect();
                    let arr = self.lower_spread_array(&elems, ctx)?;
                    let stmts = self.lower_super_call(ctx, SuperArgs::Spread(arr))?;
                    return Ok(Expr::Seq(stmts, Box::new(self.lower_this(ctx))));
                }
                ast::Callee::Import(_) => return Err("`import(...)` is not supported".into()),
            };
            let (pre, func, this) = match callee_ast {
                ast::Expr::Member(m) => {
                    let o = self.lower_expr(&m.obj, ctx)?;
                    let t = ctx.fresh_slot();
                    let func = match &m.prop {
                        ast::MemberProp::Ident(id) => Expr::Get(Box::new(Expr::Var(t)), id.sym.to_string()),
                        ast::MemberProp::Computed(cp) => {
                            Expr::Index(Box::new(Expr::Var(t)), Box::new(self.lower_expr(&cp.expr, ctx)?))
                        }
                        ast::MemberProp::PrivateName(p) => {
                            let (pre, f) = self.private_get_on(t, &p.name, ctx)?;
                            let mut stmts = vec![Stmt::Let(t, o)];
                            stmts.extend(pre);
                            let elems: Vec<&ast::ExprOrSpread> = c.args.iter().collect();
                            let arr = self.lower_spread_array(&elems, ctx)?;
                            let call = Expr::Call(Box::new(Expr::Get(Box::new(f), "apply".into())), vec![Expr::Var(t), arr]);
                            return Ok(Expr::Seq(stmts, Box::new(call)));
                        }
                    };
                    (vec![Stmt::Let(t, o)], func, Expr::Var(t))
                }
                e => (vec![], self.lower_expr(e, ctx)?, Expr::Undefined),
            };
            let elems: Vec<&ast::ExprOrSpread> = c.args.iter().collect();
            let arr = self.lower_spread_array(&elems, ctx)?;
            let call = Expr::Call(Box::new(Expr::Get(Box::new(func), "apply".into())), vec![this, arr]);
            return Ok(if pre.is_empty() { call } else { Expr::Seq(pre, Box::new(call)) });
        }
        let mut args = Vec::with_capacity(c.args.len());
        for a in &c.args {
            args.push(self.lower_expr(&a.expr, ctx)?);
        }
        let callee = match &c.callee {
            ast::Callee::Super(_) => {
                let stmts = self.lower_super_call(ctx, SuperArgs::List(args))?;
                return Ok(Expr::Seq(stmts, Box::new(self.lower_this(ctx))));
            }
            // `super.m(args)` calls the inherited method with this `this`.
            ast::Callee::Expr(e) if matches!(unparen(e), ast::Expr::SuperProp(_)) => {
                let method = self.lower_expr(e, ctx)?;
                let mut call_args = vec![self.lower_this(ctx)];
                call_args.extend(args);
                return Ok(Expr::Call(Box::new(Expr::Get(Box::new(method), "call".to_string())), call_args));
            }
            // `o.#m(args)`: the private member called with `o` as `this`.
            ast::Callee::Expr(e) if matches!(unparen(e), ast::Expr::Member(m) if matches!(m.prop, ast::MemberProp::PrivateName(_))) => {
                let ast::Expr::Member(m) = unparen(e) else { unreachable!() };
                let ast::MemberProp::PrivateName(p) = &m.prop else { unreachable!() };
                let o = self.lower_expr(&m.obj, ctx)?;
                let t = ctx.fresh_slot();
                let (mut pre, f) = self.private_get_on(t, &p.name, ctx)?;
                pre.insert(0, Stmt::Let(t, o));
                let mut call_args = vec![Expr::Var(t)];
                call_args.extend(args);
                return Ok(Expr::Seq(pre, Box::new(Expr::Call(Box::new(Expr::Get(Box::new(f), "call".to_string())), call_args))));
            }
            ast::Callee::Expr(e) => self.lower_expr(e, ctx)?,
            _ => return Err("`import(...)` is not supported".into()),
        };
        // Only a member-expression callee passes a receiver.
        let is_member = matches!(&c.callee, ast::Callee::Expr(e) if matches!(unparen(e), ast::Expr::Member(_)));
        if !is_member && matches!(callee, Expr::Get(..) | Expr::Index(..)) {
            return Ok(Expr::CallPlain(Box::new(callee), args));
        }
        Ok(Expr::Call(Box::new(callee), args))
    }

    /// An optional chain (`a?.b`, `a?.[k]`, `f?.(x)`, and the member accesses
    /// and calls after one): the base is evaluated once, and at each `?.` a
    /// `null`/`undefined` value makes the whole rest of the chain `undefined`.
    /// A call keeps its receiver (`a?.b()` calls `b` on `a`).
    fn lower_opt_chain(&mut self, e: &ast::Expr, ctx: &mut FnCtx) -> R<Expr> {
        let mut links = Vec::new();
        let base = flatten_chain(e, &mut links);
        let base = self.lower_expr(base, ctx)?;
        self.chain_rest(base, &links, false, ctx)
    }

    /// `delete` of an optional chain: `true` when it short-circuits, else
    /// the delete of its last member (or `true` after evaluating a chain
    /// ending in a call).
    fn lower_delete_chain(&mut self, e: &ast::Expr, ctx: &mut FnCtx) -> R<Expr> {
        let mut links = Vec::new();
        let base = flatten_chain(e, &mut links);
        let base = self.lower_expr(base, ctx)?;
        self.chain_rest(base, &links, true, ctx)
    }

    /// DefineField: the field `f` on `target` (its value evaluated now, an
    /// anonymous function named after the key).
    fn define_field(&mut self, target: Expr, f: &FieldInit, ctx: &mut FnCtx) -> R<Vec<Stmt>> {
        let named: Option<String> = match &f.key {
            FieldKey::Name(ast::PropName::Num(n)) => Some(JsNum(n.value).to_js_string()),
            FieldKey::Name(k) => Some(prop_name(k)?),
            FieldKey::Private(n) => Some(n.clone()),
            FieldKey::Computed(_) => None,
        };
        let value = match (f.value, named) {
            (Some(v), Some(n)) => self.lower_named(v, &n, ctx)?,
            (Some(v), None) => self.lower_expr(v, ctx)?,
            (None, _) => Expr::Undefined,
        };
        Ok(match &f.key {
            FieldKey::Name(k) => {
                let key = self.lower_prop_key(k, ctx)?;
                vec![Stmt::ExprStmt(Expr::DefineProps(Box::new(target), vec![PropDef::Data { key, value, attrs: DEFAULT_ATTRS }]))]
            }
            FieldKey::Computed(cell) => {
                let key = ctx.resolve_binding(cell).ok_or("internal: computed field key not captured")?.read();
                // (An anonymous function is named after the key.)
                let ks = ctx.fresh_slot();
                let value = match f.value {
                    Some(v) if is_anonymous_fn(v) => self.named_after_key(value, ks, "", ctx),
                    _ => value,
                };
                vec![
                    Stmt::Let(ks, key),
                    Stmt::ExprStmt(Expr::DefineProps(
                        Box::new(target),
                        vec![PropDef::Data { key: PropKey::Computed(Expr::Var(ks)), value, attrs: DEFAULT_ATTRS }],
                    )),
                ]
            }
            // PrivateFieldAdd.
            FieldKey::Private(n) => {
                let map = ctx.resolve_binding(n).ok_or("internal: private field not captured")?.read();
                let (t, v) = (ctx.fresh_slot(), ctx.fresh_slot());
                vec![
                    Stmt::Let(t, target),
                    Stmt::Let(v, value),
                    Stmt::If(
                        Self::coll_call(map.clone(), "has", vec![Expr::Var(t)]),
                        vec![Self::throw_type_error(format!("Cannot initialize {n} twice on the same object"))],
                        vec![],
                    ),
                    Stmt::ExprStmt(Self::coll_call(map, "set", vec![Expr::Var(t), Expr::Var(v)])),
                ]
            }
        })
    }

    /// Does this direct-eval code (sloppy caller) behave the same evaluated
    /// globally: it names no local binding or program function, declares no
    /// `var` or function at its top level (which would land in the caller's
    /// scope), and uses no `this`, `arguments`, `super` or `new.target`?
    fn eval_code_is_scope_free(&self, code: &str, ctx: &FnCtx) -> bool {
        use swc_ecma_visit::{Visit, VisitWith};
        let Ok(module) = crate::parse(code) else { return false };
        let mut stmts = Vec::new();
        for item in module.body {
            match item {
                ast::ModuleItem::Stmt(s) => stmts.push(s),
                ast::ModuleItem::ModuleDecl(_) => return false,
            }
        }
        let info = scope::analyze(&[], scope::Body::Stmts(&stmts), false);
        if !info.vars.is_empty() || stmts.iter().any(|s| matches!(s, ast::Stmt::Decl(ast::Decl::Fn(_)))) {
            return false;
        }
        if info.uses_arguments
            || info.free.iter().any(|n| ctx.resolve_binding(n).is_some() || ctx.outer_names.contains(n) || self.name_to_fid.contains_key(n))
        {
            return false;
        }
        struct Uses(bool);
        impl Visit for Uses {
            fn visit_function(&mut self, _: &ast::Function) {}
            fn visit_this_expr(&mut self, _: &ast::ThisExpr) {
                self.0 = true;
            }
            fn visit_super(&mut self, _: &ast::Super) {
                self.0 = true;
            }
            fn visit_meta_prop_expr(&mut self, _: &ast::MetaPropExpr) {
                self.0 = true;
            }
        }
        let mut u = Uses(false);
        for st in &stmts {
            st.visit_with(&mut u);
        }
        !u.0
    }

    /// `place++` / `--place` ...: the place's base and key evaluated once, its
    /// value read once (ToNumeric), the new value (plus or minus one, which
    /// keeps a BigInt a BigInt) written once. The statements, and the value
    /// (the new one for a prefix update, the old one for a postfix one;
    /// `undefined` when `value` is false and it is not computed).
    fn lower_update(&mut self, u: &ast::UpdateExpr, value: bool, ctx: &mut FnCtx) -> R<(Vec<Stmt>, Expr)> {
        let op = match u.op {
            ast::UpdateOp::PlusPlus => Bop::Add,
            ast::UpdateOp::MinusMinus => Bop::Sub,
        };
        let incr = if op == Bop::Add { "inc" } else { "dec" };
        let mut stmts = Vec::new();
        // The place: how to read it and write it (base and key in slots).
        enum Place {
            Binding(Binding),
            Global(String),
            Prop(usize, String),
            Index(usize, usize),
        }
        let place = match unparen(&u.arg) {
            // (In its temporal dead zone: reading it throws.)
            ast::Expr::Ident(id) if ctx.in_tdz(id.sym.as_str()) => {
                return Ok((vec![Stmt::ExprStmt(self.tdz_error(id.sym.as_str())?)], Expr::Undefined));
            }
            ast::Expr::Ident(id) => match ctx.resolve_binding(id.sym.as_str()) {
                Some(b) => Place::Binding(b),
                None => Place::Global(id.sym.to_string()),
            },
            ast::Expr::Member(m) => {
                let obj = self.lower_expr(&m.obj, ctx)?;
                match &m.prop {
                    ast::MemberProp::PrivateName(p) => {
                        let e = self.private_update(obj, &p.name, op, u.prefix, ctx)?;
                        return Ok(if value { (vec![], e) } else { (vec![Stmt::ExprStmt(e)], Expr::Undefined) });
                    }
                    ast::MemberProp::Ident(id) => {
                        let o = ctx.fresh_slot();
                        stmts.push(Stmt::Let(o, obj));
                        Place::Prop(o, id.sym.to_string())
                    }
                    ast::MemberProp::Computed(c) => {
                        let o = ctx.fresh_slot();
                        stmts.push(Stmt::Let(o, obj));
                        let k = self.lower_expr(&c.expr, ctx)?;
                        let ks = ctx.fresh_slot();
                        stmts.push(Stmt::Let(ks, k));
                        Place::Index(o, ks)
                    }
                }
            }
            _ => return Err("`++`/`--` on an unsupported target".into()),
        };
        let read = match &place {
            Place::Binding(b) => b.read(),
            Place::Global(n) => Expr::Global(n.clone()),
            Place::Prop(o, k) => Expr::Get(Box::new(Expr::Var(*o)), k.clone()),
            Place::Index(o, k) => Expr::Index(Box::new(Expr::Var(*o)), Box::new(Expr::Var(*k))),
        };
        let write = |v: Expr| match &place {
            Place::Binding(b) => b.write(v),
            Place::Global(n) => Stmt::SetGlobal(n.clone(), v),
            Place::Prop(o, k) => Stmt::SetProp(Expr::Var(*o), k.clone(), v),
            Place::Index(o, k) => Stmt::SetIndex(Expr::Var(*o), Expr::Var(*k), v),
        };
        let old = Expr::Opaque("tonumeric".into(), vec![read]);
        if !value {
            stmts.push(write(Expr::Opaque(incr.into(), vec![old])));
            return Ok((stmts, Expr::Undefined));
        }
        let (o, n) = (ctx.fresh_slot(), ctx.fresh_slot());
        stmts.push(Stmt::Let(o, old));
        stmts.push(Stmt::Let(n, Expr::Opaque(incr.into(), vec![Expr::Var(o)])));
        stmts.push(write(Expr::Var(n)));
        Ok((stmts, Expr::Var(if u.prefix { n } else { o })))
    }

    /// The private name `#name` here: what it is and its binding.
    fn private_binding(&self, name: &str, ctx: &FnCtx) -> R<(PrivInfo, Binding)> {
        let n = format!("#{name}");
        let info = ctx.privates.get(&n).copied().ok_or_else(|| format!("private name {n} is not declared in an enclosing class"))?;
        let b = ctx.resolve_binding(&n).ok_or_else(|| format!("internal: private name {n} has no binding here"))?;
        Ok((info, b))
    }

    /// The TypeError of a failed brand check of `#name` (as V8 words it).
    fn brand_error(&self, info: PrivInfo, name: &str, write: bool) -> String {
        let class = &self.class_names[info.class];
        match (info.kind, info.is_static, write) {
            (PrivKind::Field, _, false) => format!("Cannot read private member #{name} from an object whose class did not declare it"),
            (PrivKind::Field, _, true) => format!("Cannot write private member #{name} to an object whose class did not declare it"),
            (_, false, _) => format!("Receiver must be an instance of class {class}"),
            (_, true, _) => format!("Receiver must be class {class}"),
        }
    }

    /// `if (!test) throw new TypeError(msg)`.
    fn type_error_unless(test: Expr, msg: String) -> Stmt {
        Stmt::If(Expr::Opaque("!".into(), vec![test]), vec![Self::throw_type_error(msg)], vec![])
    }

    fn throw_type_error(msg: String) -> Stmt {
        Stmt::Throw(Expr::New(Box::new(Expr::Global("TypeError".into())), vec![Expr::Str(msg)]))
    }

    /// `m.call(t, args...)` for a method of a built-in collection.
    fn coll_call(coll: Expr, m: &str, args: Vec<Expr>) -> Expr {
        Expr::Call(Box::new(Expr::Get(Box::new(coll), m.into())), args)
    }

    /// Does the object in `t` have private name `#name` (its brand check)?
    fn private_has(kind: PrivKind, b: Binding, t: usize) -> Expr {
        match kind {
            PrivKind::Field => Self::coll_call(b.read(), "has", vec![Expr::Var(t)]),
            _ => Self::coll_call(Expr::Get(Box::new(b.read()), "b".into()), "has", vec![Expr::Var(t)]),
        }
    }

    /// `t.#name` (PrivateGet), the object already in slot `t`: the statements
    /// (the brand check) and the value.
    fn private_get_on(&self, t: usize, name: &str, ctx: &FnCtx) -> R<(Vec<Stmt>, Expr)> {
        let (info, b) = self.private_binding(name, ctx)?;
        let kind = info.kind;
        let mut stmts = vec![Self::type_error_unless(Self::private_has(kind, b, t), self.brand_error(info, name, false))];
        let v = match kind {
            PrivKind::Field => Self::coll_call(b.read(), "get", vec![Expr::Var(t)]),
            PrivKind::Method => Expr::Get(Box::new(b.read()), "f".into()),
            PrivKind::Accessor { get, .. } => {
                if !get {
                    stmts.push(Self::throw_type_error(format!("'#{name}' was defined without a getter")));
                }
                Expr::Call(Box::new(Expr::Get(Box::new(Expr::Get(Box::new(b.read()), "g".into())), "call".into())), vec![Expr::Var(t)])
            }
        };
        Ok((stmts, v))
    }

    /// `t.#name = v` (PrivateSet), the object in slot `t` and the value in
    /// slot `v` (both evaluated already): the statements.
    fn private_set_on(&self, t: usize, name: &str, v: usize, ctx: &FnCtx) -> R<Vec<Stmt>> {
        let (info, b) = self.private_binding(name, ctx)?;
        let kind = info.kind;
        let mut stmts = vec![Self::type_error_unless(Self::private_has(kind, b, t), self.brand_error(info, name, true))];
        match kind {
            PrivKind::Field => stmts.push(Stmt::ExprStmt(Self::coll_call(b.read(), "set", vec![Expr::Var(t), Expr::Var(v)]))),
            PrivKind::Method => stmts.push(Self::throw_type_error(format!("Private method '#{name}' is not writable"))),
            PrivKind::Accessor { set, .. } => {
                if !set {
                    stmts.push(Self::throw_type_error(format!("'#{name}' was defined without a setter")));
                } else {
                    stmts.push(Stmt::ExprStmt(Expr::Call(
                        Box::new(Expr::Get(Box::new(Expr::Get(Box::new(b.read()), "s".into())), "call".into())),
                        vec![Expr::Var(t), Expr::Var(v)],
                    )));
                }
            }
        }
        Ok(stmts)
    }

    /// `obj.#name`.
    fn private_get(&mut self, obj: Expr, name: &str, ctx: &mut FnCtx) -> R<Expr> {
        let t = ctx.fresh_slot();
        let (mut stmts, v) = self.private_get_on(t, name, ctx)?;
        stmts.insert(0, Stmt::Let(t, obj));
        Ok(Expr::Seq(stmts, Box::new(v)))
    }

    /// `obj.#name = <value>` (or a compound form: `combine` makes the new
    /// value from the old): its value is the value assigned.
    fn private_assign(&mut self, obj: Expr, name: &str, rhs: Expr, combine: Option<&dyn Fn(Expr, Expr) -> Expr>, ctx: &mut FnCtx) -> R<Expr> {
        let (t, v) = (ctx.fresh_slot(), ctx.fresh_slot());
        let mut stmts = vec![Stmt::Let(t, obj)];
        let value = match combine {
            Some(f) => {
                let (pre, old) = self.private_get_on(t, name, ctx)?;
                stmts.extend(pre);
                let o = ctx.fresh_slot();
                stmts.push(Stmt::Let(o, old));
                f(Expr::Var(o), rhs)
            }
            None => rhs,
        };
        stmts.push(Stmt::Let(v, value));
        stmts.extend(self.private_set_on(t, name, v, ctx)?);
        Ok(Expr::Seq(stmts, Box::new(Expr::Var(v))))
    }

    /// `++obj.#name` / `obj.#name--` ...: the old value converted to a
    /// number, then the new one written; the value is the new (prefix) or
    /// the old (postfix) number.
    fn private_update(&mut self, obj: Expr, name: &str, op: Bop, prefix: bool, ctx: &mut FnCtx) -> R<Expr> {
        let (t, old, new) = (ctx.fresh_slot(), ctx.fresh_slot(), ctx.fresh_slot());
        let mut stmts = vec![Stmt::Let(t, obj)];
        let (pre, cur) = self.private_get_on(t, name, ctx)?;
        stmts.extend(pre);
        stmts.push(Stmt::Let(old, Expr::Opaque("tonumeric".into(), vec![cur])));
        let incr = if op == Bop::Add { "inc" } else { "dec" };
        stmts.push(Stmt::Let(new, Expr::Opaque(incr.into(), vec![Expr::Var(old)])));
        stmts.extend(self.private_set_on(t, name, new, ctx)?);
        Ok(Expr::Seq(stmts, Box::new(Expr::Var(if prefix { new } else { old }))))
    }

    /// `#name in obj`.
    fn private_in(&mut self, name: &str, obj: Expr, ctx: &mut FnCtx) -> R<Expr> {
        let (info, b) = self.private_binding(name, ctx)?;
        let kind = info.kind;
        let t = ctx.fresh_slot();
        let typeof_is = |k: &str| Expr::Bin(Bop::Eq, Box::new(Expr::Opaque("typeof".into(), vec![Expr::Var(t)])), Box::new(Expr::Str(k.into())));
        let is_object = Expr::Opaque(
            "||".into(),
            vec![
                Expr::Opaque("&&".into(), vec![typeof_is("object"), Expr::Bin(Bop::Ne, Box::new(Expr::Var(t)), Box::new(Expr::Null))]),
                typeof_is("function"),
            ],
        );
        let msg = Expr::Bin(
            Bop::Add,
            Box::new(Expr::Str(format!("Cannot use 'in' operator to search for '#{name}' in "))),
            Box::new(Expr::Call(Box::new(Expr::Global("String".into())), vec![Expr::Var(t)])),
        );
        let stmts = vec![
            Stmt::Let(t, obj),
            Stmt::If(
                Expr::Opaque("!".into(), vec![is_object]),
                vec![Stmt::Throw(Expr::New(Box::new(Expr::Global("TypeError".into())), vec![msg]))],
                vec![],
            ),
        ];
        Ok(Expr::Seq(stmts, Box::new(Self::private_has(kind, b, t))))
    }

    fn chain_member(&mut self, obj: Expr, prop: &ast::MemberProp, ctx: &mut FnCtx) -> R<Expr> {
        Ok(match prop {
            ast::MemberProp::Ident(id) => Expr::Get(Box::new(obj), id.sym.to_string()),
            ast::MemberProp::Computed(c) => Expr::Index(Box::new(obj), Box::new(self.lower_expr(&c.expr, ctx)?)),
            ast::MemberProp::PrivateName(p) => self.private_get(obj, &p.name, ctx)?,
        })
    }

    /// A call of `func` with receiver `this` (`None`: a plain call).
    fn chain_call(&mut self, func: Expr, this: Option<Expr>, args: &[ast::ExprOrSpread], ctx: &mut FnCtx) -> R<Expr> {
        if args.iter().any(|a| a.spread.is_some()) {
            let elems: Vec<&ast::ExprOrSpread> = args.iter().collect();
            let arr = self.lower_spread_array(&elems, ctx)?;
            return Ok(Expr::Call(Box::new(Expr::Get(Box::new(func), "apply".into())), vec![this.unwrap_or(Expr::Undefined), arr]));
        }
        let mut xs = Vec::with_capacity(args.len());
        for a in args {
            xs.push(self.lower_expr(&a.expr, ctx)?);
        }
        Ok(match this {
            Some(t) => {
                let mut call_args = vec![t];
                call_args.extend(xs);
                Expr::Call(Box::new(Expr::Get(Box::new(func), "call".into())), call_args)
            }
            None => match func {
                // (A member read here is a method call on its own base.)
                f @ (Expr::Get(..) | Expr::Index(..)) => Expr::Call(Box::new(f), xs),
                f => Expr::Call(Box::new(f), xs),
            },
        })
    }

    /// The rest of a chain from `cur`. `delete`: the chain is a `delete`'s
    /// operand (its value `true` when it short-circuits, the delete of the
    /// final member otherwise).
    fn chain_rest(&mut self, cur: Expr, links: &[ChainLink], delete: bool, ctx: &mut FnCtx) -> R<Expr> {
        let Some((link, rest)) = links.split_first() else {
            return Ok(match (delete, cur) {
                (false, cur) => cur,
                (true, Expr::Get(o, k)) => Expr::DeleteValue(o, Box::new(Expr::Str(k))),
                (true, Expr::Index(o, k)) => Expr::DeleteValue(o, k),
                (true, cur) => Expr::Seq(vec![Stmt::ExprStmt(cur)], Box::new(Expr::Bool(true))),
            });
        };
        let short = if delete { Expr::Bool(true) } else { Expr::Undefined };
        let nullish = |v: Expr| Expr::Opaque("==".into(), vec![v, Expr::Null]);
        match link {
            ChainLink::Member(prop, optional) => {
                if *optional {
                    let t = ctx.fresh_slot();
                    let next = self.chain_member(Expr::Var(t), prop, ctx)?;
                    let tail = self.chain_rest(next, rest, delete, ctx)?;
                    Ok(Expr::Seq(vec![Stmt::Let(t, cur)], Box::new(Expr::Opaque("?:".into(), vec![nullish(Expr::Var(t)), short, tail]))))
                } else {
                    let next = self.chain_member(cur, prop, ctx)?;
                    self.chain_rest(next, rest, delete, ctx)
                }
            }
            ChainLink::Call(args, optional) => {
                if *optional {
                    // The callee is tested; a method keeps its receiver.
                    let (stmts, f, this) = match cur {
                        Expr::Get(r, p) => {
                            let (tr, tf) = (ctx.fresh_slot(), ctx.fresh_slot());
                            (vec![Stmt::Let(tr, *r), Stmt::Let(tf, Expr::Get(Box::new(Expr::Var(tr)), p))], tf, Some(Expr::Var(tr)))
                        }
                        Expr::Index(r, k) => {
                            let (tr, tf) = (ctx.fresh_slot(), ctx.fresh_slot());
                            (vec![Stmt::Let(tr, *r), Stmt::Let(tf, Expr::Index(Box::new(Expr::Var(tr)), k))], tf, Some(Expr::Var(tr)))
                        }
                        other => {
                            let tf = ctx.fresh_slot();
                            (vec![Stmt::Let(tf, other)], tf, None)
                        }
                    };
                    let call = self.chain_call(Expr::Var(f), this, args, ctx)?;
                    let tail = self.chain_rest(call, rest, delete, ctx)?;
                    Ok(Expr::Seq(stmts, Box::new(Expr::Opaque("?:".into(), vec![nullish(Expr::Var(f)), short, tail]))))
                } else {
                    let call = self.chain_call(cur, None, args, ctx)?;
                    self.chain_rest(call, rest, delete, ctx)
                }
            }
        }
    }

    /// Recognize `arr.push(x)`; returns `(arr_expr, args)` if it matches.
    fn as_push_call(&mut self, c: &ast::CallExpr, ctx: &mut FnCtx) -> R<Option<(Expr, Vec<Expr>)>> {
        if let ast::Callee::Expr(e) = &c.callee {
            if let ast::Expr::Member(m) = &**e {
                if let ast::MemberProp::Ident(id) = &m.prop {
                    if id.sym.as_str() == "push" && c.args.len() == 1 && c.args[0].spread.is_none() {
                        let arr = self.lower_expr(&m.obj, ctx)?;
                        let arg = self.lower_expr(&c.args[0].expr, ctx)?;
                        return Ok(Some((arr, vec![arg])));
                    }
                }
            }
        }
        Ok(None)
    }
}

enum ArrowBody<'a> {
    Block(&'a [ast::Stmt]),
    BlockOwned(Vec<ast::Stmt>),
    Expr(&'a ast::Expr),
    /// A class's instance initializer: its private methods' brand (when it
    /// has some: the class, see `Compiler::class_names`), then its fields in
    /// order.
    Fields(Vec<FieldInit<'a>>, Option<usize>),
}

/// A class field: its key and initializer.
struct FieldInit<'a> {
    key: FieldKey<'a>,
    value: Option<&'a ast::Expr>,
}

enum FieldKey<'a> {
    /// A literal key.
    Name(&'a ast::PropName),
    /// A computed key, evaluated at class definition into this cell.
    Computed(String),
    /// A private name (`#x`).
    Private(String),
}

/// A class's static element, run in order at class definition with `this`
/// the class.
enum StaticElem<'a> {
    Field(FieldInit<'a>),
    Block(&'a [ast::Stmt]),
}

/// The program's source text at `span` (what `Function.prototype.toString`
/// gives of the function there), if it has one.
fn span_text(span: swc_common::Span) -> Option<String> {
    if span.is_dummy() {
        return None;
    }
    crate::SOURCE_MAP.with(|m| m.borrow().as_ref()?.with_snippet_of_span(span, str::to_string).ok())
}

/// A function's source text by its syntax: a function or class from its
/// first keyword, a method from its key, an arrow whole.
fn fn_node_text(node: &FnNode) -> Option<String> {
    use swc_common::Spanned;
    match node {
        FnNode::Function { func, .. } => span_text(func.span),
        FnNode::Arrow(a) => span_text(a.span),
        FnNode::Method(m) => span_text(m.key.span().with_hi(m.function.span.hi)),
        FnNode::Class { class, .. } => span_text(class.span),
    }
}

/// An anonymous function definition (NamedEvaluation gives it a name):
/// a function or class expression without its own name, or an arrow.
fn is_anonymous_fn(e: &ast::Expr) -> bool {
    match unparen(e) {
        ast::Expr::Fn(f) => f.ident.is_none(),
        ast::Expr::Class(c) => c.ident.is_none(),
        ast::Expr::Arrow(_) => true,
        _ => false,
    }
}

/// The runtime helper getting an async iterator (`runtime.js`).
const ASYNC_ITER: &str = "__pe_asyncIter";

/// `is the value in slot `v` an object (or a function)?`
fn is_object_expr(v: usize) -> Expr {
    let typeof_is = |t: &str| Expr::Bin(Bop::Eq, Box::new(Expr::Opaque("typeof".into(), vec![Expr::Var(v)])), Box::new(Expr::Str(t.into())));
    Expr::Opaque(
        "||".into(),
        vec![
            Expr::Opaque("&&".into(), vec![typeof_is("object"), Expr::Bin(Bop::Ne, Box::new(Expr::Var(v)), Box::new(Expr::Null))]),
            typeof_is("function"),
        ],
    )
}

/// `if (<v is not an object>) throw new TypeError(pre + String(v) + post)`.
fn type_error_unless_object(v: usize, pre: &str, post: &str) -> Stmt {
    let msg = Expr::Bin(
        Bop::Add,
        Box::new(Expr::Bin(
            Bop::Add,
            Box::new(Expr::Str(pre.into())),
            Box::new(Expr::Call(Box::new(Expr::Global("String".into())), vec![Expr::Var(v)])),
        )),
        Box::new(Expr::Str(post.into())),
    );
    Stmt::If(
        Expr::Opaque("!".into(), vec![is_object_expr(v)]),
        vec![Stmt::Throw(Expr::New(Box::new(Expr::Global("TypeError".into())), vec![msg]))],
        vec![],
    )
}

/// Close the iterator in slot `it` as control leaves its loop early
/// (IteratorClose; AsyncIteratorClose for an async one: its `return()`, when
/// it has one, awaited, the result checked to be an object).
fn close_iter(it: usize, is_async: bool, ctx: &mut FnCtx) -> Vec<Stmt> {
    if !is_async {
        return vec![Stmt::ExprStmt(Expr::IterClose(Box::new(Expr::Var(it))))];
    }
    let (m, r) = (ctx.fresh_slot(), ctx.fresh_slot());
    vec![
        Stmt::Let(m, Expr::Get(Box::new(Expr::Var(it)), "return".into())),
        Stmt::If(
            Expr::Opaque("!=".into(), vec![Expr::Var(m), Expr::Null]),
            vec![
                Stmt::Let(r, Expr::Await(Box::new(Expr::Call(Box::new(Expr::Get(Box::new(Expr::Var(m)), "call".into())), vec![Expr::Var(it)])))),
                type_error_unless_object(r, "Iterator result ", " is not an object"),
            ],
            vec![],
        ),
    ]
}

/// Expression statements of field initializer values (for name analysis).
fn field_value_stmts(fs: &[FieldInit]) -> Vec<ast::Stmt> {
    let mut out = Vec::new();
    for f in fs {
        if let Some(v) = &f.value {
            out.push(ast::Stmt::Expr(ast::ExprStmt { span: Default::default(), expr: Box::new((*v).clone()) }));
        }
    }
    out
}

/// The `name` of a method, getter (`prefix` "get ") or setter ("set ") with
/// this key (empty for a computed key: its name is decided at runtime).
/// The `name` a method, getter or setter gets from its key (SetFunctionName):
/// the key string, `[description]` for a well-known symbol, with the
/// `get `/`set ` prefix. A computed key known only at runtime gives `""` here
/// (a known gap: its name is not set at runtime).
fn method_name(key: &PropKey, prefix: &str) -> String {
    match key {
        PropKey::Static(k) => format!("{prefix}{k}"),
        PropKey::Computed(Expr::Str(k)) => format!("{prefix}{k}"),
        PropKey::Computed(Expr::Num(n)) => format!("{prefix}{}", n.to_js_string()),
        PropKey::Computed(Expr::Get(base, sym)) if matches!(&**base, Expr::Global(g) if g == "Symbol") => {
            format!("{prefix}[Symbol.{sym}]")
        }
        PropKey::Computed(_) => String::new(),
    }
}

/// How `bind_pat` binds a name.
#[derive(Clone, Copy, PartialEq)]
enum BindKind {
    Var,
    Lexical,
    Assign,
}

/// The runtime helper that lists `for..in` keys (folded by the engine for
/// modeled objects; the codegen emits its definition when it is used).
const FOR_IN_KEYS: &str = "__pe_forInKeys";

/// Arguments of a `super(...)` call.
enum SuperArgs {
    List(Vec<Expr>),
    Spread(Expr),
}

const DEFAULT_ATTRS: u8 = ATTR_ENUMERABLE | ATTR_WRITABLE | ATTR_CONFIGURABLE;
const WRITABLE_ATTRS: u8 = ATTR_WRITABLE;
const CONFIGURABLE_ATTR: u8 = ATTR_CONFIGURABLE;

/// Free variables of a function: identifiers it reads that are bound neither by
/// its parameters nor by any declaration inside it. (Used to compute closure
/// captures. Over-approximating `bound` only over-captures, which is harmless;
/// the result is later intersected with the names actually visible outside.)
/// How a compound assignment combines the current value with the rhs.
enum Combine {
    /// A modeled, constant-foldable binary op (`+`, `-`, `*`).
    Bin(Bop),
    /// An unmodeled-but-pure op passed through verbatim (`/`, `%`, bitwise, ...).
    Opaque(&'static str),
}

/// Build the value for `target <op>= rhs`. `cur` lazily constructs the read of
/// the target (only needed for a compound op, not a plain `=`).
/// `e` without enclosing parentheses.
fn unparen(e: &ast::Expr) -> &ast::Expr {
    match e {
        ast::Expr::Paren(p) => unparen(&p.expr),
        e => e,
    }
}

/// Is `e` (through parentheses) a `?:` expression?
fn is_cond(e: &ast::Expr) -> bool {
    match e {
        ast::Expr::Paren(p) => is_cond(&p.expr),
        ast::Expr::Cond(_) => true,
        _ => false,
    }
}

fn combine_assign(op: &Option<Combine>, rhs: Expr, cur: impl FnOnce() -> Expr) -> Expr {
    match op {
        None => rhs,
        Some(Combine::Bin(op)) => Expr::Bin(*op, Box::new(cur()), Box::new(rhs)),
        Some(Combine::Opaque(tok)) => Expr::Opaque(tok.to_string(), vec![cur(), rhs]),
    }
}

fn free_vars(params: &[ast::Pat], body: &[ast::Stmt]) -> Vec<String> {
    let mut used = HashSet::new();
    let mut bound = HashSet::new();
    for p in params {
        bound_in_pat(p, &mut bound);
    }
    for s in body {
        used_in_stmt(s, &mut used);
        bound_in_stmt(s, &mut bound);
    }
    let mut free: Vec<String> = used.into_iter().filter(|n| !bound.contains(n)).collect();
    free.sort();
    free
}

fn bound_in_pat(p: &ast::Pat, out: &mut HashSet<String>) {
    if let ast::Pat::Ident(bi) = p {
        out.insert(bi.id.sym.to_string());
    }
}

fn bound_in_stmt(s: &ast::Stmt, out: &mut HashSet<String>) {
    match s {
        ast::Stmt::Decl(ast::Decl::Var(v)) => {
            for d in &v.decls {
                bound_in_pat(&d.name, out);
            }
        }
        ast::Stmt::Decl(ast::Decl::Fn(f)) => {
            out.insert(f.ident.sym.to_string());
            if let Some(b) = &f.function.body {
                for p in &f.function.params {
                    bound_in_pat(&p.pat, out);
                }
                b.stmts.iter().for_each(|s| bound_in_stmt(s, out));
            }
        }
        ast::Stmt::Block(b) => b.stmts.iter().for_each(|s| bound_in_stmt(s, out)),
        ast::Stmt::If(i) => {
            bound_in_stmt(&i.cons, out);
            if let Some(a) = &i.alt {
                bound_in_stmt(a, out);
            }
        }
        ast::Stmt::For(f) => {
            if let Some(ast::VarDeclOrExpr::VarDecl(v)) = &f.init {
                for d in &v.decls {
                    bound_in_pat(&d.name, out);
                }
            }
            bound_in_stmt(&f.body, out);
        }
        ast::Stmt::ForIn(f) => bound_in_stmt(&f.body, out),
        ast::Stmt::ForOf(f) => bound_in_stmt(&f.body, out),
        ast::Stmt::While(w) => bound_in_stmt(&w.body, out),
        ast::Stmt::DoWhile(d) => bound_in_stmt(&d.body, out),
        ast::Stmt::Switch(sw) => {
            for c in &sw.cases {
                c.cons.iter().for_each(|s| bound_in_stmt(s, out));
            }
        }
        ast::Stmt::Try(t) => {
            t.block.stmts.iter().for_each(|s| bound_in_stmt(s, out));
            if let Some(h) = &t.handler {
                if let Some(p) = &h.param {
                    bound_in_pat(p, out);
                }
                h.body.stmts.iter().for_each(|s| bound_in_stmt(s, out));
            }
            if let Some(f) = &t.finalizer {
                f.stmts.iter().for_each(|s| bound_in_stmt(s, out));
            }
        }
        ast::Stmt::Labeled(l) => bound_in_stmt(&l.body, out),
        ast::Stmt::Expr(e) => bound_in_expr(&e.expr, out),
        ast::Stmt::Return(r) => {
            if let Some(e) = &r.arg {
                bound_in_expr(e, out);
            }
        }
        _ => {}
    }
}

/// Bindings introduced by function/arrow *expressions* (their params + inner
/// declarations) — these are bound from the perspective of the enclosing scope.
fn bound_in_expr(e: &ast::Expr, out: &mut HashSet<String>) {
    match e {
        ast::Expr::Fn(f) => {
            if let Some(b) = &f.function.body {
                for p in &f.function.params {
                    bound_in_pat(&p.pat, out);
                }
                b.stmts.iter().for_each(|s| bound_in_stmt(s, out));
            }
        }
        ast::Expr::Arrow(a) => {
            for p in &a.params {
                bound_in_pat(p, out);
            }
            match &*a.body {
                ast::BlockStmtOrExpr::BlockStmt(b) => {
                    b.stmts.iter().for_each(|s| bound_in_stmt(s, out))
                }
                ast::BlockStmtOrExpr::Expr(e) => bound_in_expr(e, out),
            }
        }
        ast::Expr::Paren(p) => bound_in_expr(&p.expr, out),
        ast::Expr::Call(c) => {
            if let ast::Callee::Expr(e) = &c.callee {
                bound_in_expr(e, out);
            }
            for a in &c.args {
                bound_in_expr(&a.expr, out);
            }
        }
        ast::Expr::Bin(b) => {
            bound_in_expr(&b.left, out);
            bound_in_expr(&b.right, out);
        }
        ast::Expr::Assign(a) => bound_in_expr(&a.right, out),
        _ => {}
    }
}

fn used_in_stmt(s: &ast::Stmt, out: &mut HashSet<String>) {
    match s {
        ast::Stmt::Expr(e) => used_in_expr(&e.expr, out),
        ast::Stmt::Decl(ast::Decl::Var(v)) => {
            for d in &v.decls {
                if let Some(e) = &d.init {
                    used_in_expr(e, out);
                }
            }
        }
        ast::Stmt::Decl(ast::Decl::Fn(f)) => {
            if let Some(b) = &f.function.body {
                b.stmts.iter().for_each(|s| used_in_stmt(s, out));
            }
        }
        ast::Stmt::Return(r) => {
            if let Some(e) = &r.arg {
                used_in_expr(e, out);
            }
        }
        ast::Stmt::Block(b) => b.stmts.iter().for_each(|s| used_in_stmt(s, out)),
        ast::Stmt::If(i) => {
            used_in_expr(&i.test, out);
            used_in_stmt(&i.cons, out);
            if let Some(a) = &i.alt {
                used_in_stmt(a, out);
            }
        }
        ast::Stmt::For(f) => {
            match &f.init {
                Some(ast::VarDeclOrExpr::VarDecl(v)) => {
                    for d in &v.decls {
                        if let Some(e) = &d.init {
                            used_in_expr(e, out);
                        }
                    }
                }
                Some(ast::VarDeclOrExpr::Expr(e)) => used_in_expr(e, out),
                None => {}
            }
            if let Some(t) = &f.test {
                used_in_expr(t, out);
            }
            if let Some(u) = &f.update {
                used_in_expr(u, out);
            }
            used_in_stmt(&f.body, out);
        }
        ast::Stmt::ForIn(f) => {
            used_in_expr(&f.right, out);
            used_in_stmt(&f.body, out);
        }
        ast::Stmt::ForOf(f) => {
            used_in_expr(&f.right, out);
            used_in_stmt(&f.body, out);
        }
        ast::Stmt::While(w) => {
            used_in_expr(&w.test, out);
            used_in_stmt(&w.body, out);
        }
        ast::Stmt::DoWhile(d) => {
            used_in_expr(&d.test, out);
            used_in_stmt(&d.body, out);
        }
        ast::Stmt::Switch(sw) => {
            used_in_expr(&sw.discriminant, out);
            for c in &sw.cases {
                if let Some(t) = &c.test {
                    used_in_expr(t, out);
                }
                c.cons.iter().for_each(|s| used_in_stmt(s, out));
            }
        }
        ast::Stmt::Throw(t) => used_in_expr(&t.arg, out),
        ast::Stmt::Try(t) => {
            t.block.stmts.iter().for_each(|s| used_in_stmt(s, out));
            if let Some(h) = &t.handler {
                h.body.stmts.iter().for_each(|s| used_in_stmt(s, out));
            }
            if let Some(f) = &t.finalizer {
                f.stmts.iter().for_each(|s| used_in_stmt(s, out));
            }
        }
        ast::Stmt::Labeled(l) => used_in_stmt(&l.body, out),
        _ => {}
    }
}

fn used_in_expr(e: &ast::Expr, out: &mut HashSet<String>) {
    match e {
        ast::Expr::Ident(i) => {
            out.insert(i.sym.to_string());
        }
        ast::Expr::Bin(b) => {
            used_in_expr(&b.left, out);
            used_in_expr(&b.right, out);
        }
        ast::Expr::Unary(u) => used_in_expr(&u.arg, out),
        ast::Expr::Update(u) => used_in_expr(&u.arg, out),
        ast::Expr::Cond(c) => {
            used_in_expr(&c.test, out);
            used_in_expr(&c.cons, out);
            used_in_expr(&c.alt, out);
        }
        ast::Expr::Member(m) => {
            used_in_expr(&m.obj, out);
            if let ast::MemberProp::Computed(c) = &m.prop {
                used_in_expr(&c.expr, out);
            }
        }
        ast::Expr::Call(c) => {
            if let ast::Callee::Expr(e) = &c.callee {
                used_in_expr(e, out);
            }
            for a in &c.args {
                used_in_expr(&a.expr, out);
            }
        }
        ast::Expr::New(n) => {
            used_in_expr(&n.callee, out);
            if let Some(args) = &n.args {
                for a in args {
                    used_in_expr(&a.expr, out);
                }
            }
        }
        ast::Expr::Array(a) => {
            for el in a.elems.iter().flatten() {
                used_in_expr(&el.expr, out);
            }
        }
        ast::Expr::Object(o) => {
            for p in &o.props {
                if let ast::PropOrSpread::Prop(prop) = p {
                    match &**prop {
                        ast::Prop::KeyValue(kv) => used_in_expr(&kv.value, out),
                        ast::Prop::Shorthand(id) => {
                            out.insert(id.sym.to_string());
                        }
                        _ => {}
                    }
                }
            }
        }
        ast::Expr::Paren(p) => used_in_expr(&p.expr, out),
        ast::Expr::Assign(a) => {
            // a simple-ident assignment target is also a use of that binding
            if let ast::AssignTarget::Simple(ast::SimpleAssignTarget::Ident(bi)) = &a.left {
                out.insert(bi.id.sym.to_string());
            }
            if let ast::AssignTarget::Simple(ast::SimpleAssignTarget::Member(m)) = &a.left {
                used_in_expr(&m.obj, out);
                if let ast::MemberProp::Computed(c) = &m.prop {
                    used_in_expr(&c.expr, out);
                }
            }
            used_in_expr(&a.right, out);
        }
        // A nested function/arrow's free uses are uses in the enclosing scope too.
        ast::Expr::Arrow(a) => match &*a.body {
            ast::BlockStmtOrExpr::BlockStmt(b) => {
                b.stmts.iter().for_each(|s| used_in_stmt(s, out))
            }
            ast::BlockStmtOrExpr::Expr(e) => used_in_expr(e, out),
        },
        ast::Expr::Fn(f) => {
            if let Some(b) = &f.function.body {
                b.stmts.iter().for_each(|s| used_in_stmt(s, out));
            }
        }
        _ => {}
    }
}

/// Variables of a function that must be BOXED for capture-by-reference: a `var`
/// that is both used inside a nested function (captured) AND assigned somewhere
/// (mutated). Boxing makes them shared `{value: ...}` cells so a closure's
/// mutation is visible to everyone. A block-scoped name gets a fresh cell each
/// time its block is entered (see `block_prologue`).
/// Every name a function's code reads (a reference that is not only the
/// target of a plain `=` or a binding), its nested functions' included.
fn read_names(params: &[&ast::Pat], stmts: &[ast::Stmt]) -> HashSet<String> {
    struct Reads(HashSet<String>);
    impl swc_ecma_visit::Visit for Reads {
        fn visit_ident(&mut self, i: &ast::Ident) {
            self.0.insert(i.sym.to_string());
        }
        // (A binding is no read; `x = e` writes `x`, `x += e` reads it too.)
        fn visit_binding_ident(&mut self, _: &ast::BindingIdent) {}
        fn visit_assign_expr(&mut self, a: &ast::AssignExpr) {
            if let ast::AssignTarget::Simple(ast::SimpleAssignTarget::Ident(b)) = &a.left {
                if a.op != ast::AssignOp::Assign {
                    self.0.insert(b.id.sym.to_string());
                }
                swc_ecma_visit::VisitWith::visit_with(&*a.right, self);
                return;
            }
            swc_ecma_visit::VisitWith::visit_children_with(a, self);
        }
        fn visit_fn_decl(&mut self, f: &ast::FnDecl) {
            swc_ecma_visit::VisitWith::visit_with(&*f.function, self);
        }
        fn visit_fn_expr(&mut self, f: &ast::FnExpr) {
            swc_ecma_visit::VisitWith::visit_with(&*f.function, self);
        }
        fn visit_class_decl(&mut self, c: &ast::ClassDecl) {
            swc_ecma_visit::VisitWith::visit_with(&*c.class, self);
        }
        fn visit_class_expr(&mut self, c: &ast::ClassExpr) {
            swc_ecma_visit::VisitWith::visit_with(&*c.class, self);
        }
        fn visit_labeled_stmt(&mut self, l: &ast::LabeledStmt) {
            swc_ecma_visit::VisitWith::visit_with(&*l.body, self);
        }
        fn visit_break_stmt(&mut self, _: &ast::BreakStmt) {}
        fn visit_continue_stmt(&mut self, _: &ast::ContinueStmt) {}
    }
    let mut r = Reads(HashSet::new());
    for p in params {
        swc_ecma_visit::VisitWith::visit_with(*p, &mut r);
    }
    for st in stmts {
        swc_ecma_visit::VisitWith::visit_with(st, &mut r);
    }
    r.0
}

fn boxed_locals(info: &scope::FnInfo, params: &[&str], fn_decls: &[String]) -> HashSet<String> {
    let mut boxed = HashSet::new();
    let candidates = info
        .vars
        .iter()
        .chain(info.top_lexical.iter())
        .chain(info.lexical.iter())
        .map(String::as_str)
        .chain(params.iter().copied());
    for n in candidates {
        if !info.captured(n) {
            continue;
        }
        // Captured and reassigned: a shared cell, so every closure sees the
        // writes. Captured by a hoisted function declaration (its closure is
        // created at entry) but initialized later: a cell, so it sees the
        // initialization. (Parameters are initialized at entry.)
        if info.assigned.contains(n)
            || (info.hoisted_free.contains(n) && !params.contains(&n))
            || info.init_captured.contains(n)
        {
            boxed.insert(n.to_string());
        }
    }
    // A nested function declaration referenced by another hoisted function
    // declaration (e.g. mutual recursion) may be captured before it is
    // assigned (declarations are created in order at entry), so by-value
    // capture would snapshot `undefined`; a reassigned one must be shared.
    // Captured only by closures created later (expressions, arrows), its
    // value is final by then.
    for name in fn_decls {
        if info.captured(name) && (info.hoisted_free.contains(name) || info.assigned.contains(name)) {
            boxed.insert(name.clone());
        }
    }
    boxed
}

/// Names of `function` declarations that are direct children of `stmts` (the top
/// level of a function body). Block-nested function declarations are not hoisted
/// here and are rejected at lowering.
fn fn_decl_names(stmts: &[ast::Stmt]) -> Vec<String> {
    stmts
        .iter()
        .filter_map(|s| match s {
            ast::Stmt::Decl(ast::Decl::Fn(f)) => Some(f.ident.sym.to_string()),
            _ => None,
        })
        .collect()
}





/// Pre-declare every `var` in a function body so it is visible throughout
/// (JS `var` hoisting: usable, as `undefined`, before its declaration line).
/// Recurses into nested statement bodies but NOT into nested functions, which
/// have their own `var` scope.
/// Annex B.3.3 candidates: functions declared in blocks under `s` (not
/// crossing function boundaries) whose name no enclosing block, nor the body
/// (`lexical` starts as the body's lexical names), declares lexically.
/// `in_block` is whether `s` is already inside a block.
fn annex_b_names(s: &ast::Stmt, lexical: &mut Vec<String>, in_block: bool, out: &mut Vec<String>) {
    let block = |stmts: &[ast::Stmt], lexical: &mut Vec<String>, out: &mut Vec<String>| {
        let mark = lexical.len();
        for st in stmts {
            match st {
                ast::Stmt::Decl(ast::Decl::Var(v)) if !matches!(v.kind, ast::VarDeclKind::Var) => {
                    for d in &v.decls {
                        lexical.extend(scope::pat_names(&d.name));
                    }
                }
                ast::Stmt::Decl(ast::Decl::Class(c)) => lexical.push(c.ident.sym.to_string()),
                _ => {}
            }
        }
        for st in stmts {
            annex_b_names(st, lexical, true, out);
        }
        lexical.truncate(mark);
    };
    match s {
        ast::Stmt::Decl(ast::Decl::Fn(f)) if in_block => {
            let name = f.ident.sym.to_string();
            // The function's own block binding is not a conflict; another
            // lexical declaration of the name in an enclosing block is.
            if !lexical.contains(&name) && !out.contains(&name) {
                out.push(name);
            }
        }
        ast::Stmt::Block(b) => block(&b.stmts, lexical, out),
        ast::Stmt::If(i) => {
            block(std::slice::from_ref(&*i.cons), lexical, out);
            if let Some(a) = &i.alt {
                block(std::slice::from_ref(&**a), lexical, out);
            }
        }
        ast::Stmt::Labeled(l) => annex_b_names(&l.body, lexical, in_block, out),
        ast::Stmt::While(w) => block(std::slice::from_ref(&*w.body), lexical, out),
        ast::Stmt::DoWhile(w) => block(std::slice::from_ref(&*w.body), lexical, out),
        ast::Stmt::For(f) => {
            let mark = lexical.len();
            if let Some(ast::VarDeclOrExpr::VarDecl(v)) = &f.init {
                if !matches!(v.kind, ast::VarDeclKind::Var) {
                    for d in &v.decls {
                        lexical.extend(scope::pat_names(&d.name));
                    }
                }
            }
            block(std::slice::from_ref(&*f.body), lexical, out);
            lexical.truncate(mark);
        }
        ast::Stmt::ForIn(ast::ForInStmt { left, body, .. }) | ast::Stmt::ForOf(ast::ForOfStmt { left, body, .. }) => {
            let mark = lexical.len();
            if let ast::ForHead::VarDecl(v) = left {
                if !matches!(v.kind, ast::VarDeclKind::Var) {
                    for d in &v.decls {
                        lexical.extend(scope::pat_names(&d.name));
                    }
                }
            }
            block(std::slice::from_ref(&**body), lexical, out);
            lexical.truncate(mark);
        }
        ast::Stmt::Switch(sw) => {
            let all: Vec<ast::Stmt> = sw.cases.iter().flat_map(|c| c.cons.iter().cloned()).collect();
            block(&all, lexical, out);
        }
        ast::Stmt::Try(t) => {
            block(&t.block.stmts, lexical, out);
            if let Some(h) = &t.handler {
                let mark = lexical.len();
                // A simple catch parameter may be redeclared by `var`
                // (B.3.5), so only a destructuring one conflicts.
                if let Some(p) = h.param.as_ref().filter(|p| !matches!(p, ast::Pat::Ident(_))) {
                    lexical.extend(scope::pat_names(p));
                }
                block(&h.body.stmts, lexical, out);
                lexical.truncate(mark);
            }
            if let Some(f) = &t.finalizer {
                block(&f.stmts, lexical, out);
            }
        }
        _ => {}
    }
}

/// One link of an optional chain: a member access or a call, and whether it
/// is reached through `?.`.
enum ChainLink<'a> {
    Member(&'a ast::MemberProp, bool),
    Call(&'a [ast::ExprOrSpread], bool),
}

/// Is `e` an optional chain, or a member access/call continuing one (not
/// through parentheses, which end a chain)?
fn continues_chain(e: &ast::Expr) -> bool {
    match e {
        ast::Expr::OptChain(_) => true,
        ast::Expr::Member(m) => continues_chain(&m.obj),
        ast::Expr::Call(c) => matches!(&c.callee, ast::Callee::Expr(f) if continues_chain(f)),
        _ => false,
    }
}

/// The links of the chain ending at `e`, innermost first; returns its base.
fn flatten_chain<'a>(e: &'a ast::Expr, links: &mut Vec<ChainLink<'a>>) -> &'a ast::Expr {
    match e {
        ast::Expr::OptChain(oc) => match &*oc.base {
            ast::OptChainBase::Member(m) => {
                let b = flatten_chain(&m.obj, links);
                links.push(ChainLink::Member(&m.prop, oc.optional));
                b
            }
            ast::OptChainBase::Call(c) => {
                let b = flatten_chain(&c.callee, links);
                links.push(ChainLink::Call(&c.args, oc.optional));
                b
            }
        },
        ast::Expr::Member(m) if continues_chain(&m.obj) => {
            let b = flatten_chain(&m.obj, links);
            links.push(ChainLink::Member(&m.prop, false));
            b
        }
        ast::Expr::Call(c) if matches!(&c.callee, ast::Callee::Expr(f) if continues_chain(f)) => {
            let ast::Callee::Expr(f) = &c.callee else { unreachable!() };
            let b = flatten_chain(f, links);
            links.push(ChainLink::Call(&c.args, false));
            b
        }
        other => other,
    }
}

/// Does a `try` with a `finally` in `stmts` hold a `yield` in its block or
/// handler (not inside a nested function)?
fn yield_in_try_finally(stmts: &[ast::Stmt]) -> bool {
    use swc_ecma_visit::{Visit, VisitWith};
    struct Yields(bool);
    impl Visit for Yields {
        fn visit_yield_expr(&mut self, _: &ast::YieldExpr) {
            self.0 = true;
        }
        fn visit_function(&mut self, _: &ast::Function) {}
        fn visit_arrow_expr(&mut self, _: &ast::ArrowExpr) {}
        fn visit_class(&mut self, _: &ast::Class) {}
    }
    struct Finder(bool);
    impl Visit for Finder {
        fn visit_try_stmt(&mut self, t: &ast::TryStmt) {
            if t.finalizer.is_some() {
                let mut y = Yields(false);
                t.block.visit_with(&mut y);
                if let Some(h) = &t.handler {
                    h.visit_with(&mut y);
                }
                self.0 |= y.0;
            }
            t.visit_children_with(self);
        }
        fn visit_function(&mut self, _: &ast::Function) {}
        fn visit_arrow_expr(&mut self, _: &ast::ArrowExpr) {}
        fn visit_class(&mut self, _: &ast::Class) {}
    }
    let mut f = Finder(false);
    stmts.iter().for_each(|s| s.visit_with(&mut f));
    f.0
}

/// A function's `length`: the parameters before the first one with a default
/// value or a rest parameter.
fn expected_argument_count(params: &[ast::Pat]) -> usize {
    params.iter().take_while(|p| !matches!(p, ast::Pat::Assign(_) | ast::Pat::Rest(_))).count()
}

fn hoist_vars(stmts: &[ast::Stmt], ctx: &mut FnCtx) {
    let mut names = Vec::new();
    for s in stmts {
        collect_vars(s, &mut names);
    }
    for name in names {
        // (A script's top-level `var` is a global.)
        if !ctx.script_globals.contains(&name) {
            ctx.declare_var(&name);
        }
    }
}

fn collect_decl_idents(v: &ast::VarDecl, out: &mut Vec<String>) {
    if !matches!(v.kind, ast::VarDeclKind::Var) {
        return; // let/const are block-scoped, not hoisted
    }
    for d in &v.decls {
        out.extend(scope::pat_names(&d.name));
    }
}

fn collect_vars(s: &ast::Stmt, out: &mut Vec<String>) {
    match s {
        ast::Stmt::Decl(ast::Decl::Var(v)) => collect_decl_idents(v, out),
        ast::Stmt::Block(b) => b.stmts.iter().for_each(|s| collect_vars(s, out)),
        ast::Stmt::If(i) => {
            collect_vars(&i.cons, out);
            if let Some(a) = &i.alt {
                collect_vars(a, out);
            }
        }
        ast::Stmt::For(f) => {
            if let Some(ast::VarDeclOrExpr::VarDecl(v)) = &f.init {
                collect_decl_idents(v, out);
            }
            collect_vars(&f.body, out);
        }
        ast::Stmt::ForIn(f) => {
            if let ast::ForHead::VarDecl(v) = &f.left {
                collect_decl_idents(v, out);
            }
            collect_vars(&f.body, out)
        }
        ast::Stmt::ForOf(f) => {
            if let ast::ForHead::VarDecl(v) = &f.left {
                collect_decl_idents(v, out);
            }
            collect_vars(&f.body, out)
        }
        ast::Stmt::While(w) => collect_vars(&w.body, out),
        ast::Stmt::DoWhile(d) => collect_vars(&d.body, out),
        ast::Stmt::Switch(sw) => {
            for c in &sw.cases {
                c.cons.iter().for_each(|s| collect_vars(s, out));
            }
        }
        ast::Stmt::Try(t) => {
            t.block.stmts.iter().for_each(|s| collect_vars(s, out));
            if let Some(h) = &t.handler {
                h.body.stmts.iter().for_each(|s| collect_vars(s, out));
            }
            if let Some(f) = &t.finalizer {
                f.stmts.iter().for_each(|s| collect_vars(s, out));
            }
        }
        ast::Stmt::Labeled(l) => collect_vars(&l.body, out),
        // expressions and nested functions don't contribute function-scoped vars
        _ => {}
    }
}

/// A string a literal names: the string, or, when it is not well-formed
/// Unicode (a surrogate without its pair, which the specializer's strings
/// cannot hold), a runtime value over its code units (see
/// `ILL_FORMED_STRING`).
fn string_value(value: &swc_atoms::Wtf8Atom) -> Expr {
    match value.as_str() {
        Some(text) => Expr::Str(text.to_string()),
        None => {
            let hex: String = value.to_ill_formed_utf16().map(|unit| format!("{unit:04x}")).collect();
            Expr::Opaque(ILL_FORMED_STRING.into(), vec![Expr::Str(hex)])
        }
    }
}

fn lower_lit(lit: &ast::Lit) -> R<Expr> {
    match lit {
        ast::Lit::Num(n) => {
            Ok(Expr::Num(JsNum(n.value)))
        }
        ast::Lit::Str(s) => Ok(string_value(&s.value)),
        ast::Lit::Bool(b) => Ok(Expr::Bool(b.value)),
        ast::Lit::Null(_) => Ok(Expr::Null),
        ast::Lit::BigInt(b) => Ok(Expr::BigInt(b.value.to_string())),
        ast::Lit::Regex(r) => Ok(Expr::Regex(r.exp.to_string(), r.flags.to_string())),
        ast::Lit::JSXText(_) => Err("JSX is not supported".into()),
    }
}

fn prop_name(p: &ast::PropName) -> R<String> {
    match p {
        ast::PropName::Ident(id) => Ok(id.sym.to_string()),
        // (A property's name is a string of the model: one that is not
        // well-formed Unicode has no such string.)
        ast::PropName::Str(s) => match s.value.as_str() {
            Some(name) => Ok(name.to_string()),
            None => Err("a property name that is not well-formed Unicode (a surrogate without its pair) is not supported".into()),
        },
        ast::PropName::Num(n) => Ok((n.value as i64).to_string()),
        _ => Err("computed / BigInt object keys are not supported".into()),
    }
}

fn pat_ident(p: &ast::Pat) -> R<&str> {
    match p {
        ast::Pat::Ident(bi) => Ok(bi.id.sym.as_str()),
        _ => Err("only simple identifier bindings are supported (no destructuring)".into()),
    }
}

/// Does `node` mention the identifier `name` anywhere (shadowed or not)?
fn mentions_ident<N: swc_ecma_visit::VisitWith<MentionsIdent>>(node: &N, name: &str) -> bool {
    let mut v = MentionsIdent { name: name.to_string(), found: false };
    node.visit_with(&mut v);
    v.found
}

struct MentionsIdent {
    name: String,
    found: bool,
}

impl swc_ecma_visit::Visit for MentionsIdent {
    fn visit_ident(&mut self, i: &ast::Ident) {
        if *i.sym == *self.name {
            self.found = true;
        }
    }
}

/// Is `e` a direct call `eval(...)`?
fn is_direct_eval_call(e: &ast::Expr) -> bool {
    matches!(unparen(e), ast::Expr::Call(c) if matches!(&c.callee, ast::Callee::Expr(f) if matches!(&**f, ast::Expr::Ident(i) if &*i.sym == "eval")))
}

/// Whether a function's direct `eval` can rerun the call at runtime: its
/// body is guards `if (c) <exit>` (`c` doing nothing but read a variable, a
/// literal or a property of the global object, combined by `!`, `typeof`,
/// `void`, `===`, `!==`, `&&`, `||`, `??`; `<exit>` a `return` or `throw`,
/// or a block ending in one) and then `return eval(e)` (`e` doing nothing
/// either), with plain parameters it never assigns, no `arguments` and no
/// nested function. Reaching the `eval` has then done nothing the program
/// can see, so calling the function again with the same `this` and
/// arguments, at runtime, is the call.
fn rerun_eval_ok(func: &ast::Function) -> bool {
    fn quiet(e: &ast::Expr) -> bool {
        match unparen(e) {
            ast::Expr::Ident(i) => &*i.sym != "eval" && &*i.sym != "arguments",
            ast::Expr::Lit(_) => true,
            ast::Expr::Member(m) => {
                matches!(&*m.obj, ast::Expr::Ident(i) if matches!(&*i.sym, "global" | "globalThis" | "window" | "self"))
                    && matches!(&m.prop, ast::MemberProp::Ident(_))
            }
            ast::Expr::Unary(u) => matches!(u.op, ast::UnaryOp::Bang | ast::UnaryOp::TypeOf | ast::UnaryOp::Void) && quiet(&u.arg),
            ast::Expr::Bin(b) => {
                matches!(
                    b.op,
                    ast::BinaryOp::EqEqEq | ast::BinaryOp::NotEqEq | ast::BinaryOp::LogicalAnd | ast::BinaryOp::LogicalOr | ast::BinaryOp::NullishCoalescing
                ) && quiet(&b.left)
                    && quiet(&b.right)
            }
            _ => false,
        }
    }
    fn exits(s: &ast::Stmt) -> bool {
        match s {
            ast::Stmt::Return(_) | ast::Stmt::Throw(_) => true,
            ast::Stmt::Block(b) => b.stmts.last().is_some_and(exits),
            _ => false,
        }
    }
    let Some(body) = &func.body else { return false };
    if !func.params.iter().all(|p| matches!(p.pat, ast::Pat::Ident(_))) || func.is_generator || func.is_async {
        return false;
    }
    let Some((last, guards)) = body.stmts.split_last() else { return false };
    let ok_last = match last {
        ast::Stmt::Return(r) => match r.arg.as_deref().map(unparen) {
            Some(ast::Expr::Call(c)) if is_direct_eval_call(&ast::Expr::Call(c.clone())) => c.args.iter().all(|a| a.spread.is_none() && quiet(&a.expr)),
            _ => false,
        },
        _ => false,
    };
    let ok_guards = guards.iter().all(|g| matches!(g, ast::Stmt::If(i) if i.alt.is_none() && quiet(&i.test) && exits(&i.cons)));
    if !ok_last || !ok_guards {
        return false;
    }
    // (Nothing else in it calls `eval`, assigns a parameter, reads
    // `arguments` or makes a function.)
    struct Find {
        bad: bool,
        evals: usize,
    }
    impl swc_ecma_visit::Visit for Find {
        fn visit_call_expr(&mut self, c: &ast::CallExpr) {
            if is_direct_eval_call(&ast::Expr::Call(c.clone())) {
                self.evals += 1;
            }
            swc_ecma_visit::VisitWith::visit_children_with(c, self);
        }
        fn visit_assign_expr(&mut self, a: &ast::AssignExpr) {
            self.bad = true;
            swc_ecma_visit::VisitWith::visit_children_with(a, self);
        }
        fn visit_update_expr(&mut self, u: &ast::UpdateExpr) {
            self.bad = true;
            swc_ecma_visit::VisitWith::visit_children_with(u, self);
        }
        fn visit_ident(&mut self, i: &ast::Ident) {
            if &*i.sym == "arguments" {
                self.bad = true;
            }
        }
        fn visit_function(&mut self, _: &ast::Function) {
            self.bad = true;
        }
        fn visit_arrow_expr(&mut self, _: &ast::ArrowExpr) {
            self.bad = true;
        }
        fn visit_var_decl(&mut self, v: &ast::VarDecl) {
            self.bad = true;
            swc_ecma_visit::VisitWith::visit_children_with(v, self);
        }
    }
    let mut f = Find { bad: false, evals: 0 };
    swc_ecma_visit::VisitWith::visit_with(body, &mut f);
    !f.bad && f.evals == 1
}

/// Does `func` (or a function inside it) call `eval(...)` directly with code
/// that is not a literal?
fn has_dynamic_direct_eval(func: &ast::Function) -> bool {
    struct Find(bool);
    impl swc_ecma_visit::Visit for Find {
        fn visit_call_expr(&mut self, c: &ast::CallExpr) {
            if let ast::Callee::Expr(e) = &c.callee {
                if matches!(&**e, ast::Expr::Ident(i) if &*i.sym == "eval") {
                    let literal = c.args.first().is_some_and(|a| {
                        a.spread.is_none()
                            && match unparen(&a.expr) {
                                ast::Expr::Lit(ast::Lit::Str(_)) => true,
                                ast::Expr::Tpl(t) => t.exprs.is_empty(),
                                _ => false,
                            }
                    });
                    if !literal {
                        self.0 = true;
                    }
                }
            }
            swc_ecma_visit::VisitWith::visit_children_with(c, self);
        }
    }
    let mut f = Find(false);
    swc_ecma_visit::VisitWith::visit_with(func, &mut f);
    f.0
}
