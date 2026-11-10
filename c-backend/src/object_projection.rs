//! Object object projection: encode source syntax and lexical addresses as immutable data.
//! The synthetic entry executes source initialization, then calls the original main.
//! This is a bounded JavaScript profile: no eval, accessors, spread, classes, modules,
//! function-declaration reassignment, or uninitialized lexical-binding reads. The
//! latter profile restriction also applies through callbacks (TDZ is not modeled).
//! The guest algorithm is never replaced by host benchmark code.
use serde_json::{json, Value};
use swc_ecma_ast as ast;

type Result<T> = std::result::Result<T, String>;

/// What a parameter needs done on entry: a default to apply and a pattern
/// to take the argument apart with.
struct ParameterSetup<'a> {
    position: usize,
    default: Option<&'a ast::Expr>,
    pattern: Option<&'a ast::Pat>,
    /// A rest parameter: `pattern` receives the arguments from `position` on.
    rest: bool,
}
/// Parameter names (a hidden one for a pattern) and their entry work.
fn parameters<'a>(patterns: &[&'a ast::Pat]) -> Result<(Vec<String>, Vec<ParameterSetup<'a>>)> {
    let mut names = Vec::new();
    let mut setup = Vec::new();
    for (position, pattern) in patterns.iter().enumerate() {
        if let ast::Pat::Rest(rest) = pattern {
            if position + 1 != patterns.len() {
                return Err("object projection: a rest parameter must be last".into());
            }
            setup.push(ParameterSetup { position, default: None, pattern: Some(&*rest.arg), rest: true });
            continue;
        }
        let (inner, default) = match pattern {
            ast::Pat::Assign(assign) => (&*assign.left, Some(&*assign.right)),
            other => (*other, None),
        };
        let pattern = match inner {
            ast::Pat::Ident(i) => {
                names.push(i.id.sym.to_string());
                None
            }
            ast::Pat::Array(_) | ast::Pat::Object(_) => {
                names.push(format!("%p{position}"));
                Some(inner)
            }
            _ => return Err("object projection: unsupported parameter pattern".into()),
        };
        if default.is_some() || pattern.is_some() {
            setup.push(ParameterSetup { position, default, pattern, rest: false });
        }
    }
    Ok((names, setup))
}
/// Every name a binding pattern declares, in source order.
fn pattern_names(pattern: &ast::Pat, names: &mut Vec<String>) -> Result<()> {
    match pattern {
        ast::Pat::Ident(i) => add(names, i.id.sym.to_string()),
        ast::Pat::Assign(a) => pattern_names(&a.left, names)?,
        ast::Pat::Rest(r) => pattern_names(&r.arg, names)?,
        ast::Pat::Array(a) => {
            for element in a.elems.iter().flatten() {
                pattern_names(element, names)?;
            }
        }
        ast::Pat::Object(o) => {
            for property in &o.props {
                match property {
                    ast::ObjectPatProp::KeyValue(p) => pattern_names(&p.value, names)?,
                    ast::ObjectPatProp::Assign(p) => add(names, p.key.id.sym.to_string()),
                    ast::ObjectPatProp::Rest(_) => {
                        return Err("object projection: object rest patterns are not supported".into())
                    }
                }
            }
        }
        _ => return Err("object projection: unsupported binding pattern".into()),
    }
    Ok(())
}
fn ident(p: &ast::Pat) -> Result<String> {
    match p {
        ast::Pat::Ident(i) => Ok(i.id.sym.to_string()),
        _ => Err(
            "object projection: only identifier parameters and var bindings are supported".into(),
        ),
    }
}
fn add(names: &mut Vec<String>, name: String) {
    if !names.contains(&name) {
        names.push(name);
    }
}
fn collect(stmt: &ast::Stmt, names: &mut Vec<String>) -> Result<()> {
    match stmt {
        ast::Stmt::Decl(ast::Decl::Var(v)) => {
            if v.kind != ast::VarDeclKind::Var {
                return Ok(());
            }
            for d in &v.decls {
                pattern_names(&d.name, names)?;
            }
        }
        ast::Stmt::Decl(ast::Decl::Fn(f)) => add(names, f.ident.sym.to_string()),
        ast::Stmt::Block(b) => {
            for s in &b.stmts {
                collect(s, names)?;
            }
        }
        ast::Stmt::If(i) => {
            collect(&i.cons, names)?;
            if let Some(e) = &i.alt {
                collect(e, names)?;
            }
        }
        ast::Stmt::While(w) => collect(&w.body, names)?,
        ast::Stmt::DoWhile(w) => collect(&w.body, names)?,
        ast::Stmt::ForOf(f) => {
            if let ast::ForHead::VarDecl(v) = &f.left {
                collect(&ast::Stmt::Decl(ast::Decl::Var(v.clone())), names)?;
            }
            collect(&f.body, names)?;
        }
        ast::Stmt::Try(t) => {
            let handler = t.handler.iter().flat_map(|h| &h.body.stmts);
            let finalizer = t.finalizer.iter().flat_map(|f| &f.stmts);
            for statement in t.block.stmts.iter().chain(handler).chain(finalizer) {
                collect(statement, names)?;
            }
        }
        ast::Stmt::Switch(s) => {
            for case in &s.cases {
                for statement in &case.cons {
                    collect(statement, names)?;
                }
            }
        }
        ast::Stmt::For(f) => {
            if let Some(ast::VarDeclOrExpr::VarDecl(v)) = &f.init {
                collect(&ast::Stmt::Decl(ast::Decl::Var(v.clone())), names)?;
            }
            collect(&f.body, names)?;
        }
        _ => {}
    }
    Ok(())
}
/// Whether a function body mentions `arguments` as a variable, in itself or
/// in an arrow function nested in it. Ordinary nested functions have their own.
fn mentions_arguments(body: &[ast::Stmt]) -> bool {
    use swc_ecma_visit::{Visit, VisitWith};
    struct Scan(bool);
    impl Visit for Scan {
        fn visit_function(&mut self, _: &ast::Function) {}
        fn visit_ident(&mut self, ident: &ast::Ident) {
            self.0 |= ident.sym == *"arguments";
        }
    }
    let mut scan = Scan(false);
    for statement in body {
        statement.visit_with(&mut scan);
    }
    scan.0
}
/// Whether a function body has a `try` statement of its own, not counting
/// those inside nested functions.
fn contains_try(body: &[ast::Stmt]) -> bool {
    use swc_ecma_visit::{Visit, VisitWith};
    struct Scan(bool);
    impl Visit for Scan {
        fn visit_function(&mut self, _: &ast::Function) {}
        fn visit_arrow_expr(&mut self, _: &ast::ArrowExpr) {}
        fn visit_try_stmt(&mut self, _: &ast::TryStmt) {
            self.0 = true;
        }
    }
    let mut scan = Scan(false);
    for statement in body {
        statement.visit_with(&mut scan);
    }
    scan.0
}
fn lexical_names(stmts: &[ast::Stmt]) -> Result<Vec<String>> {
    let mut names = Vec::new();
    for s in stmts {
        if let ast::Stmt::Decl(ast::Decl::Class(c)) = s {
            add(&mut names, c.ident.sym.to_string());
        }
        if let ast::Stmt::Decl(ast::Decl::Var(v)) = s {
            if v.kind != ast::VarDeclKind::Var {
                for d in &v.decls {
                    pattern_names(&d.name, &mut names)?;
                }
            }
        }
    }
    Ok(names)
}
fn constant_names(stmts: &[ast::Stmt]) -> Result<Vec<String>> {
    let mut names = vec![];
    for stmt in stmts {
        if let ast::Stmt::Decl(ast::Decl::Var(v)) = stmt {
            if v.kind == ast::VarDeclKind::Const {
                for declaration in &v.decls {
                    pattern_names(&declaration.name, &mut names)?;
                }
            }
        }
    }
    Ok(names)
}
fn math_member(m: &ast::MemberExpr, property: &str) -> bool {
    matches!(&*m.obj, ast::Expr::Ident(i) if i.sym == "Math")
        && matches!(&m.prop, ast::MemberProp::Ident(i) if i.sym == property)
}
struct LexicalEncoder {
    scopes: Vec<Vec<String>>,
    declarations: Vec<Vec<String>>,
    constants: Vec<Vec<String>>,
    pending: Vec<std::collections::BTreeSet<String>>,
    function_bases: Vec<usize>,
    /// The class whose member is being encoded, innermost last; None inside
    /// an ordinary function, which has no `super`.
    classes: Vec<Option<ClassContext>>,
    /// The next function encoded is a base class constructor, which starts
    /// by initializing the instance's fields.
    fields_prologue: bool,
    /// Every name the program itself binds anywhere. A builtin global that
    /// is not among them means the builtin wherever it is mentioned.
    user_bindings: std::collections::BTreeSet<String>,
    /// How many leading module statements are the builtin prelude.
    prelude_statements: usize,
    /// Encoding one of them: the prelude-only forms are available.
    in_prelude: bool,
}
/// The effect named by a prelude function's leading "summary <name>" string.
fn summary_directive(body: &[ast::Stmt]) -> Option<String> {
    let ast::Stmt::Expr(e) = body.first()? else {
        return None;
    };
    let ast::Expr::Lit(ast::Lit::Str(s)) = &*e.expr else {
        return None;
    };
    s.value.as_str()?.strip_prefix("summary ").map(str::to_owned)
}
/// What `super` means where a class member is being encoded.
#[derive(Clone, Copy)]
struct ClassContext {
    derived: bool,
    is_static: bool,
    constructor: bool,
}
/// Attributes of a class method: writable and configurable, not enumerable.
const METHOD_FIELDS: u64 = 1 + 2 + 4 + 8 + 32 + 64;
/// Attributes of a class field: all three.
const FIELD_FIELDS: u64 = 1 + 2 + 4 + 8 + 16 + 32 + 64;
/// Where the pieces of a destructuring pattern go: entries of a `var`
/// statement, or assignment expressions.
enum Bind<'a> {
    Declare(&'a mut Vec<Value>),
    Assign(&'a mut Vec<Value>),
}
impl LexicalEncoder {
    /// One link of an optional chain. A `?.` appends (temporary, the value it
    /// tests) to `guards`, outermost first, and continues from the temporary.
    fn optional(&mut self, e: &ast::Expr, guards: &mut Vec<(Value, Value)>) -> Result<Value> {
        let ast::Expr::OptChain(chain) = e else {
            return self.expr(e);
        };
        match &*chain.base {
            ast::OptChainBase::Member(m) => {
                let mut object = self.optional(&m.obj, guards)?;
                if chain.optional {
                    let holder = self.temporary();
                    guards.push((holder.clone(), object));
                    object = holder;
                }
                let key = match &m.prop {
                    ast::MemberProp::Ident(i) => json!(["lit", i.sym.as_str()]),
                    ast::MemberProp::Computed(c) => self.expr(&c.expr)?,
                    _ => return Err("object projection: private members are not supported".into()),
                };
                Ok(json!(["get", object, key]))
            }
            ast::OptChainBase::Call(call) => {
                // The callee, with the object it was read from if any.
                let (inner_optional, member) = match &*call.callee {
                    ast::Expr::Member(m) => (false, Some(m)),
                    ast::Expr::OptChain(inner) => match &*inner.base {
                        ast::OptChainBase::Member(m) => (inner.optional, Some(m)),
                        _ => (false, None),
                    },
                    _ => (false, None),
                };
                let (function, receiver) = match member {
                    Some(m) => {
                        let mut object = self.optional(&m.obj, guards)?;
                        if inner_optional {
                            let holder = self.temporary();
                            guards.push((holder.clone(), object));
                            object = holder;
                        }
                        let receiver = self.temporary();
                        let key = match &m.prop {
                            ast::MemberProp::Ident(i) => json!(["lit", i.sym.as_str()]),
                            ast::MemberProp::Computed(c) => self.expr(&c.expr)?,
                            _ => return Err("object projection: private members are not supported".into()),
                        };
                        (json!(["get", ["assign", "=", receiver, object], key]), Some(receiver))
                    }
                    None => (self.optional(&call.callee, guards)?, None),
                };
                let function = if chain.optional {
                    let holder = self.temporary();
                    guards.push((holder.clone(), function));
                    holder
                } else {
                    function
                };
                let mut args = Vec::new();
                for a in &call.args {
                    if a.spread.is_some() {
                        return Err("object projection: spreads are not supported".into());
                    }
                    args.push(self.expr(&a.expr)?);
                }
                Ok(match receiver {
                    Some(receiver) => json!(["callthis", function, receiver, args]),
                    None => json!(["call", function, args]),
                })
            }
        }
    }
    /// Arguments or elements that include a spread, as one array-building
    /// node; None when there is no spread.
    fn spread_items(&mut self, items: &[Option<ast::ExprOrSpread>]) -> Result<Option<Value>> {
        if !items.iter().flatten().any(|item| item.spread.is_some()) {
            return Ok(None);
        }
        let mut encoded = Vec::new();
        for item in items {
            encoded.push(match item {
                None => json!(["hole"]),
                Some(item) if item.spread.is_some() => json!(["spread", self.expr(&item.expr)?]),
                Some(item) => self.expr(&item.expr)?,
            });
        }
        Ok(Some(json!(["spreadarray", encoded])))
    }
    /// A fresh hidden variable of the function being encoded.
    fn temporary(&mut self) -> Value {
        let base = *self.function_bases.last().unwrap();
        let slot = self.scopes[base].len();
        self.scopes[base].push(format!("%t{slot}"));
        json!(["var", self.scopes.len() - 1 - base, slot])
    }
    /// Take `source` apart according to `pattern`. An array pattern reads by
    /// index, which is what iterating an array yields; a string is read by
    /// code unit.
    fn destructure(&mut self, pattern: &ast::Pat, source: Value, bind: &mut Bind) -> Result<()> {
        // Store `value` into the variable or property `target` denotes.
        fn store(bind: &mut Bind, target: &Value, value: Value) {
            match bind {
                Bind::Declare(entries) if tag(target) == "var" => {
                    entries.push(json!([target[1], target[2], value]))
                }
                Bind::Declare(entries) | Bind::Assign(entries) => {
                    entries.push(json!(["assign", "=", target, value]))
                }
            }
        }
        match pattern {
            ast::Pat::Ident(i) => {
                let name = i.id.sym.as_str();
                let declaring = matches!(bind, Bind::Declare(_));
                let (depth, slot) = if declaring { self.address(name)? } else { self.mutable_address(name)? };
                if self.declarations[self.scopes.len() - 1 - depth].iter().any(|n| n == name) {
                    return Err(format!("object projection: mutation of function declaration {name} is unsupported"));
                }
                match bind {
                    Bind::Declare(entries) => entries.push(json!([depth, slot, source])),
                    Bind::Assign(steps) => steps.push(json!(["assign", "=", ["var", depth, slot], source])),
                }
                if declaring {
                    let scope = self.scopes.len() - 1 - depth;
                    self.pending[scope].remove(name);
                }
            }
            ast::Pat::Expr(target) => {
                let ast::Expr::Member(member) = &**target else {
                    return Err("object projection: unsupported destructuring target".into());
                };
                let target = self.member(member)?;
                store(bind, &target, source);
            }
            ast::Pat::Assign(assign) => {
                let holder = self.temporary();
                let default = self.expr(&assign.right)?;
                let value = json!([
                    "cond",
                    ["bin", "===", ["assign", "=", holder, source], ["undefined"]],
                    default,
                    holder
                ]);
                self.destructure(&assign.left, value, bind)?;
            }
            ast::Pat::Array(array_pattern) => {
                let holder = self.temporary();
                store(bind, &holder, source);
                for (index, element) in array_pattern.elems.iter().enumerate() {
                    match element {
                        None => {}
                        Some(ast::Pat::Rest(rest)) => {
                            let tail = json!(["methodcall", holder, "slice", [["lit", index]]]);
                            self.destructure(&rest.arg, tail, bind)?;
                        }
                        Some(element) => {
                            self.destructure(element, json!(["get", holder, ["lit", index]]), bind)?;
                        }
                    }
                }
            }
            ast::Pat::Object(object_pattern) => {
                let holder = self.temporary();
                store(bind, &holder, source);
                for property in &object_pattern.props {
                    match property {
                        ast::ObjectPatProp::KeyValue(p) => {
                            let key = match &p.key {
                                ast::PropName::Ident(i) => json!(["lit", i.sym.as_str()]),
                                ast::PropName::Str(s) => json!(["lit", s.value.as_str().ok_or("object projection: unpaired surrogate in property key")?]),
                                ast::PropName::Num(n) => json!(["lit", n.value]),
                                ast::PropName::Computed(c) => self.expr(&c.expr)?,
                                _ => return Err("object projection: unsupported property key in pattern".into()),
                            };
                            self.destructure(&p.value, json!(["get", holder, key]), bind)?;
                        }
                        ast::ObjectPatProp::Assign(p) => {
                            let name = ast::Pat::Ident(p.key.clone());
                            let read = json!(["get", holder, ["lit", p.key.id.sym.as_str()]]);
                            match &p.value {
                                None => self.destructure(&name, read, bind)?,
                                Some(default) => {
                                    let inner = self.temporary();
                                    let default = self.expr(default)?;
                                    let value = json!([
                                        "cond",
                                        ["bin", "===", ["assign", "=", inner, read], ["undefined"]],
                                        default,
                                        inner
                                    ]);
                                    self.destructure(&name, value, bind)?;
                                }
                            }
                        }
                        ast::ObjectPatProp::Rest(_) => {
                            return Err("object projection: object rest patterns are not supported".into())
                        }
                    }
                }
            }
            _ => return Err("object projection: unsupported binding pattern".into()),
        }
        Ok(())
    }
    /// The name of the builtin error constructor an expression denotes.
    fn error_constructor(&self, callee: &ast::Expr) -> Option<&'static str> {
        const KINDS: [&str; 7] = [
            "Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError", "EvalError",
            "URIError",
        ];
        let ast::Expr::Ident(i) = callee else { return None };
        let kind = KINDS.into_iter().find(|kind| i.sym == **kind)?;
        (!self.user_bindings.contains(kind)).then_some(kind)
    }
    fn bound(&self, name: &str) -> bool {
        self.scopes.iter().any(|s| s.iter().any(|n| n == name))
    }
    fn address(&self, name: &str) -> Result<(usize, usize)> {
        for (depth, scope) in self.scopes.iter().rev().enumerate() {
            if let Some(slot) = scope.iter().position(|n| n == name) {
                return Ok((depth, slot));
            }
        }
        Err(format!(
            "object projection: no mutable local binding {name:?}"
        ))
    }
    fn reference(&self, name: &str) -> Result<Value> {
        if let Ok((depth, slot)) = self.address(name) {
            let scope = self.scopes.len() - 1 - depth;
            if scope >= *self.function_bases.last().unwrap() && self.pending[scope].contains(name) {
                return Err(format!(
                    "object projection: direct read before lexical initialization of {name}"
                ));
            }
            let declarations = &self.declarations[self.declarations.len() - 1 - depth];
            if let Some(index) = declarations.iter().position(|n| n == name) {
                return Ok(json!(["decl", depth, index]));
            }
            Ok(json!(["var", depth, slot]))
        } else if name == "undefined" {
            Ok(json!(["undefined"]))
        } else if name == "Infinity" {
            Ok(json!(["bin", "/", ["lit", 1], ["lit", 0]]))
        } else if name == "NaN" {
            Ok(json!(["bin", "/", ["lit", 0], ["lit", 0]]))
        } else {
            Err(format!(
                "object projection: unbound identifier {name:?}; host globals are not supported"
            ))
        }
    }
    fn mutable_address(&self, name: &str) -> Result<(usize, usize)> {
        let (depth, slot) = self.address(name)?;
        if self.declarations[self.declarations.len() - 1 - depth]
            .iter()
            .any(|n| n == name)
        {
            return Err(format!(
                "object projection: mutation of function declaration {name} is unsupported"
            ));
        }
        let scope = self.scopes.len() - 1 - depth;
        if self.constants[scope].iter().any(|n| n == name) {
            return Err(format!(
                "object projection: assignment/update of const {name} is unsupported"
            ));
        }
        if scope >= *self.function_bases.last().unwrap() && self.pending[scope].contains(name) {
            return Err(format!(
                "object projection: assignment before lexical initialization of {name}"
            ));
        }
        Ok((depth, slot))
    }
    /// The protected part of a `try` statement (its block or its handler) as
    /// a closure. It runs in the scope of the `try`, declares no `var`s of
    /// its own, and reports how its body completed instead of returning.
    fn completion_function(&mut self, params: Vec<String>, body: &[ast::Stmt]) -> Result<Value> {
        self.function_kind(params, &[], body, false, true)
    }
    /// `ordinary` is false for an arrow function, which has no `arguments`
    /// of its own.
    fn function(&mut self, params: Vec<String>, body: &[ast::Stmt], ordinary: bool) -> Result<Value> {
        self.function_kind(params, &[], body, ordinary, false)
    }
    fn function_kind(
        &mut self,
        params: Vec<String>,
        defaults: &[ParameterSetup],
        body: &[ast::Stmt],
        ordinary: bool,
        completion: bool,
    ) -> Result<Value> {
        let mut names = Vec::new();
        for p in &params {
            if names.contains(p) {
                return Err("object projection: duplicate parameters are not supported".into());
            }
            names.push(p.clone());
        }
        for parameter in defaults {
            if let Some(pattern) = parameter.pattern {
                pattern_names(pattern, &mut names)?;
            }
        }
        // A completion function's `var`s belong to the function around it.
        if !completion {
            for s in body {
                collect(s, &mut names)?;
            }
        }
        for name in lexical_names(body)? {
            add(&mut names, name);
        }
        // Where a protected part of a `try` here leaves the value of a
        // `return` it executed.
        let result_slot = if contains_try(body) {
            names.push("%result".into());
            names.len() as i64 - 1
        } else {
            -1
        };
        // `arguments` is an ordinary binding the activation initializes with
        // an array of the values it was called with, unless the function
        // declares that name itself.
        let arguments_slot = if ordinary && mentions_arguments(body) && !names.iter().any(|n| n == "arguments") {
            names.push("arguments".into());
            names.len() as i64 - 1
        } else {
            -1
        };
        self.function_bases.push(self.scopes.len());
        self.scopes.push(names.clone());
        self.constants.push(constant_names(body)?);
        self.pending
            .push(lexical_names(body)?.into_iter().collect());
        let declarations = body
            .iter()
            .filter_map(|s| match s {
                ast::Stmt::Decl(ast::Decl::Fn(f)) => Some(f.ident.sym.to_string()),
                _ => None,
            })
            .collect();
        let declarations: Vec<String> = declarations;
        let mut seen = std::collections::BTreeSet::new();
        for name in &declarations {
            if !seen.insert(name.clone()) {
                return Err(format!(
                    "object projection: duplicate function declaration {name}"
                ));
            }
            if params.contains(name) {
                return Err(format!(
                    "object projection: parameter/function declaration collision {name}"
                ));
            }
        }
        self.declarations.push(declarations);
        let mut decls = Vec::new();
        for s in body {
            if let ast::Stmt::Decl(ast::Decl::Fn(f)) = s {
                decls.push(json!([
                    names
                        .iter()
                        .position(|n| n == f.ident.sym.as_str())
                        .unwrap(),
                    self.fn_ast(&f.function)?
                ]));
            }
        }
        let summary = if self.in_prelude { summary_directive(body) } else { None };
        // A default applies when the argument is undefined or missing, in
        // parameter order, before the body.
        let mut prologue = Vec::new();
        if std::mem::take(&mut self.fields_prologue) {
            prologue.push(json!(["expr", ["callthis", self.reference("%fields")?, ["this"], []]]));
        }
        for setup in defaults {
            if setup.rest {
                let mut entries = Vec::new();
                let tail = json!(["restargs", setup.position]);
                self.destructure(setup.pattern.unwrap(), tail, &mut Bind::Declare(&mut entries))?;
                prologue.push(json!(["var", entries]));
                continue;
            }
            let parameter = json!(["var", 0, setup.position]);
            if let Some(default) = setup.default {
                prologue.push(json!([
                    "if",
                    ["bin", "===", parameter, ["undefined"]],
                    ["expr", ["assign", "=", parameter, self.expr(default)?]],
                    ["empty"]
                ]));
            }
            if let Some(pattern) = setup.pattern {
                let mut entries = Vec::new();
                self.destructure(pattern, parameter, &mut Bind::Declare(&mut entries))?;
                prologue.push(json!(["var", entries]));
            }
        }
        let mut encoded = self.block(body, true)?;
        // Temporaries the body's encoding introduced are slots too.
        let slots = self.scopes.last().unwrap().len();
        if !prologue.is_empty() {
            prologue.extend(array(&encoded[1]).iter().cloned());
            encoded[1] = Value::Array(prologue);
        }
        self.scopes.pop();
        self.declarations.pop();
        self.constants.pop();
        self.pending.pop();
        self.function_bases.pop();
        Ok(json!([params.len(), slots, decls, encoded, arguments_slot, summary, completion, result_slot]))
    }
    fn fn_ast(&mut self, f: &ast::Function) -> Result<Value> {
        if f.is_async || f.is_generator {
            return Err("object projection: async/generators are not supported".into());
        }
        self.classes.push(None);
        let encoded = self.member_function(f);
        self.classes.pop();
        encoded
    }
    /// An ordinary function's parameters and body, in whatever class
    /// context is current.
    fn member_function(&mut self, f: &ast::Function) -> Result<Value> {
        if f.is_async || f.is_generator {
            return Err("object projection: async/generators are not supported".into());
        }
        let patterns: Vec<&ast::Pat> = f.params.iter().map(|p| &p.pat).collect();
        let (params, defaults) = parameters(&patterns)?;
        self.function_kind(
            params,
            &defaults,
            &f.body
                .as_ref()
                .ok_or("object projection: function body is required")?
                .stmts,
            true,
            false,
        )
    }
    /// A function whose body is given as already-encoded statements. `names`
    /// are its parameters followed by its other variables.
    fn synthetic(
        &mut self,
        parameters: usize,
        names: Vec<String>,
        build: &mut dyn FnMut(&mut Self) -> Result<Vec<Value>>,
    ) -> Result<Value> {
        self.function_bases.push(self.scopes.len());
        self.scopes.push(names);
        self.constants.push(vec![]);
        self.pending.push(Default::default());
        self.declarations.push(vec![]);
        let statements = build(self);
        let slots = self.scopes.last().unwrap().len();
        self.scopes.pop();
        self.declarations.pop();
        self.constants.pop();
        self.pending.pop();
        self.function_bases.pop();
        Ok(json!([parameters, slots, [], ["block", statements?, 0], -1, null, false, -1]))
    }
    /// The heritage of the class being encoded, or the object its `super`
    /// property references read from.
    fn super_base(&self, property: bool) -> Result<Value> {
        let context = self
            .classes
            .last()
            .copied()
            .flatten()
            .filter(|c| c.derived)
            .ok_or("object projection: super is supported only in a class that extends another")?;
        let heritage = self.reference("%super")?;
        Ok(if property && !context.is_static {
            json!(["get", heritage, ["lit", "prototype"]])
        } else {
            heritage
        })
    }
    fn property_key(&mut self, key: &ast::PropName) -> Result<Value> {
        Ok(match key {
            ast::PropName::Ident(i) => json!(["lit", i.sym.as_str()]),
            ast::PropName::Str(s) => json!([
                "lit",
                s.value.as_str().ok_or("object projection: unpaired surrogate in property key")?
            ]),
            ast::PropName::Computed(c) => self.expr(&c.expr)?,
            _ => return Err("object projection: unsupported class member name".into()),
        })
    }
    /// A class as an expression: an immediately called closure whose scope
    /// holds the heritage, the field initializer and the constructor, and
    /// which defines the members and returns the constructor.
    ///
    /// A derived constructor runs as an ordinary function on the object
    /// `new` created: `super(...)` calls the parent on it and then
    /// initializes fields. `this` is therefore usable before `super`, a
    /// parent's returned object is ignored, and builtins cannot be extended.
    fn class_value(&mut self, class: &ast::Class, inner_name: Option<&str>) -> Result<Value> {
        let derived = class.super_class.is_some();
        let mut names = vec!["%super".to_owned(), "%fields".to_owned(), "%class".to_owned()];
        if let Some(name) = inner_name {
            names.push(name.to_owned());
        }
        let closure = self.synthetic(0, names, &mut |this: &mut Self| {
            let (heritage, fields, constructor) =
                (json!(["var", 0, 0]), json!(["var", 0, 1]), json!(["var", 0, 2]));
            let prototype = json!(["get", constructor, ["lit", "prototype"]]);
            let mut out = Vec::new();
            if let Some(parent) = &class.super_class {
                out.push(json!(["var", [[0, 0, this.expr(parent)?]]]));
                out.push(json!([
                    "if",
                    ["bin", "!==", ["typeof", heritage], ["lit", "function"]],
                    ["throw", ["error", ["lit", "Class extends value is not a constructor"], "TypeError"]],
                    ["empty"]
                ]));
            }
            // Instance fields, as a function run on each new instance.
            let context = |is_static, constructor| Some(ClassContext { derived, is_static, constructor });
            this.classes.push(context(false, false));
            let initializer = this.synthetic(0, vec![], &mut |this: &mut Self| {
                let mut inits = Vec::new();
                for member in &class.body {
                    if let ast::ClassMember::ClassProp(p) = member {
                        if !p.is_static {
                            let value = match &p.value {
                                Some(value) => this.expr(value)?,
                                None => json!(["undefined"]),
                            };
                            let key = this.property_key(&p.key)?;
                            inits.push(json!(["expr", ["define", ["this"], key, value, ["lit", FIELD_FIELDS]]]));
                        }
                    }
                }
                Ok(inits)
            });
            this.classes.pop();
            out.push(json!(["var", [[0, 1, ["fun", initializer?, false]]]]));
            // The constructor.
            let run_fields = json!(["callthis", fields, ["this"], []]);
            let explicit = class.body.iter().find_map(|m| match m {
                ast::ClassMember::Constructor(c) => Some(c),
                _ => None,
            });
            this.classes.push(context(false, true));
            let built = match explicit {
                Some(constructor) => {
                    let mut patterns = Vec::new();
                    for parameter in &constructor.params {
                        match parameter {
                            ast::ParamOrTsParamProp::Param(p) => patterns.push(&p.pat),
                            _ => return Err("object projection: parameter properties are not supported".into()),
                        }
                    }
                    let (params, setup) = parameters(&patterns)?;
                    this.fields_prologue = !derived;
                    let body = constructor.body.as_ref().ok_or("object projection: constructor body is required")?;
                    this.function_kind(params, &setup, &body.stmts, true, false)
                }
                None => this.synthetic(0, vec![], &mut |this: &mut Self| {
                    Ok(vec![if derived {
                        let parent = this.reference("%super")?;
                        let fields = this.reference("%fields")?;
                        json!(["expr", ["seq", [
                            ["spreadcall", 3, parent, ["this"], ["restargs", 0]],
                            ["callthis", fields, ["this"], []]
                        ]]])
                    } else {
                        json!(["expr", ["callthis", this.reference("%fields")?, ["this"], []]])
                    }])
                }),
            };
            this.classes.pop();
            let _ = &run_fields;
            out.push(json!(["var", [[0, 2, ["fun", built?, false]]]]));
            if inner_name.is_some() {
                out.push(json!(["var", [[0, 3, constructor]]]));
            }
            if derived {
                out.push(json!(["expr", ["assign", "=", prototype, ["create", ["get", heritage, ["lit", "prototype"]]]]]));
                out.push(json!(["expr", ["define", prototype, ["lit", "constructor"], constructor, ["lit", METHOD_FIELDS]]]));
                out.push(json!(["expr", ["setproto", constructor, heritage]]));
            }
            for member in &class.body {
                match member {
                    ast::ClassMember::Constructor(_) | ast::ClassMember::Empty(_) => {}
                    ast::ClassMember::Method(m) => {
                        if m.kind != ast::MethodKind::Method {
                            return Err("object projection: accessor properties are not supported".into());
                        }
                        let key = this.property_key(&m.key)?;
                        this.classes.push(context(m.is_static, false));
                        let function = this.member_function(&m.function);
                        this.classes.pop();
                        let target = if m.is_static { constructor.clone() } else { prototype.clone() };
                        out.push(json!(["expr", ["define", target, key, ["fun", function?, false], ["lit", METHOD_FIELDS]]]));
                    }
                    ast::ClassMember::ClassProp(p) if p.is_static => {
                        // The initializer runs with the class as `this`.
                        let key = this.property_key(&p.key)?;
                        this.classes.push(context(true, false));
                        let initializer = this.synthetic(0, vec![], &mut |this: &mut Self| {
                            Ok(vec![json!(["return", match &p.value {
                                Some(value) => this.expr(value)?,
                                None => json!(["undefined"]),
                            }])])
                        });
                        this.classes.pop();
                        let value = json!(["callthis", ["fun", initializer?, false], constructor, []]);
                        out.push(json!(["expr", ["define", constructor, key, value, ["lit", FIELD_FIELDS]]]));
                    }
                    ast::ClassMember::ClassProp(_) => {}
                    _ => return Err("object projection: unsupported class member (private, static block or accessor)".into()),
                }
            }
            out.push(json!(["return", constructor]));
            Ok(out)
        })?;
        Ok(json!(["call", ["fun", closure, true], []]))
    }
    fn block(&mut self, stmts: &[ast::Stmt], function_body: bool) -> Result<Value> {
        let names = if function_body {
            vec![]
        } else {
            lexical_names(stmts)?
        };
        let nslots = names.len();
        if nslots > 0 {
            self.pending.push(names.iter().cloned().collect());
            self.constants.push(constant_names(stmts)?);
            self.scopes.push(names);
            self.declarations.push(vec![]);
        }
        let mut out = Vec::new();
        let module_body = function_body && self.function_bases.len() == 1;
        for (index, s) in stmts.iter().enumerate() {
            if module_body {
                self.in_prelude = index < self.prelude_statements;
            }
            if function_body && self.in_prelude && index == 0 && summary_directive(stmts).is_some() {
                continue;
            }
            if matches!(s, ast::Stmt::Decl(ast::Decl::Fn(_))) {
                if !function_body {
                    return Err(
                        "object projection: block-level function declarations are not supported"
                            .into(),
                    );
                }
                continue;
            }
            // Directives change semantics; do not silently treat them as expressions.
            if matches!(s, ast::Stmt::Expr(e) if matches!(&*e.expr, ast::Expr::Lit(ast::Lit::Str(_))))
            {
                return Err("object projection: directives are not supported".into());
            }
            out.push(self.stmt(s)?);
        }
        if nslots > 0 {
            self.scopes.pop();
            self.declarations.pop();
            self.constants.pop();
            self.pending.pop();
        }
        Ok(json!(["block", out, nslots]))
    }
    fn stmt(&mut self, s: &ast::Stmt) -> Result<Value> {
        Ok(match s {
            ast::Stmt::Empty(_) => json!(["empty"]),
            ast::Stmt::Expr(e) => json!(["expr", self.expr(&e.expr)?]),
            ast::Stmt::Block(b) => self.block(&b.stmts, false)?,
            ast::Stmt::Throw(t) => json!(["throw", self.expr(&t.arg)?]),
            ast::Stmt::Return(r) => json!([
                "return",
                match &r.arg {
                    Some(e) => self.expr(e)?,
                    None => json!(["undefined"]),
                }
            ]),
            ast::Stmt::If(i) => json!([
                "if",
                self.expr(&i.test)?,
                self.stmt(&i.cons)?,
                match &i.alt {
                    Some(s) => self.stmt(s)?,
                    None => json!(["empty"]),
                }
            ]),
            ast::Stmt::While(w) => json!(["while", self.expr(&w.test)?, self.stmt(&w.body)?]),
            ast::Stmt::ForOf(f) => {
                if f.is_await {
                    return Err("object projection: for await is not supported".into());
                }
                // Arrays and strings are iterated by index against their
                // live length, a string by code unit; anything else throws.
                let (items, index) = (self.temporary(), self.temporary());
                let iterable = json!([
                    "bin",
                    "||",
                    ["isarray", items],
                    ["bin", "===", ["typeof", items], ["lit", "string"]]
                ]);
                let prepare = vec![
                    json!(["expr", ["assign", "=", items, self.expr(&f.right)?]]),
                    json!([
                        "if",
                        ["unary", "!", iterable],
                        ["throw", ["error", ["lit", "value is not iterable (only arrays and strings are)"], "TypeError"]],
                        ["empty"]
                    ]),
                ];
                let element = json!(["get", items, index]);
                // A `let` or `const` head is a fresh binding each iteration.
                let (declared, pattern, lexical) = match &f.left {
                    ast::ForHead::VarDecl(v) => {
                        if v.decls.len() != 1 || v.decls[0].init.is_some() {
                            return Err("object projection: malformed for-of declaration".into());
                        }
                        (true, v.decls[0].name.clone(), v.kind != ast::VarDeclKind::Var)
                    }
                    ast::ForHead::Pat(pattern) => (false, (**pattern).clone(), false),
                    _ => return Err("object projection: unsupported for-of head".into()),
                };
                let mut names = Vec::new();
                if lexical {
                    pattern_names(&pattern, &mut names)?;
                    self.pending.push(names.iter().cloned().collect());
                    let constant = matches!(&f.left, ast::ForHead::VarDecl(v) if v.kind == ast::VarDeclKind::Const);
                    self.constants.push(if constant { names.clone() } else { vec![] });
                    self.scopes.push(names.clone());
                    self.declarations.push(vec![]);
                }
                // Inside the per-iteration scope the temporaries are one
                // frame further out.
                let outward = |v: &Value| json!(["var", num(&v[1]) + i64::from(lexical), v[2]]);
                let element = if lexical { json!(["get", outward(&items), outward(&index)]) } else { element };
                let mut steps = Vec::new();
                if declared {
                    let mut entries = Vec::new();
                    self.destructure(&pattern, element, &mut Bind::Declare(&mut entries))?;
                    steps.push(json!(["var", entries]));
                } else {
                    let mut assignments = Vec::new();
                    self.destructure(&pattern, element, &mut Bind::Assign(&mut assignments))?;
                    steps.extend(assignments.into_iter().map(|a| json!(["expr", a])));
                }
                steps.push(self.stmt(&f.body)?);
                if lexical {
                    self.scopes.pop();
                    self.declarations.pop();
                    self.constants.pop();
                    self.pending.pop();
                }
                let body = json!(["block", steps, names.len()]);
                let mut whole = prepare;
                whole.push(json!([
                    "for",
                    ["bin", "<", index, ["get", items, ["lit", "length"]]],
                    body,
                    ["expr", ["assign", "=", index, ["lit", 0]]],
                    ["update", 1, index, true],
                    0
                ]));
                json!(["block", whole, 0])
            }
            ast::Stmt::Try(t) => {
                // ["try", block closure, handler closure or null, finalizer
                // statement or null, the variable holding a returned value]
                let result = self.reference("%result")?;
                let block = json!(["fun", self.completion_function(vec![], &t.block.stmts)?, true]);
                let handler = match &t.handler {
                    None => Value::Null,
                    Some(clause) => {
                        let params = match &clause.param {
                            None => vec![],
                            Some(pattern) => vec![ident(pattern)?],
                        };
                        json!(["fun", self.completion_function(params, &clause.body.stmts)?, true])
                    }
                };
                let finalizer = match &t.finalizer {
                    None => Value::Null,
                    Some(block) => self.block(&block.stmts, false)?,
                };
                json!(["try", block, handler, finalizer, result])
            }
            ast::Stmt::DoWhile(w) => {
                // Children in execution order: the body runs before the test.
                let body = self.stmt(&w.body)?;
                json!(["dowhile", self.expr(&w.test)?, body])
            }
            ast::Stmt::Switch(s) => {
                // ["switch", discriminant, ["case", test, block] | ["default", block] ...]
                let mut encoded = vec![json!("switch"), self.expr(&s.discriminant)?];
                let mut defaults = 0;
                for case in &s.cases {
                    // The clauses of a switch share one lexical scope, which
                    // this encoding does not model.
                    if !lexical_names(&case.cons)?.is_empty()
                        || case.cons.iter().any(|s| {
                            matches!(s, ast::Stmt::Decl(ast::Decl::Fn(_) | ast::Decl::Class(_)))
                        })
                    {
                        return Err("a declaration directly inside a switch clause is unsupported; enclose the clause body in a block".into());
                    }
                    let body = self.block(&case.cons, false)?;
                    encoded.push(match &case.test {
                        Some(test) => json!(["case", self.expr(test)?, body]),
                        None => {
                            defaults += 1;
                            json!(["default", body])
                        }
                    });
                }
                if defaults > 1 {
                    return Err("switch has more than one default clause".into());
                }
                Value::Array(encoded)
            }
            ast::Stmt::For(f) => {
                let names = match &f.init {
                    Some(ast::VarDeclOrExpr::VarDecl(v)) => {
                        lexical_names(&[ast::Stmt::Decl(ast::Decl::Var(v.clone()))])?
                    }
                    _ => vec![],
                };
                let nslots = names.len();
                if nslots > 0 {
                    self.pending.push(names.iter().cloned().collect());
                    self.constants.push(match &f.init {
                        Some(ast::VarDeclOrExpr::VarDecl(v))
                            if v.kind == ast::VarDeclKind::Const =>
                        {
                            names.clone()
                        }
                        _ => vec![],
                    });
                    self.scopes.push(names);
                    self.declarations.push(vec![]);
                }
                let init = match &f.init {
                    None => json!(["empty"]),
                    Some(ast::VarDeclOrExpr::VarDecl(v)) => {
                        self.stmt(&ast::Stmt::Decl(ast::Decl::Var(v.clone())))?
                    }
                    Some(ast::VarDeclOrExpr::Expr(e)) => json!(["expr", self.expr(e)?]),
                };
                let encoded = json!([
                    "for",
                    match &f.test {
                        Some(e) => self.expr(e)?,
                        None => json!(["lit", true]),
                    },
                    self.stmt(&f.body)?,
                    init,
                    match &f.update {
                        Some(e) => self.expr(e)?,
                        None => json!(["undefined"]),
                    },
                    nslots
                ]);
                if nslots > 0 {
                    self.scopes.pop();
                    self.declarations.pop();
                    self.constants.pop();
                    self.pending.pop();
                }
                encoded
            }
            ast::Stmt::Break(b) if b.label.is_none() => json!(["break"]),
            ast::Stmt::Continue(c) if c.label.is_none() => json!(["continue"]),
            ast::Stmt::Decl(ast::Decl::Class(c)) => {
                let name = c.ident.sym.as_str();
                let value = self.class_value(&c.class, None)?;
                let (depth, slot) = self.address(name)?;
                self.pending[self.scopes.len() - 1 - depth].remove(name);
                json!(["var", [[depth, slot, value]]])
            }
            ast::Stmt::Decl(ast::Decl::Var(v)) => {
                let mut ds = Vec::new();
                for d in &v.decls {
                    if !matches!(d.name, ast::Pat::Ident(_)) {
                        let init = d.init.as_ref().ok_or(
                            "object projection: a destructuring declaration needs an initializer",
                        )?;
                        let source = self.expr(init)?;
                        self.destructure(&d.name, source, &mut Bind::Declare(&mut ds))?;
                        continue;
                    }
                    let name = ident(&d.name)?;
                    if d.init.is_none()
                        && v.kind == ast::VarDeclKind::Var
                        && matches!(self.reference(&name)?, Value::Array(ref a) if a[0] == "decl")
                    {
                        continue;
                    }
                    let (depth, slot) = self.address(&name)?;
                    if self.declarations[self.scopes.len() - 1 - depth].contains(&name) {
                        return Err(format!("object projection: mutation of function declaration {name} is unsupported"));
                    }
                    ds.push(json!([
                        depth,
                        slot,
                        match &d.init {
                            Some(e) => self.expr(e)?,
                            None if v.kind == ast::VarDeclKind::Var => Value::Null,
                            None => json!(["undefined"]),
                        }
                    ]));
                    self.pending[self.scopes.len() - 1 - depth].remove(&name);
                }
                json!(["var", ds])
            }
            _ => return Err(format!("object projection: unsupported statement {s:?}")),
        })
    }
    fn member(&mut self, m: &ast::MemberExpr) -> Result<Value> {
        if static_key(&m.prop).is_ok_and(|key| key == "__proto__") {
            return Err("object projection: legacy __proto__ accessor is unsupported".into());
        }
        // Not in the prelude, which is where `Math.PI` is defined.
        if !self.in_prelude && !self.user_bindings.contains("Math") && math_member(m, "PI") {
            return Ok(json!(["mathconst", "PI"]));
        }
        let key = match &m.prop {
            ast::MemberProp::Ident(i) => json!(["lit", i.sym.as_str()]),
            ast::MemberProp::Computed(c) => self.expr(&c.expr)?,
            _ => return Err("object projection: private members are not supported".into()),
        };
        Ok(json!(["get", self.expr(&m.obj)?, key]))
    }
    fn expr(&mut self, e: &ast::Expr) -> Result<Value> {
        Ok(match e {
            ast::Expr::Paren(p) => self.expr(&p.expr)?,
            ast::Expr::Lit(ast::Lit::Num(n)) => {
                if n.value.is_finite() {
                    json!(["lit", n.value])
                } else {
                    json!(["bin", "/", ["lit", 1], ["lit", 0]])
                }
            }
            ast::Expr::Lit(ast::Lit::Str(s)) => json!([
                "lit",
                s.value.as_str().ok_or(
                    "object projection: strings with unpaired UTF-16 surrogates are not supported"
                )?
            ]),
            ast::Expr::Lit(ast::Lit::Bool(b)) => json!(["lit", b.value]),
            ast::Expr::Lit(ast::Lit::Null(_)) => json!(["lit", null]),
            ast::Expr::Ident(i) => self.reference(i.sym.as_str())?,
            ast::Expr::This(_) => json!(["this"]),
            ast::Expr::Class(c) => {
                let name = c.ident.as_ref().map(|i| i.sym.to_string());
                self.class_value(&c.class, name.as_deref())?
            }
            ast::Expr::SuperProp(p) => {
                let base = self.super_base(true)?;
                let key = match &p.prop {
                    ast::SuperProp::Ident(i) => json!(["lit", i.sym.as_str()]),
                    ast::SuperProp::Computed(c) => self.expr(&c.expr)?,
                };
                json!(["get", base, key])
            }
            ast::Expr::New(n) => {
                let arguments: Vec<_> = n.args.iter().flatten().cloned().map(Some).collect();
                if let Some(list) = self.spread_items(&arguments)? {
                    return Ok(json!(["spreadcall", 1, self.expr(&n.callee)?, null, list]));
                }
                let mut args = Vec::new();
                for a in n.args.as_deref().unwrap_or(&[]) {
                    if a.spread.is_some() {
                        return Err("object projection: spreads are not supported".into());
                    }
                    args.push(self.expr(&a.expr)?);
                }
                if matches!(&*n.callee, ast::Expr::Ident(i) if i.sym == "Array")
                    && !self.user_bindings.contains("Array")
                {
                    match args.len() {
                        0 => json!(["array", args]),
                        1 => json!(["arraylength", args[0]]),
                        _ => json!(["array", args]),
                    }
                } else if let Some(kind) = self.error_constructor(&n.callee) {
                    if args.len() > 1 {
                        return Err(format!("object projection: {kind} takes at most a message"));
                    }
                    json!(["error", args.first().cloned().unwrap_or(json!(["undefined"])), kind])
                } else {
                    json!(["new", self.expr(&n.callee)?, args])
                }
            }
            ast::Expr::OptChain(chain) => {
                // Each `?.` holds its left side in a temporary; if that is
                // null or undefined the whole chain is undefined.
                let mut guards = Vec::new();
                let mut value = self.optional(&ast::Expr::OptChain(chain.clone()), &mut guards)?;
                for (holder, init) in guards.into_iter().rev() {
                    value = json!([
                        "cond",
                        ["bin", "==", ["assign", "=", holder, init], ["lit", null]],
                        ["undefined"],
                        value
                    ]);
                }
                value
            }
            // An untagged template is string concatenation starting from a
            // string, so every substitution is converted to a string.
            ast::Expr::Tpl(t) => {
                let mut pieces = Vec::new();
                for (index, quasi) in t.quasis.iter().enumerate() {
                    let cooked = quasi
                        .cooked
                        .as_ref()
                        .and_then(|text| text.as_str())
                        .ok_or("object projection: invalid escape in template literal")?;
                    pieces.push(json!(["lit", cooked]));
                    if let Some(e) = t.exprs.get(index) {
                        pieces.push(self.expr(e)?);
                    }
                }
                let mut pieces = pieces.into_iter();
                let mut whole = pieces.next().unwrap();
                for piece in pieces {
                    if piece != json!(["lit", ""]) {
                        whole = json!(["bin", "+", whole, piece]);
                    }
                }
                whole
            }
            ast::Expr::Bin(b) => {
                let op = b.op.as_str();
                // Operands in evaluation order.
                match op {
                    "in" => json!(["in", self.expr(&b.left)?, self.expr(&b.right)?]),
                    "instanceof" => json!(["instanceof", self.expr(&b.left)?, self.expr(&b.right)?]),
                    _ => json!(["bin", op, self.expr(&b.left)?, self.expr(&b.right)?]),
                }
            }
            ast::Expr::Unary(u) => {
                if u.op == ast::UnaryOp::TypeOf {
                    // `typeof` of a name that is not bound anywhere does not
                    // throw; it is "undefined".
                    return Ok(match &*u.arg {
                        ast::Expr::Ident(i) if !self.bound(&i.sym) && i.sym != "undefined" => {
                            json!(["lit", "undefined"])
                        }
                        argument => json!(["typeof", self.expr(argument)?]),
                    });
                }
                if !matches!(
                    u.op,
                    ast::UnaryOp::Bang
                        | ast::UnaryOp::Minus
                        | ast::UnaryOp::Plus
                        | ast::UnaryOp::Tilde
                        | ast::UnaryOp::Void
                ) {
                    return Err(
                        "object projection: only ! - + ~ void typeof unary operators are supported".into(),
                    );
                }
                json!(["unary", u.op.as_str(), self.expr(&u.arg)?])
            }
            ast::Expr::Cond(c) => json!([
                "cond",
                self.expr(&c.test)?,
                self.expr(&c.cons)?,
                self.expr(&c.alt)?
            ]),
            ast::Expr::Array(a) => {
                if let Some(built) = self.spread_items(&a.elems)? {
                    return Ok(built);
                }
                let mut values = Vec::new();
                for item in &a.elems {
                    let Some(item) = item.as_ref() else {
                        values.push(json!(["hole"]));
                        continue;
                    };
                    if item.spread.is_some() {
                        return Err("object projection: spreads are not supported".into());
                    }
                    values.push(self.expr(&item.expr)?);
                }
                json!(["array", values])
            }
            ast::Expr::Object(o) => {
                let mut fields = Vec::new();
                for item in &o.props {
                    let ast::PropOrSpread::Prop(prop) = item else {
                        return Err("object projection: object spread is unsupported".into());
                    };
                    match &**prop {
                        ast::Prop::KeyValue(p) => {
                            let key = property_key(&p.key)?;
                            if key == "__proto__" {
                                return Err(
                                    "object projection: __proto__ literal syntax is unsupported"
                                        .into(),
                                );
                            }
                            fields.push(json!([key, self.expr(&p.value)?]));
                        }
                        ast::Prop::Shorthand(i) => {
                            fields.push(json!([i.sym.as_str(), self.reference(i.sym.as_str())?]));
                        }
                        _ => {
                            return Err(
                                "object projection: accessors/object methods are unsupported"
                                    .into(),
                            )
                        }
                    }
                }
                json!(["object", fields])
            }
            ast::Expr::Member(m) => self.member(m)?,
            ast::Expr::Assign(a) => {
                let target = match &a.left {
                    ast::AssignTarget::Simple(ast::SimpleAssignTarget::Ident(i)) => {
                        if !self.bound(i.id.sym.as_str()) {
                            return Err(
                                "object projection: assignment to an unbound name is not supported"
                                    .into(),
                            );
                        }
                        {
                            let (depth, slot) = self.mutable_address(i.id.sym.as_str())?;
                            json!(["var", depth, slot])
                        }
                    }
                    ast::AssignTarget::Simple(ast::SimpleAssignTarget::Member(m)) => {
                        self.member(m)?
                    }
                    ast::AssignTarget::Pat(pattern) => {
                        // Bind from a temporary; the expression's value is
                        // the right-hand side.
                        let holder = self.temporary();
                        let mut steps = vec![json!(["assign", "=", holder, self.expr(&a.right)?])];
                        let pattern = ast::Pat::from(pattern.clone());
                        self.destructure(&pattern, holder.clone(), &mut Bind::Assign(&mut steps))?;
                        steps.push(holder);
                        return Ok(json!(["seq", steps]));
                    }
                    _ => {
                        return Err(
                            "object projection: unsupported assignment target".into(),
                        )
                    }
                };
                let op = a.op.as_str();
                json!([
                    "assign",
                    if op == "=" {
                        "="
                    } else {
                        op.trim_end_matches('=')
                    },
                    target,
                    self.expr(&a.right)?
                ])
            }
            ast::Expr::Update(u) => {
                let target = match &*u.arg {
                    ast::Expr::Ident(i) => {
                        let (depth, slot) = self.mutable_address(i.sym.as_str())?;
                        json!(["var", depth, slot])
                    }
                    ast::Expr::Object(o) => {
                        let mut fields = Vec::new();
                        for item in &o.props {
                            let ast::PropOrSpread::Prop(prop) = item else {
                                return Err(
                                    "object projection: object spread is unsupported".into()
                                );
                            };
                            match &**prop {
                                ast::Prop::KeyValue(p) => {
                                    let key = property_key(&p.key)?;
                                    if key == "__proto__" {
                                        return Err("object projection: __proto__ literal syntax is unsupported".into());
                                    }
                                    fields.push(json!([key, self.expr(&p.value)?]));
                                }
                                ast::Prop::Shorthand(i) => {
                                    fields.push(json!([
                                        i.sym.as_str(),
                                        self.reference(i.sym.as_str())?
                                    ]));
                                }
                                _ => return Err(
                                    "object projection: accessors/object methods are unsupported"
                                        .into(),
                                ),
                            }
                        }
                        json!(["object", fields])
                    }
                    ast::Expr::Member(m) => self.member(m)?,
                    _ => {
                        return Err("object projection: update requires a variable or member".into())
                    }
                };
                json!([
                    "update",
                    if u.op == ast::UpdateOp::PlusPlus {
                        1
                    } else {
                        -1
                    },
                    target,
                    u.prefix
                ])
            }
            ast::Expr::Fn(f) if f.ident.is_none() => {
                json!(["fun", self.fn_ast(&f.function)?, false])
            }
            ast::Expr::Arrow(a) => {
                if a.is_async || a.is_generator {
                    return Err("object projection: async arrows are not supported".into());
                }
                let patterns: Vec<&ast::Pat> = a.params.iter().collect();
                let (params, defaults) = parameters(&patterns)?;
                let body = match &*a.body {
                    ast::BlockStmtOrExpr::BlockStmt(b) => b.stmts.clone(),
                    ast::BlockStmtOrExpr::Expr(e) => vec![ast::Stmt::Return(ast::ReturnStmt {
                        span: a.span,
                        arg: Some(e.clone()),
                    })],
                };
                json!(["fun", self.function_kind(params, &defaults, &body, false, false)?, true])
            }
            ast::Expr::Call(c) => {
                if matches!(c.callee, ast::Callee::Super(_)) {
                    // Call the parent constructor on this object, then
                    // initialize this class's fields.
                    let context = self.classes.last().copied().flatten();
                    if !context.is_some_and(|c| c.derived && c.constructor) {
                        return Err("object projection: super() is supported only in a derived class constructor".into());
                    }
                    let parent = self.reference("%super")?;
                    let arguments: Vec<_> = c.args.iter().cloned().map(Some).collect();
                    let call = match self.spread_items(&arguments)? {
                        Some(list) => json!(["spreadcall", 3, parent, ["this"], list]),
                        None => {
                            let mut args = Vec::new();
                            for a in &c.args {
                                args.push(self.expr(&a.expr)?);
                            }
                            json!(["callthis", parent, ["this"], args])
                        }
                    };
                    let fields = json!(["callthis", self.reference("%fields")?, ["this"], []]);
                    return Ok(json!(["seq", [call, fields, ["undefined"]]]));
                }
                let ast::Callee::Expr(callee) = &c.callee else {
                    return Err("object projection: only guest-function calls are supported".into());
                };
                // `super.method(...)` runs the parent's method on this object.
                if let ast::Expr::SuperProp(p) = &**callee {
                    let base = self.super_base(true)?;
                    let key = match &p.prop {
                        ast::SuperProp::Ident(i) => json!(["lit", i.sym.as_str()]),
                        ast::SuperProp::Computed(c) => self.expr(&c.expr)?,
                    };
                    let function = json!(["get", base, key]);
                    let arguments: Vec<_> = c.args.iter().cloned().map(Some).collect();
                    return Ok(match self.spread_items(&arguments)? {
                        Some(list) => json!(["spreadcall", 3, function, ["this"], list]),
                        None => {
                            let mut args = Vec::new();
                            for a in &c.args {
                                args.push(self.expr(&a.expr)?);
                            }
                            json!(["callthis", function, ["this"], args])
                        }
                    });
                }
                // A method needs JS's receiver/native-call semantics, not invoke.
                let mut unwrapped = &**callee;
                while let ast::Expr::Paren(p) = unwrapped {
                    unwrapped = &p.expr;
                }
                let arguments: Vec<_> = c.args.iter().cloned().map(Some).collect();
                if let Some(list) = self.spread_items(&arguments)? {
                    // The argument count is only known at run time.
                    return Ok(match unwrapped {
                        ast::Expr::Member(m) => {
                            let key = static_key(&m.prop).map_err(|_| {
                                "object projection: spread arguments to a computed-key method are not supported".to_owned()
                            })?;
                            json!(["spreadcall", 2, self.expr(&m.obj)?, key, list])
                        }
                        callee => json!(["spreadcall", 0, self.expr(callee)?, null, list]),
                    });
                }
                let mut args = Vec::new();
                for a in &c.args {
                    args.push(self.expr(&a.expr)?);
                }
                let special = match unwrapped {
                    ast::Expr::Ident(i) if self.in_prelude => Some(i.sym.as_str()),
                    _ => None,
                };
                let literal = |v: &Value| {
                    (tag(v) == "lit")
                        .then(|| v[1].as_f64())
                        .flatten()
                        .filter(|n| *n >= 0.0 && n.fract() == 0.0 && *n < 1e9)
                        .map(|n| n as u64)
                };
                if let Some(
                    form @ ("$rootPrototype" | "$argumentCount" | "$argument" | "$callWith"
                    | "$has" | "$define" | "$charCodeAt" | "$fromCharCode" | "$substring"
                    | "$indexOf" | "$math" | "$isArray"),
                ) = special
                {
                    match (form, args.as_slice()) {
                        ("$rootPrototype", [kind]) if literal(kind).is_some_and(|k| k < 6) => {
                            json!(["rootproto", literal(kind).unwrap()])
                        }
                        ("$argumentCount", []) => json!(["argcount"]),
                        ("$argument", [index]) => json!(["argument", index]),
                        ("$charCodeAt", [text, index]) => json!(["strop", 1, text, index]),
                        ("$fromCharCode", [code]) => json!(["strop", 2, code]),
                        ("$substring", [text, from, to]) => json!(["strop", 3, text, from, to]),
                        ("$indexOf", [text, needle, from]) => json!(["strop", 4, text, needle, from]),
                        ("$math", [name, operands @ ..])
                            if (1..=2).contains(&operands.len()) && tag(name) == "lit" =>
                        {
                            const NAMES: [&str; 26] = [
                                "floor", "ceil", "round", "trunc", "abs", "sqrt", "sin", "cos",
                                "tan", "asin", "acos", "atan", "atan2", "exp", "log", "pow",
                                "min", "max", "sign", "log2", "log10", "cbrt", "fround", "imul",
                                "clz32", "hypot",
                            ];
                            let op = NAMES
                                .iter()
                                .position(|n| name[1] == *n)
                                .ok_or("object projection: unknown $math function")?;
                            let mut node = vec![json!("mathop"), json!(op + 1)];
                            node.extend(operands.iter().cloned());
                            Value::Array(node)
                        }
                        ("$isArray", [value]) => json!(["isarray", value]),
                        ("$has", [object, key]) => json!(["has", object, key]),
                        ("$define", [object, key, value, fields]) => {
                            json!(["define", object, key, value, fields])
                        }
                        ("$callWith", [function, receiver, skip]) if literal(skip).is_some() => {
                            json!(["callrest", function, receiver, literal(skip).unwrap()])
                        }
                        _ => return Err(format!("object projection: malformed prelude form {form}")),
                    }
                } else if matches!(unwrapped, ast::Expr::Member(m) if math_member(m, "sqrt"))
                    && !self.user_bindings.contains("Math")
                    && !self.in_prelude
                    && args.len() == 1
                {
                    json!(["mathcall", "sqrt", args])
                } else if matches!(unwrapped, ast::Expr::Ident(i) if i.sym == "Array")
                    && !self.user_bindings.contains("Array")
                {
                    match args.len() {
                        0 => json!(["array", args]),
                        1 => json!(["arraylength", args[0]]),
                        _ => json!(["array", args]),
                    }
                } else {
                    if let ast::Expr::Member(m) = unwrapped {
                        match static_key(&m.prop) {
                            Ok(key) => json!(["methodcall", self.expr(&m.obj)?, key, args]),
                            // A computed key: look the function up, then call
                            // it with the object as receiver.
                            Err(_) => {
                                let receiver = self.temporary();
                                let object = json!(["assign", "=", receiver, self.expr(&m.obj)?]);
                                let ast::MemberProp::Computed(key) = &m.prop else {
                                    return Err("object projection: private members are not supported".into());
                                };
                                let function = json!(["get", object, self.expr(&key.expr)?]);
                                json!(["callthis", function, receiver, args])
                            }
                        }
                    } else if let Some(kind) = self.error_constructor(unwrapped) {
                        if args.len() > 1 {
                            return Err(format!("object projection: {kind} takes at most a message"));
                        }
                        json!(["error", args.first().cloned().unwrap_or(json!(["undefined"])), kind])
                    } else {
                        json!(["call", self.expr(callee)?, args])
                    }
                }
            }
            ast::Expr::Seq(s) => json!([
                "seq",
                s.exprs
                    .iter()
                    .map(|e| self.expr(e))
                    .collect::<Result<Vec<_>>>()?
            ]),
            _ => return Err(format!("object projection: unsupported expression {e:?}")),
        })
    }
}

