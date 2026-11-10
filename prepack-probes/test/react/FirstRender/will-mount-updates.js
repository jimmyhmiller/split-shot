var React = require("react");

// A tree rendered once mounts its classes in place as React does: updates
// componentWillMount enqueues are merged before render, in order, each
// function updater seeing the state the ones before it made (this.state
// still the old one while it runs), null and undefined updates changing
// nothing, and a this.state assigned in it replacing what was queued.
class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { n: props.start, log: "a" };
  }
  componentWillMount() {
    this.setState(s => ({ n: s.n + 1 }));
    this.setState({ log: this.state.log + "b" });
    this.setState((s, p) => ({ n: s.n * p.factor }));
    this.setState(null);
    this.setState(() => undefined);
    this.forceUpdate();
  }
  render() {
    return <span>{this.state.n + ":" + this.state.log}</span>;
  }
}

class Direct extends React.Component {
  constructor() {
    super();
    this.state = { v: "initial" };
  }
  UNSAFE_componentWillMount() {
    this.setState({ v: "queued" });
    this.state = { v: "direct", extra: this.props.extra };
  }
  render() {
    return <b>{this.state.v + "/" + this.state.extra}</b>;
  }
}

class Plain extends React.Component {
  render() {
    return <i>{String(this.state)}</i>;
  }
}

function App(props) {
  return (
    <div onClick={() => props.x} className="app">
      <Counter start={props.x} factor={3} />
      <Direct extra={props.y} />
      <Plain />
    </div>
  );
}

App.getTrials = function(renderer, Root) {
  renderer.update(<Root x={4} y="why" />);
  return [["mounted", renderer.toJSON()]];
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App, { firstRenderOnly: true });
}

module.exports = App;
