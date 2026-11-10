var React = require("react");

// Lists a class root makes with callbacks that read `this`: bound with
// `bind(this)` (for `Array.from` and for `map`), or given `this` as `map`'s
// second argument. Each item a component rendered in place, keyed.

function Row(props) {
  return <li>{props.label}</li>;
}

class List extends React.Component {
  render() {
    return (
      <div>
        <ul>
          {Array.from(
            this.props.items,
            function(item) {
              return <Row key={item.id} label={this.props.prefix + item.name} />;
            }.bind(this)
          )}
        </ul>
        <ul>
          {this.props.items.map(
            function(item, i) {
              return <Row key={item.id} label={this.props.prefix + i} />;
            }.bind(this)
          )}
        </ul>
        <ul>
          {this.props.items.map(function(item) {
            return <Row key={item.id} label={this.props.prefix + item.id} />;
          }, this)}
        </ul>
      </div>
    );
  }
}

List.getTrials = function(renderer, Root) {
  let results = [];
  let a = { id: 1, name: "a" };
  let b = { id: 2, name: "b" };
  renderer.update(<Root items={[a, b]} prefix="x" />);
  results.push(["first", renderer.toJSON()]);
  renderer.update(<Root items={[b, a, { id: 3, name: "c" }]} prefix="y" />);
  results.push(["second", renderer.toJSON()]);
  return results;
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(List);
}

module.exports = List;