fn static_key(property: &ast::MemberProp) -> Result<String> {
    match property {
        ast::MemberProp::Ident(i) => Ok(i.sym.to_string()),
        ast::MemberProp::Computed(c) => match &*c.expr {
            ast::Expr::Lit(ast::Lit::Str(s)) => s
                .value
                .as_str()
                .map(str::to_owned)
                .ok_or_else(|| "object projection: unpaired surrogate in property key".into()),
            _ => Err("object projection: computed method names must be static strings".into()),
        },
        _ => Err("object projection: private property is unsupported".into()),
    }
}
fn property_key(property: &ast::PropName) -> Result<String> {
    match property {
        ast::PropName::Ident(i) => Ok(i.sym.to_string()),
        ast::PropName::Str(s) => s
            .value
            .as_str()
            .map(str::to_owned)
            .ok_or_else(|| "object projection: unpaired surrogate in property key".into()),
        ast::PropName::Num(n) if n.value.is_finite() => Ok(n.value.to_string()),
        _ => Err("object projection: computed object-literal keys are unsupported".into()),
    }
}
fn parse_strict(source: &str) -> Result<ast::Module> {
    use swc_common::{sync::Lrc, FileName, SourceMap};
    use swc_ecma_parser::{lexer::Lexer, Parser, StringInput, Syntax};
    let cm: Lrc<SourceMap> = Default::default();
    let fm = cm.new_source_file(
        Lrc::new(FileName::Custom("object-guest.js".into())),
        source.to_owned(),
    );
    let lexer = Lexer::new(
        Syntax::Es(Default::default()),
        ast::EsVersion::EsNext,
        StringInput::from(&*fm),
        None,
    );
    let mut parser = Parser::new_from(lexer);
    let module = parser
        .parse_module()
        .map_err(|e| format!("object projection parse error: {:?}", e.kind()))?;
    let errors = parser.take_errors();
    if !errors.is_empty() {
        return Err(format!(
            "object projection parse error: {:?}",
            errors[0].kind()
        ));
    }
    Ok(module)
}

