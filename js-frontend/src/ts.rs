//! TypeScript input.
//!
//! A TypeScript program is parsed with its types, then the TypeScript-only
//! syntax is erased in place so the JavaScript lowering sees plain
//! JavaScript: `e as T`, `e!`, `<T>e`, `e satisfies T` are `e`; interfaces,
//! type aliases, `declare`d bindings, overload signatures and `this`
//! parameters go; a parameter property (`constructor(private x)`) is a
//! parameter assigned to `this.x` at the start of the constructor; an enum is
//! the object TypeScript makes for it.
//!
//! Type annotations stay on the bindings they annotate (the lowering ignores
//! them otherwise): `type_mask` is what one says about a value, which the
//! lowering turns into a fact the specializer may use (see
//! `Stmt::AssumeType`). That assumes the program type-checks with
//! `strictNullChecks` (a `number` is never `null`).

use swc_common::{Span, SyntaxContext, DUMMY_SP};
use swc_ecma_ast as ast;
use swc_ecma_visit::{VisitMut, VisitMutWith};

use partial::facts::{T_ALL, T_BIGINT, T_BOOL, T_FUNC, T_NULL, T_NUM, T_OBJ, T_STR, T_SYM, T_UNDEF};

/// Erase the TypeScript-only syntax of `module` (see the module comment).
pub fn erase(module: &mut ast::Module) -> Result<(), String> {
    let mut e = Eraser { errors: Vec::new() };
    module.visit_mut_with(&mut e);
    match e.errors.into_iter().next() {
        Some(err) => Err(err),
        None => Ok(()),
    }
}

struct Eraser {
    errors: Vec<String>,
}

fn ident(name: &str) -> ast::Ident {
    ast::Ident::new(name.into(), DUMMY_SP, SyntaxContext::empty())
}

/// The statement an erased declaration leaves: none, or (an enum) its object.
fn erase_decl(d: &ast::Decl, errors: &mut Vec<String>) -> Option<Option<ast::Stmt>> {
    match d {
        ast::Decl::TsInterface(_) | ast::Decl::TsTypeAlias(_) => Some(None),
        ast::Decl::Var(v) if v.declare => Some(None),
        ast::Decl::Fn(f) if f.declare || f.function.body.is_none() => Some(None),
        ast::Decl::Class(c) if c.declare => Some(None),
        ast::Decl::TsModule(m) => {
            if !m.declare {
                errors.push("TypeScript namespaces are not supported".into());
            }
            Some(None)
        }
        ast::Decl::TsEnum(e) => {
            if e.declare {
                return Some(None);
            }
            match enum_object(e) {
                Ok(s) => Some(Some(s)),
                Err(err) => {
                    errors.push(err);
                    Some(None)
                }
            }
        }
        _ => None,
    }
}

