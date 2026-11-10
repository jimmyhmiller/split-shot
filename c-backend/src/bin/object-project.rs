//! Object interpreter first projection. The encoder produces data; the
//! interpreter and semantic intrinsics define execution.
use std::process::ExitCode;
/// The static shapes the specializer follows receivers through. A shape is
/// the atoms of an object's keys in the order they were added; its id is
/// its index. 0 is no shape and 1 the empty one.
struct Shapes {
    keys: Vec<Vec<i64>>,
    /// (from, atom, to): adding `atom` to shape `from` gives shape `to`.
    steps: Vec<(usize, i64, usize)>,
}
impl Shapes {
    fn new() -> Shapes {
        Shapes { keys: vec![vec![], vec![]], steps: vec![] }
    }
    /// The shape after adding `atom` to `from`, made if it is new.
    fn step(&mut self, from: usize, atom: i64) -> usize {
        if let Some(s) = self.steps.iter().find(|s| s.0 == from && s.1 == atom) {
            return s.2;
        }
        let mut keys = self.keys[from].clone();
        keys.push(atom);
        self.keys.push(keys);
        let to = self.keys.len() - 1;
        self.steps.push((from, atom, to));
        to
    }
    fn tables(&self) -> String {
        format!(
            "var shapeKeys={};\nvar shapeSteps={};\n",
            serde_json::to_string(&self.keys).unwrap(),
            serde_json::to_string(&self.steps.iter().map(|s| vec![s.0 as i64, s.1, s.2 as i64]).collect::<Vec<_>>()).unwrap()
        )
    }
    /// Declarations of every shape to the run time, parents first.
    fn declarations(&self) -> String {
        self.steps.iter().map(|s| format!("shapeDeclare({},{},{});\n", s.2, s.0, s.1)).collect()
    }
}
/// What one guest function is specialized for. `shape` is the receiver's
/// shape on entry (0: any receiver). `variants` lists, for the general
/// version, the (shape, code) pairs it hands a receiver of that shape to.
struct Entry<'a> {
    guest: Option<usize>,
    shape: usize,
    variants: &'a [(usize, usize)],
}
fn harness(p: &serde_json::Value, entry: &Entry, shapes: &Shapes, ordinary: bool) -> Result<String, String> {
    let mut source = format!("function main(input) {{\nvar nodes={};\nvar functions={};\nvar lists={};\nvar constants={};\nvar keyCount={};\nvar entryShape={};\n{}",p["nodes"],p["functions"],p["lists"],p["constants"],p["keys"].as_array().ok_or("keys required")?.len(),entry.shape,shapes.tables());
    if ordinary {
        source.push_str("function callGuest(code,parent,receiver,args) {enterGuest();var value=invoke(functions[code],parent,args,receiver,args);leaveGuest();return value;}\nfunction callGuestOneOf(code,parent,receiver,args,first,second,third,fourth) {return callGuest(code,parent,receiver,args);}\nfunction callSpread(code,parent,receiver,list) {return callGuest(code,parent,receiver,arrValues(list));}\nfunction frameArgCount(frame) {return frame.length;}\nfunction frameArg(frame,i) {if(i<frame.length)return frame[i];return vUndef();}\nfunction callRest(code,parent,receiver,frame,skip) {return callGuest(code,parent,receiver,frame.slice(skip));}\nfunction callProtected(code,parent,receiver,args) {return protectedInvoke(function(){return callGuest(code,parent,receiver,args);});}\n");
    } else {
        // A specialized function reads its actual arguments from its native frame.
        source.push_str("function frameArgCount(frame) {return callArgCount(frame);}\nfunction frameArg(frame,i) {return callArg(frame,i);}\nfunction callRest(code,parent,receiver,frame,skip) {return callGuestRest(code,parent,receiver,frame,skip);}\nfunction callProtected(code,parent,receiver,args) {return callGuestProtected(code,parent,receiver,args);}\nfunction callSpread(code,parent,receiver,list) {return callGuestSpread(code,parent,receiver,list);}\n");
    }
    source.push_str(include_str!(
        "../../docs/object-projection/interpreter.js"
    ));
    if let Some(id) = entry.guest {
        let arity = p["functions"][id][0]
            .as_u64()
            .ok_or("function arity required")?;
        let args = (0..arity)
            .map(|i| format!("callArg(input,{i})"))
            .collect::<Vec<_>>()
            .join(",");
        // The general version first hands a receiver of a shape the function
        // has a version for to that version, with the same frame.
        if !entry.variants.is_empty() {
            source.push_str("\nvar receiverShape=objShapeId(callThis(input));");
            for (shape, code) in entry.variants {
                source.push_str(&format!("\nif(receiverShape==={shape})return callGuestRest({code},callEnv(input),callThis(input),input,0);"));
            }
        }
        source.push_str(&format!(
            "\nreturn invoke(functions[{id}],callEnv(input),[{args}],callThis(input),input);\n}}\n"
        ));
    } else {
        source.push_str(&format!("\n{}{}return invoke(functions[{}],vNull(),[vNum(input)],vUndef(),{});\n}}\n",c_backend::object_projection::atom_registration(p),shapes.declarations(),p["entry"],if ordinary {"[vNum(input)]"} else {"input"}));
    }
    Ok(source)
}
/// The requests a residual makes of the driver: `shapeNote(kind, a, b)` with
/// literal arguments. Kind 1 asks for the shape after adding atom `b` to
/// shape `a`; kind 2 reports that a receiver is left with shape `a`.
fn notes(residual: &str) -> Result<Vec<(u32, usize, i64)>, String> {
    let mut out = vec![];
    let mut rest = residual;
    while let Some(at) = rest.find("shapeNote") {
        let before = rest[..at].chars().next_back();
        rest = &rest[at + "shapeNote".len()..];
        if before.is_some_and(|c| c.is_alphanumeric() || c == '_' || c == '$') {
            continue;
        }
        let Some(inside) = rest.strip_prefix('(') else {
            return Err("a residual uses shapeNote other than by calling it".into());
        };
        let close = inside.find(')').ok_or("unterminated shapeNote call")?;
        let parts: Vec<&str> = inside[..close].split(',').map(str::trim).collect();
        // (A shape that became a run-time number where two paths met: there
        // is nothing to ask for.)
        let numbers: Option<Vec<i64>> = parts.iter().map(|p| p.parse::<i64>().ok()).collect();
        if let Some(n) = numbers.filter(|n| n.len() == 3) {
            out.push((n[0] as u32, n[1] as usize, n[2]));
        }
    }
    Ok(out)
}
/// The atoms a residual names as the key of a named property operation.
fn property_atoms(residual: &str) -> std::collections::BTreeSet<i64> {
    let mut out = std::collections::BTreeSet::new();
    for op in ["objGet(", "objGetAny(", "objGetOwn(", "objGetSlot(", "objSet(", "objSetOwn(", "objSetSlot("] {
        let mut rest = residual;
        while let Some(at) = rest.find(op) {
            rest = &rest[at + op.len()..];
            // The key is the second argument, a literal after the base.
            let Some(comma) = rest.find(',') else { break };
            let digits: String = rest[comma + 1..].trim_start().chars().take_while(|c| c.is_ascii_digit()).collect();
            if let Ok(atom) = digits.parse() {
                out.insert(atom);
            }
        }
    }
    out
}
fn rename(source: &str, entry: &str, prefix: &str) -> Result<String, String> {
    use std::collections::BTreeMap;
    use swc_common::{sync::Lrc, SourceMap};
    use swc_ecma_ast::{Decl, Ident, ModuleItem, Stmt};
    use swc_ecma_codegen::{text_writer::JsWriter, Config, Emitter, Node};
    use swc_ecma_visit::{VisitMut, VisitMutWith};
    struct Rename(BTreeMap<String, String>);
    impl VisitMut for Rename {
        fn visit_mut_ident(&mut self, ident: &mut Ident) {
            if let Some(name) = self.0.get(ident.sym.as_ref()) {
                ident.sym = name.clone().into();
            }
        }
    }
    let mut module = js_frontend::parse(source)?;
    let mut names = BTreeMap::new();
    for item in &module.body {
        // The specializer shares a repeated string literal as a module
        // variable, numbered from zero in every function it specializes.
        if let ModuleItem::Stmt(Stmt::Decl(Decl::Var(v))) = item {
            for d in &v.decls {
                if let swc_ecma_ast::Pat::Ident(name) = &d.name {
                    let n = name.id.sym.to_string();
                    names.insert(n.clone(), format!("{prefix}{n}"));
                }
            }
        }
        if let ModuleItem::Stmt(Stmt::Decl(Decl::Fn(f))) = item {
            let n = f.ident.sym.to_string();
            names.insert(
                n.clone(),
                if n == "main" {
                    entry.to_owned()
                } else {
                    format!("{prefix}{n}")
                },
            );
        }
    }
    module.visit_mut_with(&mut Rename(names));
    let cm: Lrc<SourceMap> = Default::default();
    let mut bytes = vec![];
    {
        let mut emitter = Emitter {
            cfg: Config::default(),
            cm: cm.clone(),
            comments: None,
            wr: JsWriter::new(cm, "\n", &mut bytes, None),
        };
        module.emit_with(&mut emitter).map_err(|e| e.to_string())?;
    }
    String::from_utf8(bytes).map_err(|e| e.to_string())
}
fn run() -> Result<(), String> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let (mode, file) = match args.as_slice() {
        [file] => ("compile", file),
        [flag, file] if flag == "--ast" => ("ast", file),
        [flag, file] if flag == "--harness" => ("harness", file),
        _ => return Err("usage: object-project [--ast | --harness] guest.js".into()),
    };
    let source = std::fs::read_to_string(file).map_err(|e| format!("{file}: {e}"))?;
    let program = c_backend::object_projection::encode(&source)?;
    if mode == "ast" {
        println!("{program}");
        return Ok(());
    }
    if mode == "harness" {
        print!("{}", harness(&program, &Entry { guest: None, shape: 0, variants: &[] }, &Shapes::new(), true)?);
        return Ok(());
    }
    for (key, value) in [
        ("SPEC_WEIGHT_BUDGET", "150000000"),
        ("PE_NO_SHARED_CONTEXTS", "1"),
        ("PE_CONTEXT_POINTS", "1"),
    ] {
        if std::env::var_os(key).is_none() {
            std::env::set_var(key, value);
        }
    }
    let started = std::time::Instant::now();
    let functions = program["functions"].as_array().ok_or("functions required")?;
    let count = functions.len();
    let mut shapes = Shapes::new();
    // A version of a function per receiver shape. The specializer follows
    // the receiver's shape through the function, so a version for a shape
    // reads and writes the receiver's properties at their slots. Which
    // shapes are worth a version is found by trying: a function is
    // specialized for the empty shape (a constructor's receiver) and for
    // every shape some version leaves its receiver with, and the version is
    // kept when the shape made a difference. A version that needs a shape
    // not yet known asks for it and is specialized again.
    // (`OBJECT_PROJECT_NO_SHAPES`: only the general versions.)
    let follow = std::env::var_os("OBJECT_PROJECT_NO_SHAPES").is_none();
    let uses_shape = |text: &str| ["objGetAt(", "objSetAt(", "objAddKnown("].iter().any(|op| text.contains(op));
    // Arrows take their scope's receiver, of which nothing is known.
    let candidates: Vec<usize> = (1..count).filter(|&id| follow && functions[id][5].as_i64() == Some(0)).collect();
    // Trying every function for every shape costs a specialization each. A
    // function is tried for a non-empty shape only when its general version
    // names, in some property operation, a key the shape has: following the
    // receiver's shape can only change operations on those keys.
    // The empty shape has no keys: only a function that stores a named
    // property can gain from starting there.
    let mut named: std::collections::BTreeMap<usize, std::collections::BTreeSet<i64>> = Default::default();
    let mut stores: std::collections::BTreeSet<usize> = Default::default();
    let mut general: std::collections::BTreeMap<usize, String> = Default::default();
    for id in 1..count {
        let input = harness(&program, &Entry { guest: Some(id), shape: 0, variants: &[] }, &shapes, false)?;
        let text = js_frontend::to_js_opts(&input, "main", true)?;
        named.insert(id, property_atoms(&text));
        if ["objSet(", "objSetOwn(", "objSetSlot("].iter().any(|op| text.contains(op)) {
            stores.insert(id);
        }
        general.insert(id, text);
    }
    let mut tried: std::collections::BTreeSet<(usize, usize)> = Default::default();
    let mut kept: std::collections::BTreeMap<(usize, usize), String> = Default::default();
    let mut receivers: std::collections::BTreeSet<usize> = [1].into();
    loop {
        let pending: Vec<(usize, usize)> = candidates
            .iter()
            .flat_map(|&id| receivers.iter().map(move |&shape| (id, shape)))
            .filter(|pair| !tried.contains(pair))
            .filter(|(id, shape)| if *shape == 1 { stores.contains(id) } else { shapes.keys[*shape].iter().any(|atom| named[id].contains(atom)) })
            .collect();
        if pending.is_empty() {
            break;
        }
        for (id, shape) in pending {
            tried.insert((id, shape));
            // Specialized again for as long as it asks for a shape.
            let text = loop {
                let input = harness(&program, &Entry { guest: Some(id), shape, variants: &[] }, &shapes, false)?;
                let text = js_frontend::to_js_opts(&input, "main", true)?;
                let found = notes(&text)?;
                let known = shapes.keys.len();
                for (kind, from, atom) in &found {
                    if *kind == 1 {
                        shapes.step(*from, *atom);
                    }
                }
                if shapes.keys.len() == known {
                    for (kind, left, _) in found {
                        if kind == 2 {
                            receivers.insert(left);
                        }
                    }
                    break text;
                }
            };
            let used = uses_shape(&text);
            eprintln!("object function {id} for shape {shape} {:?}: {} bytes{}", shapes.keys[shape], text.len(), if used { "" } else { ", no use of the shape" });
            if used {
                kept.insert((id, shape), text);
            }
        }
    }
    // A version made before a shape was known was specialized with smaller
    // tables. Each is specialized once more with the final ones, so every
    // version agrees on what the shapes are.
    let codes: std::collections::BTreeMap<(usize, usize), usize> =
        kept.keys().enumerate().map(|(i, key)| (*key, count + i)).collect();
    let mut residual = String::new();
    for id in 0..count {
        let variants: Vec<(usize, usize)> = codes.iter().filter(|(key, _)| key.0 == id).map(|(key, code)| (key.1, *code)).collect();
        // (With no version to hand a receiver to, the general version is
        // the one already made: the shape tables do not enter it.)
        let projected = match general.remove(&id).filter(|_| variants.is_empty()) {
            Some(text) => text,
            None => {
                let input = harness(&program, &Entry { guest: if id == 0 { None } else { Some(id) }, shape: 0, variants: &variants }, &shapes, false)?;
                js_frontend::to_js_opts(&input, "main", true)?
            }
        };
        let entry = if id == 0 {
            "main".to_owned()
        } else {
            format!("guest_{id}")
        };
        residual.push_str(&rename(&projected, &entry, &format!("fragment_{id}_"))?);
        eprintln!("object function {id}/{count}: {} bytes", projected.len());
    }
    for ((id, shape), code) in &codes {
        let input = harness(&program, &Entry { guest: Some(*id), shape: *shape, variants: &[] }, &shapes, false)?;
        let projected = js_frontend::to_js_opts(&input, "main", true)?;
        if notes(&projected)?.iter().any(|n| n.0 == 1) {
            return Err(format!("function {id} for shape {shape} still asks for a shape after the shapes settled"));
        }
        residual.push_str(&rename(&projected, &format!("guest_{code}"), &format!("fragment_{code}_"))?);
        eprintln!("object function {id} for shape {shape} as {code}: {} bytes", projected.len());
    }
    eprintln!(
        "object projection: source={} AST={} functions={} versions={} shapes={} interpreter={} residual={} bytes {:.3}ms",
        source.len(),
        program.to_string().len(),
        count,
        codes.len(),
        shapes.keys.len() - 1,
        include_str!("../../docs/object-projection/interpreter.js").len(),
        residual.len(),
        started.elapsed().as_secs_f64() * 1000.0
    );
    print!("{residual}");
    Ok(())
}
fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("{e}");
            ExitCode::FAILURE
        }
    }
}
