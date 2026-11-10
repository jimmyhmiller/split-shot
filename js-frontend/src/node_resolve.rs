//! Node.js module resolution: what a specifier names, as Node resolves it.
//!
//! `import` follows Node's ESM resolver (ESM_RESOLVE: exact file paths,
//! package `exports` / `imports` with conditions and `*` patterns, package
//! self-reference, `node_modules` lookup, the legacy `main` field), and
//! `require` follows its CommonJS resolver (LOAD_AS_FILE / LOAD_AS_DIRECTORY,
//! which try `.js`, `.json`, `.node` and `index` files, and the same package
//! `exports` / `imports` with the `require` condition). The conditions are
//! Node's defaults (`node`, `import` or `require`, `module-sync`,
//! `node-addons`, `default`) plus the ones given (`--conditions`).

use std::cell::RefCell;
use std::collections::HashMap;
use std::path::{Component, Path, PathBuf};
use std::rc::Rc;

use serde_json::Value;

/// How a specifier is being loaded.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Mode {
    Import,
    Require,
}

/// What a specifier resolved to.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Resolved {
    /// A file (its real path).
    File(PathBuf),
    /// A Node built-in, by its `node:` name.
    Builtin(String),
}

/// The format Node loads a file as.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Format {
    Esm,
    CommonJs,
    Json,
    /// A `.js`/`.ts` file in a package scope with no `type`: ESM when its
    /// syntax is (Node's syntax detection), CommonJS otherwise.
    Detect,
}

struct PackageJson {
    dir: PathBuf,
    name: Option<String>,
    type_: Option<String>,
    main: Option<String>,
    exports: Option<Value>,
    imports: Option<Value>,
}

pub struct NodeResolver {
    import_conditions: Vec<String>,
    require_conditions: Vec<String>,
    builtins: Vec<String>,
    prefix_only: Vec<String>,
    packages: RefCell<HashMap<PathBuf, Option<Rc<PackageJson>>>>,
}

const BUILTINS: &str = include_str!("node_builtins.txt");