/// Pre-order walk of the lexical AST. `depth` is the number of lexical scopes
/// opened since the module frame, so `["var", depth, slot]` names module slot
/// `slot`. `visit` returns true when it has handled the node's children itself.
fn walk_lexical(node: &mut Value, depth: usize, visit: &mut dyn FnMut(&mut Value, usize) -> bool) {
    if !node.is_array() {
        return;
    }
    if visit(node, depth) {
        return;
    }
    let kind = tag(node).to_owned();
    let Value::Array(items) = node else {
        unreachable!()
    };
    match kind.as_str() {
        "lit" | "mathconst" => {}
        "fun" => walk_lexical_function(&mut items[1], depth + 1, visit),
        // Field rows are `[key, value]`; a key is never a node tag.
        "object" => {
            if let Value::Array(fields) = &mut items[1] {
                for field in fields {
                    walk_lexical(&mut field[1], depth, visit);
                }
            }
        }
        _ => {
            let opens_scope = (kind == "block" && items[2].as_i64().unwrap_or(0) > 0)
                || (kind == "for" && items[5].as_i64().unwrap_or(0) > 0);
            let depth = depth + usize::from(opens_scope);
            for item in items {
                walk_lexical(item, depth, visit);
            }
        }
    }
}
/// `function` is `[params, slots, declarations, body]`; `depth` is the depth
/// inside its own frame.
fn walk_lexical_function(
    function: &mut Value,
    depth: usize,
    visit: &mut dyn FnMut(&mut Value, usize) -> bool,
) {
    if let Value::Array(declarations) = &mut function[2] {
        for declaration in declarations {
            walk_lexical_function(&mut declaration[1], depth + 1, visit);
        }
    }
    walk_lexical(&mut function[3], depth, visit);
}
fn module_slot(node: &Value, depth: usize) -> Option<i64> {
    (tag(node) == "var" && node[1].as_u64() == Some(depth as u64))
        .then(|| node[2].as_i64())
        .flatten()
}
fn is_var_statement(node: &Value) -> bool {
    tag(node) == "var" && node[1].is_array()
}
/// Replace reads of immutable module-level primitive constants by their
/// initializer expressions.
///
/// A module variable qualifies when its only write in the whole program is one
/// top-level `var x = e` declarator and `e` is built from number, boolean, null
/// or undefined literals, operators, and earlier qualifying variables. Such an
/// expression has no effects and always produces the same primitive, so a read
/// that executes after the declarator may evaluate a copy instead.
///
/// "After the declarator" is established structurally. Source initialization
/// runs to completion before `main` is called. Code that can run during
/// initialization is the top-level statements plus the functions they call. If
/// every such call names a module-level function declaration directly, those
/// functions are known exactly and are left untouched, as is top-level code;
/// every other function body can only execute once initialization has
/// finished. If any call made during initialization has an unknown target,
/// nothing is replaced.
fn propagate_module_constants(module: &mut Value) -> Option<ModuleInit> {
    use std::collections::{BTreeMap, BTreeSet};
    let statements = array(&module[3][1]).len();
    // Functions reachable while source initialization is still running.
    let mut during_init = BTreeSet::new();
    let mut unknown_call = false;
    let mut pending = Vec::new();
    {
        let mut scan = |node: &mut Value, depth: usize, pending: &mut Vec<usize>| -> bool {
            match tag(node) {
                "fun" => return true,
                "call" | "new" => {
                    let callee = &node[1];
                    if tag(callee) == "decl" && callee[1].as_u64() == Some(depth as u64) {
                        pending.push(callee[2].as_u64().unwrap() as usize);
                    } else {
                        unknown_call = true;
                    }
                }
                // The protected parts of a `try` are closures the scan does
                // not enter, and what they call is not examined.
                "methodcall" | "try" => unknown_call = true,
                _ => {}
            }
            false
        };
        // The final statement is the synthetic `return main(input)`.
        for index in 0..statements.saturating_sub(1) {
            walk_lexical(&mut module[3][1][index], 0, &mut |n, d| scan(n, d, &mut pending));
        }
        while let Some(index) = pending.pop() {
            if during_init.insert(index) {
                // Nested declarations are only created here, never entered.
                walk_lexical(&mut module[2][index][1][3], 1, &mut |n, d| {
                    scan(n, d, &mut pending)
                });
            }
        }
    }
    if unknown_call {
        return None;
    }
    let mut writes: BTreeMap<i64, usize> = BTreeMap::new();
    walk_lexical_function(module, 0, &mut |node, depth| {
        if is_var_statement(node) {
            for declarator in array(&node[1]) {
                if declarator[0].as_u64() == Some(depth as u64) && !declarator[2].is_null() {
                    *writes.entry(num(&declarator[1])).or_default() += 1;
                }
            }
        } else if matches!(tag(node), "assign" | "update") {
            if let Some(slot) = module_slot(&node[2], depth) {
                *writes.entry(slot).or_default() += 1;
            }
        }
        false
    });
    fn constant_expression(e: &Value, known: &BTreeMap<i64, Value>) -> Option<Value> {
        match tag(e) {
            "lit" if e[1].is_number() || e[1].is_boolean() || e[1].is_null() => Some(e.clone()),
            "undefined" => Some(e.clone()),
            "var" => known.get(&module_slot(e, 0)?).cloned(),
            "unary" => Some(json!(["unary", e[1], constant_expression(&e[2], known)?])),
            "bin" => Some(json!([
                "bin",
                e[1],
                constant_expression(&e[2], known)?,
                constant_expression(&e[3], known)?
            ])),
            _ => None,
        }
    }
    let mut constants: BTreeMap<i64, Value> = BTreeMap::new();
    for statement in array(&module[3][1]) {
        if !is_var_statement(statement) {
            continue;
        }
        for declarator in array(&statement[1]) {
            let slot = num(&declarator[1]);
            if declarator[0].as_u64() == Some(0) && writes.get(&slot) == Some(&1) {
                if let Some(value) = constant_expression(&declarator[2], &constants) {
                    constants.insert(slot, value);
                }
            }
        }
    }
    // Every top-level declarator with an initializer has run before `main`.
    let mut initialized = BTreeSet::new();
    for statement in array(&module[3][1]) {
        if is_var_statement(statement) {
            for declarator in array(&statement[1]) {
                if declarator[0].as_u64() == Some(0) && !declarator[2].is_null() {
                    initialized.insert(num(&declarator[1]));
                }
            }
        }
    }
    let init = ModuleInit {
        during_init: during_init.clone(),
        initialized,
    };
    if constants.is_empty() {
        return Some(init);
    }
    // `enabled` is false in code that may run during initialization.
    fn substitute(node: &mut Value, depth: usize, enabled: bool, constants: &BTreeMap<i64, Value>) {
        walk_lexical(node, depth, &mut |node, depth| {
            match tag(node) {
                "fun" => {
                    substitute_function(&mut node[1], depth + 1, true, constants);
                    return true;
                }
                // A write target is an address, not a read.
                "assign" | "update" if tag(&node[2]) == "var" => {
                    if tag(node) == "assign" {
                        substitute(&mut node[3], depth, enabled, constants);
                    }
                    return true;
                }
                "var" if enabled && !node[1].is_array() => {
                    if let Some(value) = module_slot(node, depth).and_then(|s| constants.get(&s)) {
                        *node = value.clone();
                        return true;
                    }
                }
                _ => {}
            }
            false
        });
    }
    fn substitute_function(
        function: &mut Value,
        depth: usize,
        enabled: bool,
        constants: &BTreeMap<i64, Value>,
    ) {
        if let Value::Array(declarations) = &mut function[2] {
            for declaration in declarations {
                substitute_function(&mut declaration[1], depth + 1, true, constants);
            }
        }
        substitute(&mut function[3], depth, enabled, constants);
    }
    let declarations = array(&module[2]).len();
    for index in 0..declarations {
        substitute_function(
            &mut module[2][index][1],
            1,
            !during_init.contains(&index),
            &constants,
        );
    }
    substitute(&mut module[3], 0, false, &constants);
    Some(init)
}
/// What is known about source initialization when every call it makes has a
/// statically known target (see `propagate_module_constants`).
struct ModuleInit {
    /// Module-level function declarations (by declaration index) that can run
    /// before initialization finishes. Every other function runs only after.
    during_init: std::collections::BTreeSet<usize>,
    /// Module slots written by a top-level initializer.
    initialized: std::collections::BTreeSet<i64>,
}