/// `var E = {A: 0, 0: "A", ...}`: the object TypeScript builds for an enum
/// (a numeric member also maps its value back to its name).
fn enum_object(e: &ast::TsEnumDecl) -> Result<ast::Stmt, String> {
    #[derive(Clone)]
    enum V {
        Num(f64),
        Str(String),
    }
    let mut props: Vec<ast::PropOrSpread> = Vec::new();
    let mut known: Vec<(String, V)> = Vec::new();
    let mut next: Option<f64> = Some(0.0);
    let key = |s: &str| ast::PropName::Str(ast::Str { span: DUMMY_SP, value: s.into(), raw: None });
    let kv = |k: ast::PropName, v: ast::Expr| ast::PropOrSpread::Prop(Box::new(ast::Prop::KeyValue(ast::KeyValueProp { key: k, value: Box::new(v) })));
    let num = |n: f64| ast::Expr::Lit(ast::Lit::Num(ast::Number { span: DUMMY_SP, value: n, raw: None }));
    let string = |s: &str| ast::Expr::Lit(ast::Lit::Str(ast::Str { span: DUMMY_SP, value: s.into(), raw: None }));
    for m in &e.members {
        let name = match &m.id {
            ast::TsEnumMemberId::Ident(i) => i.sym.to_string(),
            ast::TsEnumMemberId::Str(s) => s.value.to_string_lossy().into_owned(),
        };
        let v = match &m.init {
            None => V::Num(next.ok_or_else(|| format!("enum member `{name}` needs an initializer"))?),
            Some(init) => {
                // TypeScript's constant enum expressions: literals, earlier
                // members (`A`, `E.A`, `E["A"]`), unary `+ - ~`, binary
                // arithmetic and bitwise operators (on numbers, as JS
                // computes them), `+` of strings, parentheses.
                fn eval(x: &ast::Expr, known: &[(String, V)], enum_name: &str) -> Option<V> {
                    use partial::jsnum::JsNum;
                    let int32 = |n: f64| JsNum::new(n).to_int32();
                    let uint32 = |n: f64| JsNum::new(n).to_uint32();
                    let member = |k: &str| known.iter().find(|(m, _)| m == k).map(|(_, v)| v.clone());
                    match x {
                        ast::Expr::Lit(ast::Lit::Num(n)) => Some(V::Num(n.value)),
                        ast::Expr::Lit(ast::Lit::Str(s)) => Some(V::Str(s.value.to_string_lossy().into_owned())),
                        ast::Expr::Tpl(t) if t.exprs.is_empty() => t.quasis[0].cooked.as_ref().map(|c| V::Str(c.to_string_lossy().into_owned())),
                        ast::Expr::Paren(p) => eval(&p.expr, known, enum_name),
                        ast::Expr::Ident(i) => member(&i.sym),
                        ast::Expr::Member(m) if matches!(&*m.obj, ast::Expr::Ident(o) if &*o.sym == enum_name) => match &m.prop {
                            ast::MemberProp::Ident(p) => member(&p.sym),
                            ast::MemberProp::Computed(c) => match &*c.expr {
                                ast::Expr::Lit(ast::Lit::Str(s)) => member(&s.value.to_string_lossy()),
                                _ => None,
                            },
                            ast::MemberProp::PrivateName(_) => None,
                        },
                        ast::Expr::Unary(u) => match (u.op, eval(&u.arg, known, enum_name)?) {
                            (ast::UnaryOp::Minus, V::Num(n)) => Some(V::Num(-n)),
                            (ast::UnaryOp::Plus, V::Num(n)) => Some(V::Num(n)),
                            (ast::UnaryOp::Tilde, V::Num(n)) => Some(V::Num(!int32(n) as f64)),
                            _ => None,
                        },
                        ast::Expr::Bin(b) => {
                            let l = eval(&b.left, known, enum_name)?;
                            let r = eval(&b.right, known, enum_name)?;
                            use ast::BinaryOp::*;
                            match (l, r) {
                                (V::Num(a), V::Num(c)) => Some(V::Num(match b.op {
                                    Add => a + c,
                                    Sub => a - c,
                                    Mul => a * c,
                                    Div => a / c,
                                    // (`%` is IEEE fmod in both.)
                                    Mod => a % c,
                                    // (JS `**`: a NaN exponent, or ±1 to ±Infinity, is NaN.)
                                    Exp => {
                                        if c.is_nan() || (a.abs() == 1.0 && c.is_infinite()) {
                                            f64::NAN
                                        } else {
                                            a.powf(c)
                                        }
                                    }
                                    LShift => int32(a).wrapping_shl(uint32(c) & 31) as f64,
                                    RShift => (int32(a) >> (uint32(c) & 31)) as f64,
                                    ZeroFillRShift => (uint32(a) >> (uint32(c) & 31)) as f64,
                                    BitAnd => (int32(a) & int32(c)) as f64,
                                    BitOr => (int32(a) | int32(c)) as f64,
                                    BitXor => (int32(a) ^ int32(c)) as f64,
                                    _ => return None,
                                })),
                                (V::Str(a), V::Str(c)) if b.op == Add => Some(V::Str(format!("{a}{c}"))),
                                (V::Str(a), V::Num(c)) if b.op == Add => Some(V::Str(format!("{a}{}", JsNum::new(c).to_js_string()))),
                                (V::Num(a), V::Str(c)) if b.op == Add => Some(V::Str(format!("{}{c}", JsNum::new(a).to_js_string()))),
                                _ => None,
                            }
                        }
                        _ => None,
                    }
                }
                eval(init, &known, &e.id.sym).ok_or_else(|| format!("enum member `{name}`: only constant initializers are supported"))?
            }
        };
        match v {
            V::Num(n) => {
                props.push(kv(key(&name), num(n)));
                let rev = partial::jsnum::JsNum::new(n).to_js_string();
                props.push(kv(key(&rev), string(&name)));
                known.push((name, V::Num(n)));
                next = Some(n + 1.0);
            }
            V::Str(s) => {
                props.push(kv(key(&name), string(&s)));
                known.push((name, V::Str(s)));
                next = None;
            }
        }
    }
    let decl = ast::VarDeclarator {
        span: DUMMY_SP,
        name: ast::Pat::Ident(ast::BindingIdent { id: e.id.clone(), type_ann: None }),
        init: Some(Box::new(ast::Expr::Object(ast::ObjectLit { span: DUMMY_SP, props }))),
        definite: false,
    };
    Ok(ast::Stmt::Decl(ast::Decl::Var(Box::new(ast::VarDecl {
        span: DUMMY_SP,
        ctxt: SyntaxContext::empty(),
        kind: ast::VarDeclKind::Var,
        declare: false,
        decls: vec![decl],
    }))))
}

