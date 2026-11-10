var React = require("react");

// A class root whose `render` calls helper methods on `this`: each the
// prototype's (the class's own code never writes those keys on an
// instance), so it runs in the render, what it returns rendered in place.
// A handler bound in the constructor (an own property of the instance) is
// read from it at runtime; state changes through it across updates.

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
  renderer.update(<Root title="list 2" suffix="?" />);
  results.push(["updated", renderer.toJSON()]);
  return results;
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(List);
}

module.exports = List;
