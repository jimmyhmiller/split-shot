// Generated runtime + application + entry point; do not edit.
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


// Relay: a dispatch workbench. All UI, data, and actions live in this file.
const PAGE_SIZE = 24;

function Operations(state, ui) {
  const model = state.view;
  ui.element("relay", "section", function () {
    ui.attr("class", "relay");
    ui.element("masthead", "header", function () {
      ui.element("brand", "div", function () {
        Label(ui, "eyebrow", "eyebrow", "RELAY / OPERATIONS");
        Label(ui, "headline", "headline", "Dispatch workbench");
        Label(ui, "subtitle", "muted", "North America · " + state.jobs.length + " active consignments");
      });
      ui.element("feed", "div", function () {
        ui.attr("class", "feed-actions");
        Label(ui, "feed-state", state.paused ? "badge warning" : "badge live", state.paused ? "FEED PAUSED" : "FEED LIVE");
        ui.button("advance", "Advance simulation", advance, state.paused);
        ui.button("pause", state.paused ? "Resume" : "Pause", pause);
      });
    });
    ui.element("metrics", "div", function () {
      ui.attr("class", "metrics");
      Metric(ui, "open", "Open consignments", model.open, "Awaiting delivery", "cyan");
      Metric(ui, "risk", "Needs attention", model.risk, "Priority · not delivered", "orange");
      Metric(ui, "delivered", "Delivered", model.done, "Completed consignments", "green");
      Metric(ui, "volume", "Units in motion", model.units, "Across the whole network", "purple");
    });
    ui.element("workspace", "div", function () {
      ui.attr("class", "workspace");
      ui.element("queue-pane", "section", function () {
        ui.attr("class", "queue-pane");
        ui.element("toolbar", "div", function () {
          ui.attr("class", "toolbar");
          ui.element("search-label", "label", function () {
            ui.text("search-caption", "Search consignments");
            ui.input("search", state.query, search);
          });
          Select(ui, "filter", "Status", state.filter, setFilter,
            ["all", "queued", "transit", "done"], ["All statuses", "Queued", "In transit", "Delivered"]);
          Select(ui, "sort", "Sort by", state.sort, setSort,
            ["risk", "progress", "customer"], ["Priority first", "Progress", "Customer"]);
          Select(ui, "dataset", "Network size", "" + state.jobs.length, loadDataset,
            ["240", "960", "3840"], ["240 consignments", "960 consignments", "3,840 consignments"]);
        });
        ui.element("bulk", "div", function () {
          ui.attr("class", "bulk-toolbar");
          Label(ui, "result-count", "muted", model.matched + " results · " + model.selected + " selected");
          ui.button("select-page", "Select page", selectPage);
          ui.button("clear-selection", "Clear", clearSelection, model.selected === 0);
          ui.button("bulk-dispatch", "Dispatch selected", dispatchSelected, model.selected === 0);
        });
        ui.element("queue-heading", "div", function () {
          ui.attr("class", "queue-row queue-heading");
          Label(ui, "column-select", "column-label", "SEL");
          Label(ui, "column-job", "column-label", "CONSIGNMENT / ROUTE");
          Label(ui, "column-progress", "column-label", "PROGRESS");
          Label(ui, "column-status", "column-label", "STATUS");
        });
        ui.element("queue", "div", function () {
          ui.attr("class", "queue");
          ui.list("queue-rows", model.rowStates, "job");
        });
        Label(ui, "empty", "empty", model.matched === 0 ? "No consignments match. Try another search or status." : "");
        ui.element("pagination", "div", function () {
          ui.attr("class", "pagination");
          ui.button("previous", "← Previous", previousPage, state.page === 0);
          ui.text("page", "Page " + (state.page + 1) + " / " + model.pages);
          ui.button("next", "Next →", nextPage, state.page >= model.pages - 1);
        });
      });
      Inspector(ui, state, model.focus);
    });
    ui.element("activity", "footer", function () {
      ui.attr("class", "activity");
      Label(ui, "tick", "badge", "TICK " + state.tick);
      ui.text("activity-text", state.note);
      ui.button("noop", "Render unchanged", unchanged);
    });
  });
}

