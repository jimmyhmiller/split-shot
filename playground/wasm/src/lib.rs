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

/// Specialize `function main(input)` in `src`. `budget` is the specialization
/// weight budget (0 = engine default).
#[wasm_bindgen]
pub fn specialize(src: &str, budget: f64) -> Result<SpecResult, JsError> {
    let budget = if budget > 0.0 { Some(budget as u64) } else { None };
    let (vm, prog) = js_frontend::specialize_with_budget(src, budget).map_err(|e| JsError::new(&e))?;
    Ok(SpecResult {
        js: js_frontend::residual_to_js(&vm, &prog),
        ir: vm.dump(&prog),
        blocks: prog.blocks.len() as u32,
        steps: vm.spec_steps_used() as f64,
        weight: vm.spec_weight_used() as f64,
    })
}
