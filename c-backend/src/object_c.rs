//! Typed object-intrinsic residual -> C. Guest function bodies come from specialization, never an AST evaluator.
//! Contract: buffer indices are finite nonnegative integers within allocation
//! bounds. Locals have function scope (residual code must not shadow names).
use std::collections::{BTreeMap, BTreeSet};
use swc_ecma_ast::*;

type Result<T> = std::result::Result<T, String>;
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
enum Kind {
    Number,
    Buffer,
    Value,
    Values,
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
    slots: BTreeSet<(String, Kind)>,
    frames: Vec<Frame>,
    serial: usize,
    owners: usize,
    loop_depth: usize,
    allow_store: bool,
    signatures: BTreeMap<String, Signature>,
    return_kind: Option<Kind>,
    arg_arrays: BTreeMap<String, usize>,
    /// Inside a generated guest function, whose frame is native parameters.
    guest: bool,
    /// What the emitted code does to Value locals, in execution order.
    events: Vec<Ev>,
    /// Value locals touched where C leaves evaluation order unspecified
    /// around a collection point; they are rooted without consulting liveness.
    forced: BTreeSet<String>,
    /// Where the Value vector most recently produced by `expr` came from.
    origin: Option<Origin>,
    /// Every assignment of a vector to a vector local.
    flows: Vec<(String, Origin)>,
    /// Whole-program facts gathered while emitting. They only grow, so facts
    /// recorded by a discarded dataflow iteration remain sound.
    facts: std::rc::Rc<std::cell::RefCell<Facts>>,
}
/// What a Value vector can be: one of this activation's automatic argument
/// vectors, whatever a vector local holds, or storage owned elsewhere.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
enum Origin {
    Vector(String),
    Local(String),
    Elsewhere,
    Either(Box<Origin>, Box<Origin>),
}
/// One step of a function's emitted code, as far as collection roots care.
/// Names are C locals holding a Value or a Value vector.
#[derive(Clone, Debug, PartialEq, Eq)]
enum Ev {
    Def(String),
    Use(String),
    /// A call that may collect.
    Safe,
    /// A call to the named generated function, which may collect if it can.
    SafeIf(String),
    If,
    Else,
    EndIf,
    Label(String),
    Goto(String),
    CondGoto(String),
    Exit,
}
/// Follows an assignment to a Value local; replaced, once liveness is known,
/// by a store to the local's root slot or by nothing.
const ROOT_OPEN: char = '\u{1}';
const ROOT_CLOSE: char = '\u{2}';
fn root_mark(local: &str) -> String {
    format!("{ROOT_OPEN}{local}{ROOT_CLOSE}")
}
#[derive(Default)]
struct Facts {
    /// Distinct string literals, emitted once as static cells.
    strings: Vec<Vec<u16>>,
    /// The literal that spells each registered property atom.
    atom_names: BTreeMap<usize, usize>,
    /// Module-level `var name = "text"` declarations: string literals the
    /// specializer shares between functions.
    shared_strings: BTreeMap<String, String>,
    /// One more than the largest property atom or slot request.
    atoms: usize,
    /// Literal `(is_f64, id, size)` shared-buffer requests.
    shared: BTreeSet<(bool, u32, u64)>,
    /// Some shared-buffer request was not a pair of literals.
    shared_dynamic: bool,
}
/// The text of a string the specializer left as a literal, as one of the
/// module-level literals it shares between functions, or as a concatenation
/// of those. `local` says whether a name is bound in the function instead.
fn constant_string(
    e: &Expr,
    shared: &BTreeMap<String, String>,
    local: &dyn Fn(&str) -> bool,
) -> Option<String> {
    match e {
        Expr::Paren(p) => constant_string(&p.expr, shared, local),
        Expr::Lit(Lit::Str(s)) => s.value.as_str().map(str::to_owned),
        Expr::Ident(name) if !local(name.sym.as_ref()) => shared.get(name.sym.as_ref()).cloned(),
        Expr::Bin(b) if b.op == BinaryOp::Add => {
            let mut text = constant_string(&b.left, shared, local)?;
            text.push_str(&constant_string(&b.right, shared, local)?);
            Some(text)
        }
        _ => None,
    }
}
fn literal_index(e: &Expr, limit: f64) -> Option<u64> {
    match e {
        Expr::Paren(p) => literal_index(&p.expr, limit),
        Expr::Lit(Lit::Num(n))
            if n.value.is_finite()
                && n.value >= 0.0
                && n.value.fract() == 0.0
                && n.value <= limit =>
        {
            Some(n.value as u64)
        }
        _ => None,
    }
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
    fn used(&mut self, local: &str, kind: Kind) {
        if matches!(kind, Kind::Value | Kind::Values) {
            self.events.push(Ev::Use(local.to_owned()));
        }
        if kind == Kind::Values {
            self.origin = Some(Origin::Local(local.to_owned()));
        }
    }
    /// Record an assignment and return the marker to place after it.
    fn defined(&mut self, local: &str, kind: Kind) -> String {
        match kind {
            Kind::Value => {
                self.events.push(Ev::Def(local.to_owned()));
                root_mark(local)
            }
            Kind::Values => {
                // The vector assigned is the one the right-hand side produced.
                let origin = self.origin.take().unwrap_or(Origin::Elsewhere);
                self.flows.push((local.to_owned(), origin));
                self.events.push(Ev::Def(local.to_owned()));
                self.origin = Some(Origin::Local(local.to_owned()));
                String::new()
            }
            _ => String::new(),
        }
    }
    /// The code emitted since `start` has operands C may evaluate in any
    /// order. If one of them can collect, liveness computed for one order
    /// does not cover the others, so every Value local involved is rooted.
    fn unsequenced(&mut self, start: usize) {
        if self.events[start..]
            .iter()
            .any(|e| matches!(e, Ev::Safe | Ev::SafeIf(_)))
        {
            for e in &self.events[start..] {
                if let Ev::Def(n) | Ev::Use(n) = e {
                    self.forced.insert(n.clone());
                }
            }
        }
    }
    fn fresh(&mut self, prefix: &str) -> String {
        self.serial += 1;
        format!("{prefix}_{}", self.serial)
    }
    fn slot(&mut self, name: &str, kind: Kind) -> String {
        self.slots.insert((name.to_owned(), kind));
        let n: String = name.as_bytes().iter().map(|x| format!("{x:02x}")).collect();
        format!(
            "v_{n}_{}",
            match kind {
                Kind::Number => "n",
                Kind::Buffer => "p",
                Kind::Value => "v",
                Kind::Values => "a",
                Kind::Intrinsic(_) => "i",
            }
        )
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
                intrinsic_name(i.sym.as_ref())
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
        self.allow_store = matches!(
            self.expression_call_name(e),
            Some(
                "storeF64" | "storeValue" | "objSet" | "objSetOwn" | "objSetSlot" | "objSetAt" | "objAddKnown"
                    | "shapeDeclare" | "shapeNote" | "arrSet" | "arrPush"
                    | "arrAppendAll" | "objSetProto"
                    | "objSetIndex" | "envSet" | "keyedSet" | "objDefine" | "atomName"
            )
        );
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
            match intrinsic_name(n) {
                Some(name) => Kind::Intrinsic(name),
                None => return Err(format!("unknown identifier `{n}`")),
            }
        };
        if matches!(k, Kind::Intrinsic(_)) {
            Ok((String::new(), k))
        } else {
            let local = self.slot(n, k);
            self.used(&local, k);
            Ok((local, k))
        }
    }
    fn expr(&mut self, e: &Expr) -> Result<(String, Kind)> {
        let num = |s| Ok((s, Kind::Number));
        match e {
            Expr::Array(a) => {
                let name = format!("oc_args_{}", a.span.lo.0);
                let mut writes = Vec::new();
                for (i, e) in a.elems.iter().enumerate() {
                    let e = e
                        .as_ref()
                        .ok_or("Value argument vectors cannot contain holes")?;
                    if e.spread.is_some() {
                        return Err("Value argument spread unsupported".into());
                    }
                    self.ensure_pure(&e.expr)?;
                    let (x, k) = self.expr(&e.expr)?;
                    if k != Kind::Value {
                        return Err("argument vector elements must be Value".into());
                    }
                    writes.push(format!("{name}[{i}]=({x})"));
                }
                self.arg_arrays.insert(name.clone(), a.elems.len());
                self.origin = Some(Origin::Vector(name.clone()));
                writes.push(format!("(oc_values){{{name},{}}}", a.elems.len()));
                Ok((format!("({})", writes.join(",")), Kind::Values))
            }
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
                let start = self.events.len();
                let a = self.scalar(&b.left)?;
                let z = self.scalar(&b.right)?;
                self.unsequenced(start);
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
                    Exp => format!("oc_pow(({a}), ({z}))"),
                    LogicalAnd => format!("(numeric_truth({a}) ? ({z}) : ({a}))"),
                    LogicalOr => format!("(numeric_truth({a}) ? ({a}) : ({z}))"),
                    _ => return Err(format!("unsupported binary operator {:?}", b.op)),
                })
            }
            Expr::Member(m) => {
                if let Some(name) = self.intrinsic_name(e) {
                    return Ok((String::new(), Kind::Intrinsic(name)));
                }
                let start = self.events.len();
                let (a, k) = self.expr(&m.obj)?;
                let element = match k {
                    Kind::Buffer => Kind::Number,
                    Kind::Values => Kind::Value,
                    _ => return Err("indexed read requires typed buffer".into()),
                };
                if k == Kind::Values && matches!(&m.prop,MemberProp::Ident(i) if i.sym==*"length") {
                    return num(format!("(double)({a}).length"));
                }

                let MemberProp::Computed(i) = &m.prop else {
                    return Err("ordinary property access is unsupported".into());
                };
                self.ensure_pure(&i.expr)?;
                let i = self.scalar(&i.expr)?;
                self.unsequenced(start);
                Ok((
                    if k == Kind::Values {
                        format!("({a}).data[(size_t)({i})]")
                    } else {
                        format!("({a})[(size_t)({i})]")
                    },
                    element,
                ))
            }
            Expr::Assign(a) => {
                // Reject unsequenced nested writes such as x = x++.
                // Allocation and a sequenced numeric store may be standalone RHS intrinsics.
                if !matches!(&*a.right, Expr::Call(_)) {
                    self.ensure_pure(&a.right)?;
                } else if !matches!(&a.left, AssignTarget::Simple(SimpleAssignTarget::Ident(_))) {
                    return Err("effectful call RHS requires a simple local assignment".into());
                }
                if matches!(
                    self.expression_call_name(&a.right),
                    Some("storeF64" | "storeValue")
                ) && (!matches!(&a.left, AssignTarget::Simple(SimpleAssignTarget::Ident(_)))
                    || a.op != AssignOp::Assign)
                {
                    return Err("storeF64 RHS requires simple scalar variable assignment".into());
                }
                let start = self.events.len();
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
                let mut mark = String::new();
                let lhs = match &a.left {
                    AssignTarget::Simple(SimpleAssignTarget::Ident(i)) => {
                        let n = i.id.sym.to_string();
                        if a.op != AssignOp::Assign && self.env.get(&n) != Some(&Some(k)) {
                            return Err("compound assignment changes category".into());
                        }
                        self.env.insert(n.clone(), Some(k));
                        let local = self.slot(&n, k);
                        mark = self.defined(&local, k);
                        local
                    }
                    AssignTarget::Simple(SimpleAssignTarget::Member(m)) => {
                        self.ensure_pure(&m.obj)?;
                        if let MemberProp::Computed(i) = &m.prop {
                            self.ensure_pure(&i.expr)?;
                        }
                        let (lhs, element) = self.expr(&Expr::Member(m.clone()))?;
                        if element != k {
                            return Err("typed buffer store category mismatch".into());
                        }
                        self.unsequenced(start);
                        lhs
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
                if k != Kind::Number && a.op != AssignOp::Assign {
                    return Err("arithmetic on buffer pointers is unsupported".into());
                }
                Ok((format!("({lhs} {op} ({rhs}){mark})"), k))
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
                self.events.push(Ev::If);
                self.origin = None;
                let (a, ka) = self.expr(&c.cons)?;
                let first = self.origin.take().unwrap_or(Origin::Elsewhere);
                let left = self.env.clone();
                self.env = before;
                self.events.push(Ev::Else);
                let (b, kb) = self.expr(&c.alt)?;
                self.events.push(Ev::EndIf);
                let second = self.origin.take().unwrap_or(Origin::Elsewhere);
                if ka == Kind::Values {
                    self.origin = Some(Origin::Either(Box::new(first), Box::new(second)));
                }
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
            Expr::Call(c) => self.emit_call(c),
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
            Stmt::Expr(x)=>{let (code, kind) = self.effect_expr(&x.expr)?; if !matches!(kind, Kind::Intrinsic(_)) { out.push_str(&format!("(void)({code});\n")); }},
            Stmt::Block(b)=>{out.push_str("{\n");let mut live=true;for s in &b.stmts {if live {live=self.stmt(s,out)?;}}out.push_str("}\n");return Ok(live);},
            Stmt::Decl(Decl::Var(v))=>for d in &v.decls {
                let Pat::Ident(i)=&d.name else {return Err("destructuring unsupported".into());};
                let n=i.id.sym.to_string();
                if let Some(x)=&d.init {let (rhs,k)=self.effect_expr(x)?;self.env.insert(n.clone(),Some(k));if !matches!(k, Kind::Intrinsic(_)) {let lhs=self.slot(&n,k);let mark=self.defined(&lhs,k);out.push_str(&format!("{lhs} = {rhs}{mark};\n"));}}
                else {self.env.entry(n).or_insert(None);}
            },
            Stmt::Return(r)=>{let (x,k)=self.expr(r.arg.as_ref().ok_or("explicit return value required")?)?;if Some(k)!=self.return_kind{return Err("inconsistent return category".into());}self.events.push(Ev::Exit);out.push_str(&format!("numeric_result = {x}; goto numeric_cleanup;\n"));return Ok(false);},
            Stmt::If(i)=>{
                let t=self.scalar(&i.test)?;let before=self.env.clone();out.push_str(&format!("if (numeric_truth({t})) {{\n"));self.events.push(Ev::If);
                let al=self.stmt(&i.cons,out)?;let a=self.env.clone();self.env=before;out.push_str("} else {\n");self.events.push(Ev::Else);
                let bl=if let Some(b)=&i.alt {self.stmt(b,out)?}else{true};let b=self.env.clone();out.push_str("}\n");self.events.push(Ev::EndIf);
                self.env=match (al,bl) {(true,true)=>join(&a,&b),(true,false)=>a,_=>b};return Ok(al||bl);
            }
            // Capacity failure is a terminal abort, not a JS exception runtime.
            Stmt::Throw(t) if matches!(&*t.arg, Expr::Lit(Lit::Num(n)) if n.value == 0.0) => {
                self.events.push(Ev::Exit);
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
                self.events.push(Ev::Label(end.clone()));out.push_str(&format!("{end}: ;\n"));return Ok(reachable);
            }
            Stmt::Break(b)=>{
                let idx=self.frames.iter().rposition(|f|b.label.as_ref().map(|n|Some(n.sym.as_ref())==f.name.as_deref()).unwrap_or(f.next.is_some())).ok_or("unresolved break target")?;
                let f=&mut self.frames[idx];f.breaks.push(self.env.clone());out.push_str(&format!("goto {};\n",f.end));let target=f.end.clone();self.events.push(Ev::Goto(target));return Ok(false);
            }
            Stmt::Continue(c)=>{
                let idx=self.frames.iter().rposition(|f| f.next.is_some() && c.label.as_ref().map(|n|Some(n.sym.as_ref())==f.name.as_deref()).unwrap_or(true)).ok_or("unresolved continue target")?;
                let f=&mut self.frames[idx];f.continues.push(self.env.clone());out.push_str(&format!("goto {};\n",f.next.as_ref().unwrap()));let target=f.next.clone().unwrap();self.events.push(Ev::Goto(target));return Ok(false);
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
            self.events.push(Ev::Label(next.clone()));
            let test = self.scalar(&w.test)?;
            self.events.push(Ev::CondGoto(end.clone()));
            let test_exit = self.env.clone();
            let mut body = String::new();
            let live = self.stmt(&w.body, &mut body)?;
            self.events.push(Ev::Goto(next.clone()));
            self.events.push(Ev::Label(end.clone()));
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
        Expr::Ident(_) | Expr::Lit(Lit::Num(_)) | Expr::Lit(Lit::Bool(_)) | Expr::Lit(Lit::Str(_)) => Ok(()),
        Expr::Array(a) => {for e in a.elems.iter().flatten(){self.ensure_pure(&e.expr)?;}Ok(())},
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
                MemberProp::Ident(i) if i.sym==*"length"=>Ok(()),
                _ => Err("non-index property".into()),
            }
        }
        Expr::Cond(c) => {
            self.ensure_pure(&c.test)?;
            self.ensure_pure(&c.cons)?;
            self.ensure_pure(&c.alt)
        }
        Expr::Call(c) if self.call_name(c).map(intrinsic_is_read).unwrap_or(false) =>
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
                self.events.push(Ev::Goto(format!("numeric_block_{target}")));
                out.push_str(&format!("goto numeric_block_{target};\n"));
                Ok(false)
            }
            Stmt::Block(b) => self.cfg_sequence(&b.stmts, pc, entry, ids, edges, out),
            Stmt::If(i) => {
                reject_pc_access(&*i.test, pc)?;
                let t = self.scalar(&i.test)?;
                let before = self.env.clone();
                out.push_str(&format!("if (numeric_truth({t})) {{\n"));
                self.events.push(Ev::If);
                let al = self.cfg_stmt(&i.cons, pc, entry, ids, edges, out)?;
                let a = self.env.clone();
                self.env = before;
                out.push_str("} else {\n");
                self.events.push(Ev::Else);
                let bl = if let Some(b) = &i.alt {
                    self.cfg_stmt(b, pc, entry, ids, edges, out)?
                } else {
                    true
                };
                let b = self.env.clone();
                out.push_str("}\n");
                self.events.push(Ev::EndIf);
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
            block.events.clear();
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
            self.arg_arrays.extend(block.arg_arrays);
            self.forced.extend(block.forced);
            generated.insert(id, (code, block.events));
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
        self.events.push(Ev::Goto(format!("numeric_block_{entry}")));
        for (id, (code, events)) in generated {
            out.push_str(&format!("numeric_block_{id}: ;\n{code}"));
            self.events.push(Ev::Label(format!("numeric_block_{id}")));
            self.events.extend(events);
        }
        Ok(true)
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct Signature {
    params: Vec<Option<Kind>>,
    result: Option<Kind>,
}
fn intrinsic_name(n: &str) -> Option<&'static str> {
    const NAMES: &[&str] = &[
        "allocF64",
        "loadF64",
        "storeF64",
        "f64Sqrt",
        "failCapacity",
        "vNum",
        "vBool",
        "vNull",
        "vUndef",
        "vStr",
        "vString",
        "vNumber",
        "vTruth",
        "vIsNullish",
        "vStrictEq",
        "vLooseEq",
        "vUnary",
        "vBinary",
        "objRootProto",
        "objectRootProto",
        "objNew",
        "objGet",
        "objSet",
        "objHasOwn",
        "objProto",
        "arrayNewLength",
        "arrayNewLiteral",
        "arrGet",
        "arrSet",
        "arrHas",
        "objSetIndex",
        "fnNew",
        "fnCode",
        "fnEnv",
        "allocValues",
        "loadValue",
        "storeValue",
        "constructResult",
        "objError",
        "throwValue",
        "failCall",
        "callGuest",
        "callEnv",
        "callThis",
        "callArg",
        "callArgCount",
        "callCount",
        "sharedValues",
        "sharedF64",
        "allocArgs",
        "fnNewArrow",
        "constructReceiver",
        "objGetOwn",
        "objRequire",
        "vBinaryNumber",
        "vUnaryNumber",
        "envNew",
        "envParent",
        "envReceiver",
        "envGet",
        "envSet",
        "envCopy",
        "objGetSlot",
        "objSetOwn",
        "objSetSlot",
        "objGetAt",
        "objSetAt",
        "objAddKnown",
        "objShapeId",
        "shapeDeclare",
        "shapeNote",
        "callGuestRest",
        "atomName",
        "keyedGet",
        "keyedSet",
        "keyedHas",
        "objDefine",
        "vTypeof",
        "objInstanceOf",
        "callGuestProtected",
        "tookThrow",
        "strCharCodeAt",
        "strFromCharCode",
        "strSlice",
        "strIndexOf",
        "f64Math",
        "anyGet",
        "arrIs",
        "callGuestOneOf",
        "objGetAny",
        "arrPush",
        "arrAppendAll",
        "callGuestSpread",
        "objCreate",
        "objSetProto",
    ];
    NAMES.iter().copied().find(|x| *x == n)
}
fn intrinsic_spec(n: &str) -> (Vec<Kind>, Kind) {
    use Kind::*;
    match n {
        "sharedValues" => (vec![Number, Number], Values),
        "sharedF64" => (vec![Number, Number], Buffer),
        "callGuest" => (vec![Number, Value, Value, Values], Value),
        "callGuestRest" => (vec![Number, Value, Value, Number, Number], Value),
        "callGuestOneOf" => {
            (vec![Number, Value, Value, Values, Number, Number, Number, Number], Value)
        }
        "callGuestProtected" => (vec![Number, Value, Value, Values], Value),
        "tookThrow" => (vec![], Number),
        "strCharCodeAt" => (vec![Value, Number], Number),
        "strFromCharCode" => (vec![Number], Value),
        "strSlice" => (vec![Value, Number, Number], Value),
        "strIndexOf" => (vec![Value, Value, Number], Number),
        "f64Math" => (vec![Number, Number, Number], Number),
        "anyGet" => (vec![Value, Value], Value),
        "callArgCount" | "callCount" => (vec![Number], Number),
        "callThis" | "callEnv" => (vec![Number], Value),
        "envNew" => (vec![Value, Number, Value], Value),
        "envParent" | "envReceiver" | "envCopy" => (vec![Value], Value),
        "envGet" => (vec![Value, Number], Value),
        "envSet" => (vec![Value, Number, Value], Value),
        "callArg" => (vec![Number, Number], Value),
        "allocF64" => (vec![Number], Buffer),
        "allocValues" | "allocArgs" => (vec![Number], Values),
        "loadF64" => (vec![Buffer, Number], Number),
        "storeF64" => (vec![Buffer, Number, Number], Number),
        "loadValue" => (vec![Values, Number], Value),
        "storeValue" => (vec![Values, Number, Value], Value),
        "vNum" | "vBool" | "objRootProto" | "objectRootProto" | "arrayNewLength"
        | "arrayNewLiteral" => (vec![Number], Value),
        "vNull" | "vUndef" | "failCall" => (vec![], Value),
        "failCapacity" => (vec![], Number),
        "vNumber" | "vTruth" | "vIsNullish" | "fnCode" | "arrIs" => (vec![Value], Number),
        "fnEnv" => (vec![Value], Value),
        "vStrictEq" | "vLooseEq" => (vec![Value, Value], Number),
        "vUnary" | "vUnaryNumber" => (vec![Number, Value], Value),
        "vBinary" | "vBinaryNumber" => (vec![Number, Value, Value], Value),
        "objNew" | "objGet" | "objGetOwn" | "objGetAny" | "arrGet" => (vec![Value, Number], Value),
        "constructReceiver" => (vec![Value], Value),
        "objGetSlot" | "objGetAt" => (vec![Value, Number, Number], Value),
        "objShapeId" => (vec![Value], Number),
        "shapeDeclare" | "shapeNote" => (vec![Number, Number, Number], Value),
        "atomName" => (vec![Number, Number], Value),
        "keyedGet" => (vec![Value, Value], Value),
        "keyedSet" => (vec![Value, Value, Value], Value),
        "keyedHas" | "objInstanceOf" => (vec![Value, Value], Number),
        "arrPush" | "arrAppendAll" | "objSetProto" => (vec![Value, Value], Value),
        "objCreate" => (vec![Value], Value),
        "callGuestSpread" => (vec![Number, Value, Value, Value], Value),
        "vTypeof" => (vec![Value], Value),
        "objDefine" => (vec![Value, Value, Value, Number], Value),
        "objSetSlot" | "objSetAt" | "objAddKnown" => (vec![Value, Number, Number, Value], Value),
        "objSet" | "objSetOwn" | "arrSet" | "objSetIndex" => (vec![Value, Number, Value], Value),
        "objHasOwn" | "arrHas" => (vec![Value, Number], Number),
        "objProto" | "objError" | "objRequire" => (vec![Value], Value),
        "throwValue" => (vec![Value], Number),
        "fnNew" => (vec![Number, Value, Number, Number], Value),
        "fnNewArrow" => (vec![Number, Value], Value),
        "constructResult" => (vec![Value, Value], Value),
        "f64Sqrt" => (vec![Number], Number),
        "vStr" | "vString" => (vec![], Value),
        _ => unreachable!(),
    }
}
fn intrinsic_is_read(n: &str) -> bool {
    !matches!(
        n,
        "allocArgs"
            | "callGuest"
            | "callGuestRest"
            | "callGuestOneOf"
            | "callGuestSpread"
            | "arrPush"
            | "arrAppendAll"
            | "objCreate"
            | "objSetProto"
            | "callGuestProtected"
            | "tookThrow"
            | "strFromCharCode"
            | "strSlice"
            | "anyGet"
            | "sharedValues"
            | "sharedF64"
            | "allocF64"
            | "allocValues"
            | "storeF64"
            | "storeValue"
            | "objSet"
            | "objSetOwn"
            | "objSetSlot"
            | "objSetAt"
            | "objAddKnown"
            | "shapeDeclare"
            | "shapeNote"
            | "keyedSet"
            | "objDefine"
            | "atomName"
            | "arrSet"
            | "objSetIndex"
            | "objNew"
            | "arrayNewLength"
            | "arrayNewLiteral"
            | "fnNew"
            | "fnNewArrow"
            | "constructReceiver"
            | "throwValue"
            | "failCall"
            | "failCapacity"
            | "objError"
            | "envNew"
            | "envSet"
            | "envCopy"
    )
}
fn ryu_source(name: &str) -> String {
    let source = match name {
        "d2s.c" => include_str!("object_c_ryu/d2s.c"),
        "ryu.h" => include_str!("object_c_ryu/ryu.h"),
        "common.h" => include_str!("object_c_ryu/common.h"),
        "digit_table.h" => include_str!("object_c_ryu/digit_table.h"),
        "d2s_intrinsics.h" => include_str!("object_c_ryu/d2s_intrinsics.h"),
        "d2s_small_table.h" => include_str!("object_c_ryu/d2s_small_table.h"),
        "d2s_full_table.h" => include_str!("object_c_ryu/d2s_full_table.h"),
        _ => unreachable!(),
    };
    let mut out = String::new();
    for line in source.lines() {
        if let Some(local) = line
            .trim()
            .strip_prefix("#include \"ryu/")
            .and_then(|x| x.strip_suffix('\"'))
        {
            out.push_str(&ryu_source(local));
        } else {
            out.push_str(line);
            out.push('\n');
        }
    }
    out
}
/// Macro naming the inlining attribute chosen for a guest function once every
/// body has been generated.
fn guest_attribute(name: &str) -> String {
    match name.strip_prefix("guest_").and_then(|n| n.parse::<u32>().ok()) {
        Some(id) => format!("OC_GUEST_ATTR_{id} "),
        None => String::new(),
    }
}
/// Emitted C bytes a force-inlined callee may expand to, including the callees
/// inlined into it. Larger or recursive functions are left to the C compiler.
const INLINE_BUDGET: usize = 400_000;
/// Decide which guest functions are always inlined at their known call sites.
/// A function qualifies when it cannot reach itself through known calls and
/// its fully expanded body fits the budget. Unknown-target calls go through
/// dispatch and never inline, so they add no edges.
fn inline_attributes(bodies: &BTreeMap<String, String>) -> String {
    let ids: BTreeMap<u32, &String> = bodies
        .iter()
        .filter_map(|(n, b)| Some((n.strip_prefix("guest_")?.parse::<u32>().ok()?, b)))
        .collect();
    let sites = |body: &str| -> Vec<u32> {
        let mut out = Vec::new();
        for part in body.split("oc_call_known_").skip(1) {
            let digits: String = part.chars().take_while(|c| c.is_ascii_digit()).collect();
            if part[digits.len()..].starts_with('(') {
                if let Ok(id) = digits.parse() {
                    out.push(id);
                }
            }
        }
        out
    };
    let calls: BTreeMap<u32, Vec<u32>> = ids.iter().map(|(id, b)| (*id, sites(b))).collect();
    // None while being expanded (so a cycle is detected), then the decision.
    fn expand(
        id: u32,
        ids: &BTreeMap<u32, &String>,
        calls: &BTreeMap<u32, Vec<u32>>,
        state: &mut BTreeMap<u32, Option<Option<usize>>>,
    ) -> Option<usize> {
        match state.get(&id) {
            Some(Some(done)) => return *done,
            Some(None) => return None, // recursion
            None => {}
        }
        state.insert(id, None);
        let mut size = ids[&id].len();
        let mut recursive = false;
        for callee in &calls[&id] {
            if !ids.contains_key(callee) {
                continue;
            }
            match state.get(callee) {
                Some(None) => recursive = true,
                _ => {
                    if let Some(inner) = expand(*callee, ids, calls, state) {
                        size = size.saturating_add(inner);
                    } else if state.get(callee) == Some(&None) {
                        recursive = true;
                    }
                }
            }
        }
        let decision = (!recursive && size <= INLINE_BUDGET).then_some(size);
        state.insert(id, Some(decision));
        decision
    }
    let mut state = BTreeMap::new();
    let mut out = String::from(
        "#if (defined(__GNUC__) || defined(__clang__)) && !defined(OC_NO_FORCED_INLINING)\n#define OC_FORCE_INLINE __attribute__((always_inline))\n#define OC_NOINLINE_HOT static __attribute__((noinline))\n#else\n#define OC_FORCE_INLINE\n#define OC_NOINLINE_HOT static\n#endif\n",
    );
    for id in ids.keys() {
        let inline = expand(*id, &ids, &calls, &mut state).is_some();
        out.push_str(&format!(
            "#define OC_GUEST_ATTR_{id}{}\n",
            if inline { " OC_FORCE_INLINE" } else { "" }
        ));
        // Exactly one of the body and its outlined dispatch entry owns the
        // native activation, and that one counts nesting depth.
        let (body, entry) = if inline { ("(void)", "OC_DEPTH_") } else { ("OC_DEPTH_", "(void)") };
        for (owner, prefix) in [("GUEST", body), ("ENTRY", entry)] {
            for action in ["ENTER", "LEAVE"] {
                out.push_str(&format!(
                    "#define OC_{owner}_{action}_{id}(c) {}\n",
                    if prefix == "(void)" { "((void)(c))".to_owned() } else { format!("OC_DEPTH_{action}(c)") }
                ));
            }
        }
    }
    out
}
/// The Value locals live across some collection point: those whose current
/// value a later step may read after a step for which `safe` holds. Backward
/// liveness over the emitted control flow.
fn rooted_locals(events: &[Ev], safe: impl Fn(&Ev) -> bool) -> Result<BTreeSet<String>> {
    let mut names: BTreeMap<&str, usize> = BTreeMap::new();
    let mut labels: BTreeMap<&str, usize> = BTreeMap::new();
    let mut open = Vec::new();
    // For `If`: (index of its Else, index of its EndIf). For `Else`: its EndIf.
    let mut partner = vec![(0usize, 0usize); events.len()];
    for (i, e) in events.iter().enumerate() {
        match e {
            Ev::Def(n) | Ev::Use(n) => {
                let next = names.len();
                names.entry(n).or_insert(next);
            }
            Ev::Label(l) => {
                if labels.insert(l, i).is_some() {
                    return Err(format!("duplicate control label {l}"));
                }
            }
            Ev::If => open.push((i, usize::MAX)),
            Ev::Else => open.last_mut().ok_or("unbalanced conditional")?.1 = i,
            Ev::EndIf => {
                let (start, other) = open.pop().ok_or("unbalanced conditional")?;
                if other == usize::MAX {
                    return Err("conditional without an alternative marker".into());
                }
                partner[start] = (other, i);
                partner[other] = (i, i);
            }
            _ => {}
        }
    }
    if !open.is_empty() {
        return Err("unbalanced conditional".into());
    }
    let words = names.len().div_ceil(64).max(1);
    let end = events.len();
    let target = |l: &String| labels.get(l.as_str()).copied().ok_or(format!("missing control label {l}"));
    let mut successors: Vec<[usize; 2]> = Vec::with_capacity(end);
    for (i, e) in events.iter().enumerate() {
        successors.push(match e {
            Ev::If => [i + 1, partner[i].0 + 1],
            Ev::Else => [partner[i].0, end],
            Ev::Goto(l) => [target(l)?, end],
            Ev::CondGoto(l) => [i + 1, target(l)?],
            Ev::Exit => [end, end],
            _ => [i + 1, end],
        });
    }
    // live[i] is the set live on entry to step i; live[end] is empty.
    let mut live = vec![0u64; (end + 1) * words];
    let mut changed = true;
    let mut out = vec![0u64; words];
    while changed {
        changed = false;
        for i in (0..end).rev() {
            out.iter_mut().for_each(|w| *w = 0);
            for s in successors[i] {
                for w in 0..words {
                    out[w] |= live[s * words + w];
                }
            }
            match &events[i] {
                Ev::Def(n) => out[names[n.as_str()] / 64] &= !(1 << (names[n.as_str()] % 64)),
                Ev::Use(n) => out[names[n.as_str()] / 64] |= 1 << (names[n.as_str()] % 64),
                _ => {}
            }
            let slot = &mut live[i * words..(i + 1) * words];
            if slot != &out[..] {
                slot.copy_from_slice(&out);
                changed = true;
            }
        }
    }
    let mut rooted = BTreeSet::new();
    for (i, e) in events.iter().enumerate() {
        if !safe(e) {
            continue;
        }
        for s in successors[i] {
            for (name, bit) in &names {
                if live[s * words + bit / 64] >> (bit % 64) & 1 == 1 {
                    rooted.insert((*name).to_owned());
                }
            }
        }
    }
    Ok(rooted)
}
fn is_guest(name: &str) -> bool {
    name.strip_prefix("guest_")
        .and_then(|n| n.parse::<u32>().ok())
        .is_some()
}
const GUEST_FRAME: &str =
    ", oc_value oc_env, oc_value oc_recv, const oc_value *oc_args, size_t oc_argc";
fn c_type(k: Kind) -> &'static str {
    match k {
        Kind::Number => "double",
        Kind::Buffer => "double *",
        Kind::Value => "oc_value",
        Kind::Values => "oc_values",
        Kind::Intrinsic(_) => "void",
    }
}
fn c_fn(n: &str) -> String {
    format!(
        "oc_fn_{}",
        n.as_bytes()
            .iter()
            .map(|b| format!("{b:02x}"))
            .collect::<String>()
    )
}
impl Emit {
    fn emit_call(&mut self, c: &CallExpr) -> Result<(String, Kind)> {
        if c.args.iter().any(|a| a.spread.is_some()) {
            return Err("spread arguments unsupported".into());
        }
        if let Callee::Expr(f) = &c.callee {
            if let Expr::Ident(i) = &**f {
                if !self.env.contains_key(i.sym.as_ref()) {
                    if let Some(sig) = self.signatures.get(i.sym.as_ref()).cloned() {
                        if is_guest(i.sym.as_ref()) {
                            return Err(format!(
                                "{} has a guest frame and may only be entered through callGuest",
                                i.sym
                            ));
                        }
                        if c.args.len() != sig.params.len() {
                            return Err(format!("call arity mismatch for {}", i.sym));
                        }
                        let mut args = vec![("ctx".to_owned(), Kind::Number)];
                        let mut prefix = Vec::new();
                        for (index, (a, k)) in c.args.iter().zip(sig.params).enumerate() {
                            let (x, actual) = self.expr(&a.expr)?;
                            if Some(actual) != k {
                                return Err(format!(
                                    "call argument category mismatch for {}",
                                    i.sym
                                ));
                            }
                            let tmp =
                                self.slot(&format!("@call/{}/{}", c.span.lo.0, index), actual);
                            let mark = self.defined(&tmp, actual);
                            prefix.push(format!("{tmp}=({x}){mark}"));
                            args.push((tmp, actual));
                        }
                        for (tmp, kind) in &args[1..] {
                            self.used(tmp, *kind);
                            // A helper may read a vector it is handed at any
                            // point, so the vector stays rooted throughout.
                            if *kind == Kind::Values {
                                self.forced.insert(tmp.clone());
                            }
                        }
                        self.origin = None;
                        self.events.push(Ev::SafeIf(i.sym.to_string()));
                        let call = format!(
                            "{}({})",
                            c_fn(i.sym.as_ref()),
                            args.iter().map(|a| a.0.as_str()).collect::<Vec<_>>().join(", ")
                        );
                        prefix.push(call);
                        return Ok((
                            format!("({})", prefix.join(",")),
                            sig.result.ok_or("unknown function result category")?,
                        ));
                    }
                }
            }
        }
        let n = self.call_name(c).ok_or_else(|| {
            let callee = match &c.callee {
                Callee::Expr(e) => match &**e {
                    Expr::Ident(i) => format!("`{}` ({:?})", i.sym, self.env.get(i.sym.as_ref())),
                    other => expr_tag(other).to_owned(),
                },
                _ => "non-expression".to_owned(),
            };
            format!("dynamic or incompatible intrinsic callee {callee} with {} arguments", c.args.len())
        })?;
        if n == "callGuest" {
            if c.args.len() != 4 {
                return Err(
                    "callGuest requires code, env, receiver, and Value argument vector".into(),
                );
            }
            let mut args = Vec::new();
            let mut prefix = Vec::new();
            for (index, (a, k)) in c
                .args
                .iter()
                .zip([Kind::Number, Kind::Value, Kind::Value, Kind::Values])
                .enumerate()
            {
                let (x, actual) = self.expr(&a.expr)?;
                if k != actual {
                    return Err("callGuest argument category mismatch".into());
                }
                let temp = self.slot(&format!("@call/{}/{}", c.span.lo.0, index), k);
                let mark = self.defined(&temp, k);
                prefix.push(format!("{temp}=({x}){mark}"));
                args.push(temp);
            }
            let (receiver, vector) = (args[2].clone(), args[3].clone());
            self.used(&args[1].clone(), Kind::Value);
            self.used(&receiver, Kind::Value);
            self.used(&vector, Kind::Values);
            self.origin = None;
            // Static code IDs name generated native functions, not JS object
            // shapes. The caller is responsible for any identity guard that
            // made the ID static. Dynamic or absent IDs retain full dispatch.
            let known = match &*c.args[0].expr {
                Expr::Lit(Lit::Num(n))
                    if n.value.is_finite()
                        && n.value >= 0.0
                        && n.value <= u32::MAX as f64
                        && n.value.fract() == 0.0 =>
                {
                    let id = n.value as u32;
                    self.signatures
                        .contains_key(&format!("guest_{id}"))
                        .then_some(id)
                }
                _ => None,
            };
            self.events.push(match known {
                Some(id) => Ev::SafeIf(format!("guest_{id}")),
                None => Ev::Safe,
            });
            prefix.push(if let Some(id) = known {
                format!(
                    "OC_CALLEE_{id}(ctx,oc_call_known_{id}(ctx,{}, {}, {}))",
                    args[1], args[2], args[3]
                )
            } else {
                format!(
                    "oc_guest_values(ctx,{}, {}, {}, {})",
                    args[0], args[1], args[2], args[3]
                )
            });
            return Ok((format!("({})", prefix.join(",")), Kind::Value));
        }
        if n == "allocArgs" {
            if c.args.len() != 1 {
                return Err("allocArgs requires static argument count".into());
            }
            let Expr::Lit(Lit::Num(k)) = &*c.args[0].expr else {
                return Err("allocArgs count must specialize to a numeric literal".into());
            };
            if !k.value.is_finite() || k.value < 0.0 || k.value.fract() != 0.0 || k.value > 4096.0 {
                return Err("allocArgs count outside supported static range".into());
            }
            let name = format!("oc_args_{}", c.span.lo.0);
            self.arg_arrays.insert(name.clone(), k.value as usize);
            self.origin = Some(Origin::Vector(name.clone()));
            // A fresh buffer holds undefined values. Clearing it here, not at
            // function entry, lets the C compiler drop the clear when every
            // cell is written before the call.
            return Ok((
                format!(
                    "(memset({name},0,{0}*sizeof(oc_value)),(oc_values){{{name},{0}}})",
                    k.value as usize
                ),
                Kind::Values,
            ));
        }
        // Registering an atom's spelling is a compile-time fact: both
        // arguments must be literals, and the call itself does nothing.
        if n == "atomName" {
            let [atom, name] = &c.args[..] else {
                return Err("atomName requires an atom and its spelling".into());
            };
            let atom = literal_index(&atom.expr, 65534.0).ok_or("atomName atom must be a literal")?;
            let spelling = constant_string(&name.expr, &self.facts.borrow().shared_strings, &|n| {
                self.env.contains_key(n)
            })
            .ok_or("atomName spelling must be a string literal")?;
            let units: Vec<u16> = spelling.encode_utf16().collect();
            let mut facts = self.facts.borrow_mut();
            let index = match facts.strings.iter().position(|x| *x == units) {
                Some(index) => index,
                None => {
                    facts.strings.push(units);
                    facts.strings.len() - 1
                }
            };
            facts.atoms = facts.atoms.max(atom as usize + 1);
            if facts.atom_names.insert(atom as usize, index).is_some_and(|old| old != index) {
                return Err("atomName gives one atom two spellings".into());
            }
            return Ok(("oc_undef()".into(), Kind::Value));
        }
        if n == "vStr" || n == "vString" {
            if c.args.len() != 1 {
                return Err("vStr requires one literal string".into());
            }
            let text = constant_string(&c.args[0].expr, &self.facts.borrow().shared_strings, &|n| {
                self.env.contains_key(n)
            })
            .ok_or("vStr requires literal string")?;
            let units: Vec<_> = text.encode_utf16().collect();
            // A literal is one static cell, never allocated or collected.
            let mut facts = self.facts.borrow_mut();
            let index = match facts.strings.iter().position(|x| *x == units) {
                Some(index) => index,
                None => {
                    facts.strings.push(units);
                    facts.strings.len() - 1
                }
            };
            return Ok((
                format!("oc_wrap_string((oc_string *)&oc_literal_{index})"),
                Kind::Value,
            ));
        }
        let (expected, result) = intrinsic_spec(n);
        if expected.len() != c.args.len() {
            return Err(format!("wrong arity for {n}"));
        }
        let mut args = Vec::new();
        let mut prefix = Vec::new();
        for (index, (a, k)) in c.args.iter().zip(expected).enumerate() {
            let (x, actual) = self.expr(&a.expr)?;
            if actual != k {
                return Err(format!("{n}: expected {k:?}, found {actual:?}"));
            }
            let tmp = self.slot(&format!("@call/{}/{}", c.span.lo.0, index), k);
            let mark = self.defined(&tmp, k);
            prefix.push(format!("{tmp}=({x}){mark}"));
            args.push(tmp);
        }
        for (tmp, kind) in args.iter().zip(&intrinsic_spec(n).0) {
            self.used(tmp, *kind);
        }
        // No intrinsic past this point returns one of this activation's vectors.
        self.origin = None;
        // Which runtime entry points can allocate a collected cell. A checked
        // build verifies this classification at every other call.
        let collects = match n {
            "objNew" | "arrayNewLength" | "arrayNewLiteral" | "fnNew" | "fnNewArrow"
            | "constructReceiver" | "objError" | "objSetIndex" | "envNew" | "envCopy"
            | "callGuestRest" | "callGuestOneOf" | "callGuestSpread" | "arrAppendAll" | "objCreate"
            | "callGuestProtected" | "strFromCharCode"
            | "strSlice"
            | "anyGet" => true,
            // Only `+` can produce a string; a non-literal opcode might be it.
            "vBinary" => literal_index(&c.args[0].expr, 64.0) .map(|op| op == 1).unwrap_or(true),
            _ => false,
        };
        if collects {
            self.events.push(Ev::Safe);
        }
        let a = |i: usize| args[i].as_str();
        let call = |name: &str, ctx: bool| {
            let mut all = args.clone();
            if ctx {
                all.insert(0, "ctx".into());
            }
            let call = format!("{name}({})", all.join(", "));
            if ctx && !collects {
                format!("OC_NOGC(ctx,{call})")
            } else {
                call
            }
        };
        // A literal atom sizes the program's static atom table.
        let atom_argument = match n {
            "objGet" | "objGetOwn" | "objGetAny" | "objGetSlot" | "objSet" | "objSetOwn" | "objSetSlot"
            | "objGetAt" | "objSetAt" | "objAddKnown" | "objHasOwn" => Some(1),
            // (A declared shape's key is an atom the program may not name
            // anywhere else.)
            "shapeDeclare" => Some(2),
            _ => None,
        };
        if let Some(index) = atom_argument {
            if let Expr::Lit(Lit::Num(k)) = &*c.args[index].expr {
                if k.value.is_finite() && k.value >= 0.0 && k.value < 1e9 {
                    let needed = k.value as usize + 1;
                    let mut facts = self.facts.borrow_mut();
                    facts.atoms = facts.atoms.max(needed);
                }
            }
        }
        let frame = |guest: bool, value: &str, zero: &str| {
            if guest {
                value.to_owned()
            } else {
                format!("(oc_no_frame(ctx),{zero})")
            }
        };
        let code = match n {
            "callEnv" => {
                if self.guest {
                    self.events.push(Ev::Use("oc_env".into()));
                }
                frame(self.guest, "oc_env", "oc_undef()")
            }
            // Forwards the tail of this activation's own argument vector. The
            // callee copies its arguments out before it can collect.
            "callGuestRest" => {
                if !self.guest {
                    return Err("callGuestRest requires a guest frame".into());
                }
                self.events.pop();
                self.events.push(Ev::Use("oc_args".into()));
                self.events.push(Ev::Safe);
                format!(
                    "oc_guest_rest(ctx,{},{},{},oc_args,oc_argc,{})",
                    a(0),
                    a(1),
                    a(2),
                    a(4)
                )
            }
            "strCharCodeAt" => call("oc_str_code", true),
            "strFromCharCode" => call("oc_str_from_code", true),
            "strSlice" => call("oc_str_slice", true),
            "strIndexOf" => call("oc_str_index_of", true),
            "f64Math" => call("oc_math", false),
            "arrIs" => call("oc_is_array", false),
            "anyGet" => call("oc_any_get", true),
            // A direct call for each hinted target the function turns out to
            // be, else generic dispatch. The hints must be literal codes of
            // generated functions; any other is ignored.
            "callGuestOneOf" => {
                let mut choice =
                    format!("oc_guest_values(ctx,{}, {}, {}, {})", a(0), a(1), a(2), a(3));
                for hint in c.args[4..].iter().rev() {
                    let Some(id) = literal_index(&hint.expr, u32::MAX as f64) else { continue };
                    if !self.signatures.contains_key(&format!("guest_{id}")) {
                        continue;
                    }
                    choice = format!(
                        "({}=={id}.0 ? OC_CALLEE_{id}(ctx,oc_call_known_{id}(ctx,{}, {}, {})) : {choice})",
                        a(0),
                        a(1),
                        a(2),
                        a(3)
                    );
                }
                choice
            }
            "objCreate" => call("oc_create", true),
            "objSetProto" => call("oc_set_proto", true),
            "arrPush" => call("oc_array_push", true),
            "arrAppendAll" => call("oc_array_append_all", true),
            // The argument array must outlive the call's entry, so it is
            // treated as read after the call.
            "callGuestSpread" => {
                self.events.push(Ev::Use(args[3].clone()));
                call("oc_guest_spread", true)
            }
            "callGuestProtected" => call("oc_guest_protected", true),
            "tookThrow" => "oc_took_throw(ctx)".into(),
            "envNew" => call("oc_scope_new", true),
            "envParent" => call("oc_scope_parent", true),
            "envReceiver" => call("oc_scope_receiver", true),
            "envGet" => call("oc_scope_get", true),
            "envSet" => call("oc_scope_set", true),
            "envCopy" => call("oc_scope_copy", true),
            "callThis" => {
                if self.guest {
                    self.events.push(Ev::Use("oc_recv".into()));
                }
                frame(self.guest, "oc_recv", "oc_undef()")
            }
            "callArgCount" | "callCount" => frame(self.guest, "(double)oc_argc", "0.0"),
            "callArg" => frame(
                {
                    if self.guest {
                        self.events.push(Ev::Use("oc_args".into()));
                    }
                    self.guest
                },
                &format!("oc_frame_arg(ctx,oc_args,oc_argc,{})", a(1)),
                "oc_undef()",
            ),
            "sharedValues" | "sharedF64" => {
                let f64s = n == "sharedF64";
                let id = literal_index(&c.args[0].expr, 7.0);
                let size = literal_index(&c.args[1].expr, 4294967295.0);
                match (id, size) {
                    // Resolved after the whole program is seen: a buffer whose
                    // every request agrees is created once at entry.
                    (Some(id), Some(size)) => {
                        self.facts.borrow_mut().shared.insert((f64s, id as u32, size));
                        format!("oc_shared_{}_{id}_{size}(ctx)", if f64s { "n" } else { "v" })
                    }
                    _ => {
                        self.facts.borrow_mut().shared_dynamic = true;
                        call(if f64s { "oc_shared_f64" } else { "oc_values_shared" }, true)
                    }
                }
            }
            "allocF64" => call("oc_alloc_f64", true),
            "allocValues" => call("oc_values_make", true),
            "loadF64" => format!("({})[(size_t)({})]", a(0), a(1)),
            "loadValue" => call("oc_values_get", true),
            "storeValue" => call("oc_values_set", true),
            "storeF64" => {
                format!("(({})[(size_t)({})] = ({}))", a(0), a(1), a(2))
            }
            "vNum" => call("oc_num", false),
            "vBool" => call("oc_bool", false),
            "vNull" => "oc_null()".into(),
            "vUndef" => "oc_undef()".into(),
            "vNumber" => call("oc_number", true),
            "vTruth" => call("oc_truth", false),
            "vIsNullish" => call("oc_nullish", false),
            "vStrictEq" => call("oc_strict_eq", false),
            "vLooseEq" => call("oc_loose_eq", true),
            "vUnary" => call("oc_unary", true),
            "vBinary" => call("oc_binary", true),
            "vUnaryNumber" => call("oc_unary_number", true),
            "vBinaryNumber" => call("oc_binary_number", true),
            "objRootProto" | "objectRootProto" => call("oc_root_proto", true),
            "objNew" => call("oc_new_object", true),
            "objGet" => call("oc_get", true),
            "objGetAny" => call("oc_get_any", true),
            "objGetOwn" => call("oc_get_own", true),
            "objRequire" => call("oc_require_object", true),
            "objSet" => call("oc_set", true),
            "objSetOwn" => call("oc_set_own", true),
            "objSetSlot" => call("oc_set_slot", true),
            "objGetSlot" => call("oc_get_slot", true),
            // A property of an object whose shape the specializer followed.
            "objGetAt" => call("oc_get_at", true),
            "objSetAt" => call("oc_set_at", true),
            "objAddKnown" => call("oc_add_known", true),
            "objShapeId" => call("oc_shape_id", false),
            "shapeDeclare" => call("oc_shape_declare", true),
            // A request the driver read from the residual program; nothing
            // to do at run time.
            "shapeNote" => "oc_undef()".to_owned(),
            "keyedGet" => call("oc_keyed_get", true),
            "keyedSet" => call("oc_keyed_set", true),
            "keyedHas" => call("oc_keyed_has", true),
            "vTypeof" => call("oc_typeof", true),
            "objInstanceOf" => call("oc_instance_of", true),
            "objDefine" => call("oc_define", true),
            "objHasOwn" => call("oc_has_own", true),
            "objProto" => call("oc_proto", true),
            "arrayNewLength" | "arrayNewLiteral" => call("oc_new_array", true),
            "arrGet" => call("oc_get_index", true),
            "arrSet" => call("oc_set_index", true),
            "arrHas" => call("oc_has_index", true),
            "objSetIndex" => call("oc_set_proto_index", true),
            "fnNew" => call("oc_new_function", true),
            "fnNewArrow" => call("oc_new_arrow", true),
            "constructReceiver" => call("oc_construct_receiver", true),
            "fnCode" => call("oc_function_code", true),
            "fnEnv" => call("oc_function_env", true),
            "f64Sqrt" => call("sqrt", false),
            "constructResult" => format!("(({}).tag==OC_OBJECT ? ({}) : ({}))", a(1), a(1), a(0)),
            "objError" => call("oc_error", true),
            "throwValue" => call("oc_throw", true),
            "failCall" => "oc_fail_call(ctx)".into(),
            "failCapacity" => "(oc_fail(ctx,\"interpreter frame capacity exceeded\"),0.0)".into(),
            _ => return Err(format!("unsupported intrinsic {n}")),
        };
        prefix.push(code);
        Ok((format!("({})", prefix.join(",")), result))
    }
}

