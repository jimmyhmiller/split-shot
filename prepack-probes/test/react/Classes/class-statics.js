var React = require("react");

// A simple class given static properties after its definition (a function
// one, a record, an accessor): made from its source, then given them.
class Label extends React.Component {
  render() {
    return <i>{this.props.prefix + this.props.text}</i>;
  }
}
Label.defaultProps = { prefix: "> " };
Label.describe = function() {
  return "a label";
};
Object.defineProperty(Label, "kind", {
  get: function() {
    return "static getter";
  },
  configurable: true,
});

function App(props) {
  return (
    <section>
      <Label text={props.text} />
      <Label prefix="# " text="fixed" />
    </section>
  );
}

App.getTrials = function(renderer, Root) {
  renderer.update(<Root text="hi" />);
  return [["statics", renderer.toJSON()], ["describe", Label.describe() + " " + Label.kind + " " + Object.keys(Label).join(",")]];
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
