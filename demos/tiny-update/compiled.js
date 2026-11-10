// Generated complete UI bundle; do not edit.
const RelayDesk = (() => {
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

const program = {
mount: (() => {
var __s0 = "Advance moves every in-transit consignment. The feed is deterministic so both implementations can replay exactly the same workload.";
var __s1 = "Select a consignment to inspect it. Edit the operator, change priority, or dispatch the whole selected page.";
var __s2 = "No consignments match. Try another search or status.";

function __o0() {
  return {value: 0, writable: true, enumerable: true, configurable: true};
}
function __o1() {
  return {value: false, writable: true, enumerable: true, configurable: true};
}

var repeatSlots, render, listen, mount, update, Operations, Label, Metric, Select, Option, JobRow, Inspector, statusName, prepare, project, search, setFilter, setSort, selectJob, editJob, toggleSelection, assignOwner, togglePriority, dispatchOne, deliverOne, selectPage, clearSelection, dispatchSelected, previousPage, nextPage, pause, advance, loadDataset, unchanged, reset, initialState;
let PAGE_SIZE;

function __mk1(b, a) {
  return function() {
    a.attr("class", "inspector");
    Label(a, "detail-eyebrow", "eyebrow", "CONSIGNMENT DETAIL");
    Label(a, "detail-name", "detail-name", b.customer);
    Label(a, "detail-route", "muted", "RY-" + b.id + " · " + b.route);
    Label(a, "detail-status", "detail-status", statusName(b.status) + " · " + b.progress + "% complete");
    Label(a, "detail-units", "detail-field", b.units + " units · " + (b.priority ? "Priority service" : "Standard service"));
    a.element.call(a, "owner-label", "label", __mk2(b, a));
    a.button("priority", b.priority ? "Remove priority" : "Mark priority", togglePriority);
    a.button("dispatch", "Dispatch consignment", dispatchOne);
    a.button("deliver", "Mark delivered", deliverOne);
    Label(a, "detail-help", "muted", __s1);
    Label(a, "simulation-label", "eyebrow", "NETWORK SIMULATION");
    Label(a, "simulation-help", "muted", __s0);
    a.button("reset", "Reset workspace", reset);
  };
}

function __mk2(b, a) {
  return function() {
    a.text("owner-caption", "Assigned operator");
    a.input("owner", b.owner, assignOwner);
  };
}

function __mk4(b, c, h, d, i, a) {
  return function() {
    let e, f, g;
    a.attr("class", d === i ? "queue-row focused" : "queue-row");
    a.attr("data-record", d);
    a.element.call(a, b + "-check", "input", __mk5(c, d, a));
    a.element.call(a, b + "-open", "button", __mk6(b, c, d, a));
    a.element.call(a, b + "-progress", "div", __mk7(b, h, a));
    e = Label;
    f = c.priority ? "badge warning" : "badge";
    g = statusName(c.status);
    e(a, b + "-status", f, g);
  };
}

function __mk5(c, b, a) {
  return function() {
    a.attr("type", "checkbox");
    a.attr("aria-label", "Select consignment " + b);
    a.attr("data-record", b);
    a.property("checked", c.selected);
    a.on("change", toggleSelection);
  };
}

function __mk6(b, c, d, a) {
  return function() {
    a.attr("type", "button");
    a.attr("class", "job-link");
    a.attr("data-record", d);
    a.on("click", selectJob);
    Label(a, b + "-name", "job-name", c.customer);
    Label(a, b + "-route", "muted", "RY-" + d + " · " + c.route);
  };
}

function __mk7(b, c, a) {
  return function() {
    a.attr("class", "progress-cell");
    a.element.call(a, b + "-track", "div", __mk8(b, c, a));
    a.text(b + "-percent", c + "%");
  };
}

function __mk8(b, c, a) {
  return function() {
    a.attr("class", "progress-track");
    a.element.call(a, b + "-bar", "div", __mk9(c, a));
  };
}

function __mk9(a, b) {
  return function() {
    b.attr("style", "width:" + a + "%");
  };
}

function __mk11(b, c, a, d) {
  return function() {
    a.attr("class", b);
    a.text(c + "-text", d);
  };
}

function __mk13(c, d, b, e, a, f) {
  return function() {
    a.attr("class", "metric " + d);
    Label(a, b + "-title", "metric-label", e);
    Label(a, b + "-value", "metric-value", f);
    Label(a, b + "-caption", "muted", c);
  };
}

function __mk15(c, b, a) {
  return function() {
    a.attr("class", "relay");
    a.element.call(a, "masthead", "header", __mk16(b, a));
    a.element.call(a, "metrics", "div", __mk19(c, a));
    a.element.call(a, "workspace", "div", __mk20(c, b, a));
    a.element.call(a, "activity", "footer", __mk28(b, a));
  };
}

function __mk16(b, a) {
  return function() {
    a.element.call(a, "brand", "div", __mk17(b, a));
    a.element.call(a, "feed", "div", __mk18(b, a));
  };
}

function __mk17(b, a) {
  return function() {
    Label(a, "eyebrow", "eyebrow", "RELAY / OPERATIONS");
    Label(a, "headline", "headline", "Dispatch workbench");
    Label(a, "subtitle", "muted", "North America · " + b.jobs.length + " active consignments");
  };
}

function __mk18(a, b) {
  return function() {
    b.attr("class", "feed-actions");
    Label(b, "feed-state", a.paused ? "badge warning" : "badge live", a.paused ? "FEED PAUSED" : "FEED LIVE");
    b.button("advance", "Advance simulation", advance, a.paused);
    b.button("pause", a.paused ? "Resume" : "Pause", pause);
  };
}

function __mk19(b, a) {
  return function() {
    a.attr("class", "metrics");
    Metric(a, "open", "Open consignments", b.open, "Awaiting delivery", "cyan");
    Metric(a, "risk", "Needs attention", b.risk, "Priority · not delivered", "orange");
    Metric(a, "delivered", "Delivered", b.done, "Completed consignments", "green");
    Metric(a, "volume", "Units in motion", b.units, "Across the whole network", "purple");
  };
}

function __mk20(b, c, a) {
  return function() {
    a.attr("class", "workspace");
    a.element.call(a, "queue-pane", "section", __mk21(b, c, a));
    Inspector(a, c, b.focus);
  };
}

function __mk21(b, c, a) {
  return function() {
    a.attr("class", "queue-pane");
    a.element.call(a, "toolbar", "div", __mk22(c, a));
    a.element.call(a, "bulk", "div", __mk24(b, a));
    a.element.call(a, "queue-heading", "div", __mk25(a));
    a.element.call(a, "queue", "div", __mk26(b, a));
    Label(a, "empty", "empty", b.matched === 0 ? __s2 : "");
    a.element.call(a, "pagination", "div", __mk27(b, c, a));
  };
}

function __mk22(b, a) {
  return function() {
    a.attr("class", "toolbar");
    a.element.call(a, "search-label", "label", __mk23(b, a));
    Select(a, "filter", "Status", b.filter, setFilter, ["all", "queued", "transit", "done"], ["All statuses", "Queued", "In transit", "Delivered"]);
    Select(a, "sort", "Sort by", b.sort, setSort, ["risk", "progress", "customer"], ["Priority first", "Progress", "Customer"]);
    Select(a, "dataset", "Network size", "" + b.jobs.length, loadDataset, ["240", "960", "3840"], ["240 consignments", "960 consignments", "3,840 consignments"]);
  };
}

function __mk23(b, a) {
  return function() {
    a.text("search-caption", "Search consignments");
    a.input("search", b.query, search);
  };
}

function __mk24(b, a) {
  return function() {
    a.attr("class", "bulk-toolbar");
    Label(a, "result-count", "muted", b.matched + " results · " + b.selected + " selected");
    a.button("select-page", "Select page", selectPage);
    a.button("clear-selection", "Clear", clearSelection, b.selected === 0);
    a.button("bulk-dispatch", "Dispatch selected", dispatchSelected, b.selected === 0);
  };
}

function __mk25(a) {
  return function() {
    a.attr("class", "queue-row queue-heading");
    Label(a, "column-select", "column-label", "SEL");
    Label(a, "column-job", "column-label", "CONSIGNMENT / ROUTE");
    Label(a, "column-progress", "column-label", "PROGRESS");
    Label(a, "column-status", "column-label", "STATUS");
  };
}

function __mk26(b, a) {
  return function() {
    a.attr("class", "queue");
    a.list("queue-rows", b.rowStates, "job");
  };
}

function __mk27(c, b, a) {
  return function() {
    a.attr("class", "pagination");
    a.button("previous", "← Previous", previousPage, b.page === 0);
    a.text("page", "Page " + (b.page + 1) + " / " + c.pages);
    a.button("next", "Next →", nextPage, b.page >= c.pages - 1);
  };
}

function __mk28(b, a) {
  return function() {
    a.attr("class", "activity");
    Label(a, "tick", "badge", "TICK " + b.tick);
    a.text("activity-text", b.note);
    a.button("noop", "Render unchanged", unchanged);
  };
}

function __mk30(c, d, e, a, b) {
  return function() {
    a.attr("value", b);
    a.property("selected", b === c);
    a.text(d + "-text", e);
  };
}

function __mk32(c, b, d, e, a, f, g) {
  return function() {
    a.text(b + "-caption", d);
    a.element.call(a, b, "select", __mk33(c, b, e, a, f, g));
  };
}

function __mk33(c, d, e, a, f, b) {
  return function() {
    a.on("change", c);
    a.repeat.call(a, b.length, __mk34(d, e, a, f, b));
  };
}

function __mk34(b, c, d, e, f) {
  return function(a) {
    Option(d, b + "-" + a, f[a], c[a], e);
  };
}

function __mk48(a, b) {
  return function(c) {
    b(a, c);
  };
}

function __mk56() {
  return function(a, b) {
    return a.customer < b.customer ? -1 : a.customer > b.customer ? 1 : a.id - b.id;
  };
}

function __mk57(b) {
  return function(a) {
    return {key: a.id, job: a, selectedId: b.selectedId};
  };
}

function __mk58() {
  return function(a, b) {
    return a.progress - b.progress || a.id - b.id;
  };
}

function __mk59() {
  return function(a, b) {
    return (b.priority ? 1 : 0) - (a.priority ? 1 : 0) || a.id - b.id;
  };
}

function __mk62(a, c) {
  return function list(d, e, f) {
    let b;
    a.push;
    b = {id: d, tag: "div", parent: c.value, text: null, attrs: [], props: [], events: [], collection: {items: e, component: f}};
    a.push(b);
  };
}

function __mk63(c, a) {
  return function element(e, f, g) {
    let d, b;
    d = c.length;
    c.push;
    b = {id: e, tag: f, parent: a.value, text: null, attrs: [], props: [], events: [], collection: null};
    c.push(b);
    b = a.value;
    a.value;
    a.value = d;
    g();
    a.value = b;
  };
}

function __mk64(a, b) {
  return function text(id, value) {
    a.push({
        id: id,
        tag: null,
        parent: b.value,
        text: "" + value,
        attrs: [],
        props: [],
        events: [],
        collection: null
    });
};
}

function __mk65(a, b) {
  return function attr(name, value) {
    a[b.value].attrs.push({
        name: name,
        value: "" + value
    });
};
}

function __mk66(a, b) {
  return function property(name, value) {
    a[b.value].props.push({
        name: name,
        value: value
    });
};
}

function __mk67(a, b) {
  return function on(type, action) {
    a[b.value].events.push({
        type: type,
        action: action
    });
};
}

function __mk68(a) {
  return function button(b, c, d, e) {
    a.value.element.call(a.value, b, "button", __mk69(d, e, b, c, a));
  };
}

function __mk69(b, c, d, e, a) {
  return function() {
    a.value.attr("type", "button");
    a.value.property("disabled", !!c);
    a.value.on("click", b);
    a.value.text(d + "-text", e);
  };
}

function __mk70(a) {
  return function input(b, c, d) {
    a.value.element.call(a.value, b, "input", __mk71(d, a, c));
  };
}

function __mk71(b, a, c) {
  return function() {
    a.value.attr("type", "text");
    a.value.property("value", c);
    a.value.on("input", b);
  };
}

function main(c) {
  let e, d, A, B, C, D, E, F, G, H, I, J, f, h, i, K, L, M, N, O, P, Q, R, S, T, g, U, V, W, b, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y, z, a;
  e = c.state;
  d = e.view;
  A = "North America · " + e.jobs.length + " active consignments";
  B = e.paused ? "badge warning" : "badge live";
  C = e.paused ? "FEED PAUSED" : "FEED LIVE";
  D = e.paused;
  E = e.paused ? "Resume" : "Pause";
  F = d.open;
  G = d.risk;
  H = d.done;
  I = d.units;
  J = e.query;
  f = e.filter;
  h = e.sort;
  i = "" + e.jobs.length;
  K = d.matched + " results · " + d.selected + " selected";
  L = d.selected === 0;
  M = d.selected === 0;
  N = d.rowStates;
  O = d.matched === 0 ? __s2 : "";
  P = e.page === 0;
  Q = "Page " + (e.page + 1) + " / " + d.pages;
  R = e.page >= d.pages - 1;
  d = d.focus;
  S = d.customer;
  T = "RY-" + d.id + " · " + d.route;
  g = d.status;
  g = (g === 0 ? "Queued" : g === 1 ? "In transit" : "Delivered") + " · " + d.progress + "% complete";
  U = d.units + " units · " + (d.priority ? "Priority service" : "Standard service");
  V = d.owner;
  d = d.priority ? "Remove priority" : "Mark priority";
  W = "TICK " + e.tick;
  e = e.note;
  b = [];
  b.collections = [];
  Inspector = function Inspector(a, c, b) {
  a.element.call(a, "inspector", "aside", __mk1(b, a));
};
  JobRow = function JobRow(d, b) {
  let a, e, c, f, g;
  a = d.job;
  e = d.selectedId;
  c = "job-" + a.id;
  f = a.id;
  g = a.progress;
  b.element.call(b, c, "div", __mk4(c, a, g, f, e, b));
};
  Label = function Label(a, b, c, d) {
  a.element.call(a, b, "div", __mk11(c, b, a, d));
};
  Metric = function Metric(a, b, c, d, e, f) {
  a.element.call(a, b + "-metric", "div", __mk13(e, f, b, c, a, d));
};
  Operations = function Operations(b, a) {
  let c;
  c = b.view;
  a.element.call(a, "relay", "section", __mk15(c, b, a));
};
  Option = function Option(a, b, c, d, e) {
  a.element.call(a, b, "option", __mk30(e, b, d, a, c));
};
  PAGE_SIZE = 24;
  Select = function Select(a, b, c, d, e, f, g) {
  a.element.call(a, b + "-label", "label", __mk32(e, b, c, g, a, d, f));
};
  j = function advance(state) {
    if (state.paused) return state;
    return {
        ...state,
        tick: state.tick + 1,
        note: "Network advanced · all in-transit consignments updated",
        jobs: state.jobs.map(function(job) {
            if (job.status !== 1) return job;
            const progress = Math.min(100, job.progress + 7);
            return {
                ...job,
                progress: progress,
                status: progress === 100 ? 2 : 1
            };
        })
    };
};
  advance = j;
  k = function assignOwner(a, c) {
  let b;
  b = {owner: c.target.value};
  return editJob(a, a.selectedId, b, "Operator assignment updated");
};
  assignOwner = k;
  l = function clearSelection(state) {
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return job.selected ? {
                ...job,
                selected: false
            } : job;
        }),
        note: "Selection cleared"
    };
};
  clearSelection = l;
  m = function deliverOne(a) {
  return editJob(a, a.selectedId, {status: 2, progress: 100}, "Delivery confirmed");
};
  deliverOne = m;
  n = function dispatchOne(a) {
  return editJob(a, a.selectedId, {status: 1, progress: 5}, "Consignment dispatched");
};
  dispatchOne = n;
  o = function dispatchSelected(state) {
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return job.selected ? {
                ...job,
                status: 1,
                progress: 5,
                selected: false
            } : job;
        }),
        note: "Selected consignments dispatched"
    };
};
  dispatchSelected = o;
  editJob = function editJob(state, id, patch, note) {
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return job.id === id ? {
                ...job,
                ...patch
            } : job;
        }),
        note: note
    };
};
  initialState = function initialState(j) {
  let c, d, e, g, f, a, b, h, i;
  c = Math;
  d = Math.max;
  e = Math.min(10000, j.size | 0);
  c = d.call(c, 1, e);
  d = ["Northstar Labs", "Aperture Health", "Juniper Goods", "Orbit Devices", "Cedar & Co", "Meridian Supply", "Atlas Robotics", "Ember Coffee"];
  e = ["SEA → PDX", "LAX → SFO", "NYC → BOS", "DEN → AUS", "CHI → MSP", "ATL → MIA"];
  g = ["Avery", "Morgan", "Jordan", "Riley"];
  f = [];
  a = 0;
  while (a < c) {
    f.push;
    b = d[a % 8];
    h = e[a % 6];
    i = g[a % 4];
    b = {id: a + 1, customer: b, route: h, owner: i, status: a % 5 === 0 ? 2 : a % 3 === 0 ? 1 : 0, progress: (a % 5 === 0 ? 2 : a % 3 === 0 ? 1 : 0) === 2 ? 100 : (a % 5 === 0 ? 2 : a % 3 === 0 ? 1 : 0) === 1 ? a * 13 % 85 : 0, priority: a % 7 === 0, units: 4 + a * 17 % 96, selected: false};
    f.push(b);
    a += 1;
  }
  b = {jobs: f, query: "", filter: "all", sort: "risk", page: 0, selectedId: 1, paused: false, tick: 0, note: "Morning dispatch ready. Select a consignment to get started."};
  return b;
};
  listen = function listen(a, b, c, d) {
  a.addEventListener.call(a, b, __mk48(c, d));
};
  p = function loadDataset(c, b) {
  let a;
  a = {size: b.target.value - 0};
  return initialState(a);
};
  loadDataset = p;
  mount = function mount(h, d) {
  let g, e, f, a, c, b;
  g = render(h, d.state);
  e = [];
  e.collections = [];
  f = 0;
  while (f < g.length) {
    a: {
      a = g[f];
      if (a.tag === null) {
        c = d.document.createTextNode(a.text);
        break a;
      }
      c = d.document.createElement(a.tag);
    }
    e.push(c);
    if (a.tag !== null) {
      c.setAttribute("data-ui", a.id);
    }
    b = 0;
    while (b < a.attrs.length) {
      c.setAttribute((a.attrs[b]).name, (a.attrs[b]).value);
      b += 1;
    }
    b = 0;
    while (b < a.props.length) {
      c[(a.props[b]).name] = (a.props[b]).value;
      b += 1;
    }
    b = 0;
    while (b < a.events.length) {
      listen(c, (a.events[b]).type, (a.events[b]).action, d.dispatch);
      b += 1;
    }
    if (a.collection) {
      e.collections[f] = d.collections.mount(c, a.collection.items, a.collection.component);
    }
    b: {
      if (a.parent === -1) {
        d.root.appendChild(c);
        break b;
      }
      (e[a.parent]).appendChild(c);
    }
    f += 1;
  }
  return e;
};
  q = function nextPage(state) {
    return {
        ...state,
        page: Math.min(state.view.pages - 1, state.page + 1)
    };
};
  nextPage = q;
  r = function pause(state) {
    return {
        ...state,
        paused: !state.paused
    };
};
  pause = r;
  prepare = function prepare(state) {
    const view = project(state);
    const page = Math.min(state.page, view.pages - 1);
    if (page !== state.page) {
        const next = {
            ...state,
            page: page
        };
        return {
            ...next,
            view: project(next)
        };
    }
    return {
        ...state,
        view: view
    };
};
  s = function previousPage(state) {
    return {
        ...state,
        page: Math.max(0, state.page - 1)
    };
};
  previousPage = s;
  project = function project(f) {
  let b, i, e, h, j, l, k, d, c, a, g, m;
  b = f.query.toLowerCase();
  i = f.jobs[0];
  e = [];
  h = 0;
  j = 0;
  l = 0;
  k = 0;
  d = 0;
  c = 0;
  while (c < f.jobs.length) {
    a: {
      b: {
        a = f.jobs[c];
        if (a.status === 2) {
          j += 1;
          break b;
        }
        k += a.units;
        if (a.priority) {
          l += 1;
          h += 1;
          break b;
        }
        h += 1;
        g = a.selected;
        g = g ? d + 1 : d;
        break a;
      }
      g = a.selected;
      g = g ? d + 1 : d;
    }
    m = a.id === f.selectedId;
    d = f.filter === "all" || f.filter === "queued" && a.status === 0 || f.filter === "transit" && a.status === 1 || f.filter === "done" && a.status === 2;
    if (d) {
      d = (a.customer + " " + a.route + " " + a.id + " " + a.owner).toLowerCase();
      d = d.includes(b);
    }
    if (d) {
      e.push(a);
    }
    d = g;
    i = m ? a : i;
    c += 1;
  }
  c: {
    b = f.sort === "customer";
    if (b) {
      b = e.sort;
      c = __mk56();
      b.call(e, c);
      break c;
    }
    b = f.sort === "progress";
    if (b) {
      b = e.sort;
      c = __mk58();
      b.call(e, c);
      break c;
    }
    b = e.sort;
    c = __mk59();
    b.call(e, c);
  }
  b = e.slice(f.page * PAGE_SIZE, (f.page + 1) * PAGE_SIZE);
  c = b.map.call(b, __mk57(f));
  a = e.length;
  g = Math;
  m = Math.max;
  e = Math.ceil(e.length / PAGE_SIZE);
  return {rows: b, rowStates: c, matched: a, pages: m.call(g, 1, e), open: h, done: j, risk: l, units: k, selected: d, focus: i};
};
  render = function render(n, o) {
  let a, e, b, c, f, g, h, i, j, k, d, l, m;
  a = {};
  e = (function repeat(a, b) {
  repeatSlots(0, a, b);
});
  b = [];
  c = {};
  f = __mk62(b, c);
  g = __mk63(b, c);
  h = __mk64(b, c);
  i = __mk65(b, c);
  j = __mk66(b, c);
  k = __mk67(b, c);
  d = {};
  l = __mk68(d);
  m = __mk70(d);
  c.value = -1;
  d.value = a;
  a.repeat = e;
  a.list = f;
  a.element = g;
  a.text = h;
  a.attr = i;
  a.property = j;
  a.on = k;
  a.button = l;
  a.input = m;
  n(o, a);
  return b;
};
  repeatSlots = {repeatSlots: function(a, b, c) {
  if (a < b) {
    c(a);
    repeatSlots(a + 1, b, c);
  }
}}.repeatSlots;
  t = function reset(state) {
    return initialState({
        size: state.jobs.length
    });
};
  reset = t;
  u = function search(state, event) {
    return {
        ...state,
        query: event.target.value,
        page: 0
    };
};
  search = u;
  selectJob = function selectJob(state, event) {
    return {
        ...state,
        selectedId: +event.currentTarget.getAttribute("data-record")
    };
};
  v = function selectPage(state) {
    const ids = state.view.rows.map(function(job) {
        return job.id;
    });
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return ids.includes(job.id) ? {
                ...job,
                selected: true
            } : job;
        }),
        note: "Visible page selected"
    };
};
  selectPage = v;
  w = function setFilter(state, event) {
    return {
        ...state,
        filter: event.target.value,
        page: 0
    };
};
  setFilter = w;
  x = function setSort(state, event) {
    return {
        ...state,
        sort: event.target.value,
        page: 0
    };
};
  setSort = x;
  statusName = function statusName(a) {
  return a === 0 ? "Queued" : a === 1 ? "In transit" : "Delivered";
};
  y = function togglePriority(b) {
  let a, c;
  a = b.view.focus;
  c = {priority: !a.priority};
  return editJob(b, a.id, c, "Priority updated for RY-" + a.id);
};
  togglePriority = y;
  toggleSelection = function toggleSelection(state, event) {
    return editJob(state, +event.currentTarget.getAttribute("data-record"), {
        selected: event.target.checked
    }, "Selection updated");
};
  z = function unchanged(a) {
  return a;
};
  unchanged = z;
  update = function update(g, d) {
  let h, e, c, f, b, a;
  h = render(g, d.previous);
  e = render(g, d.next);
  c = 0;
  while (c < e.length) {
    f = h[c];
    b = e[c];
    if (b.collection) {
      d.collections.update(d.nodes.collections[c], b.collection.items);
    }
    if (b.tag === null && f.text !== b.text) {
      (d.nodes[c]).nodeValue = b.text;
    }
    a = 0;
    while (a < b.attrs.length) {
      if ((f.attrs[a]).value !== (b.attrs[a]).value) {
        (d.nodes[c]).setAttribute((b.attrs[a]).name, (b.attrs[a]).value);
      }
      a += 1;
    }
    a = 0;
    while (a < b.props.length) {
      if (d.nodes[c][(b.props[a]).name] !== (b.props[a]).value) {
        (d.nodes[c])[(b.props[a]).name] = (b.props[a]).value;
      }
      a += 1;
    }
    c += 1;
  }
};
  a = c.document.createElement("section");
  b.push(a);
  a.setAttribute("data-ui", "relay");
  a.setAttribute("class", "relay");
  c.root.appendChild(a);
  a = c.document.createElement("header");
  b.push(a);
  a.setAttribute("data-ui", "masthead");
  (b[0]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "brand");
  (b[1]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "eyebrow");
  a.setAttribute("class", "eyebrow");
  (b[2]).appendChild(a);
  a = c.document.createTextNode("RELAY / OPERATIONS");
  b.push(a);
  (b[3]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "headline");
  a.setAttribute("class", "headline");
  (b[2]).appendChild(a);
  a = c.document.createTextNode("Dispatch workbench");
  b.push(a);
  (b[5]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "subtitle");
  a.setAttribute("class", "muted");
  (b[2]).appendChild(a);
  a = c.document.createTextNode("" + A);
  b.push(a);
  (b[7]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "feed");
  a.setAttribute("class", "feed-actions");
  (b[1]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "feed-state");
  a.setAttribute("class", "" + B);
  (b[9]).appendChild(a);
  a = c.document.createTextNode("" + C);
  b.push(a);
  (b[10]).appendChild(a);
  a = c.document.createElement("button");
  b.push(a);
  a.setAttribute("data-ui", "advance");
  a.setAttribute("type", "button");
  a["disabled"] = !!D;
  listen(a, "click", j, c.dispatch);
  (b[9]).appendChild(a);
  a = c.document.createTextNode("Advance simulation");
  b.push(a);
  (b[12]).appendChild(a);
  a = c.document.createElement("button");
  b.push(a);
  a.setAttribute("data-ui", "pause");
  a.setAttribute("type", "button");
  a["disabled"] = false;
  listen(a, "click", r, c.dispatch);
  (b[9]).appendChild(a);
  a = c.document.createTextNode("" + E);
  b.push(a);
  (b[14]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "metrics");
  a.setAttribute("class", "metrics");
  (b[0]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "open-metric");
  a.setAttribute("class", "metric cyan");
  (b[16]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "open-title");
  a.setAttribute("class", "metric-label");
  (b[17]).appendChild(a);
  a = c.document.createTextNode("Open consignments");
  b.push(a);
  (b[18]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "open-value");
  a.setAttribute("class", "metric-value");
  (b[17]).appendChild(a);
  a = c.document.createTextNode("" + F);
  b.push(a);
  (b[20]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "open-caption");
  a.setAttribute("class", "muted");
  (b[17]).appendChild(a);
  a = c.document.createTextNode("Awaiting delivery");
  b.push(a);
  (b[22]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "risk-metric");
  a.setAttribute("class", "metric orange");
  (b[16]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "risk-title");
  a.setAttribute("class", "metric-label");
  (b[24]).appendChild(a);
  a = c.document.createTextNode("Needs attention");
  b.push(a);
  (b[25]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "risk-value");
  a.setAttribute("class", "metric-value");
  (b[24]).appendChild(a);
  a = c.document.createTextNode("" + G);
  b.push(a);
  (b[27]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "risk-caption");
  a.setAttribute("class", "muted");
  (b[24]).appendChild(a);
  a = c.document.createTextNode("Priority · not delivered");
  b.push(a);
  (b[29]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "delivered-metric");
  a.setAttribute("class", "metric green");
  (b[16]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "delivered-title");
  a.setAttribute("class", "metric-label");
  (b[31]).appendChild(a);
  a = c.document.createTextNode("Delivered");
  b.push(a);
  (b[32]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "delivered-value");
  a.setAttribute("class", "metric-value");
  (b[31]).appendChild(a);
  a = c.document.createTextNode("" + H);
  b.push(a);
  (b[34]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "delivered-caption");
  a.setAttribute("class", "muted");
  (b[31]).appendChild(a);
  a = c.document.createTextNode("Completed consignments");
  b.push(a);
  (b[36]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "volume-metric");
  a.setAttribute("class", "metric purple");
  (b[16]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "volume-title");
  a.setAttribute("class", "metric-label");
  (b[38]).appendChild(a);
  a = c.document.createTextNode("Units in motion");
  b.push(a);
  (b[39]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "volume-value");
  a.setAttribute("class", "metric-value");
  (b[38]).appendChild(a);
  a = c.document.createTextNode("" + I);
  b.push(a);
  (b[41]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "volume-caption");
  a.setAttribute("class", "muted");
  (b[38]).appendChild(a);
  a = c.document.createTextNode("Across the whole network");
  b.push(a);
  (b[43]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "workspace");
  a.setAttribute("class", "workspace");
  (b[0]).appendChild(a);
  a = c.document.createElement("section");
  b.push(a);
  a.setAttribute("data-ui", "queue-pane");
  a.setAttribute("class", "queue-pane");
  (b[45]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "toolbar");
  a.setAttribute("class", "toolbar");
  (b[46]).appendChild(a);
  a = c.document.createElement("label");
  b.push(a);
  a.setAttribute("data-ui", "search-label");
  (b[47]).appendChild(a);
  a = c.document.createTextNode("Search consignments");
  b.push(a);
  (b[48]).appendChild(a);
  a = c.document.createElement("input");
  b.push(a);
  a.setAttribute("data-ui", "search");
  a.setAttribute("type", "text");
  a["value"] = J;
  listen(a, "input", u, c.dispatch);
  (b[48]).appendChild(a);
  a = c.document.createElement("label");
  b.push(a);
  a.setAttribute("data-ui", "filter-label");
  (b[47]).appendChild(a);
  a = c.document.createTextNode("Status");
  b.push(a);
  (b[51]).appendChild(a);
  a = c.document.createElement("select");
  b.push(a);
  a.setAttribute("data-ui", "filter");
  listen(a, "change", w, c.dispatch);
  (b[51]).appendChild(a);
  a = c.document.createElement("option");
  b.push(a);
  a.setAttribute("data-ui", "filter-0");
  a.setAttribute("value", "all");
  a["selected"] = "all" === f;
  (b[53]).appendChild(a);
  a = c.document.createTextNode("All statuses");
  b.push(a);
  (b[54]).appendChild(a);
  a = c.document.createElement("option");
  b.push(a);
  a.setAttribute("data-ui", "filter-1");
  a.setAttribute("value", "queued");
  a["selected"] = "queued" === f;
  (b[53]).appendChild(a);
  a = c.document.createTextNode("Queued");
  b.push(a);
  (b[56]).appendChild(a);
  a = c.document.createElement("option");
  b.push(a);
  a.setAttribute("data-ui", "filter-2");
  a.setAttribute("value", "transit");
  a["selected"] = "transit" === f;
  (b[53]).appendChild(a);
  a = c.document.createTextNode("In transit");
  b.push(a);
  (b[58]).appendChild(a);
  a = c.document.createElement("option");
  b.push(a);
  a.setAttribute("data-ui", "filter-3");
  a.setAttribute("value", "done");
  a["selected"] = "done" === f;
  (b[53]).appendChild(a);
  a = c.document.createTextNode("Delivered");
  b.push(a);
  (b[60]).appendChild(a);
  a = c.document.createElement("label");
  b.push(a);
  a.setAttribute("data-ui", "sort-label");
  (b[47]).appendChild(a);
  a = c.document.createTextNode("Sort by");
  b.push(a);
  (b[62]).appendChild(a);
  a = c.document.createElement("select");
  b.push(a);
  a.setAttribute("data-ui", "sort");
  listen(a, "change", x, c.dispatch);
  (b[62]).appendChild(a);
  a = c.document.createElement("option");
  b.push(a);
  a.setAttribute("data-ui", "sort-0");
  a.setAttribute("value", "risk");
  a["selected"] = "risk" === h;
  (b[64]).appendChild(a);
  a = c.document.createTextNode("Priority first");
  b.push(a);
  (b[65]).appendChild(a);
  a = c.document.createElement("option");
  b.push(a);
  a.setAttribute("data-ui", "sort-1");
  a.setAttribute("value", "progress");
  a["selected"] = "progress" === h;
  (b[64]).appendChild(a);
  a = c.document.createTextNode("Progress");
  b.push(a);
  (b[67]).appendChild(a);
  a = c.document.createElement("option");
  b.push(a);
  a.setAttribute("data-ui", "sort-2");
  a.setAttribute("value", "customer");
  a["selected"] = "customer" === h;
  (b[64]).appendChild(a);
  a = c.document.createTextNode("Customer");
  b.push(a);
  (b[69]).appendChild(a);
  a = c.document.createElement("label");
  b.push(a);
  a.setAttribute("data-ui", "dataset-label");
  (b[47]).appendChild(a);
  a = c.document.createTextNode("Network size");
  b.push(a);
  (b[71]).appendChild(a);
  a = c.document.createElement("select");
  b.push(a);
  a.setAttribute("data-ui", "dataset");
  listen(a, "change", p, c.dispatch);
  (b[71]).appendChild(a);
  a = c.document.createElement("option");
  b.push(a);
  a.setAttribute("data-ui", "dataset-0");
  a.setAttribute("value", "240");
  a["selected"] = "240" === i;
  (b[73]).appendChild(a);
  a = c.document.createTextNode("240 consignments");
  b.push(a);
  (b[74]).appendChild(a);
  a = c.document.createElement("option");
  b.push(a);
  a.setAttribute("data-ui", "dataset-1");
  a.setAttribute("value", "960");
  a["selected"] = "960" === i;
  (b[73]).appendChild(a);
  a = c.document.createTextNode("960 consignments");
  b.push(a);
  (b[76]).appendChild(a);
  a = c.document.createElement("option");
  b.push(a);
  a.setAttribute("data-ui", "dataset-2");
  a.setAttribute("value", "3840");
  a["selected"] = "3840" === i;
  (b[73]).appendChild(a);
  a = c.document.createTextNode("3,840 consignments");
  b.push(a);
  (b[78]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "bulk");
  a.setAttribute("class", "bulk-toolbar");
  (b[46]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "result-count");
  a.setAttribute("class", "muted");
  (b[80]).appendChild(a);
  a = c.document.createTextNode("" + K);
  b.push(a);
  (b[81]).appendChild(a);
  a = c.document.createElement("button");
  b.push(a);
  a.setAttribute("data-ui", "select-page");
  a.setAttribute("type", "button");
  a["disabled"] = false;
  listen(a, "click", v, c.dispatch);
  (b[80]).appendChild(a);
  a = c.document.createTextNode("Select page");
  b.push(a);
  (b[83]).appendChild(a);
  a = c.document.createElement("button");
  b.push(a);
  a.setAttribute("data-ui", "clear-selection");
  a.setAttribute("type", "button");
  a["disabled"] = !!L;
  listen(a, "click", l, c.dispatch);
  (b[80]).appendChild(a);
  a = c.document.createTextNode("Clear");
  b.push(a);
  (b[85]).appendChild(a);
  a = c.document.createElement("button");
  b.push(a);
  a.setAttribute("data-ui", "bulk-dispatch");
  a.setAttribute("type", "button");
  a["disabled"] = !!M;
  listen(a, "click", o, c.dispatch);
  (b[80]).appendChild(a);
  a = c.document.createTextNode("Dispatch selected");
  b.push(a);
  (b[87]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "queue-heading");
  a.setAttribute("class", "queue-row queue-heading");
  (b[46]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "column-select");
  a.setAttribute("class", "column-label");
  (b[89]).appendChild(a);
  a = c.document.createTextNode("SEL");
  b.push(a);
  (b[90]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "column-job");
  a.setAttribute("class", "column-label");
  (b[89]).appendChild(a);
  a = c.document.createTextNode("CONSIGNMENT / ROUTE");
  b.push(a);
  (b[92]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "column-progress");
  a.setAttribute("class", "column-label");
  (b[89]).appendChild(a);
  a = c.document.createTextNode("PROGRESS");
  b.push(a);
  (b[94]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "column-status");
  a.setAttribute("class", "column-label");
  (b[89]).appendChild(a);
  a = c.document.createTextNode("STATUS");
  b.push(a);
  (b[96]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "queue");
  a.setAttribute("class", "queue");
  (b[46]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "queue-rows");
  b.collections[99] = c.collections.mount(a, N, "job");
  (b[98]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "empty");
  a.setAttribute("class", "empty");
  (b[46]).appendChild(a);
  a = c.document.createTextNode("" + O);
  b.push(a);
  (b[100]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "pagination");
  a.setAttribute("class", "pagination");
  (b[46]).appendChild(a);
  a = c.document.createElement("button");
  b.push(a);
  a.setAttribute("data-ui", "previous");
  a.setAttribute("type", "button");
  a["disabled"] = !!P;
  listen(a, "click", s, c.dispatch);
  (b[102]).appendChild(a);
  a = c.document.createTextNode("← Previous");
  b.push(a);
  (b[103]).appendChild(a);
  a = c.document.createTextNode("" + Q);
  b.push(a);
  (b[102]).appendChild(a);
  a = c.document.createElement("button");
  b.push(a);
  a.setAttribute("data-ui", "next");
  a.setAttribute("type", "button");
  a["disabled"] = !!R;
  listen(a, "click", q, c.dispatch);
  (b[102]).appendChild(a);
  a = c.document.createTextNode("Next →");
  b.push(a);
  (b[106]).appendChild(a);
  a = c.document.createElement("aside");
  b.push(a);
  a.setAttribute("data-ui", "inspector");
  a.setAttribute("class", "inspector");
  (b[45]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "detail-eyebrow");
  a.setAttribute("class", "eyebrow");
  (b[108]).appendChild(a);
  a = c.document.createTextNode("CONSIGNMENT DETAIL");
  b.push(a);
  (b[109]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "detail-name");
  a.setAttribute("class", "detail-name");
  (b[108]).appendChild(a);
  a = c.document.createTextNode("" + S);
  b.push(a);
  (b[111]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "detail-route");
  a.setAttribute("class", "muted");
  (b[108]).appendChild(a);
  a = c.document.createTextNode("" + T);
  b.push(a);
  (b[113]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "detail-status");
  a.setAttribute("class", "detail-status");
  (b[108]).appendChild(a);
  a = c.document.createTextNode("" + g);
  b.push(a);
  (b[115]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "detail-units");
  a.setAttribute("class", "detail-field");
  (b[108]).appendChild(a);
  a = c.document.createTextNode("" + U);
  b.push(a);
  (b[117]).appendChild(a);
  a = c.document.createElement("label");
  b.push(a);
  a.setAttribute("data-ui", "owner-label");
  (b[108]).appendChild(a);
  a = c.document.createTextNode("Assigned operator");
  b.push(a);
  (b[119]).appendChild(a);
  a = c.document.createElement("input");
  b.push(a);
  a.setAttribute("data-ui", "owner");
  a.setAttribute("type", "text");
  a["value"] = V;
  listen(a, "input", k, c.dispatch);
  (b[119]).appendChild(a);
  a = c.document.createElement("button");
  b.push(a);
  a.setAttribute("data-ui", "priority");
  a.setAttribute("type", "button");
  a["disabled"] = false;
  listen(a, "click", y, c.dispatch);
  (b[108]).appendChild(a);
  a = c.document.createTextNode("" + d);
  b.push(a);
  (b[122]).appendChild(a);
  a = c.document.createElement("button");
  b.push(a);
  a.setAttribute("data-ui", "dispatch");
  a.setAttribute("type", "button");
  a["disabled"] = false;
  listen(a, "click", n, c.dispatch);
  (b[108]).appendChild(a);
  a = c.document.createTextNode("Dispatch consignment");
  b.push(a);
  (b[124]).appendChild(a);
  a = c.document.createElement("button");
  b.push(a);
  a.setAttribute("data-ui", "deliver");
  a.setAttribute("type", "button");
  a["disabled"] = false;
  listen(a, "click", m, c.dispatch);
  (b[108]).appendChild(a);
  a = c.document.createTextNode("Mark delivered");
  b.push(a);
  (b[126]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "detail-help");
  a.setAttribute("class", "muted");
  (b[108]).appendChild(a);
  a = c.document.createTextNode(__s1);
  b.push(a);
  (b[128]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "simulation-label");
  a.setAttribute("class", "eyebrow");
  (b[108]).appendChild(a);
  a = c.document.createTextNode("NETWORK SIMULATION");
  b.push(a);
  (b[130]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "simulation-help");
  a.setAttribute("class", "muted");
  (b[108]).appendChild(a);
  a = c.document.createTextNode(__s0);
  b.push(a);
  (b[132]).appendChild(a);
  a = c.document.createElement("button");
  b.push(a);
  a.setAttribute("data-ui", "reset");
  a.setAttribute("type", "button");
  a["disabled"] = false;
  listen(a, "click", t, c.dispatch);
  (b[108]).appendChild(a);
  a = c.document.createTextNode("Reset workspace");
  b.push(a);
  (b[134]).appendChild(a);
  a = c.document.createElement("footer");
  b.push(a);
  a.setAttribute("data-ui", "activity");
  a.setAttribute("class", "activity");
  (b[0]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", "tick");
  a.setAttribute("class", "badge");
  (b[136]).appendChild(a);
  a = c.document.createTextNode("" + W);
  b.push(a);
  (b[137]).appendChild(a);
  a = c.document.createTextNode("" + e);
  b.push(a);
  (b[136]).appendChild(a);
  a = c.document.createElement("button");
  b.push(a);
  a.setAttribute("data-ui", "noop");
  a.setAttribute("type", "button");
  a["disabled"] = false;
  listen(a, "click", z, c.dispatch);
  (b[136]).appendChild(a);
  a = c.document.createTextNode("Render unchanged");
  b.push(a);
  (b[140]).appendChild(a);
  return b;
}