impl NodeResolver {
    pub fn new(extra_conditions: &[String]) -> NodeResolver {
        let mut builtins = Vec::new();
        let mut prefix_only = Vec::new();
        for line in BUILTINS.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if let Some(n) = line.strip_prefix("prefix-only ") {
                prefix_only.push(n.to_string());
            } else {
                builtins.push(line.to_string());
            }
        }
        let mk = |kind: &str| {
            let mut c: Vec<String> = vec!["node".into(), kind.into(), "module-sync".into(), "node-addons".into()];
            for x in extra_conditions {
                if !c.contains(x) {
                    c.push(x.clone());
                }
            }
            c
        };
        NodeResolver {
            import_conditions: mk("import"),
            require_conditions: mk("require"),
            builtins,
            prefix_only,
            packages: RefCell::new(HashMap::new()),
        }
    }

    fn conditions(&self, mode: Mode) -> &[String] {
        match mode {
            Mode::Import => &self.import_conditions,
            Mode::Require => &self.require_conditions,
        }
    }

    /// The built-in a specifier names (`fs`, `node:fs`, `node:test`), if any.
    fn builtin(&self, spec: &str) -> Option<String> {
        if let Some(n) = spec.strip_prefix("node:") {
            if self.builtins.iter().any(|b| b == n) || self.prefix_only.iter().any(|b| b == n) {
                return Some(spec.to_string());
            }
            return None;
        }
        if self.builtins.iter().any(|b| b == spec) {
            return Some(format!("node:{spec}"));
        }
        None
    }

    /// Resolve `spec` as written in the module at `parent`.
    pub fn resolve(&self, spec: &str, parent: &Path, mode: Mode) -> Result<Resolved, String> {
        let parent_dir = parent.parent().unwrap_or(Path::new("/")).to_path_buf();
        if spec.starts_with("node:") {
            return self.builtin(spec).map(Resolved::Builtin).ok_or_else(|| format!("No such built-in module: {spec}"));
        }
        if let Some(rest) = spec.strip_prefix("file://") {
            let p = PathBuf::from(percent_decode(rest)?);
            return self.finish(&p, spec, parent, mode);
        }
        if spec.starts_with("data:") {
            return Err(format!("data: URL modules are not supported (`{spec}`)"));
        }
        let relative = spec == "." || spec == ".." || spec.starts_with("./") || spec.starts_with("../") || spec.starts_with('/');
        if relative {
            let decoded = if mode == Mode::Import { percent_decode(spec)? } else { spec.to_string() };
            let joined = normalize(&parent_dir.join(&decoded));
            return match mode {
                Mode::Import => self.finish(&joined, spec, parent, mode),
                Mode::Require => {
                    // (A trailing `/` names a directory.)
                    let dir_only = spec.ends_with('/');
                    let found = if dir_only { None } else { self.load_as_file(&joined, parent) };
                    match found.or_else(|| self.load_as_directory(&joined, parent)) {
                        Some(p) => Ok(Resolved::File(realpath(&p))),
                        None => Err(not_found(spec, parent, mode)),
                    }
                }
            };
        }
        if spec.starts_with('#') {
            return self.package_imports(spec, parent, mode);
        }
        // A bare specifier: a built-in, the package itself, or a package in
        // `node_modules`.
        if let Some(b) = self.builtin(spec) {
            return Ok(Resolved::Builtin(b));
        }
        let (name, subpath) = parse_package_name(spec)?;
        if let Some(r) = self.self_resolve(&name, &subpath, &parent_dir, mode)? {
            return self.check_resolved(r, spec, parent, mode);
        }
        let mut dir = Some(parent_dir.as_path());
        while let Some(d) = dir {
            if d.file_name().is_some_and(|f| f == "node_modules") {
                dir = d.parent();
                continue;
            }
            let pkg_dir = d.join("node_modules").join(&name);
            if pkg_dir.is_dir() {
                let pjson = self.read_package(&pkg_dir);
                if let Some(pj) = &pjson {
                    if let Some(exports) = &pj.exports {
                        let r = self.exports_resolve(&pkg_dir, &format!(".{subpath}"), exports, mode)?;
                        return match r {
                            Some(p) => self.check_resolved(p, spec, parent, mode),
                            None => Err(format!("Package subpath '.{subpath}' is not defined by \"exports\" in {}", pkg_dir.join("package.json").display())),
                        };
                    }
                }
                return match mode {
                    Mode::Import => {
                        if subpath.is_empty() {
                            match self.legacy_main(&pkg_dir, pjson.as_deref()) {
                                Some(p) => Ok(Resolved::File(realpath(&p))),
                                None => Err(not_found(spec, parent, mode)),
                            }
                        } else {
                            self.finish(&pkg_dir.join(&subpath[1..]), spec, parent, mode)
                        }
                    }
                    Mode::Require => {
                        let target = if subpath.is_empty() { pkg_dir.clone() } else { pkg_dir.join(&subpath[1..]) };
                        let found = if subpath.is_empty() { None } else { self.load_as_file(&target, parent) };
                        match found.or_else(|| self.load_as_directory(&target, parent)) {
                            Some(p) => Ok(Resolved::File(realpath(&p))),
                            None => Err(not_found(spec, parent, mode)),
                        }
                    }
                };
            }
            dir = d.parent();
        }
        Err(not_found(spec, parent, mode))
    }

    /// A path a resolution ended at: an existing file (not a directory).
    /// From TypeScript source, a `.js`/`.mjs`/`.cjs` file that does not exist
    /// is the `.ts`/`.mts`/`.cts` one it is compiled from (TypeScript's
    /// resolution: the specifier names the file tsc emits).
    fn finish(&self, p: &Path, spec: &str, parent: &Path, mode: Mode) -> Result<Resolved, String> {
        if p.is_dir() {
            return Err(format!("Directory import '{}' is not supported resolving ES modules imported from {}", p.display(), parent.display()));
        }
        if p.is_file() {
            return Ok(Resolved::File(realpath(p)));
        }
        if let Some(src) = ts_source_of(p, parent) {
            return Ok(Resolved::File(realpath(&src)));
        }
        Err(not_found(spec, parent, mode))
    }

    /// What an `exports`/`imports` target resolved to: a file it names
    /// exactly (for both loaders: no extensions are tried), or a built-in or
    /// package an `imports` target names.
    fn check_resolved(&self, r: Resolved, spec: &str, parent: &Path, mode: Mode) -> Result<Resolved, String> {
        match r {
            Resolved::File(p) => self.finish(&p, spec, parent, mode),
            b @ Resolved::Builtin(_) => Ok(b),
        }
    }

    fn load_as_file(&self, x: &Path, parent: &Path) -> Option<PathBuf> {
        if x.is_file() {
            return Some(x.to_path_buf());
        }
        if let Some(src) = ts_source_of(x, parent) {
            return Some(src);
        }
        for ext in [".js", ".json", ".node"] {
            let p = PathBuf::from(format!("{}{ext}", x.display()));
            if p.is_file() {
                return Some(p);
            }
        }
        None
    }

    fn load_index(&self, x: &Path) -> Option<PathBuf> {
        for f in ["index.js", "index.json", "index.node"] {
            let p = x.join(f);
            if p.is_file() {
                return Some(p);
            }
        }
        None
    }

    fn load_as_directory(&self, x: &Path, parent: &Path) -> Option<PathBuf> {
        if !x.is_dir() {
            return None;
        }
        if let Some(pj) = self.read_package(x) {
            if let Some(main) = &pj.main {
                let m = normalize(&x.join(main));
                if let Some(p) = self.load_as_file(&m, parent).or_else(|| self.load_index(&m)) {
                    return Some(p);
                }
            }
        }
        self.load_index(x)
    }

    /// LEGACY_MAIN_RESOLVE (an `import` of a package without `exports`).
    fn legacy_main(&self, pkg_dir: &Path, pj: Option<&PackageJson>) -> Option<PathBuf> {
        if let Some(main) = pj.and_then(|p| p.main.as_ref()) {
            let m = pkg_dir.join(main);
            let tries = [
                m.clone(),
                PathBuf::from(format!("{}.js", m.display())),
                PathBuf::from(format!("{}.json", m.display())),
                PathBuf::from(format!("{}.node", m.display())),
                m.join("index.js"),
                m.join("index.json"),
                m.join("index.node"),
            ];
            for t in tries {
                if t.is_file() {
                    return Some(t);
                }
            }
        }
        for f in ["index.js", "index.json", "index.node"] {
            let p = pkg_dir.join(f);
            if p.is_file() {
                return Some(p);
            }
        }
        None
    }

    fn self_resolve(&self, name: &str, subpath: &str, from: &Path, mode: Mode) -> Result<Option<Resolved>, String> {
        let Some(pj) = self.scope_package(from) else { return Ok(None) };
        if pj.name.as_deref() != Some(name) {
            return Ok(None);
        }
        let Some(exports) = &pj.exports else { return Ok(None) };
        let r = self.exports_resolve(&pj.dir, &format!(".{subpath}"), exports, mode)?;
        match r {
            Some(p) => Ok(Some(p)),
            None => Err(format!("Package subpath '.{subpath}' is not defined by \"exports\" in {}", pj.dir.join("package.json").display())),
        }
    }

    /// PACKAGE_EXPORTS_RESOLVE: `None` when not exported.
    fn exports_resolve(&self, pkg_dir: &Path, subpath: &str, exports: &Value, mode: Mode) -> Result<Option<Resolved>, String> {
        let dot_keys = match exports {
            Value::Object(o) => {
                let dots = o.keys().filter(|k| k.starts_with('.')).count();
                if dots > 0 && dots != o.len() {
                    return Err(format!("Invalid package config {}: \"exports\" cannot mix \".\" keys and conditions", pkg_dir.join("package.json").display()));
                }
                dots > 0
            }
            _ => false,
        };
        if subpath == "." {
            let main_export = if dot_keys {
                match exports {
                    Value::Object(o) => o.get("."),
                    _ => None,
                }
            } else {
                Some(exports)
            };
            return match main_export {
                Some(t) => self.target_resolve(pkg_dir, t, None, false, mode),
                None => Ok(None),
            };
        }
        if dot_keys {
            if let Value::Object(o) = exports {
                return self.imports_exports_resolve(subpath, o, pkg_dir, false, mode);
            }
        }
        Ok(None)
    }

    /// PACKAGE_IMPORTS_RESOLVE.
    fn package_imports(&self, spec: &str, parent: &Path, mode: Mode) -> Result<Resolved, String> {
        if spec == "#" || spec.starts_with("#/") {
            return Err(format!("Invalid module specifier '{spec}' imported from {}", parent.display()));
        }
        let from = parent.parent().unwrap_or(Path::new("/"));
        if let Some(pj) = self.scope_package(from) {
            if let Some(Value::Object(imports)) = &pj.imports {
                if let Some(p) = self.imports_exports_resolve(spec, imports, &pj.dir, true, mode)? {
                    return self.check_resolved(p, spec, parent, mode);
                }
            }
        }
        Err(format!("Package import specifier \"{spec}\" is not defined imported from {}", parent.display()))
    }

    /// PACKAGE_IMPORTS_EXPORTS_RESOLVE.
    fn imports_exports_resolve(
        &self,
        key: &str,
        obj: &serde_json::Map<String, Value>,
        pkg_dir: &Path,
        is_imports: bool,
        mode: Mode,
    ) -> Result<Option<Resolved>, String> {
        if !key.contains('*') {
            if let Some(t) = obj.get(key) {
                return self.target_resolve(pkg_dir, t, None, is_imports, mode);
            }
        }
        let mut expansion: Vec<&String> = obj.keys().filter(|k| k.matches('*').count() == 1).collect();
        expansion.sort_by(|a, b| pattern_key_compare(a, b));
        for k in expansion {
            let star = k.find('*').unwrap();
            let base = &k[..star];
            let trailer = &k[star + 1..];
            if key.starts_with(base) && key != base && (trailer.is_empty() || (key.ends_with(trailer) && key.len() >= k.len())) {
                let m = &key[base.len()..key.len() - trailer.len()];
                return self.target_resolve(pkg_dir, &obj[k.as_str()], Some(m), is_imports, mode);
            }
        }
        Ok(None)
    }

    /// PACKAGE_TARGET_RESOLVE: `Ok(None)` for a target that is excluded
    /// (`null`) or matches no condition.
    fn target_resolve(&self, pkg_dir: &Path, target: &Value, pattern: Option<&str>, is_imports: bool, mode: Mode) -> Result<Option<Resolved>, String> {
        match target {
            Value::String(t) => {
                if !t.starts_with("./") {
                    if !is_imports || t.starts_with("../") || t.starts_with('/') || is_url(t) {
                        return Err(format!("Invalid \"exports\"/\"imports\" target \"{t}\" in {}", pkg_dir.join("package.json").display()));
                    }
                    // An `imports` target that is a bare specifier: resolved
                    // as a package (or built-in) from the package.
                    let spec = match pattern {
                        Some(m) => t.replace('*', m),
                        None => t.clone(),
                    };
                    return self.resolve(&spec, &pkg_dir.join("package.json"), mode).map(Some);
                }
                let check = |s: &str| {
                    s.split(['/', '\\']).skip(1).any(|seg| seg == "." || seg == ".." || seg.eq_ignore_ascii_case("node_modules"))
                };
                if check(t) {
                    return Err(format!("Invalid \"exports\"/\"imports\" target \"{t}\" in {}", pkg_dir.join("package.json").display()));
                }
                let resolved = match pattern {
                    Some(m) => {
                        if m.split(['/', '\\']).any(|seg| seg == "." || seg == ".." || seg.eq_ignore_ascii_case("node_modules")) {
                            return Err(format!("Invalid module path segment in \"{m}\" for {}", pkg_dir.join("package.json").display()));
                        }
                        t.replace('*', m)
                    }
                    None => t.clone(),
                };
                Ok(Some(Resolved::File(normalize(&pkg_dir.join(&resolved[2..])))))
            }
            Value::Object(o) => {
                if o.keys().any(|k| k.parse::<u64>().is_ok()) {
                    return Err(format!("Invalid package config {}: numeric keys in conditions", pkg_dir.join("package.json").display()));
                }
                for (k, v) in o {
                    if k == "default" || self.conditions(mode).iter().any(|c| c == k) {
                        if let Some(r) = self.target_resolve(pkg_dir, v, pattern, is_imports, mode)? {
                            return Ok(Some(r));
                        }
                    }
                }
                Ok(None)
            }
            Value::Array(a) => {
                if a.is_empty() {
                    return Ok(None);
                }
                let mut last_err = None;
                for t in a {
                    match self.target_resolve(pkg_dir, t, pattern, is_imports, mode) {
                        Ok(Some(r)) => return Ok(Some(r)),
                        Ok(None) => {}
                        Err(e) => last_err = Some(e),
                    }
                }
                match last_err {
                    Some(e) => Err(e),
                    None => Ok(None),
                }
            }
            Value::Null => Ok(None),
            _ => Err(format!("Invalid \"exports\"/\"imports\" target in {}", pkg_dir.join("package.json").display())),
        }
    }

    fn read_package(&self, dir: &Path) -> Option<Rc<PackageJson>> {
        if let Some(p) = self.packages.borrow().get(dir) {
            return p.clone();
        }
        let file = dir.join("package.json");
        let parsed = std::fs::read_to_string(&file).ok().and_then(|s| serde_json::from_str::<Value>(&s).ok()).map(|v| {
            let s = |k: &str| v.get(k).and_then(|x| x.as_str()).map(|x| x.to_string());
            Rc::new(PackageJson {
                dir: dir.to_path_buf(),
                name: s("name"),
                type_: s("type"),
                main: s("main"),
                exports: v.get("exports").cloned(),
                imports: v.get("imports").cloned(),
            })
        });
        self.packages.borrow_mut().insert(dir.to_path_buf(), parsed.clone());
        parsed
    }

    /// The package scope of `dir`: the nearest `package.json` at or above it
    /// (not above a `node_modules` directory).
    fn scope_package(&self, dir: &Path) -> Option<Rc<PackageJson>> {
        let mut d = Some(dir);
        while let Some(x) = d {
            if x.file_name().is_some_and(|f| f == "node_modules") {
                return None;
            }
            if x.join("package.json").is_file() {
                return self.read_package(x);
            }
            d = x.parent();
        }
        None
    }

    /// The format Node loads `file` as.
    pub fn format_of(&self, file: &Path) -> Result<Format, String> {
        let ext = file.extension().and_then(|e| e.to_str()).unwrap_or("");
        match ext {
            "mjs" | "mts" => Ok(Format::Esm),
            "cjs" | "cts" => Ok(Format::CommonJs),
            "json" => Ok(Format::Json),
            "node" => Err(format!("{}: native addons (.node) cannot be partially evaluated", file.display())),
            _ => {
                let scope = self.scope_package(file.parent().unwrap_or(Path::new("/")));
                match scope.as_ref().and_then(|p| p.type_.as_deref()) {
                    Some("module") => Ok(Format::Esm),
                    Some("commonjs") => Ok(Format::CommonJs),
                    _ => Ok(Format::Detect),
                }
            }
        }
    }

    /// `node_modules` directories `require` searches from `dir`
    /// (NODE_MODULES_PATHS), as `module.paths` lists them.
    pub fn node_modules_paths(dir: &Path) -> Vec<String> {
        let mut out = Vec::new();
        let mut d = Some(dir);
        while let Some(x) = d {
            if x.file_name().is_none_or(|f| f != "node_modules") {
                out.push(x.join("node_modules").display().to_string());
            }
            d = x.parent();
        }
        out
    }
}

