// The module system of a linked program (see `link.rs`): CommonJS modules,
// JSON modules, Node built-ins, the namespace objects of ES modules, and the
// groups of ES modules a program evaluates. The linked script's top-level
// code defines this function (in a function of its own) and calls it once,
// before any module code runs.
//
// A module is known by its index in the linked program. An ES module's code
// is part of a group (one function, its modules' top-level bindings in one
// scope); everything else is registered here and evaluated on demand, as
// Node does.
function __pe_moduleRegistry() {
  "use strict";
  // (It calls the built-ins it uses directly, so the specializer can fold
  // them: unlike Node's loader, a program that replaces, say,
  // `Object.defineProperty` before a module is loaded on demand changes how
  // that module's namespace is made.)
  // Per module: what it is and what is needed to evaluate it.
  const defs = [];
  // CommonJS (and CommonJS JSON) module objects, by module, once loading starts.
  const cjsModules = [];
  // `require.cache`: the module objects by file name.
  const requireCache = Object.create(null);
  // The namespace object of each module once made (one per module).
  const namespaces = [];
  // ES module groups: their function, and whether they have run.
  const groups = [];
  // Per ES module: 0 not evaluated, 1 evaluating, 2 evaluated, 3 failed.
  const esmState = [];
  const esmError = [];
  let mainModule;

  function notFound(spec, parentFile) {
    const e = new Error("Cannot find module '" + spec + "'" + (parentFile ? "\nRequire stack:\n- " + parentFile : ""));
    e.code = "MODULE_NOT_FOUND";
    return e;
  }

  // A module namespace object: no prototype, the exports (in code unit
  // order) as enumerable non-configurable properties read live through
  // `getters`, `Symbol.toStringTag` "Module", not extensible. (Exotic
  // namespace objects report their exports as data properties; these are
  // accessors.)
  function namespace(names, getters) {
    const ns = Object.create(null);
    for (let i = 0; i < names.length; i++) {
      Object.defineProperty(ns, names[i], { get: getters[i], enumerable: true, configurable: false });
    }
    Object.defineProperty(ns, Symbol.toStringTag, { value: "Module", writable: false, enumerable: false, configurable: false });
    Object.preventExtensions(ns);
    return ns;
  }

  // The namespace an ES module importing a CommonJS module, JSON module or
  // built-in sees: `default` is the value, and (for CommonJS and built-ins)
  // its own enumerable properties when loaded are named exports; a
  // CommonJS module's also has `"module.exports"`, the value.
  function valueNamespace(value, named, cjs) {
    const names = ["default"];
    const vals = [value];
    if (cjs) {
      names.push("module.exports");
      vals.push(value);
    }
    if (named && (typeof value === "object" || typeof value === "function") && value !== null) {
      const ks = Object.keys(value);
      for (let i = 0; i < ks.length; i++) {
        if (ks[i] !== "default" && !(cjs && ks[i] === "module.exports")) {
          names.push(ks[i]);
          vals.push(value[ks[i]]);
        }
      }
    }
    const order = names.map((n, i) => i).sort((a, b) => (names[a] < names[b] ? -1 : names[a] > names[b] ? 1 : 0));
    return namespace(order.map((i) => names[i]), order.map((i) => () => vals[i]));
  }

  function makeRequire(id, module) {
    const def = defs[id];
    function require(spec) {
      if (typeof spec !== "string") {
        throw new TypeError('The "id" argument must be of type string. Received ' + (spec === null ? "null" : typeof spec));
      }
      if (!Object.prototype.hasOwnProperty.call(def.table, spec)) {
        throw new Error("partial-new: require(" + JSON.stringify(spec) + ") in " + def.filename + ": the specifier was not seen at link time (only specifiers written as string literals are resolved)");
      }
      const target = def.table[spec];
      if (target < 0) throw notFound(spec, def.filename);
      const got = requireModule(target, module);
      return got;
    }
    require.resolve = function resolve(spec) {
      if (typeof spec !== "string") {
        throw new TypeError('The "request" argument must be of type string. Received ' + (spec === null ? "null" : typeof spec));
      }
      if (!Object.prototype.hasOwnProperty.call(def.table, spec)) {
        throw new Error("partial-new: require.resolve(" + JSON.stringify(spec) + ") in " + def.filename + ": the specifier was not seen at link time");
      }
      const target = def.table[spec];
      if (target < 0) throw notFound(spec, def.filename);
      return defs[target].filename;
    };
    require.cache = requireCache;
    require.main = mainModule;
    return require;
  }

  // What `require(...)` of module `id` returns.
  function requireModule(id, parent) {
    const def = defs[id];
    if (def.kind === "cjs") return loadCjs(id, parent).exports;
    if (def.kind === "json") return loadJsonCjs(id, parent).exports;
    if (def.kind === "builtin") return def.load();
    if (def.kind === "esm") {
      // require(esm): its namespace (or its "module.exports" export).
      const ns = esmNamespace(id);
      if (def.exportsModuleExports) return ns["module.exports"];
      return ns;
    }
    throw new Error("partial-new: unknown module kind " + def.kind);
  }

  function newModuleObject(def, parent, isMain) {
    const m = {
      id: isMain ? "." : def.filename,
      path: def.dirname,
      exports: {},
      filename: def.filename,
      loaded: false,
      children: [],
      paths: def.paths,
    };
    if (parent && parent.children) parent.children.push(m);
    return m;
  }

  function loadCjs(id, parent, isMain) {
    const existing = cjsModules[id];
    if (existing) {
      if (parent && parent.children && parent.children.indexOf(existing) < 0) parent.children.push(existing);
      return existing;
    }
    const def = defs[id];
    const m = newModuleObject(def, parent, isMain);
    if (isMain) mainModule = m;
    cjsModules[id] = m;
    requireCache[def.filename] = m;
    const require = makeRequire(id, m);
    m.require = require;
    try {
      def.factory.call(m.exports, m.exports, require, m, def.filename, def.dirname);
    } catch (e) {
      cjsModules[id] = undefined;
      delete requireCache[def.filename];
      throw e;
    }
    m.loaded = true;
    return m;
  }

  function loadJsonCjs(id, parent) {
    const existing = cjsModules[id];
    if (existing) return existing;
    const def = defs[id];
    const m = newModuleObject(def, parent, false);
    cjsModules[id] = m;
    requireCache[def.filename] = m;
    try {
      m.exports = JSON.parse(def.text);
    } catch (e) {
      cjsModules[id] = undefined;
      delete requireCache[def.filename];
      e.message = def.filename + ": " + e.message;
      throw e;
    }
    m.loaded = true;
    return m;
  }

  // The namespace of module `id` as an ES module sees it, evaluating it
  // first if it has not been.
  function esmNamespace(id) {
    const def = defs[id];
    if (def.kind === "esm") {
      ensureEsm(id);
      return namespaces[id];
    }
    if (namespaces[id] !== undefined) return namespaces[id];
    let ns;
    if (def.kind === "cjs") ns = valueNamespace(loadCjs(id, undefined).exports, true, true);
    else if (def.kind === "jsonEsm") ns = valueNamespace(JSON.parse(def.text), false, false);
    else if (def.kind === "builtin") ns = valueNamespace(def.load(), true, false);
    else throw new Error("partial-new: no namespace for module kind " + def.kind);
    namespaces[id] = ns;
    return ns;
  }

  function ensureEsm(id) {
    const st = esmState[id];
    if (st === 2 || st === 1) return;
    if (st === 3) throw esmError[id];
    const g = defs[id].group;
    if (groups[g].started) {
      // A module of a group already running that has not been evaluated:
      // Node would evaluate it now, out of the group's order.
      throw new Error("partial-new: " + defs[id].filename + " is required before its turn in the static evaluation order of its module graph, which a linked program does not support");
    }
    runGroupTracked(g);
  }

  // Run group `g` (once): its modules' code, with no `this` (a module's
  // top-level `this` is undefined).
  function runGroup(g) {
    const group = groups[g];
    if (group.started) return group.result;
    group.started = true;
    const fn = group.fn;
    group.result = fn();
    return group.result;
  }

  // `runGroup` for a group with a module code finds at run time (by
  // `require`, `import()`, or from another group): if the group throws, each
  // of its modules not evaluated by then failed with that error, which
  // loading it again throws. (Kept apart from `runGroup`: the specializer
  // does not inline a function with a `try`.)
  function runGroupTracked(g) {
    const group = groups[g];
    if (group.started) return group.result;
    try {
      return runGroup(g);
    } catch (e) {
      for (let i = 0; i < group.modules.length; i++) {
        const id = group.modules[i];
        if (esmState[id] !== 2) {
          esmState[id] = 3;
          esmError[id] = e;
        }
      }
      throw e;
    }
  }

  // An ES module's binding read through another module's namespace that is
  // not exported: a SyntaxError in Node when linking.
  function missingExport(spec, name) {
    return new SyntaxError("The requested module '" + spec + "' does not provide an export named '" + name + "'");
  }

  const R = {
    namespace,
    cjs(id, filename, dirname, paths, table, factory) {
      defs[id] = { kind: "cjs", filename, dirname, paths, table, factory };
    },
    json(id, filename, dirname, text, esm) {
      defs[id] = { kind: esm ? "jsonEsm" : "json", filename, dirname, paths: [], text };
    },
    builtin(id, name, load) {
      defs[id] = { kind: "builtin", filename: name, dirname: undefined, load };
    },
    esm(id, filename, group, exportsModuleExports) {
      defs[id] = { kind: "esm", filename, group, exportsModuleExports };
      esmState[id] = 0;
    },
    group(g, fn, modules) {
      groups[g] = { fn, modules, started: false, result: undefined };
    },
    // Called by a group's code: module `id`'s namespace object, and the
    // module's evaluation starting, ending, or failing.
    setNamespace(id, ns) {
      namespaces[id] = ns;
    },
    evaluating(id) {
      esmState[id] = 1;
    },
    evaluated(id) {
      esmState[id] = 2;
    },
    failed(id, e) {
      esmState[id] = 3;
      esmError[id] = e;
    },
    // The namespace (or value) an import of module `id` reads: an ES module
    // of another group, a CommonJS or JSON module, a built-in.
    importNamespace(id) {
      return esmNamespace(id);
    },
    // The names an ES module imports from the namespace `ns` of a CommonJS
    // module or built-in, which Node requires it to have.
    requireExports(ns, spec, names) {
      for (let i = 0; i < names.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(ns, names[i])) throw missingExport(spec, names[i]);
      }
    },
    // `import(id)` of a module resolved at link time.
    dynamicImport(id) {
      return Promise.resolve().then(() => esmNamespace(id));
    },
    // `import(spec)` of a specifier not resolved at link time.
    dynamicImportUnresolved(spec, parentFile, found) {
      return Promise.resolve().then(() => {
        if (typeof spec !== "string") spec = String(spec);
        if (!Object.prototype.hasOwnProperty.call(found, spec)) {
          throw new Error("partial-new: import(" + JSON.stringify(spec) + ") in " + parentFile + ": the specifier was not seen at link time (only specifiers written as string literals are resolved)");
        }
        const target = found[spec];
        if (target < 0) {
          const e = new Error("Cannot find module '" + spec + "' imported from " + parentFile);
          e.code = "ERR_MODULE_NOT_FOUND";
          throw e;
        }
        return esmNamespace(target);
      });
    },
    importMeta(url, filename, dirname, resolveTable) {
      const meta = Object.create(null);
      meta.dirname = dirname;
      meta.filename = filename;
      meta.resolve = function resolve(spec) {
        if (!Object.prototype.hasOwnProperty.call(resolveTable, spec)) {
          throw new Error("partial-new: import.meta.resolve(" + JSON.stringify(spec) + ") in " + filename + ": the specifier was not seen at link time");
        }
        return resolveTable[spec];
      };
      meta.url = url;
      return meta;
    },
    // An object whose `v` reads `get` and throws when written: what an
    // assignment to an import binding writes (it is immutable).
    immutable(get) {
      return {
        get v() {
          return get();
        },
        set v(_) {
          throw new TypeError("Assignment to constant variable.");
        },
      };
    },
    // The `name` a function or class keeps when the linker renamed its
    // binding.
    setName(f, name) {
      Object.defineProperty(f, "name", { value: name, writable: false, enumerable: false, configurable: true });
    },
    // In a class's first static block: its name, unless the class defined
    // a static `name` of its own.
    setClassName(c, linkedName, name) {
      const d = Object.getOwnPropertyDescriptor(c, "name");
      if (d && d.value === linkedName) Object.defineProperty(c, "name", { value: name, writable: false, enumerable: false, configurable: true });
    },
    // Class decorators (the 2023-11 decorators proposal, as Babel applies
    // them): `decorators` (evaluated before the class, in source order) are
    // applied to the class last first, each with a context `{ kind: "class",
    // name, addInitializer, metadata }`; one that returns a value (which must
    // be a function) replaces the class. Called in the class's first static
    // block: `value` is what the class binding is once the class is defined,
    // and `init()` (its last static block) runs the initializers added.
    applyClassDecorators(cls, decorators, name) {
      let value = cls;
      const initializers = [];
      const parentMeta = Object.getPrototypeOf(cls);
      const metaKey = typeof Symbol.metadata === "symbol" ? Symbol.metadata : undefined;
      const metadata = Object.create(metaKey !== undefined && parentMeta !== null && parentMeta !== Function.prototype ? parentMeta[metaKey] ?? null : null);
      for (let i = decorators.length - 1; i >= 0; i--) {
        let done = false;
        const context = {
          kind: "class",
          name,
          addInitializer(f) {
            if (done) throw new TypeError("attempted to call addInitializer after decoration was finished");
            if (typeof f !== "function") throw new TypeError("An initializer must be a function");
            initializers.push(f);
          },
          metadata,
        };
        const r = decorators[i](value, context);
        done = true;
        if (r !== undefined) {
          if (typeof r !== "function") throw new TypeError("A class decorator must return a function or undefined");
          value = r;
        }
      }
      if (metaKey !== undefined) {
        Object.defineProperty(cls, metaKey, { value: metadata, writable: false, enumerable: false, configurable: true });
      }
      return {
        value,
        init() {
          for (let i = 0; i < initializers.length; i++) initializers[i].call(value);
        },
      };
    },
    // A top-level `arguments` in an ES module: the global (if any).
    globalArguments() {
      if (!("arguments" in globalThis)) throw new ReferenceError("arguments is not defined");
      return globalThis.arguments;
    },
    runGroup,
    runGroupTracked,
    // The entry of a CommonJS program: its module, as `require.main`.
    requireMain(id) {
      return loadCjs(id, undefined, true).exports;
    },
    requireModule,
  };
  return R;
}
