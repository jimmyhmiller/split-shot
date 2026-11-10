//! Numeric syntax tables for the first-projection experiment. This module only
//! encodes syntax; execution and specialization belong to the JS interpreter.
use serde_json::{json, Value};
use std::collections::BTreeMap;
type Result<T> = std::result::Result<T, String>;
pub const INTERPRETER: &str = include_str!("../docs/numeric-projection/interpreter.js");

#[derive(Clone)]
struct Function {
    ast: Value,
    outer: Vec<Option<usize>>,
    declarations: Vec<usize>,
}
struct Encoder {
    source_functions: Vec<Function>,
    globals: BTreeMap<String, usize>,
    nodes: Vec<Vec<i64>>,
    functions: Vec<Vec<i64>>,
    lists: Vec<i64>,
    constants: Vec<f64>,
    fields: Vec<String>,
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
fn row(mut values: Vec<i64>) -> Vec<i64> {
    values.resize(17, 0);
    values
}
fn bin(op: &str) -> Result<i64> {
    [
        "+", "-", "*", "/", "%", "**", "===", "!==", "==", "!=", "<", "<=", ">", ">=", "|", "&",
        "^", "<<", ">>", ">>>", "&&", "||",
    ]
    .iter()
    .position(|x| *x == op)
    .map(|n| n as i64 + 1)
    .ok_or_else(|| format!("numeric projection: unsupported binary operator {op}"))
}
impl Encoder {
    fn register(&mut self, ast: &Value, outer: Vec<Option<usize>>) -> usize {
        let id = self.source_functions.len();
        self.source_functions.push(Function {
            ast: ast.clone(),
            outer: outer.clone(),
            declarations: vec![],
        });
        self.functions.push(vec![]);
        let mut scope = outer;
        scope.push(Some(id));
        let declarations = array(&ast[2])
            .iter()
            .map(|d| self.register(&d[1], scope.clone()))
            .collect();
        self.source_functions[id].declarations = declarations;
        id
    }
    fn node(&mut self, values: Vec<i64>) -> i64 {
        let id = self.nodes.len() as i64;
        self.nodes.push(row(values));
        id
    }
    fn list(&mut self, values: Vec<i64>) -> (i64, i64) {
        let start = self.lists.len() as i64;
        let n = values.len() as i64;
        self.lists.extend(values);
        (start, n)
    }
    fn literal(&mut self, value: f64) -> i64 {
        let i = self.constants.len() as i64;
        self.constants.push(value);
        self.node(vec![1, i])
    }
    fn callee(&self, v: &Value, scope: &[Option<usize>]) -> Result<(usize, i64)> {
        match tag(v) {
            "global" => Ok((*self.globals.get(v[1].as_str().unwrap()).ok_or("numeric projection: unknown global function")?, -1)),
            "decl" => {
                let depth=num(&v[1]) as usize;
                let owner=scope.get(scope.len().checked_sub(depth+1).ok_or("invalid lexical depth")?).and_then(|v| *v).ok_or("numeric projection: declaration in non-function scope")?;
                let id=*self.source_functions[owner].declarations.get(num(&v[2]) as usize).ok_or("invalid declaration index")?;
                Ok((id,depth as i64))
            }
            _ => Err("numeric projection: call/new callee must be an immutable function declaration; function values and escaping closures are unsupported".into())
        }
    }
    fn exprs(&mut self, values: &Value, scope: &[Option<usize>]) -> Result<(i64, i64)> {
        let out = array(values)
            .iter()
            .map(|v| self.expr(v, scope))
            .collect::<Result<Vec<_>>>()?;
        Ok(self.list(out))
    }
    fn expr(&mut self, v: &Value, scope: &[Option<usize>]) -> Result<i64> {
        let r = match tag(v) {
            "lit" => return match &v[1] {
                Value::Number(n) => Ok(self.literal(n.as_f64().unwrap())),
                Value::Bool(b) => Ok(self.literal(if *b { 1.0 } else { 0.0 })),
                _ => Err(
                    "numeric projection: string/null values are outside the numeric value contract"
                        .into(),
                ),
            },
            "mathconst" if v[1] == "PI" => return Ok(self.literal(std::f64::consts::PI)),
            "var" => vec![3, num(&v[1]), num(&v[2])],
            "bin" => vec![
                4,
                bin(v[1].as_str().unwrap())?,
                self.expr(&v[2], scope)?,
                self.expr(&v[3], scope)?,
            ],
            "unary" => {
                let op = ["-", "+", "!", "~", "void"]
                    .iter()
                    .position(|s| v[1] == *s)
                    .ok_or("unsupported unary operator")?;
                vec![5, op as i64 + 1, self.expr(&v[2], scope)?]
            }
            "cond" => vec![
                6,
                self.expr(&v[1], scope)?,
                self.expr(&v[2], scope)?,
                self.expr(&v[3], scope)?,
            ],
            "array" | "seq" => {
                let (s, n) = self.exprs(&v[1], scope)?;
                vec![if tag(v) == "array" { 7 } else { 14 }, s, n]
            }
            "get" => {
                let base = self.expr(&v[1], scope)?;
                if tag(&v[2]) == "lit" && v[2][1].is_string() {
                    let field = v[2][1].as_str().unwrap();
                    if field == "length" {
                        vec![8, 1, base, 0]
                    } else {
                        if ["__proto__", "prototype", "constructor"].contains(&field) {
                            return Err(
                                "numeric projection: prototype-related fields are unsupported"
                                    .into(),
                            );
                        }
                        let id = if let Some(id) = self.fields.iter().position(|f| f == field) {
                            id
                        } else {
                            self.fields.push(field.into());
                            self.fields.len() - 1
                        };
                        vec![8, 2, base, id as i64]
                    }
                } else {
                    vec![8, 0, base, self.expr(&v[2], scope)?]
                }
            }
            "assign" => {
                if tag(&v[2]) == "get" && v[2][2][1] == "length" {
                    return Err("numeric projection: length mutation is unsupported".into());
                }
                vec![
                    9,
                    if v[1] == "=" {
                        0
                    } else {
                        bin(v[1].as_str().unwrap())?
                    },
                    self.expr(&v[2], scope)?,
                    self.expr(&v[3], scope)?,
                ]
            }
            "update" => vec![
                10,
                num(&v[1]),
                num(&v[2]),
                num(&v[3]),
                if v[4].as_bool().unwrap() { 1 } else { 0 },
            ],
            "call" | "new" => {
                let (id, depth) = self.callee(&v[1], scope)?;
                if tag(v) == "new" && has_return(&self.source_functions[id].ast[3]) {
                    return Err(
                        "numeric projection: constructors with explicit returns are unsupported"
                            .into(),
                    );
                }
                let (s, n) = self.exprs(&v[2], scope)?;
                vec![
                    11,
                    id as i64,
                    depth,
                    s,
                    n,
                    if tag(v) == "new" { 1 } else { 0 },
                ]
            }
            "this" => vec![12],
            "mathcall" if v[1] == "sqrt" => {
                let args = array(&v[2]);
                if args.len() != 1 {
                    return Err(
                        "numeric projection: Math.sqrt requires exactly one argument".into(),
                    );
                }
                vec![13, self.expr(&args[0], scope)?]
            }
            other => {
                return Err(format!(
                    "numeric projection: expression {other:?} is outside the numeric profile"
                ))
            }
        };
        Ok(self.node(r))
    }
    fn stmt(&mut self, v: &Value, scope: &[Option<usize>]) -> Result<i64> {
        let mut nested = scope.to_vec();
        if (tag(v) == "block" && num(&v[2]) > 0) || (tag(v) == "for" && num(&v[5]) > 0) {
            nested.push(None);
        }
        let scope = &nested;
        let r = match tag(v) {
            "empty" => vec![100],
            "expr" => vec![101, self.expr(&v[1], scope)?],
            "var" => {
                let mut ds = vec![];
                for d in array(&v[1]) {
                    let init = if d[2].is_null() {
                        -1
                    } else if tag(&d[2]) == "undefined" {
                        self.literal(0.0)
                    } else {
                        self.expr(&d[2], scope)?
                    };
                    ds.extend([num(&d[0]), num(&d[1]), init]);
                }
                let count = ds.len() / 3;
                let (s, _) = self.list(ds);
                vec![102, s, count as i64]
            }
            "return" => vec![
                103,
                if tag(&v[1]) == "undefined" {
                    -1
                } else {
                    self.expr(&v[1], scope)?
                },
            ],
            "break" => vec![104],
            "continue" => vec![105],
            "if" => vec![
                106,
                self.expr(&v[1], scope)?,
                self.stmt(&v[2], scope)?,
                self.stmt(&v[3], scope)?,
            ],
            "while" => vec![107, self.expr(&v[1], scope)?, self.stmt(&v[2], scope)?],
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
                num(&v[5]),
            ],
            "block" => {
                let ds = array(&v[1])
                    .iter()
                    .map(|s| self.stmt(s, scope))
                    .collect::<Result<Vec<_>>>()?;
                let (s, n) = self.list(ds);
                vec![109, s, n, num(&v[2])]
            }
            other => return Err(format!("numeric projection: unsupported statement {other}")),
        };
        Ok(self.node(r))
    }
}
fn has_return(v: &Value) -> bool {
    tag(v) == "return" || v.as_array().is_some_and(|a| a.iter().any(has_return))
}

