//! Linking a program of modules into one program.
//!
//! The specializer takes one program. A program of modules (an entry file
//! that imports, exports or requires others) is first linked into one, with
//! the meaning Node gives it:
//!
//! - ES modules statically reachable from the entry are one *group*: their
//!   code is one function whose scope holds every module's top-level
//!   bindings (renamed only where two would collide, or where a reference
//!   could be shadowed; a renamed function or class keeps its `name`). An
//!   import is the exporter's binding itself, so it is live, and reading it
//!   before the exporter initialized it throws, as in Node; writing it throws
//!   a `TypeError`. As in a module graph, every module is instantiated before
//!   any is evaluated (the group's function declarations are hoisted), then
//!   each module's code runs in Node's evaluation order (a post-order walk of
//!   its requests, in source order). An ES module reached only by
//!   `require()` or `import()` starts a group of its own, evaluated when it is
//!   first loaded.
//! - A CommonJS module is its code in Node's wrapper function
//!   (`exports, require, module, __filename, __dirname`), run when it is
//!   first required, with Node's `module` object and cache; `require` of a
//!   specifier seen at link time loads what Node would.
//! - JSON modules, Node built-ins (`process.getBuiltinModule`), `import()`,
//!   `import.meta` and `require(esm)` are what Node makes of them (see
//!   `module_runtime.js`).
//!
//! The linked program is `function main(input) { ... }`: the module system,
//! the modules, then the entry's `main(input)`. TypeScript modules have their
//! types erased first (with TypeScript's elision of imports used only as
//! types).

use std::collections::{BTreeSet, HashMap, HashSet};
use std::path::{Path, PathBuf};

use swc_atoms::Atom;
use swc_common::sync::Lrc;
use swc_common::{FileName, Globals, Mark, SourceMap, Spanned, SyntaxContext, DUMMY_SP, GLOBALS};
use swc_ecma_ast as ast;
use swc_ecma_parser::lexer::Lexer;
use swc_ecma_parser::{EsSyntax, Parser, StringInput, Syntax, TsSyntax};
use swc_ecma_visit::{Visit, VisitMut, VisitMutWith, VisitWith};

use crate::node_resolve::{Format, Mode, NodeResolver, Resolved};

/// How to link a program.
#[derive(Clone, Debug, Default)]
pub struct LinkOptions {
    /// Package `exports`/`imports` conditions besides Node's defaults (as
    /// `node --conditions`).
    pub conditions: Vec<String>,
    /// The entry module's export (or top-level function) to call with the
    /// input.
    pub entry: String,
}

const RUNTIME: &str = include_str!("module_runtime.js");

/// Is the program whose entry is `path` (whose source is `src`) a program of
/// modules: an ES module (by its extension, its package's `type`, or its
/// syntax), or a CommonJS module (by its extension or its package's `type`,
/// or `commonjs`: the caller says so)? Otherwise it is a plain script,
/// specialized as it is: a `.js` file of no declared format and no module
/// syntax is one even when it mentions `require` or `module` (which a
/// script may test for, as a global). The modules it loads follow Node's
/// rules (there, such a file is CommonJS).
pub fn is_module_program(path: &Path, src: &str, commonjs: bool) -> Result<bool, String> {
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    if matches!(ext, "mjs" | "mts" | "cjs" | "cts") {
        return Ok(true);
    }
    let resolver = NodeResolver::new(&[]);
    let abs = std::fs::canonicalize(path).map_err(|e| format!("{}: {e}", path.display()))?;
    match resolver.format_of(&abs)? {
        Format::Esm | Format::CommonJs => return Ok(true),
        Format::Json => return Err(format!("{}: a JSON file is not a program", path.display())),
        Format::Detect => {}
    }
    let ts = matches!(ext, "ts");
    GLOBALS.set(&Globals::new(), || {
        let cm: Lrc<SourceMap> = Default::default();
        match detect(&cm, path, src, ts) {
            Detected::Esm => Ok(true),
            Detected::Script => Ok(commonjs),
            // (Not ours to report: the plain-script path parses it itself.)
            Detected::Unparsed => Ok(commonjs),
        }
    })
}

enum Detected {
    /// ES module syntax: `import`/`export` declarations or `import.meta`.
    Esm,
    /// No module syntax.
    Script,
    Unparsed,
}

/// Node's syntax detection for a file of no declared format: an ES module if
/// it has module syntax, otherwise a script (CommonJS when loaded as a
/// module).
fn detect(cm: &Lrc<SourceMap>, path: &Path, src: &str, ts: bool) -> Detected {
    let Ok(m) = parse_module(cm, path, src, ts) else {
        return match parse_script(cm, path, src, ts) {
            Ok(_) => Detected::Script,
            Err(_) => Detected::Unparsed,
        };
    };
    let mut meta = MetaFinder { uses: false, resolves: Vec::new() };
    m.visit_with(&mut meta);
    if meta.uses || m.body.iter().any(|i| matches!(i, ast::ModuleItem::ModuleDecl(d) if !matches!(d, ast::ModuleDecl::TsNamespaceExport(_)))) {
        return Detected::Esm;
    }
    Detected::Script
}

/// Link the program whose entry is `path` into one program (its source).
pub fn link(path: &Path, opts: &LinkOptions) -> Result<String, String> {
    GLOBALS.set(&Globals::new(), || {
        let mut l = Linker {
            resolver: NodeResolver::new(&opts.conditions),
            cm: Default::default(),
            modules: Vec::new(),
            by_key: HashMap::new(),
            queue: Vec::new(),
        };
        let entry_path = std::fs::canonicalize(path).map_err(|e| format!("{}: {e}", path.display()))?;
        let entry = l.load(Resolved::File(entry_path), Mode::Import, false)?;
        while let Some(id) = l.queue.pop() {
            l.prepare(id)?;
        }
        l.emit(entry, &opts.entry)
    })
}

type Id = (Atom, SyntaxContext);

#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug)]
enum Kind {
    Esm,
    Cjs,
    /// A JSON file imported by an ES module (`with { type: "json" }`).
    JsonEsm,
    /// A JSON file required.
    JsonCjs,
    Builtin,
}

/// What an import names in the module it imports from.
#[derive(Clone, Debug, PartialEq, Eq)]
enum ImportName {
    Name(String),
    Namespace,
}

struct Module {
    kind: Kind,
    /// The file (or the built-in's `node:` name).
    file: PathBuf,
    ts: bool,
    source: String,
    esm: Option<Esm>,
    cjs: Option<Cjs>,
}

#[derive(Default)]
struct Esm {
    stmts: Vec<ast::Stmt>,
    top: SyntaxContext,
    unresolved: SyntaxContext,
    /// The modules it requests, in source order (each once), with the
    /// specifier first used for each.
    requested: Vec<(usize, String)>,
    /// Its import bindings: what each names, in which module.
    imports: HashMap<Id, (usize, ImportName, String)>,
    /// `export`ed names of its own bindings (or of import bindings).
    local_exports: Vec<(String, Id)>,
    /// `export { a as b } from "m"`, `export * as ns from "m"`.
    indirect_exports: Vec<(String, usize, ImportName)>,
    /// `export * from "m"`.
    star_exports: Vec<usize>,
    /// Names TypeScript exports as types only (no runtime binding).
    type_exports: HashSet<String>,
    /// Its top-level bindings (not imports), in order.
    top_bindings: Vec<Id>,
    /// The function and class declarations among them.
    fn_decls: HashSet<Id>,
    class_decls: HashSet<Id>,
    /// Generated bindings (an anonymous `export default`) and the name
    /// their function or class has.
    default_names: HashMap<Id, String>,
    /// `import(...)`, `import.meta.resolve(...)` specifiers written as
    /// literals, and what they resolve to.
    dynamic: Vec<(String, Result<usize, String>)>,
    uses_meta: bool,
    /// Every identifier name in it, and those it uses free.
    all_names: HashSet<Atom>,
    free_names: HashSet<Atom>,
}

struct Cjs {
    script: ast::Script,
    /// `require(...)` (and `require.resolve`) specifiers written as literals:
    /// the module, or Node's error.
    table: Vec<(String, Result<usize, String>)>,
    dynamic: Vec<(String, Result<usize, String>)>,
}

struct Linker {
    resolver: NodeResolver,
    cm: Lrc<SourceMap>,
    modules: Vec<Module>,
    by_key: HashMap<(PathBuf, Kind), usize>,
    queue: Vec<usize>,
}

fn parse_error(cm: &Lrc<SourceMap>, path: &Path, e: swc_ecma_parser::error::Error) -> String {
    let loc = cm.lookup_char_pos(e.span().lo);
    format!("{}:{}:{}: parse error: {:?}", path.display(), loc.line, loc.col_display + 1, e.kind())
}

fn es_syntax(script: bool) -> EsSyntax {
    EsSyntax { allow_return_outside_function: script, import_attributes: true, explicit_resource_management: true, decorators: true, decorators_before_export: true, ..Default::default() }
}

fn ts_syntax() -> TsSyntax {
    TsSyntax { decorators: true, ..Default::default() }
}

/// `src` with each class member's `static declare` modifiers written
/// `declare static`, which TypeScript takes as the same (swc's parser takes
/// only the second order: `class A { static declare x: T }` fails to parse,
/// which tsc accepts). Found by tokens: a `static` then a `declare` that is a
/// modifier (on the same line, before a member's name, not itself the name
/// of a method or field).
fn ts_modifier_order(src: &str) -> String {
    use swc_ecma_parser::unstable::Token;
    let cm: Lrc<SourceMap> = Default::default();
    let fm = cm.new_source_file(Lrc::new(FileName::Anon), src.to_string());
    let lexer = Lexer::new(Syntax::Typescript(ts_syntax()), ast::EsVersion::EsNext, StringInput::from(&*fm), None);
    let toks: Vec<_> = lexer.collect();
    let base = fm.start_pos.0;
    let mut swaps: Vec<(usize, usize, usize, usize)> = Vec::new();
    for w in toks.windows(3) {
        let (a, b, c) = (&w[0], &w[1], &w[2]);
        if a.token == Token::Static
            && b.token == Token::Declare
            && !b.had_line_break
            && !c.had_line_break
            && !matches!(c.token, Token::LParen | Token::Lt | Token::Eq | Token::Semi | Token::QuestionMark | Token::Bang | Token::Colon | Token::RBrace | Token::Comma)
        {
            swaps.push(((a.span.lo.0 - base) as usize, (a.span.hi.0 - base) as usize, (b.span.lo.0 - base) as usize, (b.span.hi.0 - base) as usize));
        }
    }
    if swaps.is_empty() {
        return src.to_string();
    }
    let mut out = String::with_capacity(src.len());
    let mut at = 0;
    for (a_lo, a_hi, b_lo, b_hi) in swaps {
        out.push_str(&src[at..a_lo]);
        out.push_str("declare");
        out.push_str(&src[a_hi..b_lo]);
        out.push_str("static");
        at = b_hi;
    }
    out.push_str(&src[at..]);
    out
}

fn parse_module(cm: &Lrc<SourceMap>, path: &Path, src: &str, ts: bool) -> Result<ast::Module, String> {
    let fixed;
    let src = if ts {
        fixed = ts_modifier_order(src);
        fixed.as_str()
    } else {
        src
    };
    let fm = cm.new_source_file(Lrc::new(FileName::Real(path.to_path_buf())), src.to_string());
    let syntax = if ts { Syntax::Typescript(ts_syntax()) } else { Syntax::Es(es_syntax(false)) };
    let lexer = Lexer::new(syntax, ast::EsVersion::EsNext, StringInput::from(&*fm), None);
    let mut p = Parser::new_from(lexer);
    let m = p.parse_module().map_err(|e| parse_error(cm, path, e))?;
    if let Some(e) = p.take_errors().into_iter().next() {
        return Err(parse_error(cm, path, e));
    }
    Ok(m)
}

fn parse_script(cm: &Lrc<SourceMap>, path: &Path, src: &str, ts: bool) -> Result<ast::Script, String> {
    let fixed;
    let src = if ts {
        fixed = ts_modifier_order(src);
        fixed.as_str()
    } else {
        src
    };
    let fm = cm.new_source_file(Lrc::new(FileName::Real(path.to_path_buf())), src.to_string());
    let syntax = if ts { Syntax::Typescript(ts_syntax()) } else { Syntax::Es(es_syntax(true)) };
    let lexer = Lexer::new(syntax, ast::EsVersion::EsNext, StringInput::from(&*fm), None);
    let mut p = Parser::new_from(lexer);
    let s = p.parse_script().map_err(|e| parse_error(cm, path, e))?;
    if let Some(e) = p.take_errors().into_iter().next() {
        return Err(parse_error(cm, path, e));
    }
    Ok(s)
}

fn is_ts(path: &Path) -> bool {
    matches!(path.extension().and_then(|e| e.to_str()), Some("ts" | "mts" | "cts"))
}

fn str_value(s: &ast::Str) -> String {
    s.value.to_string_lossy().into_owned()
}

fn export_name(n: &ast::ModuleExportName) -> String {
    match n {
        ast::ModuleExportName::Ident(i) => i.sym.to_string(),
        ast::ModuleExportName::Str(s) => str_value(s),
    }
}

/// Is `with { ... }` exactly `{ type: "json" }` (`Ok(true)`), absent
/// (`Ok(false)`), or something Node rejects?
fn json_attribute(with: Option<&ast::ObjectLit>, spec: &str) -> Result<bool, String> {
    let Some(obj) = with else { return Ok(false) };
    let mut json = false;
    for p in &obj.props {
        let ast::PropOrSpread::Prop(p) = p else { return Err(format!("import attributes of '{spec}': unsupported form")) };
        let ast::Prop::KeyValue(kv) = &**p else { return Err(format!("import attributes of '{spec}': unsupported form")) };
        let key = match &kv.key {
            ast::PropName::Ident(i) => i.sym.to_string(),
            ast::PropName::Str(s) => str_value(s),
            _ => return Err(format!("import attributes of '{spec}': unsupported key")),
        };
        let val = match &*kv.value {
            ast::Expr::Lit(ast::Lit::Str(s)) => str_value(s),
            _ => return Err(format!("import attributes of '{spec}': a value must be a string")),
        };
        if key != "type" {
            return Err(format!("Import attribute \"{key}\" with value \"{val}\" is not supported (importing '{spec}')"));
        }
        if val != "json" {
            return Err(format!("Import attribute \"type\" with value \"{val}\" is not supported (importing '{spec}')"));
        }
        json = true;
    }
    Ok(json)
}

