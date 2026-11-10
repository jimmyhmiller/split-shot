// Immediate-mode UI library. A render describes a fixed tree; the same code
// supports initial DOM creation and subsequent text/attribute/property updates.
function render(component, state) {
  const nodes = [];
  let parent = -1;
  const ui = {
    element: function (id, tag, children) {
      const index = nodes.length;
      nodes.push({ id: id, tag: tag, parent: parent, text: null,
        attrs: [], props: [], events: [] });
      const saved = parent;
      parent = index;
      children();
      parent = saved;
    },
    text: function (id, value) {
      nodes.push({ id: id, tag: null, parent: parent, text: "" + value,
        attrs: [], props: [], events: [] });
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


function Select(ui, id, label, value, action, values, labels) {
  ui.element(id + "-label", "label", function () {
    ui.text(id + "-caption", label);
    ui.element(id, "select", function () {
      ui.on("change", action);
      let i = 0;
      while (i < values.length) {
        Option(ui, id + "-" + i, values[i], labels[i], value);
        i = i + 1;
      }
    });
  });
}
function Option(ui, id, value, label, current) {
  ui.element(id, "option", function () {
    ui.attr("value", value);
    ui.property("selected", value === current);
    ui.text(id + "-text", label);
  });
}

function setFilter(state,event){return state;}
function Operations(state,ui){Select(ui,"filter","Status",state.filter,setFilter,["all","queued","transit","done"],["All","Queued","Transit","Done"]);}
function main(input){update(Operations,input);}