fn reject_explicit_undefined(source: &str) -> Result<()> {
    use swc_common::{sync::Lrc, FileName, SourceMap};
    use swc_ecma_parser::{lexer::Lexer, Parser, StringInput, Syntax};
    use swc_ecma_visit::{Visit, VisitWith};
    struct Check(bool);
    impl Visit for Check {
        fn visit_expr(&mut self, expr: &swc_ecma_ast::Expr) {
            if matches!(expr, swc_ecma_ast::Expr::Ident(i) if i.sym == "undefined") {
                self.0 = true;
            }
            expr.visit_children_with(self);
        }
    }
    let cm: Lrc<SourceMap> = Default::default();
    let file = cm.new_source_file(
        Lrc::new(FileName::Custom("numeric-guest.js".into())),
        source.to_owned(),
    );
    let lexer = Lexer::new(
        Syntax::Es(Default::default()),
        swc_ecma_ast::EsVersion::EsNext,
        StringInput::from(&*file),
        None,
    );
    let mut parser = Parser::new_from(lexer);
    let module = parser
        .parse_module()
        .map_err(|e| format!("numeric projection parse error: {:?}", e.kind()))?;
    let mut check = Check(false);
    module.visit_with(&mut check);
    if check.0 {
        Err("numeric projection: explicit undefined values are unsupported".into())
    } else {
        Ok(())
    }
}

