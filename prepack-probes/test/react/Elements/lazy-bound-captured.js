var React = require("react");

// Components `bind` made of functions of known code and objects made at
// the module's top: rendered in place in the root, called with their
// `this`. One of them has its `defaultProps` written by runtime code
// between renders, through another name: React reads them as written.

var foo = { y: " world", z: "!" };

function Child(props) {
  return <b>{props.x + this.y}</b>;
}

function Later(props) {
  return <i>{props.v + this.z}</i>;
}

var Bound = Child.bind(foo);
var Late = Later.bind(foo);

function App(props) {
  return (
    <div>
      <Bound x={props.x} />
      <Late v={props.v} />
    </div>
  );
}

App.Late = Late;

App.getTrials = function(renderer, Root) {
  let results = [];
  renderer.update(<Root x="hello" v="given" />);
  results.push(["first", renderer.toJSON()]);
  Root.Late.defaultProps = { v: "late default" };
  renderer.update(<Root x="again" />);
  results.push(["defaults written", renderer.toJSON()]);
  delete Root.Late.defaultProps;
  return results;
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
