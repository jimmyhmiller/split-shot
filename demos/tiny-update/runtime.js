// Immediate-mode UI library. A render describes a fixed tree; the same code
// supports initial DOM creation and subsequent text/attribute/property updates.
// Structural repetition: recurse over a fixed slot count, preserving each slot.
function repeatSlots(index, count, draw) {
  if (index < count) { draw(index); repeatSlots(index + 1, count, draw); }
}

function render(component, state) {
  const nodes = [];
  let parent = -1;
  const ui = {
    repeat: function (count, draw) { repeatSlots(0, count, draw); },
    list: function (id, items, component) {
      nodes.push({ id: id, tag: "div", parent: parent, text: null,
        attrs: [], props: [], events: [], collection: { items: items, component: component } });
    },
    element: function (id, tag, children) {
      const index = nodes.length;
      nodes.push({ id: id, tag: tag, parent: parent, text: null,
        attrs: [], props: [], events: [], collection: null });
      const saved = parent;
      parent = index;
      children();
      parent = saved;
    },
    text: function (id, value) {
      nodes.push({ id: id, tag: null, parent: parent, text: "" + value,
        attrs: [], props: [], events: [], collection: null });
    },
    attr: function (name, value) {
      nodes[parent].attrs.push({ name: name, value: "" + value });
    },
    property: function (name, value) {
      nodes[parent].props.push({ name: name, value: value });
    },
    on: function (type, action) {
      nodes[parent].events.push({ type: type, action: action });
    },
    button: function (id, label, action, disabled) {
      ui.element(id, "button", function () {
        ui.attr("type", "button");
        ui.property("disabled", !!disabled);
        ui.on("click", action);
        ui.text(id + "-text", label);
      });
    },
    input: function (id, value, action) {
      ui.element(id, "input", function () {
        ui.attr("type", "text");
        ui.property("value", value);
        ui.on("input", action);
      });
    }
  };
  component(state, ui);
  return nodes;
}

function listen(node, type, action, dispatch) {
  node.addEventListener(type, function (event) { dispatch(action, event); });
}

function mount(component, input) {
  const view = render(component, input.state);
  const nodes = [];
  nodes.collections = [];
  let i = 0;
  while (i < view.length) {
    const spec = view[i];
    const node = spec.tag === null
      ? input.document.createTextNode(spec.text)
      : input.document.createElement(spec.tag);
    nodes.push(node);
    if (spec.tag !== null) node.setAttribute("data-ui", spec.id);
    let j = 0;
    while (j < spec.attrs.length) {
      node.setAttribute(spec.attrs[j].name, spec.attrs[j].value);
      j = j + 1;
    }
    j = 0;
    while (j < spec.props.length) {
      node[spec.props[j].name] = spec.props[j].value;
      j = j + 1;
    }
    j = 0;
    while (j < spec.events.length) {
      listen(node, spec.events[j].type, spec.events[j].action, input.dispatch);
      j = j + 1;
    }
    if (spec.collection) {
      nodes.collections[i] = input.collections.mount(node, spec.collection.items, spec.collection.component);
    }
    if (spec.parent === -1) input.root.appendChild(node);
    else nodes[spec.parent].appendChild(node);
    i = i + 1;
  }
  return nodes;
}

function update(component, input) {
  const before = render(component, input.previous);
  const after = render(component, input.next);
  let i = 0;
  while (i < after.length) {
    const old = before[i];
    const spec = after[i];
    if (spec.collection) input.collections.update(input.nodes.collections[i], spec.collection.items);
    if (spec.tag === null && old.text !== spec.text) {
      input.nodes[i].nodeValue = spec.text;
    }
    let j = 0;
    while (j < spec.attrs.length) {
      if (old.attrs[j].value !== spec.attrs[j].value) {
        input.nodes[i].setAttribute(spec.attrs[j].name, spec.attrs[j].value);
      }
      j = j + 1;
    }
    j = 0;
    while (j < spec.props.length) {
      // Compare against the live DOM as a user can edit an input independently.
      if (input.nodes[i][spec.props[j].name] !== spec.props[j].value) {
        input.nodes[i][spec.props[j].name] = spec.props[j].value;
      }
      j = j + 1;
    }
    i = i + 1;
  }
}