#[derive(Clone)]
struct Function {
    ast: Value,
    outer: Vec<Option<usize>>,
    declarations: Vec<usize>,
    is_arrow: bool,
    has_nested_functions: bool,
}
struct Encoder {
    source_functions: Vec<Function>,
    nodes: Vec<Vec<i64>>,
    functions: Vec<Vec<i64>>,
    lists: Vec<i64>,
    constants: Vec<Value>,
    keys: Vec<String>,
    call_candidates: std::collections::BTreeMap<String, Vec<usize>>,
    /// Some property name is computed at run time.
    keyed: bool,
    /// How many calls the statement being encoded makes itself. See `stmt`.
    split_dispatch: usize,
    /// For each protected part of a `try`: where, relative to the scope it
    /// runs in, it leaves a returned value.
    completions: std::collections::BTreeMap<usize, (i64, i64)>,
    proven: Proven,
    // Encoding-only state for the current function. Noncaptured lexical frames
    // are assigned static, disjoint ranges in one homogeneous local vector.
    flat_mode: bool,
    own_offsets: Vec<i64>,
    next_flat_slot: i64,
}
fn tag(v: &Value) -> &str {
    v[0].as_str().unwrap_or("")
}
fn num(v: &Value) -> i64 {
    v.as_i64().expect("validated lexical AST integer")
}
fn array(v: &Value) -> &[Value] {
    v.as_array().expect("validated lexical AST array")
}
fn row(mut v: Vec<i64>) -> Vec<i64> {
    v.resize(17, 0);
    v
}
fn bin(op: &str) -> Result<i64> {
    [
        "+", "-", "*", "/", "%", "**", "===", "!==", "==", "!=", "<", "<=", ">", ">=", "|", "&",
        "^", "<<", ">>", ">>>", "&&", "||", "??",
    ]
    .iter()
    .position(|x| *x == op)
    .map(|i| i as i64 + 1)
    .ok_or_else(|| format!("object projection: unsupported binary operator {op}"))
}
/// How many calls a statement makes in its own expressions, not counting
/// those of the statements nested in it or of function bodies.
fn own_call_sites(statement: &Value) -> usize {
    const STATEMENTS: [&str; 15] = [
        "block", "if", "while", "dowhile", "for", "switch", "try", "expr", "var", "return",
        "throw", "empty", "break", "continue", "default",
    ];
    fn count(node: &Value, top: bool) -> usize {
        let Some(items) = node.as_array() else { return 0 };
        let kind = items.first().and_then(Value::as_str).unwrap_or("");
        if matches!(kind, "fun" | "funid") || (!top && STATEMENTS.contains(&kind)) {
            return 0;
        }
        // A switch evaluates its clause tests as part of itself.
        let own = if kind == "case" { count(&node[1], false) } else { 0 };
        let children = if kind == "case" {
            0
        } else {
            items.iter().map(|item| count(item, false)).sum()
        };
        usize::from(matches!(kind, "call" | "new" | "methodcall")) + own + children
    }
    count(statement, true)
}
fn contains_function_expression(node: &Value) -> bool {
    tag(node) == "funid"
        || node
            .as_array()
            .is_some_and(|values| values.iter().any(contains_function_expression))
}
impl Encoder {
    fn register(
        &mut self,
        ast: &Value,
        outer: Vec<Option<usize>>,
        is_arrow: bool,
    ) -> Result<usize> {
        let id = self.source_functions.len();
        self.source_functions.push(Function {
            ast: ast.clone(),
            outer: outer.clone(),
            declarations: vec![],
            is_arrow,
            has_nested_functions: false,
        });
        self.functions.push(vec![]);
        let mut scope = outer;
        scope.push(Some(id));
        let declarations = array(&ast[2])
            .iter()
            .map(|d| self.register(&d[1], scope.clone(), false))
            .collect::<Result<Vec<_>>>()?;
        self.source_functions[id].declarations = declarations;
        let mut body = ast[3].clone();
        self.register_expressions(&mut body, &scope)?;
        self.source_functions[id].has_nested_functions =
            !self.source_functions[id].declarations.is_empty()
                || contains_function_expression(&body);
        self.source_functions[id].ast[3] = body;
        Ok(id)
    }
    // Function-expression identities are assigned before candidate tables are
    // collected. Lexical frames, including loop-let scopes, count in depths.
    fn register_expressions(&mut self, node: &mut Value, scope: &[Option<usize>]) -> Result<()> {
        if tag(node) == "fun" {
            let arrow = node[2].as_bool().unwrap();
            let id = self.register(&node[1], scope.to_vec(), arrow)?;
            *node = json!(["funid", id, arrow]);
            return Ok(());
        }
        let mut nested = scope.to_vec();
        if (tag(node) == "block" && num(&node[2]) > 0) || (tag(node) == "for" && num(&node[5]) > 0)
        {
            nested.push(None);
        }
        if let Value::Array(values) = node {
            for value in values {
                self.register_expressions(value, &nested)?;
            }
        }
        Ok(())
    }
    fn node(&mut self, values: Vec<i64>) -> i64 {
        let id = self.nodes.len() as i64;
        self.nodes.push(row(values));
        id
    }
    fn list(&mut self, values: Vec<i64>) -> (i64, i64) {
        let start = self.lists.len() as i64;
        let count = values.len() as i64;
        self.lists.extend(values);
        (start, count)
    }
    fn atom(&mut self, key: &str) -> i64 {
        if let Some(i) = self.keys.iter().position(|k| k == key) {
            return i as i64;
        }
        self.keys.push(key.into());
        (self.keys.len() - 1) as i64
    }
    /// 1 when the analysis proved the operation's operands are numbers.
    fn numeric(&self, scope: &[Option<usize>], node: &Value) -> i64 {
        i64::from(self.proven.numeric.contains(&call_site_key(scope, node)))
    }
    /// 1 when the analysis proved the operation's named load reads an own
    /// property of every object its base can be.
    fn own_load(&self, scope: &[Option<usize>], node: &Value) -> i64 {
        i64::from(self.proven.own_loads.contains(&call_site_key(scope, node)))
    }
    /// 1 when a store through this node cannot add a property: a plain store
    /// proved own, or a compound one whose preceding read was.
    fn own_store(&self, scope: &[Option<usize>], node: &Value) -> i64 {
        let site = call_site_key(scope, node);
        i64::from(
            self.proven.own_stores.contains(&site)
                || (self.proven.own_loads.contains(&site)
                    && !self.proven.unwritable.contains(&site)),
        )
    }
    /// 1 when a call with this many candidate targets may test them in the
    /// interpreter: continuing the statement once per target at each of its
    /// calls must stay within a small multiple of its size.
    fn may_split(&self, candidates: i64) -> i64 {
        let ways = (candidates.max(0) as u64 + 1).checked_pow(self.split_dispatch.max(1) as u32);
        i64::from(ways.is_some_and(|ways| ways <= 25))
    }
    /// 1 when the base of the site's named access is proved not to be a
    /// string, number or boolean.
    fn object_named(&self, scope: &[Option<usize>], node: &Value) -> i64 {
        i64::from(self.proven.object_named.contains(&call_site_key(scope, node)))
    }
    /// One more than the proved inline slot of the site's property, else 0.
    fn slot(&self, scope: &[Option<usize>], node: &Value) -> i64 {
        self.proven
            .slots
            .get(&call_site_key(scope, node))
            .map_or(0, |slot| *slot as i64 + 1)
    }
    fn variable_location(&self, depth: i64, slot: i64) -> Result<(i64, i64)> {
        if !self.flat_mode {
            return Ok((depth, -1));
        }
        let own_count = self.own_offsets.len() as i64;
        if depth < own_count {
            let index = self.own_offsets.len() - 1 - depth as usize;
            Ok((depth, self.own_offsets[index] + slot))
        } else {
            // No runtime frame exists for this function or its own lexical
            // blocks. `env` already denotes the first captured outer frame.
            Ok((depth - own_count, -1))
        }
    }
    fn declaration_depth(&self, depth: i64) -> Result<i64> {
        if !self.flat_mode {
            return Ok(depth);
        }
        depth
            .checked_sub(self.own_offsets.len() as i64)
            .filter(|depth| *depth >= 0)
            .ok_or_else(|| {
                "object projection: a promoted frame cannot own a function declaration".into()
            })
    }
    fn literal(&mut self, value: &Value) -> Result<i64> {
        let tagged = match value {
            Value::Number(n) => json!(["number", n]),
            Value::Bool(b) => json!(["bool", b]),
            Value::Null => json!(["null"]),
            Value::String(s) => json!(["string", s]),
            _ => return Err("object projection: invalid constant".into()),
        };
        let index = self
            .constants
            .iter()
            .position(|v| v == &tagged)
            .unwrap_or_else(|| {
                self.constants.push(tagged);
                self.constants.len() - 1
            });
        Ok(self.node(vec![1, index as i64]))
    }
    fn declaration(&self, node: &Value, scope: &[Option<usize>]) -> Result<(usize, i64, i64)> {
        if tag(node) != "decl" {
            return Err("object projection: expected declaration reference".into());
        }
        let depth = num(&node[1]) as usize;
        let index = num(&node[2]) as usize;
        let owner = scope
            .get(
                scope
                    .len()
                    .checked_sub(depth + 1)
                    .ok_or("invalid lexical depth")?,
            )
            .and_then(|x| *x)
            .ok_or("declaration reference addresses a non-function scope")?;
        let owner = &self.source_functions[owner];
        let id = *owner
            .declarations
            .get(index)
            .ok_or("invalid declaration index")?;
        let slot = num(&owner.ast[2][index][0]);
        Ok((id, depth as i64, slot))
    }
    fn candidates(&mut self, _name: Option<&str>) -> (i64, i64) {
        // Without a converged receiver/field proof, every guest code ID remains
        // possible. A shared property spelling alone is not a receiver proof.
        self.list(
            (1..self.source_functions.len())
                .map(|id| id as i64)
                .collect(),
        )
    }
    fn exprs(
        &mut self,
        values: &Value,
        scope: &[Option<usize>],
        holes: bool,
    ) -> Result<(i64, i64)> {
        let out = array(values)
            .iter()
            .map(|value| {
                if holes && tag(value) == "hole" {
                    Ok(-1)
                } else {
                    self.expr(value, scope)
                }
            })
            .collect::<Result<Vec<_>>>()?;
        Ok(self.list(out))
    }
    fn expr(&mut self, v: &Value, scope: &[Option<usize>]) -> Result<i64> {
        let r = match tag(v) {
            "lit" => return self.literal(&v[1]),
            "undefined" => vec![2],
            "mathconst" if v[1] == "PI" => return self.literal(&json!(std::f64::consts::PI)),
            "var" => {
                let (depth, flat_slot) = self.variable_location(num(&v[1]), num(&v[2]))?;
                vec![3, depth, num(&v[2]), flat_slot]
            }
            "decl" => {
                let (id, depth, slot) = self.declaration(v, scope)?;
                vec![18, id as i64, self.declaration_depth(depth)?, slot]
            }
            "bin" => vec![
                4,
                bin(v[1].as_str().unwrap())?,
                self.expr(&v[2], scope)?,
                self.expr(&v[3], scope)?,
                self.numeric(scope, v),
            ],
            "unary" => {
                let op = ["-", "+", "!", "~", "void"]
                    .iter()
                    .position(|s| v[1] == *s)
                    .ok_or("unsupported unary operator")?;
                vec![5, op as i64 + 1, self.expr(&v[2], scope)?, self.numeric(scope, v)]
            }
            "cond" => vec![
                6,
                self.expr(&v[1], scope)?,
                self.expr(&v[2], scope)?,
                self.expr(&v[3], scope)?,
            ],
            "array" | "seq" => {
                let (start, count) = self.exprs(&v[1], scope, tag(v) == "array")?;
                vec![if tag(v) == "array" { 7 } else { 14 }, start, count]
            }
            "get" => {
                let base = self.expr(&v[1], scope)?;
                if tag(&v[2]) == "lit" && v[2][1].is_string() {
                    vec![
                        8,
                        self.atom(v[2][1].as_str().unwrap()),
                        base,
                        0,
                        self.own_load(scope, v),
                        self.slot(scope, v),
                        self.object_named(scope, v),
                    ]
                } else {
                    let numeric = i64::from(
                        self.proven.numeric_keys.contains(&call_site_key(scope, v)),
                    );
                    let object = i64::from(
                        self.proven.object_bases.contains(&call_site_key(scope, v)),
                    );
                    self.keyed |= numeric == 0 || object == 0;
                    vec![8, -1, base, self.expr(&v[2], scope)?, numeric, object]
                }
            }
            "assign" => vec![
                9,
                if v[1] == "=" {
                    0
                } else {
                    bin(v[1].as_str().unwrap())?
                },
                self.expr(&v[2], scope)?,
                self.expr(&v[3], scope)?,
                self.own_load(scope, v),
                self.numeric(scope, v),
                self.own_store(scope, v),
                self.slot(scope, v),
                self.object_named(scope, v),
            ],
            "update" => vec![
                10,
                num(&v[1]),
                self.expr(&v[2], scope)?,
                if v[3].as_bool().unwrap() { 1 } else { 0 },
                self.own_load(scope, v),
                self.numeric(scope, v),
                self.own_store(scope, v),
                self.slot(scope, v),
                self.object_named(scope, v),
            ],
            "call" | "new" => {
                let is_new = if tag(v) == "new" { 1 } else { 0 };
                if tag(&v[1]) == "decl" {
                    let (id, depth, slot) = self.declaration(&v[1], scope)?;
                    let (start, count) = self.exprs(&v[2], scope, false)?;
                    vec![
                        17,
                        id as i64,
                        self.declaration_depth(depth)?,
                        start,
                        count,
                        is_new,
                        slot,
                    ]
                } else {
                    let callee = self.expr(&v[1], scope)?;
                    let (start, count) = self.exprs(&v[2], scope, false)?;
                    let analyzed = self.call_candidates.get(&call_site_key(scope, v)).cloned();
                    let (candidate_start, candidate_count) = match analyzed {
                        Some(ids) if !ids.is_empty() => {
                            self.list(ids.into_iter().map(|id| id as i64).collect())
                        }
                        _ => self.candidates(None),
                    };
                    vec![
                        11,
                        callee,
                        start,
                        count,
                        is_new,
                        candidate_start,
                        candidate_count,
                        0,
                        0,
                        0,
                        self.may_split(candidate_count),
                    ]
                }
            }
            "methodcall" => {
                let receiver = self.expr(&v[1], scope)?;
                let key = self.atom(v[2].as_str().unwrap());
                let (start, count) = self.exprs(&v[3], scope, false)?;
                let analyzed = self.call_candidates.get(&call_site_key(scope, v)).cloned();
                let (candidate_start, candidate_count) = match analyzed {
                    Some(ids) if !ids.is_empty() => {
                        self.list(ids.into_iter().map(|id| id as i64).collect())
                    }
                    _ => self.candidates(v[2].as_str()),
                };
                // A proved single target needs no lookup: its environment is
                // the module frame, a static number of frames out from here.
                let (target, check, module_depth) =
                    match self.proven.static_methods.get(&call_site_key(scope, v)) {
                        Some((target, check)) => (
                            *target as i64,
                            i64::from(*check),
                            self.declaration_depth(scope.len() as i64 - 1)?,
                        ),
                        None => (-1, 0, 0),
                    };
                vec![
                    16,
                    receiver,
                    key,
                    start,
                    count,
                    candidate_start,
                    candidate_count,
                    target,
                    check,
                    module_depth,
                    self.may_split(candidate_count),
                    self.object_named(scope, v),
                ]
            }
            "this" => vec![12],
            "mathcall" if v[1] == "sqrt" => {
                let args = array(&v[2]);
                if args.len() != 1 {
                    return Err("object projection: Math.sqrt requires exactly one argument".into());
                }
                vec![13, self.expr(&args[0], scope)?]
            }
            "funid" => vec![15, num(&v[1]), if v[2].as_bool().unwrap() { 1 } else { 0 }],
            "arraylength" => vec![19, self.expr(&v[1], scope)?],
            "argcount" => vec![22],
            "argument" => vec![23, self.expr(&v[1], scope)?],
            "callrest" => vec![24, self.expr(&v[1], scope)?, self.expr(&v[2], scope)?, num(&v[3])],
            "callthis" => {
                let function = self.expr(&v[1], scope)?;
                let receiver = self.expr(&v[2], scope)?;
                let (start, count) = self.exprs(&v[3], scope, false)?;
                vec![36, function, receiver, start, count]
            }
            "restargs" => vec![34, num(&v[1])],
            "create" => vec![38, self.expr(&v[1], scope)?],
            "setproto" => vec![39, self.expr(&v[1], scope)?, self.expr(&v[2], scope)?],
            // Pairs of (kind, node): 0 an element, 1 a spread, 2 a hole.
            "spreadarray" => {
                let mut pairs = Vec::new();
                for item in array(&v[1]) {
                    match tag(item) {
                        "hole" => pairs.extend([2, -1]),
                        "spread" => pairs.extend([1, self.expr(&item[1], scope)?]),
                        _ => pairs.extend([0, self.expr(item, scope)?]),
                    }
                }
                let (start, count) = self.list(pairs);
                vec![35, start, count / 2]
            }
            // kind: 0 a plain call, 1 a construction, 2 a method call.
            "spreadcall" => {
                let target = self.expr(&v[2], scope)?;
                // kind 3 calls a function value with an explicit receiver.
                let extra = if num(&v[1]) == 3 {
                    self.expr(&v[3], scope)?
                } else {
                    match v[3].as_str() {
                        Some(key) => self.atom(key),
                        None => -1,
                    }
                };
                vec![37, num(&v[1]), target, extra, self.expr(&v[4], scope)?]
            }
            "rootproto" => vec![25, num(&v[1])],
            "isarray" => vec![33, self.expr(&v[1], scope)?],
            "strop" => {
                let mut row = vec![31, num(&v[1])];
                for operand in &array(v)[2..] {
                    row.push(self.expr(operand, scope)?);
                }
                row
            }
            "mathop" => vec![
                32,
                num(&v[1]),
                self.expr(&v[2], scope)?,
                match v.get(3) {
                    Some(right) => self.expr(right, scope)?,
                    None => -1,
                },
            ],
            "typeof" => vec![28, self.expr(&v[1], scope)?],
            "instanceof" => vec![29, self.expr(&v[1], scope)?, self.expr(&v[2], scope)?],
            "in" => {
                self.keyed = true;
                vec![30, self.expr(&v[1], scope)?, self.expr(&v[2], scope)?]
            }
            "has" => {
                self.keyed = true;
                vec![26, self.expr(&v[1], scope)?, self.expr(&v[2], scope)?]
            }
            "define" => {
                self.keyed = true;
                vec![
                    27,
                    self.expr(&v[1], scope)?,
                    self.expr(&v[2], scope)?,
                    self.expr(&v[3], scope)?,
                    self.expr(&v[4], scope)?,
                ]
            }
            "object" => {
                let mut fields = vec![];
                for field in array(&v[1]) {
                    fields.push(self.atom(field[0].as_str().unwrap()));
                    fields.push(self.expr(&field[1], scope)?);
                }
                let count = fields.len() / 2;
                let (start, _) = self.list(fields);
                vec![20, start, count as i64]
            }
            "error" => {
                let message = self.expr(&v[1], scope)?;
                vec![21, message, self.literal(&v[2])?]
            }
            other => {
                return Err(format!(
                    "object projection: unsupported expression {other:?}"
                ))
            }
        };
        Ok(self.node(r))
    }
    /// A call whose targets the analysis narrowed can test them in the
    /// interpreter, which lets the specializer continue the statement
    /// separately for each target and the C compiler optimize each
    /// continuation for it. That multiplies the rest of the statement by the
    /// number of targets at every such call, so it is allowed only while
    /// that product, taken over the statement's own calls, stays small.
    fn stmt(&mut self, v: &Value, scope: &[Option<usize>]) -> Result<i64> {
        let outer = self.split_dispatch;
        self.split_dispatch = own_call_sites(v);
        let encoded = self.stmt_body(v, scope);
        self.split_dispatch = outer;
        encoded
    }
    fn stmt_body(&mut self, v: &Value, scope: &[Option<usize>]) -> Result<i64> {
        let mut nested = scope.to_vec();
        let lexical_slots = match tag(v) {
            "block" => num(&v[2]),
            "for" => num(&v[5]),
            _ => 0,
        };
        if lexical_slots > 0 {
            nested.push(None);
            if self.flat_mode {
                self.own_offsets.push(self.next_flat_slot);
                self.next_flat_slot += lexical_slots;
            }
        }
        let scope = &nested;
        let r = match tag(v) {
            "empty" => vec![100],
            "expr" => vec![101, self.expr(&v[1], scope)?],
            "var" => {
                let mut declarations = vec![];
                for d in array(&v[1]) {
                    let (depth, flat_slot) = self.variable_location(num(&d[0]), num(&d[1]))?;
                    declarations.extend([
                        if flat_slot >= 0 { -1 } else { depth },
                        if flat_slot >= 0 {
                            flat_slot
                        } else {
                            num(&d[1])
                        },
                        if d[2].is_null() {
                            -1
                        } else {
                            self.expr(&d[2], scope)?
                        },
                    ]);
                }
                let count = declarations.len() / 3;
                let (start, _) = self.list(declarations);
                vec![102, start, count as i64]
            }
            "return" => vec![
                103,
                if tag(&v[1]) == "undefined" {
                    -1
                } else {
                    self.expr(&v[1], scope)?
                },
            ],
            "throw" => vec![110, self.expr(&v[1], scope)?],
            "break" => vec![104],
            "continue" => vec![105],
            "if" => vec![
                106,
                self.expr(&v[1], scope)?,
                self.stmt(&v[2], scope)?,
                self.stmt(&v[3], scope)?,
            ],
            "while" => vec![107, self.expr(&v[1], scope)?, self.stmt(&v[2], scope)?],
            "dowhile" => vec![111, self.expr(&v[1], scope)?, self.stmt(&v[2], scope)?],
            "try" => {
                let (depth, flat) = self.variable_location(num(&v[4][1]), num(&v[4][2]))?;
                if flat >= 0 {
                    return Err("object projection: internal error: try in a function without an environment".into());
                }
                let slot = num(&v[4][2]);
                let block = num(&v[1][1]);
                self.completions.insert(block as usize, (depth, slot));
                let handler = if v[2].is_null() {
                    -1
                } else {
                    self.completions.insert(num(&v[2][1]) as usize, (depth, slot));
                    num(&v[2][1])
                };
                let finalizer = if v[3].is_null() { -1 } else { self.stmt(&v[3], scope)? };
                vec![113, block, handler, finalizer, depth, slot]
            }
            "switch" => {
                let discriminant = self.expr(&v[1], scope)?;
                let mut pairs = Vec::new();
                let mut default = -1;
                for (index, clause) in array(v)[2..].iter().enumerate() {
                    if tag(clause) == "default" {
                        default = index as i64;
                        pairs.extend([-1, self.stmt(&clause[1], scope)?]);
                    } else {
                        let test = self.expr(&clause[1], scope)?;
                        pairs.extend([test, self.stmt(&clause[2], scope)?]);
                    }
                }
                let (start, count) = self.list(pairs);
                vec![112, discriminant, start, count / 2, default]
            }
            "for" => vec![
                108,
                self.expr(&v[1], scope)?,
                self.stmt(&v[2], scope)?,
                self.stmt(&v[3], scope)?,
                if tag(&v[4]) == "undefined" {
                    -1
                } else {
                    self.expr(&v[4], scope)?
                },
                if self.flat_mode { 0 } else { num(&v[5]) },
                if num(&v[5]) > 0
                    && self.source_functions[scope.iter().rev().find_map(|id| *id).unwrap()]
                        .has_nested_functions
                {
                    1
                } else {
                    0
                },
            ],
            "block" => {
                let values = array(&v[1])
                    .iter()
                    .map(|s| self.stmt(s, scope))
                    .collect::<Result<Vec<_>>>()?;
                let (start, count) = self.list(values);
                vec![
                    109,
                    start,
                    count,
                    if self.flat_mode { 0 } else { num(&v[2]) },
                    if self.source_functions[scope.iter().rev().find_map(|id| *id).unwrap()]
                        .has_nested_functions
                    {
                        1
                    } else {
                        0
                    },
                ]
            }
            other => {
                return Err(format!(
                    "object projection: unsupported statement {other:?}"
                ))
            }
        };
        if lexical_slots > 0 && self.flat_mode {
            self.own_offsets.pop();
        }
        Ok(self.node(r))
    }
}