impl VisitMut for Eraser {
    fn visit_mut_expr(&mut self, e: &mut ast::Expr) {
        loop {
            let inner = match e {
                ast::Expr::TsAs(x) => (*x.expr).clone(),
                ast::Expr::TsNonNull(x) => (*x.expr).clone(),
                ast::Expr::TsTypeAssertion(x) => (*x.expr).clone(),
                ast::Expr::TsConstAssertion(x) => (*x.expr).clone(),
                ast::Expr::TsSatisfies(x) => (*x.expr).clone(),
                ast::Expr::TsInstantiation(x) => (*x.expr).clone(),
                _ => break,
            };
            *e = inner;
        }
        e.visit_mut_children_with(self);
    }

    fn visit_mut_simple_assign_target(&mut self, t: &mut ast::SimpleAssignTarget) {
        loop {
            let inner = match t {
                ast::SimpleAssignTarget::TsAs(x) => (*x.expr).clone(),
                ast::SimpleAssignTarget::TsNonNull(x) => (*x.expr).clone(),
                ast::SimpleAssignTarget::TsTypeAssertion(x) => (*x.expr).clone(),
                ast::SimpleAssignTarget::TsSatisfies(x) => (*x.expr).clone(),
                ast::SimpleAssignTarget::TsInstantiation(x) => (*x.expr).clone(),
                _ => break,
            };
            *t = match inner {
                ast::Expr::Ident(i) => ast::SimpleAssignTarget::Ident(ast::BindingIdent { id: i, type_ann: None }),
                ast::Expr::Member(m) => ast::SimpleAssignTarget::Member(m),
                ast::Expr::Paren(p) => ast::SimpleAssignTarget::Paren(p),
                ast::Expr::SuperProp(s) => ast::SimpleAssignTarget::SuperProp(s),
                ast::Expr::OptChain(o) => ast::SimpleAssignTarget::OptChain(o),
                ast::Expr::TsAs(x) => ast::SimpleAssignTarget::TsAs(x),
                ast::Expr::TsNonNull(x) => ast::SimpleAssignTarget::TsNonNull(x),
                ast::Expr::TsTypeAssertion(x) => ast::SimpleAssignTarget::TsTypeAssertion(x),
                ast::Expr::TsSatisfies(x) => ast::SimpleAssignTarget::TsSatisfies(x),
                ast::Expr::TsInstantiation(x) => ast::SimpleAssignTarget::TsInstantiation(x),
                _ => {
                    self.errors.push("an assignment to a type assertion of this expression is not supported".into());
                    return;
                }
            };
        }
        t.visit_mut_children_with(self);
    }

    fn visit_mut_module_items(&mut self, items: &mut Vec<ast::ModuleItem>) {
        let mut out = Vec::with_capacity(items.len());
        for mut item in std::mem::take(items) {
            if let ast::ModuleItem::Stmt(ast::Stmt::Decl(d)) = &item {
                if let Some(rest) = erase_decl(d, &mut self.errors) {
                    if let Some(s) = rest {
                        out.push(ast::ModuleItem::Stmt(s));
                    }
                    continue;
                }
            }
            item.visit_mut_with(self);
            out.push(item);
        }
        *items = out;
    }

    fn visit_mut_stmts(&mut self, stmts: &mut Vec<ast::Stmt>) {
        let mut out = Vec::with_capacity(stmts.len());
        for mut s in std::mem::take(stmts) {
            if let ast::Stmt::Decl(d) = &s {
                if let Some(rest) = erase_decl(d, &mut self.errors) {
                    if let Some(s) = rest {
                        out.push(s);
                    }
                    continue;
                }
            }
            s.visit_mut_with(self);
            out.push(s);
        }
        *stmts = out;
    }

    fn visit_mut_function(&mut self, f: &mut ast::Function) {
        // (A `this` parameter only types `this`.)
        if let Some(ast::Pat::Ident(b)) = f.params.first().map(|p| &p.pat) {
            if &*b.id.sym == "this" {
                f.params.remove(0);
            }
        }
        f.visit_mut_children_with(self);
    }

