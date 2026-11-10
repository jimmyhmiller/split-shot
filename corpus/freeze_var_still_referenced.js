// inputs: [{"previous": {"job": {"id": 7, "progress": 40, "selected": false, "customer": "Acme", "route": "N1", "status": 1, "priority": true}, "selectedId": 7}, "next": {"job": {"id": 7, "progress": 40, "selected": false, "customer": "Acme", "route": "N1", "status": 1, "priority": false}, "selectedId": 7}}, {"previous": {"job": {"id": 7, "progress": 40, "selected": false, "customer": "Acme", "route": "N1", "status": 1, "priority": false}, "selectedId": 7}, "next": {"job": {"id": 7, "progress": 40, "selected": false, "customer": "Acme", "route": "N1", "status": 1, "priority": true}, "selectedId": 7}}, {"previous": {"job": {"id": 7, "progress": 40, "selected": false, "customer": "Acme", "route": "N1", "status": 1, "priority": true}, "selectedId": 7}, "next": {"job": {"id": 7, "progress": 40, "selected": false, "customer": "Acme", "route": "N1", "status": 1, "priority": true}, "selectedId": 7}}, {"previous": {"job": {"id": 7, "progress": 40, "selected": false, "customer": "Acme", "route": "N1", "status": 1, "priority": false}, "selectedId": 7}, "next": {"job": {"id": 7, "progress": 40, "selected": false, "customer": "Acme", "route": "N1", "status": 1, "priority": false}, "selectedId": 7}}]
// A pending reader in the top frame frozen before a write gets a variable
// interned by (pc, slot): the same at each visit, so a loop's iterations
// tie. The two renders of an immediate-mode UI's update froze the status
// label's class at the same place, and the previous render's frozen value,
// kept in its node list, was overwritten by the next's: the comparison
// became `"" + k !== "" + k` and a changed class was never set
// (demos/tiny-update/probes/row-conditional-alias.js).
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


function Label(ui, id, className, value) {
  ui.element(id, "div", function () { ui.attr("class", className); ui.text(id + "-text", value); });
}
function JobRow(state, ui) {
  const job = state.job;
  const selectedId = state.selectedId;
  const id = "job-" + job.id;
  const record = job ? job.id : 0;
  const progress = job ? job.progress : 0;
  ui.element(id, "div", function () {
    ui.attr("class", record === selectedId ? "queue-row focused" : "queue-row");
    ui.attr("data-record", record);
    ui.property("hidden", !job);
    ui.element(id + "-check", "input", function () {
      ui.attr("type", "checkbox");
      ui.attr("aria-label", "Select consignment " + record);
      ui.attr("data-record", record);
      ui.property("checked", job ? job.selected : false);
      ui.on("change", toggleSelection);
    });
    ui.element(id + "-open", "button", function () {
      ui.attr("type", "button"); ui.attr("class", "job-link"); ui.attr("data-record", record);
      ui.on("click", selectJob);
      Label(ui, id + "-name", "job-name", job ? job.customer : "");
      Label(ui, id + "-route", "muted", job ? "RY-" + record + " · " + job.route : "");
    });
    ui.element(id + "-progress", "div", function () {
      ui.attr("class", "progress-cell");
      ui.element(id + "-track", "div", function () {
        ui.attr("class", "progress-track");
        ui.element(id + "-bar", "div", function () { ui.attr("style", "width:" + progress + "%"); });
      });
      ui.text(id + "-percent", progress + "%");
    });
    Label(ui, id + "-status", job && job.priority ? "badge warning" : "badge", job ? statusName(job.status) : "");
  });
}
function statusName(status) { return status === 0 ? "Queued" : status === 1 ? "In transit" : "Delivered"; }

function toggleSelection(state){return state;}
function selectJob(state){return state;}
function main(input) {
  const log = [];
  const nodes = [];
  for (let i = 0; i < 16; i++) {
    const n = i;
    nodes.push({ setAttribute: function (k, v) { log.push(n + ":" + k + "=" + v); }, nodeValue: "", checked: false, hidden: false });
  }
  nodes.collections = [];
  update(JobRow, { previous: input.previous, next: input.next, nodes: nodes, collections: { update: function () {} } });
  return log.join("|");
}