/// Encode guest syntax only. `entry` is a synthetic one-argument function whose
/// environment holds the source's top-level declarations and variables. All
/// function and expression rows have width 17; lists hold integer node IDs or
/// explicit declaration/property pairs. Function[7] is -1 for captured frames,
/// otherwise the promoted local-vector size. Var node[3] is its flat slot or -1;
/// declaration triples use depth=-1 for a promoted slot. Outer lexical addresses
/// skip all statically eliminated own frames. No guest algorithm is executed here.
/// Every identifier, property name and string a program mentions.
fn mentioned_names(module: &ast::Module) -> std::collections::BTreeSet<String> {
    use swc_ecma_visit::{Visit, VisitWith};
    #[derive(Default)]
    struct Names(std::collections::BTreeSet<String>);
    impl Visit for Names {
        fn visit_ident(&mut self, ident: &ast::Ident) {
            self.0.insert(ident.sym.to_string());
        }
        fn visit_ident_name(&mut self, ident: &ast::IdentName) {
            self.0.insert(ident.sym.to_string());
        }
        fn visit_str(&mut self, string: &ast::Str) {
            if let Some(text) = string.value.as_str() {
                self.0.insert(text.to_owned());
            }
        }
        // A rest element is taken with the array `slice` builtin.
        fn visit_rest_pat(&mut self, rest: &ast::RestPat) {
            self.0.insert("slice".to_owned());
            rest.visit_children_with(self);
        }
    }
    let mut names = Names::default();
    module.visit_with(&mut names);
    names.0
}
/// The prelude sections a program can reach, as statements.
fn prelude_for(names: &std::collections::BTreeSet<String>) -> Result<Vec<ast::Stmt>> {
    // Sections in file order: (helper name if a helper, text, selected).
    let mut sections: Vec<(Option<String>, String, bool)> = Vec::new();
    let mut triggers_of: Vec<Vec<String>> = Vec::new();
    let mut needs: Vec<(usize, String)> = Vec::new();
    for line in include_str!("../docs/object-projection/prelude.js").lines() {
        if let Some(triggers) = line.strip_prefix("//@ when ") {
            let selected = triggers.split_whitespace().any(|t| names.contains(t));
            sections.push((None, String::new(), selected));
            triggers_of.push(triggers.split_whitespace().map(str::to_owned).collect());
        } else if let Some(needed) = line.strip_prefix("//@ needs ") {
            // The section uses builtins that other sections define.
            let index = sections.len() - 1;
            needs.extend(needed.split_whitespace().map(|n| (index, n.to_owned())));
        } else if let Some(helper) = line.strip_prefix("//@ helper ") {
            triggers_of.push(vec![]);
            sections.push((Some(helper.trim().to_owned()), String::new(), false));
        } else if let Some(section) = sections.last_mut() {
            section.1.push_str(line);
            section.1.push('\n');
        }
    }
    // A helper is included when an included section calls it.
    loop {
        let wanted: Vec<usize> = sections
            .iter()
            .enumerate()
            .filter(|(_, (helper, _, selected))| {
                !selected
                    && helper.as_ref().is_some_and(|name| {
                        let call = format!("{name}(");
                        sections.iter().any(|other| other.2 && other.1.contains(&call))
                    })
            })
            .map(|(index, _)| index)
            .collect();
        let mut wanted = wanted;
        for (index, name) in &needs {
            if sections[*index].2 {
                for (other, triggers) in triggers_of.iter().enumerate() {
                    if !sections[other].2 && triggers.contains(name) && !wanted.contains(&other) {
                        wanted.push(other);
                    }
                }
            }
        }
        if wanted.is_empty() {
            break;
        }
        for index in wanted {
            sections[index].2 = true;
        }
    }
    let selected: String = sections
        .iter()
        .filter(|section| section.2)
        .map(|section| section.1.as_str())
        .collect();
    let mut statements = Vec::new();
    for item in parse_strict(&selected)?.body {
        match item {
            ast::ModuleItem::Stmt(stmt) => statements.push(stmt),
            _ => return Err("object projection: malformed prelude".into()),
        }
    }
    Ok(statements)
}
/// Harness statements by which a program that computes property names at run
/// time registers the spelling of every static property atom before anything
/// else runs. Empty for a program that does not.
pub fn atom_registration(program: &Value) -> String {
    if program["keyed"] != true {
        return String::new();
    }
    format!("var atomSpellings={};var spelled=1;while(spelled<atomSpellings.length){{atomName(spelled,atomSpellings[spelled]);spelled=spelled+1;}}\n", program["keys"])
}
pub fn encode(source: &str) -> Result<Value> {
    let module = parse_strict(source)?;
    let user_bindings = {
        use swc_ecma_visit::{Visit, VisitWith};
        #[derive(Default)]
        struct Bound(std::collections::BTreeSet<String>);
        impl Visit for Bound {
            fn visit_binding_ident(&mut self, ident: &ast::BindingIdent) {
                self.0.insert(ident.id.sym.to_string());
            }
            fn visit_fn_decl(&mut self, declaration: &ast::FnDecl) {
                self.0.insert(declaration.ident.sym.to_string());
                declaration.function.visit_with(self);
            }
        }
        let mut bound = Bound::default();
        module.visit_with(&mut bound);
        bound.0
    };
    let mut body = prelude_for(&mentioned_names(&module))?;
    let prelude_statements = body.len();
    for item in module.body {
        match item {
            ast::ModuleItem::Stmt(stmt) => body.push(stmt),
            _ => return Err("object projection: imports/exports are unsupported".into()),
        }
    }
    if !body
        .iter()
        .any(|s| matches!(s, ast::Stmt::Decl(ast::Decl::Fn(f)) if f.ident.sym == "main"))
    {
        return Err("object projection: guest must declare main(input)".into());
    }
    let mut input_name = "__object_projection_input".to_owned();
    while source.contains(&input_name) {
        input_name.push('_');
    }
    let wrapper = parse_strict(&format!(
        "function __entry({input_name}) {{ return main({input_name}); }}"
    ))?;
    let ast::ModuleItem::Stmt(ast::Stmt::Decl(ast::Decl::Fn(wrapper))) = &wrapper.body[0] else {
        unreachable!()
    };
    body.extend(wrapper.function.body.as_ref().unwrap().stmts.clone());
    let lexical = LexicalEncoder {
        scopes: vec![],
        declarations: vec![],
        constants: vec![],
        pending: vec![],
        function_bases: vec![],
        classes: vec![],
        fields_prologue: false,
        user_bindings,
        prelude_statements,
        in_prelude: false,
    }
    .function(vec![input_name], &body, false)?;
    let mut lexical = lexical;
    let module_init = propagate_module_constants(&mut lexical);
    let mut encoder = Encoder {
        source_functions: vec![],
        nodes: vec![],
        functions: vec![],
        lists: vec![],
        constants: vec![],
        keys: ["length", "prototype", "constructor", "name", "message"]
            .into_iter()
            .map(str::to_owned)
            .collect(),
        call_candidates: Default::default(),
        keyed: false,
        split_dispatch: 0,
        completions: Default::default(),
        proven: Default::default(),
        flat_mode: false,
        own_offsets: vec![],
        next_flat_slot: 0,
    };
    let entry = encoder.register(&lexical, vec![], false)?;
    // Functions that only run once initialization is complete read an
    // initialized module variable after its initializer.
    let late_initialized = module_init.map(|init| {
        let early: std::collections::BTreeSet<usize> = std::iter::once(entry)
            .chain(
                init.during_init
                    .iter()
                    .map(|index| encoder.source_functions[entry].declarations[*index]),
            )
            .collect();
        (early, init.initialized)
    });
    (encoder.call_candidates, encoder.proven) =
        PointsTo::analyze(&encoder.source_functions, late_initialized)?;
    for id in 0..encoder.source_functions.len() {
        let function = encoder.source_functions[id].clone();
        let mut scope = function.outer;
        scope.push(Some(id));
        encoder.flat_mode = !function.has_nested_functions;
        encoder.own_offsets = if encoder.flat_mode { vec![0] } else { vec![] };
        encoder.next_flat_slot = num(&function.ast[1]);
        let body = encoder.stmt(&function.ast[3], &scope)?;
        let pairs = array(&function.ast[2])
            .iter()
            .zip(&function.declarations)
            .flat_map(|(d, id)| [num(&d[0]), *id as i64])
            .collect();
        let (decl_start, _) = encoder.list(pairs);
        encoder.functions[id] = row(vec![
            num(&function.ast[0]),
            num(&function.ast[1]),
            decl_start,
            function.declarations.len() as i64,
            body,
            if function.is_arrow { 1 } else { 0 },
            if function.has_nested_functions { 1 } else { 0 },
            if encoder.flat_mode {
                encoder.next_flat_slot
            } else {
                -1
            },
            this_property_count(&function.ast[3]) as i64,
            // `constructor`, plus what the program adds to the prototype.
            1 + encoder.proven.prototype_writes.get(&id).copied().unwrap_or(0) as i64,
            // Where the activation stores its `arguments` array, or -1.
            num(&function.ast[4]),
            // 11..13 are filled in for a protected part of a `try`.
            0,
            0,
            0,
            // Where a `return` inside a `try` of this function leaves its
            // value, or -1.
            num(&function.ast[7]),
        ]);
    }
    // A completion function reports how its body completed (info[11]) and
    // stores a returned value at info[12], info[13] of the scope it runs in.
    for (id, (depth, slot)) in encoder.completions.clone() {
        encoder.functions[id][11] = 1;
        encoder.functions[id][12] = depth;
        encoder.functions[id][13] = slot;
    }
    if encoder.keyed {
        // A string the program spells out may be used as a property name.
        for constant in encoder.constants.clone() {
            if constant[0] == "string" {
                encoder.atom(constant[1].as_str().unwrap());
            }
        }
    }
    Ok(
        json!({"entry": entry, "main": entry, "nodes": encoder.nodes, "functions": encoder.functions,
        "lists": encoder.lists, "constants": encoder.constants, "keys": encoder.keys,
        "keyed": encoder.keyed,
        "profile": "object-lexical-projection-v2-flat-locals"}),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn richards_encodes_source_without_algorithm_replacement() {
        let p = encode(include_str!(
            "../docs/object-projection/benchmarks/richards/input.js"
        ))
        .unwrap();
        assert_eq!(p["entry"], 0);
        assert_eq!(
            &array(&p["keys"])[..5],
            &[
                json!("length"),
                json!("prototype"),
                json!("constructor"),
                json!("name"),
                json!("message")
            ]
        );
        for table in ["nodes", "functions"] {
            for r in array(&p[table]) {
                assert_eq!(array(r).len(), 17);
                assert!(array(r).iter().all(Value::is_number));
            }
        }
        for tag in [8, 10, 16, 17, 18, 19, 21, 108, 110] {
            assert!(
                array(&p["nodes"]).iter().any(|n| n[0] == tag),
                "missing tag {tag}"
            );
        }
    }
    #[test]
    fn declarations_are_cached_slots_and_module_variables_are_captured() {
        let p =
            encode("var factor=3; function main(x){factor+=1;function f(y){return y*factor+x}return f(2)}")
                .unwrap();
        let functions = array(&p["functions"]);
        assert_eq!(functions[0][0], 1);
        assert!(functions[0][3].as_i64().unwrap() > 0);
        assert!(array(&p["nodes"])
            .iter()
            .any(|n| n[0] == 3 && n[1] == 1 && n[3] == -1));
        assert_eq!(functions[0][7], -1);
        assert_eq!(functions[1][7], -1);
        assert_eq!(functions[2][7], 1);
        assert!(array(&p["nodes"])
            .iter()
            .any(|n| n[0] == 17 && n[6].as_i64().unwrap() >= 0));
    }
    fn count(p: &Value, matches: impl Fn(&Value) -> bool) -> usize {
        array(&p["nodes"]).iter().filter(|n| matches(n)).count()
    }
    #[test]
    fn immutable_module_constants_replace_reads_only_after_initialization() {
        // The initializer `2|1` appears once more wherever a read was replaced.
        let copies = |source: &str| count(&encode(source).unwrap(), |n| n[0] == 4 && n[1] == 15);
        // `k` is written once at top level; `f` can only run after that.
        assert_eq!(copies("var k=2|1; function f(){return k} function main(x){return f()+x}"), 2);
        // A second write anywhere keeps the variable.
        assert_eq!(copies("var k=2|1; function f(){return k} function main(x){k=x;return f()}"), 1);
        // `f` runs during initialization, before `k` is initialized.
        assert_eq!(
            copies("function f(){return k} var early=f(); var k=2|1; function main(x){return f()}"),
            1
        );
        // A function that cannot run during initialization still qualifies.
        assert_eq!(
            copies("function f(){return 0} function g(){return k} var early=f(); var k=2|1; function main(x){return g()}"),
            2
        );
        // An initialization call with an unknown target disables the rewrite.
        assert_eq!(
            copies("var o={g:function(){return k}}; var early=o.g(); var k=2|1; function main(x){return o.g()}"),
            1
        );
    }
    const OWN_LOAD: usize = 4;
    #[test]
    fn own_property_loads_need_an_unconditional_constructor_prefix() {
        let load = |n: &Value| n[0] == 8 && n[1].as_i64().unwrap() >= 0;
        let p = encode("function P(a){this.a=a} function main(x){var p=new P(x);return p.a}").unwrap();
        assert_eq!(count(&p, |n| load(n) && n[OWN_LOAD] == 1), 1);
        // Assigned on one branch only.
        let p = encode("function P(a){if(a)this.a=a} function main(x){var p=new P(x);return p.a}")
            .unwrap();
        assert_eq!(count(&p, |n| load(n) && n[OWN_LOAD] == 1), 0);
        // Assigned on both branches.
        let p = encode(
            "function P(a){if(a){this.a=1}else{this.a=2}} function main(x){var p=new P(x);return p.a}",
        )
        .unwrap();
        assert_eq!(count(&p, |n| load(n) && n[OWN_LOAD] == 1), 1);
        // `this` escapes to a call before the assignment.
        let p = encode(
            "var seen; function peek(o){seen=o.a} function P(a){peek(this);this.a=a} function main(x){var p=new P(x);return p.a}",
        )
        .unwrap();
        assert_eq!(count(&p, |n| load(n) && n[OWN_LOAD] == 1), 0);
        // A base that may be an unrelated object.
        let p = encode(
            "function P(a){this.a=a} function main(x){var p=x?new P(x):{b:1};return p.a}",
        )
        .unwrap();
        assert_eq!(count(&p, |n| load(n) && n[OWN_LOAD] == 1), 0);
    }
    #[test]
    fn numeric_operators_need_number_only_operands() {
        let numeric = |n: &Value| n[0] == 4 && n[4] == 1;
        let p = encode("function P(a){this.a=a} function main(x){var p=new P(x);return p.a+1}").unwrap();
        assert_eq!(count(&p, numeric), 1);
        // The field also receives a string.
        let p = encode(
            "function P(a){this.a=a} function main(x){var p=new P(x);p.a='s';return p.a+1}",
        )
        .unwrap();
        assert_eq!(count(&p, numeric), 0);
        // A local read on a path with no prior write may be undefined.
        let p = encode("function main(x){var y;if(x)y=1;return y+1}").unwrap();
        assert_eq!(count(&p, numeric), 0);
        let p = encode("function main(x){var y;if(x)y=1;else y=2;return y+1}").unwrap();
        assert_eq!(count(&p, numeric), 1);
        // A missing argument is undefined.
        let p = encode("function f(a){return a+1} function main(x){return f()}").unwrap();
        assert_eq!(count(&p, numeric), 0);
    }
    #[test]
    fn static_method_targets_need_an_immutable_lookup_path() {
        let resolved = |n: &Value| n[0] == 16 && n[7].as_i64().unwrap() >= 0;
        let base = "function P(a){this.a=a} P.prototype.get=function(){return this.a};";
        let p = encode(&format!("{base} function main(x){{return new P(x).get()}}")).unwrap();
        assert_eq!(count(&p, resolved), 1);
        for later in [
            // The method is replaced after initialization.
            "function main(x){var p=new P(x);P.prototype.get=function(){return 7};return p.get()}",
            // An instance shadows it.
            "function main(x){var p=new P(x);p.get=function(){return 7};return p.get()}",
            // The constructor's prototype object is replaced.
            "function main(x){P.prototype={get:function(){return 7}};return new P(x).get()}",
            // The receiver may be another kind of object.
            "function main(x){var p=x?new P(x):{get:function(){return 7}};return p.get()}",
        ] {
            let p = encode(&format!("{base} {later}")).unwrap();
            assert_eq!(count(&p, resolved), 0, "{later}");
        }
        // Two top-level definitions: the lookup result depends on order.
        let p = encode(&format!(
            "{base} P.prototype.get=function(){{return 8}}; function main(x){{return new P(x).get()}}"
        ))
        .unwrap();
        assert_eq!(count(&p, resolved), 0);
        // A conditional top-level definition may not have run.
        let p = encode(
            "function P(a){this.a=a} if(P)P.prototype.get=function(){return 1}; function main(x){return new P(x).get()}",
        )
        .unwrap();
        assert_eq!(count(&p, resolved), 0);
    }
    #[test]
    fn lexical_loop_and_arrow_capture_are_explicit() {
        let p = encode("function main(x){var f;for(let i=0;i<x;i++){let j=i;f=()=>j}return f()}")
            .unwrap();
        assert!(array(&p["nodes"]).iter().any(|n| n[0] == 108 && n[5] == 1));
        assert!(array(&p["nodes"]).iter().any(|n| n[0] == 15 && n[2] == 1));
        assert!(array(&p["functions"]).iter().any(|n| n[5] == 1));
    }
    #[test]
    fn tagged_constants_holes_and_member_updates_remain_distinct() {
        let p = encode(
            "function main(x){var a=[,undefined,null,false,'hi'];var o={v:x};o.v++;return a}",
        )
        .unwrap();
        assert!(array(&p["constants"]).contains(&json!(["null"])));
        assert!(array(&p["constants"]).contains(&json!(["bool", false])));
        assert!(array(&p["constants"]).contains(&json!(["string", "hi"])));
        let nodes = array(&p["nodes"]);
        let update = nodes.iter().find(|n| n[0] == 10).unwrap();
        assert_eq!(nodes[update[2].as_u64().unwrap() as usize][0], 8);
        let list = nodes.iter().find(|n| n[0] == 7).unwrap();
        assert_eq!(p["lists"][list[1].as_u64().unwrap() as usize], -1);
    }
    #[test]
    fn noncaptured_lexical_scopes_receive_disjoint_flat_slots() {
        let p=encode("function main(x){var sum=x;{let x=2;sum+=x}{let x=3;sum+=x}for(let i=0;i<2;i++){let j=i;sum+=j}return sum}").unwrap();
        assert_eq!(p["functions"][0][7], -1);
        assert_eq!(p["functions"][1][6], 0);
        assert_eq!(p["functions"][1][7], 6);
        let nodes = array(&p["nodes"]);
        let mut declarations = std::collections::BTreeSet::new();
        for node in nodes {
            if node[0] == 102 {
                let start = num(&node[1]) as usize;
                for i in 0..num(&node[2]) as usize {
                    assert_eq!(p["lists"][start + i * 3], -1);
                    declarations.insert(num(&p["lists"][start + i * 3 + 1]));
                }
            }
            if node[0] == 109 {
                assert_eq!(node[3], 0);
            }
            if node[0] == 108 {
                assert_eq!(node[5], 0);
            }
        }
        assert_eq!(declarations, [1, 2, 3, 4, 5].into_iter().collect());
        let locals: std::collections::BTreeSet<_> = nodes
            .iter()
            .filter(|n| n[0] == 3 && num(&n[3]) >= 0)
            .map(|n| num(&n[3]))
            .collect();
        assert_eq!(locals, [0, 1, 2, 3, 4, 5].into_iter().collect());
    }
    #[test]
    fn promoted_blocks_adjust_outer_declaration_addresses() {
        let p=encode("function shared(y){return y}function main(x){{let y=x;var f=shared;return shared(f(y))}}").unwrap();
        assert_eq!(p["functions"][2][7], 3);
        let nodes = array(&p["nodes"]);
        assert!(nodes.iter().any(|n| n[0] == 18 && n[1] == 1 && n[2] == 0));
        assert!(nodes.iter().any(|n| n[0] == 17 && n[1] == 1 && n[2] == 0));
        assert!(nodes.iter().any(|n| n[0] == 3 && n[3] == 1));
    }
    #[test]
    fn persistent_functions_keep_original_lexical_frames() {
        let p = encode("function main(x){var f;{let y=x;f=()=>y}return f()}").unwrap();
        assert_eq!(p["functions"][1][7], -1);
        assert!(array(&p["nodes"])
            .iter()
            .any(|n| n[0] == 109 && n[3] == 1 && n[4] == 1));
        // The arrow's own zero-slot frame is removed; captured y is now depth0.
        assert_eq!(p["functions"][2][7], 0);
        assert!(array(&p["nodes"])
            .iter()
            .any(|n| n[0] == 3 && n[1] == 0 && n[2] == 0 && n[3] == -1));
    }
    #[test]
    fn unsupported_semantics_are_explicit_errors() {
        for source in [
            "function main(x){main=x;return x}",
            "function main(x){return eval(x)}",
            "function main(x){return class C{get v(){return 1}}}",
            "function main(x){return class C{#p=1}}",
            "function main(x){class C{m(){return super.m()}} return C}",
            "function main(x){return (function named(){})}",
            "function main(x){return {[x]:1}}",
            "function main(x){return {get x(){return 1}}}",
            "function main(x){const y=x;y++;return y}",
            "function main(x){const y=x;return ()=>y=2}",
            "function main(x){return y;let y=1}",
            "function main(x){let y=y;return y}",
            "function main(x){return x.__proto__}",
        ] {
            assert!(encode(source).is_err(), "accepted {source}");
        }
    }
}

// A small, monotone, flow-insensitive allocation/constructor points-to analysis.
// It narrows residual dispatch alternatives, never executes guest statements.
// Sibling block frames and all array allocations are deliberately merged. Those
// merges lose precision but cannot discard a callable alternative.
#[derive(Clone, Copy, Debug, Eq, PartialEq, Ord, PartialOrd)]
enum ObjectKind {
    Function(usize),
    Instance(usize),
    Prototype(usize),
    /// One abstract array per allocating expression.
    Array(usize),
    Record,
    /// An object created with an explicit prototype, one per creating
    /// expression.
    Derived(usize),
    /// The root object (0), array (1), function (2), string (3), number
    /// (4) or boolean (5) prototype.
    Root(u8),
}
const UNDEFINED: u8 = 1;
const NULL: u8 = 2;
const BOOLEAN: u8 = 4;
const NUMBER: u8 = 8;
const STRING: u8 = 16;
/// Every value an expression may produce: abstract objects, primitive kinds,
/// or anything at all. The empty set means the expression never completes.
#[derive(Clone, Default, Debug, Eq, PartialEq)]
struct Points {
    objects: std::collections::BTreeSet<ObjectKind>,
    prims: u8,
    unknown: bool,
}
impl Points {
    fn one(object: ObjectKind) -> Self {
        Self {
            objects: [object].into_iter().collect(),
            ..Default::default()
        }
    }
    fn prim(prims: u8) -> Self {
        Self {
            prims,
            ..Default::default()
        }
    }
    fn unknown() -> Self {
        Self {
            unknown: true,
            ..Default::default()
        }
    }
    fn join(&mut self, other: &Self) -> bool {
        let before = (self.objects.len(), self.prims, self.unknown);
        self.objects.extend(&other.objects);
        self.prims |= other.prims;
        self.unknown |= other.unknown;
        before != (self.objects.len(), self.prims, self.unknown)
    }
    fn with(mut self, prims: u8) -> Self {
        self.prims |= prims;
        self
    }
    /// Proven to be a number and nothing else.
    fn only_number(&self) -> bool {
        !self.unknown && self.objects.is_empty() && self.prims == NUMBER
    }
    fn may_be_string(&self) -> bool {
        self.unknown || self.prims & STRING != 0
    }
}
/// Result type of a non-logical binary operator. An object operand makes the
/// runtime operator fail, so it contributes no result.
fn binary_result(op: &str, left: &Points, right: &Points) -> Points {
    match op {
        "+" => Points::prim(
            NUMBER
                | if left.may_be_string() || right.may_be_string() {
                    STRING
                } else {
                    0
                },
        ),
        "-" | "*" | "/" | "%" | "**" | "|" | "&" | "^" | "<<" | ">>" | ">>>" => Points::prim(NUMBER),
        _ => Points::prim(BOOLEAN),
    }
}
/// Syntax that runs no guest function and does not mention `this`.
fn inert_expression(v: &Value) -> bool {
    match tag(v) {
        "lit" | "undefined" | "var" | "decl" | "mathconst" | "hole" => true,
        "bin" | "unary" | "cond" | "get" | "array" | "arraylength" | "seq" | "mathcall" => v
            .as_array()
            .unwrap()
            .iter()
            .skip(1)
            .all(|child| match child {
                Value::Array(items) if items.first().is_some_and(Value::is_string) => {
                    inert_expression(child)
                }
                Value::Array(items) => items.iter().all(inert_expression),
                _ => true,
            }),
        _ => false,
    }
}
/// Own properties a constructor body assigns on `this` before any other guest
/// code can observe the new object.
///
/// Only a leading run of statements is considered: `this.key = e` with inert
/// `e`, declarations with inert initializers, and `if`/blocks made of the
/// same. Nothing in such a run calls a function or lets `this` escape, so an
/// instance that is reachable from anywhere else has completed the whole run.
/// Properties are never deleted in this subset, so they stay present.
fn definite_properties(body: &Value) -> std::collections::BTreeSet<String> {
    definite_run(body).0
}
/// The definite properties of a constructor body, and every assignment node
/// in the leading run that establishes them. Those assignments are where the
/// properties come into existence, so none of them is a store to a property
/// the object already owns.
fn definite_run(body: &Value) -> (std::collections::BTreeSet<String>, Vec<&Value>) {
    use std::collections::BTreeSet;
    // Returns false when the statement ends the leading run.
    fn statement<'a>(v: &'a Value, found: &mut BTreeSet<String>, nodes: &mut Vec<&'a Value>) -> bool {
        match tag(v) {
            "empty" => true,
            "var" => array(&v[1])
                .iter()
                .all(|d| d[2].is_null() || inert_expression(&d[2])),
            "expr" => {
                let e = &v[1];
                let target = &e[2];
                if tag(e) == "assign"
                    && e[1] == "="
                    && tag(target) == "get"
                    && tag(&target[1]) == "this"
                    && tag(&target[2]) == "lit"
                    && target[2][1].is_string()
                    && inert_expression(&e[3])
                {
                    found.insert(target[2][1].as_str().unwrap().to_owned());
                    nodes.push(e);
                    true
                } else {
                    false
                }
            }
            "block" if num(&v[2]) == 0 => array(&v[1]).iter().all(|s| statement(s, found, nodes)),
            "if" if inert_expression(&v[1]) => {
                let (mut yes, mut no) = (BTreeSet::new(), BTreeSet::new());
                let complete =
                    statement(&v[2], &mut yes, nodes) & statement(&v[3], &mut no, nodes);
                found.extend(yes.intersection(&no).cloned());
                complete
            }
            _ => false,
        }
    }
    let mut found = BTreeSet::new();
    let mut nodes = Vec::new();
    if tag(body) == "block" {
        for s in array(&body[1]) {
            if !statement(s, &mut found, &mut nodes) {
                break;
            }
        }
    }
    (found, nodes)
}
/// Objects keep at most this many property slots inline (the runtime's limit).
const INLINE_SLOT_LIMIT: usize = 128;
/// The properties a function body assigns on `this` in its leading run of
/// statements, in first-assignment order. A fresh object constructed by the
/// function acquires exactly these properties first and in this order, which
/// fixes their slot numbers.
///
/// The run is `this.key = inert`, inert declarations, empty statements and
/// blocks of those. An `if` with an inert test continues the run only when
/// both branches complete and leave the same sequence; otherwise the order
/// would depend on the branch taken and the run ends before it.
fn leading_layout(body: &Value) -> Vec<String> {
    // Returns false when the statement ends the run.
    fn statement(v: &Value, keys: &mut Vec<String>) -> bool {
        match tag(v) {
            "empty" => true,
            "var" => array(&v[1])
                .iter()
                .all(|d| d[2].is_null() || inert_expression(&d[2])),
            "expr" => {
                let e = &v[1];
                let target = &e[2];
                if tag(e) == "assign"
                    && e[1] == "="
                    && tag(target) == "get"
                    && tag(&target[1]) == "this"
                    && tag(&target[2]) == "lit"
                    && target[2][1].is_string()
                    && inert_expression(&e[3])
                {
                    let key = target[2][1].as_str().unwrap().to_owned();
                    if !keys.contains(&key) {
                        keys.push(key);
                    }
                    true
                } else {
                    false
                }
            }
            "block" if num(&v[2]) == 0 => array(&v[1]).iter().all(|s| statement(s, keys)),
            "if" if inert_expression(&v[1]) => {
                let (mut yes, mut no) = (keys.clone(), keys.clone());
                if statement(&v[2], &mut yes) && statement(&v[3], &mut no) && yes == no {
                    *keys = yes;
                    true
                } else {
                    false
                }
            }
            _ => false,
        }
    }
    let mut keys = Vec::new();
    if tag(body) == "block" {
        for v in array(&body[1]) {
            if !statement(v, &mut keys) {
                break;
            }
        }
    }
    keys
}
/// How many distinct properties a function body assigns on `this`, not
/// counting nested ordinary functions: the inline slots given to what it
/// constructs.
fn this_property_count(body: &Value) -> usize {
    fn walk(v: &Value, found: &mut std::collections::BTreeSet<String>) {
        let Some(items) = v.as_array() else { return };
        if items.first().and_then(Value::as_str) == Some("assign") {
            let target = &v[2];
            if tag(target) == "get"
                && tag(&target[1]) == "this"
                && tag(&target[2]) == "lit"
                && target[2][1].is_string()
            {
                found.insert(target[2][1].as_str().unwrap().to_owned());
            }
        }
        // A nested function has its own `this` unless it is an arrow.
        if matches!(items.first().and_then(Value::as_str), Some("fun" | "funid"))
            && items.get(2).and_then(Value::as_bool) != Some(true)
        {
            return;
        }
        for child in items {
            walk(child, found);
        }
    }
    let mut found = std::collections::BTreeSet::new();
    walk(body, &mut found);
    found.len()
}
/// Locals of a closure-free function that some path may read before writing.
///
/// This is ordinary definite assignment over structured control flow: a write
/// counts for what follows it on every path. Writes inside a conditional
/// operand, a branch or a loop body do not count after the construct unless
/// both branches make them. Locals are keyed like `PointsTo` bindings, by
/// (lexical frame index within the function, slot); leaving a lexical scope
/// forgets its writes, so sibling scopes sharing a key are each checked.
fn read_before_write(function: &Function) -> Option<std::collections::BTreeSet<(usize, i64)>> {
    use std::collections::BTreeSet;
    if function.has_nested_functions {
        return None;
    }
    type Local = (usize, i64);
    struct Flow {
        written: BTreeSet<Local>,
        unassigned: BTreeSet<Local>,
    }
    impl Flow {
        fn local(node: &Value, depth: usize) -> Option<Local> {
            let up = node[1].as_u64()? as usize;
            (up <= depth).then(|| (depth - up, num(&node[2])))
        }
        fn read(&mut self, node: &Value, depth: usize) {
            if let Some(local) = Self::local(node, depth) {
                if !self.written.contains(&local) {
                    self.unassigned.insert(local);
                }
            }
        }
        /// Evaluate without keeping its writes.
        fn conditionally(&mut self, f: impl FnOnce(&mut Self)) -> BTreeSet<Local> {
            let before = self.written.clone();
            f(self);
            std::mem::replace(&mut self.written, before)
        }
        fn expression(&mut self, v: &Value, depth: usize) {
            match tag(v) {
                "var" => self.read(v, depth),
                "lit" | "undefined" | "decl" | "funid" | "this" | "mathconst" | "hole" => {}
                "assign" => {
                    let target = &v[2];
                    if tag(target) == "var" {
                        if v[1] != "=" {
                            self.read(target, depth);
                        }
                        self.expression(&v[3], depth);
                        if let Some(local) = Self::local(target, depth) {
                            self.written.insert(local);
                        }
                    } else {
                        self.expression(target, depth);
                        self.expression(&v[3], depth);
                    }
                }
                "update" => self.expression(&v[2], depth),
                "bin" if v[1] == "&&" || v[1] == "||" => {
                    self.expression(&v[2], depth);
                    self.conditionally(|flow| flow.expression(&v[3], depth));
                }
                "cond" => {
                    self.expression(&v[1], depth);
                    let yes = self.conditionally(|flow| flow.expression(&v[2], depth));
                    let no = self.conditionally(|flow| flow.expression(&v[3], depth));
                    self.written = yes.intersection(&no).cloned().collect();
                }
                "object" => {
                    for field in array(&v[1]) {
                        self.expression(&field[1], depth);
                    }
                }
                // Operands are evaluated left to right.
                _ => {
                    for child in array(v).iter().skip(1) {
                        match child {
                            Value::Array(items) if items.first().is_some_and(Value::is_string) => {
                                self.expression(child, depth)
                            }
                            Value::Array(items) => {
                                for item in items {
                                    self.expression(item, depth);
                                }
                            }
                            _ => {}
                        }
                    }
                }
            }
        }
        fn statement(&mut self, v: &Value, depth: usize) {
            let scoped = (tag(v) == "block" && num(&v[2]) > 0) || (tag(v) == "for" && num(&v[5]) > 0);
            let depth = depth + usize::from(scoped);
            match tag(v) {
                "empty" | "break" | "continue" => {}
                "expr" | "throw" | "return" => self.expression(&v[1], depth),
                "var" => {
                    for d in array(&v[1]) {
                        if !d[2].is_null() {
                            self.expression(&d[2], depth);
                            let up = num(&d[0]) as usize;
                            if up <= depth {
                                self.written.insert((depth - up, num(&d[1])));
                            }
                        }
                    }
                }
                "if" => {
                    self.expression(&v[1], depth);
                    let yes = self.conditionally(|flow| flow.statement(&v[2], depth));
                    let no = self.conditionally(|flow| flow.statement(&v[3], depth));
                    // A branch that always leaves the function constrains nothing.
                    self.written = match (always_returns(&v[2]), always_returns(&v[3])) {
                        (true, false) => no,
                        (false, true) => yes,
                        _ => yes.intersection(&no).cloned().collect(),
                    };
                }
                "while" => {
                    self.expression(&v[1], depth);
                    self.conditionally(|flow| flow.statement(&v[2], depth));
                }
                // The body runs first, but a `continue` or `break` can skip
                // any of its writes, so none of them is definite afterwards
                // or at the test.
                "dowhile" => {
                    self.conditionally(|flow| flow.statement(&v[2], depth));
                    self.expression(&v[1], depth);
                }
                // Any clause can be the first one entered, and later tests
                // run only while nothing has matched.
                "switch" => {
                    self.expression(&v[1], depth);
                    for clause in &array(v)[2..] {
                        self.conditionally(|flow| {
                            if tag(clause) == "case" {
                                flow.expression(&clause[1], depth);
                                flow.statement(&clause[2], depth);
                            } else {
                                flow.statement(&clause[1], depth);
                            }
                        });
                    }
                }
                "for" => {
                    self.statement(&v[3], depth);
                    self.expression(&v[1], depth);
                    self.conditionally(|flow| {
                        flow.statement(&v[2], depth);
                    });
                    // The update can follow a `continue` from anywhere in the body.
                    self.conditionally(|flow| flow.expression(&v[4], depth));
                }
                "block" => {
                    for statement in array(&v[1]) {
                        self.statement(statement, depth);
                    }
                }
                _ => {}
            }
            if scoped {
                self.written.retain(|(frame, _)| *frame < depth);
            }
        }
    }
    let parameters = num(&function.ast[0]);
    let mut flow = Flow {
        // Parameters and `arguments` are initialized on entry.
        written: (0..parameters)
            .chain((num(&function.ast[4]) >= 0).then(|| num(&function.ast[4])))
            .map(|slot| (0, slot))
            .collect(),
        unassigned: BTreeSet::new(),
    };
    flow.statement(&function.ast[3], 0);
    Some(flow.unassigned)
}
/// Whether every completion of the statement is a `return` or `throw`.
fn always_returns(v: &Value) -> bool {
    match tag(v) {
        "return" | "throw" => true,
        "if" => always_returns(&v[2]) && always_returns(&v[3]),
        "block" => array(&v[1]).last().is_some_and(always_returns),
        _ => false,
    }
}
/// Facts proved for one syntactic operation, used to select an operation that
/// omits checks the proof makes redundant.
#[derive(Clone, Default)]
struct Proven {
    /// A named load whose base, whenever it is an object, owns the property.
    own_loads: std::collections::BTreeSet<String>,
    /// A plain named store whose base, whenever it is an object, already owns
    /// the property, so the store cannot add one.
    own_stores: std::collections::BTreeSet<String>,
    /// For a load or store site: the inline slot the property occupies in
    /// every object the base can be.
    slots: std::collections::BTreeMap<String, usize>,
    /// Compound stores whose base may hold a property made read-only: the
    /// own-load proof of their read does not license an unchecked store.
    unwritable: std::collections::BTreeSet<String>,
    /// A computed property access whose base is never a string, number or
    /// boolean.
    object_bases: std::collections::BTreeSet<String>,
    /// The same for a named load, a compound store or a method call.
    object_named: std::collections::BTreeSet<String>,
    /// A computed property access whose key is always a number.
    numeric_keys: std::collections::BTreeSet<String>,
    /// Per function, how many distinct properties the program writes on its
    /// `prototype` object. A sizing hint only; nothing depends on it.
    prototype_writes: std::collections::BTreeMap<usize, usize>,
    /// An operator whose operands are always numbers.
    numeric: std::collections::BTreeSet<String>,
    /// A method call with exactly one possible target: (function, whether
    /// the receiver still needs its object check).
    static_methods: std::collections::BTreeMap<String, (usize, bool)>,
}
type Binding = (usize, usize, i64);
struct PointsTo<'a> {
    functions: &'a [Function],
    bindings: std::collections::BTreeMap<Binding, Points>,
    fields: std::collections::BTreeMap<(ObjectKind, String), Points>,
    receivers: Vec<Points>,
    /// Every value each function may be called with, in any position.
    all_arguments: Vec<Points>,
    returns: Vec<Points>,
    sites: std::collections::BTreeMap<String, Points>,
    /// Per constructor: properties every instance owns.
    definite: Vec<std::collections::BTreeSet<String>>,
    /// Per function, the properties its body assigns first, in order: the
    /// slot numbers of what it constructs.
    layout: Vec<Vec<String>>,
    /// Base objects of each plain named store, by site key.
    stores: std::collections::BTreeMap<String, (String, Points)>,
    /// Site keys of the constructor-prefix stores, which create properties.
    creating: std::collections::BTreeSet<String>,
    /// Keys of each computed property access, by the site key of its `get`.
    index_keys: std::collections::BTreeMap<String, Points>,
    /// Bases of each computed property access, by the same key.
    index_bases: std::collections::BTreeMap<String, Points>,
    /// Objects whose properties `$define` may have given new attributes.
    redefined: Points,
    /// Every value a `throw` statement may throw.
    thrown: Points,
    /// Prototypes given explicitly to an object.
    protos: std::collections::BTreeMap<ObjectKind, Points>,
    /// Joined base value of each named load, by site key.
    array_sites: std::collections::BTreeMap<String, usize>,
    /// (functions that may run during source initialization, module slots
    /// with a top-level initializer), when initialization is fully known.
    module_initialized: Option<(
        std::collections::BTreeSet<usize>,
        std::collections::BTreeSet<i64>,
    )>,
    /// Per function without closures: locals that may be read before any
    /// write. `None` when closures could read a local at any time.
    unassigned: Vec<Option<std::collections::BTreeSet<(usize, i64)>>>,
    bases: std::collections::BTreeMap<String, (String, Points)>,
    /// Joined receiver of each method call: (method name, receiver, caller).
    method_sites: std::collections::BTreeMap<String, (String, Points, usize)>,
    /// Index of the module top-level statement being entered, if any.
    top_statement: Option<usize>,
    /// Set while evaluating the assignment that is a whole top-level statement.
    strict_write: Option<usize>,
    /// Property cells written by a whole top-level statement `o.k = e` whose
    /// base is one known object: the statement indices.
    init_writes: std::collections::BTreeMap<(ObjectKind, String), std::collections::BTreeSet<usize>>,
    /// Property cells written in any other way.
    other_writes: std::collections::BTreeSet<(ObjectKind, String)>,
    /// Joined operand values of each operator, by site key.
    operands: std::collections::BTreeMap<String, Points>,
    changed: bool,
}
fn call_site_key(scope: &[Option<usize>], node: &Value) -> String {
    format!("{}:{node}", scope.iter().rev().find_map(|id| *id).unwrap())
}
impl<'a> PointsTo<'a> {
    fn analyze(
        functions: &'a [Function],
        module_initialized: Option<(
            std::collections::BTreeSet<usize>,
            std::collections::BTreeSet<i64>,
        )>,
    ) -> Result<(std::collections::BTreeMap<String, Vec<usize>>, Proven)> {
        let mut analysis = Self {
            functions,
            bindings: Default::default(),
            fields: Default::default(),
            receivers: vec![Points::default(); functions.len()],
            all_arguments: vec![Points::default(); functions.len()],
            returns: functions
                .iter()
                .map(|f| {
                    // Falling off the end yields undefined, except in a
                    // protected part of a `try`, where it returns nothing
                    // from the function around it.
                    if always_returns(&f.ast[3]) || f.ast[6] == true {
                        Points::default()
                    } else {
                        Points::prim(UNDEFINED)
                    }
                })
                .collect(),
            sites: Default::default(),
            definite: functions
                .iter()
                .map(|f| definite_properties(&f.ast[3]))
                .collect(),
            layout: functions.iter().map(|f| leading_layout(&f.ast[3])).collect(),
            stores: Default::default(),
            index_keys: Default::default(),
            index_bases: Default::default(),
            redefined: Default::default(),
            thrown: Default::default(),
            protos: Default::default(),
            creating: functions
                .iter()
                .enumerate()
                .flat_map(|(id, f)| {
                    definite_run(&f.ast[3])
                        .1
                        .into_iter()
                        .map(move |node| format!("{id}:{node}"))
                })
                .collect(),
            array_sites: Default::default(),
            module_initialized,
            unassigned: functions.iter().map(read_before_write).collect(),
            bases: Default::default(),
            method_sites: Default::default(),
            top_statement: None,
            strict_write: None,
            init_writes: Default::default(),
            other_writes: Default::default(),
            operands: Default::default(),
            changed: false,
        };
        // The host passes the entry exactly one number.
        analysis.bindings.insert((0, 0, 0), Points::prim(NUMBER));
        // The entry is invoked by the host with an undefined receiver.
        analysis.receivers[0] = Points::prim(UNDEFINED);
        let mut converged = false;
        for _ in 0..256 {
            analysis.changed = false;
            for id in 0..functions.len() {
                let mut scope = functions[id].outer.clone();
                scope.push(Some(id));
                if id == 0 && tag(&functions[0].ast[3]) == "block" {
                    // Module top-level statements run once each, in order.
                    for (index, statement) in array(&functions[0].ast[3][1]).iter().enumerate() {
                        analysis.top_statement = Some(index);
                        analysis.statement(statement, &scope, 0)?;
                    }
                    analysis.top_statement = None;
                } else {
                    analysis.statement(&functions[id].ast[3], &scope, id)?;
                }
            }
            if !analysis.changed {
                converged = true;
                break;
            }
        }
        // An incomplete proof is never usable to narrow dispatch.
        if !converged {
            return Ok(Default::default());
        }
        let mut proven = Proven::default();
        if std::env::var_os("OBJECT_PROJECT_EXPLAIN_TYPES").is_some() {
            for (site, (key, base)) in &analysis.bases {
                eprintln!("load .{key} base={base:?} at {}", &site[..site.len().min(160)]);
            }
            for (site, operands) in &analysis.operands {
                eprintln!("operands={operands:?} at {}", &site[..site.len().min(160)]);
            }
            for (id, keys) in analysis.definite.iter().enumerate() {
                if !keys.is_empty() {
                    eprintln!("constructor {id} definitely assigns {keys:?}");
                }
            }
        }
        for (site, (key, base)) in &analysis.bases {
            if !base.unknown
                && !base.objects.is_empty()
                && base.objects.iter().all(|o| analysis.owns(*o, key))
            {
                proven.own_loads.insert(site.clone());
            }
        }
        for (site, key) in &analysis.index_keys {
            if key.only_number() {
                proven.numeric_keys.insert(site.clone());
            }
        }
        let object = |base: &Points| !base.unknown && base.prims & (STRING | NUMBER | BOOLEAN) == 0;
        for (site, base) in &analysis.index_bases {
            if object(base) {
                proven.object_bases.insert(site.clone());
            }
        }
        for (site, (_, base)) in &analysis.bases {
            if object(base) {
                proven.object_named.insert(site.clone());
            }
        }
        for (site, (_, receiver, _)) in &analysis.method_sites {
            if object(receiver) {
                proven.object_named.insert(site.clone());
            }
        }
        // A store proved own skips the writability test, so it must not
        // reach an object whose properties may have been made read-only.
        let writable = |base: &Points| {
            !analysis.redefined.unknown
                && base.objects.is_disjoint(&analysis.redefined.objects)
        };
        proven.own_stores.clear();
        proven.unwritable = analysis
            .bases
            .iter()
            .filter(|(_, (_, base))| !writable(base))
            .map(|(site, _)| site.clone())
            .collect();
        for (site, (key, base)) in &analysis.stores {
            if !base.unknown
                && !base.objects.is_empty()
                && writable(base)
                && !analysis.creating.contains(site)
                && base.objects.iter().all(|o| analysis.owns(*o, key))
            {
                proven.own_stores.insert(site.clone());
            }
        }
        // A property proved own is at a known inline slot when every object
        // the base can be was laid out by a constructor that assigns it at
        // the same position.
        let own: Vec<&String> = proven.own_loads.iter().chain(&proven.own_stores).collect();
        for site in own {
            let (key, base) = analysis.bases.get(site).or_else(|| analysis.stores.get(site)).unwrap();
            let mut positions = base.objects.iter().map(|o| match o {
                ObjectKind::Instance(id) => analysis.layout[*id].iter().position(|k| k == key),
                _ => None,
            });
            let first = positions.next().flatten();
            if let Some(slot) = first {
                if slot < INLINE_SLOT_LIMIT && positions.all(|p| p == Some(slot)) {
                    proven.slots.insert(site.clone(), slot);
                }
            }
        }
        if std::env::var_os("OBJECT_PROJECT_EXPLAIN_TYPES").is_some() {
            for site in proven.own_loads.iter().chain(&proven.own_stores) {
                if !proven.slots.contains_key(site) {
                    let (key, base) =
                        analysis.bases.get(site).or_else(|| analysis.stores.get(site)).unwrap();
                    let places: Vec<_> = base
                        .objects
                        .iter()
                        .map(|o| match o {
                            ObjectKind::Instance(id) => {
                                (*id, analysis.layout[*id].iter().position(|k| k == key))
                            }
                            _ => (usize::MAX, None),
                        })
                        .collect();
                    eprintln!("own .{key} without one slot: (constructor, position) {places:?}");
                }
            }
        }
        for (site, operands) in &analysis.operands {
            if operands.only_number() {
                proven.numeric.insert(site.clone());
            }
        }
        for (site, (key, receiver, caller)) in &analysis.method_sites {
            if let Some(target) = analysis.static_method(receiver, key, *caller) {
                proven
                    .static_methods
                    .insert(site.clone(), (target, receiver.prims != 0));
            }
        }
        // A summarized prelude function is analysed at its method-call
        // sites through the summary, so its own body has not seen those
        // receivers and arguments. Nothing is proved about code inside it.
        let summarized = |site: &String| {
            site.split(':')
                .next()
                .and_then(|id| id.parse::<usize>().ok())
                .is_some_and(|id| functions[id].ast[5].is_string())
        };
        proven.own_loads.retain(|site| !summarized(site));
        proven.own_stores.retain(|site| !summarized(site));
        proven.slots.retain(|site, _| !summarized(site));
        proven.numeric.retain(|site| !summarized(site));
        proven.numeric_keys.retain(|site| !summarized(site));
        proven.object_bases.retain(|site| !summarized(site));
        proven.object_named.retain(|site| !summarized(site));
        proven.static_methods.retain(|site, _| !summarized(site));
        for (object, _) in analysis.fields.keys() {
            if let ObjectKind::Prototype(id) = object {
                *proven.prototype_writes.entry(*id).or_default() += 1;
            }
        }
        let candidates = analysis
            .sites
            .into_iter()
            .filter_map(|(key, points)| {
                if points.unknown {
                    return None;
                }
                let ids: Vec<_> = points
                    .objects
                    .iter()
                    .filter_map(|kind| match kind {
                        ObjectKind::Function(id) => Some(*id),
                        _ => None,
                    })
                    .collect();
                if ids.is_empty() {
                    None
                } else {
                    Some((key, ids))
                }
            })
            .collect();
        Ok((candidates, proven))
    }
    fn array_site(&mut self, scope: &[Option<usize>], node: &Value) -> ObjectKind {
        let next = self.array_sites.len();
        ObjectKind::Array(*self.array_sites.entry(call_site_key(scope, node)).or_insert(next))
    }
    /// The single function a method call can reach, when that is proved.
    ///
    /// Every receiver object must be an instance of a module-level constructor
    /// `C` such that: no instance can own `key`; `C.prototype` is never
    /// assigned, so each instance inherits from C's original prototype; and
    /// that prototype's `key` is written by exactly one statement in the whole
    /// program, a top-level `C.prototype.key = f` that runs during source
    /// initialization. The caller must run only after initialization. Then
    /// lookup on any such receiver finds exactly `f`, whose environment is
    /// the module frame because it is created at module level.
    fn static_method(&self, receiver: &Points, key: &str, caller: usize) -> Option<usize> {
        let (early, _) = self.module_initialized.as_ref()?;
        let wildcard = (ObjectKind::Record, "**unknown-base**".to_owned());
        if receiver.unknown
            || receiver.objects.is_empty()
            // A primitive receiver that has properties finds its method on a
            // root prototype, not on the instances' prototype.
            || receiver.prims & (STRING | NUMBER | BOOLEAN) != 0
            || self.runs_early(caller, early)
            || self.fields.contains_key(&wildcard)
        {
            return None;
        }
        let untouched = |object: ObjectKind, key: &str| {
            !self.fields.contains_key(&(object, key.to_owned()))
                && !self.fields.contains_key(&(object, "*".to_owned()))
        };
        let mut target = None;
        for object in &receiver.objects {
            let ObjectKind::Instance(class) = *object else {
                return None;
            };
            let prototype = ObjectKind::Prototype(class);
            let cell = (prototype, key.to_owned());
            if !self.functions[0].declarations.contains(&class)
                || !untouched(*object, key)
                || !untouched(ObjectKind::Function(class), "prototype")
                || self.fields.contains_key(&(prototype, "*".to_owned()))
                || self.other_writes.contains(&cell)
                || self.init_writes.get(&cell).map(|sites| sites.len()) != Some(1)
            {
                return None;
            }
            let value = self.fields.get(&cell)?;
            if value.unknown || value.prims != 0 || value.objects.len() != 1 {
                return None;
            }
            let Some(ObjectKind::Function(function)) = value.objects.iter().next().copied() else {
                return None;
            };
            if self.functions[function].outer != [Some(0)] || target.is_some_and(|t| t != function) {
                return None;
            }
            target = Some(function);
        }
        target
    }
    fn owns(&self, object: ObjectKind, key: &str) -> bool {
        matches!(object, ObjectKind::Instance(id) if self.definite[id].contains(key))
    }
    /// The variable's value where it is read. Anything but a parameter starts
    /// out undefined, and this analysis does not order reads after writes.
    fn read_binding(&self, binding: Binding, reader: usize) -> Points {
        let value = self.bindings.get(&binding).cloned().unwrap_or_default();
        let (owner, block, slot) = binding;
        let parameter = block == 0 && slot < num(&self.functions[owner].ast[0]);
        let written_first = self.unassigned[owner]
            .as_ref()
            .is_some_and(|unassigned| !unassigned.contains(&(block, slot)));
        // A module variable with a top-level initializer, read by a function
        // that cannot run until initialization has finished.
        let module_ready = owner == 0
            && block == 0
            && self.module_initialized.as_ref().is_some_and(|(early, slots)| {
                slots.contains(&slot) && !self.runs_early(reader, early)
            });
        if parameter || written_first || module_ready {
            value
        } else {
            value.with(UNDEFINED)
        }
    }
    /// Whether `function` or a function enclosing it may run during source
    /// initialization. A nested function is only ever called through a call
    /// with an unknown target, which rules the whole fact out beforehand, but
    /// its parent is checked as well so the answer does not depend on that.
    fn runs_early(&self, function: usize, early: &std::collections::BTreeSet<usize>) -> bool {
        early.contains(&function)
            || self.functions[function]
                .outer
                .iter()
                .flatten()
                .any(|parent| *parent != 0 && early.contains(parent))
    }
    fn note_base(&mut self, scope: &[Option<usize>], node: &Value, key: &str, base: &Points) {
        let entry = self
            .bases
            .entry(call_site_key(scope, node))
            .or_insert_with(|| (key.to_owned(), Points::default()));
        entry.1.join(base);
    }
    fn note_index(&mut self, scope: &[Option<usize>], get: &Value, key: &Points, base: &Points) {
        self.index_keys.entry(call_site_key(scope, get)).or_default().join(key);
        self.index_bases.entry(call_site_key(scope, get)).or_default().join(base);
    }
    fn note_operands(&mut self, scope: &[Option<usize>], node: &Value, values: &[&Points]) {
        let entry = self.operands.entry(call_site_key(scope, node)).or_default();
        for value in values {
            entry.join(value);
        }
    }
    fn binding(scope: &[Option<usize>], depth: i64, slot: i64) -> Result<Binding> {
        let index = scope
            .len()
            .checked_sub(depth as usize + 1)
            .ok_or("points-to invalid lexical address")?;
        let owner_index = (0..=index)
            .rev()
            .find(|i| scope[*i].is_some())
            .ok_or("points-to missing frame owner")?;
        Ok((scope[owner_index].unwrap(), index - owner_index, slot))
    }
    fn declaration(&self, v: &Value, scope: &[Option<usize>]) -> Result<usize> {
        let depth = num(&v[1]) as usize;
        let owner = scope[scope
            .len()
            .checked_sub(depth + 1)
            .ok_or("points-to invalid declaration depth")?]
        .ok_or("points-to declaration in block frame")?;
        self.functions[owner]
            .declarations
            .get(num(&v[2]) as usize)
            .copied()
            .ok_or("points-to declaration index".into())
    }
    fn write_binding(&mut self, binding: Binding, value: &Points) {
        self.changed |= self.bindings.entry(binding).or_default().join(value);
    }
    fn write_field(&mut self, receiver: &Points, key: &str, value: &Points) {
        let strict = self.strict_write.take();
        for object in &receiver.objects {
            let cell = (*object, key.to_owned());
            match strict {
                Some(index) if receiver.objects.len() == 1 && !receiver.unknown => {
                    self.init_writes.entry(cell).or_default().insert(index);
                }
                _ => {
                    self.other_writes.insert(cell);
                }
            }
        }
        for object in &receiver.objects {
            self.changed |= self
                .fields
                .entry((*object, key.into()))
                .or_default()
                .join(value);
        }
        if receiver.unknown {
            // An unknown base may alias any registered guest object. Keep a
            // wildcard cell that every property lookup consults.
            self.changed |= self
                .fields
                .entry((ObjectKind::Record, "**unknown-base**".into()))
                .or_default()
                .join(value);
        }
    }
    fn property(&self, receiver: &Points, key: &str) -> Points {
        let mut visited = std::collections::BTreeSet::new();
        self.property_inner(receiver, key, &mut visited)
    }
    fn property_inner(
        &self,
        receiver: &Points,
        key: &str,
        visited: &mut std::collections::BTreeSet<ObjectKind>,
    ) -> Points {
        let mut result = Points {
            unknown: receiver.unknown,
            ..Default::default()
        };
        if let Some(value) = self
            .fields
            .get(&(ObjectKind::Record, "**unknown-base**".into()))
        {
            result.join(value);
        }
        // A string, number or boolean reads through its root prototype; a
        // string also has `length`. Null and undefined throw.
        for (kind, root) in [(STRING, 3), (NUMBER, 4), (BOOLEAN, 5)] {
            if receiver.prims & kind == 0 {
                continue;
            }
            if kind == STRING && (key == "length" || key == "*") {
                // `length`, or under an unknown key a one-unit string.
                result.prims |= NUMBER;
                if key == "*" {
                    result.prims |= STRING;
                }
                if key == "length" {
                    continue;
                }
            }
            result.prims |= UNDEFINED;
            let parent = Points::one(ObjectKind::Root(root));
            result.join(&self.property_inner(&parent, key, visited));
        }
        for object in &receiver.objects {
            if matches!(object, ObjectKind::Array(_)) && key == "length" {
                result.prims |= NUMBER;
                continue;
            }
            // A property that is not proved own may be missing everywhere.
            if !self.owns(*object, key) {
                result.prims |= UNDEFINED;
            }
            if !visited.insert(*object) {
                continue;
            }
            if self.owns(*object, key) {
                for cell in [key, "*"] {
                    if let Some(value) = self.fields.get(&(*object, cell.into())) {
                        result.join(value);
                    }
                }
                continue;
            }
            if key == "*" {
                for ((owner, _), value) in &self.fields {
                    if owner == object {
                        result.join(value);
                    }
                }
            } else {
                if let Some(value) = self.fields.get(&(*object, key.into())) {
                    result.join(value);
                }
            }
            if let Some(value) = self.fields.get(&(*object, "*".into())) {
                result.join(value);
            }
            match object {
                ObjectKind::Function(id) if key == "prototype" || key == "*" => {
                    result.join(&Points::one(ObjectKind::Prototype(*id)));
                }
                ObjectKind::Prototype(id) if key == "constructor" || key == "*" => {
                    result.join(&Points::one(ObjectKind::Function(*id)));
                }
                ObjectKind::Instance(id) => {
                    let mut proto = Points::one(ObjectKind::Prototype(*id));
                    if let Some(value) = self
                        .fields
                        .get(&(ObjectKind::Function(*id), "prototype".into()))
                    {
                        proto.join(value);
                    }
                    result.join(&self.property_inner(&proto, key, visited));
                }
                _ => {}
            }
            // A prototype given explicitly: an object created with one, or a
            // function whose own prototype was set.
            if let Some(proto) = self.protos.get(object).cloned() {
                result.join(&self.property_inner(&proto, key, visited));
            }
            // Every chain ends at the root prototypes, which the builtin
            // prelude populates. An instance reaches them through its
            // prototype objects, handled above.
            let root = match object {
                ObjectKind::Array(_) => Some(1),
                ObjectKind::Function(_) => Some(2),
                ObjectKind::Prototype(_)
                | ObjectKind::Record
                | ObjectKind::Derived(_)
                | ObjectKind::Root(1..=5) => Some(0),
                _ => None,
            };
            if let Some(root) = root {
                let parent = Points::one(ObjectKind::Root(root));
                result.join(&self.property_inner(&parent, key, visited));
            }
        }
        result
    }
    fn call(
        &mut self,
        target: &Points,
        receiver: &Points,
        args: &[Points],
        is_new: bool,
    ) -> Points {
        let mut result = Points {
            unknown: target.unknown,
            ..Default::default()
        };
        let targets: Vec<_> = if target.unknown {
            (1..self.functions.len()).collect()
        } else {
            target
                .objects
                .iter()
                .filter_map(|o| {
                    if let ObjectKind::Function(id) = o {
                        Some(*id)
                    } else {
                        None
                    }
                })
                .collect()
        };
        for id in targets {
            let this_value = if is_new {
                Points::one(ObjectKind::Instance(id))
            } else {
                receiver.clone()
            };
            self.changed |= self.receivers[id].join(&this_value);
            for value in args {
                self.changed |= self.all_arguments[id].join(value);
            }
            let parameters = num(&self.functions[id].ast[0]) as usize;
            for slot in 0..parameters {
                let missing = Points::prim(UNDEFINED);
                self.write_binding((id, 0, slot as i64), args.get(slot).unwrap_or(&missing));
            }
            // Its `arguments` array holds every value it is called with.
            let arguments_slot = num(&self.functions[id].ast[4]);
            if arguments_slot >= 0 {
                let next = self.array_sites.len();
                let list = Points::one(ObjectKind::Array(
                    *self.array_sites.entry(format!("{id}:arguments")).or_insert(next),
                ));
                for value in args {
                    self.write_field(&list, "*", value);
                }
                if target.unknown {
                    let anything = Points { unknown: true, ..Default::default() };
                    self.write_field(&list, "*", &anything);
                }
                self.write_binding((id, 0, arguments_slot), &list);
            }
            if is_new {
                // A constructor's primitive result is replaced by the instance.
                let mut returned = self.returns[id].clone();
                returned.prims = 0;
                result.join(&returned);
                result.join(&this_value);
            } else {
                result.join(&self.returns[id]);
            }
        }
        result
    }
    fn args(
        &mut self,
        values: &Value,
        scope: &[Option<usize>],
        owner: usize,
    ) -> Result<Vec<Points>> {
        array(values)
            .iter()
            .map(|v| self.expression(v, scope, owner))
            .collect()
    }
    fn receiver(&self, owner: usize) -> Points {
        if !self.functions[owner].is_arrow {
            return self.receivers[owner].clone();
        }
        if let Some(parent) = self.functions[owner].outer.iter().rev().find_map(|id| *id) {
            self.receiver(parent)
        } else {
            Points::unknown()
        }
    }
    fn expression(&mut self, v: &Value, scope: &[Option<usize>], owner: usize) -> Result<Points> {
        let result = match tag(v) {
            "lit" => Points::prim(match &v[1] {
                Value::Number(_) => NUMBER,
                Value::Bool(_) => BOOLEAN,
                Value::Null => NULL,
                _ => STRING,
            }),
            "undefined" | "hole" => Points::prim(UNDEFINED),
            "mathconst" => Points::prim(NUMBER),
            "var" => self.read_binding(Self::binding(scope, num(&v[1]), num(&v[2]))?, owner),
            "decl" => Points::one(ObjectKind::Function(self.declaration(v, scope)?)),
            "funid" => Points::one(ObjectKind::Function(num(&v[1]) as usize)),
            "this" => self.receiver(owner),
            "get" => {
                let receiver = self.expression(&v[1], scope, owner)?;
                let key = if tag(&v[2]) == "lit" && v[2][1].is_string() {
                    v[2][1].as_str().unwrap()
                } else {
                    let index = self.expression(&v[2], scope, owner)?;
                    self.note_index(scope, v, &index, &receiver);
                    "*"
                };
                if key != "*" {
                    self.note_base(scope, v, key, &receiver);
                }
                self.property(&receiver, key)
            }
            "assign" => {
                // Evaluate base/key before the right-hand expression. The
                // monotone solution merges effects without reordering runtime.
                let target = &v[2];
                // Only this outermost plain property assignment may be the
                // top-level statement's write; nested writes never are.
                let strict = self.strict_write.take().filter(|_| {
                    v[1] == "=" && tag(target) == "get" && tag(&target[2]) == "lit"
                });
                let property = if tag(target) == "get" {
                    let receiver = self.expression(&target[1], scope, owner)?;
                    let key = if tag(&target[2]) == "lit" && target[2][1].is_string() {
                        target[2][1].as_str().unwrap().to_owned()
                    } else {
                        let index = self.expression(&target[2], scope, owner)?;
                        self.note_index(scope, target, &index, &receiver);
                        "*".into()
                    };
                    Some((receiver, key))
                } else {
                    None
                };
                let value = self.expression(&v[3], scope, owner)?;
                let value = if v[1] == "=" {
                    if let Some((receiver, key)) = &property {
                        if key != "*" {
                            let entry = self
                                .stores
                                .entry(call_site_key(scope, v))
                                .or_insert_with(|| (key.clone(), Points::default()));
                            entry.1.join(receiver);
                        }
                    }
                    value
                } else {
                    // A compound assignment reads the target, then applies
                    // the operator to the old value and the right-hand side.
                    let old = match &property {
                        Some((receiver, key)) => {
                            if key != "*" {
                                self.note_base(scope, v, key, receiver);
                            }
                            self.property(receiver, key)
                        }
                        None => self.read_binding(
                            Self::binding(scope, num(&target[1]), num(&target[2]))?,
                            owner,
                        ),
                    };
                    self.note_operands(scope, v, &[&old, &value]);
                    if matches!(v[1].as_str(), Some("&&" | "||" | "??")) {
                        // A logical assignment keeps the old value or takes the new.
                        let mut either = old.clone();
                        either.join(&value);
                        either
                    } else {
                        binary_result(v[1].as_str().unwrap(), &old, &value)
                    }
                };
                if let Some((receiver, key)) = property {
                    self.strict_write = strict;
                    self.write_field(&receiver, &key, &value);
                } else {
                    self.write_binding(
                        Self::binding(scope, num(&target[1]), num(&target[2]))?,
                        &value,
                    );
                }
                value
            }
            "update" => {
                // Reads the target, converts it to a number and writes back.
                let target = &v[2];
                let number = Points::prim(NUMBER);
                let old = if tag(target) == "get" {
                    let receiver = self.expression(&target[1], scope, owner)?;
                    let key = if tag(&target[2]) == "lit" && target[2][1].is_string() {
                        target[2][1].as_str().unwrap().to_owned()
                    } else {
                        let index = self.expression(&target[2], scope, owner)?;
                        self.note_index(scope, target, &index, &receiver);
                        "*".into()
                    };
                    if key != "*" {
                        self.note_base(scope, v, &key, &receiver);
                    }
                    let old = self.property(&receiver, &key);
                    self.write_field(&receiver, &key, &number);
                    old
                } else if tag(target) == "var" {
                    let binding = Self::binding(scope, num(&target[1]), num(&target[2]))?;
                    let old = self.read_binding(binding, owner);
                    self.write_binding(binding, &number);
                    old
                } else {
                    // Any other target is evaluated and its update discarded.
                    self.expression(target, scope, owner)?
                };
                self.note_operands(scope, v, &[&old]);
                number
            }
            "bin" => {
                let mut left = self.expression(&v[2], scope, owner)?;
                let right = self.expression(&v[3], scope, owner)?;
                if v[1] == "&&" || v[1] == "||" || v[1] == "??" {
                    left.join(&right);
                    left
                } else {
                    self.note_operands(scope, v, &[&left, &right]);
                    binary_result(v[1].as_str().unwrap(), &left, &right)
                }
            }
            "unary" => {
                let operand = self.expression(&v[2], scope, owner)?;
                self.note_operands(scope, v, &[&operand]);
                Points::prim(match v[1].as_str().unwrap() {
                    "!" => BOOLEAN,
                    "void" => UNDEFINED,
                    _ => NUMBER,
                })
            }
            "cond" => {
                self.expression(&v[1], scope, owner)?;
                let mut yes = self.expression(&v[2], scope, owner)?;
                yes.join(&self.expression(&v[3], scope, owner)?);
                yes
            }
            "call" | "new" => {
                let target = self.expression(&v[1], scope, owner)?;
                let args = self.args(&v[2], scope, owner)?;
                self.sites
                    .entry(call_site_key(scope, v))
                    .or_default()
                    .join(&target);
                // A bare call runs with an undefined receiver.
                self.call(&target, &Points::prim(UNDEFINED), &args, tag(v) == "new")
            }
            "methodcall" => {
                let receiver = self.expression(&v[1], scope, owner)?;
                let key = v[2].as_str().unwrap();
                let target = self.property(&receiver, key);
                let args = self.args(&v[3], scope, owner)?;
                self.method_sites
                    .entry(call_site_key(scope, v))
                    .or_insert_with(|| (key.to_owned(), Points::default(), owner))
                    .1
                    .join(&receiver);
                self.sites
                    .entry(call_site_key(scope, v))
                    .or_default()
                    .join(&target);
                // Each receiver object reaches only the functions its own
                // lookup yields. A string, number or boolean receiver looks
                // up through its root prototype and is itself the receiver;
                // null and undefined make the lookup throw.
                let mut result = Points::default();
                for kind in [STRING, NUMBER, BOOLEAN] {
                    if receiver.prims & kind != 0 {
                        let one = Points::prim(kind);
                        let target = self.property(&one, key);
                        result.join(&self.call(&target, &one, &args, false));
                    }
                }
                for object in &receiver.objects {
                    let one = Points::one(*object);
                    let mut target = self.property(&one, key);
                    // A prelude function with a summary is applied at this
                    // site with this site's receiver and arguments, instead
                    // of merging every caller in its one body.
                    for function in target.objects.clone() {
                        let ObjectKind::Function(id) = function else { continue };
                        let Some(summary) = self.functions[id].ast[5].as_str() else { continue };
                        target.objects.remove(&function);
                        match summary {
                            "push" => {
                                for value in &args {
                                    self.write_field(&one, "*", value);
                                }
                                result.prims |= NUMBER;
                            }
                            "pop" => {
                                result.join(&self.property(&one, "*"));
                                result.prims |= UNDEFINED;
                            }
                            // Defines `key` on the target with the
                            // descriptor's `value`, or with undefined. A key
                            // that is not a literal could be any name.
                            "defineProperty" => {
                                let missing = Points::prim(UNDEFINED);
                                let target = args.first().unwrap_or(&missing).clone();
                                let descriptor = args.get(2).unwrap_or(&missing);
                                let mut value = self.property(descriptor, "value");
                                value.prims |= UNDEFINED;
                                let literal = array(&v[3]).get(1).filter(|key| {
                                    tag(key) == "lit" && key[1].is_string()
                                });
                                let name = literal.map_or("*", |key| key[1].as_str().unwrap());
                                self.write_field(&target, name, &value);
                                self.changed |= self.redefined.join(&target);
                                result.join(&target);
                            }
                            "call" => {
                                let this_value = args.first().cloned().unwrap_or(Points::prim(UNDEFINED));
                                let rest = args.get(1..).unwrap_or(&[]).to_vec();
                                result.join(&self.call(&one, &this_value, &rest, false));
                            }
                            other => return Err(format!("points-to unknown prelude summary {other}")),
                        }
                    }
                    result.join(&self.call(&target, &one, &args, false));
                }
                if receiver.unknown {
                    let unknown = Points::unknown();
                    result.join(&self.call(&unknown, &unknown, &args, false));
                }
                result
            }
            "array" => {
                let values = self.args(&v[1], scope, owner)?;
                let receiver = Points::one(self.array_site(scope, v));
                for value in values {
                    self.write_field(&receiver, "*", &value);
                }
                receiver
            }
            "arraylength" => {
                self.expression(&v[1], scope, owner)?;
                Points::one(self.array_site(scope, v))
            }
            "rootproto" => Points::one(ObjectKind::Root(num(&v[1]) as u8)),
            "isarray" => {
                self.expression(&v[1], scope, owner)?;
                Points::prim(BOOLEAN)
            }
            "strop" | "mathop" => {
                for operand in &array(v)[2..] {
                    self.expression(operand, scope, owner)?;
                }
                // fromCharCode and substring produce strings, the rest numbers.
                Points::prim(if tag(v) == "strop" && matches!(num(&v[1]), 2 | 3) {
                    STRING
                } else {
                    NUMBER
                })
            }
            "typeof" => {
                self.expression(&v[1], scope, owner)?;
                Points::prim(STRING)
            }
            "instanceof" | "in" => {
                self.expression(&v[1], scope, owner)?;
                self.expression(&v[2], scope, owner)?;
                Points::prim(BOOLEAN)
            }
            "has" => {
                self.expression(&v[1], scope, owner)?;
                self.expression(&v[2], scope, owner)?;
                Points::prim(BOOLEAN)
            }
            "define" => {
                let target = self.expression(&v[1], scope, owner)?;
                self.expression(&v[2], scope, owner)?;
                let value = self.expression(&v[3], scope, owner)?;
                self.expression(&v[4], scope, owner)?;
                // The named property, or with a computed name any property,
                // may be created or changed, and may stop being writable.
                let name = if tag(&v[2]) == "lit" && v[2][1].is_string() {
                    v[2][1].as_str().unwrap()
                } else {
                    "*"
                };
                let mut defined = Points::prim(UNDEFINED);
                defined.join(&value);
                self.write_field(&target, name, &defined);
                self.changed |= self.redefined.join(&target);
                target
            }
            "argcount" => Points::prim(NUMBER),
            "argument" => {
                self.expression(&v[1], scope, owner)?;
                let mut value = self.all_arguments[owner].clone();
                value.prims |= UNDEFINED;
                value
            }
            "callthis" => {
                let function = self.expression(&v[1], scope, owner)?;
                let receiver = self.expression(&v[2], scope, owner)?;
                let args = self.args(&v[3], scope, owner)?;
                self.call(&function, &receiver, &args, false)
            }
            // A fresh object with the given prototype.
            "create" => {
                let proto = self.expression(&v[1], scope, owner)?;
                let next = self.array_sites.len();
                let object = ObjectKind::Derived(
                    *self.array_sites.entry(call_site_key(scope, v)).or_insert(next),
                );
                self.changed |= self.protos.entry(object).or_default().join(&proto);
                Points::one(object)
            }
            "setproto" => {
                let target = self.expression(&v[1], scope, owner)?;
                let proto = self.expression(&v[2], scope, owner)?;
                for object in &target.objects {
                    self.changed |= self.protos.entry(*object).or_default().join(&proto);
                }
                Points::prim(UNDEFINED)
            }
            // An array of everything the function may be called with.
            "restargs" => {
                let next = self.array_sites.len();
                let list = Points::one(ObjectKind::Array(
                    *self.array_sites.entry(format!("{owner}:rest")).or_insert(next),
                ));
                let values = self.all_arguments[owner].clone();
                self.write_field(&list, "*", &values);
                list
            }
            "spreadarray" => {
                let receiver = Points::one(self.array_site(scope, v));
                for item in array(&v[1]) {
                    let value = match tag(item) {
                        "hole" => continue,
                        "spread" => {
                            // Elements of an array, or one-unit strings.
                            let source = self.expression(&item[1], scope, owner)?;
                            let mut elements = self.property(&source, "*");
                            if source.prims & STRING != 0 || source.unknown {
                                elements.prims |= STRING;
                            }
                            elements.prims |= UNDEFINED;
                            elements
                        }
                        _ => self.expression(item, scope, owner)?,
                    };
                    self.write_field(&receiver, "*", &value);
                }
                receiver
            }
            "spreadcall" => {
                let kind = num(&v[1]);
                let target = self.expression(&v[2], scope, owner)?;
                let list = self.expression(&v[4], scope, owner)?;
                // Any element may land in any parameter, or none may.
                let mut any = self.property(&list, "*");
                any.prims |= UNDEFINED;
                let widest = self.functions.iter().map(|f| num(&f.ast[0])).max().unwrap_or(0);
                let args = vec![any; widest as usize + 1];
                if kind == 3 {
                    let receiver = self.expression(&v[3], scope, owner)?;
                    self.call(&target, &receiver, &args, false)
                } else if kind == 2 {
                    let function = self.property(&target, v[3].as_str().unwrap());
                    self.call(&function, &target, &args, false)
                } else {
                    self.call(&target, &Points::prim(UNDEFINED), &args, kind == 1)
                }
            }
            "callrest" => {
                let function = self.expression(&v[1], scope, owner)?;
                let receiver = self.expression(&v[2], scope, owner)?;
                // Any of this activation's arguments may land in any parameter.
                let mut any = self.all_arguments[owner].clone();
                any.prims |= UNDEFINED;
                let widest = self.functions.iter().map(|f| num(&f.ast[0])).max().unwrap_or(0);
                let args = vec![any; widest as usize + 1];
                self.call(&function, &receiver, &args, false)
            }
            "object" => {
                let receiver = Points::one(ObjectKind::Record);
                for field in array(&v[1]) {
                    let value = self.expression(&field[1], scope, owner)?;
                    self.write_field(&receiver, field[0].as_str().unwrap(), &value);
                }
                receiver
            }
            "error" => {
                self.expression(&v[1], scope, owner)?;
                let receiver = Points::one(ObjectKind::Record);
                for key in ["name", "message"] {
                    self.write_field(&receiver, key, &Points::prim(STRING));
                }
                receiver
            }
            "seq" => {
                let mut last = Points::default();
                for value in array(&v[1]) {
                    last = self.expression(value, scope, owner)?;
                }
                last
            }
            "mathcall" => {
                self.args(&v[2], scope, owner)?;
                Points::prim(NUMBER)
            }
            other => return Err(format!("points-to unsupported expression {other}")),
        };
        Ok(result)
    }
    fn statement(&mut self, v: &Value, scope: &[Option<usize>], owner: usize) -> Result<()> {
        let mut nested = scope.to_vec();
        if (tag(v) == "block" && num(&v[2]) > 0) || (tag(v) == "for" && num(&v[5]) > 0) {
            nested.push(None);
        }
        let scope = &nested;
        let top = self.top_statement.take();
        self.strict_write = None;
        match tag(v) {
            "empty" | "break" | "continue" => {}
            "expr" => {
                // An expression statement directly at module top level.
                self.strict_write = top.filter(|_| tag(&v[1]) == "assign");
                self.expression(&v[1], scope, owner)?;
                self.strict_write = None;
            }
            "throw" => {
                let value = self.expression(&v[1], scope, owner)?;
                self.changed |= self.thrown.join(&value);
            }
            "try" => {
                // What a protected part "returns" in this analysis is what a
                // `return` statement inside it returns from this function.
                let nothing = Points::prim(UNDEFINED);
                let block = self.expression(&v[1], scope, owner)?;
                let mut returned = self.call(&block, &nothing, &[], false);
                if !v[2].is_null() {
                    // The handler receives anything the program throws, or
                    // an error object the runtime raised.
                    let handler = self.expression(&v[2], scope, owner)?;
                    let failure = Points::one(ObjectKind::Record);
                    for key in ["name", "message"] {
                        self.write_field(&failure, key, &Points::prim(STRING));
                    }
                    let mut caught = self.thrown.clone();
                    caught.join(&failure);
                    returned.join(&self.call(&handler, &nothing, &[caught], false));
                }
                if !v[3].is_null() {
                    self.statement(&v[3], scope, owner)?;
                }
                self.changed |= self.returns[owner].join(&returned);
            }
            "return" => {
                let value = self.expression(&v[1], scope, owner)?;
                self.changed |= self.returns[owner].join(&value);
            }
            "var" => {
                for d in array(&v[1]) {
                    if !d[2].is_null() {
                        let value = self.expression(&d[2], scope, owner)?;
                        self.write_binding(Self::binding(scope, num(&d[0]), num(&d[1]))?, &value);
                    }
                }
            }
            "if" => {
                self.expression(&v[1], scope, owner)?;
                self.statement(&v[2], scope, owner)?;
                self.statement(&v[3], scope, owner)?;
            }
            "while" | "dowhile" => {
                self.expression(&v[1], scope, owner)?;
                self.statement(&v[2], scope, owner)?;
            }
            "switch" => {
                self.expression(&v[1], scope, owner)?;
                for clause in &array(v)[2..] {
                    if tag(clause) == "case" {
                        self.expression(&clause[1], scope, owner)?;
                        self.statement(&clause[2], scope, owner)?;
                    } else {
                        self.statement(&clause[1], scope, owner)?;
                    }
                }
            }
            "for" => {
                self.statement(&v[3], scope, owner)?;
                self.expression(&v[1], scope, owner)?;
                self.statement(&v[2], scope, owner)?;
                self.expression(&v[4], scope, owner)?;
            }
            "block" => {
                for statement in array(&v[1]) {
                    self.statement(statement, scope, owner)?;
                }
            }
            other => return Err(format!("points-to unsupported statement {other}")),
        }
        Ok(())
    }
}

