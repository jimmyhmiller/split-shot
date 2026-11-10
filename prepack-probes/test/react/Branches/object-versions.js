var React = require("react");

// A list of children made before a runtime test, which each arm changes
// (a stateful child pushed in one, one popped in the other), then reversed
// and rendered: the version the test chose. Stateful children keyed so
// they keep their state as the test flips; mounts are recorded.

var mounts = [];

class Probe extends React.Component {
  componentDidMount() {
    mounts.push(this.props.id);
  }
  render() {
    return <i>{this.props.id}</i>;
  }
}

function App(props) {
  var items = [<Probe key="a" id="a" />, <b key="text">{props.text}</b>, <Probe key="c" id="c" />];
  var meta = { count: 3 };
  if (props.more) {
    items.push(<Probe key="d" id="d" />);
    meta.count = 4;
  } else {
    items.pop();
    meta.count = 2;
  }
  items.reverse();
  return (
    <div title={"count " + meta.count}>
      {items}
      {items.length}
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
  step("more", { more: true, text: "one" });
  step("fewer", { more: false, text: "two" });
  step("more again", { more: true, text: "three" });
  return results;
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
