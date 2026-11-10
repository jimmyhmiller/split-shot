var React = require("react");

// What React.forwardRef is given renders a component whose defaultProps the
// program sets only after the forwardRef call made the component a runtime
// value: the residual writes a static React reads, so the component is not
// known as it was made, and its late defaults are used.

function Child(props) {
  return <span ref={props.forwardedRef}>{props.label}</span>;
}

const Wrapped = React.forwardRef((props, ref) => {
  return <Child {...props} forwardedRef={ref} />;
});

Child.defaultProps = { label: "late default" };

function App(props) {
  return (
    <div>
      <Wrapped ref={props.r} />
      <Wrapped label={props.label} />
    </div>
  );
}

App.getTrials = function(renderer, Root) {
  let seen = [];
  renderer.update(<Root label="given" r={n => seen.push(n ? n.type : n)} />);
  let a = renderer.toJSON();
  renderer.update(<Root label="again" r={null} />);
  return [["first", a], ["second", renderer.toJSON()], ["refs", seen.join(",")]];
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
