//! Object interpreter first projection. The encoder produces data; the
//! interpreter and semantic intrinsics define execution.
use std::process::ExitCode;
fn harness(p: &serde_json::Value, guest: Option<usize>, ordinary: bool) -> Result<String, String> {
    let mut source = format!("function main(input) {{\nvar nodes={};\nvar functions={};\nvar lists={};\nvar constants={};\nvar keyCount={};\nvar entryShape=-1;\n",p["nodes"],p["functions"],p["lists"],p["constants"],p["keys"].as_array().ok_or("keys required")?.len());
    if ordinary {
        source.push_str("function callGuest(code,parent,receiver,args) {enterGuest();var value=invoke(functions[code],parent,args,receiver,args);leaveGuest();return value;}\nfunction callGuestOneOf(code,parent,receiver,args,first,second,third,fourth) {return callGuest(code,parent,receiver,args);}\nfunction callSpread(code,parent,receiver,list) {return callGuest(code,parent,receiver,arrValues(list));}\nfunction frameArgCount(frame) {return frame.length;}\nfunction frameArg(frame,i) {if(i<frame.length)return frame[i];return vUndef();}\nfunction callRest(code,parent,receiver,frame,skip) {return callGuest(code,parent,receiver,frame.slice(skip));}\nfunction callProtected(code,parent,receiver,args) {return protectedInvoke(function(){return callGuest(code,parent,receiver,args);});}\n");
    } else {
        // A specialized function reads its actual arguments from its native frame.
        source.push_str("function frameArgCount(frame) {return callArgCount(frame);}\nfunction frameArg(frame,i) {return callArg(frame,i);}\nfunction callRest(code,parent,receiver,frame,skip) {return callGuestRest(code,parent,receiver,frame,skip);}\nfunction callProtected(code,parent,receiver,args) {return callGuestProtected(code,parent,receiver,args);}\nfunction callSpread(code,parent,receiver,list) {return callGuestSpread(code,parent,receiver,list);}\n");
    }
    source.push_str(include_str!(
        "../../docs/object-projection/interpreter.js"
    ));
    if let Some(id) = guest {
        let arity = p["functions"][id][0]
            .as_u64()
            .ok_or("function arity required")?;
        let args = (0..arity)
            .map(|i| format!("callArg(input,{i})"))
            .collect::<Vec<_>>()
            .join(",");
        source.push_str(&format!(
            "\nreturn invoke(functions[{id}],callEnv(input),[{args}],callThis(input),input);\n}}\n"
        ));
    } else {
        source.push_str(&format!("\n{}return invoke(functions[{}],vNull(),[vNum(input)],vUndef(),{});\n}}\n",c_backend::object_projection::atom_registration(p),p["entry"],if ordinary {"[vNum(input)]"} else {"input"}));
    }
    Ok(source)
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
        print!("{}", harness(&program, None, true)?);
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
    let mut residual = String::new();
    let count = program["functions"]
        .as_array()
        .ok_or("functions required")?
        .len();
    for id in 0..count {
        let input = harness(&program, if id == 0 { None } else { Some(id) }, false)?;
        let projected = js_frontend::to_js_opts(&input, "main", true)?;
        let entry = if id == 0 {
            "main".to_owned()
        } else {
            format!("guest_{id}")
        };
        residual.push_str(&rename(&projected, &entry, &format!("fragment_{id}_"))?);
        eprintln!("object function {id}/{count}: {} bytes", projected.len());
    }
    eprintln!(
        "object projection: source={} AST={} functions={} interpreter={} residual={} bytes {:.3}ms",
        source.len(),
        program.to_string().len(),
        count,
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
