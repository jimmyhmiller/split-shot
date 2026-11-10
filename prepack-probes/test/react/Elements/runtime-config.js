var React = require("react");

// Elements of function components made of a runtime config not known to
// give no key or ref (`<Show {...config} />`), rendered in place: their
// props as React makes them (own enumerable properties but key, ref,
// __self and __source; not inherited ones, nor symbols; a getter read
// once, when made), the children given over the config's, the type's
// defaults where a prop is undefined, the key the config gives (stateful
// children remount as it changes), no config at all.

var mounts = [];

class Probe extends React.Component {
  componentDidMount() {
    mounts.push(this.props.id);
  }
  render() {
    return <i>{this.props.id}</i>;
  }
}

function Show(props) {
  return (
    <b>
      {Object.keys(props)
        .sort()
        .join(",")}
      {":" + String(props.label) + ":" + String(props.inherited) + ":" + typeof props.ref + ":" + typeof props.key}
      {props.children}
      <Probe id={String(props.label)} />
    </b>
  );
}
Show.defaultProps = { label: "default label", extra: "default extra" };

var sym = typeof Symbol === "function" ? Symbol("s") : "s";

function App(props) {
  var config = props.config;
  return (
    <div>
      <Show {...config} />
      <Show {...config}>child given</Show>
      <Show {...props.missing} />
      {React.createElement(Show, props.config)}
      {React.createElement(Show, props.nothing, "a", "b")}
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
  let reads = 0;
  let proto = { inherited: "from proto" };
  let make = function(fields) {
    let descs = { counted: { enumerable: true, get: () => ++reads }, [sym]: { value: "symbol", enumerable: true } };
    return Object.assign(Object.create(proto, descs), fields);
  };
  step("first", { config: make({ key: "k1", ref: null, __self: 1, __source: 2, label: "one", children: "config child" }), nothing: null });
  step("same key", { config: make({ key: "k1", label: undefined }), nothing: undefined });
  step("new key", { config: make({ key: 7, label: "three" }), nothing: null });
  step("no key", { config: make({ label: "four", extra: undefined }), nothing: null });
  results.push(["reads", reads]);
  return results;
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
