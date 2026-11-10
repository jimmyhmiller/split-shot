// Keyed collection and lifecycle layer. Shared by original and generated code.
// Every item uses a separately specialized mount/update schema. Collections
// preserve existing DOM and listeners when rows are sorted, filtered, or edited.
function createCollections(program, document, dispatch) {
  const api = {
    mount: function (root, items, component) {
      const schema = program.components[component];
      if (!schema) throw new Error("Unknown component: " + component);
      const list = { root: root, schema: schema, entries: new Map() };
      api.update(list, items);
      return list;
    },
    update: function (list, items) {
      // Reject duplicate keys before performing any writes.
      const keys = new Set();
      for (const item of items) {
        if (keys.has(item.key)) throw new Error("Duplicate collection key: " + item.key);
        keys.add(item.key);
      }
      for (const [key, entry] of list.entries) {
        if (!keys.has(key)) {
          for (const node of entry.nodes) if (node.parentNode === list.root) list.root.removeChild(node);
          list.entries.delete(key);
        }
      }
      let cursor = list.root.firstChild;
      for (const item of items) {
        let entry = list.entries.get(item.key);
        if (entry) {
          list.schema.update({ previous: entry.state, next: item, nodes: entry.nodes, collections: api });
          entry.state = item;
        } else {
          const nodes = list.schema.mount({ state: item, document: document,
            root: list.root, dispatch: dispatch, collections: api });
          entry = { state: item, nodes: nodes };
          list.entries.set(item.key, entry);
        }
        // Components may own several root nodes; move them in order, leaving
        // already-correct nodes untouched. insertBefore preserves listeners.
        for (const node of entry.nodes) {
          if (node.parentNode !== list.root) continue;
          if (node !== cursor) list.root.insertBefore(node, cursor);
          else cursor = cursor.nextSibling;
        }
      }
    }
  };
  return api;
}
function start(program, document, root, observe, options) {
  let state = program.prepare(program.initial(options || { size: 240 }));
  let nodes;
  let disposed = false;
  const collections = createCollections(program, document, dispatch);
  function dispatch(action, event) {
    if (disposed) return;
    const previous = state;
    const reduced = action(previous, event);
    const next = reduced === previous ? previous : program.prepare(reduced);
    program.update({ previous: previous, next: next, nodes: nodes, collections: collections });
    state = next;
    if (observe) observe({ phase: "update", state: state });
  }
  nodes = program.mount({ document: document, root: root, state: state, dispatch: dispatch, collections: collections });
  if (observe) observe({ phase: "mount", state: state });
  return {
    getState: function () { return state; },
    dispose: function () {
      if (disposed) return;
      disposed = true;
      for (const node of nodes) if (node.parentNode === root) root.removeChild(node);
      nodes = null;
    }
  };
}
