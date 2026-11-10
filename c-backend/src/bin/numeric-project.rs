//! First Futamura projection: specialize interpreter.js with a static guest AST.
use std::process::ExitCode;
fn run() -> Result<(), String> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let (mode, file) = match args.as_slice() {
        [file] => ("compile", file),
        [flag, file] if flag == "--ast" => ("ast", file),
        [flag, file] if flag == "--harness" => ("harness", file),
        _ => return Err("usage: numeric-project [--ast | --harness] guest.js".into()),
    };
    let source = std::fs::read_to_string(file).map_err(|e| format!("{file}: {e}"))?;
    let program = c_backend::numeric_projection::encode(&source)?;
    if mode == "ast" {
        println!("{program}");
        return Ok(());
    }
    let harness = c_backend::numeric_projection::harness(&program);
    if mode == "harness" {
        print!("{harness}");
        return Ok(());
    }
    // An experiment must fail quickly instead of spending minutes unfolding
    // currently unsupported dynamic recursion. Callers may raise this budget.
    if std::env::var_os("SPEC_WEIGHT_BUDGET").is_none() {
        std::env::set_var("SPEC_WEIGHT_BUDGET", "150000000");
    }
    if std::env::var_os("PE_NO_SHARED_CONTEXTS").is_none() {
        std::env::set_var("PE_NO_SHARED_CONTEXTS", "1");
    }
    if std::env::var_os("PE_CONTEXT_POINTS").is_none() {
        std::env::set_var("PE_CONTEXT_POINTS", "1");
    }
    let start = std::time::Instant::now();
    let residual = js_frontend::to_js_opts(&harness, "main", true)?;
    eprintln!(
        "projection: guest={} AST={} interpreter={} residual={} bytes, {:.3} ms",
        source.len(),
        program.to_string().len(),
        c_backend::numeric_projection::INTERPRETER.len(),
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