fn infer_expr(
    e: &Expr,
    env: &mut Env,
    sigs: &mut BTreeMap<String, Signature>,
    changed: &mut bool,
) -> Result<Option<Kind>> {
    use Kind::*;
    Ok(match e {
        Expr::Array(a) => {
            for e in a.elems.iter().flatten() {
                infer_expr(&e.expr, env, sigs, changed)?;
            }
            Some(Values)
        }
        Expr::Paren(p) => infer_expr(&p.expr, env, sigs, changed)?,
        Expr::Lit(Lit::Num(_) | Lit::Bool(_)) => Some(Number),
        Expr::Ident(i) => env
            .get(i.sym.as_ref())
            .copied()
            .flatten()
            .or_else(|| intrinsic_name(i.sym.as_ref()).map(Intrinsic))
            .or_else(|| {
                if i.sym == *"NaN" || i.sym == *"Infinity" {
                    Some(Number)
                } else {
                    None
                }
            }),
        Expr::Unary(u) => {
            infer_expr(&u.arg, env, sigs, changed)?;
            Some(Number)
        }
        Expr::Bin(b) => {
            infer_expr(&b.left, env, sigs, changed)?;
            infer_expr(&b.right, env, sigs, changed)?;
            Some(Number)
        }
        Expr::Member(m) => {
            let k = infer_expr(&m.obj, env, sigs, changed)?;
            match k {
                Some(Buffer) => Some(Number),
                Some(Values) => Some(
                    if matches!(&m.prop,MemberProp::Ident(i) if i.sym==*"length") {
                        Number
                    } else {
                        Value
                    },
                ),
                _ => None,
            }
        }
        Expr::Assign(a) => {
            let k = infer_expr(&a.right, env, sigs, changed)?;
            if let AssignTarget::Simple(SimpleAssignTarget::Ident(i)) = &a.left {
                env.insert(i.id.sym.to_string(), k);
            }
            k
        }
        Expr::Update(u) => {
            infer_expr(&u.arg, env, sigs, changed)?;
            Some(Number)
        }
        Expr::Seq(s) => {
            let mut k = None;
            for e in &s.exprs {
                k = infer_expr(e, env, sigs, changed)?;
            }
            k
        }
        Expr::Cond(c) => {
            infer_expr(&c.test, env, sigs, changed)?;
            let a = infer_expr(&c.cons, env, sigs, changed)?;
            let b = infer_expr(&c.alt, env, sigs, changed)?;
            if a == b {
                a
            } else {
                None
            }
        }
        Expr::Call(c) => {
            let Callee::Expr(f) = &c.callee else {
                return Err("unsupported callee".into());
            };
            let n = if let Expr::Ident(i) = &**f {
                Some(i.sym.to_string())
            } else {
                None
            };
            if let Some(n) = n
                .as_ref()
                .filter(|n| sigs.contains_key(n.as_str()) && !env.contains_key(n.as_str()))
            {
                if sigs[n].params.len() != c.args.len() {
                    return Err(format!("arity mismatch for {n}"));
                }
                let mut kinds = Vec::new();
                for a in &c.args {
                    kinds.push(infer_expr(&a.expr, env, sigs, changed)?);
                }
                let sig = sigs.get_mut(n).unwrap();
                for (k, actual) in sig.params.iter_mut().zip(kinds) {
                    if let Some(a) = actual {
                        if let Some(old) = *k {
                            if old != a {
                                return Err(format!("incompatible parameter categories for {n}"));
                            }
                        } else {
                            *k = Some(a);
                            *changed = true;
                        }
                    }
                }
                sig.result
            } else if let Some(Intrinsic(n)) = infer_expr(f, env, sigs, changed)? {
                for a in &c.args {
                    infer_expr(&a.expr, env, sigs, changed)?;
                }
                Some(intrinsic_spec(n).1)
            } else if matches!(&**f,Expr::Member(m) if matches!(&*m.obj,Expr::Ident(i) if i.sym==*"Math")&&matches!(&m.prop,MemberProp::Ident(i) if i.sym==*"sqrt"))
            {
                Some(Number)
            } else {
                None
            }
        }
        _ => None,
    })
}
fn infer_stmts(
    stmts: &[Stmt],
    env: &mut Env,
    sigs: &mut BTreeMap<String, Signature>,
    changed: &mut bool,
    returns: &mut Vec<Kind>,
) -> Result<()> {
    for s in stmts {
        match s {
            Stmt::Decl(Decl::Var(v)) => {
                for d in &v.decls {
                    if let Pat::Ident(i) = &d.name {
                        let k = if let Some(e) = &d.init {
                            infer_expr(e, env, sigs, changed)?
                        } else {
                            None
                        };
                        if k.is_some() {
                            env.insert(i.id.sym.to_string(), k);
                        } else {
                            env.entry(i.id.sym.to_string()).or_insert(None);
                        }
                    }
                }
            }
            Stmt::Expr(e) => {
                infer_expr(&e.expr, env, sigs, changed)?;
            }
            Stmt::Return(r) => {
                if let Some(e) = &r.arg {
                    if let Some(k) = infer_expr(e, env, sigs, changed)? {
                        returns.push(k);
                    }
                }
            }
            Stmt::Block(b) => infer_stmts(&b.stmts, env, sigs, changed, returns)?,
            Stmt::If(i) => {
                infer_expr(&i.test, env, sigs, changed)?;
                infer_stmts(std::slice::from_ref(&*i.cons), env, sigs, changed, returns)?;
                if let Some(a) = &i.alt {
                    infer_stmts(std::slice::from_ref(&**a), env, sigs, changed, returns)?;
                }
            }
            Stmt::While(w) => {
                infer_expr(&w.test, env, sigs, changed)?;
                infer_stmts(std::slice::from_ref(&*w.body), env, sigs, changed, returns)?;
            }
            Stmt::For(f) => {
                if let Some(VarDeclOrExpr::VarDecl(v)) = &f.init {
                    for d in &v.decls {
                        if let Pat::Ident(i) = &d.name {
                            let k = if let Some(e) = &d.init {
                                infer_expr(e, env, sigs, changed)?
                            } else {
                                None
                            };
                            env.insert(i.id.sym.to_string(), k);
                        }
                    }
                }
                infer_stmts(std::slice::from_ref(&*f.body), env, sigs, changed, returns)?;
            }
            Stmt::Switch(sw) => {
                infer_expr(&sw.discriminant, env, sigs, changed)?;
                for c in &sw.cases {
                    infer_stmts(&c.cons, env, sigs, changed, returns)?;
                }
            }
            Stmt::Labeled(l) => {
                infer_stmts(std::slice::from_ref(&*l.body), env, sigs, changed, returns)?
            }
            _ => {}
        }
    }
    Ok(())
}

