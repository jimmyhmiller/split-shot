var React = require("react");

// Functions made by `bind` of functions whose code is known: a component
// that reads `this` rendered in place with the `this` it was bound to, a
// bound function called in a render, one bound with arguments too (made
// at runtime), and a bound component given defaultProps later (React reads
// the bound function's own: the program's write is seen, nothing assumed).

function Greeting(props) {
  return <b>{this.greeting + ", " + props.name}</b>;
}
var Hello = Greeting.bind({ greeting: "hello" });
var Hi = Greeting.bind({ greeting: "hi" });

function label(prefix) {
  return prefix + this.suffix;
}
var shout = label.bind({ suffix: "!" });
var shoutWith = label.bind({ suffix: "?" }, "always");

function Late(props) {
  return <i>{this.tag + props.text}</i>;
}
var BoundLate = Late.bind({ tag: "#" });
BoundLate.defaultProps = { text: "late default" };

function App(props) {
  return (
    <div>
      <Hello name={props.name} />
      <Hi name="there" />
      <span>{shout(props.name)}</span>
      <span>{shoutWith(props.name)}</span>
      <BoundLate />
    </div>
  );
}

App.getTrials = function(renderer, Root) {
  renderer.update(<Root name="ann" />);
  let a = renderer.toJSON();
  renderer.update(<Root name="bob" />);
  return [["first", a], ["second", renderer.toJSON()]];
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