/// The TypeScript file `p` (a `.js`, `.mjs`, `.cjs` or `.jsx` path that does
/// not exist) is compiled from, when the importer `parent` is TypeScript.
fn ts_source_of(p: &Path, parent: &Path) -> Option<PathBuf> {
    let parent_ts = matches!(parent.extension().and_then(|e| e.to_str()), Some("ts" | "mts" | "cts" | "tsx"));
    if !parent_ts {
        return None;
    }
    let ext = p.extension().and_then(|e| e.to_str())?;
    let candidates: &[&str] = match ext {
        "js" => &["ts", "tsx"],
        "jsx" => &["tsx"],
        "mjs" => &["mts"],
        "cjs" => &["cts"],
        _ => return None,
    };
    candidates.iter().map(|e| p.with_extension(e)).find(|c| c.is_file())
}

/// Is `s` a URL (it starts with a scheme: `node:`, `file:`, `https:`)?
fn is_url(s: &str) -> bool {
    let Some(colon) = s.find(':') else { return false };
    let scheme = &s[..colon];
    let mut cs = scheme.chars();
    matches!(cs.next(), Some(c) if c.is_ascii_alphabetic()) && cs.all(|c| c.is_ascii_alphanumeric() || matches!(c, '+' | '-' | '.'))
}