#[cfg(test)]
mod semantic_tests {
    use super::*;
    fn interpreter_harness(p: &Value) -> String {
        format!("function main(input) {{\nvar nodes={};var functions={};var lists={};var constants={};var keyCount={};\n{}\nfunction callGuestOneOf(code,parent,receiver,args,first,second,third,fourth){{return callGuest(code,parent,receiver,args);}}\nfunction callSpread(code,parent,receiver,list){{return callGuest(code,parent,receiver,arrValues(list));}}\nfunction frameArgCount(frame){{return frame.length;}}\nfunction frameArg(frame,i){{if(i<frame.length)return frame[i];return vUndef();}}\nfunction callRest(code,parent,receiver,frame,skip){{return callGuest(code,parent,receiver,frame.slice(skip));}}\nfunction callProtected(code,parent,receiver,args){{return protectedInvoke(function(){{return callGuest(code,parent,receiver,args);}});}}\nfunction callGuest(code,parent,receiver,args){{return invoke(functions[code],parent,args,receiver,args);}}\n{}return invoke(functions[{}],vNull(),[vNum(input)],vUndef(),[vNum(input)]);\n}}",p["nodes"],p["functions"],p["lists"],p["constants"],array(&p["keys"]).len(),include_str!("../docs/object-projection/interpreter.js"),atom_registration(p),p["entry"])
    }
    #[test]
    fn original_and_interpreted_semantic_fixtures_agree() {
        let sources = [
            ("prototype receiver", "function Box(x){this.x=x}Box.prototype.add=function(y){return this.x+y};function main(x){return new Box(x).add(2)}"),
            ("method lookup before arguments", "function main(x){var o={run:function(y){return 1}};return o.run(o.run=function(){return 9})}"),
            ("escaping closure", "function main(x){function make(y){return function(z){return y+z}}var f=make(x);return f(2)}"),
            ("declaration identity", "function main(x){function f(y){return x+y}var g=f;return [f===f,g===f,g(2)]}"),
            ("constructor returns", "function A(x){this.x=x;return 9}function B(x){this.x=x;return {x:2}}function main(x){return [new A(x).x,new B(x).x]}"),
            ("lexical capture", "function main(x){var f;{let y=x+1;f=function(){return y};x=f()}return x}"),
            ("arrow receiver", "function Box(x){this.x=x}Box.prototype.add=function(y){var f=()=>this.x+y;return f()};function main(x){return new Box(x).add(2)}"),
            ("per iteration closures", "function main(x){var f,g;for(let i=0;i<2;i++){if(i===0)f=()=>i;else g=()=>i}return [f(),g()]}"),
            ("initializer lexical closure", "function main(x){var out;for(let i=0,f=()=>i;i<1;i++){i=5;out=f()}return out}"),
            ("bare return", "function main(x){return;}"),
            ("array holes", "function main(x){var a=new Array(4);return [a[0]===undefined,a.length]}"),
            ("update evaluation once", "function main(x){var calls=0;function index(){calls++;return 0}var a=[x];var old=a[index()]++;return [old,a[0],calls]}"),
            ("prototype replacement", "function A(x){this.x=x}A.prototype.get=function(){return this.x};function main(x){var a=new A(x);A.prototype.get=function(){return 7};return a.get()}"),
            ("guest recursion", "function main(x){function f(n){if(n<2)return 1;return n*f(n-1)}return f(x)}"),
            ("flat lexical scopes", "function main(x){var sum=x;{let x=2;sum+=x}{let x=3;sum+=x}for(let i=0;i<2;i++){let j=i;sum+=j}return sum}"),
            ("flat outer declaration", "function shared(y){return y}function main(x){{let y=x;var f=shared;return shared(f(y))}}"),
        ];
        let runtime = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("docs/object-projection/intrinsics.js");
        let cases: Vec<_> = sources.iter().map(|(name,source)| {
            let program=encode(source).unwrap();
            json!({"name":name,"source":source,"harness":interpreter_harness(&program),"keys":program["keys"]})
        }).collect();
        let script = format!(
            r#"
const vm=require('node:vm'),assert=require('node:assert/strict'),api=require({runtime});
function original(v){{if(v===undefined)return ['undefined'];if(v===null)return ['null'];if(Array.isArray(v))return ['array',Array.from({{length:v.length}},(_,i)=>i in v?original(v[i]):['hole'])];return [typeof v,v];}}
function boxed(v){{if(v.tag===0)return ['undefined'];if(v.tag===1)return ['null'];if(v.tag===2)return ['boolean',v.payload];if(v.tag===3)return ['number',v.payload];if(v.tag===5)return ['string',v.payload];if(v.tag===4&&v.payload.kind===1){{let a=v.payload.elements;return ['array',Array.from({{length:a.length}},(_,i)=>Object.hasOwn(a,i)?boxed(a[i]):['hole'])];}}throw Error('unsupported test result');}}
let failures=[];
for(const t of {cases}){{for(const input of [1,3,5]){{try{{api.resetObjectRuntime();let a={{}},b={{...api}};vm.runInNewContext(t.source,a);vm.runInNewContext(t.harness,b);assert.deepEqual(boxed(b.main(input)),original(a.main(input)));}}catch(e){{failures.push(t.name+' input='+input+': '+e.stack);break;}}}}}}
if(failures.length){{console.error(failures.join('\n\n'));process.exit(1);}}
"#,
            runtime = serde_json::to_string(&runtime.to_string_lossy()).unwrap(),
            cases = serde_json::to_string(&cases).unwrap()
        );
        let output = std::process::Command::new("node")
            .args(["-e", &script])
            .output()
            .unwrap();
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
    }
}

