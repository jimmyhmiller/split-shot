var React = require("react");

function Child(props) {
  return <span>Hello {props.name}</span>;
}

class App extends React.Component {
  render() {
    return (
      <div>
        <Child name="world" />
        <Child name={this.props.who} />
      </div>
    );
  }
}

App.getTrials = function(renderer, Root) {
  renderer.update(<Root who="you" />);
  let a = renderer.toJSON();
  renderer.update(<Root who="me" />);
  return [["es6 class root", a], ["es6 class root again", renderer.toJSON()]];
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