return main;
})(),
update: (() => {
var __s0 = "No consignments match. Try another search or status.";

function __o0() {
  return {value: 0, writable: true, enumerable: true, configurable: true};
}
function __o1() {
  return {value: false, writable: true, enumerable: true, configurable: true};
}

var repeatSlots, render, listen, mount, update, Operations, Label, Metric, Select, Option, JobRow, Inspector, statusName, prepare, project, search, setFilter, setSort, selectJob, editJob, toggleSelection, assignOwner, togglePriority, dispatchOne, deliverOne, selectPage, clearSelection, dispatchSelected, previousPage, nextPage, pause, advance, loadDataset, unchanged, reset, initialState;
let PAGE_SIZE;

var __rf0 = function Inspector(a, c, b) {
  a.element.call(a, "inspector", "aside", __mk1(b, a));
};

function __mk1(b, a) {
  return function() {
    a.attr("class", "inspector");
    Label(a, "detail-eyebrow", "eyebrow", "CONSIGNMENT DETAIL");
    Label(a, "detail-name", "detail-name", b.customer);
    Label(a, "detail-route", "muted", "RY-" + b.id + " · " + b.route);
    Label(a, "detail-status", "detail-status", statusName(b.status) + " · " + b.progress + "% complete");
    Label(a, "detail-units", "detail-field", b.units + " units · " + (b.priority ? "Priority service" : "Standard service"));
    a.element.call(a, "owner-label", "label", __mk2(b, a));
    a.button("priority", b.priority ? "Remove priority" : "Mark priority", togglePriority);
    a.button("dispatch", "Dispatch consignment", dispatchOne);
    a.button("deliver", "Mark delivered", deliverOne);
    Label(a, "detail-help", "muted", "Select a consignment to inspect it. Edit the operator, change priority, or dispatch the whole selected page.");
    Label(a, "simulation-label", "eyebrow", "NETWORK SIMULATION");
    Label(a, "simulation-help", "muted", "Advance moves every in-transit consignment. The feed is deterministic so both implementations can replay exactly the same workload.");
    a.button("reset", "Reset workspace", reset);
  };
}

function __mk2(b, a) {
  return function() {
    a.text("owner-caption", "Assigned operator");
    a.input("owner", b.owner, assignOwner);
  };
}

var __rf3 = function JobRow(d, b) {
  let a, e, c, f, g;
  a = d.job;
  e = d.selectedId;
  c = "job-" + a.id;
  f = a.id;
  g = a.progress;
  b.element.call(b, c, "div", __mk4(c, a, g, f, e, b));
};

function __mk4(b, c, h, d, i, a) {
  return function() {
    let e, f, g;
    a.attr("class", d === i ? "queue-row focused" : "queue-row");
    a.attr("data-record", d);
    a.element.call(a, b + "-check", "input", __mk5(c, d, a));
    a.element.call(a, b + "-open", "button", __mk6(b, c, d, a));
    a.element.call(a, b + "-progress", "div", __mk7(b, h, a));
    e = Label;
    f = c.priority ? "badge warning" : "badge";
    g = statusName(c.status);
    e(a, b + "-status", f, g);
  };
}

function __mk5(c, b, a) {
  return function() {
    a.attr("type", "checkbox");
    a.attr("aria-label", "Select consignment " + b);
    a.attr("data-record", b);
    a.property("checked", c.selected);
    a.on("change", toggleSelection);
  };
}

function __mk6(b, c, d, a) {
  return function() {
    a.attr("type", "button");
    a.attr("class", "job-link");
    a.attr("data-record", d);
    a.on("click", selectJob);
    Label(a, b + "-name", "job-name", c.customer);
    Label(a, b + "-route", "muted", "RY-" + d + " · " + c.route);
  };
}

function __mk7(b, c, a) {
  return function() {
    a.attr("class", "progress-cell");
    a.element.call(a, b + "-track", "div", __mk8(b, c, a));
    a.text(b + "-percent", c + "%");
  };
}

function __mk8(b, c, a) {
  return function() {
    a.attr("class", "progress-track");
    a.element.call(a, b + "-bar", "div", __mk9(c, a));
  };
}

function __mk9(a, b) {
  return function() {
    b.attr("style", "width:" + a + "%");
  };
}

var __rf10 = function Label(a, b, c, d) {
  a.element.call(a, b, "div", __mk11(c, b, a, d));
};

function __mk11(b, c, a, d) {
  return function() {
    a.attr("class", b);
    a.text(c + "-text", d);
  };
}

var __rf12 = function Metric(a, b, c, d, e, f) {
  a.element.call(a, b + "-metric", "div", __mk13(e, f, b, c, a, d));
};

function __mk13(c, d, b, e, a, f) {
  return function() {
    a.attr("class", "metric " + d);
    Label(a, b + "-title", "metric-label", e);
    Label(a, b + "-value", "metric-value", f);
    Label(a, b + "-caption", "muted", c);
  };
}

var __rf14 = function Operations(b, a) {
  let c;
  c = b.view;
  a.element.call(a, "relay", "section", __mk15(c, b, a));
};

function __mk15(c, b, a) {
  return function() {
    a.attr("class", "relay");
    a.element.call(a, "masthead", "header", __mk16(b, a));
    a.element.call(a, "metrics", "div", __mk19(c, a));
    a.element.call(a, "workspace", "div", __mk20(c, b, a));
    a.element.call(a, "activity", "footer", __mk28(b, a));
  };
}

function __mk16(b, a) {
  return function() {
    a.element.call(a, "brand", "div", __mk17(b, a));
    a.element.call(a, "feed", "div", __mk18(b, a));
  };
}

function __mk17(b, a) {
  return function() {
    Label(a, "eyebrow", "eyebrow", "RELAY / OPERATIONS");
    Label(a, "headline", "headline", "Dispatch workbench");
    Label(a, "subtitle", "muted", "North America · " + b.jobs.length + " active consignments");
  };
}

function __mk18(a, b) {
  return function() {
    b.attr("class", "feed-actions");
    Label(b, "feed-state", a.paused ? "badge warning" : "badge live", a.paused ? "FEED PAUSED" : "FEED LIVE");
    b.button("advance", "Advance simulation", advance, a.paused);
    b.button("pause", a.paused ? "Resume" : "Pause", pause);
  };
}

function __mk19(b, a) {
  return function() {
    a.attr("class", "metrics");
    Metric(a, "open", "Open consignments", b.open, "Awaiting delivery", "cyan");
    Metric(a, "risk", "Needs attention", b.risk, "Priority · not delivered", "orange");
    Metric(a, "delivered", "Delivered", b.done, "Completed consignments", "green");
    Metric(a, "volume", "Units in motion", b.units, "Across the whole network", "purple");
  };
}

function __mk20(b, c, a) {
  return function() {
    a.attr("class", "workspace");
    a.element.call(a, "queue-pane", "section", __mk21(b, c, a));
    Inspector(a, c, b.focus);
  };
}

function __mk21(b, c, a) {
  return function() {
    a.attr("class", "queue-pane");
    a.element.call(a, "toolbar", "div", __mk22(c, a));
    a.element.call(a, "bulk", "div", __mk24(b, a));
    a.element.call(a, "queue-heading", "div", __mk25(a));
    a.element.call(a, "queue", "div", __mk26(b, a));
    Label(a, "empty", "empty", b.matched === 0 ? __s0 : "");
    a.element.call(a, "pagination", "div", __mk27(b, c, a));
  };
}

function __mk22(b, a) {
  return function() {
    a.attr("class", "toolbar");
    a.element.call(a, "search-label", "label", __mk23(b, a));
    Select(a, "filter", "Status", b.filter, setFilter, ["all", "queued", "transit", "done"], ["All statuses", "Queued", "In transit", "Delivered"]);
    Select(a, "sort", "Sort by", b.sort, setSort, ["risk", "progress", "customer"], ["Priority first", "Progress", "Customer"]);
    Select(a, "dataset", "Network size", "" + b.jobs.length, loadDataset, ["240", "960", "3840"], ["240 consignments", "960 consignments", "3,840 consignments"]);
  };
}

function __mk23(b, a) {
  return function() {
    a.text("search-caption", "Search consignments");
    a.input("search", b.query, search);
  };
}

function __mk24(b, a) {
  return function() {
    a.attr("class", "bulk-toolbar");
    Label(a, "result-count", "muted", b.matched + " results · " + b.selected + " selected");
    a.button("select-page", "Select page", selectPage);
    a.button("clear-selection", "Clear", clearSelection, b.selected === 0);
    a.button("bulk-dispatch", "Dispatch selected", dispatchSelected, b.selected === 0);
  };
}

function __mk25(a) {
  return function() {
    a.attr("class", "queue-row queue-heading");
    Label(a, "column-select", "column-label", "SEL");
    Label(a, "column-job", "column-label", "CONSIGNMENT / ROUTE");
    Label(a, "column-progress", "column-label", "PROGRESS");
    Label(a, "column-status", "column-label", "STATUS");
  };
}

function __mk26(b, a) {
  return function() {
    a.attr("class", "queue");
    a.list("queue-rows", b.rowStates, "job");
  };
}

function __mk27(c, b, a) {
  return function() {
    a.attr("class", "pagination");
    a.button("previous", "← Previous", previousPage, b.page === 0);
    a.text("page", "Page " + (b.page + 1) + " / " + c.pages);
    a.button("next", "Next →", nextPage, b.page >= c.pages - 1);
  };
}

function __mk28(b, a) {
  return function() {
    a.attr("class", "activity");
    Label(a, "tick", "badge", "TICK " + b.tick);
    a.text("activity-text", b.note);
    a.button("noop", "Render unchanged", unchanged);
  };
}

var __rf29 = function Option(a, b, c, d, e) {
  a.element.call(a, b, "option", __mk30(e, b, d, a, c));
};

function __mk30(c, d, e, a, b) {
  return function() {
    a.attr("value", b);
    a.property("selected", b === c);
    a.text(d + "-text", e);
  };
}

var __rf31 = function Select(a, b, c, d, e, f, g) {
  a.element.call(a, b + "-label", "label", __mk32(e, b, c, g, a, d, f));
};

function __mk32(c, b, d, e, a, f, g) {
  return function() {
    a.text(b + "-caption", d);
    a.element.call(a, b, "select", __mk33(c, b, e, a, f, g));
  };
}

function __mk33(c, d, e, a, f, b) {
  return function() {
    a.on("change", c);
    a.repeat.call(a, b.length, __mk34(d, e, a, f, b));
  };
}

function __mk34(b, c, d, e, f) {
  return function(a) {
    Option(d, b + "-" + a, f[a], c[a], e);
  };
}

var __rf35 = function advance(state) {
    if (state.paused) return state;
    return {
        ...state,
        tick: state.tick + 1,
        note: "Network advanced · all in-transit consignments updated",
        jobs: state.jobs.map(function(job) {
            if (job.status !== 1) return job;
            const progress = Math.min(100, job.progress + 7);
            return {
                ...job,
                progress: progress,
                status: progress === 100 ? 2 : 1
            };
        })
    };
};

var __rf37 = function assignOwner(a, c) {
  let b;
  b = {owner: c.target.value};
  return editJob(a, a.selectedId, b, "Operator assignment updated");
};

var __rf38 = function clearSelection(state) {
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return job.selected ? {
                ...job,
                selected: false
            } : job;
        }),
        note: "Selection cleared"
    };
};

