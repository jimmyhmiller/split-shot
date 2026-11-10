//! Deliberately restricted numeric residual -> C lowering, with no JS runtime.
//! Contract: buffer indices are finite nonnegative integers within allocation
//! bounds. Locals have function scope (residual code must not shadow names).
use std::collections::{BTreeMap, BTreeSet};
use swc_ecma_ast::*;

type Result<T> = std::result::Result<T, String>;
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Kind {
    Number,
    Buffer,
    Intrinsic(&'static str),
}
type Env = BTreeMap<String, Option<Kind>>;
#[derive(Clone)]
struct Frame {
    name: Option<String>,
    end: String,
    next: Option<String>,
    breaks: Vec<Env>,
    continues: Vec<Env>,
}
#[derive(Clone, Default)]
struct Emit {
    env: Env,
    slots: BTreeSet<(String, bool)>,
    frames: Vec<Frame>,
    serial: usize,
    owners: usize,
    loop_depth: usize,
    allow_store: bool,
}
fn join(a: &Env, b: &Env) -> Env {
    a.keys()
        .chain(b.keys())
        .map(|k| {
            let x = a.get(k).copied().flatten();
            let y = b.get(k).copied().flatten();
            (k.clone(), if x == y { x } else { None })
        })
        .collect()
}
impl Emit {
    fn fresh(&mut self, prefix: &str) -> String {
        self.serial += 1;
        format!("{prefix}_{}", self.serial)
    }
    fn slot(&mut self, name: &str, kind: Kind) -> String {
        self.slots.insert((name.to_owned(), kind == Kind::Buffer));
        // Hex encoding is injective, including identifiers containing '$' or Unicode.
        let n: String = name.as_bytes().iter().map(|x| format!("{x:02x}")).collect();
        format!("v_{n}_{}", if kind == Kind::Buffer { "p" } else { "n" })
    }
    fn intrinsic_name(&self, e: &Expr) -> Option<&'static str> {
        match e {
            Expr::Paren(p) => self.intrinsic_name(&p.expr),
            Expr::Ident(i) => {
                if let Some(kind) = self.env.get(i.sym.as_ref()) {
                    return match kind {
                        Some(Kind::Intrinsic(n)) => Some(*n),
                        _ => None,
                    };
                }
                match i.sym.as_ref() {
                    "allocF64" => Some("allocF64"),
                    "loadF64" => Some("loadF64"),
                    "storeF64" => Some("storeF64"),
                    "f64Sqrt" => Some("f64Sqrt"),
                    "failCapacity" => Some("failCapacity"),
                    _ => None,
                }
            }
            Expr::Member(m)
                if !self.env.contains_key("Math")
                    && matches!(&*m.obj, Expr::Ident(i) if i.sym == *"Math")
                    && matches!(&m.prop, MemberProp::Ident(i) if i.sym == *"sqrt") =>
            {
                Some("f64Sqrt")
            }
            _ => None,
        }
    }
    fn call_name(&self, c: &CallExpr) -> Option<&'static str> {
        match &c.callee {
            Callee::Expr(f) => self.intrinsic_name(f),
            _ => None,
        }
    }
    fn expression_call_name(&self, e: &Expr) -> Option<&'static str> {
        match e {
            Expr::Call(c) => self.call_name(c),
            _ => None,
        }
    }
    fn effect_expr(&mut self, e: &Expr) -> Result<(String, Kind)> {
        let previous = self.allow_store;
        self.allow_store = self.expression_call_name(e) == Some("storeF64");
        let result = self.expr(e);
        self.allow_store = previous;
        result
    }
    fn scalar(&mut self, e: &Expr) -> Result<String> {
        let (s, k) = self.expr(e)?;
        if k != Kind::Number {
            return Err("numeric expression required, found buffer".into());
        }
        Ok(s)
    }
    fn ident(&mut self, n: &str) -> Result<(String, Kind)> {
        let k = if let Some(k) = self.env.get(n) {
            k.ok_or_else(|| format!("uninitialized or incompatible category at read of `{n}`"))?
        } else {
            match n {
                "allocF64" => Kind::Intrinsic("allocF64"),
                "loadF64" => Kind::Intrinsic("loadF64"),
                "storeF64" => Kind::Intrinsic("storeF64"),
                "f64Sqrt" => Kind::Intrinsic("f64Sqrt"),
                "failCapacity" => Kind::Intrinsic("failCapacity"),
                _ => return Err(format!("unknown identifier `{n}`")),
            }
        };
        if matches!(k, Kind::Intrinsic(_)) {
            Ok((String::new(), k))
        } else {
            Ok((self.slot(n, k), k))
        }
    }
    fn expr(&mut self, e: &Expr) -> Result<(String, Kind)> {
        let num = |s| Ok((s, Kind::Number));
        match e {
            Expr::Paren(p) => self.expr(&p.expr),
            Expr::Ident(i) => match i.sym.as_ref() {
                "Infinity" if !self.env.contains_key("Infinity") => num("INFINITY".into()),
                "NaN" if !self.env.contains_key("NaN") => num("NAN".into()),
                n => self.ident(n),
            },
            Expr::Lit(Lit::Num(n)) => num(if n.value.is_nan() {
                "NAN".into()
            } else if n.value.is_infinite() {
                if n.value > 0.0 {
                    "INFINITY"
                } else {
                    "(-INFINITY)"
                }
                .into()
            } else {
                format!("{:.17e}", n.value)
            }),
            Expr::Lit(Lit::Bool(b)) => num(if b.value { "1.0" } else { "0.0" }.into()),
            Expr::Unary(u) => {
                let a = self.scalar(&u.arg)?;
                num(match u.op {
                    UnaryOp::Plus => format!("(+({a}))"),
                    UnaryOp::Minus => format!("(-({a}))"),
                    UnaryOp::Bang => format!("(!numeric_truth({a}))"),
                    _ => return Err(format!("unsupported unary operator {:?}", u.op)),
                })
            }
            Expr::Bin(b) => {
                // Side effects in operands are excluded: C does not preserve JS evaluation order.
                self.ensure_pure(&b.left)?;
                self.ensure_pure(&b.right)?;
                let a = self.scalar(&b.left)?;
                let z = self.scalar(&b.right)?;
                use BinaryOp::*;
                num(match b.op {
                    Add | Sub | Mul | Div | Lt | LtEq | Gt | GtEq | EqEq | EqEqEq | NotEq
                    | NotEqEq => {
                        let op = match b.op {
                            Add => "+",
                            Sub => "-",
                            Mul => "*",
                            Div => "/",
                            Lt => "<",
                            LtEq => "<=",
                            Gt => ">",
                            GtEq => ">=",
                            EqEq | EqEqEq => "==",
                            _ => "!=",
                        };
                        format!("(({a}) {op} ({z}))")
                    }
                    Mod => format!("fmod(({a}), ({z}))"),
                    Exp => format!("pow(({a}), ({z}))"),
                    LogicalAnd => format!("(numeric_truth({a}) ? ({z}) : ({a}))"),
                    LogicalOr => format!("(numeric_truth({a}) ? ({a}) : ({z}))"),
                    _ => return Err(format!("unsupported binary operator {:?}", b.op)),
                })
            }
            Expr::Member(m) => {
                if let Some(name) = self.intrinsic_name(e) {
                    return Ok((String::new(), Kind::Intrinsic(name)));
                }
                let (a, k) = self.expr(&m.obj)?;
                if k != Kind::Buffer {
                    return Err("indexed read requires numeric buffer".into());
                }
                let MemberProp::Computed(i) = &m.prop else {
                    return Err("ordinary property access is unsupported".into());
                };
                self.ensure_pure(&i.expr)?;
                let i = self.scalar(&i.expr)?;
                num(format!("({a})[(size_t)({i})]"))
            }
            Expr::Assign(a) => {
                // Reject unsequenced nested writes such as x = x++.
                // Allocation and a sequenced numeric store may be standalone RHS intrinsics.
                if !matches!(
                    self.expression_call_name(&a.right),
                    Some("allocF64" | "storeF64")
                ) {
                    self.ensure_pure(&a.right)?;
                }
                if self.expression_call_name(&a.right) == Some("storeF64")
                    && (!matches!(&a.left, AssignTarget::Simple(SimpleAssignTarget::Ident(_)))
                        || a.op != AssignOp::Assign)
                {
                    return Err("storeF64 RHS requires simple scalar variable assignment".into());
                }
                let (rhs, k) = self.effect_expr(&a.right)?;
                if let Kind::Intrinsic(_) = k {
                    let AssignTarget::Simple(SimpleAssignTarget::Ident(i)) = &a.left else {
                        return Err("intrinsic alias cannot be stored as data".into());
                    };
                    if a.op != AssignOp::Assign {
                        return Err("intrinsic alias requires plain assignment".into());
                    }
                    self.env.insert(i.id.sym.to_string(), Some(k));
                    return Ok((String::new(), k));
                }
                let lhs = match &a.left {
                    AssignTarget::Simple(SimpleAssignTarget::Ident(i)) => {
                        let n = i.id.sym.to_string();
                        if a.op != AssignOp::Assign && self.env.get(&n) != Some(&Some(k)) {
                            return Err("compound assignment changes category".into());
                        }
                        self.env.insert(n.clone(), Some(k));
                        self.slot(&n, k)
                    }
                    AssignTarget::Simple(SimpleAssignTarget::Member(m)) => {
                        if k != Kind::Number {
                            return Err("buffer elements must be numeric".into());
                        }
                        self.ensure_pure(&m.obj)?;
                        if let MemberProp::Computed(i) = &m.prop {
                            self.ensure_pure(&i.expr)?;
                        }
                        self.expr(&Expr::Member(m.clone()))?.0
                    }
                    _ => return Err("unsupported assignment target".into()),
                };
                let op = match a.op {
                    AssignOp::Assign => "=",
                    AssignOp::AddAssign => "+=",
                    AssignOp::SubAssign => "-=",
                    AssignOp::MulAssign => "*=",
                    AssignOp::DivAssign => "/=",
                    _ => return Err("unsupported compound assignment".into()),
                };
                if k == Kind::Buffer && a.op != AssignOp::Assign {
                    return Err("arithmetic on buffer pointers is unsupported".into());
                }
                Ok((format!("({lhs} {op} ({rhs}))"), k))
            }
            Expr::Update(u) => {
                let a = self.scalar(&u.arg)?;
                if !matches!(&*u.arg, Expr::Ident(_) | Expr::Member(_)) {
                    return Err("unsupported update target".into());
                }
                let op = if u.op == UpdateOp::PlusPlus {
                    "++"
                } else {
                    "--"
                };
                num(if u.prefix {
                    format!("({op}{a})")
                } else {
                    format!("({a}{op})")
                })
            }
            Expr::Cond(c) => {
                let test = self.scalar(&c.test)?;
                let before = self.env.clone();
                let (a, ka) = self.expr(&c.cons)?;
                let left = self.env.clone();
                self.env = before;
                let (b, kb) = self.expr(&c.alt)?;
                self.env = join(&left, &self.env);
                if matches!(ka, Kind::Intrinsic(_)) || matches!(kb, Kind::Intrinsic(_)) {
                    return Err(
                        "intrinsic conditional values unsupported; assign aliases in branches"
                            .into(),
                    );
                }
                if ka != kb {
                    return Err("conditional mixes buffer and number".into());
                }
                Ok((format!("(numeric_truth({test}) ? ({a}) : ({b}))"), ka))
            }
            Expr::Seq(s) => {
                let mut parts = Vec::new();
                let mut kind = Kind::Number;
                for x in &s.exprs {
                    let (p, k) = self.expr(x)?;
                    if matches!(k, Kind::Intrinsic(_)) {
                        return Err("intrinsic cannot be sequence data".into());
                    }
                    parts.push(p);
                    kind = k;
                }
                Ok((format!("({})", parts.join(", ")), kind))
            }
            Expr::Call(c) => {
                let name = self
                    .call_name(c)
                    .ok_or("dynamic or incompatible intrinsic callee")?;
                if c.args.iter().any(|a| a.spread.is_some()) {
                    return Err("spread arguments unsupported".into());
                }
                match name {
                    "allocF64" if c.args.len() == 1 => {
                        if self.loop_depth != 0 {
                            return Err("allocF64 inside loop is forbidden".into());
                        }
                        if self.owners >= 3 {
                            return Err("at most three allocF64 sites are supported".into());
                        }
                        let size = self.scalar(&c.args[0].expr)?;
                        let owner = self.owners;
                        self.owners += 1;
                        Ok((
                            format!("(owner_{owner} = numeric_alloc({size}))"),
                            Kind::Buffer,
                        ))
                    }
                    "loadF64" | "storeF64" => {
                        let store = name == "storeF64";
                        if c.args.len() != if store { 3 } else { 2 } {
                            return Err(format!("wrong arity for {name}"));
                        }
                        if store && !self.allow_store {
                            return Err(
                                "storeF64 must be a standalone expression or assignment RHS".into(),
                            );
                        }
                        for arg in &c.args {
                            self.ensure_pure(&arg.expr)?;
                        }
                        let (buffer, kind) = self.expr(&c.args[0].expr)?;
                        if kind != Kind::Buffer {
                            return Err(format!("{name} requires a numeric buffer"));
                        }
                        let index = self.scalar(&c.args[1].expr)?;
                        let cell = format!("({buffer})[(size_t)({index})]");
                        if store {
                            let value = self.scalar(&c.args[2].expr)?;
                            num(format!("({cell} = ({value}))"))
                        } else {
                            num(cell)
                        }
                    }
                    "f64Sqrt" if c.args.len() == 1 => {
                        num(format!("sqrt({})", self.scalar(&c.args[0].expr)?))
                    }
                    "failCapacity" if c.args.is_empty() => num("(abort(), 0.0)".into()),
                    _ => Err(format!("unsupported call `{name}` (or wrong arity)")),
                }
            }
            _ => Err(format!(
                "unsupported numeric residual expression: {}",
                expr_tag(e)
            )),
        }
    }
    // Return false when no path falls through.
    fn stmt(&mut self, s: &Stmt, out: &mut String) -> Result<bool> {
        match s {
            Stmt::Empty(_)=>{},
            Stmt::Expr(x)=>{let (code, kind) = self.effect_expr(&x.expr)?; if !matches!(kind, Kind::Intrinsic(_)) { out.push_str(&format!("{code};\n")); }},
            Stmt::Block(b)=>{out.push_str("{\n");let mut live=true;for s in &b.stmts {if live {live=self.stmt(s,out)?;}}out.push_str("}\n");return Ok(live);},
            Stmt::Decl(Decl::Var(v))=>for d in &v.decls {
                let Pat::Ident(i)=&d.name else {return Err("destructuring unsupported".into());};
                let n=i.id.sym.to_string();
                if let Some(x)=&d.init {let (rhs,k)=self.effect_expr(x)?;self.env.insert(n.clone(),Some(k));if !matches!(k, Kind::Intrinsic(_)) {let lhs=self.slot(&n,k);out.push_str(&format!("{lhs} = {rhs};\n"));}}
                else {self.env.entry(n).or_insert(None);}
            },
            Stmt::Return(r)=>{let x=self.scalar(r.arg.as_ref().ok_or("numeric return value required")?)?;out.push_str(&format!("numeric_result = {x}; goto numeric_cleanup;\n"));return Ok(false);},
            Stmt::If(i)=>{
                let t=self.scalar(&i.test)?;let before=self.env.clone();out.push_str(&format!("if (numeric_truth({t})) {{\n"));
                let al=self.stmt(&i.cons,out)?;let a=self.env.clone();self.env=before;out.push_str("} else {\n");
                let bl=if let Some(b)=&i.alt {self.stmt(b,out)?}else{true};let b=self.env.clone();out.push_str("}\n");
                self.env=match (al,bl) {(true,true)=>join(&a,&b),(true,false)=>a,_=>b};return Ok(al||bl);
            }
            // Capacity failure is a terminal abort, not a JS exception runtime.
            Stmt::Throw(t) if matches!(&*t.arg, Expr::Lit(Lit::Num(n)) if n.value == 0.0) => {
                out.push_str("abort();\n");
                return Ok(false);
            }
            Stmt::Throw(_) => return Err("only literal `throw 0` capacity failure is supported".into()),
            Stmt::While(w)=>return self.while_stmt(w,None,out),
            Stmt::Labeled(l)=>{
                if let Stmt::While(w)=&*l.body {return self.while_stmt(w,Some(l.label.sym.to_string()),out);}
                let end=self.fresh("end");self.frames.push(Frame{name:Some(l.label.sym.to_string()),end:end.clone(),next:None,breaks:vec![],continues:vec![]});
                let live=self.stmt(&l.body,out)?;let frame=self.frames.pop().unwrap();
                let mut exits=frame.breaks;if live {exits.push(self.env.clone());}let reachable=!exits.is_empty();
                if let Some(e)=exits.into_iter().reduce(|a,b|join(&a,&b)){self.env=e;}
                out.push_str(&format!("{end}: ;\n"));return Ok(reachable);
            }
            Stmt::Break(b)=>{
                let idx=self.frames.iter().rposition(|f|b.label.as_ref().map(|n|Some(n.sym.as_ref())==f.name.as_deref()).unwrap_or(f.next.is_some())).ok_or("unresolved break target")?;
                let f=&mut self.frames[idx];f.breaks.push(self.env.clone());out.push_str(&format!("goto {};\n",f.end));return Ok(false);
            }
            Stmt::Continue(c)=>{
                let idx=self.frames.iter().rposition(|f| f.next.is_some() && c.label.as_ref().map(|n|Some(n.sym.as_ref())==f.name.as_deref()).unwrap_or(true)).ok_or("unresolved continue target")?;
                let f=&mut self.frames[idx];f.continues.push(self.env.clone());out.push_str(&format!("goto {};\n",f.next.as_ref().unwrap()));return Ok(false);
            }
            _=>return Err("unsupported statement (only numeric declarations, blocks, if, while, labels, break, continue and return)".into()),
        }
        Ok(true)
    }
    fn while_stmt(
        &mut self,
        w: &WhileStmt,
        name: Option<String>,
        out: &mut String,
    ) -> Result<bool> {
        let initial = self.env.clone();
        let base = self.clone();
        let mut entry = initial.clone();
        // Monotone category join: each name can become unknown only once.
        for _ in 0..(initial.len() + 64) {
            *self = base.clone();
            self.env = entry.clone();
            self.loop_depth += 1;
            let next = self.fresh("loop");
            let end = self.fresh("end");
            self.frames.push(Frame {
                name: name.clone(),
                end: end.clone(),
                next: Some(next.clone()),
                breaks: vec![],
                continues: vec![],
            });
            let test = self.scalar(&w.test)?;
            let test_exit = self.env.clone();
            let mut body = String::new();
            let live = self.stmt(&w.body, &mut body)?;
            let mut frame = self.frames.pop().unwrap();
            if live {
                frame.continues.push(self.env.clone());
            }
            let new_entry = frame
                .continues
                .into_iter()
                .fold(initial.clone(), |a, b| join(&a, &b));
            if new_entry != entry {
                entry = new_entry;
                continue;
            }
            // A literal-true loop has no condition-false exit. Inventing one
            // both loses definite initialization and makes terminal loops appear
            // to fall through. Only explicit breaks can leave such a loop.
            let always_true = matches!(&*w.test, Expr::Lit(Lit::Bool(b)) if b.value)
                || matches!(&*w.test, Expr::Lit(Lit::Num(n)) if n.value != 0.0 && !n.value.is_nan());
            let mut exits = frame.breaks;
            if !always_true {
                exits.push(test_exit);
            }
            let falls_through = !exits.is_empty();
            if let Some(exit) = exits.into_iter().reduce(|a, b| join(&a, &b)) {
                self.env = exit;
            }
            self.loop_depth -= 1;
            out.push_str(&format!("{next}: ;\nif (!numeric_truth({test})) goto {end};\n{{\n{body}}}\ngoto {next};\n{end}: ;\n"));
            return Ok(falls_through);
        }
        Err("loop category inference did not converge".into())
    }
}
fn expr_tag(e: &Expr) -> &'static str {
    match e {
        Expr::Array(_) => "array",
        Expr::Object(_) => "object",
        Expr::New(_) => "constructor",
        Expr::Lit(_) => "non-numeric literal",
        _ => "outside supported subset",
    }
}
impl Emit {
    fn ensure_pure(&self, e: &Expr) -> Result<()> {
        match e {
        Expr::Ident(_) | Expr::Lit(Lit::Num(_)) | Expr::Lit(Lit::Bool(_)) => Ok(()),
        Expr::Paren(p) => self.ensure_pure(&p.expr),
        Expr::Seq(s) => {
            for e in &s.exprs {
                self.ensure_pure(e)?;
            }
            Ok(())
        }
        Expr::Unary(u) => self.ensure_pure(&u.arg),
        Expr::Bin(b) => {
            self.ensure_pure(&b.left)?;
            self.ensure_pure(&b.right)
        }
        Expr::Member(m) => {
            self.ensure_pure(&m.obj)?;
            match &m.prop {
                MemberProp::Computed(i) => self.ensure_pure(&i.expr),
                _ => Err("non-index property".into()),
            }
        }
        Expr::Cond(c) => {
            self.ensure_pure(&c.test)?;
            self.ensure_pure(&c.cons)?;
            self.ensure_pure(&c.alt)
        }
        Expr::Call(c) if matches!(self.call_name(c), Some("f64Sqrt" | "loadF64")) =>
        {
            for a in &c.args {
                self.ensure_pure(&a.expr)?;
            }
            Ok(())
        }
        _ => Err(
            "side effects within unsequenced C operands are unsupported; use separate statements"
                .into(),
        ),
    }
    }
}

