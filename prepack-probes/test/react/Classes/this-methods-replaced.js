var React = require("react");

// A class root whose `render` calls helper methods on `this`, one of which
// code outside the class writes on its instance between renders: the
// residual writes that key on an object it does not know, so the class's
// methods are read from the instance at runtime.

function Row(props) {
  return <li>{props.label}</li>;
}

class List extends React.Component {
  constructor(props) {
    super(props);
    this.state = { clicks: 0 };
    this.handleClick = this.handleClick.bind(this);
  }
  handleClick() {
    this.setState({ clicks: this.state.clicks + 1 });
  }
  renderHeader() {
    return <h1>{this.props.title + " (" + this.state.clicks + ")"}</h1>;
  }
  renderRow(label, i) {
    return <Row key={i} label={label + this.props.suffix} />;
  }
  render() {
    return (
      <div onClick={this.handleClick}>
        {this.renderHeader()}
        {this.renderRow("first", 0)}
        {this.renderRow("second", 1)}
      </div>
    );
  }
}

List.getTrials = function(renderer, Root) {
  let results = [];
  renderer.update(<Root title="list" suffix="!" />);
  results.push(["first", renderer.toJSON()]);
  renderer.toJSON().props.onClick();
  results.push(["clicked", renderer.toJSON()]);
  renderer.getInstance().renderRow = function(label, i) {
    return <b key={i}>{"replaced " + label}</b>;
  };
  renderer.update(<Root title="list 2" suffix="?" />);
  results.push(["updated", renderer.toJSON()]);
  return results;
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(List);
}

module.exports = List;