function Label(ui, id, className, value) {
  ui.element(id, "div", function () { ui.attr("class", className); ui.text(id + "-text", value); });
}
function Metric(ui, id, title, value, caption, color) {
  ui.element(id + "-metric", "div", function () {
    ui.attr("class", "metric " + color);
    Label(ui, id + "-title", "metric-label", title);
    Label(ui, id + "-value", "metric-value", value);
    Label(ui, id + "-caption", "muted", caption);
  });
}
function Select(ui, id, label, value, action, values, labels) {
  ui.element(id + "-label", "label", function () {
    ui.text(id + "-caption", label);
    ui.element(id, "select", function () {
      ui.on("change", action);
      ui.repeat(values.length, function (i) {
        Option(ui, id + "-" + i, values[i], labels[i], value);
      });
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
function JobRow(state, ui) {
  const job = state.job;
  const selectedId = state.selectedId;
  const id = "job-" + job.id;
  const record = job.id;
  const progress = job.progress;
  ui.element(id, "div", function () {
    ui.attr("class", record === selectedId ? "queue-row focused" : "queue-row");
    ui.attr("data-record", record);
    ui.element(id + "-check", "input", function () {
      ui.attr("type", "checkbox");
      ui.attr("aria-label", "Select consignment " + record);
      ui.attr("data-record", record);
      ui.property("checked", job.selected);
      ui.on("change", toggleSelection);
    });
    ui.element(id + "-open", "button", function () {
      ui.attr("type", "button"); ui.attr("class", "job-link"); ui.attr("data-record", record);
      ui.on("click", selectJob);
      Label(ui, id + "-name", "job-name", job.customer);
      Label(ui, id + "-route", "muted", "RY-" + record + " · " + job.route);
    });
    ui.element(id + "-progress", "div", function () {
      ui.attr("class", "progress-cell");
      ui.element(id + "-track", "div", function () {
        ui.attr("class", "progress-track");
        ui.element(id + "-bar", "div", function () { ui.attr("style", "width:" + progress + "%"); });
      });
      ui.text(id + "-percent", progress + "%");
    });
    Label(ui, id + "-status", job.priority ? "badge warning" : "badge", statusName(job.status));
  });
}
function Inspector(ui, state, job) {
  ui.element("inspector", "aside", function () {
    ui.attr("class", "inspector");
    Label(ui, "detail-eyebrow", "eyebrow", "CONSIGNMENT DETAIL");
    Label(ui, "detail-name", "detail-name", job.customer);
    Label(ui, "detail-route", "muted", "RY-" + job.id + " · " + job.route);
    Label(ui, "detail-status", "detail-status", statusName(job.status) + " · " + job.progress + "% complete");
    Label(ui, "detail-units", "detail-field", job.units + " units · " + (job.priority ? "Priority service" : "Standard service"));
    ui.element("owner-label", "label", function () {
      ui.text("owner-caption", "Assigned operator");
      ui.input("owner", job.owner, assignOwner);
    });
    ui.button("priority", job.priority ? "Remove priority" : "Mark priority", togglePriority);
    ui.button("dispatch", "Dispatch consignment", dispatchOne);
    ui.button("deliver", "Mark delivered", deliverOne);
    Label(ui, "detail-help", "muted", "Select a consignment to inspect it. Edit the operator, change priority, or dispatch the whole selected page.");
    Label(ui, "simulation-label", "eyebrow", "NETWORK SIMULATION");
    Label(ui, "simulation-help", "muted", "Advance moves every in-transit consignment. The feed is deterministic so both implementations can replay exactly the same workload.");
    ui.button("reset", "Reset workspace", reset);
  });
}

function statusName(status) { return status === 0 ? "Queued" : status === 1 ? "In transit" : "Delivered"; }
// Pure data preparation runs once per transition, before either UI render.
function prepare(state) {
  const view = project(state);
  const page = Math.min(state.page, view.pages - 1);
  if (page !== state.page) {
    const next = { ...state, page: page };
    return { ...next, view: project(next) };
  }
  return { ...state, view: view };
}
function project(state) {
  const rows = [];
  const query = state.query.toLowerCase();
  let open = 0, done = 0, risk = 0, units = 0, selected = 0;
  let focus = state.jobs[0];
  for (let i = 0; i < state.jobs.length; i++) {
    const job = state.jobs[i];
    if (job.status === 2) done++; else { open++; units += job.units; if (job.priority) risk++; }
    if (job.selected) selected++;
    if (job.id === state.selectedId) focus = job;
    const matchesStatus = state.filter === "all" ||
      (state.filter === "queued" && job.status === 0) ||
      (state.filter === "transit" && job.status === 1) ||
      (state.filter === "done" && job.status === 2);
    if (matchesStatus && (job.customer + " " + job.route + " " + job.id + " " + job.owner).toLowerCase().includes(query)) rows.push(job);
  }
  if (state.sort === "customer") rows.sort(function (a, b) { return a.customer < b.customer ? -1 : a.customer > b.customer ? 1 : a.id - b.id; });
  else if (state.sort === "progress") rows.sort(function (a, b) { return a.progress - b.progress || a.id - b.id; });
  else rows.sort(function (a, b) { return (b.priority ? 1 : 0) - (a.priority ? 1 : 0) || a.id - b.id; });
  const visible = rows.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE);
  return { rows: visible, rowStates: visible.map(function (job) { return { key: job.id, job: job, selectedId: state.selectedId }; }),
    matched: rows.length, pages: Math.max(1, Math.ceil(rows.length / PAGE_SIZE)),
    open: open, done: done, risk: risk, units: units, selected: selected, focus: focus };
}

// Reducers receive current state and actual DOM events, never stale render state.
function search(state, event) { return { ...state, query: event.target.value, page: 0 }; }
function setFilter(state, event) { return { ...state, filter: event.target.value, page: 0 }; }
function setSort(state, event) { return { ...state, sort: event.target.value, page: 0 }; }
function selectJob(state, event) { return { ...state, selectedId: +event.currentTarget.getAttribute("data-record") }; }
function editJob(state, id, patch, note) {
  return { ...state, jobs: state.jobs.map(function (job) { return job.id === id ? { ...job, ...patch } : job; }), note: note };
}
function toggleSelection(state, event) {
  return editJob(state, +event.currentTarget.getAttribute("data-record"), { selected: event.target.checked }, "Selection updated");
}
function assignOwner(state, event) { return editJob(state, state.selectedId, { owner: event.target.value }, "Operator assignment updated"); }
function togglePriority(state) {
  const job = state.view.focus;
  return editJob(state, job.id, { priority: !job.priority }, "Priority updated for RY-" + job.id);
}
function dispatchOne(state) { return editJob(state, state.selectedId, { status: 1, progress: 5 }, "Consignment dispatched"); }
function deliverOne(state) { return editJob(state, state.selectedId, { status: 2, progress: 100 }, "Delivery confirmed"); }
function selectPage(state) {
  const ids = state.view.rows.map(function (job) { return job.id; });
  return { ...state, jobs: state.jobs.map(function (job) { return ids.includes(job.id) ? { ...job, selected: true } : job; }), note: "Visible page selected" };
}
function clearSelection(state) { return { ...state, jobs: state.jobs.map(function (job) { return job.selected ? { ...job, selected: false } : job; }), note: "Selection cleared" }; }
function dispatchSelected(state) {
  return { ...state, jobs: state.jobs.map(function (job) { return job.selected ? { ...job, status: 1, progress: 5, selected: false } : job; }), note: "Selected consignments dispatched" };
}
function previousPage(state) { return { ...state, page: Math.max(0, state.page - 1) }; }
function nextPage(state) { return { ...state, page: Math.min(state.view.pages - 1, state.page + 1) }; }
function pause(state) { return { ...state, paused: !state.paused }; }
function advance(state) {
  if (state.paused) return state;
  return { ...state, tick: state.tick + 1, note: "Network advanced · all in-transit consignments updated",
    jobs: state.jobs.map(function (job) {
      if (job.status !== 1) return job;
      const progress = Math.min(100, job.progress + 7);
      return { ...job, progress: progress, status: progress === 100 ? 2 : 1 };
    }) };
}
function loadDataset(state, event) { return initialState({ size: +event.target.value }); }
function unchanged(state) { return state; }
function reset(state) { return initialState({ size: state.jobs.length }); }
function initialState(options) {
  const size = Math.max(1, Math.min(10000, options.size | 0));
  const customers = ["Northstar Labs", "Aperture Health", "Juniper Goods", "Orbit Devices", "Cedar & Co", "Meridian Supply", "Atlas Robotics", "Ember Coffee"];
  const routes = ["SEA → PDX", "LAX → SFO", "NYC → BOS", "DEN → AUS", "CHI → MSP", "ATL → MIA"];
  const operators = ["Avery", "Morgan", "Jordan", "Riley"];
  const jobs = [];
  for (let i = 0; i < size; i++) {
    const status = i % 5 === 0 ? 2 : i % 3 === 0 ? 1 : 0;
    jobs.push({ id: i + 1, customer: customers[i % 8], route: routes[i % 6], owner: operators[i % 4],
      status: status, progress: status === 2 ? 100 : status === 1 ? (i * 13) % 85 : 0,
      priority: i % 7 === 0, units: 4 + (i * 17) % 96, selected: false });
  }
  return { jobs: jobs, query: "", filter: "all", sort: "risk", page: 0,
    selectedId: 1, paused: false, tick: 0, note: "Morning dispatch ready. Select a consignment to get started." };
}

function main(input) { return initialState(input); }