fn reject_pc_access<N: swc_ecma_visit::VisitWith<PcAccess>>(node: &N, pc: &str) -> Result<()> {
    let mut visitor = PcAccess {
        name: pc.to_owned(),
        found: false,
    };
    node.visit_with(&mut visitor);
    if visitor.found {
        Err("trampoline PC may only appear in literal terminal assignments".into())
    } else {
        Ok(())
    }
}
struct PcAccess {
    name: String,
    found: bool,
}
impl swc_ecma_visit::Visit for PcAccess {
    fn visit_ident(&mut self, ident: &Ident) {
        if ident.sym.as_ref() == self.name {
            self.found = true;
        }
    }
}

fn block_id(e: &Expr) -> Result<u64> {
    match e {
        Expr::Lit(Lit::Num(n))
            if n.value.is_finite()
                && n.value >= 0.0
                && n.value.fract() == 0.0
                && n.value < 9007199254740992.0 =>
        {
            Ok(n.value as u64)
        }
        _ => Err("trampoline targets must be nonnegative integer literals".into()),
    }
}

impl Emit {
    fn cfg_sequence(
        &mut self,
        stmts: &[Stmt],
        pc: &str,
        entry: u64,
        ids: &BTreeSet<u64>,
        edges: &mut Vec<(u64, Env)>,
        out: &mut String,
    ) -> Result<bool> {
        let mut live = true;
        for s in stmts {
            if !live {
                if matches!(s, Stmt::Break(b) if b.label.is_none()) || matches!(s, Stmt::Empty(_)) {
                    continue;
                }
                return Err("trampoline has executable statements after terminal transfer".into());
            }
            live = self.cfg_stmt(s, pc, entry, ids, edges, out)?;
        }
        Ok(live)
    }
    fn cfg_stmt(
        &mut self,
        s: &Stmt,
        pc: &str,
        entry: u64,
        ids: &BTreeSet<u64>,
        edges: &mut Vec<(u64, Env)>,
        out: &mut String,
    ) -> Result<bool> {
        match s {
            Stmt::Expr(e) if matches!(&*e.expr, Expr::Assign(a) if matches!(&a.left, AssignTarget::Simple(SimpleAssignTarget::Ident(i)) if i.id.sym.as_ref() == pc)) =>
            {
                let Expr::Assign(a) = &*e.expr else {
                    unreachable!()
                };
                if a.op != AssignOp::Assign {
                    return Err("trampoline PC update must be a literal assignment".into());
                }
                let target = block_id(&a.right)?;
                if target == entry {
                    return Err("trampoline may not jump back to allocation entry".into());
                }
                if !ids.contains(&target) {
                    return Err(format!("trampoline target {target} has no case"));
                }
                edges.push((target, self.env.clone()));
                out.push_str(&format!("goto numeric_block_{target};\n"));
                Ok(false)
            }
            Stmt::Block(b) => self.cfg_sequence(&b.stmts, pc, entry, ids, edges, out),
            Stmt::If(i) => {
                reject_pc_access(&*i.test, pc)?;
                let t = self.scalar(&i.test)?;
                let before = self.env.clone();
                out.push_str(&format!("if (numeric_truth({t})) {{\n"));
                let al = self.cfg_stmt(&i.cons, pc, entry, ids, edges, out)?;
                let a = self.env.clone();
                self.env = before;
                out.push_str("} else {\n");
                let bl = if let Some(b) = &i.alt {
                    self.cfg_stmt(b, pc, entry, ids, edges, out)?
                } else {
                    true
                };
                let b = self.env.clone();
                out.push_str("}\n");
                self.env = match (al, bl) {
                    (true, true) => join(&a, &b),
                    (true, false) => a,
                    _ => b,
                };
                Ok(al || bl)
            }
            Stmt::Break(_)
            | Stmt::Continue(_)
            | Stmt::For(_)
            | Stmt::While(_)
            | Stmt::Switch(_)
            | Stmt::Labeled(_) => {
                Err("unsupported control flow inside residual trampoline case".into())
            }
            _ => {
                reject_pc_access(s, pc)?;
                self.stmt(s, out)
            }
        }
    }
    /// Recognize only the code generator's outer PC trampoline. Its case graph
    /// becomes C labels and direct gotos; the PC never exists at runtime.
    fn trampoline(&mut self, statements: &[Stmt], out: &mut String) -> Result<bool> {
        let Some(Stmt::For(f)) = statements.last() else {
            return Ok(false);
        };
        if f.init.is_some() || f.test.is_some() || f.update.is_some() {
            return Err("only unconditional residual trampoline for-loop is supported".into());
        }
        let Stmt::Block(body) = &*f.body else {
            return Err("trampoline requires a block".into());
        };
        let [Stmt::Switch(sw)] = &body.stmts[..] else {
            return Err("trampoline requires exactly one switch".into());
        };
        let Expr::Ident(pc_ident) = &*sw.discriminant else {
            return Err("trampoline switch requires a PC identifier".into());
        };
        let pc = pc_ident.sym.to_string();
        let mut entry = None;
        for statement in &statements[..statements.len() - 1] {
            let Stmt::Decl(Decl::Var(v)) = statement else {
                return Err("trampoline prelude must contain only declarations".into());
            };
            for d in &v.decls {
                let Pat::Ident(i) = &d.name else {
                    return Err("trampoline prelude destructuring is unsupported".into());
                };
                if i.id.sym.as_ref() == pc {
                    if entry.is_some() {
                        return Err("duplicate trampoline PC declaration".into());
                    }
                    entry = Some(block_id(
                        d.init
                            .as_deref()
                            .ok_or("trampoline PC needs literal initialization")?,
                    )?);
                } else {
                    if d.init.is_some() {
                        return Err("trampoline non-PC prelude initializers are unsupported".into());
                    }
                    self.env.entry(i.id.sym.to_string()).or_insert(None);
                }
            }
        }
        let entry = entry.ok_or("trampoline PC initializer missing")?;
        let mut cases = BTreeMap::new();
        for case in &sw.cases {
            let id = block_id(
                case.test
                    .as_deref()
                    .ok_or("trampoline default case unsupported")?,
            )?;
            if cases.insert(id, &case.cons).is_some() {
                return Err("duplicate trampoline case".into());
            }
        }
        if !cases.contains_key(&entry) {
            return Err("trampoline entry case missing".into());
        }
        let ids = cases.keys().copied().collect::<BTreeSet<_>>();
        let base = self.clone();
        let mut incoming = BTreeMap::from([(entry, self.env.clone())]);
        let mut pending = std::collections::VecDeque::from([entry]);
        let mut generated = BTreeMap::new();
        let mut owner_count = 0;
        // Forward definite-category dataflow, including every reachable backedge.
        // Unknown joins are accepted only if overwritten before the next read.
        while let Some(id) = pending.pop_front() {
            let mut block = base.clone();
            block.env = incoming[&id].clone();
            block.loop_depth = if id == entry { 0 } else { 1 };
            block.owners = if id == entry { 0 } else { owner_count };
            let mut edges = Vec::new();
            let mut code = String::new();
            let live = block
                .cfg_sequence(cases[&id], &pc, entry, &ids, &mut edges, &mut code)
                .map_err(|e| format!("trampoline case {id}: {e}"))?;
            if live {
                return Err(format!(
                    "trampoline case {id} falls through without a literal jump or return"
                ));
            }
            if id == entry {
                owner_count = block.owners;
            }
            self.slots.extend(block.slots);
            generated.insert(id, code);
            for (target, env) in edges {
                let next = incoming
                    .get(&target)
                    .map(|old| join(old, &env))
                    .unwrap_or(env);
                if incoming.get(&target) != Some(&next) {
                    incoming.insert(target, next);
                    pending.push_back(target);
                }
            }
        }
        // Do not silently accept malformed unreachable residual cases.
        if generated.len() != cases.len() {
            return Err("trampoline has unreachable cases; prune them before C emission".into());
        }
        self.owners = owner_count;
        out.push_str(&format!("goto numeric_block_{entry};\n"));
        for (id, code) in generated {
            out.push_str(&format!("numeric_block_{id}: ;\n{code}"));
        }
        Ok(true)
    }
}