var __rf40 = function deliverOne(a) {
  return editJob(a, a.selectedId, {status: 2, progress: 100}, "Delivery confirmed");
};

var __rf41 = function dispatchOne(a) {
  return editJob(a, a.selectedId, {status: 1, progress: 5}, "Consignment dispatched");
};

var __rf42 = function dispatchSelected(state) {
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return job.selected ? {
                ...job,
                status: 1,
                progress: 5,
                selected: false
            } : job;
        }),
        note: "Selected consignments dispatched"
    };
};

var __rf44 = function editJob(state, id, patch, note) {
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return job.id === id ? {
                ...job,
                ...patch
            } : job;
        }),
        note: note
    };
};

var __rf46 = function initialState(j) {
  let c, d, e, g, f, a, b, h, i;
  c = Math;
  d = Math.max;
  e = Math.min(10000, j.size | 0);
  c = d.call(c, 1, e);
  d = ["Northstar Labs", "Aperture Health", "Juniper Goods", "Orbit Devices", "Cedar & Co", "Meridian Supply", "Atlas Robotics", "Ember Coffee"];
  e = ["SEA → PDX", "LAX → SFO", "NYC → BOS", "DEN → AUS", "CHI → MSP", "ATL → MIA"];
  g = ["Avery", "Morgan", "Jordan", "Riley"];
  f = [];
  a = 0;
  while (a < c) {
    f.push;
    b = d[a % 8];
    h = e[a % 6];
    i = g[a % 4];
    b = {id: a + 1, customer: b, route: h, owner: i, status: a % 5 === 0 ? 2 : a % 3 === 0 ? 1 : 0, progress: (a % 5 === 0 ? 2 : a % 3 === 0 ? 1 : 0) === 2 ? 100 : (a % 5 === 0 ? 2 : a % 3 === 0 ? 1 : 0) === 1 ? a * 13 % 85 : 0, priority: a % 7 === 0, units: 4 + a * 17 % 96, selected: false};
    f.push(b);
    a += 1;
  }
  b = {jobs: f, query: "", filter: "all", sort: "risk", page: 0, selectedId: 1, paused: false, tick: 0, note: "Morning dispatch ready. Select a consignment to get started."};
  return b;
};

var __rf47 = function listen(a, b, c, d) {
  a.addEventListener.call(a, b, __mk48(c, d));
};

function __mk48(a, b) {
  return function(c) {
    b(a, c);
  };
}

var __rf49 = function loadDataset(c, b) {
  let a;
  a = {size: b.target.value - 0};
  return initialState(a);
};

var __rf50 = function mount(h, d) {
  let g, e, f, a, c, b;
  g = render(h, d.state);
  e = [];
  e.collections = [];
  f = 0;
  while (f < g.length) {
    a: {
      a = g[f];
      if (a.tag === null) {
        c = d.document.createTextNode(a.text);
        break a;
      }
      c = d.document.createElement(a.tag);
    }
    e.push(c);
    if (a.tag !== null) {
      c.setAttribute("data-ui", a.id);
    }
    b = 0;
    while (b < a.attrs.length) {
      c.setAttribute((a.attrs[b]).name, (a.attrs[b]).value);
      b += 1;
    }
    b = 0;
    while (b < a.props.length) {
      c[(a.props[b]).name] = (a.props[b]).value;
      b += 1;
    }
    b = 0;
    while (b < a.events.length) {
      listen(c, (a.events[b]).type, (a.events[b]).action, d.dispatch);
      b += 1;
    }
    if (a.collection) {
      e.collections[f] = d.collections.mount(c, a.collection.items, a.collection.component);
    }
    b: {
      if (a.parent === -1) {
        d.root.appendChild(c);
        break b;
      }
      (e[a.parent]).appendChild(c);
    }
    f += 1;
  }
  return e;
};

var __rf51 = function nextPage(state) {
    return {
        ...state,
        page: Math.min(state.view.pages - 1, state.page + 1)
    };
};

var __rf52 = function pause(state) {
    return {
        ...state,
        paused: !state.paused
    };
};

var __rf53 = function prepare(state) {
    const view = project(state);
    const page = Math.min(state.page, view.pages - 1);
    if (page !== state.page) {
        const next = {
            ...state,
            page: page
        };
        return {
            ...next,
            view: project(next)
        };
    }
    return {
        ...state,
        view: view
    };
};

var __rf54 = function previousPage(state) {
    return {
        ...state,
        page: Math.max(0, state.page - 1)
    };
};

var __rf55 = function project(f) {
  let b, i, e, h, j, l, k, d, c, a, g, m;
  b = f.query.toLowerCase();
  i = f.jobs[0];
  e = [];
  h = 0;
  j = 0;
  l = 0;
  k = 0;
  d = 0;
  c = 0;
  while (c < f.jobs.length) {
    a: {
      b: {
        a = f.jobs[c];
        if (a.status === 2) {
          j += 1;
          break b;
        }
        k += a.units;
        if (a.priority) {
          l += 1;
          h += 1;
          break b;
        }
        h += 1;
        g = a.selected;
        g = g ? d + 1 : d;
        break a;
      }
      g = a.selected;
      g = g ? d + 1 : d;
    }
    m = a.id === f.selectedId;
    d = f.filter === "all" || f.filter === "queued" && a.status === 0 || f.filter === "transit" && a.status === 1 || f.filter === "done" && a.status === 2;
    if (d) {
      d = (a.customer + " " + a.route + " " + a.id + " " + a.owner).toLowerCase();
      d = d.includes(b);
    }
    if (d) {
      e.push(a);
    }
    d = g;
    i = m ? a : i;
    c += 1;
  }
  c: {
    b = f.sort === "customer";
    if (b) {
      b = e.sort;
      c = __mk56();
      b.call(e, c);
      break c;
    }
    b = f.sort === "progress";
    if (b) {
      b = e.sort;
      c = __mk58();
      b.call(e, c);
      break c;
    }
    b = e.sort;
    c = __mk59();
    b.call(e, c);
  }
  b = e.slice(f.page * PAGE_SIZE, (f.page + 1) * PAGE_SIZE);
  c = b.map.call(b, __mk57(f));
  a = e.length;
  g = Math;
  m = Math.max;
  e = Math.ceil(e.length / PAGE_SIZE);
  return {rows: b, rowStates: c, matched: a, pages: m.call(g, 1, e), open: h, done: j, risk: l, units: k, selected: d, focus: i};
};

function __mk56() {
  return function(a, b) {
    return a.customer < b.customer ? -1 : a.customer > b.customer ? 1 : a.id - b.id;
  };
}

function __mk57(b) {
  return function(a) {
    return {key: a.id, job: a, selectedId: b.selectedId};
  };
}

function __mk58() {
  return function(a, b) {
    return a.progress - b.progress || a.id - b.id;
  };
}

function __mk59() {
  return function(a, b) {
    return (b.priority ? 1 : 0) - (a.priority ? 1 : 0) || a.id - b.id;
  };
}

var __rf60 = function render(n, o) {
  let a, e, b, c, f, g, h, i, j, k, d, l, m;
  a = {};
  e = (function repeat(a, b) {
  repeatSlots(0, a, b);
});
  b = [];
  c = {};
  f = __mk62(b, c);
  g = __mk63(b, c);
  h = __mk64(b, c);
  i = __mk65(b, c);
  j = __mk66(b, c);
  k = __mk67(b, c);
  d = {};
  l = __mk68(d);
  m = __mk70(d);
  c.value = -1;
  d.value = a;
  a.repeat = e;
  a.list = f;
  a.element = g;
  a.text = h;
  a.attr = i;
  a.property = j;
  a.on = k;
  a.button = l;
  a.input = m;
  n(o, a);
  return b;
};

function __mk62(a, c) {
  return function list(d, e, f) {
    let b;
    a.push;
    b = {id: d, tag: "div", parent: c.value, text: null, attrs: [], props: [], events: [], collection: {items: e, component: f}};
    a.push(b);
  };
}

function __mk63(c, a) {
  return function element(e, f, g) {
    let d, b;
    d = c.length;
    c.push;
    b = {id: e, tag: f, parent: a.value, text: null, attrs: [], props: [], events: [], collection: null};
    c.push(b);
    b = a.value;
    a.value;
    a.value = d;
    g();
    a.value = b;
  };
}

function __mk64(a, b) {
  return function text(id, value) {
    a.push({
        id: id,
        tag: null,
        parent: b.value,
        text: "" + value,
        attrs: [],
        props: [],
        events: [],
        collection: null
    });
};
}

function __mk65(a, b) {
  return function attr(name, value) {
    a[b.value].attrs.push({
        name: name,
        value: "" + value
    });
};
}

function __mk66(a, b) {
  return function property(name, value) {
    a[b.value].props.push({
        name: name,
        value: value
    });
};
}

function __mk67(a, b) {
  return function on(type, action) {
    a[b.value].events.push({
        type: type,
        action: action
    });
};
}

function __mk68(a) {
  return function button(b, c, d, e) {
    a.value.element.call(a.value, b, "button", __mk69(d, e, b, c, a));
  };
}

function __mk69(b, c, d, e, a) {
  return function() {
    a.value.attr("type", "button");
    a.value.property("disabled", !!c);
    a.value.on("click", b);
    a.value.text(d + "-text", e);
  };
}

function __mk70(a) {
  return function input(b, c, d) {
    a.value.element.call(a.value, b, "input", __mk71(d, a, c));
  };
}

function __mk71(b, a, c) {
  return function() {
    a.value.attr("type", "text");
    a.value.property("value", c);
    a.value.on("input", b);
  };
}

var __rf72 = {repeatSlots: function(a, b, c) {
  if (a < b) {
    c(a);
    repeatSlots(a + 1, b, c);
  }
}}.repeatSlots;

var __rf73 = function reset(state) {
    return initialState({
        size: state.jobs.length
    });
};

var __rf74 = function search(state, event) {
    return {
        ...state,
        query: event.target.value,
        page: 0
    };
};

var __rf75 = function selectJob(state, event) {
    return {
        ...state,
        selectedId: +event.currentTarget.getAttribute("data-record")
    };
};

var __rf76 = function selectPage(state) {
    const ids = state.view.rows.map(function(job) {
        return job.id;
    });
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return ids.includes(job.id) ? {
                ...job,
                selected: true
            } : job;
        }),
        note: "Visible page selected"
    };
};

var __rf79 = function setFilter(state, event) {
    return {
        ...state,
        filter: event.target.value,
        page: 0
    };
};

var __rf80 = function setSort(state, event) {
    return {
        ...state,
        sort: event.target.value,
        page: 0
    };
};

var __rf81 = function statusName(a) {
  return a === 0 ? "Queued" : a === 1 ? "In transit" : "Delivered";
};

var __rf82 = function togglePriority(b) {
  let a, c;
  a = b.view.focus;
  c = {priority: !a.priority};
  return editJob(b, a.id, c, "Priority updated for RY-" + a.id);
};

var __rf83 = function toggleSelection(state, event) {
    return editJob(state, +event.currentTarget.getAttribute("data-record"), {
        selected: event.target.checked
    }, "Selection updated");
};

var __rf84 = function unchanged(a) {
  return a;
};

var __rf85 = function update(g, d) {
  let h, e, c, f, b, a;
  h = render(g, d.previous);
  e = render(g, d.next);
  c = 0;
  while (c < e.length) {
    f = h[c];
    b = e[c];
    if (b.collection) {
      d.collections.update(d.nodes.collections[c], b.collection.items);
    }
    if (b.tag === null && f.text !== b.text) {
      (d.nodes[c]).nodeValue = b.text;
    }
    a = 0;
    while (a < b.attrs.length) {
      if ((f.attrs[a]).value !== (b.attrs[a]).value) {
        (d.nodes[c]).setAttribute((b.attrs[a]).name, (b.attrs[a]).value);
      }
      a += 1;
    }
    a = 0;
    while (a < b.props.length) {
      if (d.nodes[c][(b.props[a]).name] !== (b.props[a]).value) {
        (d.nodes[c])[(b.props[a]).name] = (b.props[a]).value;
      }
      a += 1;
    }
    c += 1;
  }
};