impl Linker {
    /// The module `r` names, loaded as `mode` loads it (`json`: an import
    /// with `type: "json"`), registered (and queued to be prepared) the first
    /// time.
    fn load(&mut self, r: Resolved, mode: Mode, json: bool) -> Result<usize, String> {
        let (file, kind) = match r {
            Resolved::Builtin(b) => (PathBuf::from(b), Kind::Builtin),
            Resolved::File(p) => {
                let kind = match self.resolver.format_of(&p)? {
                    Format::Json => match mode {
                        Mode::Import => {
                            if !json {
                                return Err(format!("Module \"{}\" needs an import attribute of \"type: json\"", p.display()));
                            }
                            Kind::JsonEsm
                        }
                        Mode::Require => Kind::JsonCjs,
                    },
                    Format::Esm => Kind::Esm,
                    Format::CommonJs => Kind::Cjs,
                    Format::Detect => {
                        let src = std::fs::read_to_string(&p).map_err(|e| format!("{}: {e}", p.display()))?;
                        match detect(&self.cm, &p, &src, is_ts(&p)) {
                            Detected::Esm => Kind::Esm,
                            Detected::Script => Kind::Cjs,
                            Detected::Unparsed => {
                                // (Reported as the CommonJS parse it fails.)
                                Kind::Cjs
                            }
                        }
                    }
                };
                if json && kind != Kind::JsonEsm {
                    return Err(format!("Module \"{}\" is not a JSON module (imported with \"type: json\")", p.display()));
                }
                (p, kind)
            }
        };
        if let Some(&id) = self.by_key.get(&(file.clone(), kind)) {
            return Ok(id);
        }
        let source = if kind == Kind::Builtin {
            String::new()
        } else {
            std::fs::read_to_string(&file).map_err(|e| format!("{}: {e}", file.display()))?
        };
        let id = self.modules.len();
        self.modules.push(Module { kind, ts: is_ts(&file), file: file.clone(), source, esm: None, cjs: None });
        self.by_key.insert((file, kind), id);
        if matches!(kind, Kind::Esm | Kind::Cjs) {
            self.queue.push(id);
        }
        Ok(id)
    }

    fn resolve_load(&mut self, spec: &str, from: usize, mode: Mode, json: bool) -> Result<usize, String> {
        let parent = self.modules[from].file.clone();
        let r = self.resolver.resolve(spec, &parent, mode)?;
        self.load(r, mode, json)
    }

    fn prepare(&mut self, id: usize) -> Result<(), String> {
        match self.modules[id].kind {
            Kind::Esm => self.prepare_esm(id),
            Kind::Cjs => self.prepare_cjs(id),
            _ => Ok(()),
        }
    }

    fn prepare_cjs(&mut self, id: usize) -> Result<(), String> {
        let path = self.modules[id].file.clone();
        let ts = self.modules[id].ts;
        let src = std::mem::take(&mut self.modules[id].source);
        let mut script = parse_script(&self.cm, &path, &src, ts)?;
        self.modules[id].source = src;
        script.shebang = None;
        if ts {
            let mut m = ast::Module { span: script.span, body: script.body.drain(..).map(ast::ModuleItem::Stmt).collect(), shebang: None };
            let _ = crate::ts::erase(&mut m).map_err(|e| format!("{}: {e}", path.display()))?;
            strip_types(&mut m);
            script.body = m.body.into_iter().filter_map(|i| if let ast::ModuleItem::Stmt(s) = i { Some(s) } else { None }).collect();
        }
        check_reserved(&script, &path)?;
        {
            let mut items: Vec<ast::ModuleItem> = script.body.drain(..).map(ast::ModuleItem::Stmt).collect();
            lower_class_decorators(&mut items).map_err(|e| format!("{}: {e}", path.display()))?;
            script.body = items.into_iter().filter_map(|i| if let ast::ModuleItem::Stmt(s) = i { Some(s) } else { None }).collect();
        }
        let unresolved = Mark::new();
        let top = Mark::new();
        script.visit_mut_with(&mut swc_ecma_transforms_base::resolver(unresolved, top, false));
        let unresolved_ctxt = SyntaxContext::empty().apply_mark(unresolved);
        // `require("x")`, `require.resolve("x")`, `import("x")`.
        let mut f = SpecFinder { unresolved: unresolved_ctxt, requires: Vec::new(), imports: Vec::new(), errors: Vec::new() };
        script.visit_with(&mut f);
        if let Some(e) = f.errors.into_iter().next() {
            return Err(format!("{}: {e}", path.display()));
        }
        let mut table = Vec::new();
        for spec in f.requires {
            if table.iter().any(|(s, _): &(String, _)| *s == spec) {
                continue;
            }
            let r = self.resolve_load(&spec, id, Mode::Require, false);
            table.push((spec, r));
        }
        let mut dynamic = Vec::new();
        for (spec, json) in f.imports {
            if dynamic.iter().any(|(s, _): &(String, _)| *s == spec) {
                continue;
            }
            let r = self.resolve_load(&spec, id, Mode::Import, json);
            dynamic.push((spec, r));
        }
        self.modules[id].cjs = Some(Cjs { script, table, dynamic });
        Ok(())
    }

    fn prepare_esm(&mut self, id: usize) -> Result<(), String> {
        let path = self.modules[id].file.clone();
        let ts = self.modules[id].ts;
        let src = std::mem::take(&mut self.modules[id].source);
        let mut module = parse_module(&self.cm, &path, &src, ts)?;
        self.modules[id].source = src;
        module.shebang = None;
        let mut esm = Esm::default();
        if ts {
            ts_module_level(&mut module, &mut esm.type_exports).map_err(|e| format!("{}: {e}", path.display()))?;
            crate::ts::erase(&mut module).map_err(|e| format!("{}: {e}", path.display()))?;
            strip_types(&mut module);
        }
        check_reserved(&module, &path)?;
        lower_class_decorators(&mut module.body).map_err(|e| format!("{}: {e}", path.display()))?;
        let unresolved = Mark::new();
        let top = Mark::new();
        module.visit_mut_with(&mut swc_ecma_transforms_base::resolver(unresolved, top, false));
        esm.top = SyntaxContext::empty().apply_mark(top);
        esm.unresolved = SyntaxContext::empty().apply_mark(unresolved);
        {
            let mut c = EsmChecks { fn_depth: 0, any_fn_depth: 0, errors: Vec::new(), unresolved: esm.unresolved };
            module.visit_with(&mut c);
            if let Some(e) = c.errors.into_iter().next() {
                return Err(format!("{}: {e}", path.display()));
            }
        }
        // TypeScript elides an import binding no value uses (and the whole
        // import when it elides all its bindings).
        let used: HashMap<Id, usize> = if ts {
            let mut u = RefCounter { counts: HashMap::new() };
            for item in &module.body {
                match item {
                    ast::ModuleItem::ModuleDecl(ast::ModuleDecl::Import(_)) => {}
                    other => other.visit_with(&mut u),
                }
            }
            u.counts
        } else {
            HashMap::new()
        };
        let mut anon = 0usize;
        for item in std::mem::take(&mut module.body) {
            match item {
                ast::ModuleItem::Stmt(s) => esm.stmts.push(s),
                ast::ModuleItem::ModuleDecl(d) => match d {
                    ast::ModuleDecl::Import(imp) => {
                        if imp.type_only {
                            continue;
                        }
                        let spec = str_value(&imp.src);
                        let had = !imp.specifiers.is_empty();
                        let specifiers: Vec<ast::ImportSpecifier> = imp
                            .specifiers
                            .into_iter()
                            .filter(|s| {
                                let (local, type_only) = match s {
                                    ast::ImportSpecifier::Named(n) => (&n.local, n.is_type_only),
                                    ast::ImportSpecifier::Default(d) => (&d.local, false),
                                    ast::ImportSpecifier::Namespace(n) => (&n.local, false),
                                };
                                !type_only && (!ts || used.get(&local.to_id()).copied().unwrap_or(0) > 0)
                            })
                            .collect();
                        if ts && had && specifiers.is_empty() {
                            continue;
                        }
                        let json = json_attribute(imp.with.as_deref(), &spec).map_err(|e| format!("{}: {e}", path.display()))?;
                        if imp.phase != ast::ImportPhase::Evaluation {
                            return Err(format!("{}: `import {}` phases are not supported", path.display(), if imp.phase == ast::ImportPhase::Source { "source" } else { "defer" }));
                        }
                        let m = self.resolve_load(&spec, id, Mode::Import, json).map_err(|e| format!("{}: {e}", path.display()))?;
                        if !esm.requested.iter().any(|(r, _)| *r == m) {
                            esm.requested.push((m, spec.clone()));
                        }
                        for s in specifiers {
                            match s {
                                ast::ImportSpecifier::Named(n) => {
                                    let name = n.imported.as_ref().map(export_name).unwrap_or_else(|| n.local.sym.to_string());
                                    esm.imports.insert(n.local.to_id(), (m, ImportName::Name(name), spec.clone()));
                                }
                                ast::ImportSpecifier::Default(d) => {
                                    esm.imports.insert(d.local.to_id(), (m, ImportName::Name("default".into()), spec.clone()));
                                }
                                ast::ImportSpecifier::Namespace(n) => {
                                    esm.imports.insert(n.local.to_id(), (m, ImportName::Namespace, spec.clone()));
                                }
                            }
                        }
                    }
                    ast::ModuleDecl::ExportDecl(e) => {
                        for n in declared_ids(&e.decl) {
                            esm.local_exports.push((n.0.to_string(), n));
                        }
                        esm.stmts.push(ast::Stmt::Decl(e.decl));
                    }
                    ast::ModuleDecl::ExportNamed(n) => {
                        if n.type_only {
                            continue;
                        }
                        match &n.src {
                            Some(src) => {
                                let spec = str_value(src);
                                let json = json_attribute(n.with.as_deref(), &spec).map_err(|e| format!("{}: {e}", path.display()))?;
                                let m = self.resolve_load(&spec, id, Mode::Import, json).map_err(|e| format!("{}: {e}", path.display()))?;
                                if !esm.requested.iter().any(|(r, _)| *r == m) {
                                    esm.requested.push((m, spec.clone()));
                                }
                                for s in n.specifiers {
                                    match s {
                                        ast::ExportSpecifier::Named(s) => {
                                            if s.is_type_only {
                                                continue;
                                            }
                                            let orig = export_name(&s.orig);
                                            let exported = s.exported.as_ref().map(export_name).unwrap_or_else(|| orig.clone());
                                            esm.indirect_exports.push((exported, m, ImportName::Name(orig)));
                                        }
                                        ast::ExportSpecifier::Namespace(s) => {
                                            esm.indirect_exports.push((export_name(&s.name), m, ImportName::Namespace));
                                        }
                                        ast::ExportSpecifier::Default(_) => {
                                            return Err(format!("{}: `export x from` is not JavaScript", path.display()));
                                        }
                                    }
                                }
                            }
                            None => {
                                for s in n.specifiers {
                                    let ast::ExportSpecifier::Named(s) = s else {
                                        return Err(format!("{}: unsupported export form", path.display()));
                                    };
                                    if s.is_type_only {
                                        continue;
                                    }
                                    let ast::ModuleExportName::Ident(orig) = &s.orig else {
                                        return Err(format!("{}: a string export name needs `from`", path.display()));
                                    };
                                    let exported = s.exported.as_ref().map(export_name).unwrap_or_else(|| orig.sym.to_string());
                                    // (A type's name exports nothing.)
                                    if ts && esm.type_exports.contains(&orig.sym.to_string()) && !esm.imports.contains_key(&orig.to_id()) && !module_declares(&esm, &orig.to_id()) {
                                        esm.type_exports.insert(exported);
                                        continue;
                                    }
                                    esm.local_exports.push((exported, orig.to_id()));
                                }
                            }
                        }
                    }
                    ast::ModuleDecl::ExportDefaultDecl(d) => match d.decl {
                        ast::DefaultDecl::Fn(f) => {
                            let ident = match f.ident {
                                Some(i) => i,
                                None => {
                                    anon += 1;
                                    let i = ast::Ident::new(format!("__pe_default{anon}").into(), DUMMY_SP, esm.top);
                                    esm.default_names.insert(i.to_id(), "default".into());
                                    i
                                }
                            };
                            esm.local_exports.push(("default".into(), ident.to_id()));
                            esm.stmts.push(ast::Stmt::Decl(ast::Decl::Fn(ast::FnDecl { ident, declare: false, function: f.function })));
                        }
                        ast::DefaultDecl::Class(c) => {
                            let ident = match c.ident {
                                Some(i) => i,
                                None => {
                                    anon += 1;
                                    let i = ast::Ident::new(format!("__pe_default{anon}").into(), DUMMY_SP, esm.top);
                                    esm.default_names.insert(i.to_id(), "default".into());
                                    i
                                }
                            };
                            esm.local_exports.push(("default".into(), ident.to_id()));
                            esm.stmts.push(ast::Stmt::Decl(ast::Decl::Class(ast::ClassDecl { ident, declare: false, class: c.class })));
                        }
                        ast::DefaultDecl::TsInterfaceDecl(_) => {
                            esm.type_exports.insert("default".into());
                        }
                    },
                    ast::ModuleDecl::ExportDefaultExpr(e) => {
                        anon += 1;
                        let ident = ast::Ident::new(format!("__pe_default{anon}").into(), DUMMY_SP, esm.top);
                        esm.local_exports.push(("default".into(), ident.to_id()));
                        let init = named_evaluation(*e.expr, "default");
                        esm.stmts.push(const_decl(ident, init));
                    }
                    ast::ModuleDecl::ExportAll(a) => {
                        if a.type_only {
                            continue;
                        }
                        let spec = str_value(&a.src);
                        let json = json_attribute(a.with.as_deref(), &spec).map_err(|e| format!("{}: {e}", path.display()))?;
                        let m = self.resolve_load(&spec, id, Mode::Import, json).map_err(|e| format!("{}: {e}", path.display()))?;
                        if !esm.requested.iter().any(|(r, _)| *r == m) {
                            esm.requested.push((m, spec.clone()));
                        }
                        esm.star_exports.push(m);
                    }
                    ast::ModuleDecl::TsImportEquals(_) => {
                        return Err(format!("{}: TypeScript `import x = require(...)` is not supported", path.display()));
                    }
                    ast::ModuleDecl::TsExportAssignment(_) => {
                        return Err(format!("{}: TypeScript `export =` is not supported", path.display()));
                    }
                    ast::ModuleDecl::TsNamespaceExport(_) => {}
                },
            }
        }
        // Top-level bindings, all names, free names.
        for s in &esm.stmts {
            match s {
                ast::Stmt::Decl(ast::Decl::Fn(f)) => {
                    esm.fn_decls.insert(f.ident.to_id());
                    esm.top_bindings.push(f.ident.to_id());
                }
                ast::Stmt::Decl(ast::Decl::Class(c)) => {
                    esm.class_decls.insert(c.ident.to_id());
                    esm.top_bindings.push(c.ident.to_id());
                }
                ast::Stmt::Decl(d) => {
                    for n in declared_ids(d) {
                        if !esm.top_bindings.contains(&n) {
                            esm.top_bindings.push(n);
                        }
                    }
                }
                other => {
                    // `var` anywhere at the top level (in blocks, loops) is a
                    // top-level binding too.
                    let mut v = TopVars { top: esm.top, out: Vec::new() };
                    other.visit_with(&mut v);
                    for n in v.out {
                        if !esm.top_bindings.contains(&n) {
                            esm.top_bindings.push(n);
                        }
                    }
                }
            }
        }
        {
            // (A reference to one of its imports is rewritten: it cannot
            // shadow anything.)
            let imports: HashSet<Id> = esm.imports.keys().cloned().collect();
            let mut n = Names { unresolved: esm.unresolved, imports, all: HashSet::new(), free: HashSet::new() };
            for s in &esm.stmts {
                s.visit_with(&mut n);
            }
            esm.all_names = n.all;
            esm.free_names = n.free;
        }
        // `import("x")`, `import.meta.resolve("x")`, `import.meta`.
        {
            let mut f = SpecFinder { unresolved: esm.unresolved, requires: Vec::new(), imports: Vec::new(), errors: Vec::new() };
            let mut meta = MetaFinder { uses: false, resolves: Vec::new() };
            for s in &esm.stmts {
                s.visit_with(&mut f);
                s.visit_with(&mut meta);
            }
            if let Some(e) = f.errors.into_iter().next() {
                return Err(format!("{}: {e}", path.display()));
            }
            esm.uses_meta = meta.uses;
            for (spec, json) in f.imports.into_iter().chain(meta.resolves.into_iter().map(|s| (s, false))) {
                if esm.dynamic.iter().any(|(s, _)| *s == spec) {
                    continue;
                }
                let r = self.resolve_load(&spec, id, Mode::Import, json);
                esm.dynamic.push((spec, r));
            }
        }
        self.modules[id].esm = Some(esm);
        Ok(())
    }
}

