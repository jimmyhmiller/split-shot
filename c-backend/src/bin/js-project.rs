//! First Futamura projection: specialize interpreter.js with a static guest AST.
use std::process::ExitCode;
fn run() -> Result<(), String> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let (mode, file) = match args.as_slice() {
        [file] => ("compile", file),
        [flag, file] if flag == "--ast" => ("ast", file),
        [flag, file] if flag == "--harness" => ("harness", file),
        [flag, file] if flag == "--check-target" => ("check", file),
        _ => return Err("usage: js-project [--ast | --harness | --check-target] guest.js".into()),
    };
    let source = std::fs::read_to_string(file).map_err(|e| format!("{file}: {e}"))?;
    if mode == "check" {
        println!("{}", c_backend::projection::check_target(&source)?);
        return Ok(());
    }
    let program = c_backend::projection::encode(&source)?;
    if mode == "ast" {
        println!("{program}");
        return Ok(());
    }
    let harness = c_backend::projection::harness(&program);
    if mode == "harness" {
        print!("{harness}");
        return Ok(());
    }
    // An experiment must fail quickly instead of spending minutes unfolding
    // currently unsupported dynamic recursion. Callers may raise this budget.
    if std::env::var_os("SPEC_WEIGHT_BUDGET").is_none() {
        std::env::set_var("SPEC_WEIGHT_BUDGET", "1000000");
    }
    let start = std::time::Instant::now();
    let residual = js_frontend::to_js_opts(&harness, "main", true)?;
    eprintln!(
        "projection: guest={} AST={} interpreter={} residual={} bytes, {:.3} ms",
        source.len(),
        program.to_string().len(),
        c_backend::projection::INTERPRETER.len(),
        residual.len(),
        start.elapsed().as_secs_f64() * 1000.0
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