    fn visit_mut_class_members(&mut self, members: &mut Vec<ast::ClassMember>) {
        members.retain(|m| match m {
            ast::ClassMember::TsIndexSignature(_) => false,
            ast::ClassMember::Method(x) => x.function.body.is_some(),
            ast::ClassMember::PrivateMethod(x) => x.function.body.is_some(),
            ast::ClassMember::Constructor(c) => c.body.is_some(),
            ast::ClassMember::ClassProp(p) => !p.declare && !p.is_abstract,
            _ => true,
        });
        members.visit_mut_children_with(self);
    }

    fn visit_mut_class(&mut self, c: &mut ast::Class) {
        let derived = c.super_class.is_some();
        for m in c.body.iter_mut() {
            if let ast::ClassMember::Constructor(ctor) = m {
                self.erase_param_props(ctor, derived);
            }
        }
        c.visit_mut_children_with(self);
    }
}

impl Eraser {
    /// `constructor(private x: T)`: a parameter `x`, and `this.x = x` at the
    /// start of the body (after the `super(...)` call of a derived class).
    fn erase_param_props(&mut self, ctor: &mut ast::Constructor, derived: bool) {
        let mut assigns: Vec<ast::Stmt> = Vec::new();
        for p in ctor.params.iter_mut() {
            let ast::ParamOrTsParamProp::TsParamProp(pp) = p else { continue };
            let (pat, name) = match &pp.param {
                ast::TsParamPropParam::Ident(b) => (ast::Pat::Ident(b.clone()), b.id.sym.to_string()),
                ast::TsParamPropParam::Assign(a) => match &*a.left {
                    ast::Pat::Ident(b) => (ast::Pat::Assign(a.clone()), b.id.sym.to_string()),
                    _ => {
                        self.errors.push("a destructuring parameter property is not supported".into());
                        continue;
                    }
                },
            };
            let this_x = ast::MemberExpr {
                span: DUMMY_SP,
                obj: Box::new(ast::Expr::This(ast::ThisExpr { span: DUMMY_SP })),
                prop: ast::MemberProp::Ident(ast::IdentName::new(name.clone().into(), DUMMY_SP)),
            };
            assigns.push(ast::Stmt::Expr(ast::ExprStmt {
                span: DUMMY_SP,
                expr: Box::new(ast::Expr::Assign(ast::AssignExpr {
                    span: DUMMY_SP,
                    op: ast::AssignOp::Assign,
                    left: ast::AssignTarget::Simple(ast::SimpleAssignTarget::Member(this_x)),
                    right: Box::new(ast::Expr::Ident(ident(&name))),
                })),
            }));
            *p = ast::ParamOrTsParamProp::Param(ast::Param { span: Span::default(), decorators: vec![], pat });
        }
        if assigns.is_empty() {
            return;
        }
        let Some(body) = ctor.body.as_mut() else { return };
        let at = if derived {
            let is_super = |s: &ast::Stmt| {
                matches!(s, ast::Stmt::Expr(e) if matches!(&*e.expr, ast::Expr::Call(c) if matches!(c.callee, ast::Callee::Super(_))))
            };
            match body.stmts.iter().position(is_super) {
                Some(i) => i + 1,
                None => {
                    self.errors.push("a parameter property in a derived class whose constructor does not call super() at its top level is not supported".into());
                    return;
                }
            }
        } else {
            0
        };
        body.stmts.splice(at..at, assigns);
    }
}

