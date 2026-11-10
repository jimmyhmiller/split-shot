var React = require("react");

// `f.bind(t)` of a function made in a render and an object or a primitive
// made there too: called in place, given to a known child that calls it,
// given to a runtime component (made there, as written); its `name`
// what it was when bound, though runtime code renames its function after;
// the function and its bound copy each a function of their own.

function Show(props) {
  return <i>{props.fn("show")}</i>;
}

function Wrap(props) {
  var self = { tag: props.tag };
  var get = function(x) {
    return this.tag + ":" + x + ":" + props.n;
  }.bind(self);
  var kind = function() {
    "use strict";
    return typeof this + "/" + this;
  }.bind(props.n > 1 ? 7 : "seven");
  function named() {
    return this.tag;
  }
  var bound = named.bind(self);
  props.rename(named);
  var Opaque = props.opaque;
  return (
    <div>
      {get("here")}
      {kind()}
      <Show fn={get} />
      <Opaque fn={get} />
      {bound.name + "|" + named.name + "|" + bound() + "|" + (bound === named) + "|" + bound.length + "|" + get.length}
    </div>
  );
}

function App(props) {
  return <Wrap tag={props.tag} n={props.n} rename={props.rename} opaque={props.opaque} />;
}

App.getTrials = function(renderer, Root) {
  let results = [];
  let rename = function(f) {
    Object.defineProperty(f, "name", { value: "renamed", configurable: true });
  };
  let Opaque = function(props) {
    return <u>{props.fn("opaque") + "/" + props.fn.name}</u>;
  };
  renderer.update(<Root tag="a" n={1} rename={rename} opaque={Opaque} />);
  results.push(["first", renderer.toJSON()]);
  renderer.update(<Root tag="b" n={2} rename={rename} opaque={Opaque} />);
  results.push(["updated", renderer.toJSON()]);
  return results;
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