fn module_declares(esm: &Esm, id: &Id) -> bool {
    esm.stmts.iter().any(|s| matches!(s, ast::Stmt::Decl(d) if declared_ids(d).contains(id)))
}

fn const_decl(ident: ast::Ident, init: ast::Expr) -> ast::Stmt {
    ast::Stmt::Decl(ast::Decl::Var(Box::new(ast::VarDecl {
        span: DUMMY_SP,
        ctxt: SyntaxContext::empty(),
        kind: ast::VarDeclKind::Const,
        declare: false,
        decls: vec![ast::VarDeclarator { span: DUMMY_SP, name: ast::Pat::Ident(ident.into()), init: Some(Box::new(init)), definite: false }],
    })))
}

/// Is `e` an anonymous function or class definition (whose name comes from
/// where it is bound)?
fn is_anonymous_fn(e: &ast::Expr) -> bool {
    match e {
        ast::Expr::Paren(p) => is_anonymous_fn(&p.expr),
        ast::Expr::Fn(f) => f.ident.is_none(),
        ast::Expr::Class(c) => c.ident.is_none(),
        ast::Expr::Arrow(_) => true,
        _ => false,
    }
}

/// `e`, named `name` when it is an anonymous function or class definition:
/// `{ "name": e }["name"]` (a property definition names it as a binding
/// would).
fn named_evaluation(e: ast::Expr, name: &str) -> ast::Expr {
    if !is_anonymous_fn(&e) {
        return e;
    }
    let key = ast::Str { span: DUMMY_SP, value: name.into(), raw: None };
    let obj = ast::Expr::Object(ast::ObjectLit {
        span: DUMMY_SP,
        props: vec![ast::PropOrSpread::Prop(Box::new(ast::Prop::KeyValue(ast::KeyValueProp { key: ast::PropName::Str(key.clone()), value: Box::new(e) })))],
    });
    ast::Expr::Member(ast::MemberExpr {
        span: DUMMY_SP,
        obj: Box::new(obj),
        prop: ast::MemberProp::Computed(ast::ComputedPropName { span: DUMMY_SP, expr: Box::new(ast::Expr::Lit(ast::Lit::Str(key))) }),
    })
}

fn declared_ids(d: &ast::Decl) -> Vec<Id> {
    match d {
        ast::Decl::Fn(f) => vec![f.ident.to_id()],
        ast::Decl::Class(c) => vec![c.ident.to_id()],
        ast::Decl::Var(v) => {
            let mut out = Vec::new();
            for d in &v.decls {
                pat_ids(&d.name, &mut out);
            }
            out
        }
        ast::Decl::Using(u) => {
            let mut out = Vec::new();
            for d in &u.decls {
                pat_ids(&d.name, &mut out);
            }
            out
        }
        _ => vec![],
    }
}

fn pat_ids(p: &ast::Pat, out: &mut Vec<Id>) {
    match p {
        ast::Pat::Ident(b) => out.push(b.id.to_id()),
        ast::Pat::Array(a) => {
            for e in a.elems.iter().flatten() {
                pat_ids(e, out);
            }
        }
        ast::Pat::Object(o) => {
            for prop in &o.props {
                match prop {
                    ast::ObjectPatProp::KeyValue(kv) => pat_ids(&kv.value, out),
                    ast::ObjectPatProp::Assign(a) => out.push(a.key.id.to_id()),
                    ast::ObjectPatProp::Rest(r) => pat_ids(&r.arg, out),
                }
            }
        }
        ast::Pat::Rest(r) => pat_ids(&r.arg, out),
        ast::Pat::Assign(a) => pat_ids(&a.left, out),
        ast::Pat::Invalid(_) | ast::Pat::Expr(_) => {}
    }
}

/// `var`s declared at the top level inside blocks, loops, `try`, ...
/// (functions and classes in blocks are block-scoped in module code).
struct TopVars {
    top: SyntaxContext,
    out: Vec<Id>,
}

impl Visit for TopVars {
    fn visit_function(&mut self, _: &ast::Function) {}
    fn visit_arrow_expr(&mut self, _: &ast::ArrowExpr) {}
    fn visit_class(&mut self, _: &ast::Class) {}
    fn visit_var_decl(&mut self, v: &ast::VarDecl) {
        if v.kind == ast::VarDeclKind::Var {
            let mut ids = Vec::new();
            for d in &v.decls {
                pat_ids(&d.name, &mut ids);
            }
            self.out.extend(ids.into_iter().filter(|i| i.1 == self.top));
        }
        v.visit_children_with(self);
    }
}

/// Every identifier name (but references to the module's imports), and the
/// free ones.
struct Names {
    unresolved: SyntaxContext,
    imports: HashSet<Id>,
    all: HashSet<Atom>,
    free: HashSet<Atom>,
}

impl Visit for Names {
    fn visit_ident(&mut self, i: &ast::Ident) {
        if self.imports.contains(&i.to_id()) {
            return;
        }
        self.all.insert(i.sym.clone());
        if i.ctxt == self.unresolved {
            self.free.insert(i.sym.clone());
        }
    }
}

/// How many times each binding is referenced (outside import declarations).
struct RefCounter {
    counts: HashMap<Id, usize>,
}

impl Visit for RefCounter {
    fn visit_ident(&mut self, i: &ast::Ident) {
        *self.counts.entry(i.to_id()).or_insert(0) += 1;
    }
}

/// The linker's own names start with `__pe_`; no module may use one.
fn check_reserved<N: VisitWith<Reserved>>(n: &N, path: &Path) -> Result<(), String> {
    let mut r = Reserved(None);
    n.visit_with(&mut r);
    match r.0 {
        Some(name) => Err(format!("{}: the identifier `{name}` is reserved by the linker (names starting with `__pe_`)", path.display())),
        None => Ok(()),
    }
}

struct Reserved(Option<String>);

impl Visit for Reserved {
    fn visit_ident(&mut self, i: &ast::Ident) {
        if self.0.is_none() && i.sym.starts_with("__pe_") {
            self.0 = Some(i.sym.to_string());
        }
    }
}

/// What an ES module does that a linked program cannot express: top-level
/// `await`, a direct `eval` (which would see the other modules' bindings).
struct EsmChecks {
    /// Non-arrow functions entered.
    fn_depth: usize,
    /// Any functions entered.
    any_fn_depth: usize,
    errors: Vec<String>,
    unresolved: SyntaxContext,
}

impl Visit for EsmChecks {
    fn visit_function(&mut self, f: &ast::Function) {
        self.fn_depth += 1;
        self.any_fn_depth += 1;
        f.visit_children_with(self);
        self.fn_depth -= 1;
        self.any_fn_depth -= 1;
    }
    fn visit_arrow_expr(&mut self, a: &ast::ArrowExpr) {
        self.any_fn_depth += 1;
        a.visit_children_with(self);
        self.any_fn_depth -= 1;
    }
    fn visit_class(&mut self, c: &ast::Class) {
        // (Field initializers and static blocks are function bodies.)
        self.any_fn_depth += 1;
        self.fn_depth += 1;
        c.visit_children_with(self);
        self.any_fn_depth -= 1;
        self.fn_depth -= 1;
    }
    fn visit_await_expr(&mut self, a: &ast::AwaitExpr) {
        if self.any_fn_depth == 0 {
            self.errors.push("top-level `await` is not supported yet".into());
        }
        a.visit_children_with(self);
    }
    fn visit_for_of_stmt(&mut self, f: &ast::ForOfStmt) {
        if f.is_await && self.any_fn_depth == 0 {
            self.errors.push("top-level `for await` is not supported yet".into());
        }
        f.visit_children_with(self);
    }
    fn visit_call_expr(&mut self, c: &ast::CallExpr) {
        if let ast::Callee::Expr(e) = &c.callee {
            if let ast::Expr::Ident(i) = &**e {
                if &*i.sym == "eval" && i.ctxt == self.unresolved {
                    self.errors.push("a direct `eval(...)` in an ES module is not supported (in a linked program it would see the other modules' bindings)".into());
                }
            }
        }
        c.visit_children_with(self);
    }
}

/// Literal specifiers of `require(...)` / `require.resolve(...)` (free
/// `require`) and `import(...)` (with whether it imports JSON).
struct SpecFinder {
    unresolved: SyntaxContext,
    requires: Vec<String>,
    imports: Vec<(String, bool)>,
    errors: Vec<String>,
}

fn literal_string(e: &ast::Expr) -> Option<String> {
    match e {
        ast::Expr::Lit(ast::Lit::Str(s)) => Some(str_value(s)),
        ast::Expr::Tpl(t) if t.exprs.is_empty() && t.quasis.len() == 1 => t.quasis[0].cooked.as_ref().map(|c| c.to_string_lossy().into_owned()),
        ast::Expr::Paren(p) => literal_string(&p.expr),
        _ => None,
    }
}

/// Whether the options of `import(spec, options)` import JSON: `None` when
/// they cannot be known here.
fn import_options_json(opts: &ast::Expr, spec: &str) -> Option<Result<bool, String>> {
    let ast::Expr::Object(o) = opts else { return None };
    let mut json = Ok(false);
    for p in &o.props {
        let ast::PropOrSpread::Prop(p) = p else { return None };
        let ast::Prop::KeyValue(kv) = &**p else { return None };
        let key = match &kv.key {
            ast::PropName::Ident(i) => i.sym.to_string(),
            ast::PropName::Str(s) => str_value(s),
            _ => return None,
        };
        if key != "with" {
            continue;
        }
        let ast::Expr::Object(w) = &*kv.value else { return None };
        if w.props.iter().any(|p| !matches!(p, ast::PropOrSpread::Prop(p) if matches!(&**p, ast::Prop::KeyValue(kv) if matches!(&*kv.value, ast::Expr::Lit(ast::Lit::Str(_)))))) {
            return None;
        }
        json = json_attribute(Some(w), spec);
    }
    Some(json)
}

