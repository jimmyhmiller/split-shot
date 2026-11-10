var React = require("react");

// The parent is a value only known at runtime: the simple class is made at
// runtime from its source, not modeled.
var Base = Math.random() < 2 ? React.Component : null;

class Label extends Base {
  render() {
    return <b>{this.props.text}</b>;
  }
}
Label.displayName = "Label";

function App(props) {
  return (
    <div>
      <Label text={props.text} />
    </div>
  );
}

App.getTrials = function(renderer, Root) {
  renderer.update(<Root text="one" />);
  let a = renderer.toJSON();
  renderer.update(<Root text="two" />);
  return [["first", a], ["second", renderer.toJSON()]];
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
