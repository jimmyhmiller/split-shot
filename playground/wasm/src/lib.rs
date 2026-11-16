//! wasm-bindgen bridge for the playground: parse + specialize a JS source in the
//! browser and hand back the residual (as JS and as the engine's IR dump) plus
//! the engine's work counters.

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    /// Installed by the worker before any call. A Rust panic aborts the wasm
    /// instance (it becomes an `unreachable` trap), so the message is reported
    /// out-of-band from the panic hook before the trap unwinds into JS.
    #[wasm_bindgen(js_name = __pePanic)]
    fn pe_panic(msg: &str);
}

#[wasm_bindgen(start)]
pub fn start() {
    std::panic::set_hook(Box::new(|info| {
        let msg = match info.payload().downcast_ref::<&str>() {
            Some(s) => s.to_string(),
            None => match info.payload().downcast_ref::<String>() {
                Some(s) => s.clone(),
                None => "panic with a non-string payload".to_string(),
            },
        };
        let loc = info
            .location()
            .map(|l| format!(" ({}:{})", l.file(), l.line()))
            .unwrap_or_default();
        pe_panic(&format!("{msg}{loc}"));
    }));
}

#[wasm_bindgen]
pub struct SpecResult {
    js: String,
    ir: String,
    why: String,
    blocks: u32,
    steps: f64,
    weight: f64,
}

#[wasm_bindgen]
impl SpecResult {
    #[wasm_bindgen(getter)]
    pub fn js(&self) -> String {
        self.js.clone()
    }
    #[wasm_bindgen(getter)]
    pub fn ir(&self) -> String {
        self.ir.clone()
    }
    /// The `why` report as JSON (see `js_frontend::why_json`), or "" when
    /// it was not asked for.
    #[wasm_bindgen(getter)]
    pub fn why(&self) -> String {
        self.why.clone()
    }
    #[wasm_bindgen(getter)]
    pub fn blocks(&self) -> u32 {
        self.blocks
    }
    #[wasm_bindgen(getter)]
    pub fn steps(&self) -> f64 {
        self.steps
    }
    #[wasm_bindgen(getter)]
    pub fn weight(&self) -> f64 {
        self.weight
    }
}

/// Specialize the function `entry` of `src` (its one parameter is the
/// dynamic input) with the CLI's pipeline. `budget` is the specialization
/// weight budget (0 = engine default); `source_names` names residual
/// variables as the source does; `why` also returns the account of what
/// the residual holds and for what cause. A source with module syntax is an
/// ES module, linked as the CLI links a `.mjs` file (`entry` is the export
/// to call); otherwise it is a plain script.
#[wasm_bindgen]
pub fn specialize(src: &str, entry: &str, budget: f64, source_names: bool, why: bool) -> Result<SpecResult, JsError> {
    let module = js_frontend::link::is_module_source(src);
    let (program, entry) = if module {
        let opts = js_frontend::link::LinkOptions { conditions: vec![], entry: entry.to_string() };
        (js_frontend::link::link_source("/program.mjs", src, &opts).map_err(|e| JsError::new(&e))?, "main".to_string())
    } else {
        (src.to_string(), entry.to_string())
    };
    let opts = js_frontend::LowerOpts {
        source_names,
        // (A linked program's top-level names are the linker's own: no
        // other script reads them.)
        closed_script: module,
        module_output: module,
        spec_budget: (budget > 0.0).then_some(budget as u64),
        ..js_frontend::LowerOpts::default()
    };
    let s = js_frontend::specialize_full(&program, &entry, true, false, &opts, why).map_err(|e| JsError::new(&e))?;
    Ok(SpecResult {
        ir: s.vm.dump(&s.prog),
        why: s.report.as_ref().map(|r| js_frontend::why_json(r).to_string()).unwrap_or_default(),
        blocks: s.prog.blocks.len() as u32,
        steps: s.vm.spec_steps_used() as f64,
        weight: s.vm.spec_weight_used() as f64,
        js: s.js,
    })
}
