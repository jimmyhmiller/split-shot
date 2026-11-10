var React = require("react");

// Elements keyed by runtime values, rendered in place: a key that stays,
// changes, goes undefined or comes back, a number key, and a switch to
// another component under the same key. A probe class records each mount,
// so a remount the original would not make (or the other way) shows.

var mounts = [];

class Probe extends React.Component {
  componentDidMount() {
    mounts.push(this.props.id);
  }
  render() {
    return <i>{this.props.id}</i>;
  }
}

function Item(props) {
  return (
    <b>
      <Probe id={props.id} />
    </b>
  );
}

function Other(props) {
  return (
    <s>
      <Probe id={props.id} />
    </s>
  );
}

function Show(props) {
  var k = props.el.key;
  return <u>{k === null ? "no key" : "key " + k}</u>;
}

function App(props) {
  return (
    <div>
      <Item key={props.k} id="a" />
      <Item key={props.n} id="b" />
      {props.flag ? <Item key={props.j} id="c" /> : <Other key={props.j} id="c" />}
      <Show el={<Item key={props.k} id="z" />} />
    </div>
  );
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
  step("first", { k: "x", n: 1, j: "p", flag: true });
  step("same", { k: "x", n: 1, j: "p", flag: true });
  step("key changes", { k: "y", n: undefined, j: "q", flag: true });
  step("key goes", { k: undefined, n: 2, j: undefined, flag: true });
  step("other component", { k: undefined, n: 2, j: undefined, flag: false });
  step("key back", { k: "y", n: 2, j: "q", flag: false });
  return results;
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
