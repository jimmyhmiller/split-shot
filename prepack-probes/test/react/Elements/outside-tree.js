var React = require("react");

// Element trees made outside a root, at the top of the module, which the
// root returns or renders: known in its body (React's elements are
// immutable), rendered in place there; a stateful class within one is
// kept as the very element it was given, so React skips it as it skips the
// original's same element (its mounts and updates recorded), and the trees
// chosen by the root's props switch as the original's do.

var renders = [];

class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { seen: 0 };
  }
  componentDidUpdate() {
    renders.push("updated " + this.props.name);
  }
  componentDidMount() {
    renders.push("mounted " + this.props.name);
  }
  render() {
    return <i>{this.props.name}</i>;
  }
}

function Label(props) {
  return <b>{props.text}</b>;
}

var shared = (
  <div>
    <Label text="shared" />
    <Counter name="kept" />
  </div>
);

var other = (
  <section>
    <Label text="other" />
    {[<Counter key="a" name="first" />, <Counter key="b" name="second" />]}
  </section>
);

function App(props) {
  return (
    <main>
      {shared}
      {props.flag ? other : <Label text={props.text} />}
    </main>
  );
}

App.renders = renders;

App.getTrials = function(renderer, Root) {
  let results = [];
  Root.renders.length = 0;
  let step = function(name, p) {
    renderer.update(<Root {...p} />);
    results.push([name, renderer.toJSON()]);
    results.push(["renders after " + name, Root.renders.join(",")]);
  };
  step("first", { flag: true, text: "t" });
  step("same", { flag: true, text: "u" });
  step("switch", { flag: false, text: "v" });
  step("back", { flag: true, text: "w" });
  return results;
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