/// What a type annotation says about a value: the possible types (`T_*`
/// bits), or `None` when it says nothing usable (`any`, a generic, an
/// interface a primitive could satisfy).
pub fn type_mask(t: &ast::TsType) -> Option<u16> {
    use ast::TsKeywordTypeKind as K;
    let m = match t {
        ast::TsType::TsKeywordType(k) => match k.kind {
            K::TsNumberKeyword => T_NUM,
            K::TsStringKeyword => T_STR,
            K::TsBooleanKeyword => T_BOOL,
            K::TsBigIntKeyword => T_BIGINT,
            K::TsSymbolKeyword => T_SYM,
            K::TsUndefinedKeyword | K::TsVoidKeyword => T_UNDEF,
            K::TsNullKeyword => T_NULL,
            K::TsObjectKeyword => T_OBJ | T_FUNC,
            K::TsAnyKeyword | K::TsUnknownKeyword | K::TsNeverKeyword | K::TsIntrinsicKeyword => return None,
        },
        ast::TsType::TsLitType(l) => match &l.lit {
            ast::TsLit::Number(_) => T_NUM,
            ast::TsLit::Str(_) | ast::TsLit::Tpl(_) => T_STR,
            ast::TsLit::Bool(_) => T_BOOL,
            ast::TsLit::BigInt(_) => T_BIGINT,
        },
        ast::TsType::TsArrayType(_) | ast::TsType::TsTupleType(_) => T_OBJ,
        ast::TsType::TsFnOrConstructorType(_) => T_FUNC,
        ast::TsType::TsParenthesizedType(p) => return type_mask(&p.type_ann),
        ast::TsType::TsOptionalType(o) => return type_mask(&o.type_ann).map(|m| m | T_UNDEF),
        ast::TsType::TsUnionOrIntersectionType(ast::TsUnionOrIntersectionType::TsUnionType(u)) => {
            let mut m = 0;
            for t in &u.types {
                m |= type_mask(t)?;
            }
            m
        }
        ast::TsType::TsTypeRef(r) => match &r.type_name {
            ast::TsEntityName::Ident(i) => match &*i.sym {
                "Array" | "ReadonlyArray" | "Map" | "Set" | "WeakMap" | "WeakSet" | "Date" | "RegExp" | "Promise" | "Error"
                | "Uint8Array" | "Int8Array" | "Uint16Array" | "Int16Array" | "Uint32Array" | "Int32Array" | "Float32Array"
                | "Float64Array" | "ArrayBuffer" | "DataView" => T_OBJ,
                "Function" => T_FUNC,
                _ => return None,
            },
            _ => return None,
        },
        _ => return None,
    };
    if m == T_ALL {
        None
    } else {
        Some(m)
    }
}

/// Remove the type annotations (and other type-only parts) left on `e`'s
/// nodes, so it prints as JavaScript.
pub fn strip_annotations(e: &mut ast::Expr) {
    e.visit_mut_with(&mut Annotations);
}

struct Annotations;

impl VisitMut for Annotations {
    fn visit_mut_binding_ident(&mut self, b: &mut ast::BindingIdent) {
        b.type_ann = None;
        b.id.optional = false;
    }
    fn visit_mut_function(&mut self, f: &mut ast::Function) {
        f.return_type = None;
        f.type_params = None;
        f.visit_mut_children_with(self);
    }
    fn visit_mut_arrow_expr(&mut self, a: &mut ast::ArrowExpr) {
        a.return_type = None;
        a.type_params = None;
        a.visit_mut_children_with(self);
    }
    fn visit_mut_class(&mut self, c: &mut ast::Class) {
        c.type_params = None;
        c.super_type_params = None;
        c.implements.clear();
        c.is_abstract = false;
        c.visit_mut_children_with(self);
    }
    fn visit_mut_class_prop(&mut self, p: &mut ast::ClassProp) {
        p.type_ann = None;
        p.accessibility = None;
        p.definite = false;
        p.readonly = false;
        p.is_optional = false;
        p.is_override = false;
        p.visit_mut_children_with(self);
    }
    fn visit_mut_private_prop(&mut self, p: &mut ast::PrivateProp) {
        p.type_ann = None;
        p.accessibility = None;
        p.definite = false;
        p.readonly = false;
        p.is_optional = false;
        p.is_override = false;
        p.visit_mut_children_with(self);
    }
    fn visit_mut_class_method(&mut self, m: &mut ast::ClassMethod) {
        m.accessibility = None;
        m.is_optional = false;
        m.is_override = false;
        m.visit_mut_children_with(self);
    }
    fn visit_mut_private_method(&mut self, m: &mut ast::PrivateMethod) {
        m.accessibility = None;
        m.is_optional = false;
        m.is_override = false;
        m.visit_mut_children_with(self);
    }
    fn visit_mut_constructor(&mut self, c: &mut ast::Constructor) {
        c.accessibility = None;
        c.is_optional = false;
        c.visit_mut_children_with(self);
    }
    fn visit_mut_call_expr(&mut self, c: &mut ast::CallExpr) {
        c.type_args = None;
        c.visit_mut_children_with(self);
    }
    fn visit_mut_new_expr(&mut self, n: &mut ast::NewExpr) {
        n.type_args = None;
        n.visit_mut_children_with(self);
    }
    fn visit_mut_tagged_tpl(&mut self, t: &mut ast::TaggedTpl) {
        t.type_params = None;
        t.visit_mut_children_with(self);
    }
}