impl Visit for SpecFinder {
    fn visit_call_expr(&mut self, c: &ast::CallExpr) {
        match &c.callee {
            ast::Callee::Expr(e) => {
                let is_require = |e: &ast::Expr| matches!(e, ast::Expr::Ident(i) if &*i.sym == "require" && i.ctxt == self.unresolved);
                let resolve_of = |e: &ast::Expr| matches!(e, ast::Expr::Member(m) if is_require(&m.obj) && matches!(&m.prop, ast::MemberProp::Ident(p) if &*p.sym == "resolve"));
                if is_require(e) || resolve_of(e) {
                    if let Some(a) = c.args.first() {
                        if a.spread.is_none() {
                            if let Some(s) = literal_string(&a.expr) {
                                self.requires.push(s);
                            }
                        }
                    }
                }
            }
            ast::Callee::Import(_) => {
                if let Some(a) = c.args.first() {
                    if let Some(s) = literal_string(&a.expr) {
                        let json = match c.args.get(1) {
                            None => Ok(false),
                            Some(o) => match import_options_json(&o.expr, &s) {
                                Some(j) => j,
                                None => Err(format!("import({s:?}, ...): options written other than as an object literal of string attributes are not supported")),
                            },
                        };
                        match json {
                            Ok(j) => self.imports.push((s, j)),
                            Err(e) => self.errors.push(e),
                        }
                    }
                }
            }
            ast::Callee::Super(_) => {}
        }
        c.visit_children_with(self);
    }
}

/// `import.meta` uses, and `import.meta.resolve("x")` specifiers.
struct MetaFinder {
    uses: bool,
    resolves: Vec<String>,
}

impl Visit for MetaFinder {
    fn visit_meta_prop_expr(&mut self, m: &ast::MetaPropExpr) {
        if m.kind == ast::MetaPropKind::ImportMeta {
            self.uses = true;
        }
    }
    fn visit_call_expr(&mut self, c: &ast::CallExpr) {
        if let ast::Callee::Expr(e) = &c.callee {
            if let ast::Expr::Member(m) = &**e {
                if matches!(&*m.obj, ast::Expr::MetaProp(mp) if mp.kind == ast::MetaPropKind::ImportMeta) && matches!(&m.prop, ast::MemberProp::Ident(p) if &*p.sym == "resolve") {
                    if let Some(s) = c.args.first().and_then(|a| literal_string(&a.expr)) {
                        self.resolves.push(s);
                    }
                }
            }
        }
        c.visit_children_with(self);
    }
}

/// TypeScript at a module's top level: `import type`, type-only import and
/// export specifiers, exported interfaces / type aliases / `declare`s /
/// namespaces of types only go (their names are recorded as types);
/// `export enum` stays an exported declaration (which `ts::erase` turns
/// into the enum's object).
fn ts_module_level(module: &mut ast::Module, type_exports: &mut HashSet<String>) -> Result<(), String> {
    let mut type_names: HashSet<String> = HashSet::new();
    let mut body = Vec::new();
    for item in std::mem::take(&mut module.body) {
        match item {
            ast::ModuleItem::ModuleDecl(ast::ModuleDecl::ExportDecl(e)) => match &e.decl {
                ast::Decl::TsInterface(i) => {
                    type_exports.insert(i.id.sym.to_string());
                }
                ast::Decl::TsTypeAlias(t) => {
                    type_exports.insert(t.id.sym.to_string());
                }
                ast::Decl::TsModule(m) if m.declare || !ts_module_has_values(m) => {
                    if let ast::TsModuleName::Ident(i) = &m.id {
                        type_exports.insert(i.sym.to_string());
                    }
                }
                ast::Decl::TsModule(_) => return Err("TypeScript namespaces with values are not supported".into()),
                ast::Decl::Var(v) if v.declare => {
                    for d in &v.decls {
                        let mut ids = Vec::new();
                        pat_ids(&d.name, &mut ids);
                        for i in ids {
                            type_exports.insert(i.0.to_string());
                        }
                    }
                }
                ast::Decl::Fn(f) if f.declare || f.function.body.is_none() => {
                    type_exports.insert(f.ident.sym.to_string());
                }
                ast::Decl::Class(c) if c.declare => {
                    type_exports.insert(c.ident.sym.to_string());
                }
                ast::Decl::TsEnum(en) if en.declare => {
                    type_exports.insert(en.id.sym.to_string());
                }
                // `export enum E {}`: the enum (which `ts::erase` turns into
                // its object) and `export { E }`.
                ast::Decl::TsEnum(en) => {
                    let id = en.id.clone();
                    body.push(ast::ModuleItem::Stmt(ast::Stmt::Decl(e.decl.clone())));
                    body.push(ast::ModuleItem::ModuleDecl(ast::ModuleDecl::ExportNamed(ast::NamedExport {
                        span: DUMMY_SP,
                        specifiers: vec![ast::ExportSpecifier::Named(ast::ExportNamedSpecifier { span: DUMMY_SP, orig: ast::ModuleExportName::Ident(id), exported: None, is_type_only: false })],
                        src: None,
                        type_only: false,
                        with: None,
                    })));
                }
                _ => body.push(ast::ModuleItem::ModuleDecl(ast::ModuleDecl::ExportDecl(e))),
            },
            ast::ModuleItem::Stmt(ast::Stmt::Decl(ref d)) => {
                match d {
                    ast::Decl::TsInterface(i) => {
                        type_names.insert(i.id.sym.to_string());
                    }
                    ast::Decl::TsTypeAlias(t) => {
                        type_names.insert(t.id.sym.to_string());
                    }
                    ast::Decl::TsModule(m) if !m.declare && ts_module_has_values(m) => {
                        return Err("TypeScript namespaces with values are not supported".into());
                    }
                    ast::Decl::TsModule(m) => {
                        if let ast::TsModuleName::Ident(i) = &m.id {
                            type_names.insert(i.sym.to_string());
                        }
                    }
                    _ => {}
                }
                body.push(item);
            }
            other => body.push(other),
        }
    }
    module.body = body;
    // (`export { T }` of a local type exports a type.)
    type_exports.extend(type_names);
    // Namespaces of types only are erased like `declare` ones.
    for item in module.body.iter_mut() {
        if let ast::ModuleItem::Stmt(ast::Stmt::Decl(ast::Decl::TsModule(m))) = item {
            m.declare = true;
        }
    }
    Ok(())
}

/// Does a TypeScript namespace declare runtime values (TypeScript's
/// "instantiated" namespace)?
fn ts_module_has_values(m: &ast::TsModuleDecl) -> bool {
    match &m.body {
        None => false,
        Some(ast::TsNamespaceBody::TsModuleBlock(b)) => b.body.iter().any(|i| match i {
            ast::ModuleItem::Stmt(ast::Stmt::Decl(d)) | ast::ModuleItem::ModuleDecl(ast::ModuleDecl::ExportDecl(ast::ExportDecl { decl: d, .. })) => match d {
                ast::Decl::TsInterface(_) | ast::Decl::TsTypeAlias(_) => false,
                ast::Decl::TsModule(m) => !m.declare && ts_module_has_values(m),
                ast::Decl::Var(v) => !v.declare,
                ast::Decl::Fn(f) => !f.declare,
                ast::Decl::Class(c) => !c.declare,
                ast::Decl::TsEnum(e) => !e.declare,
                ast::Decl::Using(_) => true,
            },
            ast::ModuleItem::Stmt(_) => true,
            ast::ModuleItem::ModuleDecl(_) => true,
        }),
        Some(ast::TsNamespaceBody::TsNamespaceDecl(d)) => {
            let inner = ast::TsModuleDecl { span: d.span, declare: d.declare, global: d.global, namespace: true, id: ast::TsModuleName::Ident(d.id.clone()), body: Some((*d.body).clone()) };
            ts_module_has_values(&inner)
        }
    }
}

/// Remove the type annotations, type parameters and arguments, and the
/// type-only class members and modifiers `ts::erase` leaves (so the module
/// prints as JavaScript).
fn strip_types(m: &mut ast::Module) {
    m.visit_mut_with(&mut StripTypes);
}

struct StripTypes;

impl VisitMut for StripTypes {
    fn visit_mut_binding_ident(&mut self, b: &mut ast::BindingIdent) {
        b.type_ann = None;
        b.id.optional = false;
    }
    fn visit_mut_array_pat(&mut self, p: &mut ast::ArrayPat) {
        p.type_ann = None;
        p.optional = false;
        p.visit_mut_children_with(self);
    }
    fn visit_mut_object_pat(&mut self, p: &mut ast::ObjectPat) {
        p.type_ann = None;
        p.optional = false;
        p.visit_mut_children_with(self);
    }
    fn visit_mut_rest_pat(&mut self, p: &mut ast::RestPat) {
        p.type_ann = None;
        p.visit_mut_children_with(self);
    }
    fn visit_mut_function(&mut self, f: &mut ast::Function) {
        f.type_params = None;
        f.return_type = None;
        f.visit_mut_children_with(self);
    }
    fn visit_mut_arrow_expr(&mut self, f: &mut ast::ArrowExpr) {
        f.type_params = None;
        f.return_type = None;
        f.visit_mut_children_with(self);
    }
    fn visit_mut_class(&mut self, c: &mut ast::Class) {
        c.type_params = None;
        c.super_type_params = None;
        c.implements = vec![];
        c.is_abstract = false;
        c.body.retain(|m| match m {
            ast::ClassMember::TsIndexSignature(_) => false,
            ast::ClassMember::ClassProp(p) => !p.declare && !p.is_abstract,
            ast::ClassMember::PrivateProp(_) => true,
            ast::ClassMember::Method(m) => m.function.body.is_some(),
            ast::ClassMember::PrivateMethod(m) => m.function.body.is_some(),
            ast::ClassMember::Constructor(c) => c.body.is_some(),
            ast::ClassMember::AutoAccessor(a) => !a.is_abstract,
            _ => true,
        });
        c.visit_mut_children_with(self);
    }
    fn visit_mut_class_prop(&mut self, p: &mut ast::ClassProp) {
        p.type_ann = None;
        p.accessibility = None;
        p.is_optional = false;
        p.is_override = false;
        p.readonly = false;
        p.definite = false;
        p.visit_mut_children_with(self);
    }
    fn visit_mut_private_prop(&mut self, p: &mut ast::PrivateProp) {
        p.type_ann = None;
        p.accessibility = None;
        p.is_optional = false;
        p.is_override = false;
        p.readonly = false;
        p.definite = false;
        p.visit_mut_children_with(self);
    }
    fn visit_mut_class_method(&mut self, m: &mut ast::ClassMethod) {
        m.accessibility = None;
        m.is_abstract = false;
        m.is_optional = false;
        m.is_override = false;
        m.visit_mut_children_with(self);
    }
    fn visit_mut_private_method(&mut self, m: &mut ast::PrivateMethod) {
        m.accessibility = None;
        m.is_abstract = false;
        m.is_optional = false;
        m.is_override = false;
        m.visit_mut_children_with(self);
    }
    fn visit_mut_constructor(&mut self, c: &mut ast::Constructor) {
        c.accessibility = None;
        c.is_optional = false;
        c.visit_mut_children_with(self);
    }
    fn visit_mut_auto_accessor(&mut self, a: &mut ast::AutoAccessor) {
        a.type_ann = None;
        a.accessibility = None;
        a.is_override = false;
        a.definite = false;
        a.visit_mut_children_with(self);
    }
    fn visit_mut_call_expr(&mut self, c: &mut ast::CallExpr) {
        c.type_args = None;
        c.visit_mut_children_with(self);
    }
    fn visit_mut_new_expr(&mut self, n: &mut ast::NewExpr) {
        n.type_args = None;
        n.visit_mut_children_with(self);
    }
    fn visit_mut_tagged_tpl(&mut self, t: &mut ast::TaggedTpl) {
        t.type_params = None;
        t.visit_mut_children_with(self);
    }
    fn visit_mut_var_declarator(&mut self, d: &mut ast::VarDeclarator) {
        d.definite = false;
        d.visit_mut_children_with(self);
    }
    fn visit_mut_opt_call(&mut self, c: &mut ast::OptCall) {
        c.type_args = None;
        c.visit_mut_children_with(self);
    }
    fn visit_mut_jsx_opening_element(&mut self, e: &mut ast::JSXOpeningElement) {
        e.type_args = None;
        e.visit_mut_children_with(self);
    }
    fn visit_mut_expr(&mut self, e: &mut ast::Expr) {
        // (`f<T>` without a call.)
        if let ast::Expr::TsInstantiation(i) = e {
            *e = *i.expr.clone();
        }
        e.visit_mut_children_with(self);
    }
    fn visit_mut_param(&mut self, p: &mut ast::Param) {
        p.decorators.retain(|_| true);
        p.visit_mut_children_with(self);
    }
}

// ---------------------------------------------------------------------------
// Class decorators.

/// Lower decorated class declarations (the 2023-11 decorators proposal), as
/// TypeScript emits them: `@d1 @d2 class C extends H { body }` is
///
/// ```js
/// let C = (() => {
///   const __pe_decs1 = [d1, d2];
///   let __pe_dec1;
///   var C = class extends H {
///     static { __pe_dec1 = __pe_R.applyClassDecorators(this, __pe_decs1, "C"); C = __pe_dec1.value; }
///     body
///     static { __pe_dec1.init(); }
///   };
///   return C = __pe_dec1.value;
/// })();
/// ```
///
/// The decorators are evaluated before the class, and applied (last first)
/// before its static fields are initialized, which see the class itself as
/// `this`; the class's own name, inside it as outside, is then the decorated
/// class; the initializers they add run last. Decorators of class members,
/// and of class expressions, are refused.
fn lower_class_decorators(items: &mut Vec<ast::ModuleItem>) -> Result<(), String> {
    let mut l = DecoratorLowering { counter: 0, errors: Vec::new() };
    l.module_items(items);
    match l.errors.into_iter().next() {
        Some(e) => Err(e),
        None => Ok(()),
    }
}

struct DecoratorLowering {
    counter: usize,
    errors: Vec<String>,
}

