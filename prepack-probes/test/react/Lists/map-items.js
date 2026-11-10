var React = require("react");

// Lists made with `map` in a root's tree, React rendering each item: a
// component rendered in place per item, keyed (reordered across updates,
// stateful items keep their state) or not; a list also read as data; a
// receiver whose `map` is its own; a callback with an effect; a map inside
// a map's callback.

var mounts = [];

class Probe extends React.Component {
  constructor(props) {
    super(props);
    this.state = { born: props.id };
  }
  componentDidMount() {
    mounts.push(this.props.id);
  }
  render() {
    return <i>{this.state.born + ">" + this.props.id}</i>;
  }
}

function Row(props) {
  return (
    <li>
      {props.label}
      <Probe id={props.label} />
    </li>
  );
}

function Cell(props) {
  return <b>{props.v}</b>;
}

function App(props) {
  var keyed = props.items.map(function(item) {
    return <Row key={item.id} label={item.name} />;
  });
  var plain = props.items.map(item => <Row label={item.name} />);
  var n = 0;
  var counted = props.items.map(function(item) {
    n++;
    return <Cell v={item.name + n} />;
  });
  var data = props.items.map(item => <Cell v={item.id} />);
  var grid = props.rows.map(row => <div key={row.k}>{row.cells.map(c => <Cell key={c} v={c} />)}</div>);
  return (
    <section>
      <ul>{keyed}</ul>
      <ul>{plain}</ul>
      <p>{counted}</p>
      <span>{n}</span>
      <p>{data}</p>
      <span>{data.length}</span>
      <p>{props.custom.map(item => <Cell v={item} />)}</p>
      {grid}
    </section>
  );
}

function custom(values) {
  return {
    map: function(f) {
      return values.slice(1).map(f);
    },
  };
}

App.mounts = mounts;

App.getTrials = function(renderer, Root) {
  let results = [];
  Root.mounts.length = 0;
  let step = function(name, p) {
    renderer.update(<Root {...p} />);
    results.push([name, renderer.toJSON()]);
    results.push(["mounts after " + name, Root.mounts.join(",")]);
  };
  let a = { id: 1, name: "a" };
  let b = { id: 2, name: "b" };
  let c = { id: 3, name: "c" };
  step("first", { items: [a, b, c], custom: custom(["x", "y", "z"]), rows: [{ k: "r1", cells: [1, 2] }] });
  step("reordered", { items: [c, a, b], custom: custom(["p", "q"]), rows: [{ k: "r2", cells: [3] }, { k: "r1", cells: [2, 1] }] });
  step("shorter", { items: [b], custom: custom([]), rows: [] });
  step("longer", { items: [a, b, c, { id: 4, name: "d" }], custom: [5, 6], rows: [{ k: "r1", cells: [] }] });
  return results;
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