fn is_function_setup(e: &Expr) -> bool {
    matches!(e,Expr::Call(c) if c.args.len()==1&&c.args[0].spread.is_none()&&matches!(&c.callee,Callee::Expr(f) if matches!(&**f,Expr::Ident(i) if i.sym==*"setObjectFunctions"))&&matches!(&*c.args[0].expr,Expr::Array(_)))
}

/// Compile a closed set of residual native functions and explicit host intrinsics.
/// Main takes one numeric host input and returns an opaque guest Value.
pub fn to_c(source: &str) -> Result<String> {
    let module = js_frontend::parse(source)?;
    let mut funcs = BTreeMap::new();
    let mut shared_strings = BTreeMap::new();
    for item in &module.body {
        // A string literal the specializer shares between functions.
        if let ModuleItem::Stmt(Stmt::Decl(Decl::Var(declaration))) = item {
            for d in &declaration.decls {
                let (Pat::Ident(name), Some(init)) = (&d.name, &d.init) else {
                    return Err("object residual module variables must be named string literals".into());
                };
                let text = constant_string(init, &shared_strings, &|_| false).ok_or(
                    "object residual module variables must be named string literals",
                )?;
                shared_strings.insert(name.id.sym.to_string(), text);
            }
            continue;
        }
        match item{ModuleItem::Stmt(Stmt::Decl(Decl::Fn(f)))=>{if funcs.insert(f.ident.sym.to_string(),&f.function).is_some(){return Err("duplicate function".into());}},ModuleItem::Stmt(Stmt::Empty(_))=>{},ModuleItem::Stmt(Stmt::Expr(e)) if is_function_setup(&e.expr)=>{},_=>return Err("object residual must contain only function declarations and verified setObjectFunctions setup".into())}
    }
    if !funcs.contains_key("main") {
        return Err("missing main".into());
    }
    for item in &module.body {
        if let ModuleItem::Stmt(Stmt::Expr(e)) = item {
            if let Expr::Call(c) = &*e.expr {
                if let Expr::Array(a) = &*c.args[0].expr {
                    for (i, e) in a.elems.iter().enumerate() {
                        let e = e.as_ref().ok_or("function setup cannot contain holes")?;
                        let Expr::Ident(n) = &*e.expr else {
                            return Err("function setup requires named functions".into());
                        };
                        if n.sym.as_ref() != format!("guest_{i}")
                            || !funcs.contains_key(n.sym.as_ref())
                        {
                            return Err(
                                "setObjectFunctions order must match guest_N function IDs".into()
                            );
                        }
                    }
                }
            }
        }
    }

    let mut sigs: BTreeMap<_, _> = funcs
        .iter()
        .map(|(n, f)| {
            (
                n.clone(),
                Signature {
                    params: vec![None; f.params.len()],
                    result: None,
                },
            )
        })
        .collect();
    if sigs["main"].params.len() != 1 {
        return Err("main must have one numeric parameter".into());
    }
    sigs.get_mut("main").unwrap().params[0] = Some(Kind::Number);
    for (n, s) in &mut sigs {
        if n.strip_prefix("guest_")
            .and_then(|x| x.parse::<u64>().ok())
            .is_some()
        {
            if s.params.len() != 1 {
                return Err("guest_N must have one carrier parameter".into());
            }
            s.params[0] = Some(Kind::Number);
        }
    }
    for _ in 0..(funcs.len() * 4 + 32) {
        let mut changed = false;
        for (n, f) in &funcs {
            let mut env = Env::new();
            for (p, k) in f.params.iter().zip(sigs[n].params.clone()) {
                let Pat::Ident(i) = &p.pat else {
                    return Err("parameter destructuring unsupported".into());
                };
                env.insert(i.id.sym.to_string(), k);
            }
            let mut ret = Vec::new();
            infer_stmts(
                &f.body.as_ref().ok_or("function body required")?.stmts,
                &mut env,
                &mut sigs,
                &mut changed,
                &mut ret,
            )?;
            // A guest function and the entry return a Value by contract. This
            // pass reads statements in textual order, which is not execution
            // order in a state-machine residual, so it cannot judge their
            // returns; emission checks every return against the contract.
            if is_guest(n) || n == "main" {
                let sig = sigs.get_mut(n).unwrap();
                if sig.result != Some(Kind::Value) {
                    sig.result = Some(Kind::Value);
                    changed = true;
                }
                continue;
            }
            if let Some(k) = ret.first().copied() {
                if ret.iter().any(|x| *x != k) {
                    return Err(format!("mixed return categories in {n}"));
                }
                let sig = sigs.get_mut(n).unwrap();
                if sig.result != Some(k) {
                    sig.result = Some(k);
                    changed = true;
                }
            }
        }
        if !changed {
            break;
        }
    }
    for (n, s) in &sigs {
        if s.result.is_none() || s.params.iter().any(Option::is_none) {
            return Err(format!(
                "could not infer complete native signature for {n}: {s:?}"
            ));
        }
    }
    if sigs["main"].result != Some(Kind::Value) {
        return Err("object main must return Value; use vNum/vBool for primitive results".into());
    }
    let mut out = String::new();
    let facts = std::rc::Rc::new(std::cell::RefCell::new(Facts {
        shared_strings,
        ..Facts::default()
    }));
    for (n, s) in &sigs {
        let args = s
            .params
            .iter()
            .enumerate()
            .map(|(i, k)| format!("{} p{i}", c_type(k.unwrap())))
            .collect::<Vec<_>>();
        out.push_str(&format!(
            "{}static inline {} {}(oc_ctx *ctx{}{}{});\n",
            guest_attribute(n),
            c_type(s.result.unwrap()),
            c_fn(n),
            if args.is_empty() { "" } else { ", " },
            args.join(", "),
            if is_guest(n) { GUEST_FRAME } else { "" }
        ));
    }
    out.push_str("#if (defined(__GNUC__) || defined(__clang__)) && !defined(OC_NO_FORCED_INLINING)\n#define OC_KNOWN_INLINE static inline __attribute__((always_inline))\n#else\n#define OC_KNOWN_INLINE static inline\n#endif\n");
    for (name, _) in &sigs {
        if let Some(id) = name
            .strip_prefix("guest_")
            .and_then(|n| n.parse::<u32>().ok())
        {
            out.push_str(&format!("OC_KNOWN_INLINE oc_value oc_call_known_{id}(oc_ctx *ctx, oc_value env, oc_value receiver, oc_values args);\n"));
        }
    }
    let mut bodies: BTreeMap<String, String> = BTreeMap::new();
    struct Generated {
        name: String,
        body: String,
        events: Vec<Ev>,
        forced: BTreeSet<String>,
        flows: Vec<(String, Origin)>,
        arg_arrays: BTreeMap<String, usize>,
        locals: Vec<(String, Kind)>,
        params: Vec<(String, Kind)>,
        result: Kind,
        guest: bool,
    }
    let mut generated = Vec::new();
    for (n, f) in &funcs {
        if f.is_async || f.is_generator {
            return Err("async/generator residual unsupported".into());
        }
        let sig = &sigs[n];
        let mut em = Emit {
            signatures: sigs.clone(),
            return_kind: sig.result,
            guest: is_guest(n),
            facts: facts.clone(),
            ..Emit::default()
        };
        let mut args = Vec::new();
        for (p, k) in f.params.iter().zip(&sig.params) {
            let Pat::Ident(i) = &p.pat else {
                unreachable!()
            };
            let k = k.unwrap();
            em.env.insert(i.id.sym.to_string(), Some(k));
            let slot = em.slot(i.id.sym.as_ref(), k);
            // A parameter is assigned by the caller, before the body.
            em.defined(&slot, k);
            args.push((slot, k));
        }
        if em.guest {
            em.events.push(Ev::Def("oc_recv".into()));
            em.events.push(Ev::Def("oc_env".into()));
            em.events.push(Ev::Def("oc_args".into()));
        }
        let mut body = String::new();
        let stmts = &f.body.as_ref().unwrap().stmts;
        let mut live = !em
            .trampoline(stmts, &mut body)
            .map_err(|e| format!("{n}: {e}"))?;
        if live {
            for s in stmts {
                if live {
                    live = em.stmt(s, &mut body).map_err(|e| format!("{n}: {e}"))?;
                }
            }
        }
        if live {
            return Err(format!("{n}: may fall through without returning"));
        }
        // Value vectors can be borrowed automatic argument storage. A helper
        // that owns such storage cannot return a vector to its caller. Returning
        // a caller-owned vector or a context allocation remains supported.
        if sig.result == Some(Kind::Values) && !em.arg_arrays.is_empty() {
            return Err(format!(
                "{n}: automatic Value vectors cannot escape their native activation"
            ));
        }
        let mut locals = Vec::new();
        for (name, k) in em.slots.clone() {
            let slot = em.slot(&name, k);
            if !args.iter().any(|(a, _)| *a == slot) {
                locals.push((slot, k));
            }
        }
        generated.push(Generated {
            name: n.clone(),
            body,
            events: em.events,
            forced: em.forced,
            flows: em.flows,
            arg_arrays: em.arg_arrays,
            locals,
            params: args,
            result: sig.result.unwrap(),
            guest: em.guest,
        });
    }
    // A function can collect if it reaches a collecting runtime call or an
    // unknown callee, directly or through the generated functions it names.
    let mut collects: BTreeSet<String> = generated
        .iter()
        .filter(|g| g.events.contains(&Ev::Safe))
        .map(|g| g.name.clone())
        .collect();
    loop {
        let before = collects.len();
        for g in &generated {
            if g.events
                .iter()
                .any(|e| matches!(e, Ev::SafeIf(callee) if collects.contains(callee)))
            {
                collects.insert(g.name.clone());
            }
        }
        if collects.len() == before {
            break;
        }
    }
    let safe = |e: &Ev| match e {
        Ev::Safe => true,
        Ev::SafeIf(callee) => collects.contains(callee),
        _ => false,
    };
    // Locals live across a collection point, per function.
    let mut live_across = Vec::new();
    for g in &generated {
        let mut rooted = if g.events.iter().any(safe) {
            rooted_locals(&g.events, safe).map_err(|e| format!("{}: {e}", g.name))?
        } else {
            BTreeSet::new()
        };
        if g.events.iter().any(safe) {
            rooted.extend(g.forced.iter().cloned());
        }
        live_across.push(rooted);
    }
    // A callee normally copies its arguments out before it can collect, so a
    // caller need not keep the vector rooted during the call. If any function
    // reads its arguments later than that, every caller keeps them rooted.
    let late_arguments = live_across.iter().any(|r| r.contains("oc_args"));
    let mut callee_checks = String::new();
    for (g, mut rooted) in generated.into_iter().zip(live_across) {
        let n = &g.name;
        let framed = g.events.iter().any(safe);
        // Argument vectors that a rooted vector local may denote.
        let mut vectors: BTreeSet<String> = BTreeSet::new();
        if framed {
            if late_arguments {
                vectors.extend(g.arg_arrays.keys().cloned());
            } else {
                fn reach(
                    origin: &Origin,
                    flows: &[(String, Origin)],
                    seen: &mut BTreeSet<String>,
                    out: &mut BTreeSet<String>,
                ) {
                    match origin {
                        Origin::Vector(v) => {
                            out.insert(v.clone());
                        }
                        Origin::Local(l) => {
                            if seen.insert(l.clone()) {
                                for (target, source) in flows {
                                    if target == l {
                                        reach(source, flows, seen, out);
                                    }
                                }
                            }
                        }
                        Origin::Either(a, b) => {
                            reach(a, flows, seen, out);
                            reach(b, flows, seen, out);
                        }
                        Origin::Elsewhere => {}
                    }
                }
                let mut seen = BTreeSet::new();
                for local in &rooted {
                    reach(&Origin::Local(local.clone()), &g.flows, &mut seen, &mut vectors);
                }
            }
        }
        // Only Value locals get slots; vector locals and the argument pointer
        // were tracked to decide which vectors stay rooted.
        rooted.retain(|name| name.ends_with("_v") || name == "oc_recv" || name == "oc_env");
        let slot_of: BTreeMap<&String, usize> =
            rooted.iter().enumerate().map(|(i, name)| (name, i)).collect();
        // Replace each assignment marker by its root-slot store, or nothing.
        let mut body = String::with_capacity(g.body.len());
        let mut rest = g.body.as_str();
        while let Some(open) = rest.find(ROOT_OPEN) {
            body.push_str(&rest[..open]);
            let after = &rest[open + ROOT_OPEN.len_utf8()..];
            let close = after.find(ROOT_CLOSE).ok_or("unterminated root marker")?;
            let local = &after[..close];
            if let Some(slot) = slot_of.get(&local.to_owned()) {
                body.push_str(&format!(",oc_roots[{slot}]={local}"));
            }
            rest = &after[close + ROOT_CLOSE.len_utf8()..];
        }
        body.push_str(rest);
        bodies.insert(n.clone(), body.clone());
        if let Some(id) = n.strip_prefix("guest_").filter(|_| g.guest) {
            callee_checks.push_str(&format!(
                "#define OC_CALLEE_{id}(c,e) {}\n",
                if collects.contains(n) { "(e)" } else { "OC_NOGC(c,e)" }
            ));
        }
        out.push_str(&format!(
            "{}static inline {} {}(oc_ctx *ctx{}{}{}) {{\n",
            guest_attribute(n),
            c_type(g.result),
            c_fn(n),
            if g.params.is_empty() { "" } else { ", " },
            g.params
                .iter()
                .map(|(a, k)| format!("{} {a}", c_type(*k)))
                .collect::<Vec<_>>()
                .join(", "),
            if g.guest { GUEST_FRAME } else { "" }
        ));
        out.push_str(&format!("{} numeric_result;\n", c_type(g.result)));
        // An activation that can be live across a collection keeps its rooted
        // locals and its outgoing argument vectors in one linked root frame.
        let mut frame_cells = rooted.len();
        let mut declarations = String::new();
        for (name, n) in &g.arg_arrays {
            // An empty vector has no cells to root.
            if vectors.contains(name) && *n > 0 {
                declarations.push_str(&format!("oc_value *const {name} = oc_roots + {frame_cells};\n"));
                frame_cells += *n;
            } else {
                declarations.push_str(&format!("oc_value {name}[{}];\n", (*n).max(1)));
            }
        }
        let framed = framed && frame_cells > 0;
        if std::env::var_os("OBJECT_C_EXPLAIN_ROOTS").is_some() {
            let count = |f: &dyn Fn(&Ev) -> bool| g.events.iter().filter(|e| f(e)).count();
            eprintln!(
                "{n}: frame {frame_cells} cells ({} rooted locals), {} runtime collection points, {} collecting callees {:?}, {} non-collecting calls",
                rooted.len(),
                count(&|e| *e == Ev::Safe),
                count(&|e| matches!(e, Ev::SafeIf(c) if collects.contains(c))),
                g.events.iter().filter_map(|e| match e { Ev::SafeIf(c) if collects.contains(c) => Some(c.as_str()), _ => None }).collect::<BTreeSet<_>>(),
                count(&|e| matches!(e, Ev::SafeIf(c) if !collects.contains(c))),
            );
        }
        if framed {
            out.push_str(&format!("oc_value oc_roots[{frame_cells}];\n"));
        }
        out.push_str(&declarations);
        for (slot, k) in &g.locals {
            out.push_str(&format!("{} {slot};\n", c_type(*k)));
        }
        let (enter, leave) = match n.strip_prefix("guest_").filter(|_| g.guest) {
            Some(id) => (
                format!("OC_GUEST_ENTER_{id}(ctx);\n"),
                format!("OC_GUEST_LEAVE_{id}(ctx);\n"),
            ),
            None => Default::default(),
        };
        out.push_str(&enter);
        if framed {
            out.push_str(&format!(
                "memset(oc_roots,0,sizeof oc_roots);\noc_frame oc_frame_here = {{ctx->frames,oc_roots,{frame_cells}}};\nctx->frames = &oc_frame_here;\n"
            ));
            let mut incoming: Vec<String> = g.params.iter().map(|p| p.0.clone()).collect();
            if g.guest {
                incoming.extend(["oc_recv".to_owned(), "oc_env".to_owned()]);
            }
            for param in &incoming {
                if let Some(slot) = slot_of.get(param) {
                    out.push_str(&format!("oc_roots[{slot}] = {param};\n"));
                }
            }
        }
        out.push_str(&body);
        out.push_str("numeric_cleanup: ;\n");
        if framed {
            out.push_str("ctx->frames = oc_frame_here.prev;\n");
        }
        out.push_str(&format!("{leave}return numeric_result;\n}}\n"));
    }
    // Keep the frame ABI identical to generic dispatch, but expose a direct
    // native callee to the C optimizer for a statically known guest code ID.
    for (name, _) in &sigs {
        if let Some(id) = name
            .strip_prefix("guest_")
            .and_then(|n| n.parse::<u32>().ok())
        {
            out.push_str(&format!("OC_KNOWN_INLINE oc_value oc_call_known_{id}(oc_ctx *ctx, oc_value env, oc_value receiver, oc_values args) {{\nreturn {}(ctx,0.0,env,receiver,args.data,args.length);\n}}\n",c_fn(name)));
        }
    }
    let mut dispatch = String::new();
    for (n, sig) in &sigs {
        if let Some(id) = n.strip_prefix("guest_").and_then(|x| x.parse::<u32>().ok()) {
            if sig.result != Some(Kind::Value) {
                return Err("guest_N must return Value".into());
            }
            dispatch.push_str(&format!("case {id}: return oc_entry_{id}(ctx,env,recv,args,argc);\n"));
            // Dispatch enters through an outlined copy, so force-inlined
            // bodies are not all duplicated into the dispatcher.
            out.push_str(&format!("OC_NOINLINE_HOT oc_value oc_entry_{id}(oc_ctx *ctx,oc_value env,oc_value recv,const oc_value *args,size_t argc) {{ OC_ENTRY_ENTER_{id}(ctx); oc_value value = {}(ctx,0.0,env,recv,args,argc); OC_ENTRY_LEAVE_{id}(ctx); return value; }}\n", c_fn(n)));
        }
    }
    out.push_str("static oc_value oc_dispatch(oc_ctx *ctx,double code,oc_value env,oc_value recv,const oc_value *args,size_t argc) {\nif(!isfinite(code)||code<0||floor(code)!=code||code>4294967295.0){oc_fail(ctx,\"invalid guest function code\");return oc_undef();}\nswitch((uint32_t)code){\n");
    out.push_str(&dispatch);
    out.push_str("default:oc_fail(ctx,\"TypeError: callable code not in generated function table\");return oc_undef();\n}\n}\n");
    let facts = facts.borrow();
    // function `prototype`/`constructor` and Error name/message are atoms 1..4
    let atoms = facts.atoms.max(5);
    let mut shared = inline_attributes(&bodies);
    shared.push_str(&callee_checks);
    for (index, units) in facts.strings.iter().enumerate() {
        shared.push_str(&format!(
            "static struct {{ oc_cell cell; size_t length; uint16_t units[{}]; }} oc_literal_{index} = {{{{.kind=OC_CELL_STRING,.fixed=1}},{},{{{}}}}};\n",
            units.len().max(1),
            units.len(),
            if units.is_empty() {
                "0".to_owned()
            } else {
                units.iter().map(|u| u.to_string()).collect::<Vec<_>>().join(",")
            }
        ));
    }
    if !facts.atom_names.is_empty() {
        let entries: Vec<String> = (0..atoms)
            .map(|atom| match facts.atom_names.get(&atom) {
                Some(index) => format!("(oc_string *)&oc_literal_{index}"),
                None => "NULL".to_owned(),
            })
            .collect();
        shared.push_str(&format!(
            "static oc_string *oc_atom_names[OC_ATOMS] = {{{}}};\n",
            entries.join(",")
        ));
    }
    let mut create = String::new();
    for &(f64s, id, size) in &facts.shared {
        let agreed = !facts.shared_dynamic
            && facts
                .shared
                .iter()
                .filter(|x| x.0 == f64s && x.1 == id)
                .count()
                == 1;
        let (kind, ty, checked, field) = if f64s {
            ("n", "double *", "oc_shared_f64", "shared_numbers")
        } else {
            ("v", "oc_values", "oc_values_shared", "shared_values")
        };
        let direct = if f64s {
            format!("c->{field}[{id}]")
        } else {
            format!("(oc_values){{c->{field}[{id}],{size}}}")
        };
        if agreed {
            shared.push_str(&format!(
                "OC_INLINE {ty} oc_shared_{kind}_{id}_{size}(oc_ctx *c) {{ return {direct}; }}\n"
            ));
            create.push_str(&format!("(void){checked}_slow(ctx,{id}.0,{size}.0);\n"));
        } else {
            shared.push_str(&format!(
                "OC_INLINE {ty} oc_shared_{kind}_{id}_{size}(oc_ctx *c) {{ return {checked}(c,{id}.0,{size}.0); }}\n"
            ));
        }
    }
    out.push_str(&format!(
        "oc_value object_run(oc_ctx *ctx, double input) {{\n{create}return {}(ctx,input);\n}}\n",
        c_fn("main")
    ));
    out.push_str(r#"
#ifdef OBJECT_STANDALONE
int main(int argc,char **argv) {
 if(argc!=2){fprintf(stderr,"usage: %s number\n",argv[0]);return 2;}
 char *end; double input=strtod(argv[1],&end);if(end==argv[1]||*end)return 2;
 oc_ctx *ctx=oc_context_new();if(!ctx)return 2;ctx->catch_active=1;int status=0;
 if(setjmp(ctx->escape)==0){oc_value result=object_run(ctx,input);oc_print(stdout,result,0);}
 else if(ctx->thrown){fputs("[\"throw\",",stdout);oc_value e=ctx->exception;if(e.tag==OC_OBJECT&&e.as.object->cell.object_kind==3){fputs("[\"error\",",stdout);oc_value name=oc_get(ctx,e,3.0),message=oc_get(ctx,e,4.0);if(name.tag==OC_STRING)oc_print_string(stdout,name.as.string);else oc_print(stdout,name,0);fputc(',',stdout);if(message.tag==OC_STRING)oc_print_string(stdout,message.as.string);else oc_print(stdout,message,0);fputc(']',stdout);}else oc_print(stdout,e,0);fputc(']',stdout);}
 else{fprintf(stderr,"object intrinsic failure: %s\n",ctx->failure?ctx->failure:"unknown");status=3;}
 if(!status)fputc('\n',stdout);
 if(getenv("OC_GC_STATS"))fprintf(stderr,"{\"collections\":%zu,\"peakHeapBytes\":%zu,\"heapBytes\":%zu,\"allocations\":%zu}\n",ctx->collections,ctx->peak_heap_bytes,ctx->heap_bytes,ctx->allocations);
 oc_context_free(ctx);return status;
}
#endif
"#);
    let mut program = String::from(
        "/* Generated from the specialized interpreter residual. No guest evaluator. */\n",
    );
    program.push_str("/* Ryu is distributed under the Boost Software License 1.0:\n");
    program.push_str(include_str!("object_c_ryu/LICENSE-Boost"));
    program.push_str("*/\n");
    program.push_str(&ryu_source("d2s.c"));
    program.push_str(&format!("#define OC_ATOMS {atoms}\n"));
    program.push_str(include_str!("object_c_runtime.h"));
    program.push('\n');
    program.push_str(&shared);
    program.push_str(&out);
    Ok(program)
}

#[cfg(test)]
mod root_tests {
    use super::*;
    fn d(n: &str) -> Ev {
        Ev::Def(n.into())
    }
    fn u(n: &str) -> Ev {
        Ev::Use(n.into())
    }
    fn rooted(events: &[Ev]) -> Vec<String> {
        rooted_locals(events, |e| *e == Ev::Safe)
            .unwrap()
            .into_iter()
            .collect()
    }
    #[test]
    fn only_values_read_after_a_collection_point_are_rooted() {
        // a is read after the point, b only before it, c is assigned after it.
        let events = [d("a"), d("b"), u("b"), Ev::Safe, d("c"), u("a"), u("c"), Ev::Exit];
        assert_eq!(rooted(&events), ["a"]);
    }
    #[test]
    fn a_value_reassigned_before_its_next_read_is_not_rooted() {
        let events = [d("a"), Ev::Safe, d("a"), u("a"), Ev::Exit];
        assert!(rooted(&events).is_empty());
    }
    #[test]
    fn a_loop_back_edge_carries_liveness_to_an_earlier_collection_point() {
        // top: use a; collect; if (..) goto end; goto top; end:
        let events = [
            d("a"),
            Ev::Label("top".into()),
            Ev::CondGoto("end".into()),
            Ev::Safe,
            u("a"),
            Ev::Goto("top".into()),
            Ev::Label("end".into()),
            Ev::Exit,
        ];
        assert_eq!(rooted(&events), ["a"]);
        // Without the back edge the read precedes every later collection.
        let straight = [d("a"), u("a"), Ev::Safe, Ev::Exit];
        assert!(rooted(&straight).is_empty());
    }
    #[test]
    fn a_read_on_one_branch_after_a_collection_point_roots_the_value() {
        let events = [
            d("a"),
            d("b"),
            Ev::Safe,
            Ev::If,
            u("a"),
            Ev::Else,
            Ev::EndIf,
            Ev::Exit,
        ];
        assert_eq!(rooted(&events), ["a"]);
        // A collection confined to the branch that does not read it roots nothing.
        let apart = [d("a"), Ev::If, u("a"), Ev::Else, Ev::Safe, Ev::EndIf, Ev::Exit];
        assert!(rooted(&apart).is_empty());
    }
    #[test]
    fn a_callee_that_cannot_collect_is_not_a_collection_point() {
        let events = [d("a"), Ev::SafeIf("guest_1".into()), u("a"), Ev::Exit];
        assert!(rooted_locals(&events, |_| false).unwrap().is_empty());
        let collecting = rooted_locals(&events, |e| matches!(e, Ev::SafeIf(_))).unwrap();
        assert_eq!(collecting.into_iter().collect::<Vec<_>>(), ["a"]);
    }
    #[test]
    fn generated_code_roots_a_local_held_across_an_allocation_and_nothing_else() {
        let c = to_c(
            "function main(n){var a=objNew(objRootProto(0),4);var b=objNew(objRootProto(0),4);objSet(a,3,b);var c=vNum(n);return a;}",
        )
        .unwrap();
        let body = &c[c.rfind("oc_fn_6d61696e(oc_ctx *ctx").unwrap()..];
        // `a` is live across the second allocation; `b` and `c` are not live across any.
        assert_eq!(body.matches("oc_roots[").count(), 2, "{}", &body[..body.find("\n}\n").unwrap()]);
        assert!(body.contains("oc_value oc_roots[1];"));
        // A function that allocates nothing has no frame at all.
        let none = to_c("function main(n){var a=vNum(n);return vBinary(2,a,a);}").unwrap();
        assert!(!none[none.rfind("oc_fn_6d61696e(oc_ctx *ctx").unwrap()..].contains("oc_roots"));
    }
}