impl DecoratorLowering {
    fn module_items(&mut self, items: &mut Vec<ast::ModuleItem>) {
        let mut out = Vec::with_capacity(items.len());
        for mut item in std::mem::take(items) {
            match &mut item {
                ast::ModuleItem::Stmt(ast::Stmt::Decl(ast::Decl::Class(c))) if !c.class.decorators.is_empty() => {
                    c.class.visit_mut_with(self);
                    let (pre, decl) = self.lower(c.ident.clone(), c.ident.sym.to_string(), std::mem::take(&mut c.class));
                    out.extend(pre.into_iter().map(ast::ModuleItem::Stmt));
                    out.push(ast::ModuleItem::Stmt(ast::Stmt::Decl(decl)));
                }
                ast::ModuleItem::ModuleDecl(ast::ModuleDecl::ExportDecl(e)) if matches!(&e.decl, ast::Decl::Class(c) if !c.class.decorators.is_empty()) => {
                    let ast::Decl::Class(c) = &mut e.decl else { unreachable!() };
                    c.class.visit_mut_with(self);
                    let (pre, decl) = self.lower(c.ident.clone(), c.ident.sym.to_string(), std::mem::take(&mut c.class));
                    out.extend(pre.into_iter().map(ast::ModuleItem::Stmt));
                    out.push(ast::ModuleItem::ModuleDecl(ast::ModuleDecl::ExportDecl(ast::ExportDecl { span: e.span, decl })));
                }
                ast::ModuleItem::ModuleDecl(ast::ModuleDecl::ExportDefaultDecl(d)) if matches!(&d.decl, ast::DefaultDecl::Class(c) if !c.class.decorators.is_empty()) => {
                    let ast::DefaultDecl::Class(c) = &mut d.decl else { unreachable!() };
                    c.class.visit_mut_with(self);
                    self.counter += 1;
                    let (ident, name) = match &c.ident {
                        Some(i) => (i.clone(), i.sym.to_string()),
                        None => (ast::Ident::new(format!("__pe_decdefault{}", self.counter).into(), DUMMY_SP, SyntaxContext::empty()), "default".to_string()),
                    };
                    let anonymous = c.ident.is_none();
                    let (pre, decl) = self.lower_named(ident.clone(), name, std::mem::take(&mut c.class), anonymous);
                    out.extend(pre.into_iter().map(ast::ModuleItem::Stmt));
                    out.push(ast::ModuleItem::Stmt(ast::Stmt::Decl(decl)));
                    out.push(ast::ModuleItem::ModuleDecl(ast::ModuleDecl::ExportNamed(ast::NamedExport {
                        span: DUMMY_SP,
                        specifiers: vec![ast::ExportSpecifier::Named(ast::ExportNamedSpecifier {
                            span: DUMMY_SP,
                            orig: ast::ModuleExportName::Ident(ident),
                            exported: Some(ast::ModuleExportName::Ident(ast::Ident::new("default".into(), DUMMY_SP, SyntaxContext::empty()))),
                            is_type_only: false,
                        })],
                        src: None,
                        type_only: false,
                        with: None,
                    })));
                }
                _ => {
                    item.visit_mut_with(self);
                    out.push(item);
                }
            }
        }
        *items = out;
    }

    fn lower(&mut self, ident: ast::Ident, name: String, class: Box<ast::Class>) -> (Vec<ast::Stmt>, ast::Decl) {
        self.counter += 1;
        self.lower_named(ident, name, class, false)
    }

    /// The statements before the binding (none), and the binding.
    fn lower_named(&mut self, ident: ast::Ident, name: String, mut class: Box<ast::Class>, _anonymous: bool) -> (Vec<ast::Stmt>, ast::Decl) {
        let n = self.counter;
        let decorators = std::mem::take(&mut class.decorators);
        {
            // (They are evaluated in an arrow function.)
            let mut y = YieldOrAwait(false);
            for d in &decorators {
                d.expr.visit_with(&mut y);
            }
            if y.0 {
                self.errors.push("a class decorator expression with `await` or `yield` is not supported".into());
            }
        }
        let decs: Vec<Option<ast::ExprOrSpread>> = decorators.into_iter().map(|d| Some(ast::ExprOrSpread { spread: None, expr: d.expr })).collect();
        let decs_var = format!("__pe_decs{n}");
        let dec_var = format!("__pe_dec{n}");
        let id = |s: &str| ast::Ident::new(s.into(), DUMMY_SP, SyntaxContext::empty());
        let var = |kind: ast::VarDeclKind, name: ast::Ident, init: Option<ast::Expr>| {
            ast::Stmt::Decl(ast::Decl::Var(Box::new(ast::VarDecl {
                span: DUMMY_SP,
                ctxt: SyntaxContext::empty(),
                kind,
                declare: false,
                decls: vec![ast::VarDeclarator { span: DUMMY_SP, name: ast::Pat::Ident(name.into()), init: init.map(Box::new), definite: false }],
            })))
        };
        let block = |src: String| {
            let stmts = src.split(';').filter(|x| !x.trim().is_empty()).map(|x| ast::Stmt::Expr(ast::ExprStmt { span: DUMMY_SP, expr: Box::new(parse_expr(x)) })).collect();
            ast::ClassMember::StaticBlock(ast::StaticBlock { span: DUMMY_SP, body: ast::BlockStmt { span: DUMMY_SP, ctxt: SyntaxContext::empty(), stmts } })
        };
        let inner = ast::Ident::new(ident.sym.clone(), DUMMY_SP, SyntaxContext::empty());
        class.body.insert(0, block(format!("{dec_var} = __pe_R.applyClassDecorators(this, {decs_var}, {}); {} = {dec_var}.value", js_str(&name), inner.sym)));
        class.body.push(block(format!("{dec_var}.init()")));
        let class_expr = ast::Expr::Class(ast::ClassExpr { ident: None, class });
        let body = vec![
            var(ast::VarDeclKind::Const, id(&decs_var), Some(ast::Expr::Array(ast::ArrayLit { span: DUMMY_SP, elems: decs }))),
            var(ast::VarDeclKind::Let, id(&dec_var), None),
            // (`var C = class {}` names the class `C`; an anonymous
            // default export's is "default".)
            var(ast::VarDeclKind::Var, inner.clone(), Some(if name == inner.sym.as_str() { class_expr } else { named_evaluation(class_expr, &name) })),
            // (The declaration assigned the class itself, after its first
            // static block made it the decorated one.)
            ast::Stmt::Return(ast::ReturnStmt { span: DUMMY_SP, arg: Some(Box::new(parse_expr(&format!("{} = {dec_var}.value", inner.sym)))) }),
        ];
        let arrow = ast::Expr::Arrow(ast::ArrowExpr {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            params: vec![],
            body: Box::new(ast::BlockStmtOrExpr::BlockStmt(ast::BlockStmt { span: DUMMY_SP, ctxt: SyntaxContext::empty(), stmts: body })),
            is_async: false,
            is_generator: false,
            type_params: None,
            return_type: None,
        });
        let call = ast::Expr::Call(ast::CallExpr {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            callee: ast::Callee::Expr(Box::new(ast::Expr::Paren(ast::ParenExpr { span: DUMMY_SP, expr: Box::new(arrow) }))),
            args: vec![],
            type_args: None,
        });
        let ast::Stmt::Decl(decl) = var(ast::VarDeclKind::Let, ident, Some(call)) else { unreachable!() };
        (vec![], decl)
    }
}

/// Does an expression `await` or `yield` (outside the functions in it)?
struct YieldOrAwait(bool);

impl Visit for YieldOrAwait {
    fn visit_function(&mut self, _: &ast::Function) {}
    fn visit_arrow_expr(&mut self, _: &ast::ArrowExpr) {}
    fn visit_await_expr(&mut self, _: &ast::AwaitExpr) {
        self.0 = true;
    }
    fn visit_yield_expr(&mut self, _: &ast::YieldExpr) {
        self.0 = true;
    }
}

impl VisitMut for DecoratorLowering {
    fn visit_mut_stmts(&mut self, stmts: &mut Vec<ast::Stmt>) {
        let mut items: Vec<ast::ModuleItem> = std::mem::take(stmts).into_iter().map(ast::ModuleItem::Stmt).collect();
        self.module_items(&mut items);
        *stmts = items.into_iter().filter_map(|i| if let ast::ModuleItem::Stmt(s) = i { Some(s) } else { None }).collect();
    }
    fn visit_mut_class_expr(&mut self, c: &mut ast::ClassExpr) {
        if !c.class.decorators.is_empty() {
            self.errors.push("decorators on a class expression are not supported yet".into());
        }
        c.visit_mut_children_with(self);
    }
    fn visit_mut_class_member(&mut self, m: &mut ast::ClassMember) {
        let decorated = match m {
            ast::ClassMember::Method(x) => !x.function.decorators.is_empty(),
            ast::ClassMember::PrivateMethod(x) => !x.function.decorators.is_empty(),
            ast::ClassMember::ClassProp(x) => !x.decorators.is_empty(),
            ast::ClassMember::PrivateProp(x) => !x.decorators.is_empty(),
            ast::ClassMember::AutoAccessor(x) => !x.decorators.is_empty(),
            ast::ClassMember::Constructor(x) => x.params.iter().any(|p| match p {
                ast::ParamOrTsParamProp::Param(p) => !p.decorators.is_empty(),
                ast::ParamOrTsParamProp::TsParamProp(p) => !p.decorators.is_empty(),
            }),
            _ => false,
        };
        if decorated {
            self.errors.push("decorators on class members are not supported yet (class decorators are)".into());
        }
        m.visit_mut_children_with(self);
    }
    fn visit_mut_param(&mut self, p: &mut ast::Param) {
        if !p.decorators.is_empty() {
            self.errors.push("parameter decorators are not supported".into());
        }
        p.visit_mut_children_with(self);
    }
}

// ---------------------------------------------------------------------------
// Linking: groups, export resolution, names.

/// What an exported name (or import) is bound to, seen from a group.
#[derive(Clone, Debug, PartialEq, Eq)]
enum Bind {
    /// A binding of an ES module of the group.
    Local(usize, Id),
    /// The namespace object of an ES module of the group.
    Namespace(usize),
    /// `name` of the namespace of module `usize`, outside the group (an ES
    /// module of another group, CommonJS, JSON, a built-in); `None` is the
    /// namespace itself.
    Foreign(usize, Option<String>),
    /// A TypeScript type (no value).
    Type,
}

struct Group {
    root: usize,
    modules: Vec<usize>,
}

/// The state of emitting one group.
struct GroupNames {
    /// The name in the group's scope of each top-level binding.
    names: HashMap<(usize, Id), String>,
    /// The modules whose namespace object the group makes.
    namespaces: BTreeSet<usize>,
    /// The modules outside the group it reads (as `__pe_dep<N>`).
    deps: BTreeSet<usize>,
    /// Names it imports from each CommonJS module / built-in.
    dep_names: HashMap<usize, (String, BTreeSet<String>)>,
}

