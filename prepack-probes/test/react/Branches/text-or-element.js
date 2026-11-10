var React = require("react");

// A component whose value is a runtime value or, when that is falsy, an
// element: rendered in place, the runtime side behind its own test. The
// value takes turns being text, a number, falsy values, a host element and
// a stateful element; mounts are recorded.

var mounts = [];

class Probe extends React.Component {
  componentDidMount() {
    mounts.push(this.props.id);
  }
  render() {
    return <i>{this.props.id}</i>;
  }
}

function Either(props) {
  return props.x || <Probe id="fallback" />;
}

function Both(props) {
  return props.x && <Probe id={"and " + props.x} />;
}

function App(props) {
  return (
    <div>
      <Either x={props.x} />
      <Both x={props.y} />
    </div>
  );
}

App.mounts = mounts;
App.Probe = Probe;

App.getTrials = function(renderer, Root) {
  let results = [];
  Root.mounts.length = 0;
  let Probe = Root.Probe;
  let step = function(name, p) {
    renderer.update(<Root {...p} />);
    results.push([name, renderer.toJSON()]);
    results.push(["mounts after " + name, Root.mounts.join(",")]);
  };
  step("text", { x: "text", y: "t" });
  step("number", { x: 5, y: 0 });
  step("falsy", { x: 0, y: "" });
  step("falsy again", { x: "", y: null });
  step("host element", { x: <b>el</b>, y: 7 });
  step("stateful element", { x: <Probe id="given" />, y: true });
  step("same element", { x: <Probe id="given" />, y: false });
  step("null", { x: null, y: 0 });
  step("fallback to element", { x: <Probe id="given" />, y: 1 });
  return results;
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
