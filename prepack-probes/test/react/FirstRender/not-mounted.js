var React = require("react");

// What a mount does not model leaves the class's element to React: an
// update with a callback (React runs it after the commit), an update from
// the constructor (React ignores it), an instance reaching the residual,
// forceUpdate with a callback.
var seen = [];

class WithCallback extends React.Component {
  constructor() {
    super();
    this.state = { v: 1 };
  }
  componentWillMount() {
    this.setState({ v: 2 }, () => {
      seen.push("callback " + this.state.v);
    });
  }
  render() {
    return <span>{this.state.v}</span>;
  }
}

class FromConstructor extends React.Component {
  constructor() {
    super();
    this.state = { v: "kept" };
    this.setState({ v: "ignored" });
  }
  render() {
    return <span>{this.state.v}</span>;
  }
}

class Escapes extends React.Component {
  constructor() {
    super();
    this.state = { v: "escaped" };
  }
  render() {
    seen.push(this);
    return <span>{this.state.v}</span>;
  }
}

class ForceCallback extends React.Component {
  componentWillMount() {
    this.forceUpdate(() => seen.push("forced"));
  }
  render() {
    return <span>{this.props.label}</span>;
  }
}

function App(props) {
  return (
    <section>
      <WithCallback />
      <FromConstructor />
      <Escapes />
      <ForceCallback label={props.label} />
    </section>
  );
}

// (Each program's own: the original's trials drive the residual too.)
App.seen = seen;

App.getTrials = function(renderer, Root) {
  Root.seen.length = 0;
  renderer.update(<Root label="lbl" />);
  var tree = renderer.toJSON();
  return [["mounted", tree], ["seen", Root.seen.map(x => (typeof x === "string" ? x : x.state.v)).join(",")]];
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App, { firstRenderOnly: true });
}

module.exports = App;