function main(a) {
  let c, b, e, l, m, n, o, p, q, r, s, t, u, v, w, g, x, y, z, A, d, j, k, ao, ah, ap, aq, ar, as, at, ai, f, h, i, au, aj, ak, av, aw, al, ax, am, ay, az, aA, an, aB, aC, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z, aa, ab, ac, ad, ae, af, ag;
  c = a.previous;
  b = c.view;
  e = "North America · " + c.jobs.length + " active consignments";
  l = c.paused ? "badge warning" : "badge live";
  m = c.paused ? "FEED PAUSED" : "FEED LIVE";
  c.paused;
  n = c.paused ? "Resume" : "Pause";
  o = b.open;
  p = b.risk;
  q = b.done;
  r = b.units;
  c.query;
  c.filter;
  c.sort;
  "" + c.jobs.length;
  s = b.matched + " results · " + b.selected + " selected";
  b.selected === 0;
  b.selected === 0;
  b.rowStates;
  t = b.matched === 0 ? __s0 : "";
  c.page === 0;
  u = "Page " + (c.page + 1) + " / " + b.pages;
  c.page >= b.pages - 1;
  b = b.focus;
  v = b.customer;
  w = "RY-" + b.id + " · " + b.route;
  g = b.status;
  x = (g === 0 ? "Queued" : g === 1 ? "In transit" : "Delivered") + " · " + b.progress + "% complete";
  y = b.units + " units · " + (b.priority ? "Priority service" : "Standard service");
  b.owner;
  z = b.priority ? "Remove priority" : "Mark priority";
  A = "TICK " + c.tick;
  c = c.note;
  d = a.next;
  b = d.view;
  j = "" + e;
  e = "North America · " + d.jobs.length + " active consignments";
  k = "" + l;
  l = d.paused ? "badge warning" : "badge live";
  ao = "" + m;
  m = d.paused ? "FEED PAUSED" : "FEED LIVE";
  ah = d.paused;
  ap = "" + n;
  n = d.paused ? "Resume" : "Pause";
  aq = "" + o;
  o = b.open;
  ar = "" + p;
  p = b.risk;
  as = "" + q;
  q = b.done;
  at = "" + r;
  r = b.units;
  ai = d.query;
  f = d.filter;
  h = d.sort;
  i = "" + d.jobs.length;
  au = "" + s;
  s = b.matched + " results · " + b.selected + " selected";
  aj = b.selected === 0;
  ak = b.selected === 0;
  av = b.rowStates;
  aw = "" + t;
  t = b.matched === 0 ? __s0 : "";
  al = d.page === 0;
  ax = "" + u;
  u = "Page " + (d.page + 1) + " / " + b.pages;
  am = d.page >= b.pages - 1;
  b = b.focus;
  ay = "" + v;
  v = b.customer;
  az = "" + w;
  w = "RY-" + b.id + " · " + b.route;
  g = b.status;
  aA = "" + x;
  x = (g === 0 ? "Queued" : g === 1 ? "In transit" : "Delivered") + " · " + b.progress + "% complete";
  g = "" + y;
  y = b.units + " units · " + (b.priority ? "Priority service" : "Standard service");
  an = b.owner;
  aB = "" + z;
  z = b.priority ? "Remove priority" : "Mark priority";
  b = "" + A;
  A = "TICK " + d.tick;
  aC = "" + c;
  c = d.note;
  if (j !== "" + e) {
    (a.nodes[8]).nodeValue = "" + e;
  }
  a: {
    if (k !== "" + l) {
      I = __rf0;
      Inspector = I;
      H = __rf3;
      JobRow = H;
      D = __rf10;
      Label = D;
      E = __rf12;
      Metric = E;
      C = __rf14;
      Operations = C;
      G = __rf29;
      Option = G;
      PAGE_SIZE = 24;
      F = __rf31;
      Select = F;
      ac = __rf35;
      advance = ac;
      S = __rf37;
      assignOwner = S;
      X = __rf38;
      clearSelection = X;
      V = __rf40;
      deliverOne = V;
      U = __rf41;
      dispatchOne = U;
      Y = __rf42;
      dispatchSelected = Y;
      Q = __rf44;
      editJob = Q;
      ag = __rf46;
      initialState = ag;
      j = __rf47;
      listen = j;
      ad = __rf49;
      loadDataset = ad;
      k = __rf50;
      mount = k;
      aa = __rf51;
      nextPage = aa;
      ab = __rf52;
      pause = ab;
      K = __rf53;
      prepare = K;
      Z = __rf54;
      previousPage = Z;
      L = __rf55;
      project = L;
      d = __rf60;
      render = d;
      e = __rf72;
      repeatSlots = e;
      af = __rf73;
      reset = af;
      M = __rf74;
      search = M;
      P = __rf75;
      selectJob = P;
      W = __rf76;
      selectPage = W;
      N = __rf79;
      setFilter = N;
      O = __rf80;
      setSort = O;
      J = __rf81;
      statusName = J;
      T = __rf82;
      togglePriority = T;
      R = __rf83;
      toggleSelection = R;
      ae = __rf84;
      unchanged = ae;
      B = __rf85;
      update = B;
      (a.nodes[10]).setAttribute("class", "" + l);
      break a;
    }
    e = __rf72;
    d = __rf60;
    j = __rf47;
    k = __rf50;
    B = __rf85;
    C = __rf14;
    D = __rf10;
    E = __rf12;
    F = __rf31;
    G = __rf29;
    H = __rf3;
    I = __rf0;
    J = __rf81;
    K = __rf53;
    L = __rf55;
    M = __rf74;
    N = __rf79;
    O = __rf80;
    P = __rf75;
    Q = __rf44;
    R = __rf83;
    S = __rf37;
    T = __rf82;
    U = __rf41;
    V = __rf40;
    W = __rf76;
    X = __rf38;
    Y = __rf42;
    Z = __rf54;
    aa = __rf51;
    ab = __rf52;
    ac = __rf35;
    ad = __rf49;
    ae = __rf84;
    af = __rf73;
    ag = __rf46;
    Inspector = I;
    JobRow = H;
    Label = D;
    Metric = E;
    Operations = C;
    Option = G;
    PAGE_SIZE = 24;
    Select = F;
    advance = ac;
    assignOwner = S;
    clearSelection = X;
    deliverOne = V;
    dispatchOne = U;
    dispatchSelected = Y;
    editJob = Q;
    initialState = ag;
    listen = j;
    loadDataset = ad;
    mount = k;
    nextPage = aa;
    pause = ab;
    prepare = K;
    previousPage = Z;
    project = L;
    render = d;
    repeatSlots = e;
    reset = af;
    search = M;
    selectJob = P;
    selectPage = W;
    setFilter = N;
    setSort = O;
    statusName = J;
    togglePriority = T;
    toggleSelection = R;
    unchanged = ae;
    update = B;
  }
  if (ao !== "" + m) {
    (a.nodes[11]).nodeValue = "" + m;
  }
  if (a.nodes[12]["disabled"] !== !!ah) {
    (a.nodes[12])["disabled"] = !!ah;
  }
  if (a.nodes[14]["disabled"] !== false) {
    (a.nodes[14])["disabled"] = false;
  }
  if (ap !== "" + n) {
    (a.nodes[15]).nodeValue = "" + n;
  }
  if (aq !== "" + o) {
    (a.nodes[21]).nodeValue = "" + o;
  }
  if (ar !== "" + p) {
    (a.nodes[28]).nodeValue = "" + p;
  }
  if (as !== "" + q) {
    (a.nodes[35]).nodeValue = "" + q;
  }
  if (at !== "" + r) {
    (a.nodes[42]).nodeValue = "" + r;
  }
  if (a.nodes[50]["value"] !== ai) {
    (a.nodes[50])["value"] = ai;
  }
  if (a.nodes[54]["selected"] !== ("all" === f)) {
    (a.nodes[54])["selected"] = "all" === f;
  }
  if (a.nodes[56]["selected"] !== ("queued" === f)) {
    (a.nodes[56])["selected"] = "queued" === f;
  }
  if (a.nodes[58]["selected"] !== ("transit" === f)) {
    (a.nodes[58])["selected"] = "transit" === f;
  }
  if (a.nodes[60]["selected"] !== ("done" === f)) {
    (a.nodes[60])["selected"] = "done" === f;
  }
  if (a.nodes[65]["selected"] !== ("risk" === h)) {
    (a.nodes[65])["selected"] = "risk" === h;
  }
  if (a.nodes[67]["selected"] !== ("progress" === h)) {
    (a.nodes[67])["selected"] = "progress" === h;
  }
  if (a.nodes[69]["selected"] !== ("customer" === h)) {
    (a.nodes[69])["selected"] = "customer" === h;
  }
  if (a.nodes[74]["selected"] !== ("240" === i)) {
    (a.nodes[74])["selected"] = "240" === i;
  }
  if (a.nodes[76]["selected"] !== ("960" === i)) {
    (a.nodes[76])["selected"] = "960" === i;
  }
  if (a.nodes[78]["selected"] !== ("3840" === i)) {
    (a.nodes[78])["selected"] = "3840" === i;
  }
  if (au !== "" + s) {
    (a.nodes[82]).nodeValue = "" + s;
  }
  if (a.nodes[83]["disabled"] !== false) {
    (a.nodes[83])["disabled"] = false;
  }
  if (a.nodes[85]["disabled"] !== !!aj) {
    (a.nodes[85])["disabled"] = !!aj;
  }
  if (a.nodes[87]["disabled"] !== !!ak) {
    (a.nodes[87])["disabled"] = !!ak;
  }
  a.collections.update(a.nodes.collections[99], av);
  if (aw !== "" + t) {
    (a.nodes[101]).nodeValue = "" + t;
  }
  if (a.nodes[103]["disabled"] !== !!al) {
    (a.nodes[103])["disabled"] = !!al;
  }
  if (ax !== "" + u) {
    (a.nodes[105]).nodeValue = "" + u;
  }
  if (a.nodes[106]["disabled"] !== !!am) {
    (a.nodes[106])["disabled"] = !!am;
  }
  if (ay !== "" + v) {
    (a.nodes[112]).nodeValue = "" + v;
  }
  if (az !== "" + w) {
    (a.nodes[114]).nodeValue = "" + w;
  }
  if (aA !== "" + x) {
    (a.nodes[116]).nodeValue = "" + x;
  }
  if (g !== "" + y) {
    (a.nodes[118]).nodeValue = "" + y;
  }
  if (a.nodes[121]["value"] !== an) {
    (a.nodes[121])["value"] = an;
  }
  if (a.nodes[122]["disabled"] !== false) {
    (a.nodes[122])["disabled"] = false;
  }
  if (aB !== "" + z) {
    (a.nodes[123]).nodeValue = "" + z;
  }
  if (a.nodes[124]["disabled"] !== false) {
    (a.nodes[124])["disabled"] = false;
  }
  if (a.nodes[126]["disabled"] !== false) {
    (a.nodes[126])["disabled"] = false;
  }
  if (a.nodes[134]["disabled"] !== false) {
    (a.nodes[134])["disabled"] = false;
  }
  if (b !== "" + A) {
    (a.nodes[138]).nodeValue = "" + A;
  }
  if (aC !== "" + c) {
    (a.nodes[139]).nodeValue = "" + c;
  }
  if (a.nodes[140]["disabled"] !== false) {
    (a.nodes[140])["disabled"] = false;
  }
}

return main;
})(),
initial: (() => {
var __s0 = "Morning dispatch ready. Select a consignment to get started.";

function __o0() {
  return {value: 0, writable: true, enumerable: true, configurable: true};
}
function __o1() {
  return {value: false, writable: true, enumerable: true, configurable: true};
}

var repeatSlots, render, listen, mount, update, Operations, Label, Metric, Select, Option, JobRow, Inspector, statusName, prepare, project, search, setFilter, setSort, selectJob, editJob, toggleSelection, assignOwner, togglePriority, dispatchOne, deliverOne, selectPage, clearSelection, dispatchSelected, previousPage, nextPage, pause, advance, loadDataset, unchanged, reset, initialState;
let PAGE_SIZE;

function __mk1(b, a) {
  return function() {
    a.attr("class", "inspector");
    Label(a, "detail-eyebrow", "eyebrow", "CONSIGNMENT DETAIL");
    Label(a, "detail-name", "detail-name", b.customer);
    Label(a, "detail-route", "muted", "RY-" + b.id + " · " + b.route);
    Label(a, "detail-status", "detail-status", statusName(b.status) + " · " + b.progress + "% complete");
    Label(a, "detail-units", "detail-field", b.units + " units · " + (b.priority ? "Priority service" : "Standard service"));
    a.element.call(a, "owner-label", "label", __mk2(b, a));
    a.button("priority", b.priority ? "Remove priority" : "Mark priority", togglePriority);
    a.button("dispatch", "Dispatch consignment", dispatchOne);
    a.button("deliver", "Mark delivered", deliverOne);
    Label(a, "detail-help", "muted", "Select a consignment to inspect it. Edit the operator, change priority, or dispatch the whole selected page.");
    Label(a, "simulation-label", "eyebrow", "NETWORK SIMULATION");
    Label(a, "simulation-help", "muted", "Advance moves every in-transit consignment. The feed is deterministic so both implementations can replay exactly the same workload.");
    a.button("reset", "Reset workspace", reset);
  };
}

function __mk2(b, a) {
  return function() {
    a.text("owner-caption", "Assigned operator");
    a.input("owner", b.owner, assignOwner);
  };
}

function __mk4(b, c, h, d, i, a) {
  return function() {
    let e, f, g;
    a.attr("class", d === i ? "queue-row focused" : "queue-row");
    a.attr("data-record", d);
    a.element.call(a, b + "-check", "input", __mk5(c, d, a));
    a.element.call(a, b + "-open", "button", __mk6(b, c, d, a));
    a.element.call(a, b + "-progress", "div", __mk7(b, h, a));
    e = Label;
    f = c.priority ? "badge warning" : "badge";
    g = statusName(c.status);
    e(a, b + "-status", f, g);
  };
}

function __mk5(c, b, a) {
  return function() {
    a.attr("type", "checkbox");
    a.attr("aria-label", "Select consignment " + b);
    a.attr("data-record", b);
    a.property("checked", c.selected);
    a.on("change", toggleSelection);
  };
}

function __mk6(b, c, d, a) {
  return function() {
    a.attr("type", "button");
    a.attr("class", "job-link");
    a.attr("data-record", d);
    a.on("click", selectJob);
    Label(a, b + "-name", "job-name", c.customer);
    Label(a, b + "-route", "muted", "RY-" + d + " · " + c.route);
  };
}

function __mk7(b, c, a) {
  return function() {
    a.attr("class", "progress-cell");
    a.element.call(a, b + "-track", "div", __mk8(b, c, a));
    a.text(b + "-percent", c + "%");
  };
}

function __mk8(b, c, a) {
  return function() {
    a.attr("class", "progress-track");
    a.element.call(a, b + "-bar", "div", __mk9(c, a));
  };
}

function __mk9(a, b) {
  return function() {
    b.attr("style", "width:" + a + "%");
  };
}

function __mk11(b, c, a, d) {
  return function() {
    a.attr("class", b);
    a.text(c + "-text", d);
  };
}

function __mk13(c, d, b, e, a, f) {
  return function() {
    a.attr("class", "metric " + d);
    Label(a, b + "-title", "metric-label", e);
    Label(a, b + "-value", "metric-value", f);
    Label(a, b + "-caption", "muted", c);
  };
}

function __mk15(c, b, a) {
  return function() {
    a.attr("class", "relay");
    a.element.call(a, "masthead", "header", __mk16(b, a));
    a.element.call(a, "metrics", "div", __mk19(c, a));
    a.element.call(a, "workspace", "div", __mk20(c, b, a));
    a.element.call(a, "activity", "footer", __mk28(b, a));
  };
}

function __mk16(b, a) {
  return function() {
    a.element.call(a, "brand", "div", __mk17(b, a));
    a.element.call(a, "feed", "div", __mk18(b, a));
  };
}

function __mk17(b, a) {
  return function() {
    Label(a, "eyebrow", "eyebrow", "RELAY / OPERATIONS");
    Label(a, "headline", "headline", "Dispatch workbench");
    Label(a, "subtitle", "muted", "North America · " + b.jobs.length + " active consignments");
  };
}

function __mk18(a, b) {
  return function() {
    b.attr("class", "feed-actions");
    Label(b, "feed-state", a.paused ? "badge warning" : "badge live", a.paused ? "FEED PAUSED" : "FEED LIVE");
    b.button("advance", "Advance simulation", advance, a.paused);
    b.button("pause", a.paused ? "Resume" : "Pause", pause);
  };
}

function __mk19(b, a) {
  return function() {
    a.attr("class", "metrics");
    Metric(a, "open", "Open consignments", b.open, "Awaiting delivery", "cyan");
    Metric(a, "risk", "Needs attention", b.risk, "Priority · not delivered", "orange");
    Metric(a, "delivered", "Delivered", b.done, "Completed consignments", "green");
    Metric(a, "volume", "Units in motion", b.units, "Across the whole network", "purple");
  };
}

function __mk20(b, c, a) {
  return function() {
    a.attr("class", "workspace");
    a.element.call(a, "queue-pane", "section", __mk21(b, c, a));
    Inspector(a, c, b.focus);
  };
}

function __mk21(b, c, a) {
  return function() {
    a.attr("class", "queue-pane");
    a.element.call(a, "toolbar", "div", __mk22(c, a));
    a.element.call(a, "bulk", "div", __mk24(b, a));
    a.element.call(a, "queue-heading", "div", __mk25(a));
    a.element.call(a, "queue", "div", __mk26(b, a));
    Label(a, "empty", "empty", b.matched === 0 ? "No consignments match. Try another search or status." : "");
    a.element.call(a, "pagination", "div", __mk27(b, c, a));
  };
}

function __mk22(b, a) {
  return function() {
    a.attr("class", "toolbar");
    a.element.call(a, "search-label", "label", __mk23(b, a));
    Select(a, "filter", "Status", b.filter, setFilter, ["all", "queued", "transit", "done"], ["All statuses", "Queued", "In transit", "Delivered"]);
    Select(a, "sort", "Sort by", b.sort, setSort, ["risk", "progress", "customer"], ["Priority first", "Progress", "Customer"]);
    Select(a, "dataset", "Network size", "" + b.jobs.length, loadDataset, ["240", "960", "3840"], ["240 consignments", "960 consignments", "3,840 consignments"]);
  };
}

function __mk23(b, a) {
  return function() {
    a.text("search-caption", "Search consignments");
    a.input("search", b.query, search);
  };
}

function __mk24(b, a) {
  return function() {
    a.attr("class", "bulk-toolbar");
    Label(a, "result-count", "muted", b.matched + " results · " + b.selected + " selected");
    a.button("select-page", "Select page", selectPage);
    a.button("clear-selection", "Clear", clearSelection, b.selected === 0);
    a.button("bulk-dispatch", "Dispatch selected", dispatchSelected, b.selected === 0);
  };
}

function __mk25(a) {
  return function() {
    a.attr("class", "queue-row queue-heading");
    Label(a, "column-select", "column-label", "SEL");
    Label(a, "column-job", "column-label", "CONSIGNMENT / ROUTE");
    Label(a, "column-progress", "column-label", "PROGRESS");
    Label(a, "column-status", "column-label", "STATUS");
  };
}

function __mk26(b, a) {
  return function() {
    a.attr("class", "queue");
    a.list("queue-rows", b.rowStates, "job");
  };
}

function __mk27(c, b, a) {
  return function() {
    a.attr("class", "pagination");
    a.button("previous", "← Previous", previousPage, b.page === 0);
    a.text("page", "Page " + (b.page + 1) + " / " + c.pages);
    a.button("next", "Next →", nextPage, b.page >= c.pages - 1);
  };
}

function __mk28(b, a) {
  return function() {
    a.attr("class", "activity");
    Label(a, "tick", "badge", "TICK " + b.tick);
    a.text("activity-text", b.note);
    a.button("noop", "Render unchanged", unchanged);
  };
}

function __mk30(c, d, e, a, b) {
  return function() {
    a.attr("value", b);
    a.property("selected", b === c);
    a.text(d + "-text", e);
  };
}

function __mk32(c, b, d, e, a, f, g) {
  return function() {
    a.text(b + "-caption", d);
    a.element.call(a, b, "select", __mk33(c, b, e, a, f, g));
  };
}

function __mk33(c, d, e, a, f, b) {
  return function() {
    a.on("change", c);
    a.repeat.call(a, b.length, __mk34(d, e, a, f, b));
  };
}

function __mk34(b, c, d, e, f) {
  return function(a) {
    Option(d, b + "-" + a, f[a], c[a], e);
  };
}

function __mk48(a, b) {
  return function(c) {
    b(a, c);
  };
}

function __mk56() {
  return function(a, b) {
    return a.customer < b.customer ? -1 : a.customer > b.customer ? 1 : a.id - b.id;
  };
}

function __mk57(b) {
  return function(a) {
    return {key: a.id, job: a, selectedId: b.selectedId};
  };
}

function __mk58() {
  return function(a, b) {
    return a.progress - b.progress || a.id - b.id;
  };
}

function __mk59() {
  return function(a, b) {
    return (b.priority ? 1 : 0) - (a.priority ? 1 : 0) || a.id - b.id;
  };
}

function __mk62(a, c) {
  return function list(d, e, f) {
    let b;
    a.push;
    b = {id: d, tag: "div", parent: c.value, text: null, attrs: [], props: [], events: [], collection: {items: e, component: f}};
    a.push(b);
  };
}

function __mk63(c, a) {
  return function element(e, f, g) {
    let d, b;
    d = c.length;
    c.push;
    b = {id: e, tag: f, parent: a.value, text: null, attrs: [], props: [], events: [], collection: null};
    c.push(b);
    b = a.value;
    a.value;
    a.value = d;
    g();
    a.value = b;
  };
}

function __mk64(a, b) {
  return function text(id, value) {
    a.push({
        id: id,
        tag: null,
        parent: b.value,
        text: "" + value,
        attrs: [],
        props: [],
        events: [],
        collection: null
    });
};
}

function __mk65(a, b) {
  return function attr(name, value) {
    a[b.value].attrs.push({
        name: name,
        value: "" + value
    });
};
}

function __mk66(a, b) {
  return function property(name, value) {
    a[b.value].props.push({
        name: name,
        value: value
    });
};
}

function __mk67(a, b) {
  return function on(type, action) {
    a[b.value].events.push({
        type: type,
        action: action
    });
};
}

function __mk68(a) {
  return function button(b, c, d, e) {
    a.value.element.call(a.value, b, "button", __mk69(d, e, b, c, a));
  };
}

function __mk69(b, c, d, e, a) {
  return function() {
    a.value.attr("type", "button");
    a.value.property("disabled", !!c);
    a.value.on("click", b);
    a.value.text(d + "-text", e);
  };
}

function __mk70(a) {
  return function input(b, c, d) {
    a.value.element.call(a.value, b, "input", __mk71(d, a, c));
  };
}

function __mk71(b, a, c) {
  return function() {
    a.value.attr("type", "text");
    a.value.property("value", c);
    a.value.on("input", b);
  };
}

function main(g) {
  let c, d, e, h, f, a, b, i, j;
  c = Math;
  d = Math.max;
  Inspector = function Inspector(a, c, b) {
  a.element.call(a, "inspector", "aside", __mk1(b, a));
};
  JobRow = function JobRow(d, b) {
  let a, e, c, f, g;
  a = d.job;
  e = d.selectedId;
  c = "job-" + a.id;
  f = a.id;
  g = a.progress;
  b.element.call(b, c, "div", __mk4(c, a, g, f, e, b));
};
  Label = function Label(a, b, c, d) {
  a.element.call(a, b, "div", __mk11(c, b, a, d));
};
  Metric = function Metric(a, b, c, d, e, f) {
  a.element.call(a, b + "-metric", "div", __mk13(e, f, b, c, a, d));
};
  Operations = function Operations(b, a) {
  let c;
  c = b.view;
  a.element.call(a, "relay", "section", __mk15(c, b, a));
};
  Option = function Option(a, b, c, d, e) {
  a.element.call(a, b, "option", __mk30(e, b, d, a, c));
};
  PAGE_SIZE = 24;
  Select = function Select(a, b, c, d, e, f, g) {
  a.element.call(a, b + "-label", "label", __mk32(e, b, c, g, a, d, f));
};
  advance = function advance(state) {
    if (state.paused) return state;
    return {
        ...state,
        tick: state.tick + 1,
        note: "Network advanced · all in-transit consignments updated",
        jobs: state.jobs.map(function(job) {
            if (job.status !== 1) return job;
            const progress = Math.min(100, job.progress + 7);
            return {
                ...job,
                progress: progress,
                status: progress === 100 ? 2 : 1
            };
        })
    };
};
  assignOwner = function assignOwner(a, c) {
  let b;
  b = {owner: c.target.value};
  return editJob(a, a.selectedId, b, "Operator assignment updated");
};
  clearSelection = function clearSelection(state) {
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return job.selected ? {
                ...job,
                selected: false
            } : job;
        }),
        note: "Selection cleared"
    };
};
  deliverOne = function deliverOne(a) {
  return editJob(a, a.selectedId, {status: 2, progress: 100}, "Delivery confirmed");
};
  dispatchOne = function dispatchOne(a) {
  return editJob(a, a.selectedId, {status: 1, progress: 5}, "Consignment dispatched");
};
  dispatchSelected = function dispatchSelected(state) {
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return job.selected ? {
                ...job,
                status: 1,
                progress: 5,
                selected: false
            } : job;
        }),
        note: "Selected consignments dispatched"
    };
};
  editJob = function editJob(state, id, patch, note) {
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return job.id === id ? {
                ...job,
                ...patch
            } : job;
        }),
        note: note
    };
};
  initialState = function initialState(j) {
  let c, d, e, g, f, a, b, h, i;
  c = Math;
  d = Math.max;
  e = Math.min(10000, j.size | 0);
  c = d.call(c, 1, e);
  d = ["Northstar Labs", "Aperture Health", "Juniper Goods", "Orbit Devices", "Cedar & Co", "Meridian Supply", "Atlas Robotics", "Ember Coffee"];
  e = ["SEA → PDX", "LAX → SFO", "NYC → BOS", "DEN → AUS", "CHI → MSP", "ATL → MIA"];
  g = ["Avery", "Morgan", "Jordan", "Riley"];
  f = [];
  a = 0;
  while (a < c) {
    f.push;
    b = d[a % 8];
    h = e[a % 6];
    i = g[a % 4];
    b = {id: a + 1, customer: b, route: h, owner: i, status: a % 5 === 0 ? 2 : a % 3 === 0 ? 1 : 0, progress: (a % 5 === 0 ? 2 : a % 3 === 0 ? 1 : 0) === 2 ? 100 : (a % 5 === 0 ? 2 : a % 3 === 0 ? 1 : 0) === 1 ? a * 13 % 85 : 0, priority: a % 7 === 0, units: 4 + a * 17 % 96, selected: false};
    f.push(b);
    a += 1;
  }
  b = {jobs: f, query: "", filter: "all", sort: "risk", page: 0, selectedId: 1, paused: false, tick: 0, note: __s0};
  return b;
};
  listen = function listen(a, b, c, d) {
  a.addEventListener.call(a, b, __mk48(c, d));
};
  loadDataset = function loadDataset(c, b) {
  let a;
  a = {size: b.target.value - 0};
  return initialState(a);
};
  mount = function mount(h, d) {
  let g, e, f, a, c, b;
  g = render(h, d.state);
  e = [];
  e.collections = [];
  f = 0;
  while (f < g.length) {
    a: {
      a = g[f];
      if (a.tag === null) {
        c = d.document.createTextNode(a.text);
        break a;
      }
      c = d.document.createElement(a.tag);
    }
    e.push(c);
    if (a.tag !== null) {
      c.setAttribute("data-ui", a.id);
    }
    b = 0;
    while (b < a.attrs.length) {
      c.setAttribute((a.attrs[b]).name, (a.attrs[b]).value);
      b += 1;
    }
    b = 0;
    while (b < a.props.length) {
      c[(a.props[b]).name] = (a.props[b]).value;
      b += 1;
    }
    b = 0;
    while (b < a.events.length) {
      listen(c, (a.events[b]).type, (a.events[b]).action, d.dispatch);
      b += 1;
    }
    if (a.collection) {
      e.collections[f] = d.collections.mount(c, a.collection.items, a.collection.component);
    }
    b: {
      if (a.parent === -1) {
        d.root.appendChild(c);
        break b;
      }
      (e[a.parent]).appendChild(c);
    }
    f += 1;
  }
  return e;
};
  nextPage = function nextPage(state) {
    return {
        ...state,
        page: Math.min(state.view.pages - 1, state.page + 1)
    };
};
  pause = function pause(state) {
    return {
        ...state,
        paused: !state.paused
    };
};
  prepare = function prepare(state) {
    const view = project(state);
    const page = Math.min(state.page, view.pages - 1);
    if (page !== state.page) {
        const next = {
            ...state,
            page: page
        };
        return {
            ...next,
            view: project(next)
        };
    }
    return {
        ...state,
        view: view
    };
};
  previousPage = function previousPage(state) {
    return {
        ...state,
        page: Math.max(0, state.page - 1)
    };
};
  project = function project(f) {
  let b, i, e, h, j, l, k, d, c, a, g, m;
  b = f.query.toLowerCase();
  i = f.jobs[0];
  e = [];
  h = 0;
  j = 0;
  l = 0;
  k = 0;
  d = 0;
  c = 0;
  while (c < f.jobs.length) {
    a: {
      b: {
        a = f.jobs[c];
        if (a.status === 2) {
          j += 1;
          break b;
        }
        k += a.units;
        if (a.priority) {
          l += 1;
          h += 1;
          break b;
        }
        h += 1;
        g = a.selected;
        g = g ? d + 1 : d;
        break a;
      }
      g = a.selected;
      g = g ? d + 1 : d;
    }
    m = a.id === f.selectedId;
    d = f.filter === "all" || f.filter === "queued" && a.status === 0 || f.filter === "transit" && a.status === 1 || f.filter === "done" && a.status === 2;
    if (d) {
      d = (a.customer + " " + a.route + " " + a.id + " " + a.owner).toLowerCase();
      d = d.includes(b);
    }
    if (d) {
      e.push(a);
    }
    d = g;
    i = m ? a : i;
    c += 1;
  }
  c: {
    b = f.sort === "customer";
    if (b) {
      b = e.sort;
      c = __mk56();
      b.call(e, c);
      break c;
    }
    b = f.sort === "progress";
    if (b) {
      b = e.sort;
      c = __mk58();
      b.call(e, c);
      break c;
    }
    b = e.sort;
    c = __mk59();
    b.call(e, c);
  }
  b = e.slice(f.page * PAGE_SIZE, (f.page + 1) * PAGE_SIZE);
  c = b.map.call(b, __mk57(f));
  a = e.length;
  g = Math;
  m = Math.max;
  e = Math.ceil(e.length / PAGE_SIZE);
  return {rows: b, rowStates: c, matched: a, pages: m.call(g, 1, e), open: h, done: j, risk: l, units: k, selected: d, focus: i};
};
  render = function render(n, o) {
  let a, e, b, c, f, g, h, i, j, k, d, l, m;
  a = {};
  e = (function repeat(a, b) {
  repeatSlots(0, a, b);
});
  b = [];
  c = {};
  f = __mk62(b, c);
  g = __mk63(b, c);
  h = __mk64(b, c);
  i = __mk65(b, c);
  j = __mk66(b, c);
  k = __mk67(b, c);
  d = {};
  l = __mk68(d);
  m = __mk70(d);
  c.value = -1;
  d.value = a;
  a.repeat = e;
  a.list = f;
  a.element = g;
  a.text = h;
  a.attr = i;
  a.property = j;
  a.on = k;
  a.button = l;
  a.input = m;
  n(o, a);
  return b;
};
  repeatSlots = {repeatSlots: function(a, b, c) {
  if (a < b) {
    c(a);
    repeatSlots(a + 1, b, c);
  }
}}.repeatSlots;
  reset = function reset(state) {
    return initialState({
        size: state.jobs.length
    });
};
  search = function search(state, event) {
    return {
        ...state,
        query: event.target.value,
        page: 0
    };
};
  selectJob = function selectJob(state, event) {
    return {
        ...state,
        selectedId: +event.currentTarget.getAttribute("data-record")
    };
};
  selectPage = function selectPage(state) {
    const ids = state.view.rows.map(function(job) {
        return job.id;
    });
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return ids.includes(job.id) ? {
                ...job,
                selected: true
            } : job;
        }),
        note: "Visible page selected"
    };
};
  setFilter = function setFilter(state, event) {
    return {
        ...state,
        filter: event.target.value,
        page: 0
    };
};
  setSort = function setSort(state, event) {
    return {
        ...state,
        sort: event.target.value,
        page: 0
    };
};
  statusName = function statusName(a) {
  return a === 0 ? "Queued" : a === 1 ? "In transit" : "Delivered";
};
  togglePriority = function togglePriority(b) {
  let a, c;
  a = b.view.focus;
  c = {priority: !a.priority};
  return editJob(b, a.id, c, "Priority updated for RY-" + a.id);
};
  toggleSelection = function toggleSelection(state, event) {
    return editJob(state, +event.currentTarget.getAttribute("data-record"), {
        selected: event.target.checked
    }, "Selection updated");
};
  unchanged = function unchanged(a) {
  return a;
};
  update = function update(g, d) {
  let h, e, c, f, b, a;
  h = render(g, d.previous);
  e = render(g, d.next);
  c = 0;
  while (c < e.length) {
    f = h[c];
    b = e[c];
    if (b.collection) {
      d.collections.update(d.nodes.collections[c], b.collection.items);
    }
    if (b.tag === null && f.text !== b.text) {
      (d.nodes[c]).nodeValue = b.text;
    }
    a = 0;
    while (a < b.attrs.length) {
      if ((f.attrs[a]).value !== (b.attrs[a]).value) {
        (d.nodes[c]).setAttribute((b.attrs[a]).name, (b.attrs[a]).value);
      }
      a += 1;
    }
    a = 0;
    while (a < b.props.length) {
      if (d.nodes[c][(b.props[a]).name] !== (b.props[a]).value) {
        (d.nodes[c])[(b.props[a]).name] = (b.props[a]).value;
      }
      a += 1;
    }
    c += 1;
  }
};
  e = Math.min(10000, g.size | 0);
  c = d.call(c, 1, e);
  d = ["Northstar Labs", "Aperture Health", "Juniper Goods", "Orbit Devices", "Cedar & Co", "Meridian Supply", "Atlas Robotics", "Ember Coffee"];
  e = ["SEA → PDX", "LAX → SFO", "NYC → BOS", "DEN → AUS", "CHI → MSP", "ATL → MIA"];
  h = ["Avery", "Morgan", "Jordan", "Riley"];
  f = [];
  a = 0;
  while (a < c) {
    f.push;
    b = d[a % 8];
    i = e[a % 6];
    j = h[a % 4];
    b = {id: a + 1, customer: b, route: i, owner: j, status: a % 5 === 0 ? 2 : a % 3 === 0 ? 1 : 0, progress: (a % 5 === 0 ? 2 : a % 3 === 0 ? 1 : 0) === 2 ? 100 : (a % 5 === 0 ? 2 : a % 3 === 0 ? 1 : 0) === 1 ? a * 13 % 85 : 0, priority: a % 7 === 0, units: 4 + a * 17 % 96, selected: false};
    f.push(b);
    a += 1;
  }
  b = {jobs: f, query: "", filter: "all", sort: "risk", page: 0, selectedId: 1, paused: false, tick: 0, note: __s0};
  return b;
}