#[cfg(test)]
mod layout_tests {
    use super::*;
    fn encoded(source: &str) -> Value {
        encode(source).unwrap()
    }
    /// (own flag, slot + 1) of every named load of `key`. A node that is
    /// only the target of an assignment or update is not a load.
    fn loads(program: &Value, key: &str) -> Vec<(i64, i64)> {
        let atom = array(&program["keys"]).iter().position(|k| k == key).unwrap() as i64;
        let nodes = array(&program["nodes"]);
        let targets: std::collections::BTreeSet<i64> = nodes
            .iter()
            .filter(|n| matches!(num(&n[0]), 9 | 10))
            .map(|n| num(&n[2]))
            .collect();
        nodes
            .iter()
            .enumerate()
            .filter(|(i, n)| {
                num(&n[0]) == 8 && num(&n[1]) == atom && !targets.contains(&(*i as i64))
            })
            .map(|(_, n)| (num(&n[4]), num(&n[5])))
            .collect()
    }
    /// (own-store flag, slot + 1) of every plain assignment whose target is
    /// a named property `key`.
    fn stores(program: &Value, key: &str) -> Vec<(i64, i64)> {
        let atom = array(&program["keys"]).iter().position(|k| k == key).unwrap() as i64;
        let nodes = array(&program["nodes"]);
        nodes
            .iter()
            .filter(|n| num(&n[0]) == 9 && num(&n[1]) == 0)
            .filter(|n| {
                let target = &nodes[num(&n[2]) as usize];
                num(&target[0]) == 8 && num(&target[1]) == atom
            })
            .map(|n| (num(&n[6]), num(&n[7])))
            .collect()
    }
    #[test]
    fn straight_line_constructor_fields_get_their_assignment_position() {
        let p = encoded("function P(a,b){this.x=a;this.y=b;} function main(n){var p=new P(n,2);p.y=p.y+1;return p.x+p.y;}");
        assert!(loads(&p, "x").iter().all(|l| *l == (1, 1)), "{:?}", loads(&p, "x"));
        assert!(loads(&p, "y").iter().all(|l| *l == (1, 2)), "{:?}", loads(&p, "y"));
        // The constructor's own stores create the properties; the later one
        // overwrites slot 1.
        assert_eq!(stores(&p, "y"), [(0, 0), (1, 2)]);
        assert_eq!(array(&p["functions"]).iter().map(|f| num(&f[8])).max(), Some(2));
    }
    #[test]
    fn a_conditional_field_has_a_slot_only_when_both_branches_agree() {
        let same = encoded("function P(a){this.x=a;if(a){this.s=1;}else{this.s=2;}this.z=3;} function main(n){var p=new P(n);return p.s+p.z;}");
        assert_eq!(loads(&same, "s"), [(1, 2)]);
        assert_eq!(loads(&same, "z"), [(1, 3)]);
        // Different orders: both are definitely present, neither has one slot.
        let differ = encoded("function P(a){if(a){this.s=1;this.t=2;}else{this.t=2;this.s=1;}} function main(n){var p=new P(n);return p.s+p.t;}");
        assert_eq!(loads(&differ, "s"), [(1, 0)]);
        assert_eq!(loads(&differ, "t"), [(1, 0)]);
        // A store inside the branch creates the property and is never "own".
        assert!(stores(&same, "s").iter().all(|s| *s == (0, 0)));
    }
    #[test]
    fn two_constructors_share_a_slot_proof_only_at_the_same_position() {
        let agree = encoded("function A(v){this.k=v;this.a=1;} function B(v){this.k=v;this.b=2;} function main(n){var o=n?new A(n):new B(n);return o.k;}");
        assert_eq!(loads(&agree, "k"), [(1, 1)]);
        let apart = encoded("function A(v){this.k=v;this.a=1;} function B(v){this.b=2;this.k=v;} function main(n){var o=n?new A(n):new B(n);return o.k;}");
        assert_eq!(loads(&apart, "k"), [(1, 0)]);
    }
    #[test]
    fn a_store_that_may_add_a_property_is_not_proved_own() {
        // `extra` is not assigned by the constructor, so the store adds it.
        let p = encoded("function P(a){this.x=a;} function main(n){var p=new P(n);p.extra=1;p.x=2;return p.extra+p.x;}");
        assert_eq!(stores(&p, "extra"), [(0, 0)]);
        assert_eq!(stores(&p, "x"), [(0, 0), (1, 1)]);
        assert_eq!(loads(&p, "extra"), [(0, 0)]);
    }
}
