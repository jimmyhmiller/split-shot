//! First projection experiment: serialize guest syntax, then specialize a JS
//! interpreter. This encoder emits DATA, never executable target instructions.
use serde_json::{json, Value};
use swc_ecma_ast as ast;

type Result<T> = std::result::Result<T, String>;
pub const INTERPRETER: &str = include_str!("../docs/first-projection/interpreter.js");

fn ident(p: &ast::Pat) -> Result<String> {
    match p {
        ast::Pat::Ident(i) => Ok(i.id.sym.to_string()),
        _ => Err("projection: only identifier parameters and var bindings are supported".into()),
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
                add(names, ident(&d.name)?);
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
fn lexical_names(stmts: &[ast::Stmt]) -> Result<Vec<String>> {
    let mut names = Vec::new();
    for s in stmts {
        if let ast::Stmt::Decl(ast::Decl::Var(v)) = s {
            if v.kind != ast::VarDeclKind::Var {
                for d in &v.decls {
                    add(&mut names, ident(&d.name)?);
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
struct Encoder {
    scopes: Vec<Vec<String>>,
    declarations: Vec<Vec<String>>,
}
impl Encoder {
    fn bound(&self, name: &str) -> bool {
        self.scopes.iter().any(|s| s.iter().any(|n| n == name))
    }
    fn address(&self, name: &str) -> Result<(usize, usize)> {
        for (depth, scope) in self.scopes.iter().skip(1).rev().enumerate() {
            if let Some(slot) = scope.iter().position(|n| n == name) {
                return Ok((depth, slot));
            }
        }
        Err(format!("projection: no mutable local binding {name:?}"))
    }
    fn reference(&self, name: &str) -> Result<Value> {
        if let Ok((depth, slot)) = self.address(name) {
            let declarations = &self.declarations[self.declarations.len() - 1 - depth];
            if let Some(index) = declarations.iter().position(|n| n == name) {
                return Ok(json!(["decl", depth, index]));
            }
            Ok(json!(["var", depth, slot]))
        } else if self.scopes[0].iter().any(|n| n == name) {
            Ok(json!(["global", name]))
        } else if name == "undefined" {
            Ok(json!(["undefined"]))
        } else {
            Err(format!(
                "projection: unbound identifier {name:?}; host globals are not supported"
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
                "projection: mutation of function declaration {name} is unsupported"
            ));
        }
        Ok((depth, slot))
    }
    fn function(&mut self, params: Vec<String>, body: &[ast::Stmt]) -> Result<Value> {
        let mut names = Vec::new();
        for p in &params {
            if names.contains(p) {
                return Err("projection: duplicate parameters are not supported".into());
            }
            names.push(p.clone());
        }
        for s in body {
            collect(s, &mut names)?;
        }
        for name in lexical_names(body)? {
            add(&mut names, name);
        }
        self.scopes.push(names.clone());
        let declarations = body
            .iter()
            .filter_map(|s| match s {
                ast::Stmt::Decl(ast::Decl::Fn(f)) => Some(f.ident.sym.to_string()),
                _ => None,
            })
            .collect();
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
        let encoded = self.block(body, true)?;
        self.scopes.pop();
        self.declarations.pop();
        Ok(json!([params.len(), names.len(), decls, encoded]))
    }
    fn fn_ast(&mut self, f: &ast::Function) -> Result<Value> {
        if f.is_async || f.is_generator {
            return Err("projection: async/generators are not supported".into());
        }
        let params = f
            .params
            .iter()
            .map(|p| ident(&p.pat))
            .collect::<Result<Vec<_>>>()?;
        self.function(
            params,
            &f.body
                .as_ref()
                .ok_or("projection: function body is required")?
                .stmts,
        )
    }
    fn block(&mut self, stmts: &[ast::Stmt], function_body: bool) -> Result<Value> {
        let names = if function_body {
            vec![]
        } else {
            lexical_names(stmts)?
        };
        let nslots = names.len();
        if nslots > 0 {
            self.scopes.push(names);
            self.declarations.push(vec![]);
        }
        let mut out = Vec::new();
        for s in stmts {
            if matches!(s, ast::Stmt::Decl(ast::Decl::Fn(_))) {
                if !function_body {
                    return Err(
                        "projection: block-level function declarations are not supported".into(),
                    );
                }
                continue;
            }
            // Directives change semantics; do not silently treat them as expressions.
            if matches!(s, ast::Stmt::Expr(e) if matches!(&*e.expr, ast::Expr::Lit(ast::Lit::Str(_))))
            {
                return Err("projection: directives are not supported".into());
            }
            out.push(self.stmt(s)?);
        }
        if nslots > 0 {
            self.scopes.pop();
            self.declarations.pop();
        }
        Ok(json!(["block", out, nslots]))
    }
    fn stmt(&mut self, s: &ast::Stmt) -> Result<Value> {
        Ok(match s {
            ast::Stmt::Empty(_) => json!(["empty"]),
            ast::Stmt::Expr(e) => json!(["expr", self.expr(&e.expr)?]),
            ast::Stmt::Block(b) => self.block(&b.stmts, false)?,
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
            ast::Stmt::For(f) => {
                let names = match &f.init {
                    Some(ast::VarDeclOrExpr::VarDecl(v)) => {
                        lexical_names(&[ast::Stmt::Decl(ast::Decl::Var(v.clone()))])?
                    }
                    _ => vec![],
                };
                let nslots = names.len();
                if nslots > 0 {
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
                }
                encoded
            }
            ast::Stmt::Break(b) if b.label.is_none() => json!(["break"]),
            ast::Stmt::Continue(c) if c.label.is_none() => json!(["continue"]),
            ast::Stmt::Decl(ast::Decl::Var(v)) => {
                let mut ds = Vec::new();
                for d in &v.decls {
                    let name = ident(&d.name)?;
                    if d.init.is_none()
                        && v.kind == ast::VarDeclKind::Var
                        && matches!(self.reference(&name)?, Value::Array(ref a) if a[0] == "decl")
                    {
                        continue;
                    }
                    let (depth, slot) = self.mutable_address(&name)?;
                    ds.push(json!([
                        depth,
                        slot,
                        match &d.init {
                            Some(e) => self.expr(e)?,
                            None if v.kind == ast::VarDeclKind::Var => Value::Null,
                            None => json!(["undefined"]),
                        }
                    ]));
                }
                json!(["var", ds])
            }
            _ => return Err(format!("projection: unsupported statement {s:?}")),
        })
    }
    fn member(&mut self, m: &ast::MemberExpr) -> Result<Value> {
        if !self.bound("Math") && math_member(m, "PI") {
            return Ok(json!(["mathconst", "PI"]));
        }
        let key = match &m.prop {
            ast::MemberProp::Ident(i) => json!(["lit", i.sym.as_str()]),
            ast::MemberProp::Computed(c) => self.expr(&c.expr)?,
            _ => return Err("projection: private members are not supported".into()),
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
                    "projection: strings with unpaired UTF-16 surrogates are not supported"
                )?
            ]),
            ast::Expr::Lit(ast::Lit::Bool(b)) => json!(["lit", b.value]),
            ast::Expr::Lit(ast::Lit::Null(_)) => json!(["lit", null]),
            ast::Expr::Ident(i) => self.reference(i.sym.as_str())?,
            ast::Expr::This(_) => json!(["this"]),
            ast::Expr::New(n) => {
                let mut args = Vec::new();
                for a in n.args.as_deref().unwrap_or(&[]) {
                    if a.spread.is_some() {
                        return Err("projection: spreads are not supported".into());
                    }
                    args.push(self.expr(&a.expr)?);
                }
                json!(["new", self.expr(&n.callee)?, args])
            }
            ast::Expr::Bin(b) => {
                let op = b.op.as_str();
                if ["in", "instanceof"].contains(&op) {
                    return Err(format!("projection: operator {op} is not supported"));
                }
                json!(["bin", op, self.expr(&b.left)?, self.expr(&b.right)?])
            }
            ast::Expr::Unary(u) => {
                if !matches!(
                    u.op,
                    ast::UnaryOp::Bang
                        | ast::UnaryOp::Minus
                        | ast::UnaryOp::Plus
                        | ast::UnaryOp::Tilde
                        | ast::UnaryOp::Void
                ) {
                    return Err(
                        "projection: only ! - + ~ void unary operators are supported".into(),
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
                let mut values = Vec::new();
                for item in &a.elems {
                    let item = item
                        .as_ref()
                        .ok_or("projection: array holes are not supported")?;
                    if item.spread.is_some() {
                        return Err("projection: spreads are not supported".into());
                    }
                    values.push(self.expr(&item.expr)?);
                }
                json!(["array", values])
            }
            ast::Expr::Member(m) => self.member(m)?,
            ast::Expr::Assign(a) => {
                let target = match &a.left {
                    ast::AssignTarget::Simple(ast::SimpleAssignTarget::Ident(i)) => {
                        if !self.bound(i.id.sym.as_str()) {
                            return Err(
                                "projection: assignment to an unbound name is not supported".into(),
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
                    _ => return Err("projection: destructuring assignment is not supported".into()),
                };
                let op = a.op.as_str();
                if ["&&=", "||=", "??="].contains(&op) {
                    return Err("projection: logical assignments are not supported".into());
                }
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
                let ast::Expr::Ident(i) = &*u.arg else {
                    return Err("projection: updates require a variable".into());
                };

                {
                    let (depth, slot) = self.mutable_address(i.sym.as_str())?;
                    json!([
                        "update",
                        if u.op == ast::UpdateOp::PlusPlus {
                            1
                        } else {
                            -1
                        },
                        depth,
                        slot,
                        u.prefix
                    ])
                }
            }
            ast::Expr::Fn(f) if f.ident.is_none() => {
                json!(["fun", self.fn_ast(&f.function)?, false])
            }
            ast::Expr::Arrow(a) => {
                if a.is_async || a.is_generator {
                    return Err("projection: async arrows are not supported".into());
                }
                let params = a.params.iter().map(ident).collect::<Result<Vec<_>>>()?;
                let body = match &*a.body {
                    ast::BlockStmtOrExpr::BlockStmt(b) => b.stmts.clone(),
                    ast::BlockStmtOrExpr::Expr(e) => vec![ast::Stmt::Return(ast::ReturnStmt {
                        span: a.span,
                        arg: Some(e.clone()),
                    })],
                };
                json!(["fun", self.function(params, &body)?, true])
            }
            ast::Expr::Call(c) => {
                let ast::Callee::Expr(callee) = &c.callee else {
                    return Err("projection: only guest-function calls are supported".into());
                };
                // A method needs JS's receiver/native-call semantics, not invoke.
                let mut unwrapped = &**callee;
                while let ast::Expr::Paren(p) = unwrapped {
                    unwrapped = &p.expr;
                }
                let mut args = Vec::new();
                for a in &c.args {
                    if a.spread.is_some() {
                        return Err("projection: spreads are not supported".into());
                    }
                    args.push(self.expr(&a.expr)?);
                }
                if matches!(unwrapped, ast::Expr::Member(m) if math_member(m, "sqrt"))
                    && !self.bound("Math")
                {
                    json!(["mathcall", "sqrt", args])
                } else if matches!(unwrapped, ast::Expr::Ident(i) if i.sym == "Array")
                    && !self.bound("Array")
                {
                    if args.len() < 2 {
                        return Err("projection: Array requires at least two arguments".into());
                    }
                    json!(["array", args])
                } else {
                    if matches!(unwrapped, ast::Expr::Member(_)) {
                        return Err(
                            "projection: method calls other than Math.sqrt are not supported"
                                .into(),
                        );
                    }
                    json!(["call", self.expr(callee)?, args])
                }
            }
            ast::Expr::Seq(s) => json!([
                "seq",
                s.exprs
                    .iter()
                    .map(|e| self.expr(e))
                    .collect::<Result<Vec<_>>>()?
            ]),
            _ => return Err(format!("projection: unsupported expression {e:?}")),
        })
    }
}
/// Parse guest JS into a tagged AST. Nothing in the interpreter is specialized
/// here: operator dispatch, environments, calls and completions remain data.
pub fn encode(source: &str) -> Result<Value> {
    let module = parse_strict(source)?;
    let mut functions = Vec::new();
    let mut names = Vec::new();
    for item in &module.body {
        match item {
            ast::ModuleItem::Stmt(ast::Stmt::Decl(ast::Decl::Fn(f))) => {
                if names.contains(&f.ident.sym.to_string()) {
                    return Err("projection: duplicate top-level functions".into());
                }
                names.push(f.ident.sym.to_string());
                functions.push(f);
            }
            ast::ModuleItem::Stmt(ast::Stmt::Empty(_)) => {}
            _ => {
                return Err(
                    "projection: the top level must contain only function declarations".into(),
                )
            }
        }
    }
    if !names.iter().any(|n| n == "main") {
        return Err("projection: guest must define function main(input)".into());
    }
    let mut encoder = Encoder {
        scopes: vec![names],
        declarations: vec![vec![]],
    };
    let mut program: Value = functions
        .into_iter()
        .map(|f| Ok(json!([f.ident.sym.as_str(), encoder.fn_ast(&f.function)?])))
        .collect::<Result<_>>()?;
    // Stable syntax identity is binding-time information, not executable
    // lowering. PE skeletons intentionally erase numbers, so numeric addresses
    // alone make different variable/statement nodes look identical. A string
    // location distinguishes those static contexts without changing semantics.
    fn identify(value: &mut Value, next: &mut usize) {
        if let Value::Array(xs) = value {
            let node = xs.first().and_then(Value::as_str).is_some_and(|tag| {
                matches!(
                    tag,
                    "lit"
                        | "undefined"
                        | "var"
                        | "bin"
                        | "unary"
                        | "cond"
                        | "array"
                        | "get"
                        | "assign"
                        | "update"
                        | "fun"
                        | "call"
                        | "seq"
                        | "empty"
                        | "expr"
                        | "return"
                        | "break"
                        | "continue"
                        | "if"
                        | "while"
                        | "for"
                        | "block"
                        | "global"
                        | "decl"
                        | "this"
                        | "new"
                        | "mathconst"
                        | "mathcall"
                )
            });
            for x in xs.iter_mut() {
                identify(x, next);
            }
            if node {
                xs.push(json!(format!("@syntax{}", *next)));
                *next += 1;
            }
        }
    }
    identify(&mut program, &mut 0);
    Ok(program)
}
/// Source to feed to the existing partial evaluator for the first projection.
pub fn harness(program: &Value) -> String {
    // Nest interpreter definitions inside main so they cannot be public script
    // globals. The residual has no obligation to preserve those definitions.
    format!("function main(input) {{\n{INTERPRETER}\nreturn interpret({program}, input);\n}}\n")
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn encoder_rejects_unmodeled_semantics() {
        for s in [
            "function main(x){\"use strict\";return x}",
            "function main(x){return Math.abs(x)}",
            "function main(x){return typeof x}",
            "function main(x){return [,,x]}",
            "function main(x){return (()=>arguments[0])()}",
            "function main(x){return class C{}}",
            "function main(x){return (function named(){})}",
            "function main(x){break;return x}",
            "function main(x){continue;return x}",
            "function main(x){main=x;return x}",
            "function main(x){return (x.push)(1)}",
            r"function main(x){return '\uD800'}",
        ] {
            assert!(encode(s).is_err(), "accepted {s}");
        }
    }
    #[test]
    fn nbody_encodes_without_rewriting_guest_source() {
        let program = encode(include_str!(
            "../docs/first-projection/benchmarks/nbody/input.js"
        ))
        .unwrap();
        let text = program.to_string();
        for tag in ["new", "this", "mathconst", "mathcall", "decl"] {
            assert!(text.contains(&format!("\"{tag}\"")), "missing {tag}");
        }
    }
    #[test]
    fn lexical_frames_and_declaration_addresses_are_explicit() {
        let mut program = encode("function main(x){function f(){return x} {let x=2;var y=x;f();} for(let i=0;i<2;i++){let j=i;x=j;} return f()}").unwrap();
        fn without_locations(value: &mut Value) {
            if let Value::Array(xs) = value {
                if xs
                    .last()
                    .and_then(Value::as_str)
                    .is_some_and(|s| s.starts_with("@syntax"))
                {
                    xs.pop();
                }
                for x in xs {
                    without_locations(x);
                }
            }
        }
        without_locations(&mut program);
        let body = &program[0][1][3];
        assert_eq!(body[2], 0);
        assert_eq!(body[1][0][2], 1);
        assert_eq!(body[1][0][1][0][1][0], json!([0, 0, ["lit", 2.0]]));
        assert_eq!(body[1][0][1][1][1][0], json!([1, 2, ["var", 0, 0]]));
        assert_eq!(body[1][0][1][2][1][1], json!(["decl", 1, 0]));
        assert_eq!(body[1][1][5], 1);
        assert_eq!(body[1][2][1][1], json!(["decl", 0, 0]));
        assert!(encode("function main(x){function f(){} f=x;return f}").is_err());
    }
    #[test]
    fn lexical_and_constructor_interpretation_matches_node() {
        for source in [
            "function main(x){let y=1;{let y=2;var inner=y}return [y,inner]}",
            "function main(x){var f,g;for(let i=0;i<2;i++){if(i===0)f=()=>i;else g=()=>i}return [f(),g()]}",
            "function main(x){var out;for(let i=0,f=()=>i;i<1;i++){i=5;out=f()}return out}",
            "function main(x){const scale=Math.PI;function Body(y){this.x=y+scale}const a=Array(new Body(x),new Body(3));let sum=0;for(let i=0;i<2;i++){const body=a[i];sum+=Math.sqrt(body.x*body.x)}return sum}",
        ] {
            let program = encode(source).unwrap();
            let interpreted = harness(&program);
            let script = format!("const vm=require('node:vm'),assert=require('node:assert/strict');const a=vm.runInNewContext({:?}+';JSON.stringify(main(2))');const b=vm.runInNewContext({:?}+';JSON.stringify(main(2))');assert.equal(a,b);", source, interpreted);
            let result = std::process::Command::new("node").args(["-e", &script]).output().unwrap();
            assert!(result.status.success(), "{}", String::from_utf8_lossy(&result.stderr));
        }
    }
    #[test]
    fn host_primitives_respect_shadowing() {
        assert!(encode("function main(Math){return Math.sqrt(2)}").is_err());
        assert!(encode("function main(x){return Array(x)}").is_err());
        let program = encode("function main(Array){return Array(1,2)}").unwrap();
        assert_eq!(program[0][1][3][1][0][1][0], "call");
        check_target("function main(x){var o={x:x};return Math.sqrt(o.x)+Math.PI}").unwrap();
        assert!(check_target("function main(x){return Math.abs(x)}").is_err());
        assert!(check_target("function main(Math){return Math.sqrt(2)}").is_err());
    }
    #[test]
    fn nonfinite_literal_is_not_json_null() {
        let ast = encode("function main(x){return 1e400}").unwrap();
        assert!(ast.to_string().contains("\"/\""));
        assert!(!ast.to_string().contains("null"));
    }
    #[test]
    fn interpreter_is_in_target_profile() {
        check_target(INTERPRETER).unwrap();
        for s in [
            "function main(x){return y}",
            "function main(x){return eval(x)}",
            "function main(x){return x=>x}",
            "function main(x){return {f(){return x}}}",
        ] {
            assert!(check_target(s).is_err(), "accepted {s}");
        }
    }
    #[test]
    fn syntax_is_data_not_lowered_code() {
        let ast =
            encode("function main(x){var f=y=>y+2;for(var i=0;i<3;i++)x=f(x);return x}").unwrap();
        let text = ast.to_string();
        for tag in ["\"for\"", "\"fun\"", "\"call\"", "\"update\"", "\"bin\""] {
            assert!(text.contains(tag), "missing {tag}");
        }
    }
}

/// Syntactic target profile. This is a check on LANGUAGE CONSTRUCTS, not a
/// promise that every guest program obeys the experiment's value-type contract.
/// Calls must name a declared function. No interpreter dispatch is allowed in
/// successful residuals (tag literals and helper names are checked separately).
pub fn check_target(source: &str) -> Result<Value> {
    use swc_ecma_visit::{Visit, VisitWith};
    struct Bindings(Vec<String>);
    impl Visit for Bindings {
        fn visit_fn_decl(&mut self, f: &ast::FnDecl) {
            add(&mut self.0, f.ident.sym.to_string());
        }
        fn visit_var_declarator(&mut self, v: &ast::VarDeclarator) {
            if let ast::Pat::Ident(i) = &v.name {
                add(&mut self.0, i.id.sym.to_string());
            }
        }
    }
    struct Check {
        errors: Vec<String>,
        functions: Vec<String>,
        calls: Vec<String>,
        nodes: usize,
        scopes: Vec<Vec<String>>,
    }
    impl Visit for Check {
        fn visit_module(&mut self, m: &ast::Module) {
            let mut names = Bindings(vec![]);
            m.visit_with(&mut names);
            self.scopes.push(names.0);
            m.visit_children_with(self);
            self.scopes.pop();
        }
        fn visit_function(&mut self, f: &ast::Function) {
            let mut names = Bindings(vec![]);
            if let Some(b) = &f.body {
                b.visit_with(&mut names);
            }
            for p in &f.params {
                if let ast::Pat::Ident(i) = &p.pat {
                    add(&mut names.0, i.id.sym.to_string());
                }
            }
            self.scopes.push(names.0);
            f.visit_children_with(self);
            self.scopes.pop();
        }
        fn visit_ident(&mut self, i: &ast::Ident) {
            let name = i.sym.as_str();
            if !["undefined", "NaN", "Infinity"].contains(&name)
                && !self.scopes.iter().any(|s| s.iter().any(|n| n == name))
            {
                self.errors
                    .push(format!("target undeclared identifier {name}"));
            }
        }
        fn visit_labeled_stmt(&mut self, s: &ast::LabeledStmt) {
            s.body.visit_with(self);
        }
        fn visit_break_stmt(&mut self, _: &ast::BreakStmt) {}
        fn visit_continue_stmt(&mut self, _: &ast::ContinueStmt) {}
        fn visit_expr(&mut self, e: &ast::Expr) {
            self.nodes += 1;
            if !matches!(
                e,
                ast::Expr::Lit(
                    ast::Lit::Num(_) | ast::Lit::Str(_) | ast::Lit::Bool(_) | ast::Lit::Null(_)
                ) | ast::Expr::Ident(_)
                    | ast::Expr::Bin(_)
                    | ast::Expr::Unary(_)
                    | ast::Expr::Cond(_)
                    | ast::Expr::Array(_)
                    | ast::Expr::Object(_)
                    | ast::Expr::Member(_)
                    | ast::Expr::Assign(_)
                    | ast::Expr::Update(_)
                    | ast::Expr::Seq(_)
                    | ast::Expr::Paren(_)
                    | ast::Expr::Call(_)
            ) {
                self.errors
                    .push(format!("expression outside target subset: {e:?}"));
            }
            if let ast::Expr::Call(c) = e {
                if let ast::Callee::Expr(callee) = &c.callee {
                    if let ast::Expr::Ident(i) = &**callee {
                        self.calls.push(i.sym.to_string());
                    } else if matches!(&**callee, ast::Expr::Member(m) if math_member(m, "sqrt"))
                        && !self.scopes.iter().any(|s| s.iter().any(|n| n == "Math"))
                    {
                        for arg in &c.args {
                            arg.expr.visit_with(self);
                        }
                        if c.args.iter().any(|a| a.spread.is_some()) {
                            self.errors.push("target spread arguments".into());
                        }
                        return;
                    } else {
                        self.errors
                            .push("target calls must name a declared function or Math.sqrt".into());
                    }
                } else {
                    self.errors.push("target super/import call".into());
                }
                if c.args.iter().any(|a| a.spread.is_some()) {
                    self.errors.push("target spread arguments".into());
                }
            }
            if let ast::Expr::Member(m) = e {
                if math_member(m, "PI")
                    && !self.scopes.iter().any(|s| s.iter().any(|n| n == "Math"))
                {
                    return;
                }
            }
            if let ast::Expr::Object(o) = e {
                for p in &o.props {
                    match p {
                        ast::PropOrSpread::Prop(p)
                            if matches!(&**p, ast::Prop::KeyValue(_) | ast::Prop::Shorthand(_)) => {
                        }
                        _ => self
                            .errors
                            .push("target object methods/accessors/spreads".into()),
                    }
                }
            }
            if let ast::Expr::Array(a) = e {
                if a.elems.iter().flatten().any(|x| x.spread.is_some()) {
                    self.errors.push("target array spread".into());
                }
            }
            if let ast::Expr::Unary(u) = e {
                if u.op == ast::UnaryOp::Delete {
                    self.errors.push("target delete".into());
                }
            }
            e.visit_children_with(self);
        }
        fn visit_stmt(&mut self, s: &ast::Stmt) {
            if !matches!(
                s,
                ast::Stmt::Block(_)
                    | ast::Stmt::Empty(_)
                    | ast::Stmt::Expr(_)
                    | ast::Stmt::Return(_)
                    | ast::Stmt::If(_)
                    | ast::Stmt::While(_)
                    | ast::Stmt::Break(_)
                    | ast::Stmt::Continue(_)
                    | ast::Stmt::Labeled(_)
                    | ast::Stmt::Decl(_)
            ) {
                self.errors
                    .push(format!("statement outside target subset: {s:?}"));
            }
            s.visit_children_with(self);
        }
        fn visit_decl(&mut self, d: &ast::Decl) {
            match d {
                ast::Decl::Fn(f) => {
                    self.functions.push(f.ident.sym.to_string());
                    if f.function.is_async || f.function.is_generator {
                        self.errors.push("target async/generator".into());
                    }
                    if f.function
                        .params
                        .iter()
                        .any(|p| !matches!(p.pat, ast::Pat::Ident(_)))
                    {
                        self.errors.push("target complex parameter".into());
                    }
                }
                ast::Decl::Var(v) => {
                    if v.kind == ast::VarDeclKind::Const {
                        self.errors.push("target const declaration".into());
                    }
                    if v.decls
                        .iter()
                        .any(|d| !matches!(d.name, ast::Pat::Ident(_)))
                    {
                        self.errors.push("target destructuring".into());
                    }
                }
                _ => self.errors.push("declaration outside target subset".into()),
            }
            d.visit_children_with(self);
        }
        fn visit_module_decl(&mut self, _: &ast::ModuleDecl) {
            self.errors.push("target module syntax".into());
        }
    }
    let module = parse_strict(source)?;
    let mut check = Check {
        errors: vec![],
        functions: vec![],
        calls: vec![],
        nodes: 0,
        scopes: vec![],
    };
    module.visit_with(&mut check);
    for c in &check.calls {
        if !check.functions.contains(c) {
            check
                .errors
                .push(format!("target call to undeclared function {c}"));
        }
    }
    if !check.errors.is_empty() {
        return Err(check
            .errors
            .into_iter()
            .take(4)
            .collect::<Vec<_>>()
            .join("\n"));
    }
    Ok(
        json!({"functions": check.functions.len(), "calls": check.calls.len(), "expression_nodes": check.nodes}),
    )
}

fn parse_strict(source: &str) -> Result<ast::Module> {
    use swc_common::{sync::Lrc, FileName, SourceMap};
    use swc_ecma_parser::{lexer::Lexer, Parser, StringInput, Syntax};
    let cm: Lrc<SourceMap> = Default::default();
    let fm = cm.new_source_file(
        Lrc::new(FileName::Custom("projection.js".into())),
        source.to_string(),
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
        .map_err(|e| format!("projection parse error: {:?}", e.kind()))?;
    let errors = parser.take_errors();
    if !errors.is_empty() {
        return Err(format!("projection parse error: {:?}", errors[0].kind()));
    }
    Ok(module)
}
