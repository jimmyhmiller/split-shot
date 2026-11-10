use std::process::ExitCode;
fn main() -> ExitCode {
    let args: Vec<_> = std::env::args().skip(1).collect();
    if args.len() != 1 {
        eprintln!("usage: object-to-c residual.js");
        return ExitCode::FAILURE;
    }
    let source = match std::fs::read_to_string(&args[0]) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("{e}");
            return ExitCode::FAILURE;
        }
    };
    match c_backend::object_c::to_c(&source) {
        Ok(c) => {
            print!("{c}");
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("{e}");
            ExitCode::FAILURE
        }
    }
}
