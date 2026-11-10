//! Compile a restricted numeric JS residual, without a JS runtime.
fn main() {
    let args: Vec<_> = std::env::args().collect();
    if args.len() != 2 {
        eprintln!("usage: numeric-to-c residual.js > residual.c");
        std::process::exit(2);
    }
    let result = std::fs::read_to_string(&args[1])
        .map_err(|e| e.to_string())
        .and_then(|s| c_backend::numeric_c::to_c(&s));
    match result {
        Ok(c) => print!("{c}"),
        Err(e) => {
            eprintln!("numeric-to-c: {e}");
            std::process::exit(1);
        }
    }
}