return main;
})(),
prepare: (() => {
function __o0() {
  return {value: 0, writable: true, enumerable: true, configurable: true};
}
function __o1() {
  return {value: false, writable: true, enumerable: true, configurable: true};
}

var repeatSlots, render, listen, mount, update, Operations, Label, Metric, Select, Option, JobRow, Inspector, statusName, prepare, project, search, setFilter, setSort, selectJob, editJob, toggleSelection, assignOwner, togglePriority, dispatchOne, deliverOne, selectPage, clearSelection, dispatchSelected, previousPage, nextPage, pause, advance, loadDataset, unchanged, reset, initialState;
let PAGE_SIZE;

function __mk1(b, a) {
  return function() {
    a.attr("class", "inspector");
    Label(a, "detail-eyebrow", "eyebrow", "CONSIGNMENT DETAIL");
    Label(a, "detail-name", "detail-name", b.customer);
    Label(a, "detail-route", "muted", "RY-" + b.id + " · " + b.route);
    Label(a, "detail-status", "detail-status", statusName(b.status) + " · " + b.progress + "% complete");
    Label(a, "detail-units", "detail-field", b.units + " units · " + (b.priority ? "Priority service" : "Standard service"));
    a.element.call(a, "owner-label", "label", __mk2(b, a));
    a.button("priority", b.priority ? "Remove priority" : "Mark priority", togglePriority);
    a.button("dispatch", "Dispatch consignment", dispatchOne);
    a.button("deliver", "Mark delivered", deliverOne);
    Label(a, "detail-help", "muted", "Select a consignment to inspect it. Edit the operator, change priority, or dispatch the whole selected page.");
    Label(a, "simulation-label", "eyebrow", "NETWORK SIMULATION");
    Label(a, "simulation-help", "muted", "Advance moves every in-transit consignment. The feed is deterministic so both implementations can replay exactly the same workload.");
    a.button("reset", "Reset workspace", reset);
  };
}

function __mk2(b, a) {
  return function() {
    a.text("owner-caption", "Assigned operator");
    a.input("owner", b.owner, assignOwner);
  };
}

function __mk4(b, c, h, d, i, a) {
  return function() {
    let e, f, g;
    a.attr("class", d === i ? "queue-row focused" : "queue-row");
    a.attr("data-record", d);
    a.element.call(a, b + "-check", "input", __mk5(c, d, a));
    a.element.call(a, b + "-open", "button", __mk6(b, c, d, a));
    a.element.call(a, b + "-progress", "div", __mk7(b, h, a));
    e = Label;
    f = c.priority ? "badge warning" : "badge";
    g = statusName(c.status);
    e(a, b + "-status", f, g);
  };
}

function __mk5(c, b, a) {
  return function() {
    a.attr("type", "checkbox");
    a.attr("aria-label", "Select consignment " + b);
    a.attr("data-record", b);
    a.property("checked", c.selected);
    a.on("change", toggleSelection);
  };
}

function __mk6(b, c, d, a) {
  return function() {
    a.attr("type", "button");
    a.attr("class", "job-link");
    a.attr("data-record", d);
    a.on("click", selectJob);
    Label(a, b + "-name", "job-name", c.customer);
    Label(a, b + "-route", "muted", "RY-" + d + " · " + c.route);
  };
}

function __mk7(b, c, a) {
  return function() {
    a.attr("class", "progress-cell");
    a.element.call(a, b + "-track", "div", __mk8(b, c, a));
    a.text(b + "-percent", c + "%");
  };
}

function __mk8(b, c, a) {
  return function() {
    a.attr("class", "progress-track");
    a.element.call(a, b + "-bar", "div", __mk9(c, a));
  };
}

function __mk9(a, b) {
  return function() {
    b.attr("style", "width:" + a + "%");
  };
}

function __mk11(b, c, a, d) {
  return function() {
    a.attr("class", b);
    a.text(c + "-text", d);
  };
}

function __mk13(c, d, b, e, a, f) {
  return function() {
    a.attr("class", "metric " + d);
    Label(a, b + "-title", "metric-label", e);
    Label(a, b + "-value", "metric-value", f);
    Label(a, b + "-caption", "muted", c);
  };
}

function __mk15(c, b, a) {
  return function() {
    a.attr("class", "relay");
    a.element.call(a, "masthead", "header", __mk16(b, a));
    a.element.call(a, "metrics", "div", __mk19(c, a));
    a.element.call(a, "workspace", "div", __mk20(c, b, a));
    a.element.call(a, "activity", "footer", __mk28(b, a));
  };
}

function __mk16(b, a) {
  return function() {
    a.element.call(a, "brand", "div", __mk17(b, a));
    a.element.call(a, "feed", "div", __mk18(b, a));
  };
}

function __mk17(b, a) {
  return function() {
    Label(a, "eyebrow", "eyebrow", "RELAY / OPERATIONS");
    Label(a, "headline", "headline", "Dispatch workbench");
    Label(a, "subtitle", "muted", "North America · " + b.jobs.length + " active consignments");
  };
}

function __mk18(a, b) {
  return function() {
    b.attr("class", "feed-actions");
    Label(b, "feed-state", a.paused ? "badge warning" : "badge live", a.paused ? "FEED PAUSED" : "FEED LIVE");
    b.button("advance", "Advance simulation", advance, a.paused);
    b.button("pause", a.paused ? "Resume" : "Pause", pause);
  };
}

function __mk19(b, a) {
  return function() {
    a.attr("class", "metrics");
    Metric(a, "open", "Open consignments", b.open, "Awaiting delivery", "cyan");
    Metric(a, "risk", "Needs attention", b.risk, "Priority · not delivered", "orange");
    Metric(a, "delivered", "Delivered", b.done, "Completed consignments", "green");
    Metric(a, "volume", "Units in motion", b.units, "Across the whole network", "purple");
  };
}

function __mk20(b, c, a) {
  return function() {
    a.attr("class", "workspace");
    a.element.call(a, "queue-pane", "section", __mk21(b, c, a));
    Inspector(a, c, b.focus);
  };
}

function __mk21(b, c, a) {
  return function() {
    a.attr("class", "queue-pane");
    a.element.call(a, "toolbar", "div", __mk22(c, a));
    a.element.call(a, "bulk", "div", __mk24(b, a));
    a.element.call(a, "queue-heading", "div", __mk25(a));
    a.element.call(a, "queue", "div", __mk26(b, a));
    Label(a, "empty", "empty", b.matched === 0 ? "No consignments match. Try another search or status." : "");
    a.element.call(a, "pagination", "div", __mk27(b, c, a));
  };
}

function __mk22(b, a) {
  return function() {
    a.attr("class", "toolbar");
    a.element.call(a, "search-label", "label", __mk23(b, a));
    Select(a, "filter", "Status", b.filter, setFilter, ["all", "queued", "transit", "done"], ["All statuses", "Queued", "In transit", "Delivered"]);
    Select(a, "sort", "Sort by", b.sort, setSort, ["risk", "progress", "customer"], ["Priority first", "Progress", "Customer"]);
    Select(a, "dataset", "Network size", "" + b.jobs.length, loadDataset, ["240", "960", "3840"], ["240 consignments", "960 consignments", "3,840 consignments"]);
  };
}

function __mk23(b, a) {
  return function() {
    a.text("search-caption", "Search consignments");
    a.input("search", b.query, search);
  };
}

function __mk24(b, a) {
  return function() {
    a.attr("class", "bulk-toolbar");
    Label(a, "result-count", "muted", b.matched + " results · " + b.selected + " selected");
    a.button("select-page", "Select page", selectPage);
    a.button("clear-selection", "Clear", clearSelection, b.selected === 0);
    a.button("bulk-dispatch", "Dispatch selected", dispatchSelected, b.selected === 0);
  };
}

function __mk25(a) {
  return function() {
    a.attr("class", "queue-row queue-heading");
    Label(a, "column-select", "column-label", "SEL");
    Label(a, "column-job", "column-label", "CONSIGNMENT / ROUTE");
    Label(a, "column-progress", "column-label", "PROGRESS");
    Label(a, "column-status", "column-label", "STATUS");
  };
}

function __mk26(b, a) {
  return function() {
    a.attr("class", "queue");
    a.list("queue-rows", b.rowStates, "job");
  };
}

function __mk27(c, b, a) {
  return function() {
    a.attr("class", "pagination");
    a.button("previous", "← Previous", previousPage, b.page === 0);
    a.text("page", "Page " + (b.page + 1) + " / " + c.pages);
    a.button("next", "Next →", nextPage, b.page >= c.pages - 1);
  };
}

function __mk28(b, a) {
  return function() {
    a.attr("class", "activity");
    Label(a, "tick", "badge", "TICK " + b.tick);
    a.text("activity-text", b.note);
    a.button("noop", "Render unchanged", unchanged);
  };
}

function __mk30(c, d, e, a, b) {
  return function() {
    a.attr("value", b);
    a.property("selected", b === c);
    a.text(d + "-text", e);
  };
}

function __mk32(c, b, d, e, a, f, g) {
  return function() {
    a.text(b + "-caption", d);
    a.element.call(a, b, "select", __mk33(c, b, e, a, f, g));
  };
}

function __mk33(c, d, e, a, f, b) {
  return function() {
    a.on("change", c);
    a.repeat.call(a, b.length, __mk34(d, e, a, f, b));
  };
}

function __mk34(b, c, d, e, f) {
  return function(a) {
    Option(d, b + "-" + a, f[a], c[a], e);
  };
}

function __mk48(a, b) {
  return function(c) {
    b(a, c);
  };
}

function __mk56() {
  return function(a, b) {
    return a.customer < b.customer ? -1 : a.customer > b.customer ? 1 : a.id - b.id;
  };
}

function __mk57(b) {
  return function(a) {
    return {key: a.id, job: a, selectedId: b.selectedId};
  };
}

function __mk58() {
  return function(a, b) {
    return a.progress - b.progress || a.id - b.id;
  };
}

function __mk59() {
  return function(a, b) {
    return (b.priority ? 1 : 0) - (a.priority ? 1 : 0) || a.id - b.id;
  };
}

function __mk62(a, c) {
  return function list(d, e, f) {
    let b;
    a.push;
    b = {id: d, tag: "div", parent: c.value, text: null, attrs: [], props: [], events: [], collection: {items: e, component: f}};
    a.push(b);
  };
}

function __mk63(c, a) {
  return function element(e, f, g) {
    let d, b;
    d = c.length;
    c.push;
    b = {id: e, tag: f, parent: a.value, text: null, attrs: [], props: [], events: [], collection: null};
    c.push(b);
    b = a.value;
    a.value;
    a.value = d;
    g();
    a.value = b;
  };
}

function __mk64(a, b) {
  return function text(id, value) {
    a.push({
        id: id,
        tag: null,
        parent: b.value,
        text: "" + value,
        attrs: [],
        props: [],
        events: [],
        collection: null
    });
};
}

function __mk65(a, b) {
  return function attr(name, value) {
    a[b.value].attrs.push({
        name: name,
        value: "" + value
    });
};
}

function __mk66(a, b) {
  return function property(name, value) {
    a[b.value].props.push({
        name: name,
        value: value
    });
};
}

function __mk67(a, b) {
  return function on(type, action) {
    a[b.value].events.push({
        type: type,
        action: action
    });
};
}

function __mk68(a) {
  return function button(b, c, d, e) {
    a.value.element.call(a.value, b, "button", __mk69(d, e, b, c, a));
  };
}

function __mk69(b, c, d, e, a) {
  return function() {
    a.value.attr("type", "button");
    a.value.property("disabled", !!c);
    a.value.on("click", b);
    a.value.text(d + "-text", e);
  };
}

function __mk70(a) {
  return function input(b, c, d) {
    a.value.element.call(a.value, b, "input", __mk71(d, a, c));
  };
}

function __mk71(b, a, c) {
  return function() {
    a.value.attr("type", "text");
    a.value.property("value", c);
    a.value.on("input", b);
  };
}

function main(a) {
  let c, j, d, k, l, m, n, g, e, b, f, h, i;
  Inspector = function Inspector(a, c, b) {
  a.element.call(a, "inspector", "aside", __mk1(b, a));
};
  JobRow = function JobRow(d, b) {
  let a, e, c, f, g;
  a = d.job;
  e = d.selectedId;
  c = "job-" + a.id;
  f = a.id;
  g = a.progress;
  b.element.call(b, c, "div", __mk4(c, a, g, f, e, b));
};
  Label = function Label(a, b, c, d) {
  a.element.call(a, b, "div", __mk11(c, b, a, d));
};
  Metric = function Metric(a, b, c, d, e, f) {
  a.element.call(a, b + "-metric", "div", __mk13(e, f, b, c, a, d));
};
  Operations = function Operations(b, a) {
  let c;
  c = b.view;
  a.element.call(a, "relay", "section", __mk15(c, b, a));
};
  Option = function Option(a, b, c, d, e) {
  a.element.call(a, b, "option", __mk30(e, b, d, a, c));
};
  PAGE_SIZE = 24;
  Select = function Select(a, b, c, d, e, f, g) {
  a.element.call(a, b + "-label", "label", __mk32(e, b, c, g, a, d, f));
};
  advance = function advance(state) {
    if (state.paused) return state;
    return {
        ...state,
        tick: state.tick + 1,
        note: "Network advanced · all in-transit consignments updated",
        jobs: state.jobs.map(function(job) {
            if (job.status !== 1) return job;
            const progress = Math.min(100, job.progress + 7);
            return {
                ...job,
                progress: progress,
                status: progress === 100 ? 2 : 1
            };
        })
    };
};
  assignOwner = function assignOwner(a, c) {
  let b;
  b = {owner: c.target.value};
  return editJob(a, a.selectedId, b, "Operator assignment updated");
};
  clearSelection = function clearSelection(state) {
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return job.selected ? {
                ...job,
                selected: false
            } : job;
        }),
        note: "Selection cleared"
    };
};
  deliverOne = function deliverOne(a) {
  return editJob(a, a.selectedId, {status: 2, progress: 100}, "Delivery confirmed");
};
  dispatchOne = function dispatchOne(a) {
  return editJob(a, a.selectedId, {status: 1, progress: 5}, "Consignment dispatched");
};
  dispatchSelected = function dispatchSelected(state) {
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return job.selected ? {
                ...job,
                status: 1,
                progress: 5,
                selected: false
            } : job;
        }),
        note: "Selected consignments dispatched"
    };
};
  editJob = function editJob(state, id, patch, note) {
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return job.id === id ? {
                ...job,
                ...patch
            } : job;
        }),
        note: note
    };
};
  initialState = function initialState(j) {
  let c, d, e, g, f, a, b, h, i;
  c = Math;
  d = Math.max;
  e = Math.min(10000, j.size | 0);
  c = d.call(c, 1, e);
  d = ["Northstar Labs", "Aperture Health", "Juniper Goods", "Orbit Devices", "Cedar & Co", "Meridian Supply", "Atlas Robotics", "Ember Coffee"];
  e = ["SEA → PDX", "LAX → SFO", "NYC → BOS", "DEN → AUS", "CHI → MSP", "ATL → MIA"];
  g = ["Avery", "Morgan", "Jordan", "Riley"];
  f = [];
  a = 0;
  while (a < c) {
    f.push;
    b = d[a % 8];
    h = e[a % 6];
    i = g[a % 4];
    b = {id: a + 1, customer: b, route: h, owner: i, status: a % 5 === 0 ? 2 : a % 3 === 0 ? 1 : 0, progress: (a % 5 === 0 ? 2 : a % 3 === 0 ? 1 : 0) === 2 ? 100 : (a % 5 === 0 ? 2 : a % 3 === 0 ? 1 : 0) === 1 ? a * 13 % 85 : 0, priority: a % 7 === 0, units: 4 + a * 17 % 96, selected: false};
    f.push(b);
    a += 1;
  }
  b = {jobs: f, query: "", filter: "all", sort: "risk", page: 0, selectedId: 1, paused: false, tick: 0, note: "Morning dispatch ready. Select a consignment to get started."};
  return b;
};
  listen = function listen(a, b, c, d) {
  a.addEventListener.call(a, b, __mk48(c, d));
};
  loadDataset = function loadDataset(c, b) {
  let a;
  a = {size: b.target.value - 0};
  return initialState(a);
};
  mount = function mount(h, d) {
  let g, e, f, a, c, b;
  g = render(h, d.state);
  e = [];
  e.collections = [];
  f = 0;
  while (f < g.length) {
    a: {
      a = g[f];
      if (a.tag === null) {
        c = d.document.createTextNode(a.text);
        break a;
      }
      c = d.document.createElement(a.tag);
    }
    e.push(c);
    if (a.tag !== null) {
      c.setAttribute("data-ui", a.id);
    }
    b = 0;
    while (b < a.attrs.length) {
      c.setAttribute((a.attrs[b]).name, (a.attrs[b]).value);
      b += 1;
    }
    b = 0;
    while (b < a.props.length) {
      c[(a.props[b]).name] = (a.props[b]).value;
      b += 1;
    }
    b = 0;
    while (b < a.events.length) {
      listen(c, (a.events[b]).type, (a.events[b]).action, d.dispatch);
      b += 1;
    }
    if (a.collection) {
      e.collections[f] = d.collections.mount(c, a.collection.items, a.collection.component);
    }
    b: {
      if (a.parent === -1) {
        d.root.appendChild(c);
        break b;
      }
      (e[a.parent]).appendChild(c);
    }
    f += 1;
  }
  return e;
};
  nextPage = function nextPage(state) {
    return {
        ...state,
        page: Math.min(state.view.pages - 1, state.page + 1)
    };
};
  pause = function pause(state) {
    return {
        ...state,
        paused: !state.paused
    };
};
  prepare = function prepare(state) {
    const view = project(state);
    const page = Math.min(state.page, view.pages - 1);
    if (page !== state.page) {
        const next = {
            ...state,
            page: page
        };
        return {
            ...next,
            view: project(next)
        };
    }
    return {
        ...state,
        view: view
    };
};
  previousPage = function previousPage(state) {
    return {
        ...state,
        page: Math.max(0, state.page - 1)
    };
};
  project = function project(f) {
  let b, i, e, h, j, l, k, d, c, a, g, m;
  b = f.query.toLowerCase();
  i = f.jobs[0];
  e = [];
  h = 0;
  j = 0;
  l = 0;
  k = 0;
  d = 0;
  c = 0;
  while (c < f.jobs.length) {
    a: {
      b: {
        a = f.jobs[c];
        if (a.status === 2) {
          j += 1;
          break b;
        }
        k += a.units;
        if (a.priority) {
          l += 1;
          h += 1;
          break b;
        }
        h += 1;
        g = a.selected;
        g = g ? d + 1 : d;
        break a;
      }
      g = a.selected;
      g = g ? d + 1 : d;
    }
    m = a.id === f.selectedId;
    d = f.filter === "all" || f.filter === "queued" && a.status === 0 || f.filter === "transit" && a.status === 1 || f.filter === "done" && a.status === 2;
    if (d) {
      d = (a.customer + " " + a.route + " " + a.id + " " + a.owner).toLowerCase();
      d = d.includes(b);
    }
    if (d) {
      e.push(a);
    }
    d = g;
    i = m ? a : i;
    c += 1;
  }
  c: {
    b = f.sort === "customer";
    if (b) {
      b = e.sort;
      c = __mk56();
      b.call(e, c);
      break c;
    }
    b = f.sort === "progress";
    if (b) {
      b = e.sort;
      c = __mk58();
      b.call(e, c);
      break c;
    }
    b = e.sort;
    c = __mk59();
    b.call(e, c);
  }
  b = e.slice(f.page * PAGE_SIZE, (f.page + 1) * PAGE_SIZE);
  c = b.map.call(b, __mk57(f));
  a = e.length;
  g = Math;
  m = Math.max;
  e = Math.ceil(e.length / PAGE_SIZE);
  return {rows: b, rowStates: c, matched: a, pages: m.call(g, 1, e), open: h, done: j, risk: l, units: k, selected: d, focus: i};
};
  render = function render(n, o) {
  let a, e, b, c, f, g, h, i, j, k, d, l, m;
  a = {};
  e = (function repeat(a, b) {
  repeatSlots(0, a, b);
});
  b = [];
  c = {};
  f = __mk62(b, c);
  g = __mk63(b, c);
  h = __mk64(b, c);
  i = __mk65(b, c);
  j = __mk66(b, c);
  k = __mk67(b, c);
  d = {};
  l = __mk68(d);
  m = __mk70(d);
  c.value = -1;
  d.value = a;
  a.repeat = e;
  a.list = f;
  a.element = g;
  a.text = h;
  a.attr = i;
  a.property = j;
  a.on = k;
  a.button = l;
  a.input = m;
  n(o, a);
  return b;
};
  repeatSlots = {repeatSlots: function(a, b, c) {
  if (a < b) {
    c(a);
    repeatSlots(a + 1, b, c);
  }
}}.repeatSlots;
  reset = function reset(state) {
    return initialState({
        size: state.jobs.length
    });
};
  search = function search(state, event) {
    return {
        ...state,
        query: event.target.value,
        page: 0
    };
};
  selectJob = function selectJob(state, event) {
    return {
        ...state,
        selectedId: +event.currentTarget.getAttribute("data-record")
    };
};
  selectPage = function selectPage(state) {
    const ids = state.view.rows.map(function(job) {
        return job.id;
    });
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return ids.includes(job.id) ? {
                ...job,
                selected: true
            } : job;
        }),
        note: "Visible page selected"
    };
};
  setFilter = function setFilter(state, event) {
    return {
        ...state,
        filter: event.target.value,
        page: 0
    };
};
  setSort = function setSort(state, event) {
    return {
        ...state,
        sort: event.target.value,
        page: 0
    };
};
  statusName = function statusName(a) {
  return a === 0 ? "Queued" : a === 1 ? "In transit" : "Delivered";
};
  togglePriority = function togglePriority(b) {
  let a, c;
  a = b.view.focus;
  c = {priority: !a.priority};
  return editJob(b, a.id, c, "Priority updated for RY-" + a.id);
};
  toggleSelection = function toggleSelection(state, event) {
    return editJob(state, +event.currentTarget.getAttribute("data-record"), {
        selected: event.target.checked
    }, "Selection updated");
};
  unchanged = function unchanged(a) {
  return a;
};
  update = function update(g, d) {
  let h, e, c, f, b, a;
  h = render(g, d.previous);
  e = render(g, d.next);
  c = 0;
  while (c < e.length) {
    f = h[c];
    b = e[c];
    if (b.collection) {
      d.collections.update(d.nodes.collections[c], b.collection.items);
    }
    if (b.tag === null && f.text !== b.text) {
      (d.nodes[c]).nodeValue = b.text;
    }
    a = 0;
    while (a < b.attrs.length) {
      if ((f.attrs[a]).value !== (b.attrs[a]).value) {
        (d.nodes[c]).setAttribute((b.attrs[a]).name, (b.attrs[a]).value);
      }
      a += 1;
    }
    a = 0;
    while (a < b.props.length) {
      if (d.nodes[c][(b.props[a]).name] !== (b.props[a]).value) {
        (d.nodes[c])[(b.props[a]).name] = (b.props[a]).value;
      }
      a += 1;
    }
    c += 1;
  }
};
  c = a.query.toLowerCase();
  j = a.jobs[0];
  d = [];
  k = 0;
  l = 0;
  m = 0;
  n = 0;
  g = 0;
  e = 0;
  while (e < a.jobs.length) {
    a: {
      b: {
        b = a.jobs[e];
        if (b.status === 2) {
          l += 1;
          break b;
        }
        n += b.units;
        if (b.priority) {
          m += 1;
          k += 1;
          break b;
        }
        k += 1;
        f = b.selected;
        g = f ? g + 1 : g;
        break a;
      }
      f = b.selected;
      g = f ? g + 1 : g;
    }
    f = b.id === a.selectedId;
    h = a.filter === "all" || a.filter === "queued" && b.status === 0 || a.filter === "transit" && b.status === 1 || a.filter === "done" && b.status === 2;
    if (h) {
      h = (b.customer + " " + b.route + " " + b.id + " " + b.owner).toLowerCase().includes(c);
    }
    if (h) {
      d.push(b);
    }
    j = f ? b : j;
    e += 1;
  }
  c: {
    if (a.sort === "customer") {
      c = d.sort;
      e = __mk56();
      c.call(d, e);
      break c;
    }
    if (a.sort === "progress") {
      c = d.sort;
      e = __mk58();
      c.call(d, e);
      break c;
    }
    c = d.sort;
    e = __mk59();
    c.call(d, e);
  }
  c = d.slice(a.page * PAGE_SIZE, (a.page + 1) * PAGE_SIZE);
  e = c.map.call(c, __mk57(a));
  b = d.length;
  f = Math;
  h = Math.max;
  d = Math.ceil(d.length / PAGE_SIZE);
  d = h.call(f, 1, d);
  f = Math.min(a.page, d - 1);
  h = f !== a.page;
  i = {};
  if (h) {
    Object.assign(i, a);
    Object.defineProperty(i, "page", {value: f, writable: true, enumerable: true, configurable: true});
    c = {};
    Object.assign(c, i);
    j = {value: project(i), writable: true, enumerable: true, configurable: true};
    Object.defineProperty(c, "view", j);
    return c;
  }
  Object.assign(i, a);
  Object.defineProperty(i, "view", {value: {rows: c, rowStates: e, matched: b, pages: d, open: k, done: l, risk: m, units: n, selected: g, focus: j}, writable: true, enumerable: true, configurable: true});
  return i;
}