fn js_str(s: &str) -> String {
    let mut out = String::from("\"");
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            '\u{2028}' => out.push_str("\\u2028"),
            '\u{2029}' => out.push_str("\\u2029"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

/// Is `s` usable as an identifier name in `o.s`?
fn is_ident_name(s: &str) -> bool {
    let mut cs = s.chars();
    matches!(cs.next(), Some(c) if c.is_alphabetic() || c == '_' || c == '$') && cs.all(|c| c.is_alphanumeric() || c == '_' || c == '$')
}

fn member(obj: &str, name: &str) -> String {
    if is_ident_name(name) {
        format!("{obj}.{name}")
    } else {
        format!("{obj}[{}]", js_str(name))
    }
}

fn utf16_cmp(a: &str, b: &str) -> std::cmp::Ordering {
    a.encode_utf16().cmp(b.encode_utf16())
}

impl Linker {
    fn esm(&self, m: usize) -> &Esm {
        self.modules[m].esm.as_ref().expect("an ES module")
    }

    /// ResolveExport of `name` in ES module `m`, seen from `group`.
    /// `Ok(None)`: not found (or a cycle); `Err(())`: ambiguous.
    fn resolve_export(&self, m: usize, name: &str, group: &[usize], set: &mut Vec<(usize, String)>) -> Result<Option<Bind>, ()> {
        if self.modules[m].kind != Kind::Esm || !group.contains(&m) {
            return Ok(Some(self.foreign(m, Some(name))));
        }
        if set.iter().any(|(x, n)| *x == m && n == name) {
            return Ok(None);
        }
        set.push((m, name.to_string()));
        let esm = self.esm(m);
        for (exported, local) in &esm.local_exports {
            if exported == name {
                return match esm.imports.get(local) {
                    Some((t, ImportName::Namespace, _)) => Ok(Some(self.namespace_bind(*t, group))),
                    Some((t, ImportName::Name(n), _)) => self.resolve_export(*t, n.as_str(), group, set),
                    None => Ok(Some(Bind::Local(m, local.clone()))),
                };
            }
        }
        for (exported, t, imp) in &esm.indirect_exports {
            if exported == name {
                return match imp {
                    ImportName::Namespace => Ok(Some(self.namespace_bind(*t, group))),
                    ImportName::Name(n) => self.resolve_export(*t, n, group, set),
                };
            }
        }
        if esm.type_exports.contains(name) {
            return Ok(Some(Bind::Type));
        }
        if name == "default" {
            return Ok(None);
        }
        let mut star: Option<Bind> = None;
        for t in &esm.star_exports {
            if self.modules[*t].kind == Kind::JsonEsm {
                continue;
            }
            let r = self.resolve_export(*t, name, group, set)?;
            if let Some(b) = r {
                if b == Bind::Type {
                    continue;
                }
                match &star {
                    None => star = Some(b),
                    Some(s) if *s == b => {}
                    Some(_) => return Err(()),
                }
            }
        }
        Ok(star)
    }

    fn namespace_bind(&self, t: usize, group: &[usize]) -> Bind {
        if self.modules[t].kind == Kind::Esm && group.contains(&t) {
            Bind::Namespace(t)
        } else {
            self.foreign(t, None)
        }
    }

    fn foreign(&self, m: usize, name: Option<&str>) -> Bind {
        Bind::Foreign(m, name.map(|s| s.to_string()))
    }

    /// GetExportedNames of ES module `m` (ambiguous and type names left
    /// out), sorted in code unit order.
    fn exported_names(&self, m: usize, group: &[usize]) -> Result<Vec<String>, String> {
        let mut names: Vec<String> = Vec::new();
        let mut seen = Vec::new();
        self.collect_names(m, &mut names, &mut seen, true)?;
        let mut out = Vec::new();
        for n in names {
            match self.resolve_export(m, &n, group, &mut Vec::new()) {
                Ok(Some(Bind::Type)) | Ok(None) | Err(()) => {}
                Ok(Some(_)) => out.push(n),
            }
        }
        out.sort_by(|a, b| utf16_cmp(a, b));
        out.dedup();
        Ok(out)
    }

    fn collect_names(&self, m: usize, out: &mut Vec<String>, seen: &mut Vec<usize>, top: bool) -> Result<(), String> {
        if seen.contains(&m) {
            return Ok(());
        }
        seen.push(m);
        match self.modules[m].kind {
            Kind::Esm => {}
            Kind::JsonEsm => return Ok(()),
            _ => {
                return Err(format!(
                    "{}: `export * from` a CommonJS module or built-in ({}) is not supported yet (its names are only known at run time)",
                    self.modules[seen[0]].file.display(),
                    self.modules[m].file.display()
                ))
            }
        }
        let esm = self.esm(m);
        for (n, _) in &esm.local_exports {
            if top || n != "default" {
                out.push(n.clone());
            }
        }
        for (n, _, _) in &esm.indirect_exports {
            if top || n != "default" {
                out.push(n.clone());
            }
        }
        for t in &esm.star_exports {
            self.collect_names(*t, out, seen, false)?;
        }
        Ok(())
    }

    /// What import binding `local` of module `m` reads, seen from `group`.
    fn resolve_import(&self, m: usize, local: &Id, group: &[usize]) -> Result<Bind, String> {
        let esm = self.esm(m);
        let (t, name, spec) = &esm.imports[local];
        match name {
            ImportName::Namespace => Ok(self.namespace_bind(*t, group)),
            ImportName::Name(n) => {
                if self.modules[*t].kind == Kind::JsonEsm && n != "default" {
                    return Err(format!("{}: SyntaxError: The requested module '{spec}' does not provide an export named '{n}'", self.modules[m].file.display()));
                }
                match self.resolve_export(*t, n.as_str(), group, &mut Vec::new()) {
                    Ok(Some(b)) => Ok(b),
                    Ok(None) => Err(format!("{}: SyntaxError: The requested module '{spec}' does not provide an export named '{n}'", self.modules[m].file.display())),
                    Err(()) => Err(format!("{}: SyntaxError: The requested module '{spec}' contains conflicting star exports for name '{n}'", self.modules[m].file.display())),
                }
            }
        }
    }

    /// The groups: the ES modules statically reachable from the entry (if it
    /// is one), then one for each ES module first loaded by `require()` or
    /// `import()` with the ones it reaches that no group has.
    fn groups(&self, entry: usize) -> Vec<Group> {
        let mut assigned: HashMap<usize, usize> = HashMap::new();
        let mut groups = Vec::new();
        let mut roots = Vec::new();
        if self.modules[entry].kind == Kind::Esm {
            roots.push(entry);
        }
        // Dynamic roots, in module order.
        for (i, m) in self.modules.iter().enumerate() {
            let targets: Vec<usize> = match (&m.esm, &m.cjs) {
                (Some(e), _) => e.dynamic.iter().filter_map(|(_, r)| r.as_ref().ok().copied()).collect(),
                (_, Some(c)) => c.table.iter().chain(c.dynamic.iter()).filter_map(|(_, r)| r.as_ref().ok().copied()).collect(),
                _ => vec![],
            };
            let _ = i;
            for t in targets {
                if self.modules[t].kind == Kind::Esm && !roots.contains(&t) {
                    roots.push(t);
                }
            }
        }
        for root in roots {
            if assigned.contains_key(&root) {
                continue;
            }
            let g = groups.len();
            let mut members = Vec::new();
            let mut stack = vec![root];
            while let Some(m) = stack.pop() {
                if self.modules[m].kind != Kind::Esm || assigned.contains_key(&m) {
                    continue;
                }
                assigned.insert(m, g);
                members.push(m);
                for (r, _) in self.esm(m).requested.iter().rev() {
                    stack.push(*r);
                }
            }
            groups.push(Group { root, modules: members });
        }
        groups
    }

    /// The order a group's modules run in (Node's post-order walk from its
    /// root over each module's requests in source order), with the modules
    /// outside the group each first reaches.
    fn evaluation_order(&self, g: &Group) -> Vec<Unit> {
        let mut visited = HashSet::new();
        let mut deps_seen = HashSet::new();
        let mut out = Vec::new();
        self.visit_eval(g.root, g, &mut visited, &mut deps_seen, &mut out);
        out
    }

    fn visit_eval(&self, m: usize, g: &Group, visited: &mut HashSet<usize>, deps_seen: &mut HashSet<usize>, out: &mut Vec<Unit>) {
        if !visited.insert(m) {
            return;
        }
        for (r, spec) in &self.esm(m).requested {
            if g.modules.contains(r) {
                self.visit_eval(*r, g, visited, deps_seen, out);
            } else if deps_seen.insert(*r) {
                out.push(Unit::Dep(*r, spec.clone()));
            }
        }
        out.push(Unit::Body(m));
    }
}

enum Unit {
    /// Evaluate (and bind the namespace of) a module outside the group.
    Dep(usize, String),
    /// An ES module's code.
    Body(usize),
}

// ---------------------------------------------------------------------------
// Emitting.

fn print_stmts(cm: &Lrc<SourceMap>, stmts: &[ast::Stmt]) -> Result<String, String> {
    use swc_ecma_codegen::{text_writer::JsWriter, Config, Emitter, Node};
    let mut buf = Vec::new();
    {
        let mut emitter = Emitter { cfg: Config::default().with_target(ast::EsVersion::EsNext), cm: cm.clone(), comments: None, wr: JsWriter::new(cm.clone(), "\n", &mut buf, None) };
        for s in stmts {
            s.emit_with(&mut emitter).map_err(|e| format!("printing the linked program: {e}"))?;
        }
    }
    String::from_utf8(buf).map_err(|e| e.to_string())
}

impl Linker {
    fn emit(&mut self, entry: usize, entry_name: &str) -> Result<String, String> {
        let groups = self.groups(entry);
        let group_of: HashMap<usize, usize> = groups.iter().enumerate().flat_map(|(g, gr)| gr.modules.iter().map(move |m| (*m, g))).collect();
        // ES modules some code finds at run time (require, import(), another
        // group): their namespace is made and their evaluation tracked.
        let mut runtime_targets: HashSet<usize> = HashSet::new();
        for m in &self.modules {
            if let Some(e) = &m.esm {
                runtime_targets.extend(e.dynamic.iter().filter_map(|(_, r)| r.as_ref().ok().copied()));
            }
            if let Some(c) = &m.cjs {
                runtime_targets.extend(c.table.iter().chain(c.dynamic.iter()).filter_map(|(_, r)| r.as_ref().ok().copied()));
            }
        }
        for (g, gr) in groups.iter().enumerate() {
            for m in &gr.modules {
                for (r, _) in &self.esm(*m).requested {
                    if group_of.get(r).is_some_and(|x| *x != g) {
                        runtime_targets.insert(*r);
                    }
                }
            }
        }
        runtime_targets.retain(|m| self.modules[*m].kind == Kind::Esm);

        let mut out = String::new();
        out.push_str("function main(__pe_input) {\n");
        out.push_str(RUNTIME);
        out.push_str("\nconst __pe_R = __pe_moduleRegistry();\n");
        // Every module but the ES ones, in index order.
        for id in 0..self.modules.len() {
            let file = self.modules[id].file.display().to_string();
            let dir = self.modules[id].file.parent().map(|p| p.display().to_string()).unwrap_or_default();
            match self.modules[id].kind {
                Kind::Builtin => {
                    out.push_str(&format!(
                        "__pe_R.builtin({id}, {name}, () => process.getBuiltinModule({name}));\n",
                        name = js_str(&file)
                    ));
                }
                Kind::JsonCjs | Kind::JsonEsm => {
                    let text = self.modules[id].source.strip_prefix('\u{feff}').unwrap_or(&self.modules[id].source).to_string();
                    out.push_str(&format!(
                        "__pe_R.json({id}, {}, {}, {}, {});\n",
                        js_str(&file),
                        js_str(&dir),
                        js_str(&text),
                        self.modules[id].kind == Kind::JsonEsm
                    ));
                }
                Kind::Cjs => {
                    let mut cjs = self.modules[id].cjs.take().expect("a prepared CommonJS module");
                    let table = runtime_table(&cjs.table);
                    let found = runtime_table(&cjs.dynamic);
                    let mut rw = DynamicImports { dynamic: &cjs.dynamic, file: file.clone(), found_var: format!("__pe_found{id}") };
                    cjs.script.visit_mut_with(&mut rw);
                    let body = print_stmts(&self.cm, &cjs.script.body)?;
                    let paths: Vec<String> = NodeResolver::node_modules_paths(Path::new(&dir)).iter().map(|p| js_str(p)).collect();
                    if !cjs.dynamic.is_empty() {
                        out.push_str(&format!("const __pe_found{id} = {found};\n"));
                    }
                    out.push_str(&format!(
                        "__pe_R.cjs({id}, {}, {}, [{}], {table}, function (exports, require, module, __filename, __dirname) {{\n{body}}});\n",
                        js_str(&file),
                        js_str(&dir),
                        paths.join(", ")
                    ));
                }
                Kind::Esm => {
                    let exports_me = self.esm(id).local_exports.iter().any(|(n, _)| n == "module.exports") || self.esm(id).indirect_exports.iter().any(|(n, _, _)| n == "module.exports");
                    out.push_str(&format!("__pe_R.esm({id}, {}, {}, {exports_me});\n", js_str(&file), group_of[&id]));
                }
            }
        }
        for (g, gr) in groups.iter().enumerate() {
            let entry_bind = if g == 0 && gr.root == entry { Some(entry_name) } else { None };
            let body = self.emit_group(g, gr, &runtime_targets, entry_bind)?;
            let ids: Vec<String> = gr.modules.iter().map(|m| m.to_string()).collect();
            out.push_str(&format!("__pe_R.group({g}, function () {{\n\"use strict\";\n{body}}}, [{}]);\n", ids.join(", ")));
        }
        match self.modules[entry].kind {
            Kind::Esm => {
                let tracked = groups[0].modules.iter().any(|m| runtime_targets.contains(m));
                out.push_str(&format!("const __pe_entry = __pe_R.{}(0);\nreturn __pe_entry(__pe_input);\n", if tracked { "runGroupTracked" } else { "runGroup" }));
            }
            Kind::Cjs => {
                out.push_str(&format!("const __pe_main = __pe_R.requireMain({entry});\nreturn {}(__pe_input);\n", member("__pe_main", entry_name)));
            }
            _ => return Err(format!("{}: the entry must be a JavaScript module", self.modules[entry].file.display())),
        }
        out.push_str("}\n");
        Ok(out)
    }

    fn emit_group(&mut self, g: usize, gr: &Group, runtime_targets: &HashSet<usize>, entry_name: Option<&str>) -> Result<String, String> {
        let group = gr.modules.clone();
        let order = self.evaluation_order(gr);
        let mut st = GroupNames { names: HashMap::new(), namespaces: BTreeSet::new(), deps: BTreeSet::new(), dep_names: HashMap::new() };
        for m in &group {
            if runtime_targets.contains(m) {
                st.namespaces.insert(*m);
            }
        }
        // Resolve every import first: which bindings each module reads from
        // others, which namespaces and deps the group needs.
        let mut import_binds: HashMap<usize, HashMap<Id, Bind>> = HashMap::new();
        for &m in &group {
            let mut binds = HashMap::new();
            let locals: Vec<Id> = self.esm(m).imports.keys().cloned().collect();
            for local in locals {
                let b = self.resolve_import(m, &local, &group)?;
                match &b {
                    Bind::Namespace(t) => {
                        st.namespaces.insert(*t);
                    }
                    Bind::Foreign(t, name) => {
                        st.deps.insert(*t);
                        if let Some(n) = name {
                            if matches!(self.modules[*t].kind, Kind::Cjs | Kind::Builtin) && n != "default" {
                                let spec = self.esm(m).imports[&local].2.clone();
                                st.dep_names.entry(*t).or_insert_with(|| (spec, BTreeSet::new())).1.insert(n.clone());
                            }
                        }
                    }
                    _ => {}
                }
                binds.insert(local, b);
            }
            import_binds.insert(m, binds);
        }
        // Namespaces reached through other namespaces' exports.
        let mut ns_exports: HashMap<usize, Vec<(String, Bind)>> = HashMap::new();
        let mut pending: Vec<usize> = st.namespaces.iter().copied().collect();
        if let Some(name) = entry_name {
            let _ = name;
        }
        while let Some(t) = pending.pop() {
            if ns_exports.contains_key(&t) {
                continue;
            }
            let names = self.exported_names(t, &group)?;
            let mut list = Vec::new();
            for n in names {
                let b = self.resolve_export(t, &n, &group, &mut Vec::new()).ok().flatten().expect("an exported name resolves");
                match &b {
                    Bind::Namespace(x) => {
                        if st.namespaces.insert(*x) {
                            pending.push(*x);
                        }
                    }
                    Bind::Foreign(x, _) => {
                        st.deps.insert(*x);
                    }
                    _ => {}
                }
                list.push((n, b));
            }
            ns_exports.insert(t, list);
        }
        // The entry's binding.
        let entry_bind = match entry_name {
            Some(name) => {
                let root = gr.root;
                let b = match self.resolve_export(root, name, &group, &mut Vec::new()) {
                    Ok(Some(b)) if b != Bind::Type => b,
                    Ok(_) => {
                        // A top-level function of that name, exported or not.
                        let esm = self.esm(root);
                        match esm.top_bindings.iter().find(|i| &*i.0 == name) {
                            Some(i) => Bind::Local(root, i.clone()),
                            None => return Err(format!("{}: the entry module has no export or top-level binding named `{name}`", self.modules[root].file.display())),
                        }
                    }
                    Err(()) => return Err(format!("{}: the entry module's export `{name}` is ambiguous", self.modules[root].file.display())),
                };
                if let Bind::Foreign(x, _) = &b {
                    st.deps.insert(*x);
                }
                if let Bind::Namespace(x) = &b {
                    st.namespaces.insert(*x);
                    if !ns_exports.contains_key(x) {
                        let names = self.exported_names(*x, &group)?;
                        let list = names.into_iter().map(|n| { let b = self.resolve_export(*x, &n, &group, &mut Vec::new()).ok().flatten().unwrap(); (n, b) }).collect();
                        ns_exports.insert(*x, list);
                    }
                }
                Some(b)
            }
            None => None,
        };
        // Names in the group's scope.
        self.assign_names(&group, &import_binds, &mut st);

        let mut prologue = String::new();
        let mut body = String::new();
        // Renamed functions keep their names (set before any code runs).
        for &m in &group {
            let esm = self.esm(m);
            for f in &esm.fn_decls {
                let linked = &st.names[&(m, f.clone())];
                let orig = esm.default_names.get(f).cloned().unwrap_or_else(|| f.0.to_string());
                if *linked != orig {
                    prologue.push_str(&format!("__pe_R.setName({linked}, {});\n", js_str(&orig)));
                }
            }
        }
        // Namespace objects.
        for t in st.namespaces.clone() {
            let list = &ns_exports[&t];
            let names: Vec<String> = list.iter().map(|(n, _)| js_str(n)).collect();
            let getters: Vec<String> = list.iter().map(|(_, b)| format!("() => {}", self.bind_expr(b, &st))).collect();
            prologue.push_str(&format!("const __pe_ns{t} = __pe_R.namespace([{}], [{}]);\n", names.join(", "), getters.join(", ")));
            if runtime_targets.contains(&t) {
                prologue.push_str(&format!("__pe_R.setNamespace({t}, __pe_ns{t});\n"));
            }
        }
        // Each module's `import.meta`.
        for &m in &group {
            let esm = self.esm(m);
            if esm.uses_meta {
                let file = self.modules[m].file.display().to_string();
                let dir = self.modules[m].file.parent().map(|p| p.display().to_string()).unwrap_or_default();
                let mut resolves = Vec::new();
                for (spec, r) in &esm.dynamic {
                    if let Ok(t) = r {
                        let f = &self.modules[*t].file;
                        let url = if self.modules[*t].kind == Kind::Builtin { f.display().to_string() } else { file_url(f) };
                        resolves.push(format!("{}: {}", js_str(spec), js_str(&url)));
                    }
                }
                prologue.push_str(&format!(
                    "const __pe_meta{m} = __pe_R.importMeta({}, {}, {}, {{ __proto__: null, {} }});\n",
                    js_str(&file_url(&self.modules[m].file)),
                    js_str(&file),
                    js_str(&dir),
                    resolves.join(", ")
                ));
            }
        }
        // The modules' code, in evaluation order.
        for unit in order {
            match unit {
                Unit::Dep(d, spec) => {
                    if st.deps.contains(&d) {
                        body.push_str(&format!("const __pe_dep{d} = __pe_R.importNamespace({d});\n"));
                        if let Some((_, names)) = st.dep_names.get(&d) {
                            let ns: Vec<String> = names.iter().map(|n| js_str(n)).collect();
                            body.push_str(&format!("__pe_R.requireExports(__pe_dep{d}, {}, [{}]);\n", js_str(&spec), ns.join(", ")));
                        }
                    } else {
                        body.push_str(&format!("__pe_R.importNamespace({d});\n"));
                    }
                }
                Unit::Body(m) => {
                    let tracked = runtime_targets.contains(&m);
                    if tracked {
                        body.push_str(&format!("__pe_R.evaluating({m});\n"));
                    }
                    let code = self.rewrite_module(m, &import_binds[&m], &st)?;
                    body.push_str(&code);
                    if tracked {
                        body.push_str(&format!("__pe_R.evaluated({m});\n"));
                    }
                }
            }
        }
        // A dep only namespaces read (never reached by the walk): bound
        // before the code (reading it evaluates it, as the walk would have).
        let mut early = String::new();
        let walked: HashSet<usize> = self.evaluation_order(gr).into_iter().filter_map(|u| if let Unit::Dep(d, _) = u { Some(d) } else { None }).collect();
        for d in &st.deps {
            if !walked.contains(d) {
                early.push_str(&format!("const __pe_dep{d} = __pe_R.importNamespace({d});\n"));
            }
        }
        let mut s = prologue;
        s.push_str(&early);
        s.push_str(&body);
        if let Some(b) = entry_bind {
            s.push_str(&format!("return {};\n", self.bind_expr(&b, &st)));
        }
        let _ = g;
        Ok(s)
    }

    /// The expression that reads `b` in the group's scope.
    fn bind_expr(&self, b: &Bind, st: &GroupNames) -> String {
        match b {
            Bind::Local(m, id) => st.names[&(*m, id.clone())].clone(),
            Bind::Namespace(t) => format!("__pe_ns{t}"),
            Bind::Foreign(t, None) => format!("__pe_dep{t}"),
            Bind::Foreign(t, Some(n)) => member(&format!("__pe_dep{t}"), n),
            Bind::Type => "undefined".into(),
        }
    }

    /// The names of the group's top-level bindings: each keeps its own
    /// unless another module's binding has it, some module of the group uses
    /// it free, or a module that reads it through an import could shadow it;
    /// then it is `name$N`, a name no module of the group uses.
    fn assign_names(&self, group: &[usize], import_binds: &HashMap<usize, HashMap<Id, Bind>>, st: &mut GroupNames) {
        let mut all: HashSet<Atom> = HashSet::new();
        let mut free: HashSet<Atom> = HashSet::new();
        for &m in group {
            all.extend(self.esm(m).all_names.iter().cloned());
            free.extend(self.esm(m).free_names.iter().cloned());
        }
        // Which modules read each binding directly.
        let mut readers: HashMap<(usize, Id), Vec<usize>> = HashMap::new();
        for (&m, binds) in import_binds {
            for b in binds.values() {
                if let Bind::Local(t, id) = b {
                    readers.entry((t.clone(), id.clone())).or_default().push(m);
                }
            }
        }
        let mut taken: HashSet<String> = HashSet::new();
        let mut counter = 0usize;
        let mut fresh = |base: &str, all: &HashSet<Atom>, taken: &HashSet<String>| loop {
            counter += 1;
            let n = format!("{base}${counter}");
            if !all.contains(&Atom::from(n.as_str())) && !taken.contains(&n) {
                return n;
            }
        };
        for &m in group {
            let esm = self.esm(m);
            for id in &esm.top_bindings {
                let sym = id.0.to_string();
                let keep = !sym.starts_with("__pe_default")
                    && !taken.contains(&sym)
                    && !free.contains(&id.0)
                    && readers.get(&(m, id.clone())).is_none_or(|rs| rs.iter().all(|r| *r == m || !self.esm(*r).all_names.contains(&id.0)));
                let name = if sym.starts_with("__pe_default") {
                    format!("__pe_default{m}_{}", &sym["__pe_default".len()..])
                } else if keep {
                    sym.clone()
                } else {
                    fresh(&sym, &all, &taken)
                };
                taken.insert(name.clone());
                st.names.insert((m, id.clone()), name);
            }
        }
    }

    /// Module `m`'s code with its imports read as `binds` say and its
    /// bindings named as the group names them.
    fn rewrite_module(&mut self, m: usize, binds: &HashMap<Id, Bind>, st: &GroupNames) -> Result<String, String> {
        let file = self.modules[m].file.display().to_string();
        let mut esm = self.modules[m].esm.take().expect("an ES module");
        let mut renames: HashMap<Id, (String, String)> = HashMap::new();
        for id in &esm.top_bindings {
            let linked = st.names[&(m, id.clone())].clone();
            let orig = esm.default_names.get(id).cloned().unwrap_or_else(|| id.0.to_string());
            renames.insert(id.clone(), (linked, orig));
        }
        let mut reads: HashMap<Id, ImportRead> = HashMap::new();
        for (local, b) in binds {
            let expr = self.bind_expr(b, st);
            let r = match b {
                Bind::Local(..) | Bind::Namespace(_) | Bind::Foreign(_, None) => ImportRead::Ident(expr),
                Bind::Foreign(_, Some(_)) => ImportRead::Member(expr),
                Bind::Type => ImportRead::Type(local.0.to_string()),
            };
            reads.insert(local.clone(), r);
        }
        let mut rw = Rewriter {
            renames: &renames,
            reads: &reads,
            classes: &esm.class_decls,
            meta: format!("__pe_meta{m}"),
            fn_depth: 0,
            errors: Vec::new(),
            immutables: Vec::new(),
            imm_index: HashMap::new(),
            module: m,
        };
        let mut stmts = std::mem::take(&mut esm.stmts);
        for s in stmts.iter_mut() {
            s.visit_mut_with(&mut rw);
        }
        let mut dyn_rw = DynamicImports { dynamic: &esm.dynamic, file: file.clone(), found_var: format!("__pe_found{m}") };
        for s in stmts.iter_mut() {
            s.visit_mut_with(&mut dyn_rw);
        }
        if let Some(e) = rw.errors.into_iter().next() {
            return Err(format!("{file}: {e}"));
        }
        let mut out = String::new();
        for (k, read) in rw.immutables.iter().enumerate() {
            out.push_str(&format!("const __pe_imm{m}_{k} = __pe_R.immutable(() => {read});\n"));
        }
        if !esm.dynamic.is_empty() {
            out.push_str(&format!("const __pe_found{m} = {};\n", runtime_table(&esm.dynamic)));
        }
        out.push_str(&print_stmts(&self.cm, &stmts)?);
        self.modules[m].esm = Some(esm);
        Ok(out)
    }
}

fn file_url(p: &Path) -> String {
    let mut s = String::from("file://");
    for b in p.display().to_string().bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'/' | b'-' | b'_' | b'.' | b'~' | b'!' | b'$' | b'&' | b'\'' | b'(' | b')' | b'*' | b'+' | b',' | b';' | b'=' | b':' | b'@' => s.push(b as char),
            other => s.push_str(&format!("%{other:02X}")),
        }
    }
    s
}