fn not_found(spec: &str, parent: &Path, mode: Mode) -> String {
    match mode {
        Mode::Import => format!("Cannot find module '{spec}' imported from {}", parent.display()),
        Mode::Require => format!("Cannot find module '{spec}' required from {}", parent.display()),
    }
}

fn parse_package_name(spec: &str) -> Result<(String, String), String> {
    let (name_end, valid) = if let Some(rest) = spec.strip_prefix('@') {
        match rest.find('/') {
            Some(i) => {
                let after = &rest[i + 1..];
                let j = after.find('/').map(|j| i + 2 + j).unwrap_or(spec.len());
                (j, true)
            }
            None => (spec.len(), false),
        }
    } else {
        (spec.find('/').unwrap_or(spec.len()), true)
    };
    let name = &spec[..name_end];
    if !valid || name.starts_with('.') || name.contains('\\') || name.contains('%') || name.is_empty() {
        return Err(format!("Invalid module specifier '{spec}': not a valid package name"));
    }
    Ok((name.to_string(), spec[name_end..].to_string()))
}

/// PATTERN_KEY_COMPARE: longer base first, then longer key.
fn pattern_key_compare(a: &str, b: &str) -> std::cmp::Ordering {
    let ba = a.find('*').map(|i| i + 1).unwrap_or(a.len());
    let bb = b.find('*').map(|i| i + 1).unwrap_or(b.len());
    bb.cmp(&ba).then(b.len().cmp(&a.len()))
}

fn percent_decode(s: &str) -> Result<String, String> {
    if !s.contains('%') {
        return Ok(s.to_string());
    }
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            let h = std::str::from_utf8(&bytes[i + 1..i + 3]).map_err(|e| e.to_string())?;
            let v = u8::from_str_radix(h, 16).map_err(|_| format!("Invalid URL escape in '{s}'"))?;
            if v == b'/' || v == b'\\' {
                return Err(format!("Invalid module specifier '{s}': must not include an encoded \"/\" or \"\\\""));
            }
            out.push(v);
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(out).map_err(|e| e.to_string())
}

/// `p` with `.` and `..` components removed (lexically, as URL resolution
/// does).
fn normalize(p: &Path) -> PathBuf {
    let mut out = PathBuf::new();
    for c in p.components() {
        match c {
            Component::ParentDir => {
                out.pop();
            }
            Component::CurDir => {}
            other => out.push(other.as_os_str()),
        }
    }
    out
}

fn realpath(p: &Path) -> PathBuf {
    std::fs::canonicalize(p).unwrap_or_else(|_| p.to_path_buf())
}