return main;
})(),
rowMount: (() => {
function __o0() {
  return {value: false, writable: true, enumerable: true, configurable: true};
}
function __o1() {
  return {value: 0, writable: true, enumerable: true, configurable: true};
}

var repeatSlots, render, listen, mount, update, Operations, Label, Metric, Select, Option, JobRow, Inspector, statusName, prepare, project, search, setFilter, setSort, selectJob, editJob, toggleSelection, assignOwner, togglePriority, dispatchOne, deliverOne, selectPage, clearSelection, dispatchSelected, previousPage, nextPage, pause, advance, loadDataset, unchanged, reset, initialState;
let PAGE_SIZE;

function __mk1(b, a) {
  return function() {
    a.attr("class", "inspector");
    Label(a, "detail-eyebrow", "eyebrow", "CONSIGNMENT DETAIL");
    Label(a, "detail-name", "detail-name", b.customer);
    Label(a, "detail-route", "muted", "RY-" + b.id + " · " + b.route);
    Label(a, "detail-status", "detail-status", statusName(b.status) + " · " + b.progress + "% complete");
    Label(a, "detail-units", "detail-field", b.units + " units · " + (b.priority ? "Priority service" : "Standard service"));
    a.element.call(a, "owner-label", "label", __mk2(b, a));
    a.button("priority", b.priority ? "Remove priority" : "Mark priority", togglePriority);
    a.button("dispatch", "Dispatch consignment", dispatchOne);
    a.button("deliver", "Mark delivered", deliverOne);
    Label(a, "detail-help", "muted", "Select a consignment to inspect it. Edit the operator, change priority, or dispatch the whole selected page.");
    Label(a, "simulation-label", "eyebrow", "NETWORK SIMULATION");
    Label(a, "simulation-help", "muted", "Advance moves every in-transit consignment. The feed is deterministic so both implementations can replay exactly the same workload.");
    a.button("reset", "Reset workspace", reset);
  };
}

function __mk2(b, a) {
  return function() {
    a.text("owner-caption", "Assigned operator");
    a.input("owner", b.owner, assignOwner);
  };
}

function __mk4(b, c, h, d, i, a) {
  return function() {
    let e, f, g;
    a.attr("class", d === i ? "queue-row focused" : "queue-row");
    a.attr("data-record", d);
    a.element.call(a, b + "-check", "input", __mk5(c, d, a));
    a.element.call(a, b + "-open", "button", __mk6(b, c, d, a));
    a.element.call(a, b + "-progress", "div", __mk7(b, h, a));
    e = Label;
    f = c.priority ? "badge warning" : "badge";
    g = statusName(c.status);
    e(a, b + "-status", f, g);
  };
}

function __mk5(c, b, a) {
  return function() {
    a.attr("type", "checkbox");
    a.attr("aria-label", "Select consignment " + b);
    a.attr("data-record", b);
    a.property("checked", c.selected);
    a.on("change", toggleSelection);
  };
}

function __mk6(b, c, d, a) {
  return function() {
    a.attr("type", "button");
    a.attr("class", "job-link");
    a.attr("data-record", d);
    a.on("click", selectJob);
    Label(a, b + "-name", "job-name", c.customer);
    Label(a, b + "-route", "muted", "RY-" + d + " · " + c.route);
  };
}

function __mk7(b, c, a) {
  return function() {
    a.attr("class", "progress-cell");
    a.element.call(a, b + "-track", "div", __mk8(b, c, a));
    a.text(b + "-percent", c + "%");
  };
}

function __mk8(b, c, a) {
  return function() {
    a.attr("class", "progress-track");
    a.element.call(a, b + "-bar", "div", __mk9(c, a));
  };
}

function __mk9(a, b) {
  return function() {
    b.attr("style", "width:" + a + "%");
  };
}

function __mk11(b, c, a, d) {
  return function() {
    a.attr("class", b);
    a.text(c + "-text", d);
  };
}

function __mk13(c, d, b, e, a, f) {
  return function() {
    a.attr("class", "metric " + d);
    Label(a, b + "-title", "metric-label", e);
    Label(a, b + "-value", "metric-value", f);
    Label(a, b + "-caption", "muted", c);
  };
}

function __mk15(c, b, a) {
  return function() {
    a.attr("class", "relay");
    a.element.call(a, "masthead", "header", __mk16(b, a));
    a.element.call(a, "metrics", "div", __mk19(c, a));
    a.element.call(a, "workspace", "div", __mk20(c, b, a));
    a.element.call(a, "activity", "footer", __mk28(b, a));
  };
}

function __mk16(b, a) {
  return function() {
    a.element.call(a, "brand", "div", __mk17(b, a));
    a.element.call(a, "feed", "div", __mk18(b, a));
  };
}

function __mk17(b, a) {
  return function() {
    Label(a, "eyebrow", "eyebrow", "RELAY / OPERATIONS");
    Label(a, "headline", "headline", "Dispatch workbench");
    Label(a, "subtitle", "muted", "North America · " + b.jobs.length + " active consignments");
  };
}

function __mk18(a, b) {
  return function() {
    b.attr("class", "feed-actions");
    Label(b, "feed-state", a.paused ? "badge warning" : "badge live", a.paused ? "FEED PAUSED" : "FEED LIVE");
    b.button("advance", "Advance simulation", advance, a.paused);
    b.button("pause", a.paused ? "Resume" : "Pause", pause);
  };
}

function __mk19(b, a) {
  return function() {
    a.attr("class", "metrics");
    Metric(a, "open", "Open consignments", b.open, "Awaiting delivery", "cyan");
    Metric(a, "risk", "Needs attention", b.risk, "Priority · not delivered", "orange");
    Metric(a, "delivered", "Delivered", b.done, "Completed consignments", "green");
    Metric(a, "volume", "Units in motion", b.units, "Across the whole network", "purple");
  };
}

function __mk20(b, c, a) {
  return function() {
    a.attr("class", "workspace");
    a.element.call(a, "queue-pane", "section", __mk21(b, c, a));
    Inspector(a, c, b.focus);
  };
}

function __mk21(b, c, a) {
  return function() {
    a.attr("class", "queue-pane");
    a.element.call(a, "toolbar", "div", __mk22(c, a));
    a.element.call(a, "bulk", "div", __mk24(b, a));
    a.element.call(a, "queue-heading", "div", __mk25(a));
    a.element.call(a, "queue", "div", __mk26(b, a));
    Label(a, "empty", "empty", b.matched === 0 ? "No consignments match. Try another search or status." : "");
    a.element.call(a, "pagination", "div", __mk27(b, c, a));
  };
}

function __mk22(b, a) {
  return function() {
    a.attr("class", "toolbar");
    a.element.call(a, "search-label", "label", __mk23(b, a));
    Select(a, "filter", "Status", b.filter, setFilter, ["all", "queued", "transit", "done"], ["All statuses", "Queued", "In transit", "Delivered"]);
    Select(a, "sort", "Sort by", b.sort, setSort, ["risk", "progress", "customer"], ["Priority first", "Progress", "Customer"]);
    Select(a, "dataset", "Network size", "" + b.jobs.length, loadDataset, ["240", "960", "3840"], ["240 consignments", "960 consignments", "3,840 consignments"]);
  };
}

function __mk23(b, a) {
  return function() {
    a.text("search-caption", "Search consignments");
    a.input("search", b.query, search);
  };
}

function __mk24(b, a) {
  return function() {
    a.attr("class", "bulk-toolbar");
    Label(a, "result-count", "muted", b.matched + " results · " + b.selected + " selected");
    a.button("select-page", "Select page", selectPage);
    a.button("clear-selection", "Clear", clearSelection, b.selected === 0);
    a.button("bulk-dispatch", "Dispatch selected", dispatchSelected, b.selected === 0);
  };
}

function __mk25(a) {
  return function() {
    a.attr("class", "queue-row queue-heading");
    Label(a, "column-select", "column-label", "SEL");
    Label(a, "column-job", "column-label", "CONSIGNMENT / ROUTE");
    Label(a, "column-progress", "column-label", "PROGRESS");
    Label(a, "column-status", "column-label", "STATUS");
  };
}

function __mk26(b, a) {
  return function() {
    a.attr("class", "queue");
    a.list("queue-rows", b.rowStates, "job");
  };
}

function __mk27(c, b, a) {
  return function() {
    a.attr("class", "pagination");
    a.button("previous", "← Previous", previousPage, b.page === 0);
    a.text("page", "Page " + (b.page + 1) + " / " + c.pages);
    a.button("next", "Next →", nextPage, b.page >= c.pages - 1);
  };
}

function __mk28(b, a) {
  return function() {
    a.attr("class", "activity");
    Label(a, "tick", "badge", "TICK " + b.tick);
    a.text("activity-text", b.note);
    a.button("noop", "Render unchanged", unchanged);
  };
}

function __mk30(c, d, e, a, b) {
  return function() {
    a.attr("value", b);
    a.property("selected", b === c);
    a.text(d + "-text", e);
  };
}

function __mk32(c, b, d, e, a, f, g) {
  return function() {
    a.text(b + "-caption", d);
    a.element.call(a, b, "select", __mk33(c, b, e, a, f, g));
  };
}

function __mk33(c, d, e, a, f, b) {
  return function() {
    a.on("change", c);
    a.repeat.call(a, b.length, __mk34(d, e, a, f, b));
  };
}

function __mk34(b, c, d, e, f) {
  return function(a) {
    Option(d, b + "-" + a, f[a], c[a], e);
  };
}

function __mk48(a, b) {
  return function(c) {
    b(a, c);
  };
}

function __mk56() {
  return function(a, b) {
    return a.customer < b.customer ? -1 : a.customer > b.customer ? 1 : a.id - b.id;
  };
}

function __mk57(b) {
  return function(a) {
    return {key: a.id, job: a, selectedId: b.selectedId};
  };
}

function __mk58() {
  return function(a, b) {
    return a.progress - b.progress || a.id - b.id;
  };
}

function __mk59() {
  return function(a, b) {
    return (b.priority ? 1 : 0) - (a.priority ? 1 : 0) || a.id - b.id;
  };
}

function __mk62(a, c) {
  return function list(d, e, f) {
    let b;
    a.push;
    b = {id: d, tag: "div", parent: c.value, text: null, attrs: [], props: [], events: [], collection: {items: e, component: f}};
    a.push(b);
  };
}

function __mk63(c, a) {
  return function element(e, f, g) {
    let d, b;
    d = c.length;
    c.push;
    b = {id: e, tag: f, parent: a.value, text: null, attrs: [], props: [], events: [], collection: null};
    c.push(b);
    b = a.value;
    a.value;
    a.value = d;
    g();
    a.value = b;
  };
}

function __mk64(a, b) {
  return function text(id, value) {
    a.push({
        id: id,
        tag: null,
        parent: b.value,
        text: "" + value,
        attrs: [],
        props: [],
        events: [],
        collection: null
    });
};
}

function __mk65(a, b) {
  return function attr(name, value) {
    a[b.value].attrs.push({
        name: name,
        value: "" + value
    });
};
}

function __mk66(a, b) {
  return function property(name, value) {
    a[b.value].props.push({
        name: name,
        value: value
    });
};
}

function __mk67(a, b) {
  return function on(type, action) {
    a[b.value].events.push({
        type: type,
        action: action
    });
};
}

function __mk68(a) {
  return function button(b, c, d, e) {
    a.value.element.call(a.value, b, "button", __mk69(d, e, b, c, a));
  };
}

function __mk69(b, c, d, e, a) {
  return function() {
    a.value.attr("type", "button");
    a.value.property("disabled", !!c);
    a.value.on("click", b);
    a.value.text(d + "-text", e);
  };
}

function __mk70(a) {
  return function input(b, c, d) {
    a.value.element.call(a.value, b, "input", __mk71(d, a, c));
  };
}

function __mk71(b, a, c) {
  return function() {
    a.value.attr("type", "text");
    a.value.property("value", c);
    a.value.on("input", b);
  };
}

function main(c) {
  let d, e, f, g, h, l, m, n, i, b, j, k, a;
  d = c.state;
  e = d.job;
  d = d.selectedId;
  f = "job-" + e.id;
  g = e.id;
  h = e.progress;
  l = e.selected;
  m = e.customer;
  n = "RY-" + g + " · " + e.route;
  i = e.status;
  e = e.priority ? "badge warning" : "badge";
  b = [];
  b.collections = [];
  Inspector = function Inspector(a, c, b) {
  a.element.call(a, "inspector", "aside", __mk1(b, a));
};
  JobRow = function JobRow(d, b) {
  let a, e, c, f, g;
  a = d.job;
  e = d.selectedId;
  c = "job-" + a.id;
  f = a.id;
  g = a.progress;
  b.element.call(b, c, "div", __mk4(c, a, g, f, e, b));
};
  Label = function Label(a, b, c, d) {
  a.element.call(a, b, "div", __mk11(c, b, a, d));
};
  Metric = function Metric(a, b, c, d, e, f) {
  a.element.call(a, b + "-metric", "div", __mk13(e, f, b, c, a, d));
};
  Operations = function Operations(b, a) {
  let c;
  c = b.view;
  a.element.call(a, "relay", "section", __mk15(c, b, a));
};
  Option = function Option(a, b, c, d, e) {
  a.element.call(a, b, "option", __mk30(e, b, d, a, c));
};
  PAGE_SIZE = 24;
  Select = function Select(a, b, c, d, e, f, g) {
  a.element.call(a, b + "-label", "label", __mk32(e, b, c, g, a, d, f));
};
  advance = function advance(state) {
    if (state.paused) return state;
    return {
        ...state,
        tick: state.tick + 1,
        note: "Network advanced · all in-transit consignments updated",
        jobs: state.jobs.map(function(job) {
            if (job.status !== 1) return job;
            const progress = Math.min(100, job.progress + 7);
            return {
                ...job,
                progress: progress,
                status: progress === 100 ? 2 : 1
            };
        })
    };
};
  assignOwner = function assignOwner(a, c) {
  let b;
  b = {owner: c.target.value};
  return editJob(a, a.selectedId, b, "Operator assignment updated");
};
  clearSelection = function clearSelection(state) {
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return job.selected ? {
                ...job,
                selected: false
            } : job;
        }),
        note: "Selection cleared"
    };
};
  deliverOne = function deliverOne(a) {
  return editJob(a, a.selectedId, {status: 2, progress: 100}, "Delivery confirmed");
};
  dispatchOne = function dispatchOne(a) {
  return editJob(a, a.selectedId, {status: 1, progress: 5}, "Consignment dispatched");
};
  dispatchSelected = function dispatchSelected(state) {
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return job.selected ? {
                ...job,
                status: 1,
                progress: 5,
                selected: false
            } : job;
        }),
        note: "Selected consignments dispatched"
    };
};
  editJob = function editJob(state, id, patch, note) {
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return job.id === id ? {
                ...job,
                ...patch
            } : job;
        }),
        note: note
    };
};
  initialState = function initialState(j) {
  let c, d, e, g, f, a, b, h, i;
  c = Math;
  d = Math.max;
  e = Math.min(10000, j.size | 0);
  c = d.call(c, 1, e);
  d = ["Northstar Labs", "Aperture Health", "Juniper Goods", "Orbit Devices", "Cedar & Co", "Meridian Supply", "Atlas Robotics", "Ember Coffee"];
  e = ["SEA → PDX", "LAX → SFO", "NYC → BOS", "DEN → AUS", "CHI → MSP", "ATL → MIA"];
  g = ["Avery", "Morgan", "Jordan", "Riley"];
  f = [];
  a = 0;
  while (a < c) {
    f.push;
    b = d[a % 8];
    h = e[a % 6];
    i = g[a % 4];
    b = {id: a + 1, customer: b, route: h, owner: i, status: a % 5 === 0 ? 2 : a % 3 === 0 ? 1 : 0, progress: (a % 5 === 0 ? 2 : a % 3 === 0 ? 1 : 0) === 2 ? 100 : (a % 5 === 0 ? 2 : a % 3 === 0 ? 1 : 0) === 1 ? a * 13 % 85 : 0, priority: a % 7 === 0, units: 4 + a * 17 % 96, selected: false};
    f.push(b);
    a += 1;
  }
  b = {jobs: f, query: "", filter: "all", sort: "risk", page: 0, selectedId: 1, paused: false, tick: 0, note: "Morning dispatch ready. Select a consignment to get started."};
  return b;
};
  listen = function listen(a, b, c, d) {
  a.addEventListener.call(a, b, __mk48(c, d));
};
  loadDataset = function loadDataset(c, b) {
  let a;
  a = {size: b.target.value - 0};
  return initialState(a);
};
  mount = function mount(h, d) {
  let g, e, f, a, c, b;
  g = render(h, d.state);
  e = [];
  e.collections = [];
  f = 0;
  while (f < g.length) {
    a: {
      a = g[f];
      if (a.tag === null) {
        c = d.document.createTextNode(a.text);
        break a;
      }
      c = d.document.createElement(a.tag);
    }
    e.push(c);
    if (a.tag !== null) {
      c.setAttribute("data-ui", a.id);
    }
    b = 0;
    while (b < a.attrs.length) {
      c.setAttribute((a.attrs[b]).name, (a.attrs[b]).value);
      b += 1;
    }
    b = 0;
    while (b < a.props.length) {
      c[(a.props[b]).name] = (a.props[b]).value;
      b += 1;
    }
    b = 0;
    while (b < a.events.length) {
      listen(c, (a.events[b]).type, (a.events[b]).action, d.dispatch);
      b += 1;
    }
    if (a.collection) {
      e.collections[f] = d.collections.mount(c, a.collection.items, a.collection.component);
    }
    b: {
      if (a.parent === -1) {
        d.root.appendChild(c);
        break b;
      }
      (e[a.parent]).appendChild(c);
    }
    f += 1;
  }
  return e;
};
  nextPage = function nextPage(state) {
    return {
        ...state,
        page: Math.min(state.view.pages - 1, state.page + 1)
    };
};
  pause = function pause(state) {
    return {
        ...state,
        paused: !state.paused
    };
};
  prepare = function prepare(state) {
    const view = project(state);
    const page = Math.min(state.page, view.pages - 1);
    if (page !== state.page) {
        const next = {
            ...state,
            page: page
        };
        return {
            ...next,
            view: project(next)
        };
    }
    return {
        ...state,
        view: view
    };
};
  previousPage = function previousPage(state) {
    return {
        ...state,
        page: Math.max(0, state.page - 1)
    };
};
  project = function project(f) {
  let b, i, e, h, j, l, k, d, c, a, g, m;
  b = f.query.toLowerCase();
  i = f.jobs[0];
  e = [];
  h = 0;
  j = 0;
  l = 0;
  k = 0;
  d = 0;
  c = 0;
  while (c < f.jobs.length) {
    a: {
      b: {
        a = f.jobs[c];
        if (a.status === 2) {
          j += 1;
          break b;
        }
        k += a.units;
        if (a.priority) {
          l += 1;
          h += 1;
          break b;
        }
        h += 1;
        g = a.selected;
        g = g ? d + 1 : d;
        break a;
      }
      g = a.selected;
      g = g ? d + 1 : d;
    }
    m = a.id === f.selectedId;
    d = f.filter === "all" || f.filter === "queued" && a.status === 0 || f.filter === "transit" && a.status === 1 || f.filter === "done" && a.status === 2;
    if (d) {
      d = (a.customer + " " + a.route + " " + a.id + " " + a.owner).toLowerCase();
      d = d.includes(b);
    }
    if (d) {
      e.push(a);
    }
    d = g;
    i = m ? a : i;
    c += 1;
  }
  c: {
    b = f.sort === "customer";
    if (b) {
      b = e.sort;
      c = __mk56();
      b.call(e, c);
      break c;
    }
    b = f.sort === "progress";
    if (b) {
      b = e.sort;
      c = __mk58();
      b.call(e, c);
      break c;
    }
    b = e.sort;
    c = __mk59();
    b.call(e, c);
  }
  b = e.slice(f.page * PAGE_SIZE, (f.page + 1) * PAGE_SIZE);
  c = b.map.call(b, __mk57(f));
  a = e.length;
  g = Math;
  m = Math.max;
  e = Math.ceil(e.length / PAGE_SIZE);
  return {rows: b, rowStates: c, matched: a, pages: m.call(g, 1, e), open: h, done: j, risk: l, units: k, selected: d, focus: i};
};
  render = function render(n, o) {
  let a, e, b, c, f, g, h, i, j, k, d, l, m;
  a = {};
  e = (function repeat(a, b) {
  repeatSlots(0, a, b);
});
  b = [];
  c = {};
  f = __mk62(b, c);
  g = __mk63(b, c);
  h = __mk64(b, c);
  i = __mk65(b, c);
  j = __mk66(b, c);
  k = __mk67(b, c);
  d = {};
  l = __mk68(d);
  m = __mk70(d);
  c.value = -1;
  d.value = a;
  a.repeat = e;
  a.list = f;
  a.element = g;
  a.text = h;
  a.attr = i;
  a.property = j;
  a.on = k;
  a.button = l;
  a.input = m;
  n(o, a);
  return b;
};
  repeatSlots = {repeatSlots: function(a, b, c) {
  if (a < b) {
    c(a);
    repeatSlots(a + 1, b, c);
  }
}}.repeatSlots;
  reset = function reset(state) {
    return initialState({
        size: state.jobs.length
    });
};
  search = function search(state, event) {
    return {
        ...state,
        query: event.target.value,
        page: 0
    };
};
  j = function selectJob(state, event) {
    return {
        ...state,
        selectedId: +event.currentTarget.getAttribute("data-record")
    };
};
  selectJob = j;
  selectPage = function selectPage(state) {
    const ids = state.view.rows.map(function(job) {
        return job.id;
    });
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return ids.includes(job.id) ? {
                ...job,
                selected: true
            } : job;
        }),
        note: "Visible page selected"
    };
};
  setFilter = function setFilter(state, event) {
    return {
        ...state,
        filter: event.target.value,
        page: 0
    };
};
  setSort = function setSort(state, event) {
    return {
        ...state,
        sort: event.target.value,
        page: 0
    };
};
  statusName = function statusName(a) {
  return a === 0 ? "Queued" : a === 1 ? "In transit" : "Delivered";
};
  togglePriority = function togglePriority(b) {
  let a, c;
  a = b.view.focus;
  c = {priority: !a.priority};
  return editJob(b, a.id, c, "Priority updated for RY-" + a.id);
};
  k = function toggleSelection(state, event) {
    return editJob(state, +event.currentTarget.getAttribute("data-record"), {
        selected: event.target.checked
    }, "Selection updated");
};
  toggleSelection = k;
  unchanged = function unchanged(a) {
  return a;
};
  update = function update(g, d) {
  let h, e, c, f, b, a;
  h = render(g, d.previous);
  e = render(g, d.next);
  c = 0;
  while (c < e.length) {
    f = h[c];
    b = e[c];
    if (b.collection) {
      d.collections.update(d.nodes.collections[c], b.collection.items);
    }
    if (b.tag === null && f.text !== b.text) {
      (d.nodes[c]).nodeValue = b.text;
    }
    a = 0;
    while (a < b.attrs.length) {
      if ((f.attrs[a]).value !== (b.attrs[a]).value) {
        (d.nodes[c]).setAttribute((b.attrs[a]).name, (b.attrs[a]).value);
      }
      a += 1;
    }
    a = 0;
    while (a < b.props.length) {
      if (d.nodes[c][(b.props[a]).name] !== (b.props[a]).value) {
        (d.nodes[c])[(b.props[a]).name] = (b.props[a]).value;
      }
      a += 1;
    }
    c += 1;
  }
};
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", f);
  a.setAttribute("class", "" + (g === d ? "queue-row focused" : "queue-row"));
  a.setAttribute("data-record", "" + g);
  c.root.appendChild(a);
  a = c.document.createElement("input");
  b.push(a);
  a.setAttribute("data-ui", f + "-check");
  a.setAttribute("type", "checkbox");
  a.setAttribute("aria-label", "" + ("Select consignment " + g));
  a.setAttribute("data-record", "" + g);
  a["checked"] = l;
  listen(a, "change", k, c.dispatch);
  (b[0]).appendChild(a);
  a = c.document.createElement("button");
  b.push(a);
  a.setAttribute("data-ui", f + "-open");
  a.setAttribute("type", "button");
  a.setAttribute("class", "job-link");
  a.setAttribute("data-record", "" + g);
  listen(a, "click", j, c.dispatch);
  (b[0]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", f + "-name");
  a.setAttribute("class", "job-name");
  (b[2]).appendChild(a);
  d = c.document.createTextNode("" + m);
  b.push(d);
  (b[3]).appendChild(d);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", f + "-route");
  a.setAttribute("class", "muted");
  (b[2]).appendChild(a);
  d = c.document.createTextNode("" + n);
  b.push(d);
  (b[5]).appendChild(d);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", f + "-progress");
  a.setAttribute("class", "progress-cell");
  (b[0]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", f + "-track");
  a.setAttribute("class", "progress-track");
  (b[7]).appendChild(a);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", f + "-bar");
  a.setAttribute("style", "" + ("width:" + h + "%"));
  (b[8]).appendChild(a);
  d = c.document.createTextNode("" + (h + "%"));
  b.push(d);
  (b[7]).appendChild(d);
  a = c.document.createElement("div");
  b.push(a);
  a.setAttribute("data-ui", f + "-status");
  a.setAttribute("class", "" + e);
  (b[0]).appendChild(a);
  d = c.document.createTextNode("" + (i === 0 ? "Queued" : i === 1 ? "In transit" : "Delivered"));
  b.push(d);
  (b[11]).appendChild(d);
  return b;
}

return main;
})(),
rowUpdate: (() => {
function __o0() {
  return {value: 0, writable: true, enumerable: true, configurable: true};
}
function __o1() {
  return {value: false, writable: true, enumerable: true, configurable: true};
}

var repeatSlots, render, listen, mount, update, Operations, Label, Metric, Select, Option, JobRow, Inspector, statusName, prepare, project, search, setFilter, setSort, selectJob, editJob, toggleSelection, assignOwner, togglePriority, dispatchOne, deliverOne, selectPage, clearSelection, dispatchSelected, previousPage, nextPage, pause, advance, loadDataset, unchanged, reset, initialState;
let PAGE_SIZE;

var __rf0 = function Inspector(a, c, b) {
  a.element.call(a, "inspector", "aside", __mk1(b, a));
};

function __mk1(b, a) {
  return function() {
    a.attr("class", "inspector");
    Label(a, "detail-eyebrow", "eyebrow", "CONSIGNMENT DETAIL");
    Label(a, "detail-name", "detail-name", b.customer);
    Label(a, "detail-route", "muted", "RY-" + b.id + " · " + b.route);
    Label(a, "detail-status", "detail-status", statusName(b.status) + " · " + b.progress + "% complete");
    Label(a, "detail-units", "detail-field", b.units + " units · " + (b.priority ? "Priority service" : "Standard service"));
    a.element.call(a, "owner-label", "label", __mk2(b, a));
    a.button("priority", b.priority ? "Remove priority" : "Mark priority", togglePriority);
    a.button("dispatch", "Dispatch consignment", dispatchOne);
    a.button("deliver", "Mark delivered", deliverOne);
    Label(a, "detail-help", "muted", "Select a consignment to inspect it. Edit the operator, change priority, or dispatch the whole selected page.");
    Label(a, "simulation-label", "eyebrow", "NETWORK SIMULATION");
    Label(a, "simulation-help", "muted", "Advance moves every in-transit consignment. The feed is deterministic so both implementations can replay exactly the same workload.");
    a.button("reset", "Reset workspace", reset);
  };
}

function __mk2(b, a) {
  return function() {
    a.text("owner-caption", "Assigned operator");
    a.input("owner", b.owner, assignOwner);
  };
}

var __rf3 = function JobRow(d, b) {
  let a, e, c, f, g;
  a = d.job;
  e = d.selectedId;
  c = "job-" + a.id;
  f = a.id;
  g = a.progress;
  b.element.call(b, c, "div", __mk4(c, a, g, f, e, b));
};

function __mk4(b, c, h, d, i, a) {
  return function() {
    let e, f, g;
    a.attr("class", d === i ? "queue-row focused" : "queue-row");
    a.attr("data-record", d);
    a.element.call(a, b + "-check", "input", __mk5(c, d, a));
    a.element.call(a, b + "-open", "button", __mk6(b, c, d, a));
    a.element.call(a, b + "-progress", "div", __mk7(b, h, a));
    e = Label;
    f = c.priority ? "badge warning" : "badge";
    g = statusName(c.status);
    e(a, b + "-status", f, g);
  };
}

function __mk5(c, b, a) {
  return function() {
    a.attr("type", "checkbox");
    a.attr("aria-label", "Select consignment " + b);
    a.attr("data-record", b);
    a.property("checked", c.selected);
    a.on("change", toggleSelection);
  };
}

function __mk6(b, c, d, a) {
  return function() {
    a.attr("type", "button");
    a.attr("class", "job-link");
    a.attr("data-record", d);
    a.on("click", selectJob);
    Label(a, b + "-name", "job-name", c.customer);
    Label(a, b + "-route", "muted", "RY-" + d + " · " + c.route);
  };
}

function __mk7(b, c, a) {
  return function() {
    a.attr("class", "progress-cell");
    a.element.call(a, b + "-track", "div", __mk8(b, c, a));
    a.text(b + "-percent", c + "%");
  };
}

function __mk8(b, c, a) {
  return function() {
    a.attr("class", "progress-track");
    a.element.call(a, b + "-bar", "div", __mk9(c, a));
  };
}

function __mk9(a, b) {
  return function() {
    b.attr("style", "width:" + a + "%");
  };
}

var __rf10 = function Label(a, b, c, d) {
  a.element.call(a, b, "div", __mk11(c, b, a, d));
};

function __mk11(b, c, a, d) {
  return function() {
    a.attr("class", b);
    a.text(c + "-text", d);
  };
}

var __rf12 = function Metric(a, b, c, d, e, f) {
  a.element.call(a, b + "-metric", "div", __mk13(e, f, b, c, a, d));
};

function __mk13(c, d, b, e, a, f) {
  return function() {
    a.attr("class", "metric " + d);
    Label(a, b + "-title", "metric-label", e);
    Label(a, b + "-value", "metric-value", f);
    Label(a, b + "-caption", "muted", c);
  };
}

var __rf14 = function Operations(b, a) {
  let c;
  c = b.view;
  a.element.call(a, "relay", "section", __mk15(c, b, a));
};

function __mk15(c, b, a) {
  return function() {
    a.attr("class", "relay");
    a.element.call(a, "masthead", "header", __mk16(b, a));
    a.element.call(a, "metrics", "div", __mk19(c, a));
    a.element.call(a, "workspace", "div", __mk20(c, b, a));
    a.element.call(a, "activity", "footer", __mk28(b, a));
  };
}

function __mk16(b, a) {
  return function() {
    a.element.call(a, "brand", "div", __mk17(b, a));
    a.element.call(a, "feed", "div", __mk18(b, a));
  };
}

function __mk17(b, a) {
  return function() {
    Label(a, "eyebrow", "eyebrow", "RELAY / OPERATIONS");
    Label(a, "headline", "headline", "Dispatch workbench");
    Label(a, "subtitle", "muted", "North America · " + b.jobs.length + " active consignments");
  };
}

function __mk18(a, b) {
  return function() {
    b.attr("class", "feed-actions");
    Label(b, "feed-state", a.paused ? "badge warning" : "badge live", a.paused ? "FEED PAUSED" : "FEED LIVE");
    b.button("advance", "Advance simulation", advance, a.paused);
    b.button("pause", a.paused ? "Resume" : "Pause", pause);
  };
}

function __mk19(b, a) {
  return function() {
    a.attr("class", "metrics");
    Metric(a, "open", "Open consignments", b.open, "Awaiting delivery", "cyan");
    Metric(a, "risk", "Needs attention", b.risk, "Priority · not delivered", "orange");
    Metric(a, "delivered", "Delivered", b.done, "Completed consignments", "green");
    Metric(a, "volume", "Units in motion", b.units, "Across the whole network", "purple");
  };
}

function __mk20(b, c, a) {
  return function() {
    a.attr("class", "workspace");
    a.element.call(a, "queue-pane", "section", __mk21(b, c, a));
    Inspector(a, c, b.focus);
  };
}

function __mk21(b, c, a) {
  return function() {
    a.attr("class", "queue-pane");
    a.element.call(a, "toolbar", "div", __mk22(c, a));
    a.element.call(a, "bulk", "div", __mk24(b, a));
    a.element.call(a, "queue-heading", "div", __mk25(a));
    a.element.call(a, "queue", "div", __mk26(b, a));
    Label(a, "empty", "empty", b.matched === 0 ? "No consignments match. Try another search or status." : "");
    a.element.call(a, "pagination", "div", __mk27(b, c, a));
  };
}

function __mk22(b, a) {
  return function() {
    a.attr("class", "toolbar");
    a.element.call(a, "search-label", "label", __mk23(b, a));
    Select(a, "filter", "Status", b.filter, setFilter, ["all", "queued", "transit", "done"], ["All statuses", "Queued", "In transit", "Delivered"]);
    Select(a, "sort", "Sort by", b.sort, setSort, ["risk", "progress", "customer"], ["Priority first", "Progress", "Customer"]);
    Select(a, "dataset", "Network size", "" + b.jobs.length, loadDataset, ["240", "960", "3840"], ["240 consignments", "960 consignments", "3,840 consignments"]);
  };
}

function __mk23(b, a) {
  return function() {
    a.text("search-caption", "Search consignments");
    a.input("search", b.query, search);
  };
}

function __mk24(b, a) {
  return function() {
    a.attr("class", "bulk-toolbar");
    Label(a, "result-count", "muted", b.matched + " results · " + b.selected + " selected");
    a.button("select-page", "Select page", selectPage);
    a.button("clear-selection", "Clear", clearSelection, b.selected === 0);
    a.button("bulk-dispatch", "Dispatch selected", dispatchSelected, b.selected === 0);
  };
}

function __mk25(a) {
  return function() {
    a.attr("class", "queue-row queue-heading");
    Label(a, "column-select", "column-label", "SEL");
    Label(a, "column-job", "column-label", "CONSIGNMENT / ROUTE");
    Label(a, "column-progress", "column-label", "PROGRESS");
    Label(a, "column-status", "column-label", "STATUS");
  };
}

function __mk26(b, a) {
  return function() {
    a.attr("class", "queue");
    a.list("queue-rows", b.rowStates, "job");
  };
}

function __mk27(c, b, a) {
  return function() {
    a.attr("class", "pagination");
    a.button("previous", "← Previous", previousPage, b.page === 0);
    a.text("page", "Page " + (b.page + 1) + " / " + c.pages);
    a.button("next", "Next →", nextPage, b.page >= c.pages - 1);
  };
}

function __mk28(b, a) {
  return function() {
    a.attr("class", "activity");
    Label(a, "tick", "badge", "TICK " + b.tick);
    a.text("activity-text", b.note);
    a.button("noop", "Render unchanged", unchanged);
  };
}

var __rf29 = function Option(a, b, c, d, e) {
  a.element.call(a, b, "option", __mk30(e, b, d, a, c));
};

function __mk30(c, d, e, a, b) {
  return function() {
    a.attr("value", b);
    a.property("selected", b === c);
    a.text(d + "-text", e);
  };
}

var __rf31 = function Select(a, b, c, d, e, f, g) {
  a.element.call(a, b + "-label", "label", __mk32(e, b, c, g, a, d, f));
};

function __mk32(c, b, d, e, a, f, g) {
  return function() {
    a.text(b + "-caption", d);
    a.element.call(a, b, "select", __mk33(c, b, e, a, f, g));
  };
}

function __mk33(c, d, e, a, f, b) {
  return function() {
    a.on("change", c);
    a.repeat.call(a, b.length, __mk34(d, e, a, f, b));
  };
}

function __mk34(b, c, d, e, f) {
  return function(a) {
    Option(d, b + "-" + a, f[a], c[a], e);
  };
}

var __rf35 = function advance(state) {
    if (state.paused) return state;
    return {
        ...state,
        tick: state.tick + 1,
        note: "Network advanced · all in-transit consignments updated",
        jobs: state.jobs.map(function(job) {
            if (job.status !== 1) return job;
            const progress = Math.min(100, job.progress + 7);
            return {
                ...job,
                progress: progress,
                status: progress === 100 ? 2 : 1
            };
        })
    };
};

var __rf37 = function assignOwner(a, c) {
  let b;
  b = {owner: c.target.value};
  return editJob(a, a.selectedId, b, "Operator assignment updated");
};

var __rf38 = function clearSelection(state) {
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return job.selected ? {
                ...job,
                selected: false
            } : job;
        }),
        note: "Selection cleared"
    };
};

