var React = require("react");

// An ES5 class root (a constructor calling its parent's with apply, its
// methods on the prototype) whose `render` calls helper methods on `this`:
// each the prototype's (the class's own code never writes those keys on an
// instance), so it runs in the render. A handler bound in the constructor
// changes state across updates; a ref callback the prototype's.

function Row(props) {
  return <li>{props.label}</li>;
}

var List = (function(superclass) {
  function List() {
    superclass.apply(this, arguments);
    this.state = { clicks: 0 };
    this.refSeen = false;
    this.handleClick = this.handleClick.bind(this);
  }
  List.__proto__ = superclass;
  List.prototype = Object.create(superclass.prototype);
  List.prototype.constructor = List;
  List.prototype.handleClick = function() {
    this.setState({ clicks: this.state.clicks + 1 });
  };
  List.prototype.seeRef = function(ref) {
    this.refSeen = ref !== null;
  };
  List.prototype.renderHeader = function() {
    return <h1>{this.props.title + " (" + this.state.clicks + ")"}</h1>;
  };
  List.prototype.renderRow = function(label, i) {
    return <Row key={i} label={label + this.props.suffix} />;
  };
  List.prototype.render = function() {
    return (
      <div onClick={this.handleClick} ref={this.seeRef}>
        {this.renderHeader()}
        {this.renderRow("first", 0)}
        {this.renderRow("second", 1)}
      </div>
    );
  };
  return List;
})(React.Component);

List.getTrials = function(renderer, Root) {
  let results = [];
  renderer.update(<Root title="list" suffix="!" />);
  results.push(["first", renderer.toJSON()]);
  results.push(["ref seen", renderer.getInstance().refSeen]);
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
