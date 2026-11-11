//! CLI: partially evaluate a real JavaScript file.
//!
//!   js-frontend <file.js> [input ...]
//!
//! Parses the file with SWC, lowers the supported subset, specializes
//! `function main(input)` with the engine, prints the residual program, and (for
//! any integer inputs given) runs both the residual and the reference
//! interpreter and checks they agree.

use std::process::ExitCode;

// (The specializer allocates much and frees much: mimalloc does that
// several times faster than the system allocator.)
#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

/// A weight: a count, or one with a `K`, `M` or `G` suffix (thousands,
/// millions, billions).
fn parse_budget(v: &str) -> Option<u64> {
    let (digits, scale) = match v.chars().last()? {
        'k' | 'K' => (&v[..v.len() - 1], 1_000),
        'm' | 'M' => (&v[..v.len() - 1], 1_000_000),
        'g' | 'G' => (&v[..v.len() - 1], 1_000_000_000),
        _ => (v, 1),
    };
    digits.parse::<u64>().ok()?.checked_mul(scale)
}

fn main() -> ExitCode {
    let mut raw: Vec<String> = std::env::args().collect();
    let emit_js = raw.iter().any(|a| a == "--js");
    // `--long-names`: keep the residual's `v<id>` variable names (and block
    // labels) instead of shortening them.
    let short_names = !raw.iter().any(|a| a == "--long-names");
    // `--source-names`: a residual variable that stands for one variable of
    // the program has its name.
    let source_names = raw.iter().any(|a| a == "--source-names");
    // `--prepack-intrinsics`: the environment defines Prepack's intrinsics
    // (`__abstract(type, name)`, `__optimize(f)`, ...) with their runtime
    // meaning, and the specializer may use what they declare.
    let prepack_intrinsics = raw.iter().any(|a| a == "--prepack-intrinsics");
    // `--closed-script`: no other script reads this one's top-level
    // let/const/class bindings.
    let closed_script = raw.iter().any(|a| a == "--closed-script");
    // `--react`: rely on React's contract (see the engine's `js/react.rs`).
    let react = raw.iter().any(|a| a == "--react");
    // `--ts` (or a `.ts` file): TypeScript; `--no-trust-types`: its type
    // annotations are not taken as facts about values.
    let ts_flag = raw.iter().any(|a| a == "--ts");
    let trust_types = !raw.iter().any(|a| a == "--no-trust-types");
    // `--entry NAME`: specialize the function NAME (default `main`).
    let entry = match raw.iter().position(|a| a == "--entry") {
        Some(i) if i + 1 < raw.len() => {
            let name = raw.remove(i + 1);
            raw.remove(i);
            name
        }
        _ => "main".to_string(),
    };
    // `--conditions NAME` (or `--conditions=NAME`, `-C NAME`; repeatable, or
    // comma-separated): package `exports`/`imports` conditions for a program
    // of modules, as `node --conditions`.
    let mut conditions: Vec<String> = Vec::new();
    let mut i = 1;
    while i < raw.len() {
        if raw[i] == "--conditions" || raw[i] == "-C" {
            if i + 1 >= raw.len() {
                eprintln!("{} needs a condition name", raw[i]);
                return ExitCode::FAILURE;
            }
            let v = raw.remove(i + 1);
            raw.remove(i);
            conditions.extend(v.split(',').filter(|c| !c.is_empty()).map(|c| c.to_string()));
        } else if let Some(v) = raw[i].strip_prefix("--conditions=") {
            conditions.extend(v.split(',').filter(|c| !c.is_empty()).map(|c| c.to_string()));
            raw.remove(i);
        } else {
            i += 1;
        }
    }
    // `--budget N` (or `--budget=N`; `K`/`M`/`G` suffixes): the
    // specialization weight budget, as the `SPEC_WEIGHT_BUDGET` variable sets
    // it (see the engine's `SPEC_WEIGHT_BUDGET`).
    let mut i = 1;
    while i < raw.len() {
        let v = if raw[i] == "--budget" {
            if i + 1 >= raw.len() {
                eprintln!("--budget needs a weight (a count, or with a K/M/G suffix)");
                return ExitCode::FAILURE;
            }
            let v = raw.remove(i + 1);
            raw.remove(i);
            v
        } else if let Some(v) = raw[i].strip_prefix("--budget=") {
            let v = v.to_string();
            raw.remove(i);
            v
        } else {
            i += 1;
            continue;
        };
        match parse_budget(&v) {
            Some(n) => std::env::set_var("SPEC_WEIGHT_BUDGET", n.to_string()),
            None => {
                eprintln!("--budget {v}: not a weight (a count, or with a K/M/G suffix)");
                return ExitCode::FAILURE;
            }
        }
    }
    // `--why`: after the residual, on stderr, the account of what it holds
    // and for what cause; `--why-json FILE`: the same as JSON, in FILE.
    let why = raw.iter().any(|a| a == "--why");
    let why_json = match raw.iter().position(|a| a == "--why-json") {
        Some(i) if i + 1 < raw.len() => {
            let f = raw.remove(i + 1);
            raw.remove(i);
            Some(f)
        }
        Some(_) => {
            eprintln!("--why-json needs a file");
            return ExitCode::FAILURE;
        }
        None => None,
    };
    // `--link-only`: print the linked program (of a program of modules) and stop.
    let link_only = raw.iter().any(|a| a == "--link-only");
    // `--commonjs`: the entry is a CommonJS module (as Node runs a `.js`
    // file); without it, a `.js` file of no declared format and no module
    // syntax is a plain script.
    let commonjs = raw.iter().any(|a| a == "--commonjs");
    let args: Vec<String> = raw.into_iter().filter(|a| a != "--js" && a != "--long-names" && a != "--source-names" && a != "--prepack-intrinsics" && a != "--closed-script" && a != "--react" && a != "--ts" && a != "--no-trust-types" && a != "--link-only" && a != "--commonjs" && a != "--why").collect();
    if args.len() < 2 {
        eprintln!("usage: {} [--js] <file.js> [input ...]", args[0]);
        eprintln!("  --js          print the residual as JavaScript instead of the IR");
        eprintln!("  --long-names  keep the residual's v<id> variable names");
        eprintln!("  --source-names  name the residual's variables as the program names them, where one stands for one");
        eprintln!("  --prepack-intrinsics  the environment defines Prepack's intrinsics (__abstract, ...)");
        eprintln!("  --closed-script  no other script reads this one's top-level let/const/class");
        eprintln!("  --react       rely on React's contract: fold component trees (__optimizeReactComponentTree)");
        eprintln!("  --ts          the file is TypeScript (also for a .ts file); its annotations are facts");
        eprintln!("  --no-trust-types  do not take TypeScript annotations as facts");
        eprintln!("  --entry NAME  the function to specialize (of a program of modules: the entry module's export)");
        eprintln!("  --conditions NAME  a package exports/imports condition (as node --conditions); repeatable");
        eprintln!("  --link-only   print the linked program of a program of modules, and stop");
        eprintln!("  --commonjs    the entry is a CommonJS module (a .js file of no declared format is otherwise a plain script)");
        eprintln!("  --budget N    the specialization weight budget (K/M/G suffixes; as SPEC_WEIGHT_BUDGET)");
        eprintln!("  --why         with --js: what the residual holds and for what cause, on stderr");
        eprintln!("  --why-json F  with --js: the same account as JSON, written to F");
        return ExitCode::FAILURE;
    }
    let path = &args[1];
    let src = match std::fs::read_to_string(path) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("cannot read {path}: {e}");
            return ExitCode::FAILURE;
        }
    };

    // A program of modules (an ES module, or a CommonJS module using
    // `require`/`module`/`exports`) is linked into one program first.
    let module_program = match js_frontend::link::is_module_program(std::path::Path::new(path), &src, commonjs) {
        Ok(b) => b,
        Err(e) => {
            eprintln!("error: {e}");
            return ExitCode::FAILURE;
        }
    };
    let (src, entry) = if module_program {
        let opts = js_frontend::link::LinkOptions { conditions: conditions.clone(), entry: entry.clone() };
        match js_frontend::link::link(std::path::Path::new(path), &opts) {
            Ok(linked) => {
                if let Some(out) = std::env::var_os("PE_LINKED_OUT") {
                    let _ = std::fs::write(out, &linked);
                }
                if link_only {
                    print!("{linked}");
                    return ExitCode::SUCCESS;
                }
                (linked, "main".to_string())
            }
            Err(e) => {
                eprintln!("error: {e}");
                return ExitCode::FAILURE;
            }
        }
    } else {
        if !conditions.is_empty() {
            eprintln!("error: --conditions applies to a program of modules; {path} is a plain script");
            return ExitCode::FAILURE;
        }
        (src, entry)
    };
    let typescript = !module_program && (ts_flag || path.ends_with(".ts"));
    if emit_js && (entry != "main" || typescript || module_program || source_names || why || why_json.is_some()) {
        // (A program of modules is linked to one script whose top-level
        // names are the linker's own: no other script reads them.)
        let opts = js_frontend::LowerOpts { closed_script: closed_script || module_program, typescript, trust_types, react, source_names };
        // (`PE_REPEAT=n`: the whole compilation run n times more first, its
        // output dropped: one process to profile.)
        let repeat: usize = std::env::var("PE_REPEAT").ok().map(|n| n.parse().expect("PE_REPEAT is a count")).unwrap_or(0);
        for _ in 0..repeat {
            let _ = js_frontend::to_js_with(&src, &entry, short_names, prepack_intrinsics, &opts);
        }
        match js_frontend::to_js_why(&src, &entry, short_names, prepack_intrinsics, &opts, why || why_json.is_some()) {
            Ok((js, report)) => {
                println!("--- residual as JavaScript ---");
                print!("{js}");
                if let Some(r) = report {
                    if why {
                        eprint!("{}", r.render(40));
                    }
                    if let Some(f) = &why_json {
                        let text = serde_json::to_string(&js_frontend::why_json(&r)).expect("a report is JSON");
                        if let Err(e) = std::fs::write(f, text) {
                            eprintln!("cannot write {f}: {e}");
                            return ExitCode::FAILURE;
                        }
                    }
                }
                return ExitCode::SUCCESS;
            }
            Err(e) => {
                eprintln!("error: {e}");
                return ExitCode::FAILURE;
            }
        }
    }
    let (vm, prog) = match js_frontend::specialize(&src) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("error: {e}");
            return ExitCode::FAILURE;
        }
    };

    if emit_js {
        match js_frontend::to_js_opts(&src, "main", short_names) {
            Ok(js) => {
                println!("--- residual as JavaScript ({} block(s)) ---", prog.blocks.len());
                print!("{js}");
            }
            Err(e) => {
                eprintln!("error: {e}");
                return ExitCode::FAILURE;
            }
        }
    } else {
        println!("--- residual program ({} block(s)) ---", prog.blocks.len());
        print!("{}", vm.dump(&prog));
    }

    let inputs: Vec<i64> = args[2..].iter().filter_map(|s| s.parse().ok()).collect();
    if !inputs.is_empty() {
        println!("\n--- evaluation (residual vs reference) ---");
        for inp in inputs {
            let got = vm.run_residual(&prog, inp);
            let reference = vm.run_reference(inp);
            let ok = if got == reference { "ok" } else { "MISMATCH" };
            println!("  main({inp}) = {got:?}   [{ok}]");
            if got != reference {
                eprintln!("    reference said {reference:?}");
                return ExitCode::FAILURE;
            }
        }
    }
    ExitCode::SUCCESS
}