var __rf40 = function deliverOne(a) {
  return editJob(a, a.selectedId, {status: 2, progress: 100}, "Delivery confirmed");
};

var __rf41 = function dispatchOne(a) {
  return editJob(a, a.selectedId, {status: 1, progress: 5}, "Consignment dispatched");
};

var __rf42 = function dispatchSelected(state) {
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return job.selected ? {
                ...job,
                status: 1,
                progress: 5,
                selected: false
            } : job;
        }),
        note: "Selected consignments dispatched"
    };
};

var __rf44 = function editJob(state, id, patch, note) {
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return job.id === id ? {
                ...job,
                ...patch
            } : job;
        }),
        note: note
    };
};

var __rf46 = function initialState(j) {
  let c, d, e, g, f, a, b, h, i;
  c = Math;
  d = Math.max;
  e = Math.min(10000, j.size | 0);
  c = d.call(c, 1, e);
  d = ["Northstar Labs", "Aperture Health", "Juniper Goods", "Orbit Devices", "Cedar & Co", "Meridian Supply", "Atlas Robotics", "Ember Coffee"];
  e = ["SEA → PDX", "LAX → SFO", "NYC → BOS", "DEN → AUS", "CHI → MSP", "ATL → MIA"];
  g = ["Avery", "Morgan", "Jordan", "Riley"];
  f = [];
  a = 0;
  while (a < c) {
    f.push;
    b = d[a % 8];
    h = e[a % 6];
    i = g[a % 4];
    b = {id: a + 1, customer: b, route: h, owner: i, status: a % 5 === 0 ? 2 : a % 3 === 0 ? 1 : 0, progress: (a % 5 === 0 ? 2 : a % 3 === 0 ? 1 : 0) === 2 ? 100 : (a % 5 === 0 ? 2 : a % 3 === 0 ? 1 : 0) === 1 ? a * 13 % 85 : 0, priority: a % 7 === 0, units: 4 + a * 17 % 96, selected: false};
    f.push(b);
    a += 1;
  }
  b = {jobs: f, query: "", filter: "all", sort: "risk", page: 0, selectedId: 1, paused: false, tick: 0, note: "Morning dispatch ready. Select a consignment to get started."};
  return b;
};

