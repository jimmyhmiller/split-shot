var React = require("react");

// React.Children.map over children known in the root, rendered in place:
// React's keys (an index in base 36, a user key escaped, `=` and `:` in it,
// `/` in a key the callback gives, nested arrays), null and boolean
// children skipped, a callback returning arrays, null or an element of
// another key, a `this` given; stateful children reordered by key keep
// their state.

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

function Wrap(props) {
  var self = { tag: props.tag };
  return (
    <div>
      {React.Children.map(
        props.children,
        function(child, i) {
          if (child == null || child === "skip") return null;
          if (child === "pair") return [<b key="x">{this.tag + i}</b>, <b key="y/z">{i}</b>];
          if (typeof child === "string" || typeof child === "number") return <s>{child}</s>;
          return <em key={child.key === "k:1" ? "other" : undefined}>{child}</em>;
        },
        self
      )}
    </div>
  );
}

function App(props) {
  if (props.flip) {
    return (
      <Wrap tag={props.tag}>
        {"one"}
        {null}
        {true}
        {[2, ["skip", "pair"]]}
        {[<Probe key="b=2" id="b" />, <Probe key="k:1" id="a" />]}
        <Probe id="last" />
      </Wrap>
    );
  }
  return (
    <Wrap tag={props.tag}>
      {"one"}
      {null}
      {true}
      {[2, ["skip", "pair"]]}
      {[<Probe key="k:1" id="a" />, <Probe key="b=2" id="b" />]}
      <Probe id="last" />
    </Wrap>
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
  step("first", { tag: "t", flip: false });
  step("flipped", { tag: "u", flip: true });
  step("back", { tag: "v", flip: false });
  return results;
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