/// Compile one residual `function main(input)` to independent C11 + libm.
/// Define NUMERIC_STANDALONE to build a CLI accepting one numeric argument.
pub fn to_c(source: &str) -> Result<String> {
    let module = js_frontend::parse(source)?;
    let mut main = None;
    for item in &module.body {
        match item {
            ModuleItem::Stmt(Stmt::Decl(Decl::Fn(f)))
                if f.ident.sym == *"main" && main.is_none() =>
            {
                main = Some(&f.function)
            }
            ModuleItem::Stmt(Stmt::Empty(_)) => {}
            _ => return Err("expected exactly one top-level function main(input)".into()),
        }
    }
    let f = main.ok_or("missing main function")?;
    if f.is_async || f.is_generator || f.params.len() != 1 {
        return Err("main must be a synchronous function with one numeric parameter".into());
    }
    let Pat::Ident(param) = &f.params[0].pat else {
        return Err("main parameter must be an identifier".into());
    };
    let mut em = Emit::default();
    let pname = param.id.sym.to_string();
    em.env.insert(pname.clone(), Some(Kind::Number));
    let input = em.slot(&pname, Kind::Number);
    let mut body = String::new();
    let statements = &f.body.as_ref().ok_or("main has no body")?.stmts;
    let mut live = !em.trampoline(statements, &mut body)?;
    if live {
        for s in statements {
            if live {
                live = em.stmt(s, &mut body)?;
            }
        }
    }
    if live {
        return Err("main may fall through without returning a number".into());
    }
    let mut out=String::from("/* Numeric-only residual. Indices must be integral and in bounds. */\n#include <stdlib.h>\n#include <stdint.h>\n#include <stddef.h>\n#include <stdio.h>\n#include <math.h>\nstatic int numeric_truth(double x) { return x != 0.0 && !isnan(x); }\nstatic double *numeric_alloc(double n) {\n  if (!isfinite(n) || n <= 0 || floor(n) != n || n >= (double)(SIZE_MAX / sizeof(double))) abort();\n  double *p = (double *)calloc((size_t)n, sizeof(double));\n  if (!p) abort();\n  return p;\n}\ndouble numeric_main(double input) {\ndouble numeric_result;\n");
    for (n, p) in em.slots.clone() {
        let k = if p { Kind::Buffer } else { Kind::Number };
        let slot = em.slot(&n, k);
        out.push_str(&format!(
            "{} {slot};\n",
            if p { "double *" } else { "double" }
        ));
    }
    for i in 0..em.owners {
        out.push_str(&format!("double *owner_{i} = NULL;\n"));
    }
    out.push_str(&format!("{input} = input;\n{body}numeric_cleanup: ;\n"));
    for i in 0..em.owners {
        out.push_str(&format!("free(owner_{i});\n"));
    }
    out.push_str("return numeric_result;\n}\n#ifdef NUMERIC_STANDALONE\nint main(int argc, char **argv) {\n  if (argc != 2) { fprintf(stderr, \"usage: %s number\\n\", argv[0]); return 2; }\n  char *end; double x = strtod(argv[1], &end);\n  if (end == argv[1] || *end) return 2;\n  printf(\"%.17g\\n\", numeric_main(x)); return 0;\n}\n#endif\n");
    Ok(out)
}
#[cfg(test)]
mod tests {
    use super::*;
    fn compile_run(source: &str, input: &str) -> String {
        use std::process::Command;
        use std::sync::atomic::{AtomicUsize, Ordering};
        static NEXT: AtomicUsize = AtomicUsize::new(0);
        let dir = std::env::temp_dir().join(format!(
            "numeric-c-test-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        std::fs::create_dir_all(&dir).unwrap();
        let c = dir.join("test.c");
        let exe = dir.join("test");
        std::fs::write(&c, to_c(source).unwrap()).unwrap();
        let built = Command::new("cc")
            .args(["-std=c11", "-O2", "-DNUMERIC_STANDALONE"])
            .arg(&c)
            .arg("-lm")
            .arg("-o")
            .arg(&exe)
            .output()
            .unwrap();
        assert!(
            built.status.success(),
            "{}",
            String::from_utf8_lossy(&built.stderr)
        );
        let result = Command::new(&exe).arg(input).output().unwrap();
        assert!(result.status.success());
        std::fs::remove_dir_all(&dir).unwrap();
        String::from_utf8(result.stdout).unwrap().trim().to_owned()
    }
    #[test]
    fn executes_c_numeric_loop() {
        assert_eq!(compile_run("function main(n){var a=allocF64(4);var b=a;a=0;outer:while(n>0){n=n-1;if(n==2)continue outer;b[0]=b[0]+n;a=a+1;}return b[0]+a;}", "5"), "12");
    }
    #[test]
    fn executes_c_nan_truth_and_cleanup() {
        assert_eq!(compile_run("function main(n){var a=allocF64(4);if(NaN)return 100;a[0]=f64Sqrt(n);return a[0];}", "9"), "3");
    }
    #[test]
    fn loop_category_reuse() {
        assert_eq!(compile_run("function main(n){var a=allocF64(4);var x=a;var sum=0;while(n>0){x=a;x[0]=n;x=n;sum=sum+x;n=n-1;}return sum;}", "5"), "15");
    }
    #[test]
    fn capacity_throw_is_terminal_abort() {
        let source =
            "function main(n){if(n<0)throw 0;var sum=0;while(n>0){sum=sum+n;n=n-1;}return sum;}";
        let c = to_c(source).unwrap();
        assert!(c.contains("abort();\n} else {"));
        assert_eq!(compile_run(source, "5"), "15");
        assert!(to_c("function main(n){throw n;}").is_err());
        assert!(to_c("function main(n){throw 1;}").is_err());
    }
    #[test]
    fn trampoline_direct_gotos() {
        let source = "function main(n){let a,x;let __pc=0;for(;;){switch(__pc){case 0:{a=allocF64(4);x=0;__pc=1;break;}case 1:{if(n>0){__pc=2;}else{__pc=3;}break;}case 2:{a[0]=a[0]+n;n=n-1;__pc=1;break;}case 3:{return a[0];}}}}";
        let c = to_c(source).unwrap();
        assert!(c.contains("goto numeric_block_1"));
        assert!(!c.contains("switch"));
        assert!(!c.contains("__pc"));
        assert_eq!(compile_run(source, "5"), "15");
        assert!(to_c(&source.replace("__pc=1;", "__pc=n;")).is_err());
        assert!(to_c(&source.replace("__pc=1;", "__pc=99;")).is_err());
        assert!(to_c(&source.replace("__pc=1;", "__pc=0;")).is_err());
        assert!(to_c(&source.replace("a[0]=a[0]+n;", "x=__pc;a[0]=a[0]+n;")).is_err());
        assert!(to_c(&source.replace("a[0]=a[0]+n;", "(__pc=1,x=2);a[0]=a[0]+n;")).is_err());
    }
    #[test]
    fn typed_memory_intrinsics() {
        let source = "function main(n){var a=allocF64(4);var x=storeF64(a,0,n);storeF64(a,1,x+1);return loadF64(a,0)+loadF64(a,1);}";
        let c = to_c(source).unwrap();
        assert!(!c.contains("loadF64"));
        assert!(!c.contains("storeF64"));
        assert_eq!(compile_run(source, "5"), "11");
        assert!(to_c("function main(n){var a=allocF64(4);return 1+storeF64(a,0,n);}").is_err());
        assert!(to_c("function main(n){return loadF64(n,0);}").is_err());
        assert!(to_c(
            "function main(n){var a=allocF64(4);storeF64(a,0,storeF64(a,0,n));return 0;}"
        )
        .is_err());
    }
    #[test]
    fn trampoline_typed_memory() {
        let source = "function main(n){let a,x;let __pc=0;for(;;){switch(__pc){case 0:{a=allocF64(4);__pc=1;break;}case 1:{if(n>0){__pc=2;}else{__pc=3;}break;}case 2:{x=loadF64(a,0);storeF64(a,0,x+n);n=n-1;__pc=1;break;}case 3:{return loadF64(a,0);}}}}";
        assert_eq!(compile_run(source, "5"), "15");
    }
    #[test]
    fn intrinsic_aliases_are_compile_time_only() {
        let source = "function main(n){var make=allocF64;var a=make(4);var s=storeF64;s(a,0,n);var r=loadF64;r=r(a,0);var q=Math.sqrt;return q(r);}";
        let c = to_c(source).unwrap();
        assert!(!c.contains("loadF64"));
        assert!(!c.contains("storeF64"));
        assert_eq!(compile_run(source, "9"), "3");
        assert!(to_c("function main(n){var x=loadF64;return x;}").is_err());
        assert!(to_c(
            "function main(n){var a=allocF64(4);var x=loadF64;if(n)x=storeF64;return x(a,0);}"
        )
        .is_err());
        assert!(
            to_c("function main(n){var a=allocF64(4);var s=storeF64;return 1+s(a,0,n);}").is_err()
        );
        assert_eq!(compile_run("function main(n){var a=allocF64(4);storeF64(a,0,n);var r=loadF64;return r(a,0)+r(a,0);}","3"),"6");
    }
    #[test]
    fn trampoline_intrinsic_alias() {
        let source = "function main(n){let a,f,x;let __pc=0;for(;;){switch(__pc){case 0:{a=allocF64(4);f=storeF64;__pc=1;break;}case 1:{f(a,0,n);f=loadF64;__pc=2;break;}case 2:{f=f(a,0);return f;}}}}";
        assert_eq!(compile_run(source, "5"), "5");
    }
    #[test]
    fn literal_true_loops_have_only_real_exits() {
        assert_eq!(
            compile_run(
                "function main(n){while(true){if(n>0){n=n-1;continue;}return n;}}",
                "3"
            ),
            "0"
        );
        assert_eq!(
            compile_run(
                "function main(n){var x;while(true){while(true){x=n;break;}break;}return x;}",
                "7"
            ),
            "7"
        );
        assert!(to_c("function main(n){var x;while(n){x=n;break;}return x;}").is_err());
        assert!(
            to_c("function main(n){var x;while(true){if(n)break;x=1;break;}return x;}").is_err()
        );
    }
    #[test]
    fn numeric_loop() {
        let c = to_c("function main(n) { var x=0; while(n>0){x=x+n;n=n-1;}return x;}").unwrap();
        assert!(c.contains("goto loop_"));
        assert!(!c.contains("partial_runtime"));
    }
    #[test]
    fn buffer_alias_and_split() {
        let c =
            to_c("function main(n){var x=allocF64(4);var y=x;x=2;y[0]=x+n;return y[0];}").unwrap();
        assert!(c.contains("free(owner_0)"));
        assert!(c.contains("v_78_p"));
        assert!(c.contains("v_78_n"));
    }
    #[test]
    fn reject_tagged() {
        for s in [
            "function main(n){return [n];}",
            "function main(n){return {x:n};}",
            "function main(n){return new Foo(n);}",
        ] {
            assert!(to_c(s).is_err());
        }
    }
    #[test]
    fn reject_join() {
        assert!(to_c("function main(n){var x=0;if(n){x=allocF64(2);}return x;}").is_err());
    }
    #[test]
    fn reject_loop_allocation() {
        assert!(to_c("function main(n){while(n){var x=allocF64(2);n=n-1;}return 0;}").is_err());
    }
    #[test]
    fn labels() {
        to_c("function main(n){outer:{while(n>0){if(n==2)break outer;n=n-1;continue;}}return n;}")
            .unwrap();
    }
}