var __rf47 = function listen(a, b, c, d) {
  a.addEventListener.call(a, b, __mk48(c, d));
};

function __mk48(a, b) {
  return function(c) {
    b(a, c);
  };
}

var __rf49 = function loadDataset(c, b) {
  let a;
  a = {size: b.target.value - 0};
  return initialState(a);
};

var __rf50 = function mount(h, d) {
  let g, e, f, a, c, b;
  g = render(h, d.state);
  e = [];
  e.collections = [];
  f = 0;
  while (f < g.length) {
    a: {
      a = g[f];
      if (a.tag === null) {
        c = d.document.createTextNode(a.text);
        break a;
      }
      c = d.document.createElement(a.tag);
    }
    e.push(c);
    if (a.tag !== null) {
      c.setAttribute("data-ui", a.id);
    }
    b = 0;
    while (b < a.attrs.length) {
      c.setAttribute((a.attrs[b]).name, (a.attrs[b]).value);
      b += 1;
    }
    b = 0;
    while (b < a.props.length) {
      c[(a.props[b]).name] = (a.props[b]).value;
      b += 1;
    }
    b = 0;
    while (b < a.events.length) {
      listen(c, (a.events[b]).type, (a.events[b]).action, d.dispatch);
      b += 1;
    }
    if (a.collection) {
      e.collections[f] = d.collections.mount(c, a.collection.items, a.collection.component);
    }
    b: {
      if (a.parent === -1) {
        d.root.appendChild(c);
        break b;
      }
      (e[a.parent]).appendChild(c);
    }
    f += 1;
  }
  return e;
};

var __rf51 = function nextPage(state) {
    return {
        ...state,
        page: Math.min(state.view.pages - 1, state.page + 1)
    };
};

var __rf52 = function pause(state) {
    return {
        ...state,
        paused: !state.paused
    };
};

var __rf53 = function prepare(state) {
    const view = project(state);
    const page = Math.min(state.page, view.pages - 1);
    if (page !== state.page) {
        const next = {
            ...state,
            page: page
        };
        return {
            ...next,
            view: project(next)
        };
    }
    return {
        ...state,
        view: view
    };
};

var __rf54 = function previousPage(state) {
    return {
        ...state,
        page: Math.max(0, state.page - 1)
    };
};

var __rf55 = function project(f) {
  let b, i, e, h, j, l, k, d, c, a, g, m;
  b = f.query.toLowerCase();
  i = f.jobs[0];
  e = [];
  h = 0;
  j = 0;
  l = 0;
  k = 0;
  d = 0;
  c = 0;
  while (c < f.jobs.length) {
    a: {
      b: {
        a = f.jobs[c];
        if (a.status === 2) {
          j += 1;
          break b;
        }
        k += a.units;
        if (a.priority) {
          l += 1;
          h += 1;
          break b;
        }
        h += 1;
        g = a.selected;
        g = g ? d + 1 : d;
        break a;
      }
      g = a.selected;
      g = g ? d + 1 : d;
    }
    m = a.id === f.selectedId;
    d = f.filter === "all" || f.filter === "queued" && a.status === 0 || f.filter === "transit" && a.status === 1 || f.filter === "done" && a.status === 2;
    if (d) {
      d = (a.customer + " " + a.route + " " + a.id + " " + a.owner).toLowerCase();
      d = d.includes(b);
    }
    if (d) {
      e.push(a);
    }
    d = g;
    i = m ? a : i;
    c += 1;
  }
  c: {
    b = f.sort === "customer";
    if (b) {
      b = e.sort;
      c = __mk56();
      b.call(e, c);
      break c;
    }
    b = f.sort === "progress";
    if (b) {
      b = e.sort;
      c = __mk58();
      b.call(e, c);
      break c;
    }
    b = e.sort;
    c = __mk59();
    b.call(e, c);
  }
  b = e.slice(f.page * PAGE_SIZE, (f.page + 1) * PAGE_SIZE);
  c = b.map.call(b, __mk57(f));
  a = e.length;
  g = Math;
  m = Math.max;
  e = Math.ceil(e.length / PAGE_SIZE);
  return {rows: b, rowStates: c, matched: a, pages: m.call(g, 1, e), open: h, done: j, risk: l, units: k, selected: d, focus: i};
};

function __mk56() {
  return function(a, b) {
    return a.customer < b.customer ? -1 : a.customer > b.customer ? 1 : a.id - b.id;
  };
}

function __mk57(b) {
  return function(a) {
    return {key: a.id, job: a, selectedId: b.selectedId};
  };
}

function __mk58() {
  return function(a, b) {
    return a.progress - b.progress || a.id - b.id;
  };
}

function __mk59() {
  return function(a, b) {
    return (b.priority ? 1 : 0) - (a.priority ? 1 : 0) || a.id - b.id;
  };
}

var __rf60 = function render(n, o) {
  let a, e, b, c, f, g, h, i, j, k, d, l, m;
  a = {};
  e = (function repeat(a, b) {
  repeatSlots(0, a, b);
});
  b = [];
  c = {};
  f = __mk62(b, c);
  g = __mk63(b, c);
  h = __mk64(b, c);
  i = __mk65(b, c);
  j = __mk66(b, c);
  k = __mk67(b, c);
  d = {};
  l = __mk68(d);
  m = __mk70(d);
  c.value = -1;
  d.value = a;
  a.repeat = e;
  a.list = f;
  a.element = g;
  a.text = h;
  a.attr = i;
  a.property = j;
  a.on = k;
  a.button = l;
  a.input = m;
  n(o, a);
  return b;
};

function __mk62(a, c) {
  return function list(d, e, f) {
    let b;
    a.push;
    b = {id: d, tag: "div", parent: c.value, text: null, attrs: [], props: [], events: [], collection: {items: e, component: f}};
    a.push(b);
  };
}

function __mk63(c, a) {
  return function element(e, f, g) {
    let d, b;
    d = c.length;
    c.push;
    b = {id: e, tag: f, parent: a.value, text: null, attrs: [], props: [], events: [], collection: null};
    c.push(b);
    b = a.value;
    a.value;
    a.value = d;
    g();
    a.value = b;
  };
}

function __mk64(a, b) {
  return function text(id, value) {
    a.push({
        id: id,
        tag: null,
        parent: b.value,
        text: "" + value,
        attrs: [],
        props: [],
        events: [],
        collection: null
    });
};
}

function __mk65(a, b) {
  return function attr(name, value) {
    a[b.value].attrs.push({
        name: name,
        value: "" + value
    });
};
}

function __mk66(a, b) {
  return function property(name, value) {
    a[b.value].props.push({
        name: name,
        value: value
    });
};
}

function __mk67(a, b) {
  return function on(type, action) {
    a[b.value].events.push({
        type: type,
        action: action
    });
};
}

function __mk68(a) {
  return function button(b, c, d, e) {
    a.value.element.call(a.value, b, "button", __mk69(d, e, b, c, a));
  };
}

function __mk69(b, c, d, e, a) {
  return function() {
    a.value.attr("type", "button");
    a.value.property("disabled", !!c);
    a.value.on("click", b);
    a.value.text(d + "-text", e);
  };
}

function __mk70(a) {
  return function input(b, c, d) {
    a.value.element.call(a.value, b, "input", __mk71(d, a, c));
  };
}

function __mk71(b, a, c) {
  return function() {
    a.value.attr("type", "text");
    a.value.property("value", c);
    a.value.on("input", b);
  };
}

var __rf72 = {repeatSlots: function(a, b, c) {
  if (a < b) {
    c(a);
    repeatSlots(a + 1, b, c);
  }
}}.repeatSlots;

var __rf73 = function reset(state) {
    return initialState({
        size: state.jobs.length
    });
};

var __rf74 = function search(state, event) {
    return {
        ...state,
        query: event.target.value,
        page: 0
    };
};

var __rf75 = function selectJob(state, event) {
    return {
        ...state,
        selectedId: +event.currentTarget.getAttribute("data-record")
    };
};

var __rf76 = function selectPage(state) {
    const ids = state.view.rows.map(function(job) {
        return job.id;
    });
    return {
        ...state,
        jobs: state.jobs.map(function(job) {
            return ids.includes(job.id) ? {
                ...job,
                selected: true
            } : job;
        }),
        note: "Visible page selected"
    };
};

var __rf79 = function setFilter(state, event) {
    return {
        ...state,
        filter: event.target.value,
        page: 0
    };
};

var __rf80 = function setSort(state, event) {
    return {
        ...state,
        sort: event.target.value,
        page: 0
    };
};

var __rf81 = function statusName(a) {
  return a === 0 ? "Queued" : a === 1 ? "In transit" : "Delivered";
};

var __rf82 = function togglePriority(b) {
  let a, c;
  a = b.view.focus;
  c = {priority: !a.priority};
  return editJob(b, a.id, c, "Priority updated for RY-" + a.id);
};

var __rf83 = function toggleSelection(state, event) {
    return editJob(state, +event.currentTarget.getAttribute("data-record"), {
        selected: event.target.checked
    }, "Selection updated");
};

var __rf84 = function unchanged(a) {
  return a;
};

var __rf85 = function update(g, d) {
  let h, e, c, f, b, a;
  h = render(g, d.previous);
  e = render(g, d.next);
  c = 0;
  while (c < e.length) {
    f = h[c];
    b = e[c];
    if (b.collection) {
      d.collections.update(d.nodes.collections[c], b.collection.items);
    }
    if (b.tag === null && f.text !== b.text) {
      (d.nodes[c]).nodeValue = b.text;
    }
    a = 0;
    while (a < b.attrs.length) {
      if ((f.attrs[a]).value !== (b.attrs[a]).value) {
        (d.nodes[c]).setAttribute((b.attrs[a]).name, (b.attrs[a]).value);
      }
      a += 1;
    }
    a = 0;
    while (a < b.props.length) {
      if (d.nodes[c][(b.props[a]).name] !== (b.props[a]).value) {
        (d.nodes[c])[(b.props[a]).name] = (b.props[a]).value;
      }
      a += 1;
    }
    c += 1;
  }
};

function main(c) {
  let e, a, d, b, f, i, j, g, k, l, h, V, W, X, Y, U, Z, aa, ab, ac, m, n, o, p, q, r, s, t, u, v, w, x, y, z, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T;
  e = c.previous;
  a = e.job;
  e = e.selectedId;
  d = "job-" + a.id;
  b = a.id;
  f = a.progress;
  a.selected;
  i = a.customer;
  j = "RY-" + b + " · " + a.route;
  g = a.status;
  k = a.priority ? "badge warning" : "badge";
  l = c.next;
  a = l.job;
  h = "" + (b === e ? "queue-row focused" : "queue-row");
  e = l.selectedId;
  d + "-check";
  d + "-open";
  d + "-name";
  d + "-name" + "-text";
  d + "-route";
  d + "-route" + "-text";
  d + "-progress";
  d + "-track";
  d + "-bar";
  d + "-percent";
  d + "-status";
  d + "-status" + "-text";
  "job-" + a.id;
  d = "" + b;
  l = "" + ("Select consignment " + b);
  V = "" + b;
  W = "" + b;
  b = a.id;
  X = "" + ("width:" + f + "%");
  Y = "" + (f + "%");
  f = a.progress;
  U = a.selected;
  Z = "" + i;
  i = a.customer;
  aa = "" + j;
  j = "RY-" + b + " · " + a.route;
  ab = "" + (g === 0 ? "Queued" : g === 1 ? "In transit" : "Delivered");
  g = a.status;
  ac = "" + k;
  k = a.priority ? "badge warning" : "badge";
  a: {
    if (h !== "" + (b === e ? "queue-row focused" : "queue-row")) {
      v = __rf0;
      Inspector = v;
      u = __rf3;
      JobRow = u;
      q = __rf10;
      Label = q;
      r = __rf12;
      Metric = r;
      p = __rf14;
      Operations = p;
      t = __rf29;
      Option = t;
      PAGE_SIZE = 24;
      s = __rf31;
      Select = s;
      P = __rf35;
      advance = P;
      F = __rf37;
      assignOwner = F;
      K = __rf38;
      clearSelection = K;
      I = __rf40;
      deliverOne = I;
      H = __rf41;
      dispatchOne = H;
      L = __rf42;
      dispatchSelected = L;
      D = __rf44;
      editJob = D;
      T = __rf46;
      initialState = T;
      m = __rf47;
      listen = m;
      Q = __rf49;
      loadDataset = Q;
      n = __rf50;
      mount = n;
      N = __rf51;
      nextPage = N;
      O = __rf52;
      pause = O;
      x = __rf53;
      prepare = x;
      M = __rf54;
      previousPage = M;
      y = __rf55;
      project = y;
      h = __rf60;
      render = h;
      a = __rf72;
      repeatSlots = a;
      S = __rf73;
      reset = S;
      z = __rf74;
      search = z;
      C = __rf75;
      selectJob = C;
      J = __rf76;
      selectPage = J;
      A = __rf79;
      setFilter = A;
      B = __rf80;
      setSort = B;
      w = __rf81;
      statusName = w;
      G = __rf82;
      togglePriority = G;
      E = __rf83;
      toggleSelection = E;
      R = __rf84;
      unchanged = R;
      o = __rf85;
      update = o;
      (c.nodes[0]).setAttribute("class", "" + (b === e ? "queue-row focused" : "queue-row"));
      break a;
    }
    a = __rf72;
    h = __rf60;
    m = __rf47;
    n = __rf50;
    o = __rf85;
    p = __rf14;
    q = __rf10;
    r = __rf12;
    s = __rf31;
    t = __rf29;
    u = __rf3;
    v = __rf0;
    w = __rf81;
    x = __rf53;
    y = __rf55;
    z = __rf74;
    A = __rf79;
    B = __rf80;
    C = __rf75;
    D = __rf44;
    E = __rf83;
    F = __rf37;
    G = __rf82;
    H = __rf41;
    I = __rf40;
    J = __rf76;
    K = __rf38;
    L = __rf42;
    M = __rf54;
    N = __rf51;
    O = __rf52;
    P = __rf35;
    Q = __rf49;
    R = __rf84;
    S = __rf73;
    T = __rf46;
    Inspector = v;
    JobRow = u;
    Label = q;
    Metric = r;
    Operations = p;
    Option = t;
    PAGE_SIZE = 24;
    Select = s;
    advance = P;
    assignOwner = F;
    clearSelection = K;
    deliverOne = I;
    dispatchOne = H;
    dispatchSelected = L;
    editJob = D;
    initialState = T;
    listen = m;
    loadDataset = Q;
    mount = n;
    nextPage = N;
    pause = O;
    prepare = x;
    previousPage = M;
    project = y;
    render = h;
    repeatSlots = a;
    reset = S;
    search = z;
    selectJob = C;
    selectPage = J;
    setFilter = A;
    setSort = B;
    statusName = w;
    togglePriority = G;
    toggleSelection = E;
    unchanged = R;
    update = o;
  }
  if (d !== "" + b) {
    (c.nodes[0]).setAttribute("data-record", "" + b);
  }
  if (l !== "" + ("Select consignment " + b)) {
    (c.nodes[1]).setAttribute("aria-label", "" + ("Select consignment " + b));
  }
  if (V !== "" + b) {
    (c.nodes[1]).setAttribute("data-record", "" + b);
  }
  if (c.nodes[1]["checked"] !== U) {
    (c.nodes[1])["checked"] = U;
  }
  if (W !== "" + b) {
    (c.nodes[2]).setAttribute("data-record", "" + b);
  }
  if (Z !== "" + i) {
    (c.nodes[4]).nodeValue = "" + i;
  }
  if (aa !== "" + j) {
    (c.nodes[6]).nodeValue = "" + j;
  }
  if (X !== "" + ("width:" + f + "%")) {
    (c.nodes[9]).setAttribute("style", "" + ("width:" + f + "%"));
  }
  if (Y !== "" + (f + "%")) {
    (c.nodes[10]).nodeValue = "" + (f + "%");
  }
  if (ac !== "" + k) {
    (c.nodes[11]).setAttribute("class", "" + k);
  }
  if (ab !== "" + (g === 0 ? "Queued" : g === 1 ? "In transit" : "Delivered")) {
    (c.nodes[12]).nodeValue = "" + (g === 0 ? "Queued" : g === 1 ? "In transit" : "Delivered");
  }
}

return main;
})()
};
program.components = { job: { mount: program.rowMount, update: program.rowUpdate } };
return { mount: program.mount, update: program.update, initial: program.initial, prepare: program.prepare, components: program.components,
start: function(document, root, observe, options) { return start(program, document, root, observe, options); } };
})();
