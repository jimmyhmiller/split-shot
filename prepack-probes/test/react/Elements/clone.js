var React = require("react");

// React.cloneElement of elements whose props are known, rendered in place:
// a config prop that is undefined takes the type's default, a key in the
// config replaces the element's (a stateful child under it remounts as the
// key changes), children given replace the element's, a host element
// cloned with new props.

var mounts = [];

class Probe extends React.Component {
  componentDidMount() {
    mounts.push(this.props.id);
  }
  render() {
    return <i>{this.props.id}</i>;
  }
}

function Label(props) {
  return (
    <b title={props.title}>
      {props.text}
      {props.children}
      <Probe id={props.text} />
    </b>
  );
}
Label.defaultProps = { title: "default title", text: "default text" };

function Wrap(props) {
  var child = props.children;
  return (
    <div>
      {React.cloneElement(child, { title: undefined, text: props.text })}
      {React.cloneElement(child, { key: props.k, text: "keyed" })}
      {React.cloneElement(child, null, <em>new child</em>, "!")}
      {React.cloneElement(<span className="a">s</span>, { className: props.text })}
    </div>
  );
}

function App(props) {
  return (
    <Wrap text={props.text} k={props.k}>
      <Label title="given">
        <u>old child</u>
      </Label>
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
  step("first", { text: "one", k: "x" });
  step("same key", { text: "two", k: "x" });
  step("new key", { text: "three", k: "y" });
  return results;
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
