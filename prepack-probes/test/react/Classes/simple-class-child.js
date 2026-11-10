var React = require("react");

class Label extends React.Component {
  renderText() {
    return this.props.prefix + ": " + this.props.text;
  }
  render() {
    return <b>{this.renderText()}</b>;
  }
}
Label.defaultProps = { prefix: "Note" };

function App(props) {
  return (
    <div>
      <Label text="hello" />
      {props.show ? <Label prefix="Tip" text={props.tip} /> : null}
    </div>
  );
}

App.getTrials = function(renderer, Root) {
  renderer.update(<Root show={true} tip="a" />);
  let a = renderer.toJSON();
  renderer.update(<Root show={false} tip="b" />);
  let b = renderer.toJSON();
  renderer.update(<Root show={true} tip="c" />);
  return [["shown", a], ["hidden", b], ["shown again", renderer.toJSON()]];
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
