var React = require("react");

// A root's tree chosen by runtime values renders on each side: a component
// returning a value of no known kind stands for its element behind a
// runtime test (text, a number, a boolean or null in place; anything else,
// an element or undefined, as the element), a type chosen at runtime renders
// each type, two sides of one component update rather than remount, and a
// switch between two components remounts as it does unoptimized.
function Label(props) {
  return props.value.text || props.fallback;
}

function Foo(props) {
  return <b>{"foo " + props.n}</b>;
}

function Bar(props) {
  return <i>{"bar " + props.n}</i>;
}

var mounts = [];
class Counter extends React.Component {
  componentDidMount() {
    mounts.push(this.props.tag);
  }
  render() {
    return <span>{this.props.tag}</span>;
  }
}

function App(props) {
  var Type = props.flag ? Foo : Bar;
  return (
    <div>
      {props.value ? <Label value={props.value} fallback={props.fallback} /> : "no value"}
      <Type n={props.n} />
      {props.flag ? <Counter tag="a" /> : <Counter tag="b" />}
      {props.flag ? <Foo n={1} /> : <Bar n={2} />}
    </div>
  );
}

App.mounts = mounts;

App.getTrials = function(renderer, Root) {
  Root.mounts.length = 0;
  var results = [];
  var cases = [
    { flag: true, n: 1, value: { text: "text" }, fallback: "f" },
    { flag: false, n: 2, value: { text: "" }, fallback: 7 },
    { flag: true, n: 3, value: { text: 0 }, fallback: null },
    { flag: false, n: 4, value: { text: "" }, fallback: <em>element</em> },
    { flag: true, n: 5, value: null, fallback: "f" },
    { flag: true, n: 6, value: { text: false }, fallback: false },
  ];
  for (var i = 0; i < cases.length; i++) {
    renderer.update(<Root {...cases[i]} />);
    results.push(["case " + i, renderer.toJSON()]);
  }
  results.push(["mounts", Root.mounts.join(",")]);
  return results;
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
