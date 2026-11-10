var React = require("react");

// Simple class roots (ES2015 and ES5) are rendered as function components:
// their `render` (and helper methods) on an instance of the props, their
// statics kept, React's defaultProps applied as for any component.
class Title extends React.Component {
  text() {
    return this.props.prefix + this.props.name;
  }
  render() {
    return <h1 title={this.props.name}>{this.text()}</h1>;
  }
}
Title.defaultProps = { prefix: "Hi " };

var Panel = (function(superclass) {
  function Panel() {
    superclass.apply(this, arguments);
  }
  Panel.__proto__ = superclass;
  Panel.prototype = Object.create(superclass.prototype);
  Panel.prototype.constructor = Panel;
  Panel.prototype.body = function body() {
    return <p>{this.props.children}</p>;
  };
  Panel.prototype.render = function render() {
    return (
      <section>
        <Title name={this.props.who} />
        {this.body()}
      </section>
    );
  };
  return Panel;
})(React.Component);
Panel.displayName = "Panel";
Panel.describe = function() {
  return "a panel";
};

Panel.getTrials = function(renderer, Root) {
  renderer.update(<Root who="ann">first</Root>);
  let a = renderer.toJSON();
  renderer.update(<Root who="bob">second</Root>);
  return [["first", a], ["second", renderer.toJSON()], ["statics", Root.displayName + " " + Root.describe() + " " + typeof Root.getTrials]];
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(Panel);
}

module.exports = Panel;