/// `{ __proto__: null, "spec": id or "error message", ... }` (for `require`
/// and `import()` at run time).
fn runtime_table(entries: &[(String, Result<usize, String>)]) -> String {
    let mut parts = vec!["__proto__: null".to_string()];
    for (spec, r) in entries {
        let v = match r {
            Ok(id) => id.to_string(),
            Err(_) => "-1".to_string(),
        };
        parts.push(format!("{}: {v}", js_str(spec)));
    }
    format!("{{ {} }}", parts.join(", "))
}

enum ImportRead {
    /// Read as this identifier (a binding of the group, a namespace object).
    Ident(String),
    /// Read as this member expression (a property of another namespace).
    Member(String),
    /// A TypeScript type: no value to read.
    Type(String),
}

fn parse_expr(src: &str) -> ast::Expr {
    let cm: Lrc<SourceMap> = Default::default();
    let fm = cm.new_source_file(Lrc::new(FileName::Anon), src.to_string());
    let lexer = Lexer::new(Syntax::Es(Default::default()), ast::EsVersion::EsNext, StringInput::from(&*fm), None);
    let mut p = Parser::new_from(lexer);
    *p.parse_expr().unwrap_or_else(|e| panic!("the linker's own expression `{src}` does not parse: {:?}", e.kind()))
}

fn ident_expr(name: &str) -> ast::Expr {
    ast::Expr::Ident(ast::Ident::new(name.into(), DUMMY_SP, SyntaxContext::empty()))
}

/// Renames a module's top-level bindings and reads its imports as the group
/// binds them (see `Linker::rewrite_module`).
struct Rewriter<'a> {
    renames: &'a HashMap<Id, (String, String)>,
    reads: &'a HashMap<Id, ImportRead>,
    classes: &'a HashSet<Id>,
    meta: String,
    /// Non-arrow functions (and class bodies) entered.
    fn_depth: usize,
    errors: Vec<String>,
    /// The reads behind each immutable accessor (`__pe_imm<m>_<k>`).
    immutables: Vec<String>,
    imm_index: HashMap<Id, usize>,
    module: usize,
}

impl Rewriter<'_> {
    fn read_expr(&mut self, id: &Id) -> Option<ast::Expr> {
        match self.reads.get(id)? {
            ImportRead::Ident(n) => Some(ident_expr(n.as_str())),
            ImportRead::Member(src) => Some(parse_expr(src.as_str())),
            ImportRead::Type(n) => {
                self.errors.push(format!("`{n}` is imported as a type but used as a value"));
                Some(ident_expr("undefined"))
            }
        }
    }

    /// The `__pe_imm<m>_<k>.v` an assignment to import binding `id` writes.
    fn immutable_target(&mut self, id: &Id) -> ast::MemberExpr {
        let k = match self.imm_index.get(id) {
            Some(k) => *k,
            None => {
                let read = match &self.reads[id] {
                    ImportRead::Ident(n) | ImportRead::Member(n) => n.clone(),
                    ImportRead::Type(n) => n.clone(),
                };
                self.immutables.push(read);
                self.imm_index.insert(id.clone(), self.immutables.len() - 1);
                self.immutables.len() - 1
            }
        };
        ast::MemberExpr {
            span: DUMMY_SP,
            obj: Box::new(ident_expr(&format!("__pe_imm{}_{k}", self.module))),
            prop: ast::MemberProp::Ident(ast::IdentName::new("v".into(), DUMMY_SP)),
        }
    }

    fn renamed(&self, i: &ast::Ident) -> Option<&(String, String)> {
        self.renames.get(&i.to_id()).filter(|(linked, orig)| linked != orig || linked != &i.sym.to_string())
    }

    /// An assignment pattern target that is an import binding: its accessor.
    fn fix_pat_target(&mut self, p: &mut ast::Pat) {
        if let ast::Pat::Ident(b) = p {
            if self.reads.contains_key(&b.id.to_id()) {
                let m = self.immutable_target(&b.id.to_id());
                *p = ast::Pat::Expr(Box::new(ast::Expr::Member(m)));
            }
        }
    }
}