/// Serialize the original lexical AST into numeric-only runtime tables.
pub fn encode(source: &str) -> Result<Value> {
    // The lexical table deliberately represents omitted and explicit undefined
    // identically. Check the source before that loss of information.
    reject_explicit_undefined(source)?;
    let lexical = crate::projection::encode(source)?;
    let mut e = Encoder {
        source_functions: vec![],
        globals: BTreeMap::new(),
        nodes: vec![],
        functions: vec![],
        lists: vec![],
        constants: vec![],
        fields: vec![],
    };
    for entry in array(&lexical) {
        let id = e.register(&entry[1], vec![]);
        e.globals.insert(entry[0].as_str().unwrap().into(), id);
    }
    for id in 0..e.source_functions.len() {
        let f = e.source_functions[id].clone();
        let mut scope = f.outer;
        scope.push(Some(id));
        let body = e.stmt(&f.ast[3], &scope)?;
        e.functions[id] = row(vec![num(&f.ast[0]), num(&f.ast[1]), body]);
    }
    Ok(
        json!({"nodes":e.nodes,"functions":e.functions,"lists":e.lists,"constants":e.constants,"fields":e.fields,"main":e.globals["main"],"profile":"numeric-own-fields-v1"}),
    )
}
pub fn harness(program: &Value) -> String {
    format!("function main(input) {{\nvar nodes={};\nvar functions={};\nvar lists={};\nvar constants={};\nvar fieldCount={};\nvar heap=allocF64(4096);\nvar stack=allocF64(4096);\nvar state=allocF64(4);\nstoreF64(state,0,1);storeF64(state,1,1);storeF64(state,2,0);\n{}\nreturn invoke(functions[{}],0,[input],0);\n}}\n",program["nodes"],program["functions"],program["lists"],program["constants"],array(&program["fields"]).len(),INTERPRETER,program["main"])
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn nbody_is_original_syntax_data() {
        let p = encode(include_str!(
            "../docs/first-projection/benchmarks/nbody/input.js"
        ))
        .unwrap();
        for table in ["nodes", "functions"] {
            for r in array(&p[table]) {
                assert_eq!(array(r).len(), 17);
                assert!(array(r).iter().all(Value::is_number));
            }
        }
        assert!(array(&p["nodes"]).iter().any(|n| n[0] == 11 && n[5] == 1));
        assert!(array(&p["fields"]).len() > 0);
    }
    #[test]
    fn rejects_tagged_and_indirect_values() {
        for source in [
            "function main(x){return 'hi'}",
            "function main(x){return null}",
            "function main(x){return undefined}",
            "function main(x){return ()=>x}",
            "function main(x){function f(){return x}return f}",
            "function main(x){return x(1)}",
            "function main(x){return x??2}",
            "function main(x){x.length=2;return x}",
            "function main(x){function C(){return 3}return new C()}",
        ] {
            assert!(encode(source).is_err(), "accepted {source}");
        }
    }
    #[test]
    fn declarations_capture_across_lexical_frames() {
        let p=encode("function main(x){function f(){return x} {let y=2;f();} for(let i=0;i<2;i++){let j=i;f();} return f()}").unwrap();
        let calls: Vec<_> = array(&p["nodes"]).iter().filter(|n| n[0] == 11).collect();
        assert_eq!(calls.len(), 3);
        assert_eq!(calls[0][2], 1);
        assert_eq!(calls[1][2], 2);
        assert_eq!(calls[2][2], 0);
        assert!(calls.iter().all(|n| n[1] == 1));
    }
    #[test]
    fn global_forward_calls_are_resolved() {
        let p = encode("function main(x){return f(x)}function f(x){return x+1}").unwrap();
        let c = array(&p["nodes"]).iter().find(|n| n[0] == 11).unwrap();
        assert_eq!(c[1], 1);
        assert_eq!(c[2], -1);
    }
    #[test]
    fn numeric_interpreter_matches_original() {
        for source in [
            "function main(x){function f(y){return y+x} {let x=20;var z=f(3)} return z}",
            "function main(x){function f(y){if(y<=1)return 1;return y*f(y-1)}return f(x)}",
            "function main(x){let s=0;for(let i=0;i<x;i++){if(i===1)continue;s+=i;if(i===4)break;}return s}",
            "function main(x){let i=0;for(;;){i++;if(i>=x)break;}return i}",
            "function main(x){function Body(v){this.v=v}let a=[new Body(x),new Body(3)];return a[0].v+a[1].v}",
            include_str!("../docs/first-projection/benchmarks/nbody/input.js"),
        ] {
            let interpreted = harness(&encode(source).unwrap());
            let script = format!("const vm=require('node:vm'),assert=require('node:assert/strict');const a={{}},b={{allocF64:n=>new Float64Array(n),loadF64:(a,i)=>a[i],storeF64:(a,i,v)=>(a[i]=v),f64Sqrt:Math.sqrt,failCapacity:()=>{{throw Error('capacity')}}}};vm.runInNewContext({source:?},a);vm.runInNewContext({interpreted:?},b);for(const n of [1,3,5])assert.equal(a.main(n),b.main(n));");
            let output = std::process::Command::new("node").args(["-e", &script]).output().unwrap();
            assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
        }
    }
}