impl VisitMut for Rewriter<'_> {
    fn visit_mut_function(&mut self, f: &mut ast::Function) {
        self.fn_depth += 1;
        f.visit_mut_children_with(self);
        self.fn_depth -= 1;
    }

    fn visit_mut_class(&mut self, c: &mut ast::Class) {
        self.fn_depth += 1;
        c.visit_mut_children_with(self);
        self.fn_depth -= 1;
    }

    fn visit_mut_class_decl(&mut self, d: &mut ast::ClassDecl) {
        // A renamed class keeps its name: set in its first static block
        // (which runs after its methods are defined and before its static
        // fields), unless a static method or accessor of its own is its
        // `name`; one with a computed key may be, which is checked then.
        if let Some((linked, orig)) = self.renamed(&d.ident).cloned() {
            let own_name = static_method_named(&d.class);
            if self.classes.contains(&d.ident.to_id()) && linked != orig && own_name != Some(true) {
                let call = if own_name.is_none() {
                    format!("__pe_R.setClassName(this, {}, {})", js_str(&linked), js_str(&orig))
                } else {
                    format!("__pe_R.setName(this, {})", js_str(&orig))
                };
                let stmt = ast::Stmt::Expr(ast::ExprStmt { span: DUMMY_SP, expr: Box::new(parse_expr(&call)) });
                d.class.body.insert(
                    0,
                    ast::ClassMember::StaticBlock(ast::StaticBlock { span: DUMMY_SP, body: ast::BlockStmt { span: DUMMY_SP, ctxt: SyntaxContext::empty(), stmts: vec![stmt] } }),
                );
            }
        }
        d.visit_mut_children_with(self);
    }

    fn visit_mut_ident(&mut self, i: &mut ast::Ident) {
        if let Some((linked, _)) = self.renames.get(&i.to_id()) {
            i.sym = linked.as_str().into();
        }
    }

    fn visit_mut_prop(&mut self, p: &mut ast::Prop) {
        if let ast::Prop::Shorthand(i) = p {
            let id = i.to_id();
            if self.reads.contains_key(&id) {
                let value = self.read_expr(&id).unwrap();
                *p = ast::Prop::KeyValue(ast::KeyValueProp { key: ast::PropName::Ident(ast::IdentName::new(i.sym.clone(), DUMMY_SP)), value: Box::new(value) });
                return;
            }
            if let Some((linked, _)) = self.renames.get(&id) {
                if linked.as_str() != &*i.sym {
                    let key = ast::PropName::Ident(ast::IdentName::new(i.sym.clone(), DUMMY_SP));
                    *p = ast::Prop::KeyValue(ast::KeyValueProp { key, value: Box::new(ident_expr(linked)) });
                    return;
                }
            }
        }
        p.visit_mut_children_with(self);
    }

    fn visit_mut_object_pat_prop(&mut self, p: &mut ast::ObjectPatProp) {
        if let ast::ObjectPatProp::Assign(a) = p {
            let id = a.key.id.to_id();
            let renamed = self.renames.get(&id).filter(|(l, _)| l.as_str() != &*a.key.id.sym).cloned();
            if self.reads.contains_key(&id) || renamed.is_some() {
                let key = ast::PropName::Ident(ast::IdentName::new(a.key.id.sym.clone(), DUMMY_SP));
                let mut target = ast::Pat::Ident(a.key.clone());
                self.fix_pat_target(&mut target);
                if let ast::Pat::Ident(b) = &mut target {
                    b.visit_mut_with(self);
                }
                let value = match a.value.take() {
                    Some(mut d) => {
                        d.visit_mut_with(self);
                        let d = match &renamed {
                            Some((_, orig)) => Box::new(named_evaluation(*d, orig)),
                            None => d,
                        };
                        ast::Pat::Assign(ast::AssignPat { span: DUMMY_SP, left: Box::new(target), right: d })
                    }
                    None => target,
                };
                *p = ast::ObjectPatProp::KeyValue(ast::KeyValuePatProp { key, value: Box::new(value) });
                return;
            }
        }
        p.visit_mut_children_with(self);
    }

    fn visit_mut_var_declarator(&mut self, d: &mut ast::VarDeclarator) {
        if let ast::Pat::Ident(b) = &d.name {
            if let Some((linked, orig)) = self.renamed(&b.id).cloned() {
                if linked != orig {
                    if let Some(init) = d.init.take() {
                        d.init = Some(Box::new(named_evaluation(*init, &orig)));
                    }
                }
            }
        }
        d.visit_mut_children_with(self);
    }

    fn visit_mut_assign_pat(&mut self, a: &mut ast::AssignPat) {
        if let ast::Pat::Ident(b) = &*a.left {
            if let Some((linked, orig)) = self.renamed(&b.id).cloned() {
                if linked != orig {
                    let right = std::mem::replace(&mut a.right, Box::new(ident_expr("undefined")));
                    a.right = Box::new(named_evaluation(*right, &orig));
                }
            }
        }
        a.visit_mut_children_with(self);
    }

    fn visit_mut_assign_expr(&mut self, a: &mut ast::AssignExpr) {
        // `x = function () {}` names the function `x`.
        if let ast::AssignTarget::Simple(ast::SimpleAssignTarget::Ident(b)) = &a.left {
            if matches!(a.op, ast::AssignOp::Assign | ast::AssignOp::AndAssign | ast::AssignOp::OrAssign | ast::AssignOp::NullishAssign) {
                if let Some((linked, orig)) = self.renamed(&b.id).cloned() {
                    if linked != orig {
                        let right = std::mem::replace(&mut a.right, Box::new(ident_expr("undefined")));
                        a.right = Box::new(named_evaluation(*right, &orig));
                    }
                }
            }
            let id = b.id.to_id();
            if self.reads.contains_key(&id) {
                let m = self.immutable_target(&id);
                a.left = ast::AssignTarget::Simple(ast::SimpleAssignTarget::Member(m));
            }
        }
        a.visit_mut_children_with(self);
    }

    fn visit_mut_assign_target_pat(&mut self, p: &mut ast::AssignTargetPat) {
        match p {
            ast::AssignTargetPat::Array(a) => {
                for e in a.elems.iter_mut().flatten() {
                    self.fix_pat_target(e);
                    if let ast::Pat::Assign(ap) = e {
                        self.fix_pat_target(&mut ap.left);
                    }
                    if let ast::Pat::Rest(r) = e {
                        self.fix_pat_target(&mut r.arg);
                    }
                }
            }
            ast::AssignTargetPat::Object(o) => {
                for prop in o.props.iter_mut() {
                    match prop {
                        ast::ObjectPatProp::KeyValue(kv) => {
                            self.fix_pat_target(&mut kv.value);
                            if let ast::Pat::Assign(ap) = &mut *kv.value {
                                self.fix_pat_target(&mut ap.left);
                            }
                        }
                        ast::ObjectPatProp::Rest(r) => self.fix_pat_target(&mut r.arg),
                        ast::ObjectPatProp::Assign(_) => {}
                    }
                }
            }
            ast::AssignTargetPat::Invalid(_) => {}
        }
        p.visit_mut_children_with(self);
    }

    fn visit_mut_update_expr(&mut self, u: &mut ast::UpdateExpr) {
        if let ast::Expr::Ident(i) = &*u.arg {
            let id = i.to_id();
            if self.reads.contains_key(&id) {
                let m = self.immutable_target(&id);
                u.arg = Box::new(ast::Expr::Member(m));
                return;
            }
        }
        u.visit_mut_children_with(self);
    }

    fn visit_mut_for_head(&mut self, h: &mut ast::ForHead) {
        if let ast::ForHead::Pat(p) = h {
            self.fix_pat_target(p);
        }
        h.visit_mut_children_with(self);
    }

    fn visit_mut_callee(&mut self, c: &mut ast::Callee) {
        // A call of an import read as a member: no `this`.
        if let ast::Callee::Expr(e) = c {
            if let ast::Expr::Ident(i) = &**e {
                if matches!(self.reads.get(&i.to_id()), Some(ImportRead::Member(_))) {
                    let read = self.read_expr(&i.to_id()).unwrap();
                    **e = no_this(read);
                    return;
                }
            }
        }
        c.visit_mut_children_with(self);
    }

    fn visit_mut_tagged_tpl(&mut self, t: &mut ast::TaggedTpl) {
        if let ast::Expr::Ident(i) = &*t.tag {
            if matches!(self.reads.get(&i.to_id()), Some(ImportRead::Member(_))) {
                let read = self.read_expr(&i.to_id()).unwrap();
                t.tag = Box::new(no_this(read));
                t.tpl.visit_mut_with(self);
                return;
            }
        }
        t.visit_mut_children_with(self);
    }

    fn visit_mut_opt_call(&mut self, c: &mut ast::OptCall) {
        if let ast::Expr::Ident(i) = &*c.callee {
            if matches!(self.reads.get(&i.to_id()), Some(ImportRead::Member(_))) {
                let read = self.read_expr(&i.to_id()).unwrap();
                c.callee = Box::new(no_this(read));
                c.args.visit_mut_with(self);
                return;
            }
        }
        c.visit_mut_children_with(self);
    }

    fn visit_mut_expr(&mut self, e: &mut ast::Expr) {
        match e {
            // `typeof arguments` at the top level: of the global, and
            // "undefined" (not a throw) when there is none.
            ast::Expr::Unary(u) if u.op == ast::UnaryOp::TypeOf && self.fn_depth == 0 && matches!(&*u.arg, ast::Expr::Ident(i) if &*i.sym == "arguments" && !self.renames.contains_key(&i.to_id()) && !self.reads.contains_key(&i.to_id())) => {
                *e = parse_expr("(\"arguments\" in globalThis ? typeof globalThis.arguments : \"undefined\")");
                return;
            }
            ast::Expr::Ident(i) => {
                let id = i.to_id();
                if self.reads.contains_key(&id) {
                    *e = self.read_expr(&id).unwrap();
                    return;
                }
                if &*i.sym == "arguments" && self.fn_depth == 0 && !self.renames.contains_key(&id) {
                    *e = parse_expr("__pe_R.globalArguments()");
                    return;
                }
            }
            ast::Expr::MetaProp(m) if m.kind == ast::MetaPropKind::ImportMeta => {
                *e = ident_expr(&self.meta);
                return;
            }
            _ => {}
        }
        e.visit_mut_children_with(self);
    }
}

/// Does a class define a static method or accessor called `name`:
/// `Some(true)` yes, `Some(false)` no, `None` maybe (one with a computed
/// key)?
fn static_method_named(c: &ast::Class) -> Option<bool> {
    let mut maybe = false;
    for m in &c.body {
        if let ast::ClassMember::Method(m) = m {
            if !m.is_static {
                continue;
            }
            match &m.key {
                ast::PropName::Ident(i) if &*i.sym == "name" => return Some(true),
                ast::PropName::Str(s) if s.value.as_str() == Some("name") => return Some(true),
                ast::PropName::Computed(_) => maybe = true,
                _ => {}
            }
        }
    }
    if maybe {
        None
    } else {
        Some(false)
    }
}

/// `(0, e)`: `e` called without a `this`.
fn no_this(e: ast::Expr) -> ast::Expr {
    ast::Expr::Paren(ast::ParenExpr {
        span: DUMMY_SP,
        expr: Box::new(ast::Expr::Seq(ast::SeqExpr { span: DUMMY_SP, exprs: vec![Box::new(ast::Expr::Lit(ast::Lit::Num(ast::Number { span: DUMMY_SP, value: 0.0, raw: None }))), Box::new(e)] })),
    })
}

/// `import(spec, ...)`: of a specifier resolved at link time, that module;
/// otherwise looked up at run time among the module's literal specifiers.
struct DynamicImports<'a> {
    dynamic: &'a [(String, Result<usize, String>)],
    file: String,
    found_var: String,
}

impl VisitMut for DynamicImports<'_> {
    fn visit_mut_expr(&mut self, e: &mut ast::Expr) {
        e.visit_mut_children_with(self);
        let ast::Expr::Call(c) = e else { return };
        if !matches!(c.callee, ast::Callee::Import(_)) {
            return;
        }
        let args = std::mem::take(&mut c.args);
        let spec = args.first().and_then(|a| literal_string(&a.expr));
        let mut exprs: Vec<Box<ast::Expr>> = Vec::new();
        // (The options are evaluated, as `import()` evaluates them.)
        for a in args.iter().skip(1) {
            exprs.push(a.expr.clone());
        }
        let call = match spec.as_ref().and_then(|s| self.dynamic.iter().find(|(x, _)| x == s)) {
            Some((s, Ok(id))) => {
                let _ = s;
                parse_expr(&format!("__pe_R.dynamicImport({id})"))
            }
            Some((s, Err(msg))) => parse_expr(&format!(
                "__pe_R.dynamicImportUnresolved({}, {}, {{ __proto__: null, {}: -1 }})",
                js_str(s),
                js_str(&format!("{} ({msg})", self.file)),
                js_str(s)
            )),
            None => {
                let mut call = parse_expr(&format!("__pe_R.dynamicImportUnresolved(undefined, {}, {})", js_str(&self.file), if self.dynamic.is_empty() { "{ __proto__: null }".to_string() } else { self.found_var.clone() }));
                if let ast::Expr::Call(cc) = &mut call {
                    if let Some(a) = args.first() {
                        cc.args[0] = a.clone();
                    }
                }
                call
            }
        };
        exprs.push(Box::new(call));
        *e = if exprs.len() == 1 { *exprs.pop().unwrap() } else { ast::Expr::Paren(ast::ParenExpr { span: DUMMY_SP, expr: Box::new(ast::Expr::Seq(ast::SeqExpr { span: DUMMY_SP, exprs })) }) };
    }
}